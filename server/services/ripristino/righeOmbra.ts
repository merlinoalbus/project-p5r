// ============================================================
// righeOmbra — l'Ombra, correggibile e ripristinabile (L11 · R11-15/4)
// ============================================================
//
// Un oggetto «a riga» del registro dei ripristini (`righe.ts`): l'Ombra (`ombra`, una riga per Ombra). Il valore della guida è la fotografia
// `seed_json` presa alla prima correzione (colonne `origine`, `seed_json`, `updated_at`, già della migrazione 166; la migrazione 206 porta la
// fotografia di allora nella forma di questo registro), che `ripristinoService` gestisce come per quartieri, trofei ed esami.
//
// Si correggono: il nome, gli altri nomi, la maschera descrittiva (per le non reclutabili), la personalità, la catturabilità, la
// negoziabilità, il livello, le note e le affinità PROPRIE dell'Ombra (le differenze rispetto alla sua Persona: per ognuno dei dieci elementi
// «come la Persona» oppure un esito). Le affinità della Persona si correggono dalla scheda Persona (`affinitaPersonaService`): qui non si
// copiano. NON si correggono: la chiave (la usano luoghi, voci e partite), la Persona abbinata (l'ha in carico L8: cambia l'identità
// dell'Ombra). I luoghi d'incontro e le voci della guida si correggono a parte, con i due tipi qui sotto (R11-17/1).
// Nei dati non ci sono PV né oggetti lasciati dalle Ombre: l'Ombra ha solo il livello (3 Ombre su 131), e quello c'è.
//
// Gli altri due oggetti «a riga» di questo gruppo (colonne `origine`, `seed_json`, `updated_at` della migrazione 225):
//   - `ombra-luogo` (`ombra_luogo`, chiave = id della riga): DOVE si incontra l'Ombra, cioè il posto (Palazzo, o Palazzo e infiltrazione, o Memento e dedalo). Si corregge il
//     posto di una riga esistente, qualunque ne sia la fonte. NON si correggono l'Ombra della riga (è la sua identità) né la fonte (dice da dove viene la riga). Non si
//     aggiungono né si tolgono righe: il registro corregge valori sul posto. Le righe con fonte «voce» nascono dal pin: se la voce passa a un'altra Ombra la sua riga di
//     luogo non la segue da sola, si corregge a parte.
//   - `ombra-voce` (`ombra_voce`, chiave = chiave del pin): QUALE Ombra descrive la voce Persona della guida. Si corregge l'Ombra; la voce (il pin) è l'identità della riga.
//     Le aree dei dedali dove si incontra l'Ombra (vista `ombra_luogo_dedalo`) si ricalcolano da sole da questo legame.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { ELEMENTI_AFFINITA, ESITI_AFFINITA, NOME_PERSONALITA, PERSONALITA_OMBRA, eCodiceAffinita, eChiaveElemento } from '../../../shared/elementi.js';
import type { ValoreCampoCorrezione } from '../../../shared/types.js';
import type { CampoDef } from './registro.js';
import type { DefRiga, Valori } from './righe.js';
import { colonna, rigaDaColonne } from './righeComuni.js';

const str = (v: ValoreCampoCorrezione | undefined): string | null => (typeof v === 'string' ? v : null);
const NEGOZIABILE = [{ chiave: '', nome: 'Non verificata' }, { chiave: '1', nome: 'Sì, si negozia' }, { chiave: '0', nome: 'No, non si negozia' }];
const LIVELLO_MASSIMO = 99;

interface RigaOmbra {
  nome: string; nomi_altri_json: string; persona_id: number | null; maschera_nota: string | null; personalita: string; catturabile: number;
  negoziabile: number | null; affinita_proprie_json: string | null; livello: number | null; note: string;
}
const COLONNE = 'nome, nomi_altri_json, persona_id, maschera_nota, personalita, catturabile, negoziabile, affinita_proprie_json, livello, note';
const riga = (chiave: string): RigaOmbra => prepared(`SELECT ${COLONNE} FROM ombra WHERE chiave = ?`).get(chiave) as RigaOmbra;

const nomiAltriDi = (json: string): string[] => { try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };

