# Agent Instructions

## Project Overview
- **Astro 6** with SSR output (`output: 'server'`)
- **React 19** components via `@astrojs/react`
- **TailwindCSS v4** (Vite plugin mode, no config file needed)
- **Vercel deployment** via `@astrojs/vercel` adapter
- **Node.js 22.12+** required

## Key Commands
```bash
npm run dev      # Local dev server (localhost:4321)
npm run build    # Production build to ./dist
npm run preview  # Preview production build
npm run astro    # Astro CLI (e.g., astro check, astro add)
```

## Architecture
```
src/
├── pages/       # File-based routes (Astro + API endpoints)
│   ├── api/     # API routes (e.g., /api/chat)
│   └── index.astro
├── components/  # React (.tsx) and Astro (.astro) components
├── services/    # Backend logic (e.g., chatService.ts)
├── layouts/     # Astro layouts
└── styles/      # Global styles
```

## Critical Conventions
- **API keys** stored in `.env` (never commit); `PUBLIC_` prefix for client exposure
- **SSR required**: All pages render server-side by default
- **React components**: Import as `.tsx` files; wrap with `<ClientOnly>` if hooks needed
- **Tailwind v4**: Uses CSS-first configuration; import styles in Astro files
- **React 19**: Must import `React` explicitly in `.tsx` files for JSX

## Design System
- **Color Palette**: Slate (950-900-400), Blue (600-950), Indigo (400-950)
- **Gradients**: `from-slate-950 via-slate-900 to-slate-950` for backgrounds
- **Borders**: `border-white/10` for subtle separation
- **Effects**: `backdrop-blur`, `shadow-blue-900/30` for depth
- **Animations**: `animate-fade-up` for entrance transitions
- **Responsive**: Mobile-first with `sm:`, `md:`, `lg:` breakpoints

## Gotchas
- **No TypeScript errors**: Config extends `astro/tsconfigs/strict`; check `.astro/types.d.ts`
- **Vercel adapter**: Must build before deploy; test with `npm run preview`
- **Env loading**: Server-side only unless prefixed with `PUBLIC_`
- **Grid pattern**: `public/grid.svg` used for background texture
- **JSX imports**: React 19 requires explicit `import React from 'react'` in some cases

## Testing & Verification
- No test suite configured yet
- Manual verification: `npm run dev` + check localhost:4321

## Related Files
- `astro.config.mjs` - Core config (adapter, integrations)
- `.env.example` - Required env vars template
- `.vscode/extensions.json` - Recommended Astro extension
- `src/styles/global.css` - Global styles and custom animations
