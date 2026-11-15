"""Behavior tests for the README audit command."""

from __future__ import annotations

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import audit_readmes


class ReadmeDiscoveryTests(unittest.TestCase):
    """Check command-line path expansion and invalid target reporting."""

    def test_directory_and_explicit_file_return_unique_sorted_readmes(self) -> None:
        """Directory traversal and direct paths do not duplicate a README."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            nested = root / "examples" / "README.md"
            direct = root / "README.md"
            nested.parent.mkdir()
            nested.write_text("# Nested\n", encoding="utf-8")
            direct.write_text("# Root\n", encoding="utf-8")

            self.assertEqual(audit_readmes.readmes([root, direct]), [direct, nested])

    def test_invalid_target_is_reported_without_becoming_a_readme(self) -> None:
        """Nonexistent paths produce a diagnostic and no discovered file."""
        output = io.StringIO()
        with (
            tempfile.TemporaryDirectory() as directory,
            contextlib.redirect_stdout(output),
        ):
            missing = Path(directory) / "missing.txt"
            self.assertEqual(audit_readmes.readmes([missing]), [])

        self.assertIn("ERROR: not a README file or directory", output.getvalue())


class ReadmeCheckTests(unittest.TestCase):
    """Check valid README mechanics and actionable violations."""

    def test_valid_document_ignores_fenced_examples_and_accepts_local_links(
        self,
    ) -> None:
        """Code examples do not count as headings or unresolved placeholders."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "guide.md").write_text("# Guide\n", encoding="utf-8")
            readme = root / "README.md"
            readme.write_text(
                """# Example

Run `pnpm test`.
```md
# Not a document heading
TODO remains literal in code.
```

See [the guide](guide.md).
""",
                encoding="utf-8",
            )

            self.assertEqual(audit_readmes.check(readme), [])

    def test_invalid_document_reports_placeholders_and_broken_links(
        self,
    ) -> None:
        """Empty sections, placeholders, and broken links surface."""
        with tempfile.TemporaryDirectory() as directory:
            readme = Path(directory) / "README.md"
            readme.write_text(
                """# Example

## Structure
See [missing](missing.md).
<project> TODO
## Getting started
### Empty
```
code
""",
                encoding="utf-8",
            )

            errors = audit_readmes.check(readme)

        self.assertTrue(any("empty H3 section" in error for error in errors))
        self.assertTrue(any("unresolved placeholder" in error for error in errors))
        self.assertTrue(any("broken local link" in error for error in errors))
        self.assertIn("unclosed fenced code block", errors)

    def test_encoded_links_and_todo_paths_are_not_placeholders(self) -> None:
        """Link targets are decoded and excluded from placeholder prose checks."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "test plan.md").write_text("# Plan\n", encoding="utf-8")
            (root / "todo.md").write_text("# Tasks\n", encoding="utf-8")
            readme = root / "README.md"
            readme.write_text(
                "# Example\n\nSee [test plan](test%20plan.md) and [tasks](todo.md).\n",
                encoding="utf-8",
            )
            self.assertEqual(audit_readmes.check(readme), [])


class ReadmeCommandTests(unittest.TestCase):
    """Check the CLI's exit status and summary output."""

    def test_main_reports_a_failed_readme_with_exit_code_one(self) -> None:
        """A README violation makes the command fail and names the file."""
        with tempfile.TemporaryDirectory() as directory:
            readme = Path(directory) / "README.md"
            readme.write_text("# Project\n\n## Empty\n", encoding="utf-8")
            output = io.StringIO()
            with (
                patch.object(sys, "argv", ["audit_readmes.py", str(readme)]),
                contextlib.redirect_stdout(output),
            ):
                result = audit_readmes.main()

        self.assertEqual(result, 1)
        self.assertIn("Checked 1 README files; 1 failed.", output.getvalue())


if __name__ == "__main__":
    unittest.main()
