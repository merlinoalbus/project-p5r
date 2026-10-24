// ============================================================
// righePersona — la Persona e le sue skill, correggibili e ripristinabili (L11 · R11-15/3)
// ============================================================
//
// Due oggetti «a riga» del registro dei ripristini (`righe.ts`); il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne `origine`,
// `seed_json`, `updated_at` della migrazione 213), che `ripristinoService` gestisce come per quartieri, trofei ed esami.
//   - `persona` (259 righe, chiave = id): il livello, l'Arcano, le cinque statistiche di base e le skill con i loro livelli. Le skill sono un elenco di testi
//     «<nome della skill> @ <livello>» (livello 0 = innata) oppure «<nome> @ risveglio|rango|terza-forma» (le skill che non si imparano a un livello): si riscrive
//     l'elenco intero in `persona_skill`. Le affinità si correggono dal loro editor (`affinitaPersonaService`) e non stanno qui; non si correggono l'identità
//     (nome, forme, personaggio) né gli altri dati.
//   - `skill` (525 righe, chiave = id): il costo (tipo e valore), l'effetto (il testo canonico della guida) e la sua resa italiana (`traduzione`, ambito
//     `effettoSkill`, che vale per tutte le skill con lo stesso testo di effetto). Il nome della skill è la chiave delle traduzioni e delle Persona: non si corregge.
//     La «potenza» non è un dato a sé nel modello: sta nel testo dell'effetto. Le Persona che la danno come carta con l'esecuzione (`skill_fonte_esecuzione`,
//     R11-17/1) sono il campo `fonti`: l'elenco dei nomi si riscrive intero; la fotografia di una correzione fatta prima di questo campo non lo contiene e
//     `ripristinoService` la completa con i valori di quel momento.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { ContestoPropagazione, DefRiga, Valori } from './righe.js';

const num = (v: ValoreCampoCorrezione | undefined): number => (typeof v === 'number' ? v : 0);
const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const MODI_SENZA_LIVELLO = ['risveglio', 'rango', 'terza-forma'] as const;
const STATISTICHE = [['forza', 'Forza'], ['magia', 'Magia'], ['resistenza', 'Resistenza'], ['agilita', 'Agilità'], ['fortuna', 'Fortuna']] as const;

interface RigaPersona { nome: string; arcana: string; livello: number; forza: number; magia: number; resistenza: number; agilita: number; fortuna: number }
const rigaPersona = (chiave: string): RigaPersona => prepared('SELECT nome, arcana, livello, forza, magia, resistenza, agilita, fortuna FROM persona WHERE id = ?').get(chiave) as RigaPersona;

/** Le skill di una Persona come testi «nome @ livello» (ordinate per livello, poi per nome). */
function skillDi(chiave: string): string[] {
  const righe = prepared('SELECT s.nome, ps.livello, ps.modo FROM persona_skill ps JOIN skill s ON s.id = ps.skill_id WHERE ps.persona_id = ?').all(chiave) as Array<{ nome: string; livello: number | null; modo: string }>;
  return righe
    .sort((a, b) => (a.livello ?? 999) - (b.livello ?? 999) || a.nome.localeCompare(b.nome))
    .map((r) => `${r.nome} @ ${r.livello === null ? r.modo : r.livello}`);
}

interface SkillScritta { nome: string; livello: number | null; modo: string }
/** «nome @ livello» → la riga di `persona_skill`: il livello è un intero 0-99 (0 = innata), oppure uno dei modi senza livello. */
function leggiSkill(testo: string): SkillScritta {
  const i = testo.lastIndexOf(' @ ');
  if (i < 1) throw httpErrors.badRequest('skill-non-valida', `La skill «${testo}» deve essere scritta «nome @ livello».`, { campo: 'skill' });
  const nome = testo.slice(0, i).trim();
  const dopo = testo.slice(i + 3).trim();
  if ((MODI_SENZA_LIVELLO as readonly string[]).includes(dopo)) return { nome, livello: null, modo: dopo };
  const livello = Number(dopo);
  if (!Number.isInteger(livello) || livello < 0 || livello > 99) throw httpErrors.badRequest('skill-non-valida', `Il livello di «${nome}» deve essere da 0 a 99, oppure risveglio, rango o terza-forma.`, { campo: 'skill' });
  return { nome, livello, modo: livello === 0 ? 'iniziale' : 'livello' };
}

