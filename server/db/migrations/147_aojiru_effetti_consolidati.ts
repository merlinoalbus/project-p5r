// ============================================================
// 147 — gli effetti dell'Aojiru consolidati, senza pannello di approvazione (BON-03/04, piano approvato dall'utente il 23/10)
// ============================================================
//
// I candidati «Aojiru» del Diario (`proposta_effetto_voce` aperte) aspettavano una conferma una per una. Si consolidano qui, dalla
// rotazione del succo e dal nome che la guida stessa scrive nella voce:
//   Bellezza → Fascino · Vitalità (energizzante) → Perizia · Disgustoso → Coraggio · Onsen (termale) → Gentilezza ·
//   Frutti di mare (alghe) → Conoscenza.
// Il succo è «certo» se la voce nomina un solo sapore di questa lista, o se la data è una delle domeniche date per certe dalle fonti
// Royal (e il testo, se nomina un sapore, concorda); altrimenti l'effetto nasce senza variante (resta da indicare quando si registra
// il consumo) e il motivo del candidato lo dice. Una voce che ha già un effetto Aojiru (le conferme
// esistenti) non si tocca. L'effetto nasce con origine «regola» e senza `fortuna`: la Fortuna è lo stato della partita (R10-10/2).
//
// Il campo `fortuna: null` si toglie anche dai candidati e dagli effetti di acquisto che lo portano. Un effetto con una ricevuta o con
// un consumo che ne dipende non si riscrive (le ricevute confrontano il suo testo esatto). Questa migrazione scrive SOLO in `main`
// (legge `utente` per riconoscere gli effetti usati, non scrive): le proposte «effetto della voce» che citano un effetto ripulito
// (copia dell'effetto e impronta della configurazione) le riallinea la migrazione utente 038, che gira dopo di lei.
// Niente viene cancellato; nessun avanzamento delle partite cambia. Nessuna proposta nasce per le spunte già date: sui dati di p5s i
// 20 effetti Aojiru hanno solo 5 spunte (Partita 1: 04-24, 05-01, 05-08, 05-29; Partita 2: 04-24), tutte con la loro proposta già
// aperta (tranne la prima, chiusa «già nel saldo» dalla 033), quindi il pulsante sulla voce compare per le quattro dopo il 30/09.
// Ogni consolidamento lascia la riga del registro delle operazioni. Idempotente.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ARTICOLO = 'chiosco-kiyasuku/succo-aojiru';
// Il nome del sapore come lo scrive la guida italiana. «alghe» (frutti di mare) e «energizzante» (vitalità) sono i nomi che le voci già
// confermate usano per Conoscenza e Perizia.
const SAPORI: ReadonlyArray<readonly [RegExp, string]> = [
  [/bellezza/, 'fascino'], [/vitalit[aà]|energizzante/, 'perizia'], [/disgustos/, 'coraggio'], [/onsen|termal/, 'gentilezza'], [/frutti di mare|alghe/, 'conoscenza'],
];
// Le domeniche che le fonti Royal (AllGameStaff, ricerca del 23/10) danno per certe. Servono solo per le voci senza il nome del sapore,
// e come controllo di quelle che lo hanno: un testo che contraddice la data lascia la voce senza variante. Le altre domeniche non si
// ricavano dalla rotazione: le fonti divergono sulle settimane saltate.
const DATE_CERTE: Readonly<Record<string, string>> = {
  '04-24': 'fascino', '06-05': 'fascino', '07-31': 'fascino', '09-25': 'fascino', '11-06': 'fascino', '01-22': 'fascino',
  '05-08': 'coraggio', '06-26': 'coraggio', '10-09': 'coraggio', '11-27': 'coraggio',
};

