// ============================================================
// suggerimentiService — cosa il giorno corrente della partita suggerisce di fare, risolto in chiavi da evidenziare nell'interfaccia
// ============================================================
//
// Dalle azioni NON ancora fatte del giorno corrente ricava le entità coinvolte, comprese quelle indirette che l'utente deve toccare per
// eseguire il suggerimento: il Confidente porta con sé il luogo dove lo si incontra (la mappa del quartiere e il suo personaggio), il
// libro il negozio che lo vende e l'articolo a scaffale, il Palazzo la sua mappa e le sue aree, la richiesta i Mementos. Le Doti si
// leggono dal testo dell'azione («Conoscenza +1», «Aumenta Coraggio»): nel percorso sono annotate lì, non nei riferimenti.
// Le pagine accendono l'alone dorato su queste chiavi (`useSuggerimenti`).
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { slug } from '../../shared/slug.js';
import { confidenti } from './partiteService.js';
import { statoAzione } from './percorsoService.js';
import type { AzionePercorsoDto, SuggerimentiOggiDto } from '../../shared/types.js';

/** Azione come sta nel seed del percorso (gli stessi campi che legge `percorsoService`). */
type AzioneSeed = Omit<AzionePercorsoDto, 'indice' | 'fatta'>;

const DOTI = ['conoscenza', 'fascino', 'gentilezza', 'coraggio', 'perizia'] as const;
const RE_DOTE_GUADAGNO = new RegExp(`(?:(${DOTI.join('|')})\\s*\\+\\s*\\d)|(?:aumenta(?:no)?\\s+(?:la\\s+|il\\s+)?(${DOTI.join('|')}))`, 'gi');

/** Doti citate come guadagno nel testo dell'azione o nelle sue note («Perizia +2», «Aumenta Coraggio»). */
function dotiDalTesto(testo: string): string[] {
  const trovate = new Set<string>();
  const piatto = testo.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const m of piatto.matchAll(RE_DOTE_GUADAGNO)) {
    const nome = (m[1] ?? m[2] ?? '').toLowerCase();
    if (nome) trovate.add(nome);
  }
  return [...trovate];
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
  personaggi: Set<string>;
  dungeon: Set<string>;
  aree: Set<string>;
  libri: Set<string>;
  film: Set<string>;
  articoli: Set<string>;
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
  return {
    confidenti: new Set(), personaggi: new Set(), dungeon: new Set(), aree: new Set(), libri: new Set(), film: new Set(),
    articoli: new Set(), attivita: new Set(), richieste: new Set(), negozi: new Set(), luoghi: new Set(), quartieri: new Set(),
    doti: new Set(), mappe: new Set(), spilli: new Set(),
  };
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

/** Aggiunge un negozio con il suo quartiere, i luoghi che lo ospitano e lo spillo sulla mappa. */
function aggiungiNegozio(r: Raccolta, chiaveNegozio: string): void {
  r.negozi.add(chiaveNegozio);
  // `negozio.luogo_chiave` è il quartiere; il luogo puntuale si trova da `luogo.negozio`
  const n = prepared('SELECT luogo_chiave FROM negozio WHERE chiave = ?').get(chiaveNegozio) as { luogo_chiave: string | null } | undefined;
  if (n?.luogo_chiave) { r.quartieri.add(n.luogo_chiave); r.mappe.add(`citta-${n.luogo_chiave}`); }
  for (const l of prepared('SELECT chiave FROM luogo WHERE negozio = ?').all(chiaveNegozio) as Array<{ chiave: string }>) aggiungiLuogo(r, l.chiave);
  const sp = prepared("SELECT id FROM spillo WHERE riferimento_tipo = 'negozio' AND riferimento_chiave = ? ORDER BY id LIMIT 1").get(chiaveNegozio) as { id: number } | undefined;
  if (sp) r.spilli.add(sp.id);
}

