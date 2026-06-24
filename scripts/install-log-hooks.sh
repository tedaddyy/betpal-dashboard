#!/bin/sh
# Installs the BetPal Log Calendar post-commit hook into your app repos, so every
# commit (yours or Claude Code's) auto-logs onto the dashboard's Log Calendar.
#
# Usage:   sh scripts/install-log-hooks.sh
# Config:  edit ~/.betpal-log.env to point at local vs your deployed backend.
#
# Safe & reversible: it only copies one hook file per repo. To uninstall, delete
# the .git/hooks/post-commit file from each repo.

set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/post-commit"

# Repos to wire up (adjust paths if yours differ).
REPOS="$HOME/Documents/betmate $HOME/Documents/betpal-backend"

for repo in $REPOS; do
  if [ -d "$repo/.git" ]; then
    cp "$HOOK" "$repo/.git/hooks/post-commit"
    chmod +x "$repo/.git/hooks/post-commit"
    echo "✓ installed post-commit hook in $repo"
  else
    echo "– skipped $repo (not a git repo)"
  fi
done

# Seed the config file with local defaults if it doesn't exist yet.
if [ ! -f "$HOME/.betpal-log.env" ]; then
  cat > "$HOME/.betpal-log.env" <<'EOF'
BETPAL_LOG_URL=http://localhost:4000
BETPAL_LOG_TOKEN=betpal-local-ingest-token-dev
EOF
  echo "✓ wrote ~/.betpal-log.env (edit it to point at your deployed backend)"
fi

echo "Done. New commits in those repos will now appear on the Log Calendar."
