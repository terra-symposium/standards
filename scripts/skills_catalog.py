#!/usr/bin/env python3
"""Generate the cross-repository skill inventory from canonical SKILL.md files."""

from __future__ import annotations

import argparse
import configparser
import re
import sys
from collections.abc import Iterator
from pathlib import Path

import yaml

DESKTOP = Path(__file__).resolve().parents[3]
SITE_OUTPUT = (
    Path(__file__).resolve().parents[1] / "docs/contributing/4-skills/catalog.mdx"
)
ROOTS = ("contracting", "personal", "terra-symposium")


def repositories() -> Iterator[Path]:
    """Discover Git repositories beneath the configured Desktop roots.

    Yields:
        Path: Each repository directory found beneath a configured root.
    """
    for area in ROOTS:
        folder = DESKTOP / area
        if not folder.exists():
            continue
        for repo in sorted(folder.iterdir()):
            if repo.is_dir() and (repo / ".git").exists():
                yield repo


def skill_details(path: Path, repo: Path) -> tuple[str, str, list[str]]:
    """Validate a skill's frontmatter and local links, then return its metadata.

    Args:
        path (Path): Path to the skill's canonical SKILL.md file.
        repo (Path): Repository containing the skill.

    Returns:
        tuple[str, str, list[str]]: Skill name, description, and related file paths.

    Raises:
        TypeError: When related-files metadata is not a list.
        ValueError: When frontmatter, metadata, or a relative link is invalid.
    """
    source = path.read_text()
    match = re.match(r"\A---\n(.*?)\n---\n", source, re.DOTALL)
    if not match:
        raise ValueError(f"Missing YAML frontmatter: {path}")
    try:
        fields = yaml.safe_load(match.group(1))
    except yaml.YAMLError as error:
        raise ValueError(f"Invalid YAML frontmatter in {path}: {error}") from error
    if (
        not isinstance(fields, dict)
        or not isinstance(fields.get("name"), str)
        or not isinstance(fields.get("description"), str)
        or not fields["name"]
        or not fields["description"]
    ):
        raise ValueError(f"Missing name or description: {path}")
    if fields.get("skill") is not True:
        raise ValueError(f"Docs skill page is missing skill: true: {path}")
    metadata = fields.get("metadata")
    if not isinstance(metadata, dict) or "related-files" not in metadata:
        raise ValueError(f"Missing metadata.related-files: {path}")
    related_files = metadata["related-files"]
    if not isinstance(related_files, list):
        raise TypeError(f"metadata.related-files must be a list: {path}")
    for related_path in related_files:
        if (
            not isinstance(related_path, str)
            or not related_path
            or Path(related_path).is_absolute()
            or ".." in Path(related_path).parts
        ):
            raise ValueError(
                f"Invalid repository-relative related file in {path}: {related_path}"
            )
        target = (repo / related_path).resolve()
        if not target.is_relative_to(repo.resolve()) or not target.is_file():
            raise ValueError(f"Missing related file in {path}: {related_path}")
    for document in path.parent.rglob("*.md"):
        prose = re.sub(r"```[\s\S]*?```", "", document.read_text())
        for link in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", prose):
            target_path = link.split("#", 1)[0]
            if not target_path or re.match(r"^(?:https?:|mailto:|/)", target_path):
                continue
            target = (document.parent / target_path).resolve()
            if not target.is_relative_to(DESKTOP.resolve()) or not target.exists():
                raise ValueError(f"Broken skill link in {document}: {link}")
    return fields["name"], fields["description"], related_files


def github_base(repo: Path) -> str | None:
    """Return a GitHub URL derived from the repository's origin remote.

    Args:
        repo (Path): Repository whose origin remote should be inspected.

    Returns:
        str | None: Repository HTTPS GitHub URL, or None for another host.
    """
    git_path = repo / ".git"
    if git_path.is_file():
        git_dir = (
            repo / git_path.read_text().strip().removeprefix("gitdir: ")
        ).resolve()
        common_dir = git_dir / "commondir"
        if common_dir.is_file():
            git_dir = (git_dir / common_dir.read_text().strip()).resolve()
    else:
        git_dir = git_path
    config = configparser.ConfigParser()
    config.read(git_dir / "config")
    remote = config.get('remote "origin"', "url", fallback="").strip()
    match = re.search(r"github\.com[:/](.+?)(?:\.git)?$", remote)
    return f"https://github.com/{match.group(1)}" if match else None


