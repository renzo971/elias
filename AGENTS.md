# AGENTS.md — Elias Project

> This file is the canonical reference for all AI agents working on this codebase.
> Read it in full before taking any action. Prioritize the rules here over generic knowledge.

---

## 1. Project Identity

**Elias** is a faith-focused AI assistant web app. It provides a conversational interface powered by NVIDIA NIM AI models and an AI-generated Sunday School resource generator, both served via Astro SSR on Vercel.

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | **Astro 6** (`output: 'server'`) |
| UI Library | **React 19** via `@astrojs/react` |
| Styling | **TailwindCSS v4** (Vite plugin, no config file) |
| AI Provider | **NVIDIA NIM** via `openai` v6 SDK (base URL: `integrate.api.nvidia.com/v1`) |
| LLM Model | `meta/llama-3.1-8b-instruct` |
| Image Model | `qwen/qwen-image` via `ai.api.nvidia.com/v1/genai` |
| PDF Export | `html2pdf.js` |
| Deployment | **Vercel** via `@astrojs/vercel` adapter |
| Runtime | **Node.js ≥ 22.12** |

---

## 2. Essential Commands

```bash
npm run dev      # Dev server → http://localhost:4321
npm run build    # Production build → ./dist
npm run preview  # Preview production build locally
npm run astro    # Astro CLI (astro check, astro add, etc.)
```

> Always run `npm run dev` to verify changes. There is no automated test suite.

---

## 3. Project Architecture

```
elias/
├── src/
│   ├── pages/
│   │   ├── index.astro              # Entry point / shell
│   │   └── api/
│   │       ├── chat.ts              # POST /api/chat — Gemini chat endpoint
│   │       └── sunday-school.ts     # POST /api/sunday-school — content generation
│   ├── components/
│   │   ├── ChatInterface.tsx        # Main React chat UI (client-side)
│   │   ├── ChatInterface.astro      # Astro wrapper for ChatInterface
│   │   ├── SundaySchoolGenerator.tsx # Sunday school resource generator UI
│   │   ├── EliasLogo.tsx            # Animated SVG logo component
│   │   └── Welcome.astro            # Landing/welcome screen
│   ├── services/
│   │   └── chatService.ts           # Gemini API abstraction layer
│   ├── layouts/                     # Astro layout wrappers
│   ├── data/                        # Static content / prompts
│   ├── assets/                      # Static assets (images, fonts)
│   └── styles/
│       └── global.css               # Design tokens, animations, print styles
├── public/
│   └── grid.svg                     # Background texture pattern
├── astro.config.mjs                 # Astro core config
├── tsconfig.json                    # Extends astro/tsconfigs/strict
├── .env                             # Secret env vars (never commit)
├── .env.example                     # Env var template
└── .agents/skills/                  # AI skill definitions (see §7)
```

---

## 4. Critical Conventions

### TypeScript
- Config extends `astro/tsconfigs/strict` — **zero TypeScript errors allowed**.
- Check generated types in `.astro/types.d.ts` for Astro globals.
- Always import `React` explicitly in `.tsx` files: `import React from 'react'`.

### Astro & SSR
- All pages are SSR by default (`output: 'server'`). Do **not** add `export const prerender = true` unless intentional.
- Astro components (`.astro`) handle routing and SSR data fetching.
- React components (`.tsx`) handle interactive, stateful UI and run client-side.
- Wrap React components with `client:load` or `client:only="react"` when used inside `.astro` files.

