---
name: validate-canvas-change
description: Select and run proportionate validation for changes to apps/canvas-workspace. Use when iterating on Canvas Workspace code, finishing a feature or fix, preparing release evidence, or deciding whether a full performance report is necessary.
---

# Validate a Canvas Change

Use `apps/canvas-workspace/harness/validate/validation.yaml` as the command
source of truth. Run from the repository root.

## Choose the Level

- During iteration, run `node scripts/harness/run-harness-check.mjs` (default
  `quick`). Keep feedback
  fast and do not run the full performance report.
- When the change is functionally complete, run
  `node scripts/harness/run-harness-check.mjs --level standard`.
- Run `node scripts/harness/run-harness-check.mjs --level release` only for a performance-focused
  task, a performance-sensitive change, or release evidence.
- Do not use `--all` as routine acceptance for a local change. It intentionally
  selects `release` and performs a repository-wide sweep.

Treat changes to performance policies or collectors, Electron/Vite build and
packaging configuration, startup/bootstrap paths, and hot renderer interaction
paths as performance-sensitive. For an ordinary localized UI or logic change,
`standard` is the completion level unless the user explicitly requests
performance evidence.

Report the commands actually run and any release-only or manual checks skipped.

## Follow Through After a PR/MR Push

Creating or updating a PR/MR is not the end of validation.

1. Record the pushed HEAD commit and inspect the checks or pipeline attached to that
   exact commit. Do not reuse green results from an older push.
2. Distinguish passed, running/queued, failed, skipped/cancelled, and required-but-
   missing checks. If required checks are still running, report that CI is pending
   rather than claiming completion.
3. For a failure, read the exact job and step output before proposing a fix. Capture
   the command, error, measured value, baseline, or threshold that actually failed,
   then reproduce the same command locally where practical.
4. Fix the root cause. Do not default to weakening performance thresholds, updating
   baselines to hide a regression, deleting valid tests, or skipping a required
   check. Sweep sibling code for the same cause when the failure reveals a repeated
   pattern.
5. Run the failed check and the selected Harness acceptance locally, push the fix,
   then inspect the new HEAD's replacement CI run.

Only report the PR/MR as complete when the current HEAD's required checks pass, the
user explicitly accepts a pending run, or an external CI failure is documented as a
blocker with evidence. Include the PR/MR link, current commit, final CI state, local
evidence, and any remaining running, skipped, or missing checks.
