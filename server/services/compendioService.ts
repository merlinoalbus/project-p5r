// ============================================================
// compendioService — letture del compendio Royal con resa italiana
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { fonteNodoGuida } from '../../shared/riferimentiCatalogoGuida.js';
import { httpErrors } from '../utils/httpError.js';
import { extra, mappaAmbito, t, tOpz, vociAmbito } from './traduzioniService.js';
import { corrispondeRicerca } from '../../shared/testo.js';
import { uguali } from '../../shared/percorsoGuida.js';
import type { DoteNote } from '../../shared/effettiAzione.js';
import { dotiIncontro } from './dotiIncontroConfidente.js';
import { invitiDelConfidente } from './inviti.js';
import { catalogoOggettiDisponibile, effettiDegliOggetti, effettoDellaFonte, materialiDelleRicette, offerteBaseDegliOggetti, oggettiConChiavi, oggettiPerFonte, ricompensePerFonte, riferimentiListiniScambi } from './catalogoOggettiLetture.js';
import { datiGuida, datiGuidaCorretti, type Congelato } from './datiGuida.js';
import { costoPrecedenteRegalo } from './costoRegaloService.js';
import { disponibilitaConfidente } from './disponibilitaStrutturataService.js';
import { fotografaDoteIncontro } from './confidentiScritture.js';
import { postoDellArticolo, postoDelNegozio } from './mappe/nomiDeiPosti.js';
import type { ReazioneRegalo } from '../../shared/puntiConfidenti.js';
import { testoCostoAImporto } from '../../shared/catalogo.js';
import type {
  AffinitaDto, ArcanaDto, ConfidenteDettaglioDto, ConfidenteDto, CostoSkillDto, GlossarioDto, OggettoDto, PersonaDettaglioDto,
  CatalogoOggettoDto, ModoApprendimento, OggettiGuidaDto, PersonaRiassuntoDto, RegoleFusioneDto, RicettaSpecialeDto, SkillAppresaDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto,
} from '../../shared/types.js';

// ---- Righe DB ----

/**
 * Il testo di un oggetto dell'equipaggiamento nel compendio (elenco e oggetto dell'esecuzione di una Persona): le statistiche
 * (`statistiche.testo`, separate dall'effetto dalla migrazione 275) e poi l'effetto, come li dava la vecchia descrizione in un solo testo.
 */
function testoOggettoCompendio(o: CatalogoOggettoDto): string {
  const statistiche = typeof o.statistiche?.testo === 'string' ? o.statistiche.testo.trim() : '';
  return [statistiche, o.effetto.trim()].filter(Boolean).join(' / ');
}

/** L'API storica conserva le sezioni della guida, ma dopo M7 non usa il crosswalk per dare identità agli oggetti. */
export function oggettiGuida(): Congelato<OggettiGuidaDto> {
  const dati = datiGuidaCorretti<OggettiGuidaDto>('oggetti-guida');
  if (!dati) throw httpErrors.notFound('oggetti-non-disponibili', 'I dati degli oggetti della guida non sono caricati.');
  if (!catalogoOggettiDisponibile()) {
    const ponte = datiGuida<{ abbinamenti: Array<{ nome: string; articolo?: string; negozi: string[] }> }>('oggetti-crosswalk');
    if (!ponte) return dati;
    const per = new Map(ponte.abbinamenti.map((a) => [a.nome, a]));
    const lega = <V extends { nome: string }>(v: V): V => {
      const a = per.get(v.nome); if (!a) return v;
      if (a.articolo) return { ...v, articolo: a.articolo, posto: postoDellArticolo(a.articolo) };
      const postiNegozi: Record<string, string> = {};
      for (const n of a.negozi) { const p = postoDelNegozio(n); if (p) postiNegozi[n] = p; }
      return { ...v, negozi: a.negozi, postiNegozi };
    };
    return { ...dati, consumabili: dati.consumabili.map(lega), chiaveEMateriali: dati.chiaveEMateriali.map(lega) };
  }
  const catalogo = oggettiPerFonte('guida');
  const offerte = new Map<string, Array<{ chiave: string; negozio: string }>>();
  for (const a of prepared(`SELECT a.catalogo_chiave,a.chiave,a.negozio_chiave FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
    WHERE a.catalogo_chiave IS NOT NULL AND a.nascosto = 0 AND n.nascosto = 0 AND a.articolo_condiviso IS NULL ORDER BY n.ordine,a.ordine,a.chiave`).all() as Array<{ catalogo_chiave: string; chiave: string; negozio_chiave: string }>) {
    const v = offerte.get(a.catalogo_chiave) ?? []; v.push({ chiave: a.chiave, negozio: a.negozio_chiave }); offerte.set(a.catalogo_chiave, v);
  }
  const identita = (o: CatalogoOggettoDto) => ({ catalogo: { chiave: o.chiave, nome: o.nome, casa: o.casa }, nome: o.nome, nomiAltri: o.nomiAltri });
  const legami = (o: CatalogoOggettoDto) => {
    const righe = offerte.get(o.chiave) ?? []; const articolo = righe.length === 1 ? righe[0].chiave : undefined;
    const negozi = [...new Set(righe.map((a) => a.negozio))]; const postiNegozi: Record<string, string> = {};
    for (const n of negozi) { const p = postoDelNegozio(n); if (p) postiNegozi[n] = p; }
    return { articolo, posto: articolo ? postoDellArticolo(articolo) : null, negozi, postiNegozi };
  };
  const prodotti = ricompensePerFonte('ricetta'); const materiali = materialiDelleRicette();
  // Ondata 5, lotto F (migrazione 279): l'effetto di una ricetta è quello del suo prodotto, nel catalogo
  const effettiProdotti = effettiDegliOggetti([...prodotti.values()].flat().map((p) => p.chiave));
  return { ...dati,
    scambi: [], listiniScambi: riferimentiListiniScambi(),
    consumabili: dati.consumabili.flatMap((v) => {
      const o = catalogo.get(fonteNodoGuida('consumabili', v)); if (!o || o.nascosto) return [];
      const categorie = ['cura', 'sp', 'stato', 'battaglia', 'esplorazione', 'altro'];
      return [{ ...v, ...identita(o), ...legami(o), nomeEn: o.nomeOriginale, effetto: o.effetto,
        categoria: (o.sottocategoria && categorie.includes(o.sottocategoria) ? o.sottocategoria : 'altro') as OggettiGuidaDto['consumabili'][number]['categoria'],
        prezzo: o.prezzoMinimo, notaPrezzo: o.prezzoMinimo === null && v.prezzo !== null ? `Prezzo citato nella guida: ${v.prezzo.toLocaleString('it-IT')} ¥, non ricavato da una vendita.` : null }];
    }),
    chiaveEMateriali: dati.chiaveEMateriali.flatMap((v) => {
      const o = catalogo.get(fonteNodoGuida('chiave-e-materiali', v)); if (!o || o.nascosto) return [];
      return [{ ...v, ...identita(o), ...legami(o), nomeEn: o.nomeOriginale, uso: o.effetto, tipo: o.categoria === 'materiale' ? 'materiale' as const : 'chiave' as const }];
    }),
    fabbricazione: { ...dati.fabbricazione, ricette: dati.fabbricazione.ricette.map((r) => ({ ...r,
      effetto: effettoDellaFonte(r.effetto, prodotti.get(r.attrezzo) ?? [], effettiProdotti),
      prodottiCatalogo: prodotti.get(r.attrezzo) ?? [], materialiCatalogo: materiali.get(r.attrezzo) ?? [] })) },
    abiti: { ...dati.abiti, elenco: dati.abiti.elenco.flatMap((v) => {
      const o = catalogo.get(fonteNodoGuida('abiti', v)); if (!o || o.nascosto) return [];
      return [{ ...v, ...identita(o), per: typeof o.statistiche?.per === 'string' ? o.statistiche.per : '' }];
    }) },
  };
}

