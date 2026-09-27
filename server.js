// server.js — Simple Node.js server for Unscripted NITT
// Works everywhere, bypasses PowerShell script policies.
// Local development only: listens on 127.0.0.1 and serves files from the
// project folder, never outside it and never dotfiles (.git, .env, ...).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const HOST = '127.0.0.1';
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (_) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(ROOT, '.' + urlPath);
  const relative = path.relative(ROOT, filePath);
  const blocked = relative.startsWith('..') || path.isAbsolute(relative)
    || relative.split(path.sep).some(part => part.startsWith('.') || part === 'node_modules');
  if (blocked) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Unscripted Server Live at: http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server.`);
});
