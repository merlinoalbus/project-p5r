// ============================================================
// 175 — Iweleth esiste solo come dedalo dei Memento (L8, B7: R8-16, R8-17, R8-18, R8-19, R8-19b)
// ============================================================
//
// Decisione D3 dell'utente: il «Palazzo» di Iweleth confluisce nel dedalo `mementos-08-iweleth`. Le righe tecniche `dungeon iweleth` e le sue 12
// infiltrazioni (`dungeon_area`) RESTANO: le citano le planimetrie (L3), i 12 spilli guida (FK RESTRICT), la condizione «Dedalo di Iweleth aperto» e le
// migrazioni storiche (099, 101, 109–113). Cambia dove si legge:
//  - `infiltrazione_dedalo`: ogni infiltrazione storica → l'area del dedalo (R8-16: 12 righe; corrispondenza nominale di `101_aree_reali_dei_dedali`,
//    verificata sull'istanza prima di scrivere);
//  - `dedalo_confluenza`: il dungeon `iweleth` confluisce nel dedalo (l'indirizzo `/guida/dungeon/iweleth` porta lì; non è più nell'elenco dei Palazzi);
//  - le voci che non sono Persona (38 sulla base pubblica) diventano **Trama** del dedalo, nell'area del dedalo della loro infiltrazione, conservando
//    chiave, testo, dettagli, contenuto, pin, ordine relativo e stato (R8-17). Il tipo e l'infiltrazione di prima restano in `voce_confluenza`
//    (elenco di conversione, nessuna voce si perde). I 12 spilli guida e i legami `spillo_voce` puntano alla chiave della voce: non si toccano;
//  - Abaddon (A04/3 «Re abissale dell'avarizia», `ombra-sciagura`): per i dati di Royal (roy-enemy-data: Abaddon, Depths, personalità Irritable) è un'Ombra
//    comune con la sua Persona, che il dedalo ha già (/14); la voce diventa Trama (il combattimento) e si collega alla stessa Ombra, senza una seconda
//    piastrella di cattura;
//  - le 9 Persona doppie (A02/5..13) restano come righe dell'archivio e puntano alla voce del dedalo (`voce_confluenza`, azione `doppia`): hanno la stessa
//    Ombra e la stessa Persona, lo stato è uno solo (il compendio della partita, `catturePersona.ts`);
//  - i luoghi d'incontro delle Ombre di Iweleth passano da «Palazzo di Iweleth» al dedalo dei Memento (le righe uguali per posto e fonte si fondono);
//  - Parte III/IV (R8-19): `infiltrazione_area` dava alla 3ª infiltrazione la planimetria 160-5-0 (due forzieri) e alla 4ª la 160-4-0 (uno): la
//    sequenza dei campi (160_004_00.flow: 1 forziere, 160_005_00.flow: 2 forzieri e il boss) dice il contrario, come le voci (A11: un forziere; A12: due,
//    il boss). Si scambiano le due righe, solo se sono ancora quelle del seed; la 160-4-0 va a D12 e la 160-5-0 a D13;
//  - area 8 «???» (R8-19): è la prigione presso la Stanza di Velluto, dove si recuperano i compagni (script 160_010_00); le planimetrie 160-10-* vanno lì;
//    il titolo si precisa solo se è ancora «???» (la chiave e i legami restano). La 160-6-0 (ingresso del Santuario, fase finale) va a D13, dove sta la
//    voce «Entrata del Santuario», non al Santuario iniziale; le planimetrie dei Corridoi IV e V non hanno un'area omonima nel dedalo e non si
//    assegnano a caso: `mappa_dedalo.area_dedalo_chiave` resta vuoto e il rapporto le elenca;
//  - R8-19b: Iweleth conserva `regola_boss = 'memento'` (il boss segnato nella Guida, nessun effetto di Palazzo). Il rapporto conta le condizioni
//    strutturate che citano Iweleth come «Palazzo concluso» (0 attese).
//
// Conservativa e idempotente: tocca solo righe come il seed le ha scritte (voci e aree note per chiave), ferma ciò che non torna e lo mette nel
// rapporto (`dati_guida` «iweleth-confluenza-175»). Non tocca `partite.db`, il compendio, il diario, Kamoshida e Madarame. Se Iweleth o il suo dedalo non
// ci sono (un pacchetto più vecchio) non fa niente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

