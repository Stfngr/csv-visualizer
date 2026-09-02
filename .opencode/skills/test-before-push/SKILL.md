---
name: test-before-push
description: Git push, push changes, or publish branch. Use when preparing or executing a git push to require tests pass first.
---

# Test Before Push

Before any `git push` for this project:

1. Run `npm test` from repository root.
2. Run `npm run build` from repository root.
3. Do not push if either command fails.
4. Report failure, fix cause if within requested scope, then rerun both commands.
5. Push only after both commands complete successfully in current worktree state.

Do not bypass test failures, use `--no-verify`, or claim changes are ready to push without current successful results.
