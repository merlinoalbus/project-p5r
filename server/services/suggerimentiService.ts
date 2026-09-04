// ============================================================
// suggerimentiService — cosa il giorno corrente della partita suggerisce di fare, risolto in chiavi da evidenziare nell'interfaccia
// ============================================================
//
// Dalle azioni NON ancora fatte del giorno corrente ricava le entità coinvolte, comprese quelle indirette che l'utente deve toccare per
// eseguire il suggerimento: il Confidente porta con sé il luogo dove lo si incontra (e la sua mappa), il libro il negozio che lo vende,
// il Palazzo la sua mappa, la richiesta i Mementos. Le pagine accendono l'alone dorato su queste chiavi (`useSuggerimenti`).
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { SuggerimentiOggiDto } from '../../shared/types.js';

interface AzioneSeedMin {
  fascia: 'giorno' | 'sera';
  azione: string;
  tipo: string;
  riferimento?: { tipo: string; chiave: string } | null;
}

/** Parole significative di un testo (minuscole, senza accenti, almeno 5 lettere): servono a collegare «dove» ai luoghi della città. */
function paroleChiave(testo: string): string[] {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 5);
}

interface Raccolta {
  confidenti: Set<string>;
  dungeon: Set<string>;
  libri: Set<string>;
  film: Set<string>;
  attivita: Set<string>;
  richieste: Set<string>;
  negozi: Set<string>;
  luoghi: Set<string>;
  quartieri: Set<string>;
  doti: Set<string>;
  mappe: Set<string>;
  spilli: Set<number>;
}

function nuovaRaccolta(): Raccolta {
  return { confidenti: new Set(), dungeon: new Set(), libri: new Set(), film: new Set(), attivita: new Set(), richieste: new Set(), negozi: new Set(), luoghi: new Set(), quartieri: new Set(), doti: new Set(), mappe: new Set(), spilli: new Set() };
}

/** Aggiunge un luogo della città con il suo quartiere, il negozio collegato e lo spillo sulla mappa del quartiere. */
function aggiungiLuogo(r: Raccolta, chiaveLuogo: string): void {
  const l = prepared('SELECT chiave, quartiere_chiave, negozio FROM luogo WHERE chiave = ?').get(chiaveLuogo) as { chiave: string; quartiere_chiave: string; negozio: string | null } | undefined;
  if (!l) return;
  r.luoghi.add(l.chiave);
  r.quartieri.add(l.quartiere_chiave);
  r.mappe.add(`citta-${l.quartiere_chiave}`);
  if (l.negozio) r.negozi.add(l.negozio);
  const s = prepared("SELECT id FROM spillo WHERE riferimento_tipo = 'luogo' AND riferimento_chiave = ? ORDER BY id LIMIT 1").get(l.chiave) as { id: number } | undefined;
  if (s) r.spilli.add(s.id);
}

/** Luoghi che corrispondono a un testo libero («Libreria Taiheido (Shibuya)», «Biblioteca della scuola», «cinema»). */
function luoghiPerTesto(dove: string | null | undefined): string[] {
  if (!dove) return [];
  const parole = paroleChiave(dove);
  if (parole.length === 0) return [];
  const luoghi = prepared('SELECT chiave, nome FROM luogo').all() as Array<{ chiave: string; nome: string }>;
  const trovati = luoghi.filter((l) => {
    const nome = paroleChiave(l.nome);
    return nome.some((p) => parole.some((q) => p.startsWith(q.slice(0, 6)) || q.startsWith(p.slice(0, 6))));
  });
  return trovati.map((l) => l.chiave);
}

