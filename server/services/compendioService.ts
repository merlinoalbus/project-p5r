// ============================================================
// compendioService — letture del compendio Royal con resa italiana
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { extra, mappaAmbito, t, tOpz, vociAmbito } from './traduzioniService.js';
import { corrispondeRicerca } from '../../shared/testo.js';
import type {
  AffinitaDto, ArcanaDto, ConfidenteDettaglioDto, ConfidenteDto, CostoSkillDto, GlossarioDto, OggettoDto, PersonaDettaglioDto,
  PersonaRiassuntoDto, RegoleFusioneDto, RicettaSpecialeDto, SkillAppresaDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto,
} from '../../shared/types.js';

// ---- Righe DB ----

interface RigaPersona {
  id: number; nome: string; arcana: string; livello: number; eredita: string | null; speciale: number; rara: number; dlc: number;
  richiede_confidente_max: number; nota: string | null; oggetto: string; oggetto_allarme: string; oggetto_e_carta: number; tratto: string;
  forza: number; magia: number; resistenza: number; agilita: number; fortuna: number; aree_mementos_json: string; piani_mementos: string | null;
}

interface RigaSkill {
  id: number; nome: string; elemento: string; costo_tipo: 'sp' | 'hp' | 'nessuno'; costo_valore: number; effetto: string;
  fonte_carta: string | null; negoziazione: string | null; unica: string | null;
}

interface RigaOggetto { id: number; nome: string; categoria: string; vincolo: string | null; descrizione: string }

// ---- Mappature ----

/** Costo in forma leggibile. */
/** Riassunto di una skill per id (null se non esiste); usato da partite, obiettivi e storico. */
export function skillDto(id: number): SkillRiassuntoDto | null {
  const s = prepared('SELECT * FROM skill WHERE id = ?').get(id) as { id: number; nome: string; elemento: string; costo_tipo: 'sp' | 'hp' | 'nessuno'; costo_valore: number; effetto: string } | undefined;
  if (!s) return null;
  return { id: s.id, nome: s.nome, nomeIt: t('skill', s.nome), elemento: s.elemento, elementoNome: t('elementoSkill', s.elemento), costo: costoDto(s.costo_tipo, s.costo_valore), effetto: s.effetto, effettoNome: t('effettoSkill', s.effetto) };
}

export function costoDto(tipo: 'sp' | 'hp' | 'nessuno', valore: number): CostoSkillDto {
  const testo = tipo === 'sp' ? `${valore} SP` : tipo === 'hp' ? `${valore}% HP` : '—';
  return { tipo, valore, testo };
}

function skillRiassunto(r: RigaSkill): SkillRiassuntoDto {
  return {
    id: r.id, nome: r.nome, nomeIt: t('skill', r.nome), elemento: r.elemento, elementoNome: t('elementoSkill', r.elemento),
    costo: costoDto(r.costo_tipo, r.costo_valore), effetto: r.effetto, effettoNome: t('effettoSkill', r.effetto),
  };
}

function affinitaDi(personaId: number): AffinitaDto[] {
  const ordine = vociAmbito('elementoAffinita');
  const righe = prepared('SELECT elemento, codice FROM persona_affinita WHERE persona_id = ?').all(personaId) as Array<{ elemento: string; codice: string }>;
  const perElemento = new Map(righe.map((r) => [r.elemento, r.codice]));
  return ordine.map((e) => {
    const codice = perElemento.get(e.chiave) ?? '-';
    return {
      elemento: e.chiave, elementoNome: e.testo, elementoSigla: String(e.extra?.sigla ?? ''),
      codice, codiceNome: t('affinita', codice), codiceSigla: String(extra<{ sigla: string }>('affinita', codice)?.sigla ?? ''),
    };
  });
}

function personaRiassunto(r: RigaPersona): PersonaRiassuntoDto {
  return {
    id: r.id, nome: r.nome, nomeIt: t('persona', r.nome), arcana: r.arcana, arcanaNome: t('arcana', r.arcana), livello: r.livello,
    eredita: r.eredita, ereditaNome: tOpz('tipoEredita', r.eredita),
    speciale: r.speciale === 1, rara: r.rara === 1, dlc: r.dlc === 1, richiedeConfidenteMax: r.richiede_confidente_max === 1,
    tratto: r.tratto,
    statistiche: { forza: r.forza, magia: r.magia, resistenza: r.resistenza, agilita: r.agilita, fortuna: r.fortuna },
    affinita: affinitaDi(r.id),
  };
}