/** Le affinità proprie (elemento → codice) scritte sull'Ombra; ciò che non è un elemento o un codice valido si ignora, come fa la lettura. */
function proprieDi(json: string | null): Map<string, string> {
  const m = new Map<string, string>();
  if (!json) return m;
  try {
    for (const [el, cod] of Object.entries(JSON.parse(json) as Record<string, unknown>)) if (eChiaveElemento(el) && eCodiceAffinita(cod)) m.set(el, cod);
  } catch { /* illeggibili: nessuna */ }
  return m;
}

const ombra: DefRiga = {
  modalita: 'riga', etichetta: 'Ombra', tabella: 'ombra', colonnaChiave: 'chiave', aggiornataSempre: true,
  chiavi: () => (prepared('SELECT chiave FROM ombra ORDER BY nome COLLATE NOCASE, chiave').pluck().all() as string[]),
  esiste: (chiave) => !!prepared('SELECT 1 FROM ombra WHERE chiave = ?').get(chiave),
  campi: (chiave) => {
    const senzaPersona = riga(chiave).persona_id === null;
    const esiti = [{ chiave: '', nome: senzaPersona ? 'Non detta dalla guida' : 'Come la sua Persona' }, ...ESITI_AFFINITA.map((e) => ({ chiave: e.codice, nome: e.nome }))];
    return [
      { p: 'nome', e: 'Nome', t: 'testo', max: 80 } as CampoDef,
      { p: 'nomiAltri', e: 'Altri nomi', t: 'elenco' } as CampoDef,
      { p: 'macheraNota', e: 'Maschera (se non reclutabile)', t: 'testo', nullable: true, max: 80 } as CampoDef,
      { p: 'personalita', e: 'Personalità', t: 'scelta', opzioni: PERSONALITA_OMBRA.map((p) => ({ chiave: p, nome: NOME_PERSONALITA[p] })) } as CampoDef,
      { p: 'catturabile', e: 'L’incontro permette la cattura', t: 'booleano' } as CampoDef,
      { p: 'negoziabile', e: 'Si negozia', t: 'scelta', opzioni: NEGOZIABILE } as CampoDef,
      { p: 'livello', e: 'Livello', t: 'numero', nullable: true, max: LIVELLO_MASSIMO } as CampoDef,
      { p: 'note', e: 'Note', t: 'testolungo', nullable: true, max: 2000 } as CampoDef,
      ...ELEMENTI_AFFINITA.map((el): CampoDef => ({ p: `affinita/${el.chiave}`, e: el.nome, t: 'scelta', gruppo: 'Affinità proprie dell’Ombra', opzioni: esiti })),
    ];
  },
  leggi: (chiave) => {
    const r = riga(chiave);
    const proprie = proprieDi(r.affinita_proprie_json);
    const v: Valori = {
      nome: r.nome, nomiAltri: nomiAltriDi(r.nomi_altri_json), macheraNota: r.maschera_nota, personalita: r.personalita, catturabile: r.catturabile === 1,
      negoziabile: r.negoziabile === null ? '' : String(r.negoziabile), livello: r.livello, note: r.note === '' ? null : r.note,
    };
    for (const el of ELEMENTI_AFFINITA) v[`affinita/${el.chiave}`] = proprie.get(el.chiave) ?? '';
    return v;
  },
  scrivi: (chiave, v) => {
    if (v.nome !== undefined) prepared('UPDATE ombra SET nome = ? WHERE chiave = ?').run(str(v.nome) ?? '', chiave);
    if (v.nomiAltri !== undefined) prepared('UPDATE ombra SET nomi_altri_json = ? WHERE chiave = ?').run(JSON.stringify(Array.isArray(v.nomiAltri) ? v.nomiAltri : []), chiave);
    if (v.macheraNota !== undefined) prepared('UPDATE ombra SET maschera_nota = ? WHERE chiave = ?').run(str(v.macheraNota), chiave);
    if (v.personalita !== undefined) prepared('UPDATE ombra SET personalita = ? WHERE chiave = ?').run(str(v.personalita) ?? 'sconosciuta', chiave);
    if (v.catturabile !== undefined) prepared('UPDATE ombra SET catturabile = ? WHERE chiave = ?').run(v.catturabile === true ? 1 : 0, chiave);
    if (v.negoziabile !== undefined) prepared('UPDATE ombra SET negoziabile = ? WHERE chiave = ?').run(v.negoziabile === '' || v.negoziabile === null ? null : Number(v.negoziabile), chiave);
    if (v.livello !== undefined) prepared('UPDATE ombra SET livello = ? WHERE chiave = ?').run(typeof v.livello === 'number' ? v.livello : null, chiave);
    if (v.note !== undefined) prepared('UPDATE ombra SET note = ? WHERE chiave = ?').run(str(v.note) ?? '', chiave);
    if (ELEMENTI_AFFINITA.some((el) => v[`affinita/${el.chiave}`] !== undefined)) {
      const proprie = proprieDi(riga(chiave).affinita_proprie_json);
      for (const el of ELEMENTI_AFFINITA) {
        const nuovo = v[`affinita/${el.chiave}`];
        if (nuovo === undefined) continue;
        if (nuovo === '' || nuovo === null) proprie.delete(el.chiave);
        else proprie.set(el.chiave, String(nuovo));
      }
      const fuori = Object.fromEntries(ELEMENTI_AFFINITA.filter((el) => proprie.has(el.chiave)).map((el) => [el.chiave, proprie.get(el.chiave)!]));
      prepared('UPDATE ombra SET affinita_proprie_json = ? WHERE chiave = ?').run(Object.keys(fuori).length > 0 ? JSON.stringify(fuori) : null, chiave);
    }
  },
  nome: (_chiave, v) => String(v.nome),
  // il livello, quando c'è, è positivo (vincolo della tabella): zero si rifiuta con un errore chiaro invece di un errore del database
  valida: (_chiave, fusi) => {
    if (typeof fusi.livello === 'number' && fusi.livello < 1) throw httpErrors.badRequest('valore-non-valido', 'Livello: serve un numero da 1 in su, oppure vuoto.', { campo: 'livello' });
  },
};