def generate() -> tuple[str, dict[Path, list[tuple[str, str, str]]]]:
    """Build shared and per-repository catalogs from canonical skill files.

    Returns:
        tuple[str, dict[Path, list[tuple[str, str, str]]]]: Rendered shared catalog
            and each repository's local skill entries.

    Raises:
        ValueError: When a skill is invalid or its name duplicates another skill.
    """
    entries: list[tuple[str, str, str, str, str, list[str]]] = []
    local_entries: dict[Path, list[tuple[str, str, str]]] = {}
    seen: dict[str, Path] = {}
    for repo in repositories():
        base = github_base(repo)
        local_entries[repo] = []
        for path in sorted((repo / "docs").rglob("SKILL.md")):
            if any(part in path.parts for part in ("node_modules", "dist")):
                continue
            source = path.read_text()
            frontmatter = re.match(r"\A---\n(.*?)\n---\n", source, re.DOTALL)
            if (
                not frontmatter
                or yaml.safe_load(frontmatter.group(1)).get("skill") is not True
            ):
                continue
            name, description, related_files = skill_details(path, repo)
            if name in seen:
                raise ValueError(
                    f"Duplicate skill name {name}: {seen[name]} and {path}"
                )
            seen[name] = path
            relative = path.relative_to(repo).as_posix()
            link = f"{base}/blob/development/{relative}" if base else relative
            entries.append(
                (repo.name, name, description, relative, link, related_files)
            )
            local_entries[repo].append((name, description, relative))
    lines = [
        "# Agent skill catalog",
        "",
        (
            "This inventory is generated from repository "
            "Docs pages marked `skill: true`."
        ),
        (
            "Edit the owning Docs page, then run `python3 scripts/skills_catalog.py` "
            "from Standards."
        ),
        "Shared Standards skills are also packaged in the Terra skills plugin.",
        "",
        "## Install shared skills locally",
        "",
        (
            "From Standards, run `pnpm run skills:package`, then add its repository "
            "marketplace:"
        ),
        "",
        "```sh",
        "codex plugin marketplace add /absolute/path/to/standards",
        "codex plugin add terra-skills@terra-skills-local",
        "```",
        "",
        (
            "The versioned plugin is built from Docs-authored generated "
            "`.agents/skills/` files "
            "into `dist/`."
        ),
        (
            "The local marketplace uses that generated bundle. Rebuild and refresh "
            "it after edits."
        ),
        (
            "Cloud availability requires publishing the plugin to a workspace or "
            "reachable marketplace."
        ),
        "",
        "| Repository | Skill | Use it for | Canonical source | Availability |",
        "| --- | --- | --- | --- | --- |",
    ]
    for repo_name, name, description, relative, link, _related_files in sorted(entries):
        availability = "Plugin and Standards" if repo_name == "standards" else repo_name
        lines.append(
            f"| {repo_name} | {name} | {description.replace('|', '/')} | "
            f"[{relative}]({link}) | {availability} |"
        )
    lines.extend(
        [
            "",
            (
                f"{len(entries)} discoverable skills across "
                f"{len({entry[0] for entry in entries})} repositories."
            ),
            "",
        ]
    )
    return "\n".join(lines), local_entries


def local_catalog(repo: Path, entries: list[tuple[str, str, str]]) -> str:
    """Render a repository-local README from that repository's skill entries.

    Args:
        repo (Path): Repository that owns the skills.
        entries (list[tuple[str, str, str]]): Skill metadata tuples.

    Returns:
        str: Markdown for that repository's skill README.
    """
    lines = [
        "# Agent skills",
        "",
        (
            "Skill instructions are authored in Docs. Run `pnpm run "
            "skills:prepare` to generate executable skills."
        ),
        "",
    ]
    if repo.name == "standards":
        lines[2] = (
            "Skill instructions are authored in Docs. Run `pnpm run skills:prepare` "
            "to generate executable\nskills."
        )
    rows = [["Skill", "Purpose", "Source"]]
    for name, description, relative in sorted(entries):
        rows.append(
            [name, description.replace("|", "/"), f"[{relative}](../{relative})"]
        )
    if repo.name in {"docs", "standards"}:
        widths = [max(len(row[index]) for row in rows) for index in range(3)]
        for index, row in enumerate(rows):
            lines.append(
                "| "
                + " | ".join(cell.ljust(widths[col]) for col, cell in enumerate(row))
                + " |"
            )
            if index == 0:
                lines.append("| " + " | ".join("-" * width for width in widths) + " |")
    else:
        lines.extend(["| Skill | Purpose | Source |", "| --- | --- | --- |"])
        lines.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    lines.extend(["", f"{len(entries)} skills.", ""])
    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        rendered, local_entries = generate()
    except ValueError as error:
        sys.exit(str(error))
    site = (
        "---\ntitle: Agent skill catalog\n"
        "description: Find canonical agent workflows across the Desktop "
        "repositories.\n---\n\n" + rendered
    )
    if args.check:
        stale = not SITE_OUTPUT.exists() or SITE_OUTPUT.read_text() != site
        for repo, entries in local_entries.items():
            if not entries:
                continue
            output = repo / ".agents/README.md"
            stale |= not output.exists() or output.read_text() != local_catalog(
                repo, entries
            )
        if stale:
            sys.exit("Skill catalog is stale; run python3 scripts/skills_catalog.py")
    else:
        SITE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        SITE_OUTPUT.write_text(site)
        for repo, entries in local_entries.items():
            if not entries:
                continue
            output = repo / ".agents/README.md"
            output.write_text(local_catalog(repo, entries))
            print(output)
        print(SITE_OUTPUT)
