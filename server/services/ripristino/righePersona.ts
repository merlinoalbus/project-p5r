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
//   - `skill` (525 righe, chiave = id): il costo (tipo e valore), l'effetto (il testo canonico della guida, in inglese) e le Persona che la danno come carta con
//     l'esecuzione. Il nome della skill è la chiave delle traduzioni e delle Persona: non si corregge.
//     La resa ITALIANA dell'effetto NON è un campo della skill: vive in `traduzione` (ambito `effettoSkill`, chiave = il testo dell'effetto) ed è condivisa da tutte
//     le skill con lo stesso testo, quindi (decisione dell'utente «Solo da Traduzioni») si modifica e si ripristina solo dalla pagina Traduzioni. Correggere
//     `effetto` verso un testo che non ha resa NON crea nessuna riga di `traduzione`: la scheda mostra il testo inglese finché la resa non è scritta da Traduzioni.
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

// ---- Compatibilità con le fotografie salvate dal codice precedente ----
// Fino alla decisione «Solo da Traduzioni» la skill aveva un campo `effetto_it` (la resa italiana) e conservava nella fotografia la traccia `~traduzioni`: le righe di
// `traduzione` (ambito `effettoSkill`) com'erano prima di essere toccate dalla correzione, come voci JSON `{ k: <testo dell'effetto>, r: <riga | null> }`.
// Le fotografie già salvate su p5s possono contenere entrambe:
//   - `effetto_it` si ignora (`normalizzaGuida`): non è più un campo, quindi la scheda non lo mostra e il ripristino non lo riscrive;
//   - `~traduzioni` si tiene finché la skill non viene ripristinata. Al PRIMO ripristino (di qualunque campo) le righe ricordate si rimettono com'erano, UNA volta
//     (le righe assenti prima si tolgono se nessuna skill usa quel testo), così nessuna resa alterata dal codice vecchio resta senza rimedio; poi la traccia si
//     scarta (si svuota) e non si riapplica più. Una skill con la sola resa corretta e nessun altro campo diverso non risulta «modificata»: la sua resa si
//     rimette dalla pagina Traduzioni («Ripristina»).
const CAMPO_ESCLUSO = 'effetto_it';
const CHIAVE_TRACCIA = '~traduzioni';
type RigaTraduzione = Record<string, string | number | null>;

/** Le righe di `traduzione` ricordate dalla traccia vecchia: testo di effetto → riga com'era (null = assente). */
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

/** Rimette `traduzione` com'era: le righe ricordate tornano identiche, quelle assenti prima si tolgono se nessun'altra skill usa quel testo. */
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

const skill: DefRiga = {
  modalita: 'riga', etichetta: 'Skill', tabella: 'skill', colonnaChiave: 'CAST(id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(id AS TEXT) FROM skill ORDER BY id').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM skill WHERE id = ?').get(chiave),
  campi: () => [
    { p: 'costo_tipo', e: 'Tipo di costo', t: 'scelta', opzioni: [{ chiave: 'sp', nome: 'SP' }, { chiave: 'hp', nome: 'HP (percentuale)' }, { chiave: 'nessuno', nome: 'Nessun costo' }] } as CampoDef,
    { p: 'costo_valore', e: 'Valore del costo', t: 'numero', max: 999 } as CampoDef,
    { p: 'effetto', e: 'Effetto (testo canonico, in inglese)', t: 'testolungo', max: 600 } as CampoDef,
    { p: 'fonti', e: 'Persona che la danno come carta con l’esecuzione (nome)', t: 'elenco' } as CampoDef,
  ],
  leggi: (chiave) => {
    const r = rigaSkill(chiave);
    return { costo_tipo: r.costo_tipo, costo_valore: r.costo_valore, effetto: r.effetto, fonti: fontiDi(chiave) };
  },
  scrivi: (chiave, v) => {
    if (v.fonti !== undefined) {
      const ids = idDeiNomiPersona(v.fonti);
      prepared('DELETE FROM skill_fonte_esecuzione WHERE skill_id = ?').run(chiave);
      const inserisci = prepared('INSERT INTO skill_fonte_esecuzione (skill_id, persona_id) VALUES (?, ?)');
      for (const id of ids) inserisci.run(chiave, id);
    }
    if (v.costo_tipo !== undefined) prepared('UPDATE skill SET costo_tipo = ? WHERE id = ?').run(str(v.costo_tipo), chiave);
    if (v.costo_valore !== undefined) prepared('UPDATE skill SET costo_valore = ? WHERE id = ?').run(num(v.costo_valore), chiave);
    // `traduzione` non si tocca mai da qui: la resa italiana dell'effetto è dell'editor delle traduzioni
    if (v.effetto !== undefined) prepared('UPDATE skill SET effetto = ? WHERE id = ?').run(str(v.effetto) ?? '', chiave);
  },
  // Solo per le fotografie vecchie: al ripristino rimette UNA volta le righe di `traduzione` ricordate in `~traduzioni` e scarta la traccia (vedi sopra).
  // Nelle correzioni la traccia non si tocca (resta nella fotografia finché non si ripristina).
  propaga: (_chiave, _prima, _dopo, ctx: ContestoPropagazione) => {
    if (!ctx.ripristino) return;
    const ricordate = righeRicordate(ctx.traccia);
    if (ricordate.size === 0) return;
    rimettiRighe(ricordate);
    ctx.traccia[CHIAVE_TRACCIA] = []; // non `delete`: la fotografia conserva la traccia vecchia se la chiave manca
  },
  // La fotografia vecchia può avere `effetto_it`, che non è più un campo: si ignora. `~traduzioni` resta (serve al primo ripristino).
  normalizzaGuida: (guida) => {
    if (!(CAMPO_ESCLUSO in guida)) return guida;
    const { [CAMPO_ESCLUSO]: _escluso, ...resto } = guida;
    return resto;
  },
  nome: (chiave) => rigaSkill(chiave).nome,
  valida: (_chiave, fusi) => {
    if (typeof fusi.costo_valore === 'number' && (!Number.isInteger(fusi.costo_valore) || fusi.costo_valore < 0)) throw httpErrors.badRequest('valore-non-valido', 'Valore del costo: serve un numero intero da 0 in su.', { campo: 'costo_valore' });
    if (typeof fusi.effetto === 'string' && fusi.effetto.trim() === '') throw httpErrors.badRequest('valore-non-valido', 'L\'effetto non può essere vuoto.', { campo: 'effetto' });
    idDeiNomiPersona(fusi.fonti);
  },
};

export const DEFINIZIONI_PERSONA: { persona: DefRiga; skill: DefRiga } = { persona, skill };
