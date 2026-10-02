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

# Check for changes
if git diff --quiet && git diff --staged --quiet; then
  # Check for untracked files too
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

# Commit message with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
COMMIT_MSG="Update dashboard files — $TIMESTAMP"

# Stage, commit, push
git add -A
git commit -m "$COMMIT_MSG"

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
  echo "❌  Push failed. You may need to authenticate."
  echo "    See setup instructions below if this is your first push."
fi

echo ""
read -p "Press Enter to close..."
