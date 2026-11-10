// ============================================================
// 379 — Eligor nel Dedalo di Chemdah (L10-04)
// ============================================================
//
// La guida mette il Cavaliere bellicoso (maschera Eligor) fra le Personae reclutabili del Dedalo di Chemdah («dedalo-di-chemdah» r.100) e fra i
// nemici esclusivi dei Memento con «Dedalo di Chemdah» («persona-5-royal-guida-ai-memento» r.287); il rapporto N (G-M7) lo trovava solo in
// Aiyatsbus. Nei dati del 10/11 le VOCI ci sono già: due voci Persona di Chemdah, `mementos-03-chemdah/5` e `/19`, legate all'Ombra esistente
// `cavaliere-bellicoso` (`ombra_voce`) e alle aree 3 e 4 (`persona_area_dedalo`), quindi nella vista `ombra_luogo_dedalo`. Manca invece la riga
// di Chemdah nell'indice delle Ombre della guida alla battaglia (`dati_guida.battaglia.ombre`, rapporto N §3.8), che ha 14 righe di Chemdah
// (nessuna per Eligor) e la sua riga di Aiyatsbus.
//
// COSA, solo dove manca:
//   (a) la voce: se nel Dedalo di Chemdah nessuna voce Persona è legata all'Ombra `cavaliere-bellicoso`, se ne crea una (la stessa scheda della
//       voce di Aiyatsbus, con la fonte della pagina di Chemdah), legata all'Ombra esistente (mai una seconda Ombra) e, poiché la guida non dice
//       in quale area si incontra, alla prima area del dedalo, col motivo nel verbale. Nei dati di oggi: 0 voci create.
//   (a2) il doppione: la pagina di Chemdah elenca il Cavaliere bellicoso una volta sola e senza area (r.100; una sola volta anche nell'HTML), e
//       le due voci avevano le stesse aree: `/19` (con la nota «elencata due volte nella tabella», che la pagina non conferma) esce con le sue
//       righe proprie (Ombra e aree) in archivio (`punto_interesse.doppioni-l10-04`), solo se è quella attesa e nessuno la cita (stati nelle
//       partite, divergenze, pin, oggetti, confluenze, Enigmi, boss finale); altrimenti resta col motivo. La vista perde le sue 2 righe.
//   (b) l'indice della battaglia: le righe di Chemdah di Eligor (r.100) e di Reggente (r.110, mancava anche lui), con le affinità della pagina
//       di Chemdah (uguali a quelle delle righe di Aiyatsbus, che si usano come modello solo se sono quelle attese), dopo le righe di Aiyatsbus.
//   (c) «Solo a Chemdah» (decisione dell'utente del 10/11): la guida mette il Cavaliere bellicoso fra i nemici esclusivi del Dedalo di Chemdah
//       («persona-5-royal-guida-ai-memento» r.287) ma anche fra le Personae di Aiyatsbus («dedalo-di-aiyatsbus» r.125); nei Memento vale
//       Chemdah, il Palazzo di Kamoshida non cambia. Escono, ciascuna con archivio e solo se in Chemdah resta la sua voce: la voce di Aiyatsbus
//       `mementos-02-aiyatsbus/17` (guardia: nome, tipo, dedalo; se qualcosa la cita resta col motivo) con il suo legame all'Ombra e le sue 7 aree;
//       il luogo d'incontro «battaglia» di Aiyatsbus in `ombra_luogo`; la riga di Aiyatsbus dell'indice della battaglia (dopo che è servita da
//       modello a quella di Chemdah). Nessuna regola all'avvio ricrea `ombra_luogo` dall'indice (lo scrivono solo le migrazioni 166 e 173), e la
//       cattura di Eligor resta «provata»: l'Ombra c'è ed è catturabile.
// Criterio: la voce c'è (una); la vista cambia solo delle righe della voce creata o tolta. Idempotente. Verbale:
// `dati_guida.audit-l10-04-eligor-chemdah`. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';
import { improntaVistaOmbre } from './376_richieste_e_ombre_colonne_vuote_tolte.js';

const MIGRAZIONE = 'L10-04 · 379';
const errore = (motivo: string): never => { throw new Error(`379: ${motivo}; nessuna modifica applicata.`); };

