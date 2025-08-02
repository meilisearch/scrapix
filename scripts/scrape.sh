#!/bin/bash
# Scraper wrapper script that preserves working directory for relative paths

# Get the directory where this script is located (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Store original working directory
ORIGINAL_CWD="$(pwd)"

# Export it so the CLI can access it
export INIT_CWD="$ORIGINAL_CWD"

# Build core package
(cd "$PROJECT_ROOT/apps/scraper/core" && yarn build)

# Build and run CLI with all arguments passed through
(cd "$PROJECT_ROOT/apps/scraper/cli" && yarn build && yarn start "$@")