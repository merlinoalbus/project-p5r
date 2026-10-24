// ============================================================
// righeCompendio — le regole di fusione del compendio, correggibili e ripristinabili (L11 · R11-17/1, gruppo Compendio)
// ============================================================
//
// Sei oggetti «a riga» del registro dei ripristini (`righe.ts`); il valore della guida è la fotografia `seed_json` presa alla prima correzione (colonne `origine`,
// `seed_json`, `updated_at` della migrazione 216 sulla riga del padre), che `ripristinoService` gestisce come per quartieri, trofei ed esami.
//   - `arcana` (24, chiave = nome dell'Arcano nel dataset): il numero del tarocco. NON si corregge l'ordine (è la posizione dell'Arcano nella tabella di
//     fusione: un ordinamento, come tutti gli altri del registro); il nome italiano si corregge dalle traduzioni.
//   - `fusione-arcana` (273 coppie non ordinate, chiave «a:b» come in tabella): l'Arcano risultante.
//   - `fusione-speciale` (24, chiave = id della Persona risultato): gli ingredienti, nell'ordine della ricetta, come nomi di Persona.
//   - `tesoro` (9, chiave = id della Persona): il modificatore di rango per ognuno dei 24 Arcani (da -2 a +2).
//   - `eredita-tipo` (12 tipi di skill, chiave = tipo): per ognuna delle dodici colonne, se il tipo può ereditare quell'elemento.
//   - `dlc-set` (13, chiave = id): le Persona del set (nomi); una Persona sta in un solo set.
// Il motore di fusione legge queste tabelle e le tiene in memoria: `correggi` e `ripristina` svuotano le copie (`invalidaCacheDiGioco`).
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import { t, vociAmbito } from '../traduzioniService.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';
import { colonna, rigaDaColonne } from './righeComuni.js';

const arcaniOrdinati = (): string[] => prepared('SELECT chiave FROM arcana ORDER BY ordine').pluck().all() as string[];
const nomeArcano = (chiave: string): string => t('arcana', chiave);
const nomePersona = (id: string | number): string => {
  const nome = prepared('SELECT nome FROM persona WHERE id = ?').pluck().get(id) as string | undefined;
  return nome === undefined ? String(id) : t('persona', nome);
};

