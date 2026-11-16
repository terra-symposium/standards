#!/usr/bin/env python3
"""Generate the cross-repository skill inventory from canonical SKILL.md files."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

import yaml

DESKTOP = Path(__file__).resolve().parents[3]
SITE_OUTPUT = (
    Path(__file__).resolve().parents[1] / "docs/contributing/4-skills/catalog.mdx"
)
ROOTS = ("contracting", "personal", "terra-symposium")


def repositories():
    for area in ROOTS:
        folder = DESKTOP / area
        if not folder.exists():
            continue
        for repo in sorted(folder.iterdir()):
            if repo.is_dir() and (repo / ".git").exists():
                yield repo


def skill_details(path: Path, repo: Path):
    source = path.read_text()
    match = re.match(r"\A---\n(.*?)\n---\n", source, re.S)
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
    if fields["name"] != path.parent.name:
        raise ValueError(f"Skill name and directory differ: {path}")
    metadata = fields.get("metadata")
    if not isinstance(metadata, dict) or "related-files" not in metadata:
        raise ValueError(f"Missing metadata.related-files: {path}")
    related_files = metadata["related-files"]
    if not isinstance(related_files, list):
        raise ValueError(f"metadata.related-files must be a list: {path}")
    for relative in related_files:
        if (
            not isinstance(relative, str)
            or not relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
        ):
            raise ValueError(
                f"Invalid repository-relative related file in {path}: {relative}"
            )
        target = (repo / relative).resolve()
        if not target.is_relative_to(repo.resolve()) or not target.is_file():
            raise ValueError(f"Missing related file in {path}: {relative}")
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


def github_base(repo: Path):
    result = subprocess.run(
        ["git", "-C", str(repo), "remote", "get-url", "origin"],
        capture_output=True,
        text=True,
        check=False,
    )
    remote = result.stdout.strip()
    match = re.search(r"github\.com[:/](.+?)(?:\.git)?$", remote)
    return f"https://github.com/{match.group(1)}" if match else None


def generate():
    entries = []
    local_entries = {}
    seen = {}
    for repo in repositories():
        base = github_base(repo)
        local_entries[repo] = []
        for path in sorted((repo / ".agents/skills").rglob("SKILL.md")):
            if any(part in path.parts for part in ("node_modules", "dist")):
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
        "This inventory is generated from repository `.agents/skills/*/SKILL.md` files.",
        "Edit the owning skill, then run `python3 scripts/skills_catalog.py` from Standards.",
        "Shared Standards skills are also packaged in the Terra skills plugin.",
        "",
        "## Install shared skills locally",
        "",
        "From Standards, run `pnpm run skills:package`, then add its repository marketplace:",
        "",
        "```sh",
        "codex plugin marketplace add /absolute/path/to/standards",
        "codex plugin add terra-skills@terra-skills-local",
        "```",
        "",
        "The versioned plugin is built from canonical `.agents/skills/` sources into `dist/`.",
        "The local marketplace uses that generated bundle. Rebuild and refresh it after edits.",
        "Cloud availability requires publishing the plugin to a workspace or reachable marketplace.",
        "",
        "| Repository | Skill | Use it for | Canonical source | Availability |",
        "| --- | --- | --- | --- | --- |",
    ]
    for repo, name, description, relative, link, related_files in sorted(entries):
        availability = "Plugin and Standards" if repo == "standards" else repo
        lines.append(
            f"| {repo} | {name} | {description.replace('|', '/')} | "
            f"[{relative}]({link}) | {availability} |"
        )
    lines.extend(
        [
            "",
            f"{len(entries)} discoverable skills across {len(set(e[0] for e in entries))} repositories.",
            "",
        ]
    )
    return "\n".join(lines), local_entries


def local_catalog(repo: Path, entries):
    lines = [
        "# Agent skills",
        "",
        "Executable skills in this repository. Open a skill for its workflow and references.",
        "",
        "| Skill | Purpose | Source |",
        "| --- | --- | --- |",
    ]
    for name, description, relative in sorted(entries):
        lines.append(
            f"| {name} | {description.replace('|', '/')} | "
            f"[{relative}](skills/{name}/SKILL.md) |"
        )
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
        "---\ntitle: Agent skill catalog\ndescription: Find canonical agent workflows across the Desktop repositories.\n---\n\n"
        + rendered
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
