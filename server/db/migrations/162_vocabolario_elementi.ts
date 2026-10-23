// ============================================================
// 162 — vocabolario unico degli elementi (L8, R8-20c): le 13 etichette di `traduzione` portate ai nomi della guida
// ============================================================
//
// Un nome italiano per ogni elemento, quello della guida (G-025): Psichico → Psicocinesi, Oscurità → Maledizione, Quasi-divino → Divino,
// Guarigione → Recupero. Le etichette sono lette per chiave da compendio, fusione, skill e Battaglia, quindi si correggono in un punto
// solo (`shared/elementi.ts` è il riferimento del codice).
//
//   elementoSkill     psy, curse, almighty, healing   (4)
//   elementoAffinita  psy, curse                      (2)
//   colonnaEredita    psy, curse, healing             (3)
//   tipoEredita       Psy, Curse, Almighty, Healing   (4)
//   + la sigla di Maledizione nelle affinità: «Osc» → «Mal»
//
// Conservativa: una riga si scrive solo se è ancora di origine `seed` e ha esattamente il valore di prima; una riga dell'utente o con un
// altro valore resta com'è e finisce nell'elenco (`dati_guida` `vocabolario-l8-162`). Non tocca i testi liberi (descrizioni, voci, pin,
// note dell'utente: le due voci boss di Madarame con «Gelo» e «respinge» restano come le ha scritte) né `partite.db`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

interface Correzione { ambito: string; chiave: string; prima: string; dopo: string }

const CORREZIONI: ReadonlyArray<Correzione> = [
  { ambito: 'elementoSkill', chiave: 'psy', prima: 'Psichico', dopo: 'Psicocinesi' },
  { ambito: 'elementoSkill', chiave: 'curse', prima: 'Oscurità', dopo: 'Maledizione' },
  { ambito: 'elementoSkill', chiave: 'almighty', prima: 'Quasi-divino', dopo: 'Divino' },
  { ambito: 'elementoSkill', chiave: 'healing', prima: 'Guarigione', dopo: 'Recupero' },
  { ambito: 'elementoAffinita', chiave: 'psy', prima: 'Psichico', dopo: 'Psicocinesi' },
  { ambito: 'elementoAffinita', chiave: 'curse', prima: 'Oscurità', dopo: 'Maledizione' },
  { ambito: 'colonnaEredita', chiave: 'psy', prima: 'Psichico', dopo: 'Psicocinesi' },
  { ambito: 'colonnaEredita', chiave: 'curse', prima: 'Oscurità', dopo: 'Maledizione' },
  { ambito: 'colonnaEredita', chiave: 'healing', prima: 'Guarigione', dopo: 'Recupero' },
  { ambito: 'tipoEredita', chiave: 'Psy', prima: 'Psichico', dopo: 'Psicocinesi' },
  { ambito: 'tipoEredita', chiave: 'Curse', prima: 'Oscurità', dopo: 'Maledizione' },
  { ambito: 'tipoEredita', chiave: 'Almighty', prima: 'Quasi-divino', dopo: 'Divino' },
  { ambito: 'tipoEredita', chiave: 'Healing', prima: 'Guarigione', dopo: 'Recupero' },
];

type Esito = { voce: string; esito: 'applicata' | 'gia-fatta' | 'saltata'; motivo?: string };

interface Riga { testo: string; extra_json: string | null; fonte: string }

export const migration162: Migration = {
  id: 162,
  name: 'vocabolario_elementi',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!ok('traduzione')) return;
    const adesso = new Date().toISOString();
    const leggi = db.prepare('SELECT testo, extra_json, fonte FROM main.traduzione WHERE ambito = ? AND chiave = ?');
    const scrivi = db.prepare("UPDATE main.traduzione SET testo = ?, updated_at = ? WHERE ambito = ? AND chiave = ? AND testo = ? AND fonte = 'seed'");
    const esiti: Esito[] = [];

    for (const c of CORREZIONI) {
      const voce = `${c.ambito}:${c.chiave}`;
      const r = leggi.get(c.ambito, c.chiave) as Riga | undefined;
      if (!r) { esiti.push({ voce, esito: 'saltata', motivo: 'etichetta assente' }); continue; }
      if (r.testo === c.dopo) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
      if (r.testo !== c.prima) { esiti.push({ voce, esito: 'saltata', motivo: `valore diverso da quello noto («${r.testo}»)` }); continue; }
      if (r.fonte !== 'seed') { esiti.push({ voce, esito: 'saltata', motivo: 'etichetta scritta dall’utente' }); continue; }
      esiti.push(scrivi.run(c.dopo, adesso, c.ambito, c.chiave, c.prima).changes === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'cambiata nel frattempo' });
    }

    // La sigla di Maledizione nelle affinità: «Osc» (sigla di Oscurità) → «Mal», solo se la riga è ancora quella del seed.
    {
      const voce = 'elementoAffinita:curse (sigla)';
      const r = leggi.get('elementoAffinita', 'curse') as Riga | undefined;
      if (!r) esiti.push({ voce, esito: 'saltata', motivo: 'etichetta assente' });
      else if (r.fonte !== 'seed') esiti.push({ voce, esito: 'saltata', motivo: 'etichetta scritta dall’utente' });
      else if (r.extra_json === '{"sigla":"Mal"}') esiti.push({ voce, esito: 'gia-fatta' });
      else if (r.extra_json !== '{"sigla":"Osc"}') esiti.push({ voce, esito: 'saltata', motivo: 'sigla diversa da quella nota' });
      else {
        const n = db.prepare("UPDATE main.traduzione SET extra_json = '{\"sigla\":\"Mal\"}', updated_at = ? WHERE ambito = 'elementoAffinita' AND chiave = 'curse' AND extra_json = '{\"sigla\":\"Osc\"}' AND fonte = 'seed'").run(adesso).changes;
        esiti.push(n === 1 ? { voce, esito: 'applicata' } : { voce, esito: 'saltata', motivo: 'cambiata nel frattempo' });
      }
    }

    if (ok('dati_guida') && esiti.some((e) => e.esito !== 'gia-fatta')) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('vocabolario-l8-162', JSON.stringify({ versione: 1, esiti }));
    }
    logger.info({ applicate: esiti.filter((e) => e.esito === 'applicata').length, saltate: esiti.filter((e) => e.esito === 'saltata') }, '[migration162] vocabolario degli elementi');
  },
};
