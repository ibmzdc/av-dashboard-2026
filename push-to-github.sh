#!/bin/bash
# ─────────────────────────────────────────────────────────────
# push-to-github.sh
# Pushes all changes in GitHub/av-dashboard-2026/ to GitHub.
# Run this whenever you update index.html, admin.html, or av-files.json.
# ─────────────────────────────────────────────────────────────

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo ""
echo "📦  ZDC AV Dashboard — Push to GitHub"
echo "────────────────────────────────────────"

# Load token from .github-token (local only, never pushed)
TOKEN_FILE="$REPO_DIR/.github-token"
if [ ! -f "$TOKEN_FILE" ]; then
  echo ""
  echo "❌  No token file found."
  echo "    Create a file named .github-token in this folder"
  echo "    containing only your GitHub Personal Access Token."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi
GH_TOKEN=$(cat "$TOKEN_FILE" | tr -d '[:space:]')
git remote set-url origin "https://ibmzdc:${GH_TOKEN}@github.com/ibmzdc/av-dashboard-2026.git"

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
  UNTRACKED=$(git ls-files --others --exclude-standard)
  if [ -z "$UNTRACKED" ]; then
    echo "✅  Nothing to push — all files are up to date."
    echo ""
    read -p "Press Enter to close..."
    exit 0
  fi
fi

# Show what's changed
echo ""
echo "Files to push:"
git status --short
echo ""

# Commit and push
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git add -A
git commit -m "Update dashboard files — $TIMESTAMP"

echo ""
echo "⬆  Pushing to https://github.com/ibmzdc/av-dashboard-2026 ..."
echo ""

if git push origin main; then
  echo ""
  echo "✅  Done! Changes are live."
  echo "    Dashboard: https://ibmzdc.github.io/av-dashboard-2026/"
  echo "    (GitHub Pages updates within ~30 seconds)"
else
  echo ""
  echo "❌  Push failed. Check that your token in .github-token is still valid."
fi

echo ""
read -p "Press Enter to close..."