/** Chiavi da evidenziare per le azioni ancora da fare del giorno corrente della partita. */
export function suggerimentiOggi(partitaId: number): SuggerimentiOggiDto {
  const partita = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
  if (!partita) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const vuoto: SuggerimentiOggiDto = { giorno: null, confidenti: [], dungeon: [], libri: [], film: [], attivita: [], richieste: [], negozi: [], luoghi: [], quartieri: [], doti: [], mappe: [], spilli: [], motivi: [] };
  const data = partita.data_gioco;
  if (!data) return vuoto;
  const righeGiorno = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get(data) as { azioni_json: string } | undefined;
  if (!righeGiorno) return { ...vuoto, giorno: data };

  const fatte = new Set((prepared('SELECT indice FROM azione_partita WHERE partita_id = ? AND data = ?').all(partitaId, data) as Array<{ indice: number }>).map((x) => x.indice));
  const azioni = (JSON.parse(righeGiorno.azioni_json) as AzioneSeedMin[]).map((a, i) => ({ ...a, indice: i })).filter((a) => !fatte.has(a.indice));
  const r = nuovaRaccolta();
  const motivi: SuggerimentiOggiDto['motivi'] = [];
  const segna = (categoria: string, chiave: string, azione: string, fascia: 'giorno' | 'sera') => motivi.push({ categoria, chiave, azione, fascia });

  for (const a of azioni) {
    const rif = a.riferimento;
    if (rif?.tipo === 'confidente') {
      r.confidenti.add(rif.chiave);
      segna('confidenti', rif.chiave, a.azione, a.fascia);
      for (const l of prepared('SELECT chiave FROM luogo WHERE confidenti_json LIKE ?').all(`%"${rif.chiave}"%`) as Array<{ chiave: string }>) aggiungiLuogo(r, l.chiave);
      const sp = prepared("SELECT id FROM spillo WHERE riferimento_tipo = 'confidente' AND riferimento_chiave = ? ORDER BY id LIMIT 1").get(rif.chiave) as { id: number } | undefined;
      if (sp) r.spilli.add(sp.id);
    } else if (rif?.tipo === 'dungeon') {
      r.dungeon.add(rif.chiave);
      r.mappe.add(`dungeon-${rif.chiave}`);
      segna('dungeon', rif.chiave, a.azione, a.fascia);
    } else if (rif?.tipo === 'libro' || rif?.tipo === 'film') {
      const insieme = rif.tipo === 'libro' ? r.libri : r.film;
      insieme.add(rif.chiave);
      segna(rif.tipo === 'libro' ? 'libri' : 'film', rif.chiave, a.azione, a.fascia);
      const tabella = rif.tipo === 'libro' ? 'libro' : 'film';
      const riga = prepared(`SELECT dove FROM ${tabella} WHERE chiave = ?`).get(rif.chiave) as { dove: string | null } | undefined;
      // il luogo dove si prende/compra: dal campo «dove» della guida, oppure dal testo dell'azione stessa
      for (const chiaveLuogo of [...luoghiPerTesto(riga?.dove), ...luoghiPerTesto(a.azione)]) aggiungiLuogo(r, chiaveLuogo);
    } else if (rif?.tipo === 'negozio') {
      r.negozi.add(rif.chiave);
      segna('negozi', rif.chiave, a.azione, a.fascia);
      // `negozio.luogo_chiave` è il quartiere; il luogo puntuale si trova da `luogo.negozio`
      const n = prepared('SELECT luogo_chiave FROM negozio WHERE chiave = ?').get(rif.chiave) as { luogo_chiave: string | null } | undefined;
      if (n?.luogo_chiave) { r.quartieri.add(n.luogo_chiave); r.mappe.add(`citta-${n.luogo_chiave}`); }
      for (const l of prepared('SELECT chiave FROM luogo WHERE negozio = ?').all(rif.chiave) as Array<{ chiave: string }>) aggiungiLuogo(r, l.chiave);
      const sp = prepared("SELECT id FROM spillo WHERE riferimento_tipo = 'negozio' AND riferimento_chiave = ? ORDER BY id LIMIT 1").get(rif.chiave) as { id: number } | undefined;
      if (sp) r.spilli.add(sp.id);
    } else if (rif?.tipo === 'richiesta' || a.tipo === 'richiesta') {
      if (rif?.chiave) { r.richieste.add(rif.chiave); segna('richieste', rif.chiave, a.azione, a.fascia); }
      r.mappe.add('dungeon-mementos');
    } else if (rif?.tipo === 'attivita') {
      r.attivita.add(rif.chiave);
      segna('attivita', rif.chiave, a.azione, a.fascia);
      // `attivita.luogo_chiave` è il quartiere che ospita l'attività
      const att = prepared('SELECT luogo_chiave FROM attivita WHERE chiave = ?').get(rif.chiave) as { luogo_chiave: string | null } | undefined;
      if (att?.luogo_chiave) { r.quartieri.add(att.luogo_chiave); r.mappe.add(`citta-${att.luogo_chiave}`); }
    } else if (rif?.tipo === 'dote') {
      r.doti.add(rif.chiave);
      segna('doti', rif.chiave, a.azione, a.fascia);
    }
  }

  return {
    giorno: data,
    confidenti: [...r.confidenti], dungeon: [...r.dungeon], libri: [...r.libri], film: [...r.film], attivita: [...r.attivita],
    richieste: [...r.richieste], negozi: [...r.negozi], luoghi: [...r.luoghi], quartieri: [...r.quartieri], doti: [...r.doti],
    mappe: [...r.mappe], spilli: [...r.spilli], motivi,
  };
}
