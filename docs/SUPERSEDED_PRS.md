# Superseded pull requests — do not merge or rebase

These PRs are **closed by policy**. Their work lives on `main` through later, rebased PRs.  
**Do not merge, rebase, or “update branch” on them** — that risks dragging prototype layouts and fake flows backward over locked screens.

## Safe rule

| Action | Safe? |
|--------|--------|
| Use **`main`** (`05b2353` or later) | Yes |
| Merge PRs below into `main` | **No** |
| Rebase PRs below onto `main` and merge | **No** (huge conflicts; easy to pick wrong side) |
| Close PR as superseded on GitHub | Yes |
| Delete remote branch after close (optional) | Yes, after confirm `main` has replacement |

## Superseded list

| PR | Branch | Superseded by | Replacement on `main` |
|----|--------|---------------|------------------------|
| **#25** | `cursor/agents-claims-lock-9936` | **#24** | Claims lock in `AGENTS.md` (merged with #24) |
| **#7** | `cursor/claims-screen-redesign-488b` | **#24** | `cursor/claims-flow-9936` — real API Claims workflow |
| **#6** | `cursor/cover-screen-redesign-488b` | **#23** | `cursor/cover-purchase-flow-9936` — Buy Cover flow |
| **#2** | `cursor/production-upgrade-21d6` | **#21–#26** | Settings, Payment Methods, Trusted Contacts, Home, Cover, Claims, Help, Notifications, Live Trip |

## Why #6 / #7 look “mergeable” but must stay closed

GitHub may still show **#6** or **#7** as mergeable against an old base. **`main` is tens of thousands of lines ahead** of those branches (real APIs, locked screens, trip tracking, notifications, etc.). Merging them would reintroduce:

- Inline / fake claim and cover flows in `App.jsx`
- Prototype screens replaced by `ClaimFlowScreen`, `CoverPlanSelectScreen`, etc.
- Layouts explicitly locked in `AGENTS.md`

All current behavior is defined by the merged `cursor/*-9936` and `cursor/*-a7cb` PRs on `main`.

## If you need Claims / Cover / AGENTS docs

- **Claims:** PR **#24** (merged) — do not use #7 or #25.
- **Cover / Buy Cover:** PR **#23** (merged) — do not use #6.
- **AGENTS Claims lock:** already on `main` after #24 — close **#25** only.

## Manual close (if automation cannot)

On GitHub, for each PR above: **Close pull request** → comment:

> Superseded by merged work on `main`. Do not merge or rebase this branch — see `docs/SUPERSEDED_PRS.md`.
