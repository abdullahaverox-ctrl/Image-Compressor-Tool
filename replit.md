# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### image-tools (`/`)

A free static Image Tools website served by Vite as plain HTML/CSS/JS (no React, no backend).

Pages (all in `artifacts/image-tools/`):
- `index.html` — homepage with hero, tools, About / How to Use / FAQ content sections
- `about.html` — About Us
- `privacy.html` — Privacy Policy
- `contact.html` — Contact form (client-side only, no backend submission)

Shared assets:
- `style.css` — all styles
- `script.js` — homepage JS: image tools logic + tab nav + mobile nav toggle
- `pages.js` — small shared script for sub-pages (footer year, mobile nav toggle, contact form handler)

Multi-page Vite build: all four HTML files are registered in `vite.config.ts` `build.rollupOptions.input`.

Top navigation (sticky header) on every page: Home · About · Privacy Policy · Contact. Footer has matching links plus copyright. Mobile shows a hamburger toggle.

Tools (homepage, switchable via tab nav):
- **Image Compressor** — upload JPG/PNG/WebP, compress in-browser using `canvas.toBlob`, with quality slider (10–90), format select (JPEG/WebP), original vs compressed preview, file-size + savings display, smart fallback to original if compression doesn't reduce size, and a download link.
- **Image Resizer** — upload JPG/PNG/WebP, set new width/height (with optional aspect-ratio lock), pick output format (PNG/JPEG/WebP), redraws via Canvas with high-quality smoothing, shows resized preview with file size and dimensions, and a download link.

Both tools support: drag-and-drop, "Reset", "Choose another image" (re-opens picker, allows re-selecting the same file), and a download button that stays disabled until a result is ready.

Homepage SEO content sections: About This Website (~280 words), How to Use (3 numbered steps), FAQ (4 native `<details>` items).

Everything runs client-side; nothing is uploaded.