interface RigaPersona {
  id: number; nome: string; arcana: string; livello: number; eredita: string | null; speciale: number; rara: number; dlc: number;
  richiede_confidente_max: number; nota: string | null; oggetto: string | null; oggetto_allarme: string | null; oggetto_e_carta: number; tratto: string;
  forza: number; magia: number; resistenza: number; agilita: number; fortuna: number; aree_mementos_json: string; piani_mementos: string | null;
  descrizione: string; fonte_descrizione: string;
  del_party: number; personaggio: string | null; forma: number | null; forma_di: number | null; deriva_da: number | null; chiave_forma: string | null; forma_condizioni_json: string | null;
}

interface RigaSkill {
  id: number; nome: string; elemento: string; costo_tipo: 'sp' | 'hp' | 'nessuno'; costo_valore: number; effetto: string;
  fonte_carta: string | null; negoziazione: string | null; unica: string | null;
}

interface RigaOggetto { id: number; nome: string; categoria: string; vincolo: string | null; descrizione: string }

// ---- Mappature ----

/** Riassunto di una skill per id (null se non esiste); usato da partite, obiettivi e storico. */
export function skillDto(id: number): SkillRiassuntoDto | null {
  const s = prepared('SELECT * FROM skill WHERE id = ?').get(id) as { id: number; nome: string; elemento: string; costo_tipo: 'sp' | 'hp' | 'nessuno'; costo_valore: number; effetto: string } | undefined;
  if (!s) return null;
  return { id: s.id, nome: s.nome, nomeIt: t('skill', s.nome), elemento: s.elemento, elementoNome: t('elementoSkill', s.elemento), costo: costoDto(s.costo_tipo, s.costo_valore), effetto: s.effetto, effettoNome: t('effettoSkill', s.effetto) };
}

/** I riassunti di più skill con una query sola (id → riassunto; gli id che non esistono mancano): la scorta li chiedeva uno alla volta (P2'). */
export function skillRiassunti(ids: Iterable<number>): Map<number, SkillRiassuntoDto> {
  const elenco = [...new Set(ids)];
  if (elenco.length === 0) return new Map();
  const righe = prepared('SELECT * FROM skill WHERE id IN (SELECT value FROM json_each(?))').all(JSON.stringify(elenco)) as RigaSkill[];
  return new Map(righe.map((r) => [r.id, skillRiassunto(r)]));
}

/** Costo di una skill con il testo da mostrare: «N SP», «N% HP», oppure un trattino per le skill senza costo (passive). */
function costoDto(tipo: 'sp' | 'hp' | 'nessuno', valore: number): CostoSkillDto {
  const testo = tipo === 'sp' ? `${valore} SP` : tipo === 'hp' ? `${valore}% HP` : '—';
  return { tipo, valore, testo };
}

/** Da una riga della tabella `skill` al riassunto per l'API: nome, elemento ed effetto con la resa italiana, costo leggibile. */
function skillRiassunto(r: RigaSkill): SkillRiassuntoDto {
  return {
    id: r.id, nome: r.nome, nomeIt: t('skill', r.nome), elemento: r.elemento, elementoNome: t('elementoSkill', r.elemento),
    costo: costoDto(r.costo_tipo, r.costo_valore), effetto: r.effetto, effettoNome: t('effettoSkill', r.effetto),
  };
}

/** Le affinità di una Persona (elemento → codice), lette da sole. */
export function codiciAffinita(personaId: number): Map<string, string> {
  const righe = prepared('SELECT elemento, codice FROM persona_affinita WHERE persona_id = ?').all(personaId) as Array<{ elemento: string; codice: string }>;
  return new Map(righe.map((r) => [r.elemento, r.codice]));
}

