// ============================================================
// supertest condiviso — `request(app)` dei test con UN server per app, in ascolto finché il file di test non finisce
// ============================================================
//
// Il `supertest` vero, a ogni `request(app)`, crea un server nuovo su una porta effimera e lo chiude dopo la risposta: due porte
// per richiesta (il server e la connessione). Nella suite, con i file in parallelo e test da centinaia di richieste (risalvare
// ogni Palazzo con aree e punti), su Windows le porte in TIME_WAIT finivano e una connessione falliva con `connect EADDRINUSE`:
// un test instabile, già prima della verifica completa (visto il 2026-10-04 anche sul commit precedente alle modifiche).
//
// Qui ogni app (la funzione di Express) ha il suo server, creato alla prima richiesta e già in ascolto: supertest, quando trova
// un server in ascolto, lo usa e non lo chiude, e le connessioni keep-alive dell'agente predefinito di Node si riusano. I server
// si chiudono alla fine di ogni file di test (`test/setup.ts`). Server già pronti e indirizzi in forma di stringa passano tali e
// quali.
//
// Si attiva con un alias in `vitest.config.ts` (`supertest` → questo file): i test continuano a scrivere
// `import request from 'supertest'`. Il modulo vero si carica con `require`, che l'alias non tocca.
// ============================================================

import http from 'node:http';
import { createRequire } from 'node:module';
import type supertestTipo from 'supertest';

const supertestVero = createRequire(import.meta.url)('supertest') as typeof supertestTipo;

/** I server e l'agente aperti da questo file di test: `test/setup.ts` li chiude in `afterAll`. */
const APERTI_KEY = '__serverSupertestCondivisi';
type Registro = Set<http.Server | http.Agent>;
const aperti = (): Registro => ((globalThis as Record<string, unknown>)[APERTI_KEY] ??= new Set<http.Server | http.Agent>()) as Registro;

const serverPerApp = new WeakMap<object, http.Server>();

/** Superagent per default non usa un agente (`agent: false`): una connessione nuova per richiesta. Questo le riusa. */
let agente: http.Agent | null = null;
function agenteKeepAlive(): http.Agent {
  if (!agente) {
    agente = new http.Agent({ keepAlive: true });
    aperti().add(agente);
  }
  return agente;
}

function serverDi(app: Parameters<typeof supertestVero>[0]): Parameters<typeof supertestVero>[0] {
  if (typeof app !== 'function') return app;
  let server = serverPerApp.get(app);
  if (!server) {
    // senza host il server si lega subito (indirizzo disponibile al ritorno di `listen`): supertest lo trova già in ascolto
    server = http.createServer(app as http.RequestListener).listen(0);
    serverPerApp.set(app, server);
    aperti().add(server);
  }
  return server;
}

/** Ogni richiesta creata dalla fabbrica di supertest (`get`, `post`, …) usa l'agente keep-alive; il resto passa invariato. */
function conAgente<T extends object>(fabbrica: T): T {
  return new Proxy(fabbrica, {
    get(obiettivo, chiave, ricevente) {
      const valore = Reflect.get(obiettivo, chiave, ricevente) as unknown;
      if (typeof valore !== 'function') return valore;
      return (...argomenti: unknown[]) => {
        const esito = (valore as (...a: unknown[]) => unknown).apply(obiettivo, argomenti) as { agent?: (a: http.Agent) => unknown } | undefined;
        return esito && typeof esito.agent === 'function' ? esito.agent(agenteKeepAlive()) : esito;
      };
    },
  });
}

const request = ((app: Parameters<typeof supertestVero>[0], ...resto: unknown[]) =>
  conAgente((supertestVero as unknown as (...a: unknown[]) => object)(serverDi(app), ...resto))) as unknown as typeof supertestVero;
// `request.agent`, `request.Test` e il resto dell'interfaccia restano quelli veri
Object.assign(request, supertestVero);

export default request;
