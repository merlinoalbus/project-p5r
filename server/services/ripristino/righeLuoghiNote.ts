// ============================================================
// righeLuoghiNote — posizioni di libri e film, sedi dei listini e legami delle note storiche, correggibili e ripristinabili (L11 · R11-17/1, gruppo «Luoghi e note»)
// ============================================================
//
// Quattro oggetti «a riga» del registro dei ripristini (`righe.ts`). Sono elenchi di righe figlie: l'oggetto è il padre (il libro, il film, il negozio,
// la nota) e il valore della guida è la fotografia `seed_json` presa alla prima correzione, che sta in una tabella-fotografia propria con una riga per
// padre (migrazione 227: `libro_posizione_foto`, `film_posizione_foto`, `negozio_sede_foto`, `nota_storica_legame_foto`; le tabelle padre hanno già un
// `seed_json` per altro e un oggetto con zero righe non potrebbe tenere la propria fotografia sulle righe).
//
//   - `libro-posizioni` (`libro_posizione`) e `film-posizioni` (`film_posizione`): dove si ottiene un libro, dove si guarda un film. Ogni posizione è un
//     «posto» (quartiere, luogo, negozio o attività, scelto per NOME), il nome da mostrare e, per i film, il ruolo (cinema, noleggio, visione). Le posizioni
//     sono a posti numerati: il posto N è la riga con `ordine` N-1, così svuotare un posto non sposta gli altri e «Rimetti questo» di un posto è esatto.
//     Si può aggiungere una posizione (posto libero) e toglierne una (posto «Nessuno»); la fotografia è l'elenco intero.
//   - `negozio-sedi` (`negozio_luogo_extra` con `negozio_sede_spillo`): gli altri luoghi in cui un negozio vende lo stesso listino (i distributori) e, per
//     ognuno, il pin che li conferma sulla mappa. Le sedi e i legami sono CHIAVI (dei luoghi, delle offerte, degli oggetti): i nomi servono solo a mostrarli,
//     così rinominare un luogo o un oggetto non rende la fotografia diversa da ciò che è. La sede principale del negozio non sta qui (si corregge dal negozio). Il pin deve essere un pin DI QUESTO
//     negozio sull'Area del luogo (è la condizione con cui i listini lo leggono, `listiniCondivisi`): l'elenco propone solo quelli, e un altro valore si rifiuta.
//     Un pin è la sede di un solo luogo. Una sede con più pin si corregge dall'editor delle mappe.
//   - `nota-storica-legami` (`nota_storica_legame`): le offerte e gli oggetti del catalogo a cui si riferisce una nota storica. Il testo della nota ha già il
//     suo editor (`noteStoricheService`); qui si corregge dove compare.
// I lettori (pagine, listini, acquisti, condizioni, mappe) leggono le stesse tabelle: `correggi` e `ripristina` svuotano le copie in memoria.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';
import { str } from './righeComuni.js';

// ---- Comuni ----

/** La fotografia (il valore della guida) salvata alla prima correzione, o null. */
function semeDi(foto: string, colonna: string, chiave: string): Valori | null {
  const json = prepared(`SELECT seed_json FROM ${foto} WHERE ${colonna} = ?`).pluck().get(chiave) as string | null | undefined;
  if (!json) return null;
  try {
    const v = JSON.parse(json) as unknown;
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Valori : null;
  } catch { return null; }
}

/** Il padre ha una riga di fotografia (quelli nati dopo la migrazione la ricevono alla prima correzione). */
function assicuraFoto(foto: string, colonna: string, chiave: string): void {
  prepared(`INSERT OR IGNORE INTO ${foto} (${colonna}) VALUES (?)`).run(chiave);
}

const invalido = (campo: string, motivo: string) => httpErrors.badRequest('valore-non-valido', motivo, { campo });

// ---- Posti (quartiere, luogo, negozio, attività) ----

const TIPI_POSTO = ['quartiere', 'luogo', 'negozio', 'attivita'] as const;
type TipoPosto = (typeof TIPI_POSTO)[number];
interface Posto { tipo: TipoPosto; chiave: string }
const NOME_TIPO: Record<TipoPosto, string> = { quartiere: 'quartiere', luogo: 'luogo', negozio: 'negozio', attivita: 'attività' };

const comePosto = (tipo: string, chiave: string): Posto | null => ((TIPI_POSTO as readonly string[]).includes(tipo) ? { tipo: tipo as TipoPosto, chiave } : null);
const rif = (p: Posto): string => `${p.tipo}:${p.chiave}`;
/** «tipo:chiave» → posto; null se non ha la forma. */
function postoDa(valore: unknown): Posto | null {
  if (typeof valore !== 'string') return null;
  const i = valore.indexOf(':');
  if (i <= 0 || i === valore.length - 1) return null;
  return comePosto(valore.slice(0, i), valore.slice(i + 1));
}

