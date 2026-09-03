# Push Verification

Before any `git push` from this project:

1. Run `npm test` from repository root.
2. Run `npm run build` from repository root.
3. Do not push if either command fails.
4. Report failures, fix causes within requested scope, then rerun both commands.
5. Push only after both commands succeed against current worktree state.

Do not bypass test failures, use `--no-verify`, or claim changes are ready to push without current successful results.
