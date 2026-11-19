# SmartGridTwin.com

Static editorial foundation for SmartGridTwin.com. The site is intentionally dependency-light: semantic HTML, responsive CSS, and minimal JavaScript are ready for deployment through GitHub and Cloudflare Pages.

Production deploys follow the `main` branch through the dedicated Cloudflare Pages project `smartgridtwin-com`.

## Local preview

Open `index.html` directly, or serve this folder with any static web server.

## Structure

- `index.html` — homepage and editorial navigation
- `article.html` — reusable field-guide article example
- `styles.css` — responsive visual system
- `script.js` — mobile menu and newsletter interaction
- `smartgrid-hero.png` — approved production hero asset
- `robots.txt` and `sitemap.xml` — SEO foundation

## Local Common Engine pilot

The QA-only route `/play/` runs a fictional 96-step microgrid day. One step represents 15 minutes. The pilot uses the pinned local Common Engine 0.2.0 package for manual steps, autoplay, and transactional changes to the EV schedule and battery mode.

Build the Common Engine checkout on `codex/smartgrid-transaction-pilot` with `npm ci` and `npm test`. Create `qa` in this checkout, then run `npm pack --pack-destination <smartgrid-checkout>/qa` from the Common Engine checkout. In this checkout, use `npm ci`, `npm test`, and `npm run qa`. Open [the local pilot](http://127.0.0.1:4192/play/?qa-session=smartgrid-local). Choose a new `qa-session` slug for a fresh scenario and use the same slug to test conflict or reopening. The route requires a loopback origin and an explicit QA slug.

Autoplay begins stopped. Accepted plan changes are durable immediately. Use **Simpan checkpoint** to save tick progress between actions. At 24:00, compare the EV target and peak import to the built-in reference schedule. This baseline uses a fixed demand and solar profile for a repeatable comparison.

For browser regression, keep the local QA server running and set `SMARTGRID_QA_PLAYWRIGHT` to an installed Playwright `index.mjs`. Set `SMARTGRID_QA_CHROMIUM` to a local Chrome executable if needed. Run `npm run test:browser` to check the 96-tick replay, isolated native IndexedDB, stale tabs, aborted write and retry, durable action replay, and responsive layouts. An optional `SMARTGRID_QA_EVIDENCE` directory receives the desktop and mobile screenshots.
