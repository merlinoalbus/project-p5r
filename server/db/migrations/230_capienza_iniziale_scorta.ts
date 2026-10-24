// ============================================================
// 230 — capienza iniziale della riserva di Personae (6 posti), nei dati di gioco con la sua fonte
// ============================================================
//
// La pagina Scorta mostra i posti massimi della squadra, che salgono con il rango di Igor (rango 3 → 8, rango 5 → 10, rango 8 → 12:
// gradini già nelle abilità di `confidente_abilita`, come nella guida italiana). Il valore di PARTENZA, prima del rango 3, non è nella
// guida italiana e non è un'abilità di Igor: lo riporta la guida inglese di Twinfinite («up to six Personas»). Qui si salva in
// `dati_guida`, chiave `capienza-scorta`, come `{ posti, fonte }`; `capienzaScortaService` lo legge quando nessun gradino è raggiunto.
// Idempotente e conservativa: inserisce la riga solo se manca (una correzione fatta a mano non torna indietro) e non tocca altro.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const CHIAVE = 'capienza-scorta';
const DATO = {
  posti: 6,
  fonte: {
    titolo: 'Persona 5: how to increase Persona capacity (Twinfinite)',
    url: 'https://twinfinite.net/guides/persona-5-increase-persona-capacity-carry-more-personas-how-to/',
    nota: 'La guida italiana non riporta il valore di partenza; la guida inglese dice che si parte con un massimo di sei Persona (up to six Personas).',
  },
};

export const migration230: Migration = {
  id: 230,
  name: 'capienza_iniziale_scorta',
  up(db) {
    const tabella = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get();
    if (!tabella) return;
    db.prepare('INSERT OR IGNORE INTO dati_guida (chiave, json) VALUES (?, ?)').run(CHIAVE, JSON.stringify(DATO));
  },
};
