// ============================================================
// 352 — Kichijoji: i pin dei distributori portano il nome del loro negozio (L2-06, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// I nomi erano sfasati di uno: il pin 2316 «Distributore Automatico» puntava al negozio «… A», il 2317 «… A» al «… B», il 2318 «… B» al «… C». Il nome del
// pin diventa quello del negozio a cui punta, letto dal negozio. Cambia solo se il pin ha ancora uid, riferimento e nome attesi: un nome dato dall'utente
// nel frattempo resta. Le regole sui dati di ogni avvio non toccano questi nomi (`traduciNomiSpilli` guarda solo «Da identificare: …» dei pin di seed).
// Idempotente. Verbale: `dati_guida.audit-l2-06-nomi-pin-kichijoji`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviVerbale, type EsitoL2 } from './attrezziL2.js';

const PIN = [
  { id: 2316, uid: 'fc4a417b51a7574fdc9dc9b2dfdab948', negozio: 'u-distributore-di-kichijoji-1', nomeAtteso: 'Distributore Automatico' },
  { id: 2317, uid: 'ab1028b175d9f00d4e9c32114da712c6', negozio: 'u-distributore-di-kichijoji-2', nomeAtteso: 'Distributore Automatico A' },
  { id: 2318, uid: '83dadbb605f6ee444b1b2b779de83e89', negozio: 'u-distributore-automatico-c', nomeAtteso: 'Distributore Automatico B' },
] as const;

export const migration352: Migration = {
  id: 352,
  name: 'nomi_pin_kichijoji',
  up(db) {
    if (!['spillo', 'negozio', 'dati_guida'].every((t) => esisteTabella(db, t))) return;
    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    for (const p of PIN) {
      const voce = `nome del pin ${p.id}`;
      const pin = db.prepare('SELECT uid, nome, riferimento_tipo, riferimento_chiave FROM main.spillo WHERE id = ?').get(p.id) as { uid: string | null; nome: string; riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
      const nome = db.prepare('SELECT nome FROM main.negozio WHERE chiave = ?').pluck().get(p.negozio) as string | undefined;
      if (!pin || pin.uid !== p.uid || pin.riferimento_tipo !== 'negozio' || pin.riferimento_chiave !== p.negozio) esiti.push({ voce, esito: 'saltata', motivo: 'pin assente o con un altro riferimento' });
      else if (nome === undefined) esiti.push({ voce, esito: 'saltata', motivo: 'negozio assente' });
      else if (pin.nome === nome) esiti.push({ voce, esito: 'gia-fatta' });
      else if (pin.nome !== p.nomeAtteso) esiti.push({ voce, esito: 'saltata', motivo: `nome non atteso: ${pin.nome}` });
      else {
        db.prepare('UPDATE main.spillo SET nome = ?, updated_at = ? WHERE id = ? AND uid = ? AND nome = ?').run(nome, adesso, p.id, p.uid, p.nomeAtteso);
        esiti.push({ voce, esito: 'applicata', motivo: nome });
      }
    }
    if (scriviVerbale(db, 'audit-l2-06-nomi-pin-kichijoji', 'L2-06 · 352', esiti)) logger.info({ migrazione: 'L2-06-352' }, 'Kichijoji: nomi dei pin allineati ai negozi');
  },
};
