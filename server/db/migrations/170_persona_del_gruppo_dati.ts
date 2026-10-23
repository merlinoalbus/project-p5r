// ============================================================
// 170 — le 27 forme del gruppo nel compendio (L8, B2, R8-20 e R8-20b)
// ============================================================
//
// 9 membri × 3 forme (Captain Kidd → Seiten Taisei → William, Carmen → Ecate → Célestine, …, Robin Hood → Loki → Ervardo,
// Cenerentola → Vanadis → Ella) da `dati/persona-del-gruppo.json` (G-025: aqiu384/megaten-fusion-tool, dati estratti da Persona 5
// Royal, nomi italiani e date dalla guida). Le righe nascono con `del_party = 1` sullo schema della 169: senza oggetti d'esecuzione,
// mai fondibili, con `personaggio` (la chiave del membro), `forma`, `forma_di` (radice della catena), `deriva_da` (predecessore
// effettivo: Ervardo ha radice Robin Hood e deriva da Loki) e `chiave_forma` (`<membro>-<forma>`).
//
//   - statistiche e livello: quelli iniziali della fonte, ripetuti sulle forme 2 e 3 (la fonte non dà numeri propri alla
//     trasformazione); mai valori inventati. Loki ed Ervardo hanno i loro.
//   - affinità: le dieci righe di ogni forma, con '-' dove la fonte non indica nulla; la 3ª forma ripete la 2ª (nessuna fonte dà
//     resistenze diverse).
//   - skill: per nome canonico, con il modo in cui si imparano (iniziale = livello 0, livello, risveglio, rango, terza-forma); le
//     righe senza livello restano NULL. Le skill e i tratti devono esistere già in `skill`: se uno manca la migrazione si ferma
//     con l'elenco, senza creare skill vuote.
//   - quando si ottiene la forma: `forma_condizioni_json` con una condizione del vocabolario unico (rango del Confidente, data,
//     avvisi non bloccanti per le scelte di dialogo e le certezze medie).
//   - nome mostrato: `traduzione` ambito `persona`, origine `seed` (Ecate, Mercurio, Ioanna, Prometeo, Ervardo, Cenerentola,
//     Célestine; gli altri uguali all'originale).
//   - Joker: Arsène e Satanael, già nel compendio e fondibili, ricevono solo `personaggio = 'joker'` (restano `del_party = 0`).
//
// Conservativa: non modifica nessuna riga di `persona`, `persona_affinita`, `persona_skill`, `traduzione` già presente (salvo la
// colonna nuova `personaggio` delle due Persona di Joker); un nome già occupato da una Persona o da una traduzione diversa ferma la
// migrazione PRIMA di scrivere. Nessuna scrittura in `partite.db`. Idempotente: con le 27 forme già identiche non fa nulla.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));

type Modo = 'iniziale' | 'livello' | 'risveglio' | 'rango' | 'terza-forma';
type RigaSkill = [string, number | null, Modo];
interface Forma {
  membro: string; forma: 1 | 2 | 3; nome: string; nomeIt: string; arcano: string; livello: number; quando: string; tratto: string; eredita: string;
  affinita: Record<string, string>; statistiche: [number, number, number, number, number]; skillDaPrecedente: boolean; skill: RigaSkill[];
}

const ELEMENTI = ['phys', 'gun', 'fire', 'ice', 'electric', 'wind', 'psy', 'nuclear', 'bless', 'curse'];
const CODICI = ['-', 'wk', 'rs', 'nu', 'rp', 'ab'];
/** I codici di eredità della fonte nel vocabolario del compendio (`persona.eredita`). */
const EREDITA: Record<string, string> = { elec: 'Electric', fire: 'Fire', wind: 'Wind', ice: 'Ice', nuke: 'Nuclear', almighty: 'Almighty', psy: 'Psy', curse: 'Curse', bless: 'Bless' };
const MESI = ['', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
/** Le scelte di dialogo di Ervardo (decisioni dell'utente del 2026-09-05 e 2026-09-30): avvisi non bloccanti, mai un interruttore manuale. */
const AVVISI_ERVARDO = [
  'Risposta da dare nel gioco: «Fermeremo Maruki».',
  'Risposta da dare nel gioco: «Sei il mio rivale» al rango 7 oppure «Accetto» al rango 8.',
  'Risposta da dare nel gioco: «Voglio mantenere la promessa» dopo Shido.',
];

function carica(): Forma[] {
  const file = path.join(QUI, 'dati', 'persona-del-gruppo.json');
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { forme: Forma[] }).forme;
}

