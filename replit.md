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

Tools implemented:
- **Image Compressor** — upload JPG/PNG/WebP, compress in-browser using `canvas.toBlob`, with quality slider, format select (JPEG/WebP/PNG), original vs compressed preview, file-size + savings display, and a download link. Drag-and-drop supported.

Everything runs client-side; nothing is uploaded.