/** I nomi delle Persona (nome del dataset) → id; 404 per quelli che non esistono, 400 per quelli ripetuti. */
function idDeiNomi(nomi: ValoreCampoCorrezione | undefined, campo: string): number[] {
  const elenco = Array.isArray(nomi) ? nomi : [];
  const ids = elenco.map((nome) => {
    const id = prepared('SELECT id FROM persona WHERE nome = ?').pluck().get(nome) as number | undefined;
    if (id === undefined) throw httpErrors.notFound('persona-non-trovata', `La Persona «${nome}» non esiste.`);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw httpErrors.badRequest('persona-ripetuta', 'Una Persona compare due volte nell\'elenco.', { campo });
  return ids;
}

// ---- Arcani ----

const arcana = rigaDaColonne({
  etichetta: 'Arcano', tabella: 'arcana', colonnaChiave: 'chiave', ordine: 'ordine',
  colonne: [colonna({ p: 'numero', e: 'Numero del tarocco', t: 'numero', nullable: true, max: 99 }, 'numero', 'numero')],
  nome: (chiave) => nomeArcano(chiave),
});

// ---- Matrice di fusione fra Arcani ----

const fusioneArcana = rigaDaColonne({
  etichetta: 'Fusione fra Arcani', tabella: 'fusione_arcana', colonnaChiave: "a || ':' || b", ordine: 'a, b',
  colonne: () => [colonna({
    p: 'risultato', e: 'Arcano risultante', t: 'scelta',
    opzioni: arcaniOrdinati().map((chiave) => ({ chiave, nome: nomeArcano(chiave) })),
  }, 'risultato', 'scelta')],
  nome: (chiave) => {
    const r = prepared("SELECT a, b FROM fusione_arcana WHERE a || ':' || b = ?").get(chiave) as { a: string; b: string } | undefined;
    return r ? `${nomeArcano(r.a)} + ${nomeArcano(r.b)}` : chiave;
  },
});

// ---- Ricette speciali ----

const ingredientiDi = (id: string): string[] =>
  prepared('SELECT p.nome FROM fusione_speciale_ingrediente i JOIN persona p ON p.id = i.ingrediente_id WHERE i.risultato_id = ? ORDER BY i.ordine').pluck().all(id) as string[];

const fusioneSpeciale: DefRiga = {
  modalita: 'riga', etichetta: 'Ricetta speciale', tabella: 'fusione_speciale', colonnaChiave: 'CAST(risultato_id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(risultato_id AS TEXT) FROM fusione_speciale ORDER BY risultato_id').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM fusione_speciale WHERE CAST(risultato_id AS TEXT) = ?').get(chiave),
  campi: () => [{ p: 'ingredienti', e: 'Ingredienti, nell’ordine della ricetta (nome della Persona)', t: 'elenco' } as CampoDef],
  leggi: (chiave) => ({ ingredienti: ingredientiDi(chiave) }),
  scrivi: (chiave, v) => {
    if (v.ingredienti === undefined) return;
    const ids = idDeiNomi(v.ingredienti, 'ingredienti');
    prepared('DELETE FROM fusione_speciale_ingrediente WHERE risultato_id = ?').run(chiave);
    const inserisci = prepared('INSERT INTO fusione_speciale_ingrediente (risultato_id, ingrediente_id, ordine) VALUES (?, ?, ?)');
    ids.forEach((id, i) => inserisci.run(chiave, id, i));
  },
  nome: (chiave) => `Ricetta speciale: ${nomePersona(chiave)}`,
  valida: (chiave, fusi: Valori) => {
    const ids = idDeiNomi(fusi.ingredienti, 'ingredienti');
    if (ids.length < 2) throw httpErrors.badRequest('ingredienti-non-validi', 'Una ricetta speciale ha almeno due ingredienti.', { campo: 'ingredienti' });
    if (ids.includes(Number(chiave))) throw httpErrors.badRequest('ingredienti-non-validi', 'La Persona risultato non può essere un ingrediente di sé stessa.', { campo: 'ingredienti' });
  },
};

// ---- Demoni del Tesoro ----

const RANGHI_TESORO = [{ chiave: '-2', nome: '−2 ranghi' }, { chiave: '-1', nome: '−1 rango' }, { chiave: '0', nome: 'Nessuno spostamento' }, { chiave: '1', nome: '+1 rango' }, { chiave: '2', nome: '+2 ranghi' }];
const PERCORSO_MOD = 'modificatore/';

const tesoro: DefRiga = {
  modalita: 'riga', etichetta: 'Demone del Tesoro', tabella: 'tesoro', colonnaChiave: 'CAST(persona_id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(persona_id AS TEXT) FROM tesoro ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM tesoro WHERE CAST(persona_id AS TEXT) = ?').get(chiave),
  campi: () => arcaniOrdinati().map((a): CampoDef => ({ p: `${PERCORSO_MOD}${a}`, e: nomeArcano(a), t: 'scelta', gruppo: 'Spostamento di rango fondendolo con una Persona di questo Arcano', opzioni: RANGHI_TESORO })),
  leggi: (chiave) => {
    const per = new Map((prepared('SELECT arcana, modificatore FROM tesoro_modificatore WHERE tesoro_id = ?').all(chiave) as Array<{ arcana: string; modificatore: number }>).map((r) => [r.arcana, r.modificatore]));
    return Object.fromEntries(arcaniOrdinati().map((a) => [`${PERCORSO_MOD}${a}`, String(per.get(a) ?? 0)]));
  },
  scrivi: (chiave, v) => {
    for (const a of arcaniOrdinati()) {
      const nuovo = v[`${PERCORSO_MOD}${a}`];
      if (nuovo === undefined) continue;
      const n = Number(nuovo);
      const r = prepared('UPDATE tesoro_modificatore SET modificatore = ? WHERE tesoro_id = ? AND arcana = ?').run(n, chiave, a);
      if (r.changes === 0) prepared('INSERT INTO tesoro_modificatore (arcana, tesoro_id, modificatore) VALUES (?, ?, ?)').run(a, chiave, n);
    }
  },
  nome: (chiave) => `Demone del Tesoro: ${nomePersona(chiave)}`,
};

// ---- Ereditarietà delle skill ----

const PERCORSO_EL = 'elemento/';
/** Le colonne della matrice: quelle delle traduzioni nell'ordine di gioco, poi quelle che la tabella ha in più. */
function colonneEredita(): Array<{ chiave: string; nome: string }> {
  const dalleTraduzioni = vociAmbito('colonnaEredita').map((c) => ({ chiave: c.chiave, nome: c.testo }));
  const note = new Set(dalleTraduzioni.map((c) => c.chiave));
  const extra = (prepared('SELECT DISTINCT elemento FROM eredita_matrice ORDER BY elemento').pluck().all() as string[]).filter((e) => !note.has(e)).map((e) => ({ chiave: e, nome: e }));
  return [...dalleTraduzioni, ...extra];
}