// ---- Luoghi d'incontro (ombra_luogo) ----

const FONTE_LUOGO: Record<string, string> = { battaglia: 'dalla guida alla Battaglia', voce: 'da una voce Persona della guida', utente: 'aggiunto dall’utente' };
const CHIAVE_LUOGO = 'CAST(id AS TEXT)';
/** La chiave di un posto: «dungeon|infiltrazione» (l'infiltrazione manca se la fonte dice soltanto il Palazzo). */
const chiavePosto = (dungeon: string, infiltrazione: string | null): string => `${dungeon}|${infiltrazione ?? ''}`;
const dividiPosto = (k: string): { dungeon: string; infiltrazione: string | null } => {
  const i = k.indexOf('|');
  const inf = k.slice(i + 1);
  return { dungeon: k.slice(0, i), infiltrazione: inf === '' ? null : inf };
};

/** Tutti i posti dove si può incontrare un'Ombra, con il nome: ogni Palazzo o Memento da solo, e ognuna delle sue infiltrazioni (dedali per i Memento). */
function postiScelta(): Array<{ chiave: string; nome: string }> {
  const dungeon = prepared('SELECT chiave, nome FROM dungeon ORDER BY ordine, chiave').all() as Array<{ chiave: string; nome: string }>;
  const aree = prepared('SELECT chiave, nome, dungeon_chiave FROM dungeon_area ORDER BY ordine, chiave').all() as Array<{ chiave: string; nome: string; dungeon_chiave: string }>;
  return dungeon.flatMap((d) => [
    { chiave: chiavePosto(d.chiave, null), nome: `${d.nome} (senza un punto preciso)` },
    ...aree.filter((a) => a.dungeon_chiave === d.chiave).map((a) => ({ chiave: chiavePosto(d.chiave, a.chiave), nome: `${d.nome} › ${a.nome}` })),
  ]);
}

const nomePosto = (k: string): string => postiScelta().find((p) => p.chiave === k)?.nome ?? k;

interface RigaLuogo { ombra_chiave: string; dungeon_chiave: string; infiltrazione_chiave: string | null; fonte: string }
const rigaLuogo = (chiave: string): RigaLuogo =>
  prepared(`SELECT ombra_chiave, dungeon_chiave, infiltrazione_chiave, fonte FROM ombra_luogo WHERE ${CHIAVE_LUOGO} = ?`).get(chiave) as RigaLuogo;