/** JSON con le chiavi in ordine, come `jsonCanonico` dei registri (la copia è congelata qui). */
function canonico(v: unknown): string {
  const ordina = (x: unknown): unknown => Array.isArray(x) ? x.map(ordina)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]))
      : x ?? null;
  return JSON.stringify(ordina(v));
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const uid32 = (...parti: string[]) => createHash('sha256').update(parti.join('\0')).digest('hex').slice(0, 32);
const oggetto = (testo: string): Record<string, unknown> | null => {
  try { const v = JSON.parse(testo) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
};
const esiste = (db: AppDatabase, schema: string, tabella: string): boolean => {
  try { return !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type='table' AND name=?`).get(tabella); } catch { return false; }
};

export const migration147: Migration = {
  id: 147,
  name: 'aojiru_effetti_consolidati',
  up(db) {
    for (const t of ['voce_effetto', 'voce_effetto_transizione', 'proposta_effetto_voce', 'operazione_effetti_voce']) if (!esiste(db, 'main', t)) return;
    const adesso = new Date().toISOString();
    const usatoDaUnaPartita = (voce: string, effetto: string): boolean =>
      (esiste(db, 'utente', 'effetto_applicato') && !!db.prepare('SELECT 1 FROM utente.effetto_applicato WHERE voce_uid=? AND effetto_uid=? LIMIT 1').get(voce, effetto))
      || (esiste(db, 'utente', 'acquisto_provenienza') && !!db.prepare('SELECT 1 FROM utente.acquisto_provenienza WHERE voce_uid=? AND effetto_uid=? LIMIT 1').get(voce, effetto));
    const riallineaTransizione = (voce: string) => {
      const effetti = (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(voce) as Array<{ dati_json: string }>).map((r) => oggetto(r.dati_json));
      db.prepare('UPDATE main.voce_effetto_transizione SET impronta=?, aggiornata_il=? WHERE voce_uid=?').run(impronta(effetti), adesso, voce);
    };
    let tolti = 0, consolidati = 0, conVariante = 0, incerti = 0, saltati = 0;

    // 1. `fortuna: null` fuori dai candidati e dagli effetti di acquisto non ancora usati da nessuna partita
    for (const r of db.prepare("SELECT id, dati_json FROM main.proposta_effetto_voce WHERE tipo='acquisto'").all() as Array<{ id: string; dati_json: string }>) {
      const d = oggetto(r.dati_json);
      if (!d || !('fortuna' in d) || d.fortuna !== null) continue;
      delete d.fortuna;
      db.prepare('UPDATE main.proposta_effetto_voce SET dati_json=? WHERE id=?').run(canonico(d), r.id); tolti++;
    }
    for (const r of db.prepare("SELECT uid, voce_uid, dati_json FROM main.voce_effetto WHERE tipo='acquisto'").all() as Array<{ uid: string; voce_uid: string; dati_json: string }>) {
      const d = oggetto(r.dati_json);
      if (!d || !('fortuna' in d) || d.fortuna !== null || usatoDaUnaPartita(r.voce_uid, r.uid)) continue;
      delete d.fortuna;
      db.prepare('UPDATE main.voce_effetto SET dati_json=?, updated_at=? WHERE uid=?').run(canonico(d), adesso, r.uid);
      riallineaTransizione(r.voce_uid); tolti++;
    }

    // 2. i candidati Aojiru ancora aperti diventano effetti della voce
    const candidati = db.prepare("SELECT id, voce_uid, dati_json, motivo FROM main.proposta_effetto_voce WHERE tipo='acquisto' AND stato='aperta' ORDER BY voce_uid, id").all() as Array<{ id: string; voce_uid: string; dati_json: string; motivo: string }>;
    for (const c of candidati) {
      const d = oggetto(c.dati_json);
      const voce = db.prepare('SELECT genere, azione, data FROM main.voce_giornata WHERE uid=?').get(c.voce_uid) as { genere: string; azione: string; data: string } | undefined;
      const transizione = db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid=?').get(c.voce_uid) as { stato: string } | undefined;
      if (!d || d.articolo !== ARTICOLO || !voce || voce.genere !== 'azione' || transizione?.stato !== 'convertita') { saltati++; continue; }
      const presenti = db.prepare('SELECT uid, tipo, dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(c.voce_uid) as Array<{ uid: string; tipo: string; dati_json: string }>;
      if (presenti.some((e) => e.tipo === 'acquisto' && oggetto(e.dati_json)?.articolo === ARTICOLO)) { saltati++; continue; }
      const testo = voce.azione.toLowerCase();
      const varianti = new Set(SAPORI.filter(([re]) => re.test(testo)).map(([, dote]) => dote));
      const dalTesto = varianti.size === 1 ? [...varianti][0]! : null;
      const dallaData = DATE_CERTE[voce.data] ?? null;
      // il testo e la data certa devono concordare; se solo uno parla vale quello, se si contraddicono la voce resta senza variante
      const variante = dalTesto !== null && dallaData !== null && dalTesto !== dallaData ? null : dalTesto ?? dallaData;
      const sostituisce = Array.isArray(d.sostituisceDoti) ? d.sostituisceDoti : [];
      const effetto = { tipo: 'acquisto', articolo: ARTICOLO, variante, sostituisceDoti: sostituisce };
      const ordine = ((db.prepare('SELECT MAX(ordine) AS m FROM main.voce_effetto WHERE voce_uid=?').get(c.voce_uid) as { m: number | null }).m ?? -1) + 1;
      const nuovo = { uid: uid32('147-effetto', c.voce_uid, c.id), ordine, effetto };
      const motivo = variante ? c.motivo : `${c.motivo} Il succo non è certo dal testo della guida: si indica quando si registra il consumo.`.trim();
      db.prepare("INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,'acquisto',?,?,'regola',?)")
        .run(nuovo.uid, c.voce_uid, nuovo.ordine, ARTICOLO, canonico(effetto), adesso);
      db.prepare("UPDATE main.proposta_effetto_voce SET stato='confermata', motivo=?, updated_at=? WHERE id=? AND stato='aperta'").run(motivo, adesso, c.id);
      db.prepare('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)')
        .run(uid32('147-operazione', c.voce_uid, c.id), c.voce_uid, canonico({ migrazione: 147, proposta: c.id, decisione: 'conferma', effetto }),
          canonico({ effetti: presenti.map((e) => ({ uid: e.uid, tipo: e.tipo })) }), canonico({ effetti: [...presenti.map((e) => ({ uid: e.uid, tipo: e.tipo })), { uid: nuovo.uid, tipo: 'acquisto' }] }), adesso);
      riallineaTransizione(c.voce_uid);
      consolidati++; if (variante) conVariante++; else incerti++;
    }
    logger.info({ fortunaTolta: tolti, consolidati, conVariante, senzaVariante: incerti, saltati }, '147: effetti Aojiru consolidati');
  },
};