function ricettaDto(risultatoId: number): RicettaSpecialeDto {
  const ris = prepared('SELECT id, nome FROM persona WHERE id = ?').get(risultatoId) as { id: number; nome: string };
  const ingredienti = prepared('SELECT p.id, p.nome FROM fusione_speciale_ingrediente i JOIN persona p ON p.id = i.ingrediente_id WHERE i.risultato_id = ? ORDER BY i.ordine').all(risultatoId) as Array<{ id: number; nome: string }>;
  return { risultato: { ...ris, nomeIt: t('persona', ris.nome) }, ingredienti: ingredienti.map((i) => ({ ...i, nomeIt: t('persona', i.nome) })) };
}

// ---- Arcani, glossario, regole ----

export function elencaArcani(): ArcanaDto[] {
  return (prepared('SELECT chiave, ordine, numero FROM arcana ORDER BY ordine').all() as Array<{ chiave: string; ordine: number; numero: number | null }>)
    .map((a) => ({ ...a, nome: t('arcana', a.chiave) }));
}

export function glossario(): GlossarioDto {
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
    dotiSociali: (prepared('SELECT chiave FROM dote_sociale ORDER BY ordine').all() as Array<{ chiave: string }>).map((d) => ({ chiave: d.chiave, nome: t('doteSociale', d.chiave) })),
  };
}

/** Termini di gioco della localizzazione italiana (ambito `termine`), ordinati per categoria e nome. */
export function terminiGlossario(): TermineDto[] {
  return vociAmbito('termine')
    .map((v) => ({ chiave: v.chiave, nome: v.testo, categoria: String(v.extra?.categoria ?? 'altro'), definizione: (v.extra?.definizione as string | null | undefined) ?? null, fonte: (v.extra?.fonte as string | null | undefined) ?? null }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome, 'it'));
}

export function regoleFusione(): RegoleFusioneDto {
  const arcani = (prepared('SELECT chiave FROM arcana ORDER BY ordine').all() as Array<{ chiave: string }>).map((a) => a.chiave);
  const tabella = prepared('SELECT a, b, risultato FROM fusione_arcana').all() as Array<{ a: string; b: string; risultato: string }>;
  const speciali = (prepared('SELECT risultato_id FROM fusione_speciale').all() as Array<{ risultato_id: number }>).map((r) => ricettaDto(r.risultato_id));
  const tesori = prepared('SELECT t.persona_id, p.nome FROM tesoro t JOIN persona p ON p.id = t.persona_id ORDER BY t.ordine').all() as Array<{ persona_id: number; nome: string }>;
  const modificatori: Record<string, number[]> = {};
  for (const a of arcani) {
    modificatori[a] = tesori.map((te) => (prepared('SELECT modificatore FROM tesoro_modificatore WHERE arcana = ? AND tesoro_id = ?').get(a, te.persona_id) as { modificatore: number } | undefined)?.modificatore ?? 0);
  }
  const righeMatrice = prepared('SELECT tipo, elemento, ammesso FROM eredita_matrice').all() as Array<{ tipo: string; elemento: string; ammesso: number }>;
  const colonne = vociAmbito('colonnaEredita').map((c) => c.chiave);
  const tipi = [...new Set(righeMatrice.map((r) => r.tipo))];
  const matrice: Record<string, boolean[]> = {};
  for (const tipo of tipi) matrice[tipo] = colonne.map((el) => righeMatrice.find((r) => r.tipo === tipo && r.elemento === el)?.ammesso === 1);
  const set = prepared('SELECT id FROM dlc_set ORDER BY ordine').all() as Array<{ id: number }>;
  const dlc = set.map((s) => (prepared('SELECT p.nome FROM dlc_set_persona d JOIN persona p ON p.id = d.persona_id WHERE d.set_id = ? ORDER BY p.nome').all(s.id) as Array<{ nome: string }>).map((p) => p.nome));
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
}

export function elencaPersona(f: FiltroPersona = {}): PersonaRiassuntoDto[] {
  const cond: string[] = [];
  const par: unknown[] = [];
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
  const dto = righe.map(personaRiassunto);
  const q = f.q;
  return q ? dto.filter((p) => corrispondeRicerca(q, p.nome, p.nomeIt)) : dto;
}

