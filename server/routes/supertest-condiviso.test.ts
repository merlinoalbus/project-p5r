// ============================================================
// Test dell'infrastruttura: `request(app)` usa un server per app e riusa la connessione (test/supertest.ts)
// ============================================================
//
// Senza, ogni richiesta apriva un server e una connessione nuovi: due porte effimere per richiesta, e la suite su Windows
// finiva le porte (`connect EADDRINUSE`, test instabile). Qui l'app risponde con le porte che vede: la porta locale è quella del
// server, la remota quella della connessione del client.

import express from 'express';
import request from 'supertest';

const app = express();
app.get('/porte', (req, res) => { res.json({ server: req.socket.localPort, connessione: req.socket.remotePort }); });

it('due richieste alla stessa app arrivano allo stesso server, sulla stessa connessione', async () => {
  const prima = (await request(app).get('/porte').expect(200)).body as { server: number; connessione: number };
  const seconda = (await request(app).get('/porte').expect(200)).body as { server: number; connessione: number };
  expect(seconda.server).toBe(prima.server);
  expect(seconda.connessione).toBe(prima.connessione);
});

it('un\'altra app ha il suo server', async () => {
  const altra = express();
  altra.get('/porte', (req, res) => { res.json({ server: req.socket.localPort }); });
  const a = (await request(app).get('/porte')).body as { server: number };
  const b = (await request(altra).get('/porte')).body as { server: number };
  expect(b.server).not.toBe(a.server);
});
