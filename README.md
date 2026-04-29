# Image Tools

A free, fast, and private online image toolkit. Compress, resize, and convert images right in your browser — nothing is uploaded to any server.

**Live site:** _add your Vercel URL here_

## Tools

- **Image Compressor** — Reduce JPG, PNG, or WebP file size with a quality slider. Choose JPEG or WebP output.
- **Image Resizer** — Set new dimensions with optional aspect-ratio lock. Export as PNG, JPEG, or WebP.

Both tools run entirely client-side using the HTML5 Canvas API. Your files never leave your device.

## Pages

- `/` — Home (image tools)
- `/about` — About Us
- `/privacy` — Privacy Policy
- `/contact` — Contact Us

## Tech

Pure static site — just HTML, CSS, and vanilla JavaScript. **No build step. No backend. No dependencies.**

## Project structure

```
.
├── index.html        # Homepage (image tools, FAQ, How to Use)
├── about.html        # About Us page
├── privacy.html      # Privacy Policy page
├── contact.html      # Contact Us page
├── style.css         # All styles
├── script.js         # Homepage JS (image tools + tab nav + mobile nav)
├── pages.js          # Sub-page JS (mobile nav + contact form)
├── vercel.json       # Vercel config (clean URLs + cache headers)
└── README.md
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Leave **Framework Preset** as "Other" — no build command, no output directory.
4. Deploy.

`vercel.json` enables clean URLs (`/about` instead of `/about.html`) and adds long-lived cache headers for CSS and JS.

## Local preview

Open `index.html` directly in your browser, or run a tiny static server:

```bash
python3 -m http.server 5000
```

Then visit <http://localhost:5000>.