export function dettaglioPersona(id: number): PersonaDettaglioDto {
  const r = prepared('SELECT * FROM persona WHERE id = ?').get(id) as RigaPersona | undefined;
  if (!r) throw httpErrors.notFound('persona-non-trovata', `La Persona ${id} non esiste.`);
  const base = personaRiassunto(r);
  const skill = (prepared('SELECT s.*, ps.livello AS livello_appreso FROM persona_skill ps JOIN skill s ON s.id = ps.skill_id WHERE ps.persona_id = ? ORDER BY ps.livello, s.nome').all(id) as Array<RigaSkill & { livello_appreso: number }>)
    .map((s): SkillAppresaDto => ({ ...skillRiassunto(s), livello: s.livello_appreso }));
  const trattoRiga = prepared('SELECT * FROM skill WHERE nome = ?').get(r.tratto) as RigaSkill | undefined;
  const ricetta = prepared('SELECT risultato_id FROM fusione_speciale WHERE risultato_id = ?').get(id) ? ricettaDto(id) : null;
  const ingredienteDi = (prepared('SELECT DISTINCT risultato_id FROM fusione_speciale_ingrediente WHERE ingrediente_id = ?').all(id) as Array<{ risultato_id: number }>).map((x) => ricettaDto(x.risultato_id));
  const dlcSet = (prepared('SELECT set_id FROM dlc_set_persona WHERE persona_id = ?').get(id) as { set_id: number } | undefined)?.set_id ?? null;
  const carte = prepared('SELECT s.id, s.nome FROM skill_fonte_esecuzione f JOIN skill s ON s.id = f.skill_id WHERE f.persona_id = ? ORDER BY s.nome').all(id) as Array<{ id: number; nome: string }>;
  const negoz = prepared('SELECT negoziazione FROM skill WHERE negoziazione LIKE ? LIMIT 1').get(`%(${r.nome})`) as { negoziazione: string } | undefined;
  const titolo = negoz?.negoziazione.replace(/\s*\([^)]*\)\s*$/, '') ?? null;
  const aree = (JSON.parse(r.aree_mementos_json) as string[]).map((a) => ({ chiave: a, nome: t('areaMementos', a) }));
  const descrizioneOggetto = (nome: string): string | null => {
    const o = prepared('SELECT descrizione FROM oggetto WHERE nome = ?').get(nome) as { descrizione: string } | undefined;
    return o ? t('descrizioneOggetto', o.descrizione) : null;
  };
  return {
    ...base,
    nota: r.nota, notaNome: tOpz('notaPersona', r.nota),
    oggetto: r.oggetto, oggettoAllarme: r.oggetto_allarme, oggettoECarta: r.oggetto_e_carta === 1,
    oggettoDescrizione: descrizioneOggetto(r.oggetto), oggettoAllarmeDescrizione: descrizioneOggetto(r.oggetto_allarme),
    oggettoNomeIt: tOpz('oggetto', r.oggetto), oggettoAllarmeNomeIt: tOpz('oggetto', r.oggetto_allarme),
    trattoDettaglio: trattoRiga ? skillRiassunto(trattoRiga) : null,
    skill, areeMementos: aree, pianiMementos: r.piani_mementos,
    ricettaSpeciale: ricetta, ingredienteDi, dlcSet, carteDaEsecuzione: carte,
    negoziazione: titolo ? { titolo, titoloNome: t('negoziazione', titolo) } : null,
  };
}

// ---- Skill ----

export interface FiltroSkill {
  q?: string;
  elemento?: string;
}

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

