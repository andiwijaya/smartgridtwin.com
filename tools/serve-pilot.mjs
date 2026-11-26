import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml',
};
const port = Number(process.env.SMARTGRID_QA_PORT ?? '4192');

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = resolve(dist, '.' + (path.endsWith('/') ? path + 'index.html' : path));
  const within = relative(dist, file);
  const type = types[extname(file)];
  if (request.method !== 'GET' || !type || within === '..' || within.startsWith('..' + sep) || isAbsolute(within)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'}).end(content);
  } catch {
    response.writeHead(404).end('Build file unavailable');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('SmartGridTwin QA http://127.0.0.1:' + port + '/microgrid/?qa-session=smartgrid-local');
});
