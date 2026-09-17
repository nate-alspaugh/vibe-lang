import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('.', import.meta.url));
const appRoot = join(repo, 'app');
const specRoot = join(repo, 'spec');
const port = Number(process.env.PORT) || 5317;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
  '.vibe': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = normalize(pathname.endsWith('/') ? `${pathname}index.html` : pathname).replace(/^(\.\.[/\\])+/, '');
  const servesSpec = relative.startsWith('/spec/');
  const base = servesSpec ? specRoot : appRoot;
  const file = join(base, servesSpec ? relative.slice('/spec'.length) : relative);
  if (!file.startsWith(base) || relative.split(/[/\\]/).some((part) => part.startsWith('.') && part.length > 1)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`just vibin' running at http://localhost:${port}`));
