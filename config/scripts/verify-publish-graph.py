"""Check published-version integrity and import locally packed workspace packages."""

from __future__ import annotations

import hashlib
import json
import pathlib

# Release verification runs fixed npm, pnpm, and node commands.
import subprocess  # nosec B404
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
PACKAGES = sorted(
    path
    for path in (ROOT / "packages").glob("*/package.json")
    if not json.loads(path.read_text()).get("private")
)


def run(args: list[str], cwd: pathlib.Path = ROOT) -> subprocess.CompletedProcess[str]:
    """Run a release command without a shell and retain its diagnostics.

    Args:
        args (list[str]): Command and arguments selected by this script.
        cwd (pathlib.Path): Directory in which to run the command.

    Returns:
        subprocess.CompletedProcess[str]: Command result and captured output.
    """
    # Arguments are explicit arrays and the shell is never invoked.
    return subprocess.run(  # noqa: S603  # nosec B603
        args, cwd=cwd, capture_output=True, text=True, check=False
    )


def tarball_files(archive: pathlib.Path) -> dict[str, str]:
    """Hash compiled files inside a package tarball without extracting it.

    Args:
        archive (pathlib.Path): Package tarball to inspect.

    Returns:
        dict[str, str]: SHA-256 hash by package-relative compiled path.

    Raises:
        RuntimeError: A compiled member cannot be read from the tarball.
    """
    with tarfile.open(archive) as contents:
        hashes: dict[str, str] = {}
        for member in contents.getmembers():
            if not member.isfile() or not member.name.startswith("package/dist/"):
                continue
            stream = contents.extractfile(member)
            if stream is None:
                raise RuntimeError(f"Cannot read packed file {member.name}")
            hashes[member.name.removeprefix("package/")] = hashlib.sha256(
                stream.read()
            ).hexdigest()
        return hashes


def local_files(package_dir: pathlib.Path) -> dict[str, str]:
    """Hash the local compiled files that the package would publish.

    Args:
        package_dir (pathlib.Path): Package source directory.

    Returns:
        dict[str, str]: SHA-256 hash by package-relative compiled path.
    """
    return {
        str(path.relative_to(package_dir)): hashlib.sha256(
            path.read_bytes()
        ).hexdigest()
        for path in (package_dir / "dist").rglob("*")
        if path.is_file()
    }


def published_archive(
    name: str, version: str, destination: pathlib.Path
) -> pathlib.Path | None:
    """Download a published version when it exists.

    Args:
        name (str): Scoped npm package name.
        version (str): Exact package version.
        destination (pathlib.Path): Directory for the downloaded tarball.

    Returns:
        pathlib.Path | None: Published tarball, or None for an unpublished version.

    Raises:
        RuntimeError: The registry request fails unexpectedly.
    """
    result = run(
        [
            "npm",
            "pack",
            f"{name}@{version}",
            "--pack-destination",
            str(destination),
            "--json",
            "--silent",
        ]
    )
    if result.returncode:
        if any(
            code in result.stderr or f'"code": "{code}"' in result.stdout
            for code in ("E404", "ETARGET")
        ):
            return None
        details = f"{result.stdout.strip()} {result.stderr.strip()}"
        raise RuntimeError(f"Could not inspect {name}@{version}: {details}")
    metadata = json.loads(result.stdout)
    item = metadata[0] if isinstance(metadata, list) else next(iter(metadata.values()))
    return destination / item["filename"]


def verify_version_integrity(destination: pathlib.Path) -> None:
    """Reject reused published versions whose compiled contents have changed.

    Args:
        destination (pathlib.Path): Temporary directory for registry tarballs.

    Raises:
        RuntimeError: A published version differs from the current compiled files.
    """
    for manifest in PACKAGES:
        package = json.loads(manifest.read_text())
        name, version = package["name"], package["version"]
        archive = published_archive(name, version, destination)
        if archive is None:
            print(f"Unpublished version: {name}@{version}")
            continue
        expected, current = tarball_files(archive), local_files(manifest.parent)
        changed = sorted(
            path
            for path in expected.keys() | current.keys()
            if expected.get(path) != current.get(path)
        )
        if changed:
            examples = ", ".join(changed[:5])
            raise RuntimeError(
                f"{name}@{version} differs from published artifacts: {examples}"
            )
        print(f"Published version matches: {name}@{version}")


def verify_isolated_install(destination: pathlib.Path) -> None:
    """Install local tarballs into a fresh consumer and import the Quality graph.

    Args:
        destination (pathlib.Path): Temporary directory for tarballs and the consumer.

    Raises:
        RuntimeError: Packing, installation, or a package import fails.
    """
    packs = destination / "packs"
    packs.mkdir()
    dependencies = {"react": "19.3.1", "react-dom": "19.3.1", "eslint": "10.0.1"}
    for manifest in PACKAGES:
        package = json.loads(manifest.read_text())
        result = run(
            [
                "pnpm",
                "--dir",
                str(manifest.parent),
                "pack",
                "--pack-destination",
                str(packs),
            ]
        )
        if result.returncode:
            raise RuntimeError(
                f"Could not pack {package['name']}: {result.stderr.strip()}"
            )
        filename = (
            package["name"].replace("@", "").replace("/", "-")
            + f"-{package['version']}.tgz"
        )
        archive = packs / filename
        if not archive.is_file():
            raise RuntimeError(f"Missing packed artifact: {archive}")
        dependencies[package["name"]] = f"file:{archive}"

    consumer = destination / "consumer"
    consumer.mkdir()
    (consumer / "package.json").write_text(
        json.dumps({"private": True, "type": "module", "dependencies": dependencies})
        + "\n"
    )
    install = run(
        [
            "npm",
            "install",
            "--ignore-scripts",
            "--legacy-peer-deps",
            "--no-audit",
            "--no-fund",
            "--no-package-lock",
        ],
        consumer,
    )
    if install.returncode:
        raise RuntimeError(
            f"Isolated package install failed: {install.stdout}\n{install.stderr}"
        )
    imports = [
        "@terra-symposium/standards-quality/cli",
        "@terra-symposium/standards-formatting",
        "@terra-symposium/standards-quality-core",
        "@terra-symposium/standards-quality-reports",
        "@terra-symposium/standards-documentation",
    ]
    program = (
        "for (const name of "
        + json.dumps(imports)
        + ") { await import(name); console.log(name) }"
    )
    smoke = run(["node", "--input-type=module", "-e", program], consumer)
    if smoke.returncode:
        raise RuntimeError(
            f"Isolated package imports failed: {smoke.stdout}\n{smoke.stderr}"
        )
    print(f"Isolated consumer imported {len(imports)} entry points.")
    print(f"Checked {len(PACKAGES)} local tarballs.")


def main() -> None:
    """Run the release checks in a disposable directory."""
    with tempfile.TemporaryDirectory(prefix="standards-publish-graph-") as scratch:
        destination = pathlib.Path(scratch)
        verify_version_integrity(destination)
        verify_isolated_install(destination)


if __name__ == "__main__":
    main()