const DEDALO = 'mementos-08-iweleth';
/** Le voci di Iweleth scritte dal seed hanno per fonte la pagina del dedalo: un'altra fonte (o nessuna) indica una voce non della guida. */
const FONTE_IWELETH = 'https://www.allgamestaff.it/persona-5-royal/dedalo-di-iweleth';
const area = (n: number): string => `${DEDALO}-area-${n}`;

/** Infiltrazione storica → area del dedalo (corrispondenza nominale di 101; D5 e D6 senza voci nella fonte). */
const INFILTRAZIONI: ReadonlyArray<readonly [string, number, string]> = [
  ['iweleth-01-entrata-profondita-dei-memento', 1, 'Entrata'],
  ['iweleth-02-corridoio-della-prigione-parte-i', 2, 'Corridoio della prigione I'],
  ['iweleth-03-vuoto-cavernoso-parte-i', 5, 'Vuoto cavernoso I'],
  ['iweleth-04-corridoio-della-prigione-parte-ii', 3, 'Corridoio della prigione II'],
  ['iweleth-05-vuoto-cavernoso-parte-ii', 6, 'Vuoto cavernoso II'],
  ['iweleth-06-corridoio-della-prigione-parte-iii', 4, 'Corridoio della prigione III'],
  ['iweleth-07-santuario', 7, 'Santuario'],
  ['iweleth-08-piazza-stazione-shibuya-mondo-del-clifoto', 9, 'Piazza stazione Shibuya'],
  ['iweleth-09-cammino-per-il-santo-graal-parte-i', 10, 'Cammino per il Santo Graal I'],
  ['iweleth-10-cammino-per-il-santo-graal-parte-ii', 11, 'Cammino per il Santo Graal II'],
  ['iweleth-11-cammino-per-il-santo-graal-parte-iii', 12, 'Cammino per il Santo Graal III'],
  ['iweleth-12-cammino-per-il-santo-graal-parte-iv', 13, 'Cammino per il Santo Graal IV'],
];

/** Le planimetrie native → area del dedalo (null = nessuna area certa). Censimento §5 e §7. */
const MAPPE: ReadonlyArray<readonly [string, number | null, string]> = [
  ['161-1-0', 1, 'Entrata'], ['161-2-0', 2, 'Corridoio I'], ['161-2-1', 2, 'Corridoio I'], ['161-2-2', 2, 'Corridoio I'], ['161-3-0', 3, 'Corridoio II'],
  ['161-4-0', 5, 'Vuoto cavernoso I'], ['161-4-1', 5, 'Vuoto cavernoso I'], ['161-4-2', 5, 'Vuoto cavernoso I'], ['161-5-0', 4, 'Corridoio III'],
  ['161-6-0', null, 'Corridoio IV: il dedalo non ha un\'area omonima'], ['161-6-1', null, 'Corridoio IV: il dedalo non ha un\'area omonima'],
  ['161-7-0', 6, 'Vuoto cavernoso II'],
  ['161-8-0', null, 'Corridoio V: il dedalo non ha un\'area omonima'], ['161-9-0', null, 'Corridoio V: il dedalo non ha un\'area omonima'], ['161-10-0', null, 'Corridoio V: il dedalo non ha un\'area omonima'],
  ['161-11-0', 7, 'Santuario'],
  ['160-1-0', 9, 'Piazza stazione Shibuya'], ['160-2-0', 10, 'Cammino per il Santo Graal I'], ['160-3-0', 11, 'Cammino per il Santo Graal II'],
  ['160-4-0', 12, 'Cammino III (un forziere, 160_004_00.flow)'], ['160-4-1', 12, 'Cammino III'], ['160-4-2', 12, 'Cammino III'],
  ['160-5-0', 13, 'Cammino IV (due forzieri e il boss, 160_005_00.flow)'],
  ['160-6-0', 13, 'Ingresso del Santuario della fase finale (160_006_00.flow): con la voce «Entrata del Santuario», non il Santuario iniziale'],
  ['160-10-0', 8, 'Prigione presso la Stanza di Velluto: recupero dei compagni (160_010_00.flow)'], ['160-10-1', 8, 'Prigione presso la Stanza di Velluto'],
];