const persona: DefRiga = {
  modalita: 'riga', etichetta: 'Persona', tabella: 'persona', colonnaChiave: 'CAST(id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(id AS TEXT) FROM persona ORDER BY id').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM persona WHERE id = ?').get(chiave),
  campi: () => [
    { p: 'livello', e: 'Livello', t: 'numero', max: 99 } as CampoDef,
    { p: 'arcana', e: 'Arcano', t: 'scelta', opzioni: (prepared('SELECT chiave FROM arcana ORDER BY chiave').pluck().all() as string[]).map((c) => ({ chiave: c, nome: c })) } as CampoDef,
    ...STATISTICHE.map(([p, e]): CampoDef => ({ p, e, t: 'numero', max: 99, gruppo: 'Statistiche di base' })),
    { p: 'skill', e: 'Skill (nome @ livello)', t: 'elenco' } as CampoDef,
  ],
  leggi: (chiave) => {
    const r = rigaPersona(chiave);
    return { livello: r.livello, arcana: r.arcana, forza: r.forza, magia: r.magia, resistenza: r.resistenza, agilita: r.agilita, fortuna: r.fortuna, skill: skillDi(chiave) };
  },
  scrivi: (chiave, v) => {
    if (v.livello !== undefined) prepared('UPDATE persona SET livello = ? WHERE id = ?').run(num(v.livello), chiave);
    if (v.arcana !== undefined) prepared('UPDATE persona SET arcana = ? WHERE id = ?').run(str(v.arcana), chiave);
    for (const [p] of STATISTICHE) if (v[p] !== undefined) prepared(`UPDATE persona SET ${p} = ? WHERE id = ?`).run(num(v[p]), chiave);
    if (v.skill !== undefined) {
      const elenco = Array.isArray(v.skill) ? v.skill.map(leggiSkill) : [];
      const idDi = prepared('SELECT id FROM skill WHERE nome = ?');
      const righe = elenco.map((s) => {
        const id = idDi.pluck().get(s.nome) as number | undefined;
        if (id === undefined) throw httpErrors.notFound('skill-non-trovata', `La skill «${s.nome}» non esiste.`);
        return { id, ...s };
      });
      if (new Set(righe.map((r) => r.id)).size !== righe.length) throw httpErrors.badRequest('skill-ripetuta', 'Una skill compare due volte nell\'elenco.', { campo: 'skill' });
      prepared('DELETE FROM persona_skill WHERE persona_id = ?').run(chiave);
      const inserisci = prepared('INSERT INTO persona_skill (persona_id, skill_id, livello, modo) VALUES (?, ?, ?, ?)');
      for (const r of righe) inserisci.run(chiave, r.id, r.livello, r.modo);
    }
  },
  nome: (chiave) => rigaPersona(chiave).nome,
  valida: (_chiave, fusi: Valori) => {
    for (const [p, e] of [['livello', 'Livello'], ...STATISTICHE] as const) {
      const v = fusi[p];
      if (typeof v === 'number' && (!Number.isInteger(v) || v < 1 || v > 99)) throw httpErrors.badRequest('valore-non-valido', `${e}: serve un numero intero da 1 a 99.`, { campo: p });
    }
    if (Array.isArray(fusi.skill)) fusi.skill.forEach(leggiSkill);
  },
};

interface RigaSkill { nome: string; costo_tipo: string; costo_valore: number; effetto: string }
const rigaSkill = (chiave: string): RigaSkill => prepared('SELECT nome, costo_tipo, costo_valore, effetto FROM skill WHERE id = ?').get(chiave) as RigaSkill;
const effettoIt = (effetto: string): string | null => (prepared("SELECT testo FROM traduzione WHERE ambito = 'effettoSkill' AND chiave = ?").pluck().get(effetto) as string | undefined) ?? null;

/** Le Persona che danno la skill come carta con l'esecuzione (`skill_fonte_esecuzione`), per nome del dataset (R11-17/1). */
const fontiDi = (chiave: string): string[] =>
  prepared('SELECT p.nome FROM skill_fonte_esecuzione f JOIN persona p ON p.id = f.persona_id WHERE f.skill_id = ? ORDER BY p.nome').pluck().all(chiave) as string[];