interface RigaNome { nome: string; quartiere?: string }
function nomiDelPosto(p: Posto): RigaNome | undefined {
  switch (p.tipo) {
    case 'quartiere': return prepared('SELECT nome FROM quartiere WHERE chiave = ?').get(p.chiave) as RigaNome | undefined;
    case 'luogo': return prepared('SELECT l.nome AS nome, q.nome AS quartiere FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.chiave = ?').get(p.chiave) as RigaNome | undefined;
    case 'negozio': return prepared('SELECT nome FROM negozio WHERE chiave = ?').get(p.chiave) as RigaNome | undefined;
    case 'attivita': return prepared('SELECT nome FROM attivita WHERE chiave = ?').get(p.chiave) as RigaNome | undefined;
  }
}
const esistePosto = (p: Posto): boolean => nomiDelPosto(p) !== undefined;
/** Il nome del posto, senza altro (è il nome mostrato di partenza di una posizione nuova). */
const nomeSemplice = (p: Posto): string | null => nomiDelPosto(p)?.nome ?? null;

/** Il nome per scegliere: «Nome — luogo, Quartiere» (mai la chiave). */
function descrizionePosto(p: Posto): string {
  const r = nomiDelPosto(p);
  if (!r) return `${p.chiave} — ${NOME_TIPO[p.tipo]} che non esiste più`;
  return `${r.nome} — ${NOME_TIPO[p.tipo]}${r.quartiere ? `, ${r.quartiere}` : ''}`;
}

/** Tutti i posti che si possono scegliere, più quelli indicati (già in uso o nella guida) anche se nascosti o spariti. */
function opzioniPosti(inUso: Posto[]): Array<{ chiave: string; nome: string }> {
  const out: Array<{ chiave: string; nome: string }> = [{ chiave: '', nome: 'Nessuno (posizione libera)' }];
  const visti = new Set<string>(['']);
  const aggiungi = (p: Posto, nome: string) => { const k = rif(p); if (!visti.has(k)) { visti.add(k); out.push({ chiave: k, nome }); } };
  for (const r of prepared("SELECT chiave, nome FROM quartiere WHERE chiave <> 'mementos' ORDER BY ordine").all() as Array<{ chiave: string; nome: string }>) aggiungi({ tipo: 'quartiere', chiave: r.chiave }, `${r.nome} — quartiere`);
  for (const r of prepared('SELECT l.chiave AS chiave, l.nome AS nome, q.nome AS quartiere FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.nascosto = 0 ORDER BY q.ordine, l.ordine').all() as Array<{ chiave: string; nome: string; quartiere: string }>) aggiungi({ tipo: 'luogo', chiave: r.chiave }, `${r.nome} — luogo, ${r.quartiere}`);
  for (const r of prepared('SELECT chiave, nome FROM negozio WHERE nascosto = 0 ORDER BY ordine').all() as Array<{ chiave: string; nome: string }>) aggiungi({ tipo: 'negozio', chiave: r.chiave }, `${r.nome} — negozio`);
  for (const r of prepared('SELECT chiave, nome FROM attivita WHERE nascosto = 0 ORDER BY ordine').all() as Array<{ chiave: string; nome: string }>) aggiungi({ tipo: 'attivita', chiave: r.chiave }, `${r.nome} — attività`);
  for (const p of inUso) aggiungi(p, descrizionePosto(p));
  return out;
}

// ---- Posizioni di libri e film ----

const MAX_POSTI = 6;
const MAX_ETICHETTA = 120;
const RUOLI = [{ chiave: '', nome: 'Da scegliere' }, { chiave: 'cinema', nome: 'Visione al cinema' }, { chiave: 'noleggio', nome: 'Noleggio' }, { chiave: 'visione', nome: 'Visione' }];

interface CfgPosizioni {
  etichetta: string; tabella: string; padre: string; colonnaPadre: string; foto: string; conRuolo: boolean;
  /** Il titolo del libro o del film, per il nome della finestra. */
  titolo: (chiave: string) => string;
  prefisso: string;
}
interface RigaPosizione { ordine: number; tipo: string; chiave: string; etichetta: string; ruolo: string | null }