/**
 * Le affinità delle Persona date con una query (id → elemento → codice): l'elenco ne faceva una per Persona, circa 230 (P4').
 * La chiave primaria `(persona_id, elemento)` rende il raggruppamento uguale alle letture una per una; leggere solo le Persona
 * dell'elenco tiene veloci anche gli elenchi filtrati (un arcano), che con tutta la tabella diventavano più lenti di prima.
 */
function codiciAffinitaDi(ids: readonly number[]): Map<number, Map<string, string>> {
  const out = new Map<number, Map<string, string>>();
  if (ids.length === 0) return out;
  const righe = prepared('SELECT persona_id, elemento, codice FROM persona_affinita WHERE persona_id IN (SELECT value FROM json_each(?))').all(JSON.stringify(ids)) as Array<{ persona_id: number; elemento: string; codice: string }>;
  for (const r of righe) {
    const m = out.get(r.persona_id);
    if (m) m.set(r.elemento, r.codice); else out.set(r.persona_id, new Map([[r.elemento, r.codice]]));
  }
  return out;
}

/**
 * Le affinità per l'API, una per ogni elemento nell'ordine dell'ambito `elementoAffinita`: gli elementi che la Persona
 * non ha in tabella valgono «-» (neutra); nome e sigla dell'elemento e del codice vengono dalle traduzioni.
 */
export function affinitaDi(perElemento: Map<string, string>): AffinitaDto[] {
  const ordine = vociAmbito('elementoAffinita');
  return ordine.map((e) => {
    const codice = perElemento.get(e.chiave) ?? '-';
    return {
      elemento: e.chiave, elementoNome: e.testo, elementoSigla: String(e.extra?.sigla ?? ''),
      codice, codiceNome: t('affinita', codice), codiceSigla: String(extra<{ sigla: string }>('affinita', codice)?.sigla ?? ''),
    };
  });
}

/**
 * R8-10/1: le affinità come le dà la guida, se l'utente ne ha corretta almeno una (altrimenti null: sono già quelle della guida). Il valore della
 * guida di ogni riga è `seed_codice` (migrazione 186); un elemento senza riga in tabella vale «-», come per la lettura.
 */
function affinitaGuidaDi(personaId: number): AffinitaDto[] | null {
  const righe = prepared('SELECT elemento, codice, origine, seed_codice FROM persona_affinita WHERE persona_id = ?').all(personaId) as Array<{ elemento: string; codice: string; origine: string; seed_codice: string | null }>;
  if (!righe.some((r) => r.origine === 'utente')) return null;
  return affinitaDi(new Map(righe.map((r) => [r.elemento, r.seed_codice ?? r.codice])));
}

/**
 * Da una riga della tabella `persona` al riassunto per l'API (nomi tradotti, flag booleani, statistiche, affinità).
 * Le affinità si possono passare già lette in blocco (elenco); se mancano si leggono per la sola Persona.
 */
function personaRiassunto(r: RigaPersona, affinita: Map<string, string> = codiciAffinita(r.id)): PersonaRiassuntoDto {
  return {
    id: r.id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello,
    eredita: r.eredita, ereditaNome: tOpz('tipoEredita', r.eredita),
    speciale: r.speciale === 1, rara: r.rara === 1, dlc: r.dlc === 1, richiedeConfidenteMax: r.richiede_confidente_max === 1,
    tratto: r.tratto,
    statistiche: { forza: r.forza, magia: r.magia, resistenza: r.resistenza, agilita: r.agilita, fortuna: r.fortuna },
    affinita: affinitaDi(affinita),
    delParty: r.del_party === 1, personaggio: r.personaggio, forma: r.forma,
  };
}

/** La ricetta di una fusione speciale: la Persona risultato e i suoi ingredienti nell'ordine della ricetta, con il nome italiano. */
function ricettaDto(risultatoId: number): RicettaSpecialeDto {
  const ris = prepared('SELECT id, nome FROM persona WHERE id = ?').get(risultatoId) as { id: number; nome: string };
  const ingredienti = prepared('SELECT p.id, p.nome FROM fusione_speciale_ingrediente i JOIN persona p ON p.id = i.ingrediente_id WHERE i.risultato_id = ? ORDER BY i.ordine').all(risultatoId) as Array<{ id: number; nome: string }>;
  return { risultato: { ...ris, nomeIt: t('persona', ris.nome) }, ingredienti: ingredienti.map((i) => ({ ...i, nomeIt: t('persona', i.nome) })) };
}

// ---- Arcani, glossario, regole ----

/** Gli arcani nell'ordine di gioco, con numero e nome italiano. */
export function elencaArcani(): ArcanaDto[] {
  return (prepared('SELECT chiave, ordine, numero FROM arcana ORDER BY ordine').all() as Array<{ chiave: string; ordine: number; numero: number | null }>)
    .map((a) => ({ ...a, nome: t('arcana', a.chiave) }));
}

/**
 * Il glossario dei codici del compendio con la resa italiana: arcani, elementi, affinità, tipi di eredità, statistiche,
 * tipi e vincoli degli oggetti, aree di Mementos e Doti sociali (in ordine di gioco). Serve al FE per tradurre i codici.
 */
export function glossario(): GlossarioDto {
  /** Le voci di un ambito come elenco ordinato chiave/nome/sigla (la sigla è nel campo extra, vuota se manca). */
  const conSigla = (ambito: string) => vociAmbito(ambito).map((v) => ({ chiave: v.chiave, nome: v.testo, sigla: String(v.extra?.sigla ?? '') }));
  const affinita: Record<string, { nome: string; sigla: string }> = {};
  for (const v of vociAmbito('affinita')) affinita[v.chiave] = { nome: v.testo, sigla: String(v.extra?.sigla ?? '') };
  return {
    arcani: elencaArcani(),
    elementiSkill: mappaAmbito('elementoSkill'),
    elementiAffinita: conSigla('elementoAffinita'),
    affinita,
    tipiEredita: mappaAmbito('tipoEredita'),
    statistiche: conSigla('statistica'),
    tipiOggetto: mappaAmbito('tipoOggetto'),
    vincoliOggetto: mappaAmbito('vincoloOggetto'),
    areeMementos: mappaAmbito('areaMementos'),
    dotiSociali: (prepared('SELECT chiave, nome FROM dote_sociale ORDER BY ordine').all() as Array<{ chiave: string; nome: string }>).map((d) => ({ chiave: d.chiave, nome: d.nome })),
  };
}

