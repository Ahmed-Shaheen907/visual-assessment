---
name: works
description: Use when the user says /works, "it works", "merge to master", "ship it", "ready for production", or "deploy to production". Merges the current feature branch into master and deploys master to production.
disable-model-invocation: true
---

## What This Skill Does

Merges the current feature branch into master and deploys master to the live Vercel production URL. Use this after `/deploy` confirmed the branch works correctly.

## Steps

1. Get the current branch:
   ```
   git branch --show-current
   ```
   Save this as `FEATURE_BRANCH`. If it's already `master`, stop and tell the user there's nothing to merge — they're already on master.

2. Tell the user: "Merging `FEATURE_BRANCH` into master and deploying to production."

3. Switch to master and merge:
   ```
   git checkout master
   git merge FEATURE_BRANCH
   ```
   If there are merge conflicts, stop immediately. Do NOT attempt to auto-resolve. Tell the user which files conflict and ask them to resolve manually.

4. Push master:
   ```
   git push
   ```

5. Deploy master to production:
   ```
   cd apps/visual-assessment/frontend && vercel deploy --prod
   ```
   Stream the output.

6. When deploy finishes, report:
   - "Production is live at https://frontend-sepia-xi-79.vercel.app"
   - Which branch was merged
   - "You are now on master."

## Notes

- Always deploy from `apps/visual-assessment/frontend` — NOT the repo root.
- Use `--prod` always. Preview builds fail because Vercel's Preview environment doesn't have Supabase keys.
- After merging, the user stays on master. They should create a new feature branch at the start of the next session (CLAUDE.md rule).
- If the build fails after the merge, do not undo the merge. Show the error and tell the user to fix it before pushing to production again.
- Timeout: allow up to 3 minutes for Vercel build.