function posizioniDef(c: CfgPosizioni): DefRiga {
  const righe = (chiave: string): RigaPosizione[] => prepared(
    `SELECT ordine, tipo, chiave, etichetta, ${c.conRuolo ? 'ruolo' : 'NULL AS ruolo'} FROM ${c.tabella} WHERE ${c.colonnaPadre} = ? ORDER BY ordine`).all(chiave) as RigaPosizione[];
  const seme = (chiave: string): Valori | null => semeDi(c.foto, c.colonnaPadre, chiave);
  const kDove = (i: number) => `posizione/${i}/dove`;
  const kNome = (i: number) => `posizione/${i}/etichetta`;
  const kRuolo = (i: number) => `posizione/${i}/ruolo`;

  /** I posti pieni nella fotografia (posto N = chiave `posizione/N/dove` non vuota). */
  const postiDelSeme = (s: Valori | null): Array<{ slot: number; posto: Posto }> => {
    const out: Array<{ slot: number; posto: Posto }> = [];
    if (!s) return out;
    for (const [k, v] of Object.entries(s)) {
      const m = /^posizione\/(\d+)\/dove$/.exec(k);
      const p = m ? postoDa(v) : null;
      if (m && p) out.push({ slot: Number(m[1]), posto: p });
    }
    return out;
  };
  /** Quanti posti mostrare: fino all'ultimo pieno (adesso o nella guida) più uno libero. */
  const pieno = (rs: RigaPosizione[], s: Valori | null): number => Math.max(1, ...rs.map((r) => r.ordine + 1), ...postiDelSeme(s).map((x) => x.slot));
  const numeroPosti = (rs: RigaPosizione[], s: Valori | null): number => { const p = pieno(rs, s); return Math.min(p + 1, Math.max(MAX_POSTI, p)); };
  const postoDiRiga = (r: RigaPosizione): Posto => ({ tipo: r.tipo as TipoPosto, chiave: r.chiave });

  const def: DefRiga = {
    modalita: 'riga', etichetta: c.etichetta, tabella: c.foto, colonnaChiave: c.colonnaPadre,
    chiavi: () => (prepared(`SELECT chiave FROM ${c.padre} ORDER BY ordine`).pluck().all() as string[]),
    esiste: (chiave) => !!prepared(`SELECT 1 FROM ${c.padre} WHERE chiave = ?`).get(chiave),
    campi: (chiave) => {
      const rs = righe(chiave);
      const s = seme(chiave);
      const opzioni = opzioniPosti([...rs.map(postoDiRiga), ...postiDelSeme(s).map((x) => x.posto)]);
      const n = numeroPosti(rs, s);
      const out: CampoDef[] = [];
      for (let i = 1; i <= n; i++) {
        const gruppo = `Posizione ${i}`;
        out.push({ p: kDove(i), e: 'Posto', t: 'scelta', gruppo, opzioni });
        out.push({ p: kNome(i), e: 'Nome mostrato', t: 'testo', nullable: true, max: MAX_ETICHETTA, gruppo });
        if (c.conRuolo) out.push({ p: kRuolo(i), e: 'Come si usa', t: 'scelta', gruppo, opzioni: RUOLI });
      }
      return out;
    },
    // le chiavi del valore sono TUTTI i posti possibili (anche quelli non mostrati): la fotografia è completa e un posto riempito dopo si rimette vuoto
    leggi: (chiave) => {
      const rs = righe(chiave);
      const perPosto = new Map(rs.map((r) => [r.ordine + 1, r]));
      const limite = Math.max(MAX_POSTI, numeroPosti(rs, seme(chiave)));
      const v: Valori = {};
      for (let i = 1; i <= limite; i++) {
        const r = perPosto.get(i);
        v[kDove(i)] = r ? rif(postoDiRiga(r)) : '';
        v[kNome(i)] = r ? r.etichetta : null;
        if (c.conRuolo) v[kRuolo(i)] = r?.ruolo ?? '';
      }
      return v;
    },
    scrivi: (chiave, v) => {
      assicuraFoto(c.foto, c.colonnaPadre, chiave);
      const attuali = new Map(righe(chiave).map((r) => [r.ordine + 1, r]));
      const toccati = new Set<number>();
      for (const k of Object.keys(v)) { const m = /^posizione\/(\d+)\//.exec(k); if (m) toccati.add(Number(m[1])); }
      for (const i of [...toccati].sort((a, b) => a - b)) {
        const att = attuali.get(i);
        const dove = v[kDove(i)] !== undefined ? (str(v[kDove(i)]) ?? '') : (att ? rif(postoDiRiga(att)) : '');
        if (dove === '') {
          prepared(`DELETE FROM ${c.tabella} WHERE ${c.colonnaPadre} = ? AND ordine = ?`).run(chiave, i - 1);
          continue;
        }
        const p = postoDa(dove);
        if (!p) throw invalido(kDove(i), `Posizione ${i}: il posto scelto non è valido.`);
        const scritto = v[kNome(i)] !== undefined ? str(v[kNome(i)]) : (att?.etichetta ?? null);
        const etichetta = scritto ?? nomeSemplice(p) ?? p.chiave;
        if (c.conRuolo) {
          const ruolo = v[kRuolo(i)] !== undefined ? (str(v[kRuolo(i)]) ?? '') : (att?.ruolo ?? '');
          if (!RUOLI.some((r) => r.chiave !== '' && r.chiave === ruolo)) throw invalido(kRuolo(i), `Posizione ${i}: scegli come si usa (cinema, noleggio o visione).`);
          prepared(`INSERT INTO ${c.tabella} (${c.colonnaPadre}, ordine, tipo, chiave, etichetta, ruolo) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(${c.colonnaPadre}, ordine) DO UPDATE SET tipo = excluded.tipo, chiave = excluded.chiave, etichetta = excluded.etichetta, ruolo = excluded.ruolo`)
            .run(chiave, i - 1, p.tipo, p.chiave, etichetta, ruolo);
        } else {
          prepared(`INSERT INTO ${c.tabella} (${c.colonnaPadre}, ordine, tipo, chiave, etichetta) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(${c.colonnaPadre}, ordine) DO UPDATE SET tipo = excluded.tipo, chiave = excluded.chiave, etichetta = excluded.etichetta`)
            .run(chiave, i - 1, p.tipo, p.chiave, etichetta);
        }
      }
    },
    nome: (chiave) => `${c.prefisso} «${c.titolo(chiave)}»`,
    valida: (chiave, fusi) => {
      const attuali = new Map(righe(chiave).map((r) => [r.ordine + 1, r]));
      const visti = new Set<string>();
      const limite = Math.max(MAX_POSTI, numeroPosti(righe(chiave), seme(chiave)));
      for (let i = 1; i <= limite; i++) {
        const dove = fusi[kDove(i)];
        if (typeof dove !== 'string' || dove === '') continue;
        const p = postoDa(dove);
        const att = attuali.get(i);
        const uguale = !!att && att.tipo === p?.tipo && att.chiave === p.chiave;
        // un posto che c'era e non è stato toccato non si ricontrolla (il dato di prima può puntare a un posto sparito: lo si può togliere o cambiare)
        if (!p || (!uguale && !esistePosto(p))) throw invalido(kDove(i), `Posizione ${i}: il posto scelto non esiste.`);
        if (att && !uguale) {
          const nome = fusi[kNome(i)];
          if (nome === att.etichetta && nome !== nomeSemplice(p)) throw invalido(kNome(i), `Posizione ${i}: hai cambiato il posto, scrivi anche il nome da mostrare.`);
        }
        if (c.conRuolo) {
          const ruolo = fusi[kRuolo(i)];
          if (!RUOLI.some((r) => r.chiave !== '' && r.chiave === ruolo)) throw invalido(kRuolo(i), `Posizione ${i}: scegli come si usa (cinema, noleggio o visione).`);
        }
        const chiaveUnica = c.conRuolo ? `${String(fusi[kRuolo(i)])}/${rif(p)}` : rif(p);
        if (visti.has(chiaveUnica)) throw invalido(kDove(i), `Posizione ${i}: lo stesso posto compare due volte${c.conRuolo ? ' con lo stesso ruolo' : ''}.`);
        visti.add(chiaveUnica);
        const nome = fusi[kNome(i)];
        if (typeof nome === 'string' && nome.length > MAX_ETICHETTA) throw invalido(kNome(i), `Posizione ${i}: il nome è troppo lungo (al più ${MAX_ETICHETTA} caratteri).`);
      }
    },
  };
  return def;
}

const nomeLibro = (chiave: string): string => (prepared('SELECT nome FROM libro WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;
const nomeFilm = (chiave: string): string => (prepared('SELECT nome FROM film WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;

const libroPosizioni = posizioniDef({
  etichetta: 'Posizioni del libro', tabella: 'libro_posizione', padre: 'libro', colonnaPadre: 'libro_chiave', foto: 'libro_posizione_foto', conRuolo: false,
  titolo: nomeLibro, prefisso: 'Dove si ottiene',
});
const filmPosizioni = posizioniDef({
  etichetta: 'Posizioni del film', tabella: 'film_posizione', padre: 'film', colonnaPadre: 'film_chiave', foto: 'film_posizione_foto', conRuolo: true,
  titolo: nomeFilm, prefisso: 'Dove si vede',
});

// ---- Sedi dei listini ----

const FOTO_SEDI = 'negozio_sede_foto';
interface RigaSede { luogo: string; nome: string; quartiere: string; area: string | null }
const sediDi = (negozio: string): RigaSede[] => prepared(
  `SELECT e.luogo_chiave AS luogo, l.nome AS nome, q.nome AS quartiere, l.area_chiave AS area
   FROM negozio_luogo_extra e JOIN luogo l ON l.chiave = e.luogo_chiave JOIN quartiere q ON q.chiave = l.quartiere_chiave
   WHERE e.negozio_chiave = ? ORDER BY l.ordine, l.chiave`).all(negozio) as RigaSede[];
const etichettaLuogo = (r: { nome: string; quartiere: string }): string => `${r.nome} — ${r.quartiere}`;

const luogoEsiste = (chiave: string): boolean => !!prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(chiave);
/** Il nome per mostrare un luogo («Nome — Quartiere»); se non esiste più, la chiave con la dicitura. */
function nomeLuogo(chiave: string): string {
  const r = prepared('SELECT l.nome AS nome, q.nome AS quartiere FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.chiave = ?').get(chiave) as { nome: string; quartiere: string } | undefined;
  return r ? etichettaLuogo(r) : `${chiave} — luogo che non esiste più`;
}

/** I luoghi da scegliere come sede: il valore è la CHIAVE del luogo, il nome («Nome — Quartiere») serve solo a mostrarlo. Quelli non nascosti più gli indicati (anche spariti). */
function luoghiScegliibili(inUso: string[]): Array<{ chiave: string; nome: string }> {
  const righe = prepared(`SELECT l.chiave AS luogo, l.nome AS nome, q.nome AS quartiere, l.nascosto AS nascosto FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave ORDER BY q.ordine, l.ordine`)
    .all() as Array<{ luogo: string; nome: string; quartiere: string; nascosto: number }>;
  const out = righe.filter((r) => r.nascosto === 0 || inUso.includes(r.luogo)).map((r) => ({ chiave: r.luogo, nome: etichettaLuogo(r) }));
  for (const k of inUso) if (!righe.some((r) => r.luogo === k)) out.push({ chiave: k, nome: nomeLuogo(k) });
  return out;
}
/** Solo per leggere le fotografie scritte con le etichette: etichetta → chiave del luogo; null per le etichette ambigue (due luoghi con lo stesso nome nello stesso quartiere). */
function mappaLuoghi(): Map<string, string | null> {
  const m = new Map<string, string | null>();
  for (const r of prepared('SELECT l.chiave AS luogo, l.nome AS nome, q.nome AS quartiere FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave').all() as Array<{ luogo: string; nome: string; quartiere: string }>) {
    const e = etichettaLuogo(r);
    m.set(e, m.has(e) ? null : r.luogo);
  }
  return m;
}

interface RigaPin { uid: string; nome: string; mappa: string; area: string | null }
/** I pin di questo negozio (con la mappa e l'Area), per scegliere quello che conferma una sede. */
const pinDelNegozio = (negozio: string): RigaPin[] => prepared(
  `SELECT s.uid AS uid, s.nome AS nome, m.nome AS mappa, m.area_chiave AS area FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave
   WHERE s.riferimento_tipo = 'negozio' AND s.riferimento_chiave = ? AND s.uid IS NOT NULL ORDER BY m.nome, s.nome, s.id`).all(negozio) as RigaPin[];

/** Le opzioni di pin per una sede: i pin del negozio sull'Area del luogo (più quelli indicati), con un numero dove il nome si ripete. */
function opzioniPin(negozio: string, area: string | null, indicati: string[]): Array<{ chiave: string; nome: string }> {
  const tutti = pinDelNegozio(negozio);
  const scelti = tutti.filter((p) => (area !== null && p.area === area) || indicati.includes(p.uid));
  const quanti = new Map<string, number>();
  for (const p of scelti) quanti.set(`${p.nome} — ${p.mappa}`, (quanti.get(`${p.nome} — ${p.mappa}`) ?? 0) + 1);
  const visti = new Map<string, number>();
  const out: Array<{ chiave: string; nome: string }> = [{ chiave: '', nome: 'Nessun pin' }];
  for (const p of scelti) {
    const base = `${p.nome} — ${p.mappa}`;
    const n = (visti.get(base) ?? 0) + 1; visti.set(base, n);
    out.push({ chiave: p.uid, nome: (quanti.get(base) ?? 1) > 1 ? `${base} (${n} di ${quanti.get(base)})` : base });
  }
  for (const uid of indicati) if (uid !== '' && !out.some((o) => o.chiave === uid)) out.push({ chiave: uid, nome: 'Un pin che non è più di questo negozio' });
  return out;
}

const pinDi = (negozio: string, luogo: string): string[] => prepared('SELECT spillo_uid FROM negozio_sede_spillo WHERE negozio_chiave = ? AND luogo_chiave = ? ORDER BY spillo_uid').pluck().all(negozio, luogo) as string[];
const kPin = (luogo: string) => `pin/${luogo}`;
const luogoDaPin = (percorso: string): string | null => (percorso.startsWith('pin/') ? percorso.slice(4) : null);
const areaDelLuogo = (luogo: string): string | null => (prepared('SELECT area_chiave FROM luogo WHERE chiave = ?').pluck().get(luogo) as string | null | undefined) ?? null;

/** I luoghi per cui mostrare il pin: le sedi di adesso e quelle della fotografia. */
function luoghiConPin(negozio: string, seme: Valori | null): string[] {
  const l = new Set(sediDi(negozio).map((s) => s.luogo));
  if (seme) for (const k of Object.keys(seme)) { const x = luogoDaPin(k); if (x) l.add(x); }
  return [...l];
}

/** La fotografia delle sedi tiene le CHIAVI dei luoghi. Una scritta con le etichette («Nome — Quartiere»), prima di questa forma, si porta alle chiavi (le etichette ambigue restano com'erano). */
function normalizzaSedi(guida: Valori): Valori {
  if (!Array.isArray(guida.sedi)) return guida;
  const mappa = mappaLuoghi();
  const posto = new Map((prepared('SELECT chiave FROM luogo ORDER BY ordine, chiave').pluck().all() as string[]).map((k, i) => [k, i]));
  // nell'ordine con cui `sediDi` le legge (l'ordine delle sedi non è un dato: due elenchi con le stesse sedi sono lo stesso valore)
  const sedi = (guida.sedi as string[]).map((e) => (typeof e !== 'string' || luogoEsiste(e) ? e : (mappa.get(e) ?? e)));
  sedi.sort((a, b) => (posto.get(a) ?? Number.MAX_SAFE_INTEGER) - (posto.get(b) ?? Number.MAX_SAFE_INTEGER));
  return { ...guida, sedi };
}
const semeSedi = (chiave: string): Valori | null => { const s = semeDi(FOTO_SEDI, 'negozio_chiave', chiave); return s ? normalizzaSedi(s) : null; };

const negozioSedi: DefRiga = {
  modalita: 'riga', etichetta: 'Sedi del listino', tabella: FOTO_SEDI, colonnaChiave: 'negozio_chiave',
  chiavi: () => (prepared('SELECT chiave FROM negozio ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM negozio WHERE chiave = ?').get(chiave),
  normalizzaGuida: normalizzaSedi,
  campi: (chiave) => {
    const seme = semeSedi(chiave);
    const sedi = sediDi(chiave);
    const sediGuida = seme?.sedi;
    const luoghiGuida = Array.isArray(sediGuida) ? sediGuida.filter((x): x is string => typeof x === 'string') : [];
    const out: CampoDef[] = [{ p: 'sedi', e: 'Altri luoghi in cui si vende (oltre alla sede del negozio)', t: 'elenco', opzioni: luoghiScegliibili([...sedi.map((s) => s.luogo), ...luoghiGuida]) }];
    for (const luogo of luoghiConPin(chiave, seme)) {
      const r = prepared('SELECT l.nome AS nome, q.nome AS quartiere, l.area_chiave AS area FROM luogo l JOIN quartiere q ON q.chiave = l.quartiere_chiave WHERE l.chiave = ?').get(luogo) as { nome: string; quartiere: string; area: string | null } | undefined;
      const indicati = [...pinDi(chiave, luogo), ...(typeof seme?.[kPin(luogo)] === 'string' ? [seme[kPin(luogo)] as string] : [])];
      out.push({
        p: kPin(luogo), e: 'Pin che conferma la sede', t: 'scelta', gruppo: `Sede: ${r ? etichettaLuogo(r) : 'un luogo che non esiste più'}`,
        opzioni: opzioniPin(chiave, r?.area ?? null, indicati),
      });
    }
    return out;
  },
  leggi: (chiave) => {
    const v: Valori = { sedi: sediDi(chiave).map((s) => s.luogo) };
    for (const luogo of luoghiConPin(chiave, semeSedi(chiave))) v[kPin(luogo)] = pinDi(chiave, luogo)[0] ?? '';
    return v;
  },
  scrivi: (chiave, v) => {
    assicuraFoto(FOTO_SEDI, 'negozio_chiave', chiave);
    if (v.sedi !== undefined) {
      const attuali = sediDi(chiave);
      const volute = new Set(Array.isArray(v.sedi) ? v.sedi : []);
      if ([...volute].some((k) => !luogoEsiste(k))) throw invalido('sedi', 'Una sede non è un luogo dell’elenco: scegline uno dai suggerimenti.');
      for (const s of attuali) {
        if (volute.has(s.luogo)) continue;
        prepared('DELETE FROM negozio_sede_spillo WHERE negozio_chiave = ? AND luogo_chiave = ?').run(chiave, s.luogo);
        prepared('DELETE FROM negozio_luogo_extra WHERE negozio_chiave = ? AND luogo_chiave = ?').run(chiave, s.luogo);
      }
      for (const luogo of volute) prepared('INSERT OR IGNORE INTO negozio_luogo_extra (negozio_chiave, luogo_chiave) VALUES (?, ?)').run(chiave, luogo);
    }
    const sedi = new Set(sediDi(chiave).map((s) => s.luogo));
    for (const [k, valore] of Object.entries(v)) {
      const luogo = luogoDaPin(k);
      if (!luogo || !sedi.has(luogo)) continue; // il pin di una sede che non c'è più non ha dove stare
      prepared('DELETE FROM negozio_sede_spillo WHERE negozio_chiave = ? AND luogo_chiave = ?').run(chiave, luogo);
      const uid = str(valore) ?? '';
      if (uid === '') continue;
      // un pin è la sede di un solo luogo: se stava altrove nello stesso negozio (la stessa correzione lo sposta), si libera
      prepared('DELETE FROM negozio_sede_spillo WHERE spillo_uid = ?').run(uid);
      prepared('INSERT INTO negozio_sede_spillo (spillo_uid, negozio_chiave, luogo_chiave) VALUES (?, ?, ?)').run(uid, chiave, luogo);
    }
  },
  nome: (chiave) => `Sedi del listino di «${(prepared('SELECT nome FROM negozio WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave}»`,
  valida: (chiave, fusi) => {
    const attuali = sediDi(chiave);
    const scelti = Array.isArray(fusi.sedi) ? fusi.sedi : [];
    const principale = prepared('SELECT sede_chiave FROM negozio WHERE chiave = ?').pluck().get(chiave) as string | null | undefined;
    const volute: string[] = [];
    for (const luogo of scelti) {
      if (!luogoEsiste(luogo)) throw invalido('sedi', 'Una sede scelta non è un luogo dell’elenco: scegli dai suggerimenti.');
      if (volute.includes(luogo)) throw invalido('sedi', `«${nomeLuogo(luogo)}» compare due volte.`);
      if (luogo === principale) throw invalido('sedi', `«${nomeLuogo(luogo)}» è già la sede del negozio: qui vanno gli altri luoghi.`);
      volute.push(luogo);
    }
    const prima = new Map(attuali.map((s) => [s.luogo, pinDi(chiave, s.luogo)]));
    for (const [k, valore] of Object.entries(fusi)) {
      const luogo = luogoDaPin(k);
      if (!luogo || !volute.includes(luogo) || typeof valore !== 'string' || valore === '') continue;
      const gia = prima.get(luogo) ?? [];
      if (gia.length > 1 && valore !== gia[0]) throw httpErrors.conflict('piu-pin-per-sede', 'Questa sede ha più di un pin: si corregge dall’editor delle mappe.');
      if (gia.length === 1 && gia[0] === valore) continue; // il pin che c'era non si ricontrolla
      const p = pinDelNegozio(chiave).find((x) => x.uid === valore);
      if (!p) throw invalido(k, 'Il pin scelto non è un pin di questo negozio.');
      const area = areaDelLuogo(luogo);
      if (area === null || p.area !== area) throw invalido(k, 'Il pin scelto non sta sull’Area di questo luogo: scegli un pin dell’elenco.');
      for (const altro of volute) {
        if (altro !== luogo && fusi[kPin(altro)] === valore) throw invalido(k, 'Lo stesso pin non può confermare due sedi.');
      }
      const usato = prepared('SELECT negozio_chiave AS negozio FROM negozio_sede_spillo WHERE spillo_uid = ?').get(valore) as { negozio: string } | undefined;
      if (usato && usato.negozio !== chiave) throw httpErrors.conflict('pin-gia-sede', 'Quel pin conferma già la sede di un altro negozio.');
    }
  },
  // la fotografia rimette luoghi e pin: i luoghi devono esistere (la sede è una chiave esterna) e i pin non devono confermare altro
  verificaRipristino: (chiave, guida) => {
    if (Array.isArray(guida.sedi)) {
      for (const k of guida.sedi) if (!luogoEsiste(k)) throw httpErrors.conflict('sede-originale-mancante', 'Un luogo della guida non esiste più: non si può rimettere.');
    }
    for (const [k, valore] of Object.entries(guida)) {
      if (!luogoDaPin(k) || typeof valore !== 'string' || valore === '') continue;
      if (!prepared('SELECT 1 FROM spillo WHERE uid = ?').get(valore)) throw httpErrors.conflict('pin-originale-mancante', 'Un pin della guida non esiste più: non si può rimettere.');
      const usato = prepared('SELECT negozio_chiave AS negozio FROM negozio_sede_spillo WHERE spillo_uid = ?').get(valore) as { negozio: string } | undefined;
      if (usato && usato.negozio !== chiave) throw httpErrors.conflict('pin-gia-sede', 'Un pin della guida conferma adesso la sede di un altro negozio: non si può rimettere.');
    }
  },
};

// ---- Legami delle note storiche ----

const FOTO_NOTE = 'nota_storica_legame_foto';
const SUFFISSO_SPARITO = ' (non esiste più)';
type TipoLegame = 'articolo' | 'catalogo';

/** Un articolo collegato al catalogo non ha un nome proprio (`articolo.nome` vuoto): il suo nome è quello dell'oggetto, come in tutte le pagine. */
const NOME_ARTICOLO = "COALESCE(NULLIF(a.nome, ''), c.nome, a.chiave)";
const etichettaArticolo =(r: { nome: string; negozio: string }): string => `${r.nome} — ${r.negozio}`;
const etichettaOggetto = (r: { nome: string; categoria: string }): string => `${r.nome} (${r.categoria})`;

/** Etichetta → chiave per le offerte (articoli) e per gli oggetti del catalogo; null se l'etichetta è ambigua. */
function mappaLegami(tipo: TipoLegame): Map<string, string | null> {
  const m = new Map<string, string | null>();
  const righe = tipo === 'articolo'
    ? (prepared(`SELECT a.chiave AS chiave, ${NOME_ARTICOLO} AS nome, n.nome AS negozio FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
        LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave`).all() as Array<{ chiave: string; nome: string; negozio: string }>).map((r) => [r.chiave, etichettaArticolo(r)] as const)
    : (prepared('SELECT chiave, nome, categoria FROM catalogo_oggetto').all() as Array<{ chiave: string; nome: string; categoria: string }>).map((r) => [r.chiave, etichettaOggetto(r)] as const);
  for (const [chiave, e] of righe) m.set(e, m.has(e) ? null : chiave);
  return m;
}
const TABELLA_LEGAME: Record<TipoLegame, string> = { articolo: 'articolo', catalogo: 'catalogo_oggetto' };
const legameEsiste = (tipo: TipoLegame, chiave: string): boolean => !!prepared(`SELECT 1 FROM ${TABELLA_LEGAME[tipo]} WHERE chiave = ?`).get(chiave);

/** L'etichetta per mostrare un legame (il valore è la CHIAVE): se l'elemento non c'è più, la chiave con la dicitura «non esiste più». */
function etichettaLegame(tipo: TipoLegame, chiave: string): string {
  const r = tipo === 'articolo'
    ? prepared(`SELECT ${NOME_ARTICOLO} AS nome, n.nome AS negozio FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
        LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.chiave = ?`).get(chiave) as { nome: string; negozio: string } | undefined
    : prepared('SELECT nome, categoria FROM catalogo_oggetto WHERE chiave = ?').get(chiave) as { nome: string; categoria: string } | undefined;
  if (!r) return `${chiave}${SUFFISSO_SPARITO}`;
  return tipo === 'articolo' ? etichettaArticolo(r as { nome: string; negozio: string }) : etichettaOggetto(r as { nome: string; categoria: string });
}
const legamiDi = (nota: string, tipo: TipoLegame): string[] => prepared('SELECT chiave FROM nota_storica_legame WHERE nota_chiave = ? AND tipo = ? ORDER BY chiave').pluck().all(nota, tipo) as string[];
const CAMPI_LEGAMI = [['articoli', 'articolo'], ['oggetti', 'catalogo']] as const;

/** La fotografia tiene le CHIAVI degli elementi. Una scritta con le etichette, prima di questa forma, si porta alle chiavi (le etichette ambigue restano com'erano). */
function normalizzaLegami(guida: Valori): Valori {
  const out: Valori = { ...guida };
  for (const [campo, tipo] of CAMPI_LEGAMI) {
    const elenco = guida[campo];
    if (!Array.isArray(elenco)) continue;
    let mappa: Map<string, string | null> | null = null;
    out[campo] = (elenco as string[]).map((e) => {
      if (typeof e !== 'string' || legameEsiste(tipo, e)) return e;
      if (e.endsWith(SUFFISSO_SPARITO)) return e.slice(0, -SUFFISSO_SPARITO.length);
      mappa ??= mappaLegami(tipo);
      return mappa.get(e) ?? e;
    }).sort(); // `legamiDi` le legge per chiave: l'ordine dei legami non è un dato
  }
  return out;
}
const semeLegami = (nota: string): Valori | null => { const s = semeDi(FOTO_NOTE, 'nota_chiave', nota); return s ? normalizzaLegami(s) : null; };

/** Gli elementi da scegliere: il valore è la CHIAVE, il nome serve a mostrarlo. Più quelli indicati (già legati o nella guida) anche se spariti. */
function opzioniLegami(tipo: TipoLegame, inUso: string[]): Array<{ chiave: string; nome: string }> {
  const out: Array<{ chiave: string; nome: string }> = [];
  const presenti = new Set<string>();
  const tutti = tipo === 'articolo'
    ? (prepared(`SELECT a.chiave AS chiave, ${NOME_ARTICOLO} AS nome, n.nome AS negozio FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
        LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave`).all() as Array<{ chiave: string; nome: string; negozio: string }>).map((r) => ({ chiave: r.chiave, nome: etichettaArticolo(r) }))
    : (prepared('SELECT chiave, nome, categoria FROM catalogo_oggetto').all() as Array<{ chiave: string; nome: string; categoria: string }>).map((r) => ({ chiave: r.chiave, nome: etichettaOggetto(r) }));
  for (const t of tutti) if (!presenti.has(t.chiave)) { presenti.add(t.chiave); out.push(t); }
  for (const k of inUso) if (!presenti.has(k)) { presenti.add(k); out.push({ chiave: k, nome: etichettaLegame(tipo, k) }); }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

const notaStoricaLegami: DefRiga = {
  modalita: 'riga', etichetta: 'Dove compare la nota storica', tabella: FOTO_NOTE, colonnaChiave: 'nota_chiave',
  chiavi: () => (prepared('SELECT chiave FROM nota_storica ORDER BY chiave').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM nota_storica WHERE chiave = ?').get(chiave),
  normalizzaGuida: normalizzaLegami,
  campi: (chiave) => {
    const seme = semeLegami(chiave);
    const dellaGuida = (campo: 'articoli' | 'oggetti'): string[] => { const x = seme?.[campo]; return Array.isArray(x) ? x.filter((e): e is string => typeof e === 'string') : []; };
    return [
      { p: 'articoli', e: 'Offerte dei negozi a cui si riferisce', t: 'elenco', opzioni: opzioniLegami('articolo', [...legamiDi(chiave, 'articolo'), ...dellaGuida('articoli')]) },
      { p: 'oggetti', e: 'Oggetti del catalogo a cui si riferisce', t: 'elenco', opzioni: opzioniLegami('catalogo', [...legamiDi(chiave, 'catalogo'), ...dellaGuida('oggetti')]) },
    ];
  },
  leggi: (chiave) => ({ articoli: legamiDi(chiave, 'articolo'), oggetti: legamiDi(chiave, 'catalogo') }),
  scrivi: (chiave, v) => {
    assicuraFoto(FOTO_NOTE, 'nota_chiave', chiave);
    for (const [campo, tipo] of CAMPI_LEGAMI) {
      const elenco = v[campo];
      if (elenco === undefined) continue;
      const chiavi = new Set<string>(Array.isArray(elenco) ? elenco : []);
      prepared('DELETE FROM nota_storica_legame WHERE nota_chiave = ? AND tipo = ?').run(chiave, tipo);
      for (const k of chiavi) prepared('INSERT INTO nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)').run(chiave, tipo, k);
    }
  },
  nome: (chiave) => {
    const t = (prepared('SELECT testo FROM nota_storica WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;
    return `Nota: ${t.length > 60 ? `${t.slice(0, 60)}…` : t}`;
  },
  valida: (chiave, fusi) => {
    for (const [campo, tipo] of CAMPI_LEGAMI) {
      const elenco = Array.isArray(fusi[campo]) ? fusi[campo] : [];
      const attuali = legamiDi(chiave, tipo);
      const visti = new Set<string>();
      for (const k of elenco) {
        // un legame che c'era e non è stato toccato non si ricontrolla (può puntare a un elemento sparito); uno nuovo deve esistere
        if (!attuali.includes(k) && !legameEsiste(tipo, k)) throw invalido(campo, 'Una voce scelta non è nell’elenco: scegli dai suggerimenti.');
        if (visti.has(k)) throw invalido(campo, `«${etichettaLegame(tipo, k)}» compare due volte.`);
        visti.add(k);
      }
    }
  },
};

export const DEFINIZIONI_LUOGHI_NOTE: {
  'libro-posizioni': DefRiga; 'film-posizioni': DefRiga; 'negozio-sedi': DefRiga; 'nota-storica-legami': DefRiga;
} = { 'libro-posizioni': libroPosizioni, 'film-posizioni': filmPosizioni, 'negozio-sedi': negozioSedi, 'nota-storica-legami': notaStoricaLegami };