/** «MM-GG» → «G mese» (3 dicembre → «3 dicembre»). */
function dataLeggibile(mmgg: string): string {
  const [m, g] = mmgg.split('-').map(Number);
  return `${g} ${MESI[m]}`;
}

/** La condizione con cui si ottiene una forma (null per la 1ª): dal testo `quando` della fonte, senza aggiungere nulla che non dica. */
function condizioneDi(f: Forma): unknown {
  if (f.forma === 1) return null;
  const date = f.quando.match(/\d\d-\d\d/g) ?? [];
  const media = /certezza media/.test(f.quando);
  const avvisoMedia = { tipo: 'avviso', testo: 'Data di certezza media nella guida.' };
  if (f.membro === 'akechi' && f.forma === 2) {
    return { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'data', dal: date[0] }, { tipo: 'avviso', testo: 'Si ottiene con il vero potere nel Palazzo di Shido.' }, avvisoMedia] };
  }
  if (f.membro === 'akechi' && f.forma === 3) {
    return { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'data', dal: date[0] }, ...AVVISI_ERVARDO.map((testo) => ({ tipo: 'avviso', testo }))] };
  }
  if (f.forma === 2 && /automatico/.test(f.quando)) return { tipo: 'data', dal: date[0] };
  if (f.forma === 2) {
    const parentesi = (f.quando.match(/\(([^)]*)\)/)?.[1] ?? '').replace(/(\d\d-\d\d)/g, (d) => dataLeggibile(d));
    return {
      tipo: 'gruppo', modo: 'tutte',
      condizioni: [{ tipo: 'confidente', confidente: f.membro, rango: 10 }, { tipo: 'avviso', testo: `Dalla guida: ${parentesi}.` }],
    };
  }
  const base = { tipo: 'data', dal: date[0] };
  return media ? { tipo: 'gruppo', modo: 'tutte', condizioni: [base, avvisoMedia] } : base;
}

interface RigaPersonaEsistente { id: number; nome: string; del_party: number; chiave_forma: string | null }

