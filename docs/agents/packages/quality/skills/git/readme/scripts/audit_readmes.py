#!/usr/bin/env python3
"""Check mechanical requirements for Terra repository README files."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

EXPECTED_H2 = [
    "Getting started",
    "Security and Limitations",
    "Structure",
    "References",
    "Contributing",
    "Credits and license",
]
LIST_ITEM = re.compile(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)")
LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
PLACEHOLDER = re.compile(
    r"\b(?:TODO|TBD|FIXME|Not applicable)\b|"
    r"<\s*(?:project|command|path|variable|url)\b",
    re.IGNORECASE,
)


def readmes(paths: list[Path]) -> list[Path]:
    """Expand README paths into a stable, de-duplicated file list.

    Args:
        paths (list[Path]): README files or directories to search recursively.

    Returns:
        list[Path]: Existing README.md paths in sorted order.
    """
    found: set[Path] = set()
    for path in paths:
        if path.is_dir():
            found.update(p for p in path.rglob("README.md") if p.is_file())
        elif path.is_file() and path.name.lower() == "readme.md":
            found.add(path)
        else:
            print(f"ERROR: not a README file or directory: {path}")
    return sorted(found)


def check(path: Path) -> list[str]:
    """Find README structure, placeholder, fence, and local-link violations.

    Code-fenced examples are excluded from Markdown structure checks, and
    relative links are resolved from the README's containing directory.

    Args:
        path (Path): README file whose content should be audited.

    Returns:
        list[str]: Human-readable violations in discovery order.
    """
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    markdown_lines: list[str] = []
    in_fence = False
    for line in lines:
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
            markdown_lines.append("")
        else:
            markdown_lines.append("" if in_fence else line)
    h1 = [line for line in markdown_lines if re.match(r"^#\s+\S", line)]
    h2 = [line[3:].strip() for line in markdown_lines if line.startswith("## ")]
    h3_lines = [i for i, line in enumerate(markdown_lines) if line.startswith("### ")]
    if len(h1) != 1:
        errors.append(f"expected one H1, found {len(h1)}")
    if h2 != EXPECTED_H2:
        errors.append("H2 headings do not match the required six-heading order")
    command_lines = [i for i in h3_lines if lines[i] == "### Commands"]
    if len(command_lines) != 1:
        errors.append(f"expected one `### Commands`, found {len(command_lines)}")
    elif not any(
        markdown_lines[i] == "## Getting started"
        and i < command_lines[0]
        and not any(
            markdown_lines[j].startswith("## ") for j in range(i + 1, command_lines[0])
        )
        for i in range(len(markdown_lines))
    ):
        errors.append("`### Commands` is not inside `## Getting started`")
    if any(line.startswith("#### ") for line in markdown_lines):
        errors.append("heading level skips or exceeds the required H2/H3 hierarchy")

    for index, line in enumerate(markdown_lines):
        if LIST_ITEM.match(line) and len(line) > 100:
            errors.append(f"line {index + 1}: list item is {len(line)} characters")
        if PLACEHOLDER.search(line):
            errors.append(f"line {index + 1}: unresolved placeholder text")

    fences = [line for line in lines if re.match(r"^\s*```", line)]
    if len(fences) % 2:
        errors.append("unclosed fenced code block")

    for heading_index in (
        i for i, line in enumerate(markdown_lines) if line.startswith("## ")
    ):
        end = next(
            (
                i
                for i in range(heading_index + 1, len(markdown_lines))
                if markdown_lines[i].startswith("## ")
            ),
            len(markdown_lines),
        )
        if not any(line.strip() for line in markdown_lines[heading_index + 1 : end]):
            errors.append(f"line {heading_index + 1}: empty H2 section")

    for heading_index in h3_lines:
        end = next(
            (
                i
                for i in range(heading_index + 1, len(markdown_lines))
                if markdown_lines[i].startswith(("### ", "## "))
            ),
            len(markdown_lines),
        )
        if not any(line.strip() for line in markdown_lines[heading_index + 1 : end]):
            errors.append(f"line {heading_index + 1}: empty H3 section")

    in_fence = False
    for index, line in enumerate(lines):
        if re.match(r"^\s*```", line):
            if not in_fence and not line.strip().removesuffix("```").strip():
                errors.append(f"line {index + 1}: code fence has no language")
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for raw_target in LINK.findall(line):
            target = raw_target.strip().split()[0].strip("<>").split("#", 1)[0]
            if not target or re.match(
                r"^(?:https?:|mailto:|data:)", target, re.IGNORECASE
            ):
                continue
            if not (path.parent / target).exists():
                errors.append(f"line {index + 1}: broken local link {target}")

    return errors


def main() -> int:
    """Audit command-line README targets and return a process exit status.

    Returns:
        int: Zero when every discovered README passes, one when any fail, or
        two when the command-line targets contain no README files.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths", nargs="+", type=Path, help="README files or directories"
    )
    args = parser.parse_args()
    targets = readmes(args.paths)
    if not targets:
        print("ERROR: no README.md files found")
        return 2

    failures = 0
    for path in targets:
        problems = check(path)
        if problems:
            failures += 1
            for problem in problems:
                print(f"{path}:{problem}")
    print(f"Checked {len(targets)} README files; {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