/** Termini di gioco della localizzazione italiana (ambito `termine`), ordinati per categoria e nome. */
export function terminiGlossario(): TermineDto[] {
  return vociAmbito('termine')
    .map((v) => ({ chiave: v.chiave, nome: v.testo, categoria: String(v.extra?.categoria ?? 'altro'), definizione: (v.extra?.definizione as string | null | undefined) ?? null, fonte: (v.extra?.fonte as string | null | undefined) ?? null }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome, 'it'));
}

/**
 * Tutte le regole di fusione in un colpo: ordine degli arcani, tabella arcano × arcano, ricette speciali, tesori con il
 * modificatore di rango per ogni arcano (0 dove manca), matrice dell'eredità (tipo × colonna, ammesso sì/no) e Persona
 * di ciascun set DLC nell'ordine dei set.
 */
export function regoleFusione(): RegoleFusioneDto {
  const arcani = (prepared('SELECT chiave FROM arcana ORDER BY ordine').all() as Array<{ chiave: string }>).map((a) => a.chiave);
  const tabella = prepared('SELECT a, b, risultato FROM fusione_arcana').all() as Array<{ a: string; b: string; risultato: string }>;
  const speciali = (prepared('SELECT risultato_id FROM fusione_speciale').all() as Array<{ risultato_id: number }>).map((r) => ricettaDto(r.risultato_id));
  const tesori = prepared('SELECT t.persona_id, p.nome FROM tesoro t JOIN persona p ON p.id = t.persona_id ORDER BY t.ordine').all() as Array<{ persona_id: number; nome: string }>;
  // modificatori e set DLC con una query ciascuno, raggruppati qui (P4': prima una query per coppia arcano × tesoro e una per set)
  const perCoppia = new Map((prepared('SELECT arcana, tesoro_id, modificatore FROM tesoro_modificatore').all() as Array<{ arcana: string; tesoro_id: number; modificatore: number }>)
    .map((m) => [`${m.arcana}|${m.tesoro_id}`, m.modificatore]));
  const modificatori: Record<string, number[]> = {};
  for (const a of arcani) modificatori[a] = tesori.map((te) => perCoppia.get(`${a}|${te.persona_id}`) ?? 0);
  const righeMatrice = prepared('SELECT tipo, elemento, ammesso FROM eredita_matrice').all() as Array<{ tipo: string; elemento: string; ammesso: number }>;
  const colonne = vociAmbito('colonnaEredita').map((c) => c.chiave);
  const tipi = [...new Set(righeMatrice.map((r) => r.tipo))];
  const matrice: Record<string, boolean[]> = {};
  for (const tipo of tipi) matrice[tipo] = colonne.map((el) => righeMatrice.find((r) => r.tipo === tipo && r.elemento === el)?.ammesso === 1);
  const set = prepared('SELECT id FROM dlc_set ORDER BY ordine').all() as Array<{ id: number }>;
  const nomiPerSet = new Map<number, string[]>();
  for (const r of prepared('SELECT d.set_id, p.nome FROM dlc_set_persona d JOIN persona p ON p.id = d.persona_id ORDER BY d.set_id, p.nome').all() as Array<{ set_id: number; nome: string }>) {
    const nomi = nomiPerSet.get(r.set_id);
    if (nomi) nomi.push(r.nome); else nomiPerSet.set(r.set_id, [r.nome]);
  }
  const dlc = set.map((s) => nomiPerSet.get(s.id) ?? []);
  return { arcani, tabella, speciali, tesori: { nomi: tesori.map((te) => te.nome), nomiIt: tesori.map((te) => t('persona', te.nome)), modificatori }, eredita: { tipi, colonne, matrice }, dlc };
}

// ---- Persona ----

/** Filtri dell'elenco Persona. */
export interface FiltroPersona {
  q?: string;
  arcana?: string;
  livelloMin?: number;
  livelloMax?: number;
  dlc?: boolean;
  rara?: boolean;
  speciale?: boolean;
  /** Filtra per skill posseduta (nome canonico). */
  skill?: string;
  /** Include le forme delle Persona del gruppo (solo il compendio le mostra): senza, l'elenco ha le sole Persona utilizzabili e fondibili. */
  delGruppo?: boolean;
}

/**
 * Elenco delle Persona filtrato, ordinato per livello, ordine dell'arcano e nome. I filtri strutturati diventano condizioni
 * SQL parametriche (la skill con un EXISTS su `persona_skill`); le affinità si leggono con una query sola per tutte le righe;
 * la ricerca testuale `q` si applica dopo, sui nomi originale e italiano, perché passa dalla normalizzazione di `corrispondeRicerca`.
 */