### API Routes
- Located at `src/pages/api/`. Each file exports `GET` / `POST` handler functions.
- Return `Response` objects directly (Astro's Web API response model).
- All API logic lives in `src/services/`; keep route files thin.

### Environment Variables
- `PUBLIC_NVIDIA_API_KEY` — the only required AI key; used server-side in both API routes.
- Client-exposed vars: must use `PUBLIC_` prefix (already the case for the NVIDIA key).
- **Never commit `.env`**. Use `.env.example` to document required keys.

> ⚠️ Both `import.meta.env.NVIDIA_API_KEY` and `import.meta.env.PUBLIC_NVIDIA_API_KEY` are checked at runtime for compatibility. The canonical key name is `PUBLIC_NVIDIA_API_KEY`.

### TailwindCSS v4
- CSS-first config: design tokens are defined in `src/styles/global.css` under `@theme {}`.
- No `tailwind.config.js`. All customization via CSS variables.
- Import global styles in each Astro layout/page that needs them.

---

## 5. Design System

This app uses a **warm, sacred, library aesthetic** — NOT the generic Slate/Blue palette. Always apply the actual design tokens defined in `global.css`.

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#dfb15b` | Gold — primary brand, highlights |
| `--color-primary-dark` | `#b88a3e` | Darker gold for hover states |
| `--color-accent` | `#d97706` | Amber — CTAs, active states |
| `--color-ethereal` | `#fcfbf7` | Warm ivory — light text |
| `--color-warmstone` | `#292524` | Dark stone — card backgrounds |
| Background | `#0d0b0a` | Deep charcoal-black |
| Foreground | `#f5f5f4` | Stone-100 warm ivory |

### Typography
| Role | Font | Fallback |
|---|---|---|
| Headings | `Cinzel` | Georgia, serif |
| Body serif | `Lora` | Georgia, serif |
| UI / Body | `Plus Jakarta Sans` | sans-serif |

### Utility Classes (defined in `global.css`)
- `.divine-glow` — radial gold ambient glow for hero sections
- `.glass-morphism` — frosted glass header / nav
- `.glass-card` — interactive glass card with hover lift
- `.animate-fade-up` — entrance animation (0.8s cubic-bezier)
- `.typing-cursor` — blinking gold cursor for streaming text
- `.chat-scroll` — custom scrollbar (gold tint)
- `.bubble-user` — amber gradient message bubble
- `.bubble-assistant` — dark frosted glass message bubble
- `.text-glow` — warm gold text glow
- `.print-area` — print-safe layout for exported resources

### Design Rules
- **Never use raw Tailwind slate/blue** as primary colors — use the gold/amber palette.
- Background gradient: `bg-[#0d0b0a]` with `.divine-glow` overlay.
- Borders: `border-[rgba(223,177,91,0.08)]` for subtle gold separation.
- Effects: `backdrop-blur-xl`, gold box shadows for depth.
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints.
- Animations: prefer `animate-fade-up` for entrances; use `transition-all duration-300` for interactions.

---

## 6. Common Gotchas

| Issue | Solution |
|---|---|
| TypeScript errors in `.astro` | Check `.astro/types.d.ts`; run `npm run astro check` |
| React hooks not working | Add `client:load` or `client:only="react"` directive |
| Env var undefined client-side | Add `PUBLIC_` prefix to expose it to the browser |
| Vercel deploy fails | Run `npm run build` first; check adapter config in `astro.config.mjs` |
| Tailwind class not applying | Ensure `global.css` is imported in the layout; check `@theme` token names |
| PDF export issues | `html2pdf.js` requires `client:only`; use `.print-area` class for print layout |
| AI streaming not working | Use `ReadableStream` in API route; handle `TransformStream` carefully |

---

## 7. Available Skills

The `.agents/skills/` directory contains specialist skill definitions. Always check which skill applies before writing code:

| Skill | When to Use |
|---|---|
| `astro` | Working with `.astro` files, SSR config, content collections |
| `react-best-practices` | React components, performance, hooks, data fetching |
| `tailwind-css-patterns` | TailwindCSS utilities, responsive layouts, design systems |
| `frontend-design` | Building new UI components, pages, or improving aesthetics |
| `typescript-advanced-types` | Complex generics, utility types, strict type safety |
| `composition-patterns` | Component architecture, compound components, render props |
| `nodejs-backend-patterns` | API routes, middleware, error handling, streaming |
| `nodejs-best-practices` | Node.js patterns, async flows, security |
| `deploy-to-vercel` | Deployments, preview URLs, Vercel config |
| `seo` | Meta tags, structured data, sitemap |
| `accessibility` | WCAG compliance, keyboard nav, screen readers |

> To use a skill: read `.agents/skills/<skill-name>/SKILL.md` before starting work.

---

## 8. Agent Workflow

Follow this order of operations for every task:

1. **Read first** — check this file and any relevant skill's `SKILL.md` before writing code.
2. **Understand the goal** — clarify requirements; do not assume.
3. **Check existing patterns** — look at `src/components/` and `src/services/` before creating new abstractions.
4. **Respect the design system** — use tokens from `global.css`, not ad-hoc colors.
5. **Zero TypeScript errors** — run `npm run astro check` mentally; all types must be correct.
6. **Verify** — test with `npm run dev` and check `localhost:4321`.
7. **No secrets in code** — env vars go in `.env`; document new ones in `.env.example`.

### Prohibited Actions
- ❌ Committing `.env` or any real credentials
- ❌ Using `any` type in TypeScript without explicit justification
- ❌ Adding `export const prerender = true` to API routes
- ❌ Using hardcoded colors instead of design system tokens
- ❌ Installing packages without checking if an equivalent already exists in `package.json`

---

## 9. Key Files Reference

| File | Purpose |
|---|---|
| `astro.config.mjs` | Core Astro config: adapter, integrations, Vite plugins |
| `tsconfig.json` | TypeScript strict mode config |
| `src/styles/global.css` | Design tokens (`@theme`), animations, print styles |
| `src/services/chatService.ts` | Chat session manager, SSE stream reader, LocalStorage helpers |
| `src/pages/api/chat.ts` | Chat endpoint — NVIDIA NIM LLM streaming via `openai` SDK |
| `src/pages/api/sunday-school.ts` | Sunday school generator — LLM stream + image via NVIDIA NIM |
| `.env.example` | Required environment variable documentation |
| `public/grid.svg` | Background texture (SVG grid pattern) |

### NVIDIA NIM Integration Pattern

Both API routes instantiate the `openai` SDK pointed at NVIDIA:

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: import.meta.env.PUBLIC_NVIDIA_API_KEY,
});

// Chat completions (streaming)
const completion = await client.chat.completions.create({
  model: 'meta/llama-3.1-8b-instruct',
  messages: [...],
  temperature: 0.3,
  max_tokens: 1500,
  stream: true,
});
```

Image generation uses a direct `fetch` to a separate NVIDIA endpoint:

```ts
// Image generation (sunday-school.ts)
const imageResponse = await fetch('https://ai.api.nvidia.com/v1/genai/qwen/qwen-image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${nvidiaKey}` },
  body: JSON.stringify({ prompt: extractedPrompt, samples: 1 }),
});
// Response: { artifacts: [{ base64: '...' }] } or { data: [{ b64_json: '...' }] }
```
