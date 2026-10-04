// ============================================================
// incontriService — la Dote che un Confidente dà a ogni incontro, una volta per incontro
// ============================================================
//
// Scelta dell'utente (2026-09-30): la Dote di un incontro (Takemi il Coraggio, Yoshida il Fascino…) arriva da ogni
// incontro registrato — la spunta di un'azione della guida o dell'utente, il passaggio di rango o le note di risposta
// nella pagina Confidenti — e il passaggio al rango R conta una volta sola, da qualunque parte arrivi. Che cosa dà un
// incontro lo dice il Confidente (`confidente_dote_incontro` del rango verso cui vale, migrazione 088).
//
// Regole (`incontro_confidente_partita`, migrazione utente 009):
// - in un momento della giornata (Confidente, giorno, fascia) c'è un solo incontro «semplice»: nel gioco si esce con un
//   Confidente una volta per fascia, e un incontro ha più risposte («risposta da 2 note» premuto tre volte) o si segna da
//   più parti (la spunta e la pagina Confidenti): la Dote arriva una volta;
// - il passaggio al rango R è unico: spuntare l'azione del rango R e alzare il rango a R dalla pagina è lo stesso incontro;
//   un passaggio che arriva dove c'è l'incontro semplice di quel momento lo trasforma (niente Dote in più); passaggi di
//   ranghi diversi nello stesso momento (segnati a mano uno dopo l'altro) sono incontri a sé (migrazione utente 010);
// - togliere la spunta toglie l'incontro che aveva creato (o il segno di passaggio che aveva messo); abbassare il rango
//   dalla pagina toglie i passaggi registrati dalla pagina oltre il nuovo rango; «Annulla ultimo» che riporta i punti a
//   quelli di prima delle risposte di quel momento (`punti_prima`, migrazione utente 011) toglie l'incontro che le
//   risposte avevano registrato.
// Le Doti non si toccano (scelta dell'utente, 2026-09-30: si segnano solo a mano): l'incontro registra e dice la Dote che il
// gioco dà (`doti`, `doteIncontro`), e togliendolo dice quella che dava, perché l'utente la segni o la tolga lui.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { aggiornaConfidente, nomeDote, puntiDaNote } from './partiteService.js';
import { leggiVociEffetto } from '../../shared/effettiCatalogo.js';
import type { ConfidentePartitaDto, IncontroConfidenteDto, ModificaConfidente } from '../../shared/types.js';

interface RigaIncontro {
  id: number; partita_id: number; confidente_chiave: string; data: string; fascia: string; verso_rango: number; passaggio: number; origine: string; doti_json: string;
}

export interface MomentoIncontro {
  /** Giorno ('MM-GG') e fascia dell'incontro: quelli dell'azione, o quelli della partita per la pagina Confidenti. */
  data: string;
  fascia: string;
  /** 'azione': la spunta di una voce della giornata; 'pagina': la pagina Confidenti. 'mia' la scrivevano le cose da fare
   *  dell'utente prima che diventassero voci della guida (2026-09-30): resta sulle righe di allora. */
  origine: 'azione' | 'mia' | 'pagina';
}

/** Le Doti (con le note) che dà un incontro verso il rango `verso` del Confidente. */
function dotiDellIncontro(confidente: string, verso: number): Array<{ dote: string; note: 1 | 2 | 3 }> {
  const r = prepared('SELECT effetti_json FROM confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').get(confidente, verso) as { effetti_json: string | null } | undefined;
  return leggiVociEffetto(r?.effetti_json).filter((v) => v.effetto.famiglia === 'dote')
    .map((v) => ({ dote: (v.effetto as { dote: string }).dote, note: Math.min(3, Math.max(1, (v.effetto as { note: number }).note)) as 1 | 2 | 3 }));
}

