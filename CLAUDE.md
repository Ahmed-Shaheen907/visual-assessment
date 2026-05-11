# CLAUDE.md — Visual Assessment

This project is a web-based map game where users drag and drop answers onto geographic map locations. Built with Next.js, Leaflet (maps), @dnd-kit (drag and drop), and Supabase (game state/scores).

---

## Directory Structure

```
apps/
  visual-assessment/
    frontend/       ← Next.js + React app (map game)
    workflow.md     ← n8n trigger, data contract, endpoint URL (when applicable)
temporary screenshots/  ← Puppeteer screenshots for dev review
serve.mjs           ← Local static server (port 3000)
screenshot.mjs      ← Puppeteer screenshot tool
.env                ← Shared credentials (OpenAI, Anthropic, Groq)
```

Each app frontend uses its own `apps/<app-name>/frontend/.env.local` for Supabase keys and any API endpoints. Never put per-app secrets in the root `.env`.

---

## MCPs & Skills

| Tool | When to use |
|---|---|
| **Supabase MCP** | Create tables, run migrations, query data |
| **GitHub MCP** | Create repos, commit, push, open PRs |
| **Vercel MCP** | Deploy, check deployment status, manage env vars |
| **n8n MCP** | If backend automation is ever added |
| **frontend-design skill** | Invoke before writing any frontend code, every session, no exceptions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS |
| Maps | Leaflet + react-leaflet |
| Drag & Drop | @dnd-kit/core + @dnd-kit/utilities |
| Database | Supabase (Postgres) |
| Deployment | Vercel (via GitHub push) |

---

## Game Concept

- A map of a specific location is displayed
- Answer tokens (labels, names, icons) are shown in a panel
- Players drag answers onto the correct map locations (drop zones)
- Correct/incorrect feedback is shown
- Scores can be saved to Supabase

---

## Frontend Rules

### Local Server
- Next.js dev: `cd apps/visual-assessment/frontend && npm run dev` → `http://localhost:3000`
- Static server: `node serve.mjs` (serves root at `http://localhost:3000`) — only for plain HTML files

### Screenshot Workflow
- Puppeteer at `C:/Users/gamin/AppData/Local/Temp/puppeteer-test/`. Chrome cache at `C:/Users/gamin/.cache/puppeteer/`.
- Screenshot: `node screenshot.mjs http://localhost:3000`
- Saved to `./temporary screenshots/screenshot-N.png` (auto-incremented).
- Read the PNG with the Read tool and analyze it directly.
- Be specific when comparing: sizes, exact hex colors, spacing, alignment, radius, shadows.

### Reference Images
- If provided: match layout, spacing, typography, and color exactly. No improvements.
- If none: design from scratch with high craft (see guardrails below).
- Screenshot → compare → fix → repeat. At least 2 rounds.

### Output Defaults
- Next.js App Router (TypeScript)
- Tailwind via config (not CDN in Next.js)
- Mobile-first responsive

### Design Guardrails
- **Colors:** Never use default Tailwind palette. Pick a custom brand color and derive from it.
- **Shadows:** Layered, color-tinted, low opacity — never flat `shadow-md`.
- **Typography:** Different fonts for headings and body. Tight tracking on large headings (`-0.03em`), generous line-height on body (`1.7`).
- **Gradients:** Layer multiple radial gradients. Add grain via SVG noise filter.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Spring-style easing.
- **Interactive states:** Every clickable/draggable element needs hover, focus-visible, and active states.
- **Images:** Add gradient overlay + color treatment with `mix-blend-multiply`.
- **Spacing:** Intentional, consistent tokens — not random Tailwind steps.
- **Depth:** Layering system (base → elevated → floating).

---

## Deploy Rule — Non-Negotiable

**Every change, no exceptions, must be committed and pushed to GitHub before the task is considered done.**

- `git add <changed files>`
- `git commit -m "..."`
- `git push` — this triggers Vercel auto-deploy

Do not ask the user if they want to push. Do not wait to be asked. Push immediately after finishing any code change. The task is not complete until the push succeeds.

---

## Leaflet Note

Leaflet requires a client-side render — always mark map components with `'use client'` and guard against SSR:
```tsx
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
```

CSS must be imported in the component or globally:
```tsx
import 'leaflet/dist/leaflet.css';
```