/** Indice degli articoli a scaffale per nome ridotto a chiave: serve a collegare un libro o un film al negozio che lo vende. */
function indiceArticoli(): Map<string, Array<{ chiave: string; negozio: string }>> {
  const mappa = new Map<string, Array<{ chiave: string; negozio: string }>>();
  const righe = prepared('SELECT chiave, negozio_chiave, nome, nome_it FROM articolo').all() as Array<{ chiave: string; negozio_chiave: string; nome: string; nome_it: string | null }>;
  for (const a of righe) {
    for (const nome of [a.nome, a.nome_it]) {
      if (!nome) continue;
      const k = slug(nome);
      const elenco = mappa.get(k) ?? [];
      elenco.push({ chiave: a.chiave, negozio: a.negozio_chiave });
      mappa.set(k, elenco);
    }
  }
  return mappa;
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

/** Personaggi della guida collegati a un Confidente (o con la stessa chiave). */
function personaggiDiConfidente(chiaveConfidente: string): string[] {
  const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'personaggi'").get() as { json: string } | undefined;
  if (!riga) return [];
  try {
    const dati = JSON.parse(riga.json) as { personaggi?: Array<{ chiave: string; confidente?: string | null }> } | Array<{ chiave: string; confidente?: string | null }>;
    const elenco = Array.isArray(dati) ? dati : dati.personaggi ?? [];
    return elenco.filter((p) => p.confidente === chiaveConfidente || p.chiave === chiaveConfidente).map((p) => p.chiave);
  } catch {
    return [];
  }
}

/** Chiavi da evidenziare per le azioni ancora da fare del giorno corrente della partita. */
export function suggerimentiOggi(partitaId: number): SuggerimentiOggiDto {
  const partita = prepared('SELECT data_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null } | undefined;
  if (!partita) throw httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
  const vuoto: SuggerimentiOggiDto = {
    giorno: null, confidenti: [], personaggi: [], dungeon: [], aree: [], libri: [], film: [], articoli: [], attivita: [],
    richieste: [], negozi: [], luoghi: [], quartieri: [], doti: [], mappe: [], spilli: [], motivi: [],
  };
  const data = partita.data_gioco;
  if (!data) return vuoto;
  const righeGiorno = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get(data) as { azioni_json: string } | undefined;
  if (!righeGiorno) return { ...vuoto, giorno: data };

  const fatte = new Set((prepared('SELECT indice FROM azione_partita WHERE partita_id = ? AND data = ?').all(partitaId, data) as Array<{ indice: number }>).map((x) => x.indice));
  // Un'azione bloccata dai requisiti non è un suggerimento: la si esclude come fa la Guida (`statoAzione`).
  const conf = new Map(confidenti(partitaId).map((c) => [c.chiave, c]));
  const azioni = (JSON.parse(righeGiorno.azioni_json) as AzioneSeed[])
    .map((a, i) => ({ ...a, indice: i }))
    .filter((a) => !fatte.has(a.indice) && statoAzione(a, conf).tipo !== 'bloccata');
  const r = nuovaRaccolta();
  const motivi: SuggerimentiOggiDto['motivi'] = [];
  let articoli: Map<string, Array<{ chiave: string; negozio: string }>> | null = null;
  const segna = (categoria: string, chiave: string, azione: string, fascia: 'giorno' | 'sera') => motivi.push({ categoria, chiave, azione, fascia });

  for (const a of azioni) {
    // Le Doti guadagnate sono scritte nel testo dell'azione o nelle note, non nei riferimenti.
    for (const dote of dotiDalTesto(`${a.azione} ${a.note ?? ''}`)) {
      r.doti.add(dote);
      segna('doti', dote, a.azione, a.fascia);
    }
    const rif = a.riferimento;
    if (rif?.tipo === 'confidente') {
      r.confidenti.add(rif.chiave);
      segna('confidenti', rif.chiave, a.azione, a.fascia);
      for (const p of personaggiDiConfidente(rif.chiave)) { r.personaggi.add(p); segna('personaggi', p, a.azione, a.fascia); }
      for (const l of prepared('SELECT chiave FROM luogo WHERE confidenti_json LIKE ?').all(`%"${rif.chiave}"%`) as Array<{ chiave: string }>) aggiungiLuogo(r, l.chiave);
      const sp = prepared("SELECT id FROM spillo WHERE riferimento_tipo = 'confidente' AND riferimento_chiave = ? ORDER BY id LIMIT 1").get(rif.chiave) as { id: number } | undefined;
      if (sp) r.spilli.add(sp.id);
    } else if (rif?.tipo === 'dungeon') {
      r.dungeon.add(rif.chiave);
      r.mappe.add(`dungeon-${rif.chiave}`);
      segna('dungeon', rif.chiave, a.azione, a.fascia);
      for (const area of prepared('SELECT chiave FROM dungeon_area WHERE dungeon_chiave = ?').all(rif.chiave) as Array<{ chiave: string }>) r.aree.add(area.chiave);
    } else if (rif?.tipo === 'libro' || rif?.tipo === 'film') {
      const insieme = rif.tipo === 'libro' ? r.libri : r.film;
      insieme.add(rif.chiave);
      segna(rif.tipo === 'libro' ? 'libri' : 'film', rif.chiave, a.azione, a.fascia);
      const tabella = rif.tipo === 'libro' ? 'libro' : 'film';
      const riga = prepared(`SELECT nome, dove FROM ${tabella} WHERE chiave = ?`).get(rif.chiave) as { nome: string; dove: string | null } | undefined;
      // il luogo dove si prende/compra: dal campo «dove» della guida, oppure dal testo dell'azione stessa
      for (const chiaveLuogo of [...luoghiPerTesto(riga?.dove), ...luoghiPerTesto(a.azione)]) aggiungiLuogo(r, chiaveLuogo);
      // 30 libri su 46 sono anche articoli a scaffale: acceso il libro si accende l'articolo e il negozio che lo vende
      if (!articoli) articoli = indiceArticoli();
      for (const art of [...(articoli.get(rif.chiave) ?? []), ...(riga ? articoli.get(slug(riga.nome)) ?? [] : [])]) {
        r.articoli.add(art.chiave);
        aggiungiNegozio(r, art.negozio);
      }
    } else if (rif?.tipo === 'negozio') {
      segna('negozi', rif.chiave, a.azione, a.fascia);
      aggiungiNegozio(r, rif.chiave);
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
    confidenti: [...r.confidenti], personaggi: [...r.personaggi], dungeon: [...r.dungeon], aree: [...r.aree],
    libri: [...r.libri], film: [...r.film], articoli: [...r.articoli], attivita: [...r.attivita],
    richieste: [...r.richieste], negozi: [...r.negozi], luoghi: [...r.luoghi], quartieri: [...r.quartieri],
    doti: [...r.doti], mappe: [...r.mappe], spilli: [...r.spilli], motivi,
  };
}