/** I nomi delle Persona → id: 404 se una non esiste, 400 se ne compare una due volte. */
function idDeiNomiPersona(nomi: ValoreCampoCorrezione | undefined): number[] {
  const ids = (Array.isArray(nomi) ? nomi : []).map((nome) => {
    const id = prepared('SELECT id FROM persona WHERE nome = ?').pluck().get(nome) as number | undefined;
    if (id === undefined) throw httpErrors.notFound('persona-non-trovata', `La Persona «${nome}» non esiste.`);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw httpErrors.badRequest('persona-ripetuta', 'Una Persona compare due volte nell\'elenco.', { campo: 'fonti' });
  return ids;
}

// ---- La resa italiana dell'effetto: la riga di `traduzione` com'era prima della prima correzione ----
// Correggere l'effetto sposta la resa sul testo nuovo (riga provvisoria, `fonte = 'utente'`) e riscrivere la resa sul testo di prima la porta a `fonte = 'utente'`:
// per riportare `traduzione` IDENTICA (riga per riga, fonte e data comprese) si conserva nella traccia `~traduzioni` della fotografia la riga com'era (o l'assenza)
// di ogni testo di effetto toccato dalle correzioni; il ripristino completo della skill rimette quelle righe e toglie le provvisorie.
const CHIAVE_TRACCIA = '~traduzioni';
type RigaTraduzione = Record<string, string | number | null>;
const leggiRigaTraduzione = (effetto: string): RigaTraduzione | null =>
  (prepared("SELECT * FROM traduzione WHERE ambito = 'effettoSkill' AND chiave = ?").get(effetto) as RigaTraduzione | undefined) ?? null;
/** Le righe toccate dalla scrittura in corso (scrivi → propaga, stessa transazione e stesso filo): testo di effetto → riga com'era prima di toccarla. */
let primaDellaScrittura = new Map<string, RigaTraduzione | null>();
const ricordaRiga = (effetto: string): void => { if (!primaDellaScrittura.has(effetto)) primaDellaScrittura.set(effetto, leggiRigaTraduzione(effetto)); };

/** La fotografia (`seed_json`) di una skill, {} se manca o è illeggibile. */
function seedDi(chiave: string): Valori {
  const grezzo = prepared('SELECT seed_json FROM skill WHERE id = ?').pluck().get(chiave) as string | null | undefined;
  try { return grezzo ? (JSON.parse(grezzo) as Valori) : {}; } catch { return {}; }
}

function righeRicordate(traccia: Valori): Map<string, RigaTraduzione | null> {
  const m = new Map<string, RigaTraduzione | null>();
  const grezzo = traccia[CHIAVE_TRACCIA];
  for (const s of Array.isArray(grezzo) ? grezzo : []) {
    try {
      const o = JSON.parse(s) as { k: string; r: RigaTraduzione | null };
      if (typeof o.k === 'string') m.set(o.k, o.r ?? null);
    } catch { /* voce illeggibile: si ignora */ }
  }
  return m;
}

/** Rimette `traduzione` com'era: le righe ricordate tornano identiche, le provvisorie (assenti prima) si tolgono se nessun'altra skill usa quel testo. */
function rimettiRighe(ricordate: Map<string, RigaTraduzione | null>): void {
  for (const [effetto, riga] of ricordate) {
    if (riga) {
      const colonne = Object.keys(riga);
      prepared(`INSERT OR REPLACE INTO traduzione (${colonne.join(', ')}) VALUES (${colonne.map(() => '?').join(', ')})`).run(...colonne.map((c) => riga[c]!));
    } else if (!prepared('SELECT 1 FROM skill WHERE effetto = ?').get(effetto)) {
      prepared("DELETE FROM traduzione WHERE ambito = 'effettoSkill' AND chiave = ?").run(effetto);
    }
  }
}

/** Registra le righe di `traduzione` toccate dalla scrittura e, in ripristino, rimette la resa italiana com'era se la skill è tornata quella della guida. */
function scriviResaEPropaga(chiave: string, ctx: ContestoPropagazione): void {
  const toccate = primaDellaScrittura;
  primaDellaScrittura = new Map();
  const ricordate = righeRicordate(ctx.traccia);
  // la riga com'era si ricorda alla PRIMA volta che un testo viene toccato, anche da un ripristino: ogni riga di `traduzione` che una scrittura ha toccato
  // entra sempre nella traccia (mai una resa cambiata senza poterla rimettere); le scritture successive non sovrascrivono la riga già ricordata
  for (const [effetto, riga] of toccate) if (!ricordate.has(effetto)) ricordate.set(effetto, riga);
  if (ricordate.size > 0) ctx.traccia[CHIAVE_TRACCIA] = [...ricordate].map(([k, r]) => JSON.stringify({ k, r }));
  if (!ctx.ripristino) return;
  // ripristino: si rimette `traduzione` com'era, SEMPRE con tutte le righe ricordate (anche se il testo della guida non è mai stato toccato: la sua riga attuale è
  // proprio quella di partenza), SOLO se dopo il ripristino sia l'effetto sia la sua resa italiana sono quelli della guida; altrimenti (ripristino parziale: l'effetto
  // è ancora diverso, o è stato rimesso un altro campo e la resa corretta va conservata) non si tocca niente e la traccia resta
  const effetto = rigaSkill(chiave).effetto;
  const grezzo = prepared('SELECT seed_json FROM skill WHERE id = ?').pluck().get(chiave) as string | null | undefined;
  let guida: Valori;
  try { guida = grezzo ? (JSON.parse(grezzo) as Valori) : {}; } catch { guida = {}; }
  if (typeof guida.effetto === 'string' && guida.effetto !== effetto) return;
  if (guida.effetto_it !== undefined && (guida.effetto_it ?? null) !== effettoIt(effetto)) return;
  // la riga ricordata per il testo della guida vale solo se è la resa della guida: una riga ricordata diversa (la resa di un'altra skill, vista quando questa
  // l'ha toccata) non si rimette mai, perché porterebbe via la resa della guida appena riscritta
  const daRimettere = new Map(ricordate);
  if (guida.effetto_it !== undefined) {
    const r = daRimettere.get(effetto);
    if (r !== undefined && (r?.testo ?? null) !== (guida.effetto_it ?? null)) daRimettere.delete(effetto);
  }
  // si rimette, poi si controlla la resa FINALE: la traccia si svuota solo se coincide con la guida, altrimenti le righe tornano com'erano e la traccia resta
  const prima = new Map([...daRimettere.keys()].map((k) => [k, leggiRigaTraduzione(k)] as const));
  rimettiRighe(daRimettere);
  if (guida.effetto_it !== undefined && (guida.effetto_it ?? null) !== effettoIt(effetto)) {
    rimettiRighe(prima);
    for (const [k, r] of prima) if (r === null) prepared("DELETE FROM traduzione WHERE ambito = 'effettoSkill' AND chiave = ?").run(k);
    return;
  }
  ctx.traccia[CHIAVE_TRACCIA] = []; // non `delete`: la fotografia conserva la traccia vecchia se la chiave manca
}

/** Lo stesso criterio di `scriviMetaRiga` per le skill che condividono il testo di effetto: se i valori attuali coincidono con la fotografia e la traccia delle traduzioni è vuota o già applicata, tornano alla guida. */
function rivalutaCondividenti(chiave: string, testi: Array<string | null>): void {
  const eguali = (x: unknown, y: unknown): boolean => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
  for (const testo of new Set(testi.filter((x): x is string => x !== null))) {
    const altre = prepared("SELECT id FROM skill WHERE effetto = ? AND id <> ? AND seed_json IS NOT NULL").pluck().all(testo, chiave) as number[];
    for (const id of altre) {
      const altraChiave = String(id);
      const fotografia = seedDi(altraChiave);
      const attuali = skill.leggi(altraChiave);
      if (!Object.keys(fotografia).filter((p) => !p.startsWith('~')).every((p) => eguali(fotografia[p], attuali[p]))) continue;
      const applicata = [...righeRicordate(fotografia)].every(([k, r]) => {
        const ora = leggiRigaTraduzione(k);
        return r === null ? ora === null : ora !== null && eguali(ora.testo, r.testo) && eguali(ora.fonte, r.fonte);
      });
      if (!applicata) continue;
      prepared("UPDATE skill SET origine = 'seed', seed_json = NULL, updated_at = NULL WHERE id = ?").run(id);
    }
  }
}

const skill: DefRiga = {
  modalita: 'riga', etichetta: 'Skill', tabella: 'skill', colonnaChiave: 'CAST(id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(id AS TEXT) FROM skill ORDER BY id').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM skill WHERE id = ?').get(chiave),
  campi: () => [
    { p: 'costo_tipo', e: 'Tipo di costo', t: 'scelta', opzioni: [{ chiave: 'sp', nome: 'SP' }, { chiave: 'hp', nome: 'HP (percentuale)' }, { chiave: 'nessuno', nome: 'Nessun costo' }] } as CampoDef,
    { p: 'costo_valore', e: 'Valore del costo', t: 'numero', max: 999 } as CampoDef,
    { p: 'effetto', e: 'Effetto (testo canonico)', t: 'testolungo', max: 600 } as CampoDef,
    { p: 'effetto_it', e: 'Effetto in italiano', t: 'testolungo', nullable: true, max: 600 } as CampoDef,
    { p: 'fonti', e: 'Persona che la danno come carta con l’esecuzione (nome)', t: 'elenco' } as CampoDef,
  ],
  leggi: (chiave) => {
    const r = rigaSkill(chiave);
    return { costo_tipo: r.costo_tipo, costo_valore: r.costo_valore, effetto: r.effetto, effetto_it: effettoIt(r.effetto), fonti: fontiDi(chiave) };
  },
  scrivi: (chiave, v) => {
    if (v.fonti !== undefined) {
      const ids = idDeiNomiPersona(v.fonti);
      prepared('DELETE FROM skill_fonte_esecuzione WHERE skill_id = ?').run(chiave);
      const inserisci = prepared('INSERT INTO skill_fonte_esecuzione (skill_id, persona_id) VALUES (?, ?)');
      for (const id of ids) inserisci.run(chiave, id);
    }
    const prima = rigaSkill(chiave);
    if (v.costo_tipo !== undefined) prepared('UPDATE skill SET costo_tipo = ? WHERE id = ?').run(str(v.costo_tipo), chiave);
    if (v.costo_valore !== undefined) prepared('UPDATE skill SET costo_valore = ? WHERE id = ?').run(num(v.costo_valore), chiave);
    if (v.effetto !== undefined) prepared('UPDATE skill SET effetto = ? WHERE id = ?').run(str(v.effetto) ?? '', chiave);
    // la resa italiana sta in `traduzione` e vale per il testo dell'effetto: segue il testo nuovo
    const effetto = v.effetto !== undefined ? (str(v.effetto) ?? '') : prima.effetto;
    primaDellaScrittura = new Map();
    // Senza una resa nuova (`effetto_it` non inviato) la riga che il testo nuovo ha già non si tocca: `traduzione` vale per il TESTO, quindi quella riga è la resa
    // di chi ha già quel testo (un'altra skill, o questa stessa se il testo non è cambiato) e sovrascriverla o cancellarla cambierebbe la skill degli altri.
    // Solo se il testo nuovo non ha ancora una resa, ci va quella del testo di prima. Una resa inviata uguale a quella che il testo ha già non scrive niente
    // (il ripristino la rimanda: riscriverla porterebbe la riga a `fonte = 'utente'` con un'altra data).
    const rigaDelTesto = leggiRigaTraduzione(effetto);
    const resaInviata = v.effetto_it !== undefined ? (str(v.effetto_it) || null) : undefined;
    const daScrivere = resaInviata !== undefined
      ? resaInviata !== (rigaDelTesto?.testo ?? null)
      : v.effetto !== undefined && rigaDelTesto === null;
    if (daScrivere) {
      ricordaRiga(prima.effetto);
      ricordaRiga(effetto);
      const it = resaInviata !== undefined ? resaInviata : effettoIt(prima.effetto);
      if (it === null || it === '') prepared("DELETE FROM traduzione WHERE ambito = 'effettoSkill' AND chiave = ?").run(effetto);
      else prepared("INSERT INTO traduzione (ambito, chiave, testo, fonte, updated_at) VALUES ('effettoSkill', ?, ?, 'utente', ?) ON CONFLICT(ambito, chiave) DO UPDATE SET testo = excluded.testo, fonte = 'utente', updated_at = excluded.updated_at")
        .run(effetto, it, new Date().toISOString());
    }
  },
  propaga: (chiave, prima, _dopo, ctx) => {
    const testoPrima = typeof prima.effetto === 'string' ? prima.effetto : null;
    scriviResaEPropaga(chiave, ctx);
    // la resa è del testo: le altre skill con lo stesso testo (prima o dopo la scrittura) cambiano insieme, quindi si rivalutano come fa `scriviMetaRiga`
    rivalutaCondividenti(chiave, [testoPrima, rigaSkill(chiave).effetto]);
  },
  // «Rimetti questo» sulla sola resa italiana, con l'effetto ancora diverso da quello della guida, scriverebbe la resa del testo di prima sulla riga `traduzione` del
  // testo di adesso, che può essere la resa di un'altra skill: si rifiuta, la resa si rimette insieme all'effetto
  verificaRipristino: (chiave, guida) => {
    if (guida.effetto_it !== undefined && guida.effetto === undefined) {
      const grezzo = prepared('SELECT seed_json FROM skill WHERE id = ?').pluck().get(chiave) as string | null | undefined;
      let effettoGuida: unknown;
      try { effettoGuida = grezzo ? (JSON.parse(grezzo) as Valori).effetto : undefined; } catch { effettoGuida = undefined; }
      if (typeof effettoGuida === 'string' && effettoGuida !== rigaSkill(chiave).effetto) {
        throw httpErrors.conflict('effetto-da-rimettere', 'L’effetto di questa skill è stato corretto: la resa italiana appartiene al testo dell’effetto, quindi si rimette insieme all’effetto (o rimetti tutta la skill).');
      }
    }
    // la resa è del TESTO, condivisa da tutte le skill con quel testo: se un'altra skill l'ha cambiata (e questa non ne ricorda la riga di partenza) rimetterla qui
    // porterebbe via la correzione dell'altra
    const testo = typeof guida.effetto === 'string' ? guida.effetto : guida.effetto_it !== undefined ? rigaSkill(chiave).effetto : null;
    if (testo === null) return;
    const riga = leggiRigaTraduzione(testo);
    if (!riga || riga.fonte !== 'utente') return;
    const mia = righeRicordate(seedDi(chiave)).get(testo);
    if (mia !== undefined && (mia === null || mia.fonte !== 'utente')) return; // questa skill ha toccato la riga per prima: la sua riga di partenza è quella della guida
    const altre = prepared("SELECT id, nome, seed_json FROM skill WHERE origine = 'utente' AND seed_json IS NOT NULL AND id <> ?").all(chiave) as Array<{ id: number; nome: string; seed_json: string }>;
    const titolare = altre.find((s) => { try { return righeRicordate(JSON.parse(s.seed_json) as Valori).has(testo); } catch { return false; } });
    const altra = titolare?.nome ?? (prepared('SELECT nome FROM skill WHERE effetto = ? AND id <> ? ORDER BY id').pluck().get(testo, chiave) as string | undefined);
    if (altra === undefined) return;
    throw httpErrors.conflict('resa-condivisa', `La resa italiana dell’effetto è condivisa da tutte le skill con lo stesso testo e quella attuale è stata corretta da un’altra skill («${altra}»): rimetterla qui la sovrascriverebbe. Rimettila da «${altra}» oppure correggi la resa insieme alle due skill.`);
  },
  nome: (chiave) => rigaSkill(chiave).nome,
  valida: (_chiave, fusi) => {
    if (typeof fusi.costo_valore === 'number' && (!Number.isInteger(fusi.costo_valore) || fusi.costo_valore < 0)) throw httpErrors.badRequest('valore-non-valido', 'Valore del costo: serve un numero intero da 0 in su.', { campo: 'costo_valore' });
    if (typeof fusi.effetto === 'string' && fusi.effetto.trim() === '') throw httpErrors.badRequest('valore-non-valido', 'L\'effetto non può essere vuoto.', { campo: 'effetto' });
    idDeiNomiPersona(fusi.fonti);
  },
};

export const DEFINIZIONI_PERSONA: { persona: DefRiga; skill: DefRiga } = { persona, skill };
