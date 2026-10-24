// ============================================================
// 181 — le fusioni della Stanza di Velluto con esito certo registrano la Persona (R10-11/2)
// ============================================================
//
// Due voci del Diario dicono una fusione il cui risultato è una Persona precisa:
//   04-20  «Stanza di Velluto: sbloccare la Fusione Persona (fondere Pixie e Arsene in Agathion, ereditando Eiha)»   → Agathion
//   05-10  «Stanza di Velluto. Fondi Berith + Bicorno per ottenere Kushi Mitama (Consigliere) quindi rievoca Berith» → Kushi Mitama
// Ognuna riceve un effetto `persona`: la spunta registra la Persona nel compendio della partita (con `registraPersona`, l'unica scrittura), togliere la
// spunta la riporta com'era. Restano voci informative le altre del Velluto: dove la Persona non è certa («registrare/evocare o fondere» quattro Persona il
// 23/4, «crea una Persona dell'arcano del Sole» il 22/5), dove si ritira o si incontra qualcuno, e le fusioni delle Gemelle. L'effetto vale dalla prossima
// spunta: le spunte già date non riapplicano niente e nessuna proposta nasce. Solo `main`; testo, ordine, giorno e uid delle voci non cambiano. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const FUSIONI: ReadonlyArray<{ voce: string; testo: string; nome: string }> = [
  { voce: '21aecf2c73015fb8f81eca38a7ac87dd', testo: 'fondere Pixie e Arsene in Agathion', nome: 'Agathion' },
  { voce: '2b2d7b3195df0d2c1cddf1b1f5e3b52e', testo: 'per ottenere Kushi Mitama', nome: 'Kushi Mitama' },
];

export const migration181: Migration = {
  id: 181, name: 'fusioni_velluto_registrano_la_persona',
  up(db) {
    const esiti = FUSIONI.map((f) => {
      // l'id della Persona si legge per nome (esatto, non del gruppo): se non c'è o non è una sola, la voce resta com'è
      const persone = db.prepare('SELECT id FROM main.persona WHERE nome = ? AND del_party = 0').all(f.nome) as Array<{ id: number }>;
      if (persone.length !== 1) return 'saltato' as const;
      return aggiungiEffettoAllaVoce(db, '181', f.voce, f.testo, { tipo: 'persona', persona: persone[0]!.id }, String(persone[0]!.id));
    });
    const conta = (e: string) => esiti.filter((x) => x === e).length;
    logger.info({ aggiunti: conta('aggiunto'), presenti: conta('presente'), saltati: conta('saltato') }, '[migration181] fusioni del Velluto registrano la Persona');
  },
};
