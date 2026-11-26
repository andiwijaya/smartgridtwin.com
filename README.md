# SmartGridTwin.com

SmartGridTwin.com hosts energy guides and a browser-based electricity grid simulator. The site uses static HTML, CSS, and JavaScript and deploys through GitHub and Cloudflare Pages.

Production deploys follow the `main` branch through the dedicated Cloudflare Pages project `smartgridtwin-com`.

## Local preview

Serve the repository with a static web server. For example, run `python -m http.server 8000 --bind 127.0.0.1`, then open `http://127.0.0.1:8000/`. The simulator is available at `/play/` and stores its campaign in the current browser.

Run the simulation regression checks with `node --test tests/simulation.test.mjs`.

## Structure

- `index.html` and `home.css` — simulator landing page
- `play/` — interactive 3D grid simulator
- `tutorial/` — illustrated simulator guide
- `CHECKLIST.md` — agreed scope and verification status
- `article.html` — reusable field-guide article example
- `styles.css` — styles for the field guide
- `robots.txt` and `sitemap.xml` — SEO foundation
