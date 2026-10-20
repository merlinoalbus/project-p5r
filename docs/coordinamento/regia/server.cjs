// Cruscotto di regia del team p5s: serve la pagina e la lavagna (../stato.json) su http://localhost:5999.
// Sola lettura: non scrive niente.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
// Dal 2026-10-20 sera l'unica fonte è il repository (docs/coordinamento/stato.json sul ramo newreview); si può cambiare con LAVAGNA
const LAVAGNA = process.env.LAVAGNA || 'C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/docs/coordinamento/stato.json';
const PORTA = Number(process.env.PORTA || 5999);

http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/stato.json') {
    fs.readFile(LAVAGNA, (err, dati) => {
      if (err) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end(String(err)); return; }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(dati);
    });
    return;
  }
  if (url === '/' || url === '/index.html') {
    fs.readFile(path.join(DIR, 'index.html'), (err, dati) => {
      if (err) { res.writeHead(500); res.end(String(err)); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(dati);
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORTA, '127.0.0.1', () => console.log(`Regia p5s su http://localhost:${PORTA}`));
