---
name: deploy
description: Use when the user says /deploy, "deploy this branch", "deploy so I can test", or "push this to Vercel". Deploys the current git branch to the production Vercel URL for testing.
disable-model-invocation: true
---

## What This Skill Does

Deploys whatever branch is currently checked out to the live Vercel production URL so the user can test changes. This is a test deploy — it puts the branch on the production URL. When the branch is confirmed working, use `/works` to merge into master.

## Steps

1. Run `git branch --show-current` to get the current branch name and report it to the user.

2. Run the deploy command from the frontend directory:
   ```
   cd apps/visual-assessment/frontend && vercel deploy --prod
   ```
   Stream the output so the user can see build progress.

3. When deploy finishes, report:
   - The live URL (always https://frontend-sepia-xi-79.vercel.app)
   - Which branch was deployed
   - A one-line reminder: "Run /works when everything looks good to merge into master."

## Notes

- Always deploy from `apps/visual-assessment/frontend` — NOT the repo root.
- Use `--prod` always. Preview builds fail because Vercel's Preview environment doesn't have Supabase keys — only the Production environment does.
- Do NOT switch branches before deploying. Deploy exactly what is checked out.
- If the build fails, show the build error output clearly and stop. Do not attempt to fix it automatically.
- Timeout: Vercel builds typically take 30–60 seconds. Allow up to 3 minutes before treating it as hung.
