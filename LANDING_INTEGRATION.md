Integration of Next.js Tailwind landing page into this project

What I did
- Cloned the Next.js Tailwind landing repo into `landing/`.
- Built the landing site and exported static HTML/CSS/JS.
- Copied the exported static files into `public/landing/` so your existing CRA app can serve it without running a separate server.
- Added a "Landing" link to the sidebar that opens `/landing/`.

How to view the landing UI
1. Start your usual frontend dev server (the one that serves this CRA app):

```bash
npm start
```

2. In the running app, open the sidebar and click "Landing" — it opens the static landing at `/landing/`.

Direct URL (static files):
- Production build: `/landing/index.html`
- Dev server: `/landing/index.html` (served from `public/landing`)

Notes and alternatives
- I adjusted `landing/next.config.js` to allow a static export of the Next.js app. The `landing/` folder still contains the original Next.js source if you want to iterate on the landing design separately.
- If you prefer the landing design merged into React components inside `src/`, I can convert the landing pages into React components and Tailwind setup for CRA (requires adding Tailwind and PostCSS to this project).
- I can also add a root npm script to automate rebuilding and copying the landing export; tell me if you want that.

Files changed/created
- `landing/` (cloned repo)
- `public/landing/` (static export copied here)
- `src/components/Sidebar/Sidebar.js` (added Landing link)
- `landing/next.config.js` (updated for static export)
- `LANDING_INTEGRATION.md` (this file)

If you'd like me to convert the landing pages into React components inside `src/` (so they share your app header/footer and routing), say so and I'll implement the conversion and add Tailwind support.