export function elencaPersona(f: FiltroPersona = {}): PersonaRiassuntoDto[] {
  const cond: string[] = [];
  const par: unknown[] = [];
  if (!f.delGruppo) cond.push('p.del_party = 0');
  if (f.arcana) {
    cond.push('p.arcana = ?');
    par.push(f.arcana);
  }
  if (f.livelloMin !== undefined) {
    cond.push('p.livello >= ?');
    par.push(f.livelloMin);
  }
  if (f.livelloMax !== undefined) {
    cond.push('p.livello <= ?');
    par.push(f.livelloMax);
  }
  if (f.dlc !== undefined) {
    cond.push('p.dlc = ?');
    par.push(f.dlc ? 1 : 0);
  }
  if (f.rara !== undefined) {
    cond.push('p.rara = ?');
    par.push(f.rara ? 1 : 0);
  }
  if (f.speciale !== undefined) {
    cond.push('p.speciale = ?');
    par.push(f.speciale ? 1 : 0);
  }
  if (f.skill) {
    cond.push('EXISTS (SELECT 1 FROM persona_skill ps JOIN skill s ON s.id = ps.skill_id WHERE ps.persona_id = p.id AND s.nome = ?)');
    par.push(f.skill);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const righe = getDb().prepare(`SELECT p.* FROM persona p JOIN arcana a ON a.chiave = p.arcana ${where} ORDER BY p.livello, a.ordine, p.nome`).all(...par) as RigaPersona[];
  const affinita = codiciAffinitaDi(righe.map((r) => r.id));
  const dto = righe.map((r) => personaRiassunto(r, affinita.get(r.id) ?? new Map()));
  const q = f.q;
  return q ? dto.filter((p) => corrispondeRicerca(q, p.nome, p.nomeIt)) : dto;
}

/**
 * Scheda completa di una Persona (404 se non esiste): riassunto, skill apprese per livello, dettaglio del tratto, ricetta
 * speciale e ricette di cui è ingrediente, set DLC, carte skill ottenibili con l'esecuzione, titolo di negoziazione (cercato
 * fra le skill la cui negoziazione termina con «(nome)», tolta la parentesi), aree di Mementos e oggetti con descrizione tradotta.
 */
export function dettaglioPersona(id: number): PersonaDettaglioDto {
  const r = prepared('SELECT * FROM persona WHERE id = ?').get(id) as RigaPersona | undefined;
  if (!r) throw httpErrors.notFound('persona-non-trovata', `La Persona ${id} non esiste.`);
  const base = personaRiassunto(r);
  const skill = (prepared('SELECT s.*, ps.livello AS livello_appreso, ps.modo FROM persona_skill ps JOIN skill s ON s.id = ps.skill_id WHERE ps.persona_id = ? ORDER BY ps.livello IS NULL, ps.livello, ps.modo, s.nome').all(id) as Array<RigaSkill & { livello_appreso: number | null; modo: ModoApprendimento }>)
    .map((s): SkillAppresaDto => ({ ...skillRiassunto(s), livello: s.livello_appreso, modo: s.modo }));
  const trattoRiga = prepared('SELECT * FROM skill WHERE nome = ?').get(r.tratto) as RigaSkill | undefined;
  const ricetta = prepared('SELECT risultato_id FROM fusione_speciale WHERE risultato_id = ?').get(id) ? ricettaDto(id) : null;
  const ingredienteDi = (prepared('SELECT DISTINCT risultato_id FROM fusione_speciale_ingrediente WHERE ingrediente_id = ?').all(id) as Array<{ risultato_id: number }>).map((x) => ricettaDto(x.risultato_id));
  const dlcSet = (prepared('SELECT set_id FROM dlc_set_persona WHERE persona_id = ?').get(id) as { set_id: number } | undefined)?.set_id ?? null;
  const carte = prepared('SELECT s.id, s.nome FROM skill_fonte_esecuzione f JOIN skill s ON s.id = f.skill_id WHERE f.persona_id = ? ORDER BY s.nome').all(id) as Array<{ id: number; nome: string }>;
  const negoz = prepared('SELECT negoziazione FROM skill WHERE negoziazione LIKE ? LIMIT 1').get(`%(${r.nome})`) as { negoziazione: string } | undefined;
  const titolo = negoz?.negoziazione.replace(/\s*\([^)]*\)\s*$/, '') ?? null;
  const aree = (JSON.parse(r.aree_mementos_json) as string[]).map((a) => ({ chiave: a, nome: t('areaMementos', a) }));
  // Il nome del dataset individua il suo ID; dopo M7 identità e descrizione vengono dal catalogo anche dopo una fusione.
  // Le forme del gruppo non si eseguono: niente oggetti (colonne NULL), niente ricerca.
  const originali = r.oggetto === null || r.oggetto_allarme === null ? [] : prepared('SELECT id,nome,descrizione FROM oggetto WHERE nome IN (?,?)').all(r.oggetto, r.oggetto_allarme) as Array<Pick<RigaOggetto, 'id' | 'nome' | 'descrizione'>>;
  const perNome = new Map(originali.map((o) => [o.nome, o]));
  const catalogoEsecuzione = oggettiPerFonte('equipaggiamento', originali.map((o) => String(o.id)));
  const identitaEsecuzione = (nome: string | null) => { const o = nome === null ? undefined : perNome.get(nome); return o ? catalogoEsecuzione.get(String(o.id)) : undefined; };
  const normale = identitaEsecuzione(r.oggetto); const allarme = identitaEsecuzione(r.oggetto_allarme);
  // Ondata 5, lotto F (decisione 21): che cosa fa l'oggetto si legge solo dal catalogo (la copia in `traduzione` è tolta dalla 271),
  // con le statistiche che la 275 ha separato dall'effetto
  const descrizioneOggetto = (nome: string | null): string | null => {
    if (nome === null) return null;
    const o = identitaEsecuzione(nome);
    return o ? testoOggettoCompendio(o) || null : null;
  };
  const riferimento = (pid: number | null) => {
    if (pid === null) return null;
    const x = prepared('SELECT id, nome FROM persona WHERE id = ?').get(pid) as { id: number; nome: string } | undefined;
    return x ? { id: x.id, nome: x.nome, nomeIt: t('persona', x.nome) } : null;
  };
  return {
    ...base,
    affinitaGuida: affinitaGuidaDi(id),
    nota: r.nota, notaNome: tOpz('notaPersona', r.nota),
    oggetto: r.oggetto, oggettoAllarme: r.oggetto_allarme, oggettoECarta: r.oggetto_e_carta === 1,
    oggettoDescrizione: descrizioneOggetto(r.oggetto), oggettoAllarmeDescrizione: descrizioneOggetto(r.oggetto_allarme),
    oggettoNomeIt: normale?.nome ?? (r.oggetto === null ? null : tOpz('oggetto', r.oggetto)), oggettoAllarmeNomeIt: allarme?.nome ?? (r.oggetto_allarme === null ? null : tOpz('oggetto', r.oggetto_allarme)),
    formaDi: riferimento(r.forma_di), derivaDa: riferimento(r.deriva_da),
    formaCondizioni: r.forma_condizioni_json === null ? null : (JSON.parse(r.forma_condizioni_json) as unknown),
    oggettoCatalogo: normale ? { chiave: normale.chiave, nome: normale.nome, casa: normale.casa } : null,
    oggettoAllarmeCatalogo: allarme ? { chiave: allarme.chiave, nome: allarme.nome, casa: allarme.casa } : null,
    trattoDettaglio: trattoRiga ? skillRiassunto(trattoRiga) : null,
    skill, areeMementos: aree, pianiMementos: r.piani_mementos,
    ricettaSpeciale: ricetta, ingredienteDi, dlcSet, carteDaEsecuzione: carte,
    negoziazione: titolo ? { titolo, titoloNome: t('negoziazione', titolo) } : null,
    descrizione: r.descrizione, fonteDescrizione: r.fonte_descrizione,
  };
}