export const migration170: Migration = {
  id: 170,
  name: 'persona_del_gruppo_dati',
  up(db: AppDatabase) {
    const forme = carica();
    if (forme.length !== 27) throw new Error(`Migrazione 170: attese 27 forme, trovate ${forme.length}. Fermata.`);

    // ---- già fatta? ----
    const gia = db.prepare("SELECT id, nome, del_party, chiave_forma FROM main.persona WHERE chiave_forma IS NOT NULL").all() as RigaPersonaEsistente[];
    if (gia.length > 0) {
      const attese = new Map(forme.map((f) => [`${f.membro}-${f.forma}`, f.nome]));
      const uguali = gia.length === 27 && gia.every((r) => r.del_party === 1 && attese.get(r.chiave_forma ?? '') === r.nome);
      if (uguali) return;
      throw new Error(`Migrazione 170: ci sono già ${gia.length} Persona con una chiave di forma e non coincidono con le 27 attese. Fermata prima di scrivere.`);
    }

    // ---- verifiche prima di scrivere ----
    const problemi: string[] = [];
    const arcani = new Set((db.prepare('SELECT chiave FROM main.arcana').all() as Array<{ chiave: string }>).map((a) => a.chiave));
    const skillPerNome = new Map((db.prepare('SELECT id, nome, elemento FROM main.skill').all() as Array<{ id: number; nome: string; elemento: string }>).map((s) => [s.nome, s]));
    const nomiPersona = new Set((db.prepare('SELECT nome FROM main.persona').all() as Array<{ nome: string }>).map((p) => p.nome));
    const traduzioni = new Map((db.prepare("SELECT chiave, testo FROM main.traduzione WHERE ambito = 'persona'").all() as Array<{ chiave: string; testo: string }>).map((t) => [t.chiave, t.testo]));
    const espanse = new Map<string, RigaSkill[]>();
    const viste = new Set<string>();
    for (const f of forme) {
      const id = `${f.membro}-${f.forma}`;
      if (viste.has(id) || viste.has(f.nome)) problemi.push(`forma duplicata: ${id} / ${f.nome}`);
      viste.add(id); viste.add(f.nome);
      if (!arcani.has(f.arcano)) problemi.push(`${f.nome}: arcano «${f.arcano}» assente`);
      if (!(f.eredita in EREDITA)) problemi.push(`${f.nome}: tipo di eredità «${f.eredita}» sconosciuto`);
      const tratto = skillPerNome.get(f.tratto);
      if (!tratto || tratto.elemento !== 'trait') problemi.push(`${f.nome}: tratto «${f.tratto}» assente tra le skill`);
      if (nomiPersona.has(f.nome)) problemi.push(`${f.nome}: nome già occupato da una Persona del compendio`);
      if (traduzioni.has(f.nome) && traduzioni.get(f.nome) !== f.nomeIt) problemi.push(`${f.nome}: traduzione del nome già presente e diversa («${traduzioni.get(f.nome)}»)`);
      for (const [el, cod] of Object.entries(f.affinita)) {
        if (!ELEMENTI.includes(el) || !CODICI.includes(cod)) problemi.push(`${f.nome}: affinità non valida ${el}=${cod}`);
      }
      if (f.statistiche.length !== 5 || f.statistiche.some((n) => !Number.isInteger(n) || n < 0)) problemi.push(`${f.nome}: statistiche non valide`);
      const precedente = f.forma > 1 ? espanse.get(`${f.membro}-${f.forma - 1}`) : undefined;
      if (f.skillDaPrecedente && !precedente) problemi.push(`${f.nome}: eredita le skill di una forma precedente che manca`);
      const righe = [...(f.skillDaPrecedente && precedente ? precedente : []), ...f.skill];
      espanse.set(id, righe);
      const doppie = righe.map((r) => r[0]).filter((n, i, a) => a.indexOf(n) !== i);
      if (doppie.length > 0) problemi.push(`${f.nome}: skill ripetute (${[...new Set(doppie)].join(', ')})`);
      for (const [nome, livello, modo] of righe) {
        if (!skillPerNome.has(nome)) problemi.push(`${f.nome}: skill «${nome}» assente`);
        const conLivello = modo === 'livello' || modo === 'iniziale';
        if (conLivello !== (livello !== null) || (modo === 'iniziale' && livello !== 0)) problemi.push(`${f.nome}: ${nome} con livello ${livello} e modo ${modo} incoerenti`);
      }
    }
    const joker = db.prepare("SELECT id, nome, del_party, personaggio FROM main.persona WHERE nome IN ('Arsène', 'Satanael')").all() as Array<{ id: number; nome: string; del_party: number; personaggio: string | null }>;
    for (const j of joker) if (j.del_party !== 0 || (j.personaggio !== null && j.personaggio !== 'joker')) problemi.push(`${j.nome}: già collegata a «${j.personaggio}» o del gruppo`);
    if (problemi.length > 0) throw new Error(`Migrazione 170: fermata prima di scrivere. ${problemi.slice(0, 20).join(' | ')}${problemi.length > 20 ? ` (+${problemi.length - 20})` : ''}`);

    // ---- scrittura ----
    const contaPrima = {
      persona: (db.prepare('SELECT COUNT(*) AS n FROM main.persona').get() as { n: number }).n,
      affinita: (db.prepare('SELECT COUNT(*) AS n FROM main.persona_affinita').get() as { n: number }).n,
      skill: (db.prepare('SELECT COUNT(*) AS n FROM main.persona_skill').get() as { n: number }).n,
    };
    const insPersona = db.prepare(`INSERT INTO main.persona (nome, arcana, livello, eredita, speciale, rara, dlc, richiede_confidente_max, nota, oggetto, oggetto_allarme,
      oggetto_e_carta, tratto, forza, magia, resistenza, agilita, fortuna, aree_mementos_json, piani_mementos, descrizione, fonte_descrizione,
      del_party, personaggio, forma, forma_di, deriva_da, chiave_forma, forma_condizioni_json)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, NULL, NULL, NULL, 0, ?, ?, ?, ?, ?, ?, '[]', NULL, '', '', 1, ?, ?, ?, ?, ?, ?)`);
    const insAffinita = db.prepare('INSERT INTO main.persona_affinita (persona_id, elemento, codice) VALUES (?, ?, ?)');
    const insSkill = db.prepare('INSERT INTO main.persona_skill (persona_id, skill_id, livello, modo) VALUES (?, ?, ?, ?)');
    const insTraduzione = db.prepare("INSERT OR IGNORE INTO main.traduzione (ambito, chiave, testo, extra_json, fonte, updated_at) VALUES ('persona', ?, ?, NULL, 'seed', ?)");
    const adesso = new Date().toISOString();
    const idPerChiave = new Map<string, number>();

    for (const f of forme) {
      const radice = f.forma > 1 ? idPerChiave.get(`${f.membro}-1`) ?? null : null;
      const predecessore = f.forma > 1 ? idPerChiave.get(`${f.membro}-${f.forma - 1}`) ?? null : null;
      const cond = condizioneDi(f);
      const [forza, magia, resistenza, agilita, fortuna] = f.statistiche;
      const r = insPersona.run(f.nome, f.arcano, f.livello, EREDITA[f.eredita], f.tratto, forza, magia, resistenza, agilita, fortuna,
        f.membro, f.forma, radice, predecessore, `${f.membro}-${f.forma}`, cond === null ? null : JSON.stringify(cond));
      const id = Number(r.lastInsertRowid);
      idPerChiave.set(`${f.membro}-${f.forma}`, id);
      for (const el of ELEMENTI) insAffinita.run(id, el, f.affinita[el] ?? '-');
      for (const [nome, livello, modo] of espanse.get(`${f.membro}-${f.forma}`) ?? []) insSkill.run(id, skillPerNome.get(nome)!.id, livello, modo);
      insTraduzione.run(f.nome, f.nomeIt, adesso);
    }
    const collegate = db.prepare("UPDATE main.persona SET personaggio = 'joker' WHERE nome IN ('Arsène', 'Satanael') AND del_party = 0 AND personaggio IS NULL").run().changes;

    // ---- controlli finali ----
    const attesoSkill = [...espanse.values()].reduce((s, r) => s + r.length, 0);
    const conta = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
    if (conta('SELECT COUNT(*) AS n FROM main.persona') !== contaPrima.persona + 27) throw new Error('Migrazione 170: le Persona inserite non sono 27. Annullata.');
    if (conta('SELECT COUNT(*) AS n FROM main.persona_affinita') !== contaPrima.affinita + 270) throw new Error('Migrazione 170: le affinità inserite non sono 270. Annullata.');
    if (conta('SELECT COUNT(*) AS n FROM main.persona_skill') !== contaPrima.skill + attesoSkill) throw new Error('Migrazione 170: le righe di skill inserite non coincidono. Annullata.');
    if (conta("SELECT COUNT(*) AS n FROM main.persona WHERE del_party = 1 AND forma = 1 AND forma_di IS NULL AND deriva_da IS NULL") !== 9) throw new Error('Migrazione 170: le catene non sono 9. Annullata.');
    logger.info({ persone: 27, affinita: 270, skill: attesoSkill, joker: collegate }, '[migration170] Persona del gruppo');
  },
};
