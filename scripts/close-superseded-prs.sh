#!/usr/bin/env bash
# Close superseded PRs WITHOUT merging or rebasing their branches.
# Run locally with GitHub CLI authenticated as a repo maintainer:
#   chmod +x scripts/close-superseded-prs.sh
#   ./scripts/close-superseded-prs.sh

set -euo pipefail

COMMENT='Superseded by merged work on main. Do not merge or rebase this branch — see docs/SUPERSEDED_PRS.md.'

close_one() {
  local num="$1"
  echo "Closing PR #${num} (close only, no merge)..."
  gh pr close "$num" --comment "$COMMENT" || gh pr close "$num" || {
    echo "Failed to close #${num}. Close manually on GitHub." >&2
    return 1
  }
}

for pr in 25 7 6 2; do
  close_one "$pr" || true
done

echo "Done. Verify on GitHub that #2, #6, #7, #25 are closed and still unmerged."
