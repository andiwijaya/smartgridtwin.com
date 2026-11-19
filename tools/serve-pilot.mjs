import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const engine = new URL('./', import.meta.resolve('@andiwijaya/common-engine'));
const play = new URL('../play/', import.meta.url);
const files = new Map([
  ['/play/', [new URL('index.html', play), 'text/html']],
  ['/play/pilot.css', [new URL('pilot.css', play), 'text/css']],
  ...['pilot.mjs', 'session.mjs', 'microgrid.mjs'].map(name =>
    ['/play/' + name, [new URL(name, play), 'text/javascript']]),
  ...['index.js', 'runtime.js', 'transactional-session.js', 'checkpoint-store.js'].map(name =>
    ['/play/engine/' + name, [new URL(name, engine), 'text/javascript']]),
]);

const port = Number(process.env.SMARTGRID_QA_PORT ?? '4192');
createServer(async (request, response) => {
  const path = request.url?.split('?')[0];
  const entry = files.get(path);
  if (request.method !== 'GET' || !entry) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(entry[0]);
    response.writeHead(200, {'Content-Type': entry[1] + '; charset=utf-8', 'Cache-Control': 'no-store'});
    response.end(content);
  } catch {
    response.writeHead(500).end('Pilot file unavailable');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('SmartGridTwin QA http://127.0.0.1:' + port + '/play/?qa-session=smartgrid-local');
});