const OMBRA = 'cavaliere-bellicoso';
const DEDALO = 'mementos-03-chemdah';
const MODELLO = 'mementos-02-aiyatsbus/17';
const FONTE_CHEMDAH = 'https://www.allgamestaff.it/persona-5-royal/dedalo-di-chemdah/';
/** Le righe di Aiyatsbus dell'indice della battaglia, com'erano attese (i modelli delle righe di Chemdah), con la riga della pagina di Chemdah
 *  che elenca l'Ombra fra le Personae del dedalo. Le affinità della pagina di Chemdah sono le stesse (r.100 e r.110). */
const RIGHE_ATTESE: ReadonlyArray<Record<string, unknown> & { persona: string; areaChiave: string; fonteChemdah: string }> = [
  { dungeonChiave: 'mementos', areaChiave: 'mementos-02-aiyatsbus', ombra: 'Cavaliere bellicoso', persona: 'Eligor', debolezze: ['Tuono'], resistenze: ['Fuoco (dimezza)', 'Maledizione (dimezza)'], personalita: 'Irritabile', fonteChemdah: '«Dedalo di Chemdah», riga 100' },
  { dungeonChiave: 'mementos', areaChiave: 'mementos-02-aiyatsbus', ombra: 'Reggente', persona: 'Reggente', debolezze: ['Psicocinesi', 'Nucleare'], resistenze: ['Danno fisico', 'Armi da fuoco', 'Fuoco', 'Ghiaccio', 'Tuono', 'Vento', 'Sacro', 'Maledizione'], personalita: 'Giocosa', fonteChemdah: '«Dedalo di Chemdah», riga 110' },
];
/** La seconda voce del Cavaliere bellicoso in Chemdah, com'era attesa (il doppione). */
const DOPPIONE = { chiave: 'mementos-03-chemdah/19', nome: 'Cavaliere bellicoso', nota: 'Ombra esclusiva del Dedalo di Chemdah (elencata due volte nella tabella).' };
/** Ciò che, fuori dalle righe proprie della voce (Ombra e aree), la cita: se c'è, il doppione resta. */
const LEGAMI_ESTERNI: ReadonlyArray<{ schema: 'main' | 'utente'; tabella: string; colonna: string }> = [
  { schema: 'utente', tabella: 'punto_partita', colonna: 'punto_chiave' }, { schema: 'utente', tabella: 'divergenza_partita', colonna: 'voce_chiave' },
  { schema: 'main', tabella: 'spillo_voce', colonna: 'voce_chiave' }, { schema: 'main', tabella: 'voce_oggetto', colonna: 'voce_chiave' },
  { schema: 'main', tabella: 'voce_confluenza', colonna: 'voce_chiave' }, { schema: 'main', tabella: 'voce_confluenza', colonna: 'voce_canonica' },
  { schema: 'main', tabella: 'punto_interesse', colonna: 'contenitore_chiave' }, { schema: 'main', tabella: 'dungeon', colonna: 'voce_boss_finale' },
];

const AIYATSBUS = 'mementos-02-aiyatsbus';
/** La voce di Aiyatsbus del Cavaliere bellicoso: è anche il modello di una voce da creare in Chemdah, prima di uscire («Solo a Chemdah»). */
const VOCE_AIYATSBUS = MODELLO;
/** La decisione dell'utente, con le righe della guida che si contraddicono. */
const DECISIONE = 'decisione dell’utente del 10/11: «Solo a Chemdah». La guida mette il Cavaliere bellicoso fra i nemici esclusivi del Dedalo di Chemdah '
  + '(«persona-5-royal-guida-ai-memento» r.287) e anche fra le Personae di Aiyatsbus («dedalo-di-aiyatsbus» r.125); nei Memento vale Chemdah, il Palazzo di Kamoshida non cambia';

