import {build} from 'esbuild';
import {copyFile, mkdir, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {basename, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = join(root, 'dist');
const commit = process.env.SMARTGRID_RELEASE_SHA ?? null;
if (commit !== null && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Expected a full SmartGridTwin commit SHA.');

const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const engine = lock.packages['node_modules/@andiwijaya/common-engine'].version;
const installed = JSON.parse(await readFile(join(root, 'node_modules/@andiwijaya/common-engine/package.json'), 'utf8'));
if (installed.version !== engine) throw new Error('Installed Common Engine does not match the lockfile.');

const existingDist = await realpath(dist).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (existingDist && existingDist !== dist) throw new Error('Expected dist inside the SmartGridTwin checkout.');
await rm(dist, {recursive: true, force: true});
await mkdir(join(dist, 'play'), {recursive: true});

const staticFiles = [
  'index.html', 'article.html', 'styles.css', 'script.js',
  'smartgrid-hero.png', 'robots.txt', 'sitemap.xml', 'play/pilot.css',
];
await Promise.all(staticFiles.map(file => copyFile(join(root, file), join(dist, file))));
await copyFile(join(root, 'node_modules/three/LICENSE'), join(dist, 'play/three-license.txt'));

const result = await build({
  absWorkingDir: root,
  entryPoints: ['play/pilot.mjs'],
  outdir: 'dist/play/assets',
  entryNames: '[name]-[hash]',
  chunkNames: '[name]-[hash]',
  bundle: true,
  splitting: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  metafile: true,
});
const bundle = Object.entries(result.metafile.outputs).find(([, info]) => info.entryPoint === 'play/pilot.mjs');
if (!bundle) throw new Error('The SmartGridTwin game bundle is missing.');
const template = await readFile(join(root, 'play/index.html'), 'utf8');
await writeFile(join(dist, 'play/index.html'), template.replace('./pilot.mjs', './assets/' + basename(bundle[0])));
await writeFile(join(dist, 'release.json'), JSON.stringify({commit, engine}) + '\n');