/** Una riga dello stesso tipo (Ombra e fonte) è già in quel posto: l'indice unico lo vieta, e l'errore deve essere chiaro. */
function esigiPostoLibero(chiave: string, posto: string, codice: string): void {
  const r = rigaLuogo(chiave);
  const { dungeon, infiltrazione } = dividiPosto(posto);
  const altra = prepared(`SELECT 1 FROM ombra_luogo WHERE ombra_chiave = ? AND dungeon_chiave = ? AND IFNULL(infiltrazione_chiave, '') = ? AND fonte = ? AND ${CHIAVE_LUOGO} <> ?`)
    .get(r.ombra_chiave, dungeon, infiltrazione ?? '', r.fonte, chiave);
  if (altra) throw httpErrors.conflict(codice, `Quest’Ombra ha già un luogo d’incontro «${FONTE_LUOGO[r.fonte] ?? r.fonte}» in «${nomePosto(posto)}»: scegli un altro posto.`);
}

const ombraLuogo: DefRiga = {
  modalita: 'riga', etichetta: 'Luogo d’incontro', tabella: 'ombra_luogo', colonnaChiave: CHIAVE_LUOGO,
  chiavi: () => (prepared('SELECT CAST(id AS TEXT) FROM ombra_luogo ORDER BY id').pluck().all() as string[]),
  esiste: (chiave) => !!prepared(`SELECT 1 FROM ombra_luogo WHERE ${CHIAVE_LUOGO} = ?`).get(chiave),
  campi: () => [{ p: 'posto', e: 'Dove si incontra', t: 'scelta', opzioni: postiScelta() } as CampoDef],
  leggi: (chiave) => {
    const r = rigaLuogo(chiave);
    return { posto: chiavePosto(r.dungeon_chiave, r.infiltrazione_chiave) };
  },
  scrivi: (chiave, v) => {
    if (typeof v.posto !== 'string') return;
    const { dungeon, infiltrazione } = dividiPosto(v.posto);
    prepared(`UPDATE ombra_luogo SET dungeon_chiave = ?, infiltrazione_chiave = ? WHERE ${CHIAVE_LUOGO} = ?`).run(dungeon, infiltrazione, chiave);
  },
  nome: (chiave, v) => {
    const r = rigaLuogo(chiave);
    const ombra = (prepared('SELECT nome FROM ombra WHERE chiave = ?').pluck().get(r.ombra_chiave) as string | undefined) ?? r.ombra_chiave;
    return `Dove si incontra «${ombra}»: ${nomePosto(String(v.posto))}`;
  },
  valida: (chiave, fusi) => { if (typeof fusi.posto === 'string') esigiPostoLibero(chiave, fusi.posto, 'luogo-gia-presente'); },
  // il posto della guida deve esistere ancora e non essere occupato da un'altra riga della stessa fonte
  verificaRipristino: (chiave, guida) => {
    if (typeof guida.posto !== 'string') return;
    if (!postiScelta().some((p) => p.chiave === guida.posto)) throw httpErrors.conflict('luogo-originale-mancante', 'Il posto della guida non esiste più: non si può rimettere.');
    esigiPostoLibero(chiave, guida.posto, 'luogo-originale-occupato');
  },
};

// ---- Voci della guida (ombra_voce) ----

const ombreScelta = (): Array<{ chiave: string; nome: string }> => prepared('SELECT chiave, nome FROM ombra ORDER BY nome COLLATE NOCASE, chiave').all() as Array<{ chiave: string; nome: string }>;

const ombraVoce: DefRiga = rigaDaColonne({
  etichetta: 'Voce dell’Ombra', tabella: 'ombra_voce', colonnaChiave: 'voce_chiave', ordine: 'voce_chiave',
  colonne: () => [colonna({ p: 'ombra', e: 'Ombra descritta dalla voce', t: 'scelta', opzioni: ombreScelta() }, 'ombra_chiave', 'scelta')],
  nome: (chiave) => {
    const r = prepared(`SELECT p.nome, d.nome AS dungeon FROM punto_interesse p LEFT JOIN dungeon_area a ON a.chiave = p.area_chiave LEFT JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE p.chiave = ?`).get(chiave) as { nome: string; dungeon: string | null } | undefined;
    return r ? `Voce «${r.nome}»${r.dungeon ? ` (${r.dungeon})` : ''}: quale Ombra descrive` : `Voce «${chiave}»`;
  },
});

export const DEFINIZIONI_OMBRA: { ombra: DefRiga; 'ombra-luogo': DefRiga; 'ombra-voce': DefRiga } = { ombra, 'ombra-luogo': ombraLuogo, 'ombra-voce': ombraVoce };