const PRECISAZIONE_AREA_8 = '??? (prigione presso la Stanza di Velluto: i compagni)';
const DESCRIZIONE_AREA_8 = 'Dopo il Santuario i compagni si recuperano dalle celle presso la Stanza di Velluto, prima del Mondo del Clifoto.';

export const migration175: Migration = {
  id: 175,
  name: 'iweleth_confluenza',
  up(db: AppDatabase) {
    const esiste = (t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    for (const t of ['dungeon', 'dungeon_area', 'area_dedalo', 'punto_interesse', 'ombra_voce', 'ombra_luogo', 'infiltrazione_area', 'mappa']) if (!esiste(t)) return;
    if (!db.prepare("SELECT 1 FROM main.dungeon WHERE chiave = 'iweleth'").get()) return;
    if (!db.prepare('SELECT 1 FROM main.dungeon_area WHERE chiave = ?').get(DEDALO)) return;

    db.exec(`
      CREATE TABLE IF NOT EXISTS dedalo_confluenza (
        dungeon_chiave TEXT PRIMARY KEY REFERENCES dungeon(chiave) ON DELETE CASCADE,
        dedalo_chiave  TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
        nota           TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS infiltrazione_dedalo (
        infiltrazione_chiave TEXT PRIMARY KEY REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
        area_dedalo_chiave   TEXT NOT NULL REFERENCES area_dedalo(chiave) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS infiltrazione_dedalo_area ON infiltrazione_dedalo(area_dedalo_chiave);
      CREATE TABLE IF NOT EXISTS mappa_dedalo (
        mappa_chiave       TEXT PRIMARY KEY REFERENCES mappa(chiave) ON DELETE CASCADE ON UPDATE CASCADE,
        area_dedalo_chiave TEXT REFERENCES area_dedalo(chiave) ON DELETE SET NULL,
        nota               TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS voce_confluenza (
        voce_chiave          TEXT PRIMARY KEY REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
        azione               TEXT NOT NULL CHECK (azione IN ('convertita', 'doppia')),
        voce_canonica        TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL,
        tipo_precedente      TEXT NOT NULL,
        infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
        nota                 TEXT NOT NULL DEFAULT '',
        -- com'era la voce prima della confluenza (la conversione azzera il carattere e riscrive l'ordine): niente si perde
        carattere_precedente TEXT,
        ordine_precedente    INTEGER NOT NULL DEFAULT 0
      );
    `);

    const rapporto: {
      infiltrazioniRaccordate: number; saltate: Array<{ cosa: string; motivo: string }>; vociConvertite: Array<{ voce: string; da: string; area: string }>; persona: Array<{ voce: string; canonica: string; ombra: string }>;
      luoghi: { spostati: number; fusi: number }; scambio3e4: string; area8: string; mappe: { assegnate: number; senzaArea: string[] }; condizioniCheCitanoIweleth: number; abaddon: string;
    } = { infiltrazioniRaccordate: 0, saltate: [], vociConvertite: [], persona: [], luoghi: { spostati: 0, fusi: 0 }, scambio3e4: 'non necessario', area8: 'invariata', mappe: { assegnate: 0, senzaArea: [] }, condizioniCheCitanoIweleth: 0, abaddon: 'non toccata' };

    // ---- 1. l'infiltrazione storica → l'area del dedalo ----
    const areaDedalo = db.prepare('SELECT nome FROM main.area_dedalo WHERE chiave = ? AND dedalo_chiave = ?');
    const infiltrazioneEsiste = db.prepare('SELECT 1 FROM main.dungeon_area WHERE chiave = ? AND dungeon_chiave = ?');
    const destinazione = new Map<string, string>();
    for (const [inf, n, nomeAtteso] of INFILTRAZIONI) {
      const a = areaDedalo.get(area(n), DEDALO) as { nome: string } | undefined;
      if (!infiltrazioneEsiste.get(inf, 'iweleth')) { rapporto.saltate.push({ cosa: inf, motivo: 'l\'infiltrazione non c\'è più' }); continue; }
      if (!a) { rapporto.saltate.push({ cosa: inf, motivo: `l'area ${area(n)} del dedalo non c'è più` }); continue; }
      if (a.nome !== nomeAtteso) rapporto.saltate.push({ cosa: `${inf} → ${area(n)}`, motivo: `l'area si chiama «${a.nome}», non «${nomeAtteso}»: raccordata lo stesso per chiave (101), da riconoscere a mano se è stata rinominata` });
      db.prepare('INSERT OR IGNORE INTO main.infiltrazione_dedalo (infiltrazione_chiave, area_dedalo_chiave) VALUES (?, ?)').run(inf, area(n));
      destinazione.set(inf, area(n));
      rapporto.infiltrazioniRaccordate++;
    }
    db.prepare("INSERT OR IGNORE INTO main.dedalo_confluenza (dungeon_chiave, dedalo_chiave, nota) VALUES ('iweleth', ?, ?)")
      .run(DEDALO, 'L8 B7: Iweleth esiste solo come dedalo dei Memento; le righe del Palazzo sono l\'archivio (migrazione 175)');

    // ---- 2. Parte III/IV: la 3ª infiltrazione prende la 160-4-0, la 4ª la 160-5-0 ----
    const terza = 'iweleth-11-cammino-per-il-santo-graal-parte-iii';
    const quarta = 'iweleth-12-cammino-per-il-santo-graal-parte-iv';
    const ia = db.prepare('SELECT area_chiave, planimetria_iniziale, origine FROM main.infiltrazione_area WHERE infiltrazione_chiave = ?');
    const t = ia.get(terza) as { area_chiave: string; planimetria_iniziale: string | null; origine: string } | undefined;
    const q = ia.get(quarta) as { area_chiave: string; planimetria_iniziale: string | null; origine: string } | undefined;
    if (t && q && t.origine === 'seed' && q.origine === 'seed' && t.planimetria_iniziale === 'nativo-rmap-160-5-0' && q.planimetria_iniziale === 'nativo-rmap-160-4-0') {
      const upd = db.prepare('UPDATE main.infiltrazione_area SET area_chiave = ?, planimetria_iniziale = ? WHERE infiltrazione_chiave = ?');
      upd.run(q.area_chiave, q.planimetria_iniziale, terza);
      upd.run(t.area_chiave, t.planimetria_iniziale, quarta);
      rapporto.scambio3e4 = 'scambiate: 3ª infiltrazione → 160-4-0, 4ª → 160-5-0';
    } else if (t && q && t.planimetria_iniziale === 'nativo-rmap-160-4-0' && q.planimetria_iniziale === 'nativo-rmap-160-5-0') {
      rapporto.scambio3e4 = 'già nell\'ordine giusto';
    } else {
      rapporto.scambio3e4 = 'non toccate: righe modificate dopo il seed o diverse da quelle attese';
      rapporto.saltate.push({ cosa: 'Parte III/IV', motivo: rapporto.scambio3e4 });
    }

    // ---- 3. area 8 «???» ----
    const a8 = db.prepare('SELECT nome, descrizione FROM main.area_dedalo WHERE chiave = ?').get(area(8)) as { nome: string; descrizione: string } | undefined;
    if (a8 && a8.nome === '???') {
      db.prepare('UPDATE main.area_dedalo SET nome = ?, descrizione = CASE WHEN descrizione = \'\' THEN ? ELSE descrizione END WHERE chiave = ?').run(PRECISAZIONE_AREA_8, DESCRIZIONE_AREA_8, area(8));
      rapporto.area8 = `titolo precisato: «${PRECISAZIONE_AREA_8}»`;
    } else if (a8) rapporto.area8 = `titolo lasciato («${a8.nome}»): non è più «???»`;
    else rapporto.saltate.push({ cosa: area(8), motivo: 'l\'area 8 non c\'è più' });

    // ---- 4. le voci: Trama nel dedalo; le Persona doppie puntano alla voce del dedalo ----
    const voci = db.prepare(`SELECT p.chiave, p.tipo, p.ordine, p.area_chiave, p.carattere, p.fonte, a.ordine AS ordine_infiltrazione FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave
      WHERE a.dungeon_chiave = 'iweleth' ORDER BY a.ordine, p.ordine, p.chiave`).all() as Array<{ chiave: string; tipo: string; ordine: number; area_chiave: string; carattere: string | null; fonte: string; ordine_infiltrazione: number }>;
    const ombraDi = db.prepare('SELECT ombra_chiave FROM main.ombra_voce WHERE voce_chiave = ?');
    const duplicataDi = db.prepare(`SELECT p.chiave FROM main.ombra_voce ov JOIN main.punto_interesse p ON p.chiave = ov.voce_chiave
      WHERE ov.ombra_chiave = ? AND p.area_chiave = ? AND p.tipo = 'persona'`);
    const inserisciGrezzo = db.prepare('INSERT OR IGNORE INTO main.voce_confluenza (voce_chiave, azione, voce_canonica, tipo_precedente, infiltrazione_chiave, nota, carattere_precedente, ordine_precedente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    let corrente: { carattere: string | null; ordine: number } = { carattere: null, ordine: 0 };
    const inserisci = { run: (voce: string, azione: string, canonica: string | null, tipo: string, infiltrazione: string, nota: string) => inserisciGrezzo.run(voce, azione, canonica, tipo, infiltrazione, nota, corrente.carattere, corrente.ordine) };
    const converti = db.prepare("UPDATE main.punto_interesse SET tipo = 'trama', area_chiave = ?, area_dedalo_chiave = ?, ordine = ?, carattere = NULL WHERE chiave = ?");
    let abaddon: string | null = null;
    for (const v of voci) {
      if (db.prepare('SELECT 1 FROM main.voce_confluenza WHERE voce_chiave = ?').get(v.chiave)) continue;
      // si tocca solo una voce della guida come il seed l'ha scritta: la fonte è la pagina del dedalo di Iweleth; una voce di altra origine resta com'è
      if (!v.fonte.startsWith(FONTE_IWELETH)) { rapporto.saltate.push({ cosa: v.chiave, motivo: 'la voce non viene dalla guida del dedalo di Iweleth (fonte diversa): resta com\'è' }); continue; }
      corrente = { carattere: v.carattere, ordine: v.ordine };
      if (v.tipo === 'persona') {
        const om = ombraDi.get(v.chiave) as { ombra_chiave: string } | undefined;
        const canonica = om ? (duplicataDi.get(om.ombra_chiave, DEDALO) as { chiave: string } | undefined)?.chiave : undefined;
        if (!om || !canonica) { rapporto.saltate.push({ cosa: v.chiave, motivo: 'Persona senza Ombra o senza la voce corrispondente nel dedalo: resta com\'è' }); continue; }
        inserisci.run(v.chiave, 'doppia', canonica, 'persona', v.area_chiave, `Stessa Ombra («${om.ombra_chiave}») e stessa Persona della voce del dedalo: lo stato è uno solo, nel compendio della partita.`);
        rapporto.persona.push({ voce: v.chiave, canonica, ombra: om.ombra_chiave });
        continue;
      }
      const dest = destinazione.get(v.area_chiave);
      if (!dest) { rapporto.saltate.push({ cosa: v.chiave, motivo: 'l\'infiltrazione non ha un\'area del dedalo: la voce resta nell\'archivio' }); continue; }
      inserisci.run(v.chiave, 'convertita', null, v.tipo, v.area_chiave, v.tipo === 'ombra-sciagura' ? 'Re abissale dell\'avarizia (Abaddon): per Royal è un\'Ombra comune con la sua Persona (Depths, Irritable). Il combattimento resta qui come Trama; la cattura è la voce Persona del dedalo.' : '');
      // dopo le voci proprie del dedalo (0..15), nell'ordine di prima: infiltrazione, poi ordine nell'infiltrazione
      converti.run(DEDALO, dest, 1000 + v.ordine_infiltrazione * 100 + v.ordine, v.chiave);
      rapporto.vociConvertite.push({ voce: v.chiave, da: v.tipo, area: dest });
      if (v.tipo === 'ombra-sciagura' && v.chiave === 'iweleth-04-corridoio-della-prigione-parte-ii/3') abaddon = v.chiave;
    }
    if (abaddon) {
      const o = db.prepare('SELECT ombra_chiave FROM main.ombra_voce WHERE voce_chiave = ?').pluck().get('mementos-08-iweleth/14') as string | undefined;
      if (o) {
        db.prepare('INSERT OR IGNORE INTO main.ombra_voce (voce_chiave, ombra_chiave) VALUES (?, ?)').run(abaddon, o);
        rapporto.abaddon = `voce convertita in Trama e collegata all'Ombra «${o}» (la stessa del dedalo)`;
      } else rapporto.abaddon = 'voce convertita in Trama; l\'Ombra del dedalo (/14) non c\'è: nessun collegamento';
    }

    // ---- 5. i luoghi d'incontro: dal «Palazzo di Iweleth» al dedalo ----
    const luoghi = db.prepare("SELECT id, ombra_chiave, infiltrazione_chiave, fonte FROM main.ombra_luogo WHERE dungeon_chiave = 'iweleth' ORDER BY id").all() as Array<{ id: number; ombra_chiave: string; infiltrazione_chiave: string | null; fonte: string }>;
    for (const l of luoghi) {
      const uguale = db.prepare("SELECT 1 FROM main.ombra_luogo WHERE ombra_chiave = ? AND dungeon_chiave = 'mementos' AND infiltrazione_chiave = ? AND fonte = ?").get(l.ombra_chiave, DEDALO, l.fonte);
      if (uguale) { db.prepare('DELETE FROM main.ombra_luogo WHERE id = ?').run(l.id); rapporto.luoghi.fusi++; } else {
        db.prepare("UPDATE main.ombra_luogo SET dungeon_chiave = 'mementos', infiltrazione_chiave = ? WHERE id = ?").run(DEDALO, l.id);
        rapporto.luoghi.spostati++;
      }
    }

    // ---- 6. le planimetrie: a quale area del dedalo si consultano ----
    const mappa = db.prepare('SELECT 1 FROM main.mappa WHERE chiave = ?');
    const haArea = db.prepare('SELECT 1 FROM main.area_dedalo WHERE chiave = ?');
    for (const [codice, n, nota] of MAPPE) {
      const chiave = `nativo-rmap-${codice}`;
      if (!mappa.get(chiave)) { rapporto.saltate.push({ cosa: chiave, motivo: 'la planimetria non c\'è' }); continue; }
      const dest = n !== null && haArea.get(area(n)) ? area(n) : null;
      db.prepare('INSERT OR IGNORE INTO main.mappa_dedalo (mappa_chiave, area_dedalo_chiave, nota) VALUES (?, ?, ?)').run(chiave, dest, nota);
      if (dest) rapporto.mappe.assegnate++; else rapporto.mappe.senzaArea.push(chiave);
    }

    // ---- 7. R8-19b: nessuna condizione «Palazzo concluso» cita Iweleth ----
    for (const { tabella, colonna } of [{ tabella: 'negozio', colonna: 'sblocco_json' }]) {
      if (!esiste(tabella)) continue;
      const n = db.prepare(`SELECT COUNT(*) FROM main.${tabella} WHERE ${colonna} LIKE '%iweleth%' AND (${colonna} LIKE '%palazzo-concluso%' OR ${colonna} LIKE '%finestra-palazzo%')`).pluck().get() as number;
      rapporto.condizioniCheCitanoIweleth += n;
    }

    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('iweleth-confluenza-175', JSON.stringify({
      versione: 1,
      fonti: 'censimento pubblico di Iweleth (lotti/L8/censimento-iweleth-pubblico.md); script originali 160_004_00, 160_005_00, 160_006_00, 160_010_00 (§7); Royal: aqiu384 roy-enemy-data.json (Abaddon)',
      ...rapporto,
      nonFatto: 'Le planimetrie dei Corridoi IV e V non hanno un\'area omonima nel dedalo e non sono state assegnate (mappa_dedalo.area_dedalo_chiave vuoto): nessuna assegnazione dal solo nome. Le collocazioni storiche di singoli oggetti (Gilet, Ascia, Araldo, Catena di perline) restano quelle del pacchetto.',
    }));
    logger.info({
      infiltrazioni: rapporto.infiltrazioniRaccordate, convertite: rapporto.vociConvertite.length, persona: rapporto.persona.length, luoghi: rapporto.luoghi, mappe: rapporto.mappe.assegnate, senzaArea: rapporto.mappe.senzaArea.length, saltate: rapporto.saltate.length,
    }, 'migrazione 175: Iweleth confluisce nel dedalo dei Memento');
  },
};
