#!/usr/bin/env python3
"""Bundle canonical repository skills as a portable, versioned plugin."""

from pathlib import Path
import json
import re
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".agents/skills"
MANIFEST = ROOT / "config/terra-skills-plugin.json"
OUT = ROOT / "dist/terra-skills-plugin"


def main():
    manifest = json.loads(MANIFEST.read_text())
    if not manifest.get("$schema") or not manifest.get("version"):
        sys.exit("Invalid plugin manifest")
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "skills").mkdir(parents=True)
    manifest.pop("skills", None)
    (OUT / "plugin.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for source in sorted(SKILLS.iterdir()):
        if not source.is_dir() or not (source / "SKILL.md").exists():
            continue
        shutil.copytree(
            source, OUT / "skills" / source.name,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store", ".ruff_cache", ".mypy_cache", "snapshots"),
        )
    for document in (OUT / "skills").rglob("*.md"):
        for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", document.read_text()):
            path = target.split("#", 1)[0]
            if path and not re.match(r"^(?:https?:|mailto:|/)", path) and not (document.parent / path).exists():
                sys.exit(f"Broken packaged skill link: {document.relative_to(OUT)} -> {target}")
    archive = OUT.parent / f"terra-skills-plugin-{manifest['version']}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in sorted(OUT.rglob("*")):
            if path.is_file():
                package.write(path, path.relative_to(OUT))
    print(f"Bundled {len(list((OUT / 'skills').iterdir()))} skills: {archive}")


if __name__ == "__main__":
    main()