export function dettaglioSkill(id: number): SkillDettaglioDto {
  const r = prepared('SELECT * FROM skill WHERE id = ?').get(id) as RigaSkill | undefined;
  if (!r) throw httpErrors.notFound('skill-non-trovata', `La skill ${id} non esiste.`);
  const persone = (prepared('SELECT p.id, p.nome, p.arcana, p.livello AS livello_persona, ps.livello FROM persona_skill ps JOIN persona p ON p.id = ps.persona_id WHERE ps.skill_id = ? ORDER BY p.livello, p.nome').all(id) as Array<{ id: number; nome: string; arcana: string; livello_persona: number; livello: number }>)
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

export function elencaOggetti(f: { q?: string; categoria?: string } = {}): OggettoDto[] {
  const cond: string[] = [];
  const par: unknown[] = [];
  if (f.categoria) {
    cond.push('categoria = ?');
    par.push(f.categoria);
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const dto: OggettoDto[] = (getDb().prepare(`SELECT * FROM oggetto ${where} ORDER BY categoria, nome`).all(...par) as RigaOggetto[]).map((o) => ({
    id: o.id, nome: o.nome, nomeIt: tOpz('oggetto', o.nome), categoria: o.categoria, categoriaNome: t('tipoOggetto', o.categoria),
    vincolo: o.vincolo, vincoloNome: tOpz('vincoloOggetto', o.vincolo), descrizione: o.descrizione, descrizioneNome: t('descrizioneOggetto', o.descrizione),
  }));
  const q = f.q;
  return q ? dto.filter((o) => corrispondeRicerca(q, o.nome, o.nomeIt)) : dto;
}

/** Scheda completa di un Confidente: abilità, dialoghi, regali, disponibilità (dal seed allgamestaff). */
export function dettaglioConfidente(chiave: string): ConfidenteDettaglioDto {
  const c = prepared('SELECT chiave, nome, arcana, ordine FROM confidente WHERE chiave = ?').get(chiave) as { chiave: string; nome: string; arcana: string; ordine: number } | undefined;
  if (!c) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
  const abilita = (prepared('SELECT rango, nome, descrizione FROM confidente_abilita WHERE confidente_chiave = ? ORDER BY rango, ordine').all(chiave) as Array<{ rango: number; nome: string; descrizione: string }>);
  const dialoghi = (prepared('SELECT id, rango, etichetta, note, scelte_json FROM confidente_dialogo WHERE confidente_chiave = ? ORDER BY ordine').all(chiave) as Array<{ id: number; rango: number | null; etichetta: string; note: string; scelte_json: string }>)
    .map((d) => ({ id: d.id, rango: d.rango, etichetta: d.etichetta, note: d.note, scelte: (JSON.parse(d.scelte_json) as Array<Record<string, unknown>>).map((s) => ({ ordine: (s.ordine as number | null) ?? null, testo: String(s.testo ?? ''), punti: (s.punti as number | null) ?? null, puntiTesto: (s.puntiTesto as string | null) ?? null, romantica: s.romantica === true, avviso: (s.avviso as string | null) ?? null })) }));
  const regali = prepared('SELECT nome, dove, costo, effetto, sconsigliato FROM confidente_regalo WHERE confidente_chiave = ? ORDER BY ordine').all(chiave) as Array<{ nome: string; dove: string | null; costo: string | null; effetto: string | null; sconsigliato: number }>;
  const disp = prepared('SELECT * FROM confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { giorni_json: string; fasce_json: string; luogo: string; sblocco_data: string; sblocco_requisiti: string; note: string; note_generali: string; fonti_json: string } | undefined;
  return {
    ...c, arcanaNome: t('arcana', c.arcana), abilita, dialoghi,
    regali: regali.filter((g) => g.sconsigliato === 0).map(({ nome, dove, costo, effetto }) => ({ nome, dove, costo, effetto })),
    regaliSconsigliati: regali.filter((g) => g.sconsigliato === 1).map((g) => g.nome),
    disponibilita: disp ? { giorni: JSON.parse(disp.giorni_json) as string[], fasce: JSON.parse(disp.fasce_json) as string[], luogo: disp.luogo, sbloccoData: disp.sblocco_data, sbloccoRequisiti: disp.sblocco_requisiti, note: disp.note } : { giorni: [], fasce: [], luogo: '', sbloccoData: '', sbloccoRequisiti: '', note: '' },
    noteGenerali: disp?.note_generali ?? '', fonti: disp ? (JSON.parse(disp.fonti_json) as string[]) : [],
  };
}

export function elencaConfidenti(): ConfidenteDto[] {
  return (prepared('SELECT chiave, nome, arcana, ordine FROM confidente ORDER BY ordine').all() as Array<{ chiave: string; nome: string; arcana: string; ordine: number }>)
    .map((c) => ({ ...c, arcanaNome: t('arcana', c.arcana) }));
}
