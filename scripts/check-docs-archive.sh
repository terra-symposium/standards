#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(find archive/docs-backup -type f | wc -l | tr -d '[:space:]')" != 2 ]]; then
	echo 'Docs archive must contain exactly its two original files.' >&2
	exit 1
fi

if [[ "$(git hash-object archive/docs-backup/development/0-general/000-Standards/index.mdx)" != f46f1f947db36f26bbed65b6124d4a7cd4e7dbe8 ]] ||
   [[ "$(git hash-object archive/docs-backup/development/0-general/1-commenting.mdx)" != d422edb53e64345b17a4599afced2dd802473005 ]]; then
	echo 'Docs archive differs from its original source bytes.' >&2
	exit 1
fi
