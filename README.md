# SmartGridTwin.com

SmartGridTwin.com hosts a 3D grid simulator at `/play/` and its illustrated guide at `/tutorial/`. The original EV and battery microgrid simulator is available at `/microgrid/`. Existing microgrid checkpoints are stored per browser origin and can be reopened at the new route.

## Build and deploy

Install dependencies with `npm ci`, then run `npm test` and `npm run build`. The build bundles the original microgrid simulator with the pinned Common Engine, then packages the rest of the site as static files. Set `SMARTGRID_RELEASE_SHA` to the full commit hash for a release build.

Production deploys use the tested `dist` artifact for a `main` commit. Upload that artifact to the `smartgridtwin-com` Cloudflare Pages project. Check `/release.json` for the deployed commit and the Common Engine version bundled with the microgrid simulator.

## Local preview and tests

- Run `npm run qa` to serve the built site on loopback.
- Run `node --test tests/simulation.test.mjs` to check the new grid simulation without installing dependencies.
- The microgrid build requires access to `@andiwijaya/common-engine@0.3.0` on GitHub Packages. Private CI uses a read-only package token.
- Run `npm run test:browser` to check the microgrid, with `SMARTGRID_QA_PLAYWRIGHT` pointing to an installed Playwright module if needed. `SMARTGRID_QA_URL` and `SMARTGRID_SMOKE_URL` select a preview or production origin. A named loopback QA session starts at `/microgrid/?qa-session=smartgrid-local`.

## Structure

- `index.html` and `home.css` — simulator landing page
- `play/` — 3D grid simulator and microgrid source modules
- `microgrid/` — original EV and battery simulator template
- `tutorial/` — illustrated simulator guide
- `article.html` and `styles.css` — field guide
- `CHECKLIST.md` — scope and verification status