/** Il rango del Confidente nella partita (0 se non ha ancora una riga). */
function rangoAttuale(partitaId: number, confidente: string): number {
  return (prepared('SELECT rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, confidente) as { rango: number } | undefined)?.rango ?? 0;
}

/** Il nome del Confidente, o la chiave se non esiste. */
function nomeConfidente(confidente: string): string {
  return (prepared('SELECT nome FROM confidente WHERE chiave = ?').get(confidente) as { nome: string } | undefined)?.nome ?? confidente;
}

/**
 * Registra un incontro: `rangoAtteso` (l'azione del passaggio a quel rango) lo rende un passaggio; senza, vale verso il rango
 * successivo a quello attuale. Dà la Dote solo se l'incontro è nuovo: se in quel momento della giornata c'è già un incontro con
 * quel Confidente, o se il passaggio a quel rango è già registrato, non dà niente (e un passaggio segna l'incontro che c'è).
 */
export function registraIncontro(partitaId: number, confidente: string, momento: MomentoIncontro, rangoAtteso: number | null, puntiPrima: number | null = null): IncontroConfidenteDto {
  const passaggio = rangoAtteso !== null;
  const verso = passaggio ? Math.min(10, Math.max(1, rangoAtteso)) : Math.min(10, rangoAttuale(partitaId, confidente) + 1);
  const base = { confidente, nome: nomeConfidente(confidente), verso, passaggio, doti: [] as IncontroConfidenteDto['doti'] };
  if (passaggio) {
    const gia = prepared('SELECT id FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND passaggio = 1 AND verso_rango = ?').get(partitaId, confidente, verso) as { id: number } | undefined;
    if (gia) return { ...base, id: null, marcato: null, giaContato: true };
  }
  const nelMomento = prepared('SELECT * FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND data = ? AND fascia = ? ORDER BY id').all(partitaId, confidente, momento.data, momento.fascia) as RigaIncontro[];
  if (passaggio) {
    // l'incontro semplice di questo momento (le risposte, una spunta senza passaggio) è quello che ha portato al rango: lo diventa,
    // senza una Dote in più; altri passaggi nello stesso momento (ranghi segnati a mano uno dopo l'altro) sono incontri a sé
    const semplice = nelMomento.find((r) => r.passaggio === 0);
    if (semplice) {
      prepared('UPDATE incontro_confidente_partita SET passaggio = 1, verso_rango = ? WHERE id = ?').run(verso, semplice.id);
      return { ...base, id: null, marcato: semplice.id, giaContato: true };
    }
  } else if (nelMomento.length > 0) {
    // lo stesso incontro segnato di nuovo (un'altra risposta, la spunta dopo la pagina): niente Dote nuova
    return { ...base, id: null, marcato: null, giaContato: true };
  }
  // la Dote che l'incontro dà: si registra e si ricorda, le Doti si segnano a mano (`aggiornaDote`)
  const doti: IncontroConfidenteDto['doti'] = [];
  for (const d of dotiDellIncontro(confidente, verso)) {
    doti.push({ chiave: d.dote, nome: nomeDote(d.dote), delta: puntiDaNote(d.note, false), note: d.note });
  }
  const id = Number(prepared(`INSERT INTO incontro_confidente_partita (partita_id, confidente_chiave, data, fascia, verso_rango, passaggio, origine, doti_json, created_at, punti_prima)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(partitaId, confidente, momento.data, momento.fascia, verso, passaggio ? 1 : 0, momento.origine, JSON.stringify(doti), nowIso(), puntiPrima).lastInsertRowid);
  return { ...base, id, marcato: null, giaContato: false, doti };
}

/** Toglie un incontro registrato e dice le Doti che dava (in meno, da togliere a mano se le avevi segnate): le Doti non si toccano. */
function togliRiga(_partitaId: number, r: RigaIncontro): Array<{ chiave: string; nome: string; delta: number }> {
  const out = (JSON.parse(r.doti_json) as Array<{ chiave: string; delta: number }>).map((d) => ({ chiave: d.chiave, nome: nomeDote(d.chiave), delta: -d.delta }));
  prepared('DELETE FROM incontro_confidente_partita WHERE id = ?').run(r.id);
  return out;
}

/** Disfa ciò che una spunta aveva registrato: l'incontro creato (con le sue Doti) o il segno di passaggio messo su uno che c'era.
 *  Un passaggio al rango R che la partita ha comunque raggiunto (alzato dalla pagina Confidenti mentre la spunta c'era, e lì
 *  «già contato») non si toglie: resta come incontro della pagina, con le sue Doti. */
export function annullaIncontro(partitaId: number, inc: IncontroConfidenteDto): void {
  if (inc.id !== null) {
    const r = prepared('SELECT * FROM incontro_confidente_partita WHERE id = ? AND partita_id = ?').get(inc.id, partitaId) as RigaIncontro | undefined;
    if (!r) return;
    if (r.passaggio === 1 && rangoAttuale(partitaId, r.confidente_chiave) >= r.verso_rango) prepared("UPDATE incontro_confidente_partita SET origine = 'pagina' WHERE id = ?").run(r.id);
    else togliRiga(partitaId, r);
  } else if (inc.marcato !== null && rangoAttuale(partitaId, inc.confidente) < inc.verso) {
    prepared('UPDATE incontro_confidente_partita SET passaggio = 0 WHERE id = ? AND partita_id = ?').run(inc.marcato, partitaId);
  }
}

/**
 * La modifica di un Confidente dalla pagina Confidenti: oltre ai punti e al rango, registra gli incontri. Salire di rango è il
 * passaggio a ogni rango raggiunto; scendere toglie i passaggi registrati dalla pagina oltre il nuovo rango; una risposta
 * (note) o un'uscita senza cambio di rango è un incontro nel momento della giornata della partita. Dice le Doti che gli
 * incontri registrati danno (o quelli tolti davano), da segnare a mano (`doteIncontro`).
 */
export function aggiornaConfidenteDallaPagina(partitaId: number, chiave: string, dati: ModificaConfidente): ConfidentePartitaDto {
  return getDb().transaction(() => {
    const prima = rangoAttuale(partitaId, chiave);
    const puntiPrima = (prepared('SELECT punti FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, chiave) as { punti: number } | undefined)?.punti ?? 0;
    const dto = aggiornaConfidente(partitaId, chiave, dati);
    const partita = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string };
    const momento: MomentoIncontro = { data: partita.data_gioco ?? '', fascia: partita.fascia_gioco ?? '', origine: 'pagina' };
    const cambi: Array<{ chiave: string; nome: string; delta: number }> = [];
    if (dto.rango > prima) {
      for (let r = prima + 1; r <= dto.rango; r++) for (const d of registraIncontro(partitaId, chiave, momento, r).doti) cambi.push({ chiave: d.chiave, nome: d.nome, delta: d.delta });
    } else if (dto.rango < prima) {
      const oltre = prepared("SELECT * FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND passaggio = 1 AND verso_rango > ? AND origine = 'pagina'").all(partitaId, chiave, dto.rango) as RigaIncontro[];
      for (const r of oltre) cambi.push(...togliRiga(partitaId, r));
    } else if (dati.noteRisposta !== undefined || dati.uscita) {
      for (const d of registraIncontro(partitaId, chiave, momento, null, puntiPrima).doti) cambi.push({ chiave: d.chiave, nome: d.nome, delta: d.delta });
    } else if ((dati.deltaPunti ?? 0) < 0) {
      // «Annulla ultimo»: tornati ai punti di prima delle risposte di questo momento, l'incontro non c'è stato
      const r = prepared("SELECT * FROM incontro_confidente_partita WHERE partita_id = ? AND confidente_chiave = ? AND data = ? AND fascia = ? AND origine = 'pagina' AND passaggio = 0 AND punti_prima IS NOT NULL ORDER BY id DESC LIMIT 1")
        .get(partitaId, chiave, momento.data, momento.fascia) as (RigaIncontro & { punti_prima: number }) | undefined;
      if (r && dto.punti <= r.punti_prima + 0.001) cambi.push(...togliRiga(partitaId, r));
    }
    // più Doti uguali (passaggi multipli) si sommano in una riga
    const somma = new Map<string, { chiave: string; nome: string; delta: number }>();
    for (const c of cambi) { const s = somma.get(c.chiave); if (s) s.delta += c.delta; else somma.set(c.chiave, { ...c }); }
    return { ...dto, doteIncontro: [...somma.values()].filter((c) => c.delta !== 0) };
  })();
}