/** Che cosa, fuori dalle righe proprie della voce (Ombra e aree), la cita (vuoto = niente). */
function legamiEsterni(db: Parameters<Migration['up']>[0], voce: string): string[] {
  return LEGAMI_ESTERNI.filter((l) => db.prepare(`SELECT 1 FROM ${l.schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(l.tabella)
    && (db.prepare(`PRAGMA ${l.schema}.table_info(${l.tabella})`).all() as Array<{ name: string }>).some((c) => c.name === l.colonna)
    && db.prepare(`SELECT 1 FROM ${l.schema}.${l.tabella} WHERE ${l.colonna} = ? LIMIT 1`).get(voce)).map((l) => `${l.tabella}.${l.colonna}`);
}

type RigaBattaglia = Record<string, unknown> & { areaChiave?: string | null; ombra?: string; persona?: string | null };

const uguali = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Un JSON dei dati letto come oggetto; guasto o di un'altra forma, la migrazione si ferma col suo messaggio (niente `SyntaxError` generico). */
function leggiOggetto<T>(testo: unknown, cosa: string): T {
  let v: unknown;
  try { v = JSON.parse(String(testo)); } catch (e) { return errore(`${cosa} non è un JSON leggibile (${e instanceof Error ? e.message : String(e)})`); }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return errore(`${cosa} non è un oggetto JSON`);
  return v as T;
}

export const migration379: Migration = {
  id: 379,
  name: 'eligor_nel_dedalo_di_chemdah',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['punto_interesse', 'ombra', 'ombra_voce', 'persona_area_dedalo', 'area_dedalo', 'dungeon_area', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 'L10-04-379', tabella: t }, 'Eligor in Chemdah: manca una tabella, nulla da fare'); return; }
    }
    if (!db.prepare("SELECT 1 FROM main.dungeon_area WHERE chiave = ? AND dungeon_chiave = 'mementos'").get(DEDALO)) { logger.warn({ migrazione: 'L10-04-379' }, 'Eligor in Chemdah: manca il Dedalo di Chemdah, nulla da fare'); return; }
    if (!db.prepare('SELECT 1 FROM main.ombra WHERE chiave = ?').get(OMBRA)) { logger.warn({ migrazione: 'L10-04-379' }, 'Eligor in Chemdah: manca l’Ombra cavaliere-bellicoso, nulla da fare'); return; }
    const vistaPrima = improntaVistaOmbre(db);
    const ombrePrima = improntaTabella(db, 'ombra');

    // (a) la voce
    const vociPresenti = db.prepare(`SELECT p.chiave FROM main.punto_interesse p JOIN main.ombra_voce ov ON ov.voce_chiave = p.chiave
      WHERE p.area_chiave = ? AND p.tipo = 'persona' AND ov.ombra_chiave = ? ORDER BY p.ordine, p.chiave`).pluck().all(DEDALO, OMBRA) as string[];
    let voceCreata: { chiave: string; area: string; motivo: string } | null = null;
    // perché la voce non è stata creata (null = creata, o c'era già)
    let voceNonCreata: string | null = null;
    if (vociPresenti.length === 0) {
      const m = db.prepare("SELECT nome, descrizione, esauribile, dettagli_json FROM main.punto_interesse WHERE chiave = ? AND tipo = 'persona'").get(MODELLO) as
        { nome: string; descrizione: string; esauribile: number; dettagli_json: string } | undefined;
      const area = db.prepare('SELECT chiave FROM main.area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine, chiave LIMIT 1').pluck().get(DEDALO) as string | undefined;
      if (m && area && leggiOggetto<{ maschera?: string }>(m.dettagli_json, `i dettagli della voce ${MODELLO}`).maschera === 'Eligor') {
        const ordine = (db.prepare('SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.punto_interesse WHERE area_chiave = ?').pluck().get(DEDALO) as number);
        let chiave = `${DEDALO}/${ordine}`;
        for (let i = 2; db.prepare('SELECT 1 FROM main.punto_interesse WHERE chiave = ?').get(chiave); i++) chiave = `${DEDALO}/${ordine}-${i}`;
        db.prepare("INSERT INTO main.punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES (?, ?, ?, 'persona', ?, ?, ?, ?, ?)")
          .run(chiave, DEDALO, ordine, m.nome, m.descrizione, m.esauribile, m.dettagli_json, FONTE_CHEMDAH);
        db.prepare("INSERT INTO main.ombra_voce (voce_chiave, ombra_chiave, origine, updated_at) VALUES (?, ?, 'seed', ?)").run(chiave, OMBRA, new Date().toISOString());
        db.prepare('INSERT INTO main.persona_area_dedalo (voce_chiave, area_dedalo_chiave) VALUES (?, ?)').run(chiave, area);
        voceCreata = { chiave, area, motivo: 'la guida non dice in quale area di Chemdah si incontra: la prima area del dedalo' };
      } else voceNonCreata = !m ? `manca la voce modello ${MODELLO}` : !area ? 'il Dedalo di Chemdah non ha aree' : 'la voce modello non ha la maschera Eligor';
    }

    // (a2) il doppione: la guida elenca il Cavaliere bellicoso UNA volta fra le Personae di Chemdah (r.100; una sola volta anche nell'HTML della
    // pagina), senza area; l'app ne aveva due voci con le stesse aree (3 e 4). Esce `/19` (la nota «elencata due volte nella tabella» non trova
    // riscontro nella pagina), solo se è quella attesa e niente fuori dalle sue righe proprie (Ombra e aree) la cita; righe proprie in archivio
    let doppioneTolto: { voce: string; righeVista: number } | null = null;
    let doppioneMotivo: string | null = null;
    if (vociPresenti.includes(DOPPIONE.chiave) && vociPresenti.some((k) => k !== DOPPIONE.chiave)) {
      const r = db.prepare('SELECT * FROM main.punto_interesse WHERE chiave = ?').get(DOPPIONE.chiave) as Record<string, unknown>;
      const dettagli = leggiOggetto<{ maschera?: string; note?: string }>(r.dettagli_json, `i dettagli della voce ${DOPPIONE.chiave}`);
      const legami = legamiEsterni(db, DOPPIONE.chiave);
      if (r.nome !== DOPPIONE.nome || r.tipo !== 'persona' || dettagli.maschera !== 'Eligor' || dettagli.note !== DOPPIONE.nota) doppioneMotivo = 'la voce non è quella attesa: resta';
      else if (legami.length > 0) doppioneMotivo = `la voce è citata (${legami.join(', ')}): resta`;
      else {
        const aree = db.prepare('SELECT * FROM main.persona_area_dedalo WHERE voce_chiave = ? ORDER BY area_dedalo_chiave').all(DOPPIONE.chiave);
        const ombre = db.prepare('SELECT * FROM main.ombra_voce WHERE voce_chiave = ?').all(DOPPIONE.chiave);
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'punto_interesse.doppioni-l10-04', { [DOPPIONE.chiave]: { voce: r, ombraVoce: ombre, personaAreaDedalo: aree, motivo: 'doppione: la guida elenca Eligor una volta fra le Personae di Chemdah («dedalo-di-chemdah» r.100)' } });
        if (!(DOPPIONE.chiave in righeArchiviate(db, 'punto_interesse.doppioni-l10-04'))) errore('l’archivio del doppione non ha la riga');
        const righeVista = db.prepare('SELECT COUNT(*) FROM main.ombra_luogo_dedalo WHERE voce_chiave = ?').pluck().get(DOPPIONE.chiave) as number;
        db.prepare('DELETE FROM main.persona_area_dedalo WHERE voce_chiave = ?').run(DOPPIONE.chiave);
        db.prepare('DELETE FROM main.ombra_voce WHERE voce_chiave = ?').run(DOPPIONE.chiave);
        if (db.prepare('DELETE FROM main.punto_interesse WHERE chiave = ?').run(DOPPIONE.chiave).changes !== 1) errore('il doppione non si toglie');
        doppioneTolto = { voce: DOPPIONE.chiave, righeVista };
      }
    }

    // (b) le righe dell'indice della battaglia (Eligor e Reggente in Chemdah), ciascuna dal suo modello di Aiyatsbus, se è quello atteso
    const righeAggiunte: string[] = [];
    const righeMotivi: Record<string, string> = {};
    const soloAChemdah = { voceTolta: null as string | null, voceMotivo: null as string | null, righeVista: 0, luoghiTolti: [] as number[], rigaBattagliaTolta: false };
    const json = db.prepare("SELECT json FROM main.dati_guida WHERE chiave = 'battaglia'").pluck().get() as string | undefined;
    if (json) {
      const blocco = leggiOggetto<{ ombre?: RigaBattaglia[] }>(json, 'il blocco dati_guida.battaglia');
      if (blocco.ombre !== undefined && !Array.isArray(blocco.ombre)) errore('dati_guida.battaglia.ombre non è un elenco');
      let ombre = blocco.ombre ?? [];
      for (const atteso of RIGHE_ATTESE) {
        if (ombre.some((o) => o.areaChiave === DEDALO && o.persona === atteso.persona)) { righeMotivi[atteso.persona] = 'già presente'; continue; }
        const i = ombre.findIndex((o) => o.areaChiave === atteso.areaChiave && o.persona === atteso.persona);
        const modello = i >= 0 ? ombre[i] : undefined;
        if (!modello || !Object.entries(atteso).filter(([k]) => k !== 'fonteChemdah').every(([k, v]) => uguali(modello[k], v))) {
          righeMotivi[atteso.persona] = 'la riga di Aiyatsbus non è quella attesa: nulla si aggiunge'; continue;
        }
        const nuova: RigaBattaglia = { ...modello, area: 'Dedalo di Chemdah', areaChiave: DEDALO, fonte: FONTE_CHEMDAH };
        ombre = [...ombre.slice(0, i + 1), nuova, ...ombre.slice(i + 1)];
        righeAggiunte.push(`${atteso.persona} (${atteso.fonteChemdah})`);
      }
      // (c3) «Solo a Chemdah»: la riga di Aiyatsbus del Cavaliere bellicoso esce (in archivio), solo se quella di Chemdah c'è
      const rigaAiyatsbus = ombre.findIndex((o) => o.areaChiave === AIYATSBUS && o.persona === 'Eligor' && o.ombra === 'Cavaliere bellicoso');
      if (rigaAiyatsbus >= 0 && ombre.some((o) => o.areaChiave === DEDALO && o.persona === 'Eligor')) {
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'dati_guida.battaglia.ombre.solo-a-chemdah-l10-04', { [`${AIYATSBUS}/Eligor`]: ombre[rigaAiyatsbus] });
        if (!(`${AIYATSBUS}/Eligor` in righeArchiviate(db, 'dati_guida.battaglia.ombre.solo-a-chemdah-l10-04'))) errore('l’archivio della riga di battaglia di Aiyatsbus non ha la riga');
        ombre = ombre.filter((_, n) => n !== rigaAiyatsbus);
        soloAChemdah.rigaBattagliaTolta = true;
      }
      if (righeAggiunte.length > 0 || soloAChemdah.rigaBattagliaTolta) db.prepare("UPDATE main.dati_guida SET json = ? WHERE chiave = 'battaglia'").run(JSON.stringify({ ...blocco, ombre }));
    } else for (const a of RIGHE_ATTESE) righeMotivi[a.persona] = 'il blocco della battaglia non c’è';

    // (c1) «Solo a Chemdah»: la voce di Aiyatsbus esce con le sue righe proprie (Ombra e 7 aree) in archivio, se è quella attesa, se resta la voce
    // di Chemdah e se nessuno la cita; (c2) con lei il luogo d'incontro «battaglia» di Aiyatsbus in `ombra_luogo`
    const voceChemdah = (db.prepare('SELECT COUNT(*) FROM main.ombra_voce ov JOIN main.punto_interesse p ON p.chiave = ov.voce_chiave WHERE p.area_chiave = ? AND ov.ombra_chiave = ?').pluck().get(DEDALO, OMBRA) as number) > 0;
    const v = db.prepare('SELECT * FROM main.punto_interesse WHERE chiave = ?').get(VOCE_AIYATSBUS) as Record<string, unknown> | undefined;
    if (v && voceChemdah) {
      const legami = legamiEsterni(db, VOCE_AIYATSBUS);
      if (v.nome !== 'Cavaliere bellicoso' || v.tipo !== 'persona' || v.area_chiave !== AIYATSBUS) soloAChemdah.voceMotivo = 'la voce di Aiyatsbus non è quella attesa: resta';
      else if (legami.length > 0) soloAChemdah.voceMotivo = `la voce di Aiyatsbus è citata (${legami.join(', ')}): resta`;
      else {
        const aree = db.prepare('SELECT * FROM main.persona_area_dedalo WHERE voce_chiave = ? ORDER BY area_dedalo_chiave').all(VOCE_AIYATSBUS);
        const ombreVoce = db.prepare('SELECT * FROM main.ombra_voce WHERE voce_chiave = ?').all(VOCE_AIYATSBUS);
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'punto_interesse.solo-a-chemdah-l10-04', { [VOCE_AIYATSBUS]: { voce: v, ombraVoce: ombreVoce, personaAreaDedalo: aree, motivo: DECISIONE } });
        if (!(VOCE_AIYATSBUS in righeArchiviate(db, 'punto_interesse.solo-a-chemdah-l10-04'))) errore('l’archivio della voce di Aiyatsbus non ha la riga');
        soloAChemdah.righeVista = db.prepare('SELECT COUNT(*) FROM main.ombra_luogo_dedalo WHERE voce_chiave = ?').pluck().get(VOCE_AIYATSBUS) as number;
        db.prepare('DELETE FROM main.persona_area_dedalo WHERE voce_chiave = ?').run(VOCE_AIYATSBUS);
        db.prepare('DELETE FROM main.ombra_voce WHERE voce_chiave = ?').run(VOCE_AIYATSBUS);
        if (db.prepare('DELETE FROM main.punto_interesse WHERE chiave = ?').run(VOCE_AIYATSBUS).changes !== 1) errore('la voce di Aiyatsbus non si toglie');
        soloAChemdah.voceTolta = VOCE_AIYATSBUS;
      }
    }
    // il luogo d'incontro esce solo con la voce: se la voce di Aiyatsbus resta (non è quella attesa o è citata) resta anche il suo luogo; se la
    // voce non c'è più (tolta da questa migrazione o in un giro di prima) il luogo segue
    const voceUscita = !!soloAChemdah.voceTolta || !v;
    if (voceChemdah && voceUscita && esisteTabella(db, 'ombra_luogo')) {
      const luoghi = db.prepare("SELECT * FROM main.ombra_luogo WHERE ombra_chiave = ? AND dungeon_chiave = 'mementos' AND infiltrazione_chiave = ? AND fonte = 'battaglia' ORDER BY id").all(OMBRA, AIYATSBUS) as Array<{ id: number }>;
      if (luoghi.length > 0) {
        archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'ombra_luogo.solo-a-chemdah-l10-04', Object.fromEntries(luoghi.map((l) => [String(l.id), l])));
        const presenti = righeArchiviate(db, 'ombra_luogo.solo-a-chemdah-l10-04');
        if (!luoghi.every((l) => String(l.id) in presenti)) errore('l’archivio dei luoghi d’incontro di Aiyatsbus non ha tutte le righe');
        for (const l of luoghi) if (db.prepare('DELETE FROM main.ombra_luogo WHERE id = ?').run(l.id).changes !== 1) errore(`il luogo d’incontro ${l.id} non si toglie`);
        soloAChemdah.luoghiTolti = luoghi.map((l) => l.id);
      }
    }

    // i controlli: nessuna Ombra nuova; la vista cambia solo della riga della voce creata e delle righe del doppione tolto
    if (improntaTabella(db, 'ombra') !== ombrePrima) errore('le Ombre sono cambiate');
    const vistaDopo = improntaVistaOmbre(db);
    const righe = (impronta: string): number => Number(impronta.split(':')[0]);
    const attese = righe(vistaPrima) + (voceCreata ? 1 : 0) - (doppioneTolto?.righeVista ?? 0) - soloAChemdah.righeVista;
    const voceTolta = !!doppioneTolto || !!soloAChemdah.voceTolta;
    if (!voceCreata && !voceTolta && vistaDopo !== vistaPrima) errore('la vista ombra_luogo_dedalo è cambiata senza voci nuove né tolte');
    if (righe(vistaDopo) !== attese) errore(`la vista ombra_luogo_dedalo ha ${righe(vistaDopo)} righe, ne erano attese ${attese}`);
    // il Cavaliere bellicoso resta nei Memento, a Chemdah (la cattura resta «provata»: l'Ombra c'è ed è catturabile)
    if (!voceChemdah) logger.warn({ migrazione: 'L10-04-379' }, 'nessuna voce del Cavaliere bellicoso in Chemdah: Aiyatsbus non si tocca');

    // i motivi di ciò che non si è fatto vanno sempre nel verbale (non «già presente», il segno di una seconda esecuzione)
    const righeNonAggiunte = Object.values(righeMotivi).some((m) => m !== 'già presente');
    const soloFatto = !!soloAChemdah.voceTolta || soloAChemdah.luoghiTolti.length > 0 || soloAChemdah.rigaBattagliaTolta;
    if (!voceCreata && !doppioneTolto && righeAggiunte.length === 0 && voceNonCreata === null && doppioneMotivo === null && !righeNonAggiunte && !soloFatto && soloAChemdah.voceMotivo === null) return;
    registraAudit(db, 'audit-l10-04-eligor-chemdah', { migrazione: MIGRAZIONE, vociPresenti, voceCreata, voceNonCreata, doppioneTolto, doppioneMotivo,
      righeBattagliaAggiunte: righeAggiunte, righeBattagliaMotivi: righeMotivi, soloAChemdah: { decisione: DECISIONE, ...soloAChemdah }, vista: { prima: vistaPrima, dopo: vistaDopo } });
    if (voceNonCreata || doppioneMotivo || righeNonAggiunte || soloAChemdah.voceMotivo) logger.warn({ migrazione: 'L10-04-379', voceNonCreata, doppioneMotivo, righeMotivi, soloAChemdah }, 'Eligor in Chemdah: qualcosa non è stato fatto');
    logger.info({ migrazione: 'L10-04-379', vociPresenti, voceCreata: voceCreata?.chiave ?? null, doppioneTolto: doppioneTolto?.voce ?? null, righeAggiunte, soloAChemdah }, 'Eligor (e Reggente) nel Dedalo di Chemdah, il Cavaliere bellicoso solo a Chemdah');
  },
};