// ---- Skill ----

export interface FiltroSkill {
  q?: string;
  elemento?: string;
}

/** Elenco delle skill per nome, filtrato per elemento in SQL e poi per testo (`q`) su nome, nome italiano ed effetto. */
export function elencaSkill(f: FiltroSkill = {}): SkillRiassuntoDto[] {
  const cond: string[] = [];
  const par: unknown[] = [];
  if (f.elemento) {
    cond.push('elemento = ?');
    par.push(f.elemento);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const dto = (getDb().prepare(`SELECT * FROM skill ${where} ORDER BY nome`).all(...par) as RigaSkill[]).map(skillRiassunto);
  const q = f.q;
  return q ? dto.filter((s) => corrispondeRicerca(q, s.nome, s.nomeIt, s.effetto, s.effettoNome)) : dto;
}

/**
 * Scheda di una skill (404 se non esiste): Persona che la imparano (con livello), Persona da cui si ottiene la carta con
 * l'esecuzione, fonte della carta, esclusività. La negoziazione è salvata come «Titolo (Persona)»: si traduce il titolo
 * e si riattacca la parentesi.
 */
export function dettaglioSkill(id: number): SkillDettaglioDto {
  const r = prepared('SELECT * FROM skill WHERE id = ?').get(id) as RigaSkill | undefined;
  if (!r) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
  const persone = (prepared('SELECT p.id, p.nome, p.arcana, p.livello AS livello_persona, ps.livello FROM persona_skill ps JOIN persona p ON p.id = ps.persona_id WHERE ps.skill_id = ? ORDER BY p.livello, p.nome').all(id) as Array<{ id: number; nome: string; arcana: string; livello_persona: number; livello: number | null }>)
    .map((p) => ({ id: p.id, nome: p.nome, arcana: p.arcana, arcanaNome: t('arcana', p.arcana), livelloPersona: p.livello_persona, livello: p.livello }));
  const fonti = prepared('SELECT p.id, p.nome FROM skill_fonte_esecuzione f JOIN persona p ON p.id = f.persona_id WHERE f.skill_id = ? ORDER BY p.nome').all(id) as Array<{ id: number; nome: string }>;
  const titoloNegoz = r.negoziazione ? r.negoziazione.replace(/\s*\([^)]*\)\s*$/, '') : null;
  const personaNegoz = r.negoziazione ? r.negoziazione.match(/\(([^)]*)\)\s*$/)?.[1] ?? null : null;
  const unicaNome = r.unica ? (tOpz('fonteEsclusiva', r.unica) ?? r.unica) : null;
  return {
    ...skillRiassunto(r),
    fonteCarta: r.fonte_carta, fonteCartaNome: tOpz('fonteCarta', r.fonte_carta),
    negoziazione: r.negoziazione, negoziazioneNome: titoloNegoz ? `${t('negoziazione', titoloNegoz)}${personaNegoz ? ` (${personaNegoz})` : ''}` : null,
    unica: r.unica, unicaNome,
    persone, fontiEsecuzione: fonti,
  };
}

// ---- Oggetti, Confidenti ----

/**
 * Gli oggetti del compendio con le rese italiane di nome, categoria, vincolo e descrizione, ordinati per categoria e nome.
 * Filtri facoltativi: la categoria (in SQL) e un testo cercato su nome e nome italiano (dopo la traduzione).
 */
