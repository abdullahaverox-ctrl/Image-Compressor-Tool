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

Files (all in `artifacts/image-tools/`):
- `index.html` — page markup
- `style.css` — styles
- `script.js` — image-compressor logic using the Canvas API

Tools implemented (switchable via tab nav):
- **Image Compressor** — upload JPG/PNG/WebP, compress in-browser using `canvas.toBlob`, with quality slider (10–90), format select (JPEG/WebP), original vs compressed preview, file-size + savings display, smart fallback to original if compression doesn't reduce size, and a download link. Drag-and-drop supported.
- **Image Resizer** — upload JPG/PNG/WebP, set new width/height (with optional aspect-ratio lock that auto-syncs the other dimension), pick output format (PNG/JPEG/WebP), redraws via Canvas with high-quality smoothing, shows original vs resized preview with file sizes and dimensions, and a download link.

Both tools support: drag-and-drop, "Reset", "Choose another image" (re-opens picker, allows re-selecting the same file), and a download button that stays disabled until a result is ready.

Everything runs client-side; nothing is uploaded.