const ereditaTipo: DefRiga = {
  modalita: 'riga', etichetta: 'Ereditarietà delle skill', tabella: 'eredita_matrice', colonnaChiave: 'tipo',
  chiavi: () => (prepared('SELECT DISTINCT tipo FROM eredita_matrice ORDER BY tipo').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM eredita_matrice WHERE tipo = ?').get(chiave),
  campi: () => colonneEredita().map((c): CampoDef => ({ p: `${PERCORSO_EL}${c.chiave}`, e: c.nome, t: 'booleano', gruppo: 'Può ereditare skill di questo tipo' })),
  leggi: (chiave) => {
    const per = new Map((prepared('SELECT elemento, ammesso FROM eredita_matrice WHERE tipo = ?').all(chiave) as Array<{ elemento: string; ammesso: number }>).map((r) => [r.elemento, r.ammesso === 1]));
    return Object.fromEntries(colonneEredita().map((c) => [`${PERCORSO_EL}${c.chiave}`, per.get(c.chiave) ?? false]));
  },
  scrivi: (chiave, v) => {
    for (const c of colonneEredita()) {
      const nuovo = v[`${PERCORSO_EL}${c.chiave}`];
      if (nuovo === undefined) continue;
      const ammesso = nuovo === true ? 1 : 0;
      const r = prepared('UPDATE eredita_matrice SET ammesso = ? WHERE tipo = ? AND elemento = ?').run(ammesso, chiave, c.chiave);
      if (r.changes === 0) prepared('INSERT INTO eredita_matrice (tipo, elemento, ammesso) VALUES (?, ?, ?)').run(chiave, c.chiave, ammesso);
    }
  },
  nome: (chiave) => `Ereditarietà: ${t('tipoEredita', chiave)}`,
};

// ---- Set di contenuti scaricabili ----

const personeDelSet = (id: string): string[] =>
  prepared('SELECT p.nome FROM dlc_set_persona d JOIN persona p ON p.id = d.persona_id WHERE d.set_id = ? ORDER BY p.nome').pluck().all(id) as string[];

const dlcSet: DefRiga = {
  modalita: 'riga', etichetta: 'Set di contenuti scaricabili', tabella: 'dlc_set', colonnaChiave: 'CAST(id AS TEXT)',
  chiavi: () => (prepared('SELECT CAST(id AS TEXT) FROM dlc_set ORDER BY ordine').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM dlc_set WHERE CAST(id AS TEXT) = ?').get(chiave),
  campi: () => [{ p: 'persone', e: 'Persona del set (nome)', t: 'elenco' } as CampoDef],
  leggi: (chiave) => ({ persone: personeDelSet(chiave) }),
  scrivi: (chiave, v) => {
    if (v.persone === undefined) return;
    const ids = idDeiNomi(v.persone, 'persone');
    prepared('DELETE FROM dlc_set_persona WHERE set_id = ?').run(chiave);
    const inserisci = prepared('INSERT INTO dlc_set_persona (set_id, persona_id) VALUES (?, ?)');
    for (const id of ids) inserisci.run(chiave, id);
  },
  nome: (chiave, v) => {
    const ordine = prepared('SELECT ordine FROM dlc_set WHERE CAST(id AS TEXT) = ?').pluck().get(chiave) as number | undefined;
    const persone = Array.isArray(v.persone) ? v.persone.map((n) => t('persona', n)).join(', ') : '';
    return `Set DLC ${(ordine ?? 0) + 1}${persone ? `: ${persone}` : ''}`;
  },
  // una Persona sta in un solo set (la scheda della Persona ne mostra uno)
  valida: (chiave, fusi: Valori) => {
    const ids = idDeiNomi(fusi.persone, 'persone');
    if (ids.length === 0) throw httpErrors.badRequest('set-vuoto', 'Un set ha almeno una Persona.', { campo: 'persone' });
    for (const id of ids) {
      const altro = prepared('SELECT set_id FROM dlc_set_persona WHERE persona_id = ? AND CAST(set_id AS TEXT) <> ?').pluck().get(id, chiave) as number | undefined;
      if (altro !== undefined) throw httpErrors.conflict('persona-gia-in-un-set', `${nomePersona(id)} è già in un altro set (${altro}): una Persona sta in un solo set.`);
    }
  },
};

export const DEFINIZIONI_COMPENDIO: {
  arcana: DefRiga; 'fusione-arcana': DefRiga; 'fusione-speciale': DefRiga; tesoro: DefRiga; 'eredita-tipo': DefRiga; 'dlc-set': DefRiga;
} = { arcana, 'fusione-arcana': fusioneArcana, 'fusione-speciale': fusioneSpeciale, tesoro, 'eredita-tipo': ereditaTipo, 'dlc-set': dlcSet };