export function elencaOggetti(f: { q?: string; categoria?: string } = {}): OggettoDto[] {
  const cond: string[] = [];
  const par: unknown[] = [];
  if (f.categoria) {
    cond.push('categoria = ?');
    par.push(f.categoria);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const righe = getDb().prepare(`SELECT * FROM oggetto ${where} ORDER BY categoria, nome`).all(...par) as RigaOggetto[];
  const catalogo = oggettiPerFonte('equipaggiamento', righe.map((o) => String(o.id)));
  const dto: OggettoDto[] = righe.map((o) => {
    const c = catalogo.get(String(o.id));
    return { id: o.id, nome: o.nome, nomeIt: c?.nome ?? tOpz('oggetto', o.nome), categoria: o.categoria, categoriaNome: t('tipoOggetto', o.categoria),
      vincolo: o.vincolo, vincoloNome: c ? typeof c.statistiche?.per === 'string' ? c.statistiche.per : null : tOpz('vincoloOggetto', o.vincolo),
      // Ondata 5, lotto F (decisione 21): la resa italiana è solo l'oggetto del catalogo (statistiche ed effetto); la copia in `traduzione`
      // (ambito descrizioneOggetto) è tolta dalla migrazione 271. Senza oggetto del catalogo non c'è una resa: vuoto, mai l'inglese.
      descrizione: o.descrizione, descrizioneNome: c ? testoOggettoCompendio(c) : '',
      catalogo: c ? { chiave: c.chiave, nome: c.nome, casa: c.casa } : null, nomiAltri: c?.nomiAltri ?? [] };
  });
  const q = f.q;
  return q ? dto.filter((o) => corrispondeRicerca(q, o.nome, o.nomeIt, ...(o.nomiAltri ?? []))) : dto;
}

/** Cambia la Dote a ogni incontro dei ranghi indicati (gli altri restano): voci «dote» al posto di quelle che il rango aveva. */
export function impostaDotiIncontro(chiave: string, ranghi: Array<{ rango: number; doti: DoteNote[] }>): ConfidenteDettaglioDto {
  if (!prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  getDb().transaction(() => {
    for (const r of ranghi) {
      fotografaDoteIncontro(chiave, r.rango); // R9-07/3: com'era nella guida, per «Ripristina» (una volta sola)
      const voci = JSON.stringify(r.doti.map((d) => ({ effetto: { famiglia: 'dote', dote: d.dote, note: d.note } })));
      prepared('INSERT INTO confidente_dote_incontro (confidente_chiave, verso_rango, effetti_json) VALUES (?, ?, ?) ON CONFLICT(confidente_chiave, verso_rango) DO UPDATE SET effetti_json = excluded.effetti_json')
        .run(chiave, r.rango, voci);
    }
  })();
  return dettaglioConfidente(chiave);
}

/** Il regalo è corretto? Stessa regola del registro dei ripristini (R9-07/5): la fotografia `seed_json` ha almeno un valore diverso da quello della riga. */
function regaloModificato(r: { catalogo_chiave: string | null; dove: string | null; costo: string | null; sconsigliato: number; nota: string | null; seed_json: string | null; reazione: number | null }): boolean {
  if (!r.seed_json) return false;
  let f: Record<string, unknown>;
  try { f = JSON.parse(r.seed_json) as Record<string, unknown>; } catch { return false; }
  if (typeof f.tipo === 'string') return false; // fotografia di prima della 212: non è la forma del registro
  const attuali: Record<string, unknown> = { catalogo_chiave: r.catalogo_chiave, dove: r.dove, costo: r.costo, sconsigliato: r.sconsigliato === 1, nota: r.nota, reazione: r.reazione === null ? null : String(r.reazione) };
  return Object.keys(attuali).some((p) => p in f && !uguali(f[p] ?? null, attuali[p] ?? null));
}

/** Scheda completa di un Confidente: abilità, dialoghi, regali, disponibilità (dal seed allgamestaff). */
export function dettaglioConfidente(chiave: string): ConfidenteDettaglioDto {
  const c = prepared('SELECT chiave, nome, arcana, ordine FROM confidente WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; arcana: string; ordine: number } | undefined;
  if (!c) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const abilita = (prepared('SELECT rango, nome, descrizione FROM confidente_abilita WHERE confidente_chiave = ? ORDER BY rango, ordine').all(chiave) as Array<{ rango: number; nome: string; descrizione: string }>);
  const dialoghi = (prepared('SELECT id, rango, etichetta, note, scelte_json FROM confidente_dialogo WHERE confidente_chiave = ? ORDER BY ordine').all(chiave) as Array<{ id: number; rango: number | null; etichetta: string; note: string; scelte_json: string }>)
    .map((d) => ({ id: d.id, rango: d.rango, etichetta: d.etichetta, note: d.note, scelte: (JSON.parse(d.scelte_json) as Array<Record<string, unknown>>).map((s) => ({ ordine: (s.ordine as number | null) ?? null, testo: String(s.testo ?? ''), punti: (s.punti as number | null) ?? null, puntiTesto: (s.puntiTesto as string | null) ?? null, romantica: s.romantica === true, avviso: (s.avviso as string | null) ?? null })) }));
  const conCatalogo = catalogoOggettiDisponibile();
  // ondata 5 (migrazioni 255-256): la reazione è una colonna; su un file di gioco più vecchio «sconsigliato» vale +1 e il resto +3
  const conReazione = (prepared('PRAGMA main.table_info(confidente_regalo)').all() as Array<{ name: string }>).some((x) => x.name === 'reazione');
  const righeRegali = (prepared(`SELECT ordine,nome,dove,costo,sconsigliato,${conReazione ? 'reazione' : 'NULL AS reazione'},${conCatalogo ? 'catalogo_chiave,nota,seed_json' : 'NULL AS catalogo_chiave,NULL AS nota,NULL AS seed_json'} FROM confidente_regalo WHERE confidente_chiave = ? ORDER BY ordine`).all(chiave) as Array<{ ordine: number; nome: string; dove: string | null; costo: string | null; sconsigliato: number; reazione: number | null; catalogo_chiave: string | null; nota: string | null; seed_json: string | null }>)
    .map((g) => ({ ...g, reazione: (g.reazione === 1 || g.reazione === 2 || g.reazione === 3 ? g.reazione : conReazione ? null : g.sconsigliato === 1 ? 1 : 3) as ReazioneRegalo | null }));
  const chiaviRegali = righeRegali.flatMap((g) => g.catalogo_chiave ? [g.catalogo_chiave] : []);
  const oggettiRegali = oggettiConChiavi(chiaviRegali); const offerteRegali = offerteBaseDegliOggetti(chiaviRegali);
  const regali = righeRegali.map((g) => {
    const precedente = costoPrecedenteRegalo(g.seed_json, chiave, g.ordine, g.nome);
    const oggetto = g.catalogo_chiave ? oggettiRegali.get(g.catalogo_chiave) : undefined;
    const catalogo = oggetto ? { chiave: oggetto.chiave, nome: oggetto.nome, casa: oggetto.casa } : null;
    const offerte = g.catalogo_chiave ? offerteRegali.get(g.catalogo_chiave) ?? [] : [];
    const prezzi = offerte.flatMap((o) => o.costo === null && !o.costoDaVerificare && o.prezzo !== null ? [o.prezzo] : []);
    const prezzo = prezzi.length ? Math.min(...prezzi) : null; const prezzoMassimo = prezzi.length ? Math.max(...prezzi) : null;
    const scambi = [...new Set(offerte.flatMap((o) => o.costoDaVerificare ? ['Scambio da correggere nel negozio'] : o.costo?.tipo === 'fiori' ? [`Scambio: ${o.costo.importo} fiori`]
      // Ondata 5 (lotto E): monete del Casinò e punti negozio, con il loro importo
      : o.costo?.tipo === 'monete' || o.costo?.tipo === 'punti' ? [testoCostoAImporto(o.costo)]
      : o.costo?.tipo === 'oggetti' ? [`Scambio: ${o.costo.oggetti.map((v) => `${v.quantita} × ${v.nome ?? 'oggetto da collegare'}`).join(', ')}`] : []))];
    const costoYen = prezzo === null ? null : prezzo === prezzoMassimo ? `${prezzo.toLocaleString('it-IT')} ¥` : `Da ${prezzo.toLocaleString('it-IT')} a ${prezzoMassimo!.toLocaleString('it-IT')} ¥`;
    // ondata 5 (decisione 12, RG-13): con il listino il luogo e il prezzo sono solo quelli delle offerte; il testo della guida (e il ripristino del
    // suo costo) vale soltanto per un regalo senza offerte, dove è l'unico punto
    const conListino = offerte.length > 0;
    return { ...g, modificato: regaloModificato(g), ...(!conListino && precedente !== null && precedente !== g.costo ? { ripristinoCosto: { ordine: g.ordine, precedente, attuale: g.costo } } : {}), nomeStorico: g.nome, nome: catalogo?.nome ?? g.nome, catalogo, prezzo, prezzoMassimo, listinoCollegato: conListino,
      // la sede si dice solo se è un posto diverso dal negozio («High Sense (High Sense)» non informa)
      dove: conListino ? [...new Set(offerte.map((o) => `${o.negozioNome}${o.sedeNome && o.sedeNome !== o.negozioNome ? ` (${o.sedeNome})` : ''}`))].join(' · ') : g.dove,
      costo: conListino ? [costoYen, ...scambi].filter(Boolean).join(' · ') || 'Costo non indicato nel listino' : g.costo,
      nota: g.nota };
  });
  const regalabile = (prepared('PRAGMA main.table_info(confidente)').all() as Array<{ name: string }>).some((x) => x.name === 'regalabile')
    ? !!prepared('SELECT 1 FROM confidente WHERE chiave = ? AND regalabile = 1').get(chiave) : righeRegali.length > 0;
  const disp = prepared('SELECT * FROM confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { giorni_json: string; fasce_json: string; luogo: string; sblocco_data: string; sblocco_requisiti: string; note: string; note_generali: string; fonti_json: string } | undefined;
  return {
    ...c, arcanaNome: t('arcana', c.arcana), abilita, dialoghi, dotiIncontro: dotiIncontro(chiave),
    // ondata 5: dalla reazione più alta (a parità, l'ordine della guida); niente più «sconsigliati»: ogni regalo vale almeno +1
    regali: regali.map(({ ordine, modificato, nome, nomeStorico, dove, costo, reazione, catalogo, prezzo, prezzoMassimo, listinoCollegato, nota, ripristinoCosto }) => ({ ordine, modificato, nome, nomeStorico, dove, costo, reazione, catalogo, prezzo, prezzoMassimo, listinoCollegato, nota, ripristinoCosto }))
      .sort((a, b) => (b.reazione ?? 0) - (a.reazione ?? 0) || a.ordine - b.ordine),
    regalabile,
    oggettiRicompensa: ricompensePerFonte('confidente', [chiave]).get(chiave) ?? [],
    disponibilita: disp ? { giorni: JSON.parse(disp.giorni_json) as string[], fasce: JSON.parse(disp.fasce_json) as string[], luogo: disp.luogo, sbloccoData: disp.sblocco_data, sbloccoRequisiti: disp.sblocco_requisiti, note: disp.note } : { giorni: [], fasce: [], luogo: '', sbloccoData: '', sbloccoRequisiti: '', note: '' },
    noteGenerali: disp?.note_generali ?? '', fonti: disp ? (JSON.parse(disp.fonti_json) as string[]) : [],
    // L6: gli inviti del Confidente, con ciò che aprono (lo stato della partita lo dà `GET /api/compendio/inviti`)
    inviti: invitiDelConfidente(chiave),
    // R9-01: la disponibilità strutturata (modo, giorni, fasce, eccezioni, luoghi per chiave); il testo sopra resta nelle note
    ...(disp ? { disponibilitaStrutturata: disponibilitaConfidente(chiave) } : {}),
  };
}

/** Elenco dei Confidenti nell'ordine di gioco, con il nome italiano dell'arcano. */
export function elencaConfidenti(): ConfidenteDto[] {
  return (prepared('SELECT chiave, nome, arcana, ordine FROM confidente ORDER BY ordine').all() as Array<{ chiave: string; nome: string; arcana: string; ordine: number }>)
    .map((c) => ({ ...c, arcanaNome: t('arcana', c.arcana) }));
}
