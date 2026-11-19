# SmartGridTwin.com

SmartGridTwin.com pairs its field guides with a playable microgrid simulator at `/play/`.

Production deploys use the tested build of a `main` commit from private Common Engine CI. Upload the build's `dist` directory to the existing `smartgridtwin-com` Cloudflare Pages project. Check `/release.json` for the deployed commit and Common Engine version.

## Local preview

Install with `npm ci`, then run `npm run build` and `npm run qa`. The loopback server serves the same static files used for deployment.

## Structure

- `index.html` — homepage and editorial navigation
- `article.html` — reusable field-guide article example
- `styles.css` — responsive visual system
- `script.js` — mobile menu and newsletter interaction
- `smartgrid-hero.png` — approved production hero asset
- `robots.txt` and `sitemap.xml` — SEO foundation

## SmartGridTwin simulator

`/play/` runs a fictional 96-step microgrid day. One step represents 15 minutes. Common Engine 0.3.0 provides manual steps, autoplay, transactional plan changes, and diorama view history.

Private CI installs `@andiwijaya/common-engine@0.3.0` from GitHub Packages with the workflow's read-only token. Local development requires package read access for `npm ci`. The public route stores progress in the browser on the current origin. Named QA sessions are available on loopback and deployment-specific SmartGridTwin Pages preview addresses, each with its own IndexedDB database. Open [the local QA session](http://127.0.0.1:4192/play/?qa-session=smartgrid-local) after starting the server.

Autoplay begins stopped. Accepted plan changes are durable immediately. Use **Simpan checkpoint** to save tick progress between actions. At 24:00, compare the EV target and peak import to the built-in reference schedule. This baseline uses a fixed demand and solar profile for a repeatable comparison.

In **Utuh**, select **Charger EV** or **Baterai** in the diorama or use its button. The selected device opens its existing schedule or battery mode form. Use **Simpan jadwal EV** or **Simpan mode baterai** to commit the change. **Kembali** restores the previous camera pose, scroll position, and focus. Both buttons also work if WebGL is unavailable.

Run `npm test` for simulation and session tests. For browser regression, set `SMARTGRID_QA_PLAYWRIGHT` to an installed Playwright `index.mjs` and run `npm run test:browser`. Set `SMARTGRID_QA_URL` to a Pages preview origin to run the full suite there. Set `SMARTGRID_SMOKE_URL` to check the homepage, field guide, and regular `/play/` route in disposable browser contexts. An optional `SMARTGRID_QA_EVIDENCE` directory receives the screenshots.
