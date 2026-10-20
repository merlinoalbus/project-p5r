// ============================================================
// 110 — le Aree dei Palazzi e i legami infiltrazione ↔ area; il campo «Infiltrazioni» del diario e le voci «da rivedere» (L3, 2026-10-20)
// ============================================================
//
// Lotto L3 del piano di razionalizzazione (lotti/L3/modifiche.md §1–§2). Gerarchia voluta dall'utente: **Città → Palazzo → Area →
// Planimetria**, con le **infiltrazioni** (`dungeon_area`, nome invariato nel codice) legate alle Aree **molti a molti**. Fino a qui le
// «stanze» di un Palazzo erano planimetrie sciolte sotto `dungeon-<k>`, tenute insieme solo dal gruppo d'immagini della presentazione, e
// il legame con le infiltrazioni stava per planimetria in `mappa_entita`. La migrazione **sposta i legami, non i contenuti**:
//   1. tabelle nuove `infiltrazione_area`, `voce_infiltrazione` (l'insieme ordinato di infiltrazioni di una voce del diario, scritto solo
//      dall'utente) e `proposta_infiltrazione_voce` (le proposte di G-022 dell'Esperto della guida); colonne nuove di `voce_giornata` per
//      il meccanismo unico «da rivedere» (§1.4, lo riusa L10);
//   2. un'Area (tabella `area` di L2, con `dungeon_chiave`) per ogni gruppo d'immagini e per ogni planimetria sciolta dei Palazzi (tutti
//      tranne i Memento, R3-12; Iweleth compreso), col nome che la pagina mostra oggi (`titoloGruppoImmagini`/`nomePresentazioneMappa`,
//      copiati qui sotto con `senzaGergo`); le planimetrie ricevono area, versione ed etichetta;
//   3. i legami infiltrazione ↔ area dai legami di oggi per planimetria, più l'unica coppia dedotta da un pin (777, `origine='regola'`);
//   4. le proposte di G-022 per 37 voci (34 + le tre col riferimento a un Confidente), nessun legame scritto;
//   5. le correzioni del team dopo il 06-01 (F4, N1–N3, B1, S1), la voce solo segnalata dell'11-13 sera e la voce nuova del 06-26, con il
//      testo precedente conservato e `da_rivedere = 1`. Il diario validato 04-01..06-01 **non si tocca**: un uid di quei giorni ferma tutto.
// Nessuna chiave di mappa, voce, pin o infiltrazione cambia; nessun pin cambia mappa, posizione o riferimento; le fonti vecchie
// (`mappa_entita` di tipo area, `mappa.entita_*`, `gruppo_immagini_json`) restano fino a L11. Ogni valore atteso si controlla prima di
// scrivere: una differenza ferma la migrazione con un errore leggibile. Si può rieseguire: la seconda volta non tocca niente.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

// ------------------------------------------------------------
// Schema
// ------------------------------------------------------------

function colonne(db: AppDatabase, tabella: string): Set<string> {
  return new Set((db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
}

/** Le tabelle dei legami, del diario e delle proposte; le colonne «da rivedere» di `voce_giornata` (solo se mancano). */
function creaSchema(db: AppDatabase): void {
  db.exec(`CREATE TABLE IF NOT EXISTS infiltrazione_area (
    infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
    area_chiave          TEXT NOT NULL REFERENCES area(chiave) ON DELETE CASCADE,
    ordine               INTEGER NOT NULL DEFAULT 0,
    planimetria_iniziale TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
    origine              TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed', 'utente', 'regola')),
    PRIMARY KEY (infiltrazione_chiave, area_chiave)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS infiltrazione_area_area ON infiltrazione_area (area_chiave)');
  // la chiave è la posizione: la stessa infiltrazione può tornare nell'insieme (N2, 11-14: 10, 11, 12, 11, 13)
  db.exec(`CREATE TABLE IF NOT EXISTS voce_infiltrazione (
    voce_uid             TEXT NOT NULL,
    ordine               INTEGER NOT NULL,
    infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
    PRIMARY KEY (voce_uid, ordine)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS voce_infiltrazione_infiltrazione ON voce_infiltrazione (infiltrazione_chiave)');
  db.exec(`CREATE TABLE IF NOT EXISTS proposta_infiltrazione_voce (
    voce_uid             TEXT NOT NULL,
    ordine               INTEGER NOT NULL,
    infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
    regola               TEXT NOT NULL CHECK (regola IN ('nome-nel-testo', 'data-nel-nome', 'ordine', 'orari-dei-segni', 'inizio-fine', 'boss-finale', 'letta-voce-per-voce')),
    motivo               TEXT NOT NULL,
    certezza             TEXT NOT NULL CHECK (certezza IN ('certa', 'multipla', 'probabile')),
    PRIMARY KEY (voce_uid, ordine)
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS proposta_infiltrazione_voce_infiltrazione ON proposta_infiltrazione_voce (infiltrazione_chiave)');
  const v = colonne(db, 'voce_giornata');
  if (!v.has('da_rivedere')) db.exec('ALTER TABLE voce_giornata ADD COLUMN da_rivedere INTEGER NOT NULL DEFAULT 0');
  if (!v.has('aggiunta_da')) db.exec("ALTER TABLE voce_giornata ADD COLUMN aggiunta_da TEXT");
  if (!v.has('testo_precedente_json')) db.exec('ALTER TABLE voce_giornata ADD COLUMN testo_precedente_json TEXT');
  if (!v.has('motivo_revisione')) db.exec('ALTER TABLE voce_giornata ADD COLUMN motivo_revisione TEXT');
}

// ------------------------------------------------------------
// Il nome dell'Area: copia della resa dell'interfaccia di oggi (src/utils/presentazioneMappa.ts, shared/nomiMappe.ts)
// ------------------------------------------------------------

interface Contesto { id: string; nome: string | null }
interface Gruppo { id: string; nome: string; ordine: number; etichetta?: string; nomeRivisto?: boolean }
/** Ciò che serve per presentare una planimetria come la presenta la pagina del Palazzo. */
export interface IdentitaPlanimetria110 { nome: string; contesti: Contesto[]; gruppoImmagini: Gruppo | null; genitoreNome: string | null; nomeRivisto: boolean }

/** `senzaGergo` di shared/nomiMappe.ts, copiata: il vocabolario dell'estrattore non arriva a chi gioca. */
function senzaGergo(nome: string): string {
  const i = nome.search(/(?:\s*—\s*)?Immagini native che nessun campo usa/i);
  if (i < 0) return nome;
  const prefisso = nome.slice(0, i).replace(/\s*—\s*$/, '');
  return prefisso ? `${prefisso} — Planimetria non attribuita` : 'Planimetria non attribuita';
}

/** `nomePresentazioneMappa` senza contesto selezionato, copiata (con `alternativeMappa` e `nomeConVersione`). */
function nomePresentazione(m: IdentitaPlanimetria110): string {
  if (m.nomeRivisto) return m.nome;
  if (m.contesti.some((c) => c.nome === null)) return m.genitoreNome ? `${m.genitoreNome} — Planimetria` : 'Planimetria';
  const gruppi = new Map<string, string | null>();
  for (const c of m.contesti) {
    const chiave = c.nome === null ? `ignoto:${c.id}` : `nome:${c.nome}`;
    if (!gruppi.has(chiave)) gruppi.set(chiave, c.nome);
  }
  const base = [...gruppi.values()].join(' / ') || m.gruppoImmagini?.nome || m.nome;
  const etichetta = m.gruppoImmagini?.etichetta;
  return senzaGergo(etichetta ? `${base} — ${etichetta}` : base);
}

/**
 * Il nome dell'Area e se è un nome rivisto da una persona: per un gruppo `titoloGruppoImmagini` della versione predefinita, per una
 * sciolta `nomePresentazioneMappa` (lotti/L3/modifiche.md §2.1.2, dati §5.1). Esportata per il test dorato sui 117 nomi.
 */
export function nomeAreaPalazzo110(predefinita: IdentitaPlanimetria110): { nome: string; rivisto: boolean } {
  const g = predefinita.gruppoImmagini;
  if (g) {
    if (g.nomeRivisto) return { nome: g.nome, rivisto: true };
    if (predefinita.nomeRivisto) return { nome: predefinita.nome, rivisto: true };
    return { nome: senzaGergo(g.nome), rivisto: false };
  }
  return { nome: nomePresentazione(predefinita), rivisto: predefinita.nomeRivisto };
}

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree (come la 109). */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** La regola di `shared/slug.ts`, copiata (come la 109). */
function slug(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

function gruppoDi(json: string | null): Gruppo | null {
  if (!json) return null;
  try {
    const g = JSON.parse(json) as Partial<Gruppo>;
    return typeof g.id === 'string' && g.id.length > 0
      ? { id: g.id, nome: typeof g.nome === 'string' ? g.nome : '', ordine: Number.isInteger(g.ordine) ? g.ordine! : 0, etichetta: typeof g.etichetta === 'string' && g.etichetta ? g.etichetta : undefined, nomeRivisto: g.nomeRivisto === true }
      : null;
  } catch {
    return null;
  }
}

function contestiDi(json: string | null): Contesto[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((c): c is { id: string; nome?: unknown } => !!c && typeof (c as { id?: unknown }).id === 'string').map((c) => ({ id: c.id, nome: typeof c.nome === 'string' ? c.nome : null })) : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// Aree, versioni e legami
// ------------------------------------------------------------

interface RigaPlanimetria { chiave: string; nome: string; ordine: number; origine: string; nome_rivisto: number; dungeon: string; genitore_nome: string | null; gruppo_json: string | null; contesti_json: string | null }

/** Esito della regola delle Aree dei Palazzi: per il log e per i test. */
export interface EsitoAreePalazzi { aree: number; planimetrie: number; etichette: number; legami: number; legamiDaRegola: number }

/** Il pin 777: la sola coppia infiltrazione ↔ area deducibile dai pin in tutta la base (dati.md §2, dubbio 2). */
const COPPIA_PIN_777 = { infiltrazione: 'madarame-il-furto-del-cuore-di-madarame', planimetria: 'nativo-rmap-153-5-0' };

/**
 * La regola delle Aree dei Palazzi (passi 2–5 del §2.1): le planimetrie figlie di `dungeon-<k>` (ogni Palazzo tranne i Memento, tutti i
 * tipi) ancora senza Area si raggruppano per gruppo d'immagini, una per Area se sciolte; poi i legami di `mappa_entita` diventano legami
 * infiltrazione ↔ area, e si aggiunge la coppia del pin 777. Un'Area o un legame esistente non si ricrea. È anche la regola con cui
 * l'import di un pacchetto di prima assegna le Aree ai Palazzi (`assegnaAreePalazzi` del servizio).
 */
export function assegnaAreePalazzi110(db: AppDatabase, adesso: string): EsitoAreePalazzi {
  const esito: EsitoAreePalazzi = { aree: 0, planimetrie: 0, etichette: 0, legami: 0, legamiDaRegola: 0 };
  const righe = db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, d.chiave AS dungeon,
      r.nome AS genitore_nome, p.gruppo_immagini_json AS gruppo_json, p.contesti_json
    FROM mappa m
    JOIN mappa r ON r.chiave = m.genitore_chiave
    JOIN dungeon d ON r.chiave = 'dungeon-' || d.chiave AND d.tipo = 'palazzo'
    LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
    WHERE m.area_chiave IS NULL`).all() as RigaPlanimetria[];
  // Palazzo → gruppo (o sciolta) → planimetrie
  const perPalazzo = new Map<string, Map<string, RigaPlanimetria[]>>();
  for (const r of righe) {
    const g = gruppoDi(r.gruppo_json);
    const id = g ? `g:${g.id}` : `m:${r.chiave}`;
    const gruppi = perPalazzo.get(r.dungeon) ?? new Map<string, RigaPlanimetria[]>();
    gruppi.set(id, [...(gruppi.get(id) ?? []), r]);
    perPalazzo.set(r.dungeon, gruppi);
  }
  const inserisci = db.prepare(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
    VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`);
  const lega = db.prepare('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ? WHERE chiave = ? AND area_chiave IS NULL');
  // le Aree nate in questa chiamata: solo per loro i legami si ricavano dalle fonti vecchie. Sulla prima esecuzione sono tutte; dopo
  // (l'import di un pacchetto di prima, `assegnaAreePalazzi`) una riga vecchia di `mappa_entita` non deve rimettere un legame che
  // l'utente ha tolto dall'Area
  const nuove = new Set<string>();
  for (const [dungeon, gruppi] of [...perPalazzo].sort(([a], [b]) => a.localeCompare(b))) {
    const giaUsati = new Set((db.prepare('SELECT slug FROM area WHERE dungeon_chiave = ?').all(dungeon) as Array<{ slug: string }>).map((r) => r.slug));
    // le versioni nell'ordine di mappa (decisione PM b), poi per chiave; le Aree nell'ordine della loro prima planimetria
    const aree = [...gruppi.values()].map((ms) => [...ms].sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)))
      .sort((a, b) => a[0].ordine - b[0].ordine || a[0].chiave.localeCompare(b[0].chiave));
    for (const ms of aree) {
      // la predefinita: la versione #0 del gruppo (per 153-7-0 «Livello -2», l'ultima nell'ordine di mappa); a parità, la prima di mappa
      const predefinita = [...ms].sort((a, b) => (gruppoDi(a.gruppo_json)?.ordine ?? 0) - (gruppoDi(b.gruppo_json)?.ordine ?? 0))[0];
      const gruppo = gruppoDi(predefinita.gruppo_json);
      const { nome, rivisto } = nomeAreaPalazzo110({ nome: predefinita.nome, contesti: contestiDi(predefinita.contesti_json), gruppoImmagini: gruppo, genitoreNome: predefinita.genitore_nome, nomeRivisto: predefinita.nome_rivisto === 1 });
      let s = slug(nome) || 'area';
      if (SLUG_RISERVATI.has(s)) s = `${s}-area`;
      let candidato = s; let n = 2;
      while (giaUsati.has(candidato)) candidato = `${s}-${n++}`;
      giaUsati.add(candidato);
      const chiave = `dungeon/${dungeon}/${candidato}`;
      const utente = ms.some((r) => r.origine === 'utente' || r.nome_rivisto === 1) || !!gruppo?.id.startsWith('utente:');
      inserisci.run(chiave, dungeon, candidato, nome.trim(), rivisto ? 1 : 0, ms[0].ordine, predefinita.chiave, utente ? 'utente' : 'seed', adesso);
      nuove.add(chiave);
      esito.aree++;
      ms.forEach((r, v) => {
        const etichetta = gruppoDi(r.gruppo_json)?.etichetta?.trim() || null;
        esito.planimetrie += lega.run(chiave, v, etichetta, r.chiave).changes;
        if (etichetta) esito.etichette++;
      });
    }
  }
  // i legami: per ogni infiltrazione, le Aree delle planimetrie a cui era legata (con la loro origine), più la coppia del pin 777
  interface Legame { infiltrazione: string; area: string; dungeon: string; ordineMin: number; ordineArea: number; iniziale: string; origine: 'seed' | 'utente' | 'regola' }
  const legati = db.prepare(`SELECT me.entita_chiave AS infiltrazione, m.area_chiave AS area, a.dungeon_chiave AS dungeon, m.ordine, m.chiave, me.fonte_json, ar.ordine AS ordine_area
    FROM mappa_entita me
    JOIN mappa m ON m.chiave = me.mappa_chiave AND m.area_chiave IS NOT NULL
    JOIN area ar ON ar.chiave = m.area_chiave AND ar.dungeon_chiave IS NOT NULL
    JOIN dungeon_area a ON a.chiave = me.entita_chiave AND a.dungeon_chiave = ar.dungeon_chiave
    WHERE me.entita_tipo = 'area'
    ORDER BY m.ordine, m.chiave`).all() as Array<{ infiltrazione: string; area: string; dungeon: string; ordine: number; chiave: string; fonte_json: string; ordine_area: number }>;
  const coppie = new Map<string, Legame>();
  for (const l of legati) {
    if (!nuove.has(l.area)) continue;
    let seed = false;
    try { seed = (JSON.parse(l.fonte_json) as { origine?: unknown }).origine === 'seed'; } catch { /* una fonte illeggibile è dell'utente */ }
    const id = `${l.infiltrazione}\u0000${l.area}`;
    const c = coppie.get(id);
    if (!c) coppie.set(id, { infiltrazione: l.infiltrazione, area: l.area, dungeon: l.dungeon, ordineMin: l.ordine, ordineArea: l.ordine_area, iniziale: l.chiave, origine: seed ? 'seed' : 'utente' });
    // seed solo se tutte le righe della coppia lo sono; la planimetria iniziale è la prima di mappa (righe già in quell'ordine)
    else if (!seed) c.origine = 'utente';
  }
  const pin = db.prepare(`SELECT m.area_chiave AS area, m.ordine, ar.ordine AS ordine_area, ar.dungeon_chiave AS dungeon FROM mappa m JOIN area ar ON ar.chiave = m.area_chiave
    JOIN dungeon_area a ON a.chiave = ? AND a.dungeon_chiave = ar.dungeon_chiave WHERE m.chiave = ?`).get(COPPIA_PIN_777.infiltrazione, COPPIA_PIN_777.planimetria) as { area: string; ordine: number; ordine_area: number; dungeon: string } | undefined;
  if (pin && nuove.has(pin.area) && !coppie.has(`${COPPIA_PIN_777.infiltrazione}\u0000${pin.area}`)) {
    coppie.set(`${COPPIA_PIN_777.infiltrazione}\u0000${pin.area}`, { infiltrazione: COPPIA_PIN_777.infiltrazione, area: pin.area, dungeon: pin.dungeon, ordineMin: pin.ordine, ordineArea: pin.ordine_area, iniziale: COPPIA_PIN_777.planimetria, origine: 'regola' });
  }
  // l'ordine delle Aree dentro ogni infiltrazione: dopo quelle che ha già, nell'ordine della prima planimetria legata, poi dell'Area
  const perInfiltrazione = new Map<string, Legame[]>();
  for (const c of coppie.values()) perInfiltrazione.set(c.infiltrazione, [...(perInfiltrazione.get(c.infiltrazione) ?? []), c]);
  const esiste = db.prepare('SELECT 1 FROM infiltrazione_area WHERE infiltrazione_chiave = ? AND area_chiave = ?');
  const inserisciLegame = db.prepare('INSERT OR IGNORE INTO infiltrazione_area (infiltrazione_chiave, area_chiave, ordine, planimetria_iniziale, origine) VALUES (?, ?, ?, ?, ?)');
  for (const [infiltrazione, ls] of [...perInfiltrazione].sort(([a], [b]) => a.localeCompare(b))) {
    let prossimo = (db.prepare('SELECT COALESCE(MAX(ordine) + 1, 0) AS n FROM infiltrazione_area WHERE infiltrazione_chiave = ?').get(infiltrazione) as { n: number }).n;
    for (const l of ls.sort((a, b) => a.ordineMin - b.ordineMin || a.ordineArea - b.ordineArea || a.area.localeCompare(b.area))) {
      if (esiste.get(l.infiltrazione, l.area)) continue;
      const fatte = inserisciLegame.run(l.infiltrazione, l.area, prossimo++, l.iniziale, l.origine).changes;
      esito.legami += fatte;
      if (l.origine === 'regola') esito.legamiDaRegola += fatte;
    }
  }
  return esito;
}

// ------------------------------------------------------------
// Diario: proposte di G-022 (guida/registro.md) e correzioni del team
// ------------------------------------------------------------

/** Il diario validato dall'utente (04-01..06-01, 254 voci): nessuna scrittura. `MM-DD`, anno di gioco da aprile a marzo: BETWEEN, non `<=`. */
function nelValidato(data: string): boolean {
  return data >= '04-01' && data <= '06-01';
}

/**
 * Le infiltrazioni come le numera G-022 («0 Entrata del Casinò»): numero d'ordine nel Palazzo → chiave e nome dell'app. La migrazione
 * controlla che la chiave esista, sia di quel Palazzo, abbia quell'ordine e quel nome: una differenza la ferma (mai un abbinamento a occhio).
 */
export const INFILTRAZIONI: Record<string, ReadonlyArray<readonly [string, string]>> = {
  kamoshida: [
    ['kamoshida-1-tutorial-palazzo-11-04', 'Tutorial Palazzo 11/04'], ['kamoshida-tutorial-palazzo-12-04', 'Tutorial Palazzo 12/04'],
    ['kamoshida-tutorial-palazzo-15-04', 'Tutorial Palazzo 15/04'], ['kamoshida-01-cancello-del-castello-ingresso', 'Vecchio Castello'],
    ['kamoshida-13-tetto', 'Tetto del Vecchio Castello'], ['kamoshida-15-torre-centrale', 'Ispeziona l’interno della torre'],
    ['kamoshida-rubare-i-desideri-del-cuore', 'Rubare i desideri del Cuore'],
  ],
  madarame: [
    ['madarame-01-entrata-del-museo', 'Prima Infiltrazione al Museo'], ['madarame-scopri-dove-il-tesoro', "Scopri dov'è il Tesoro"],
    ['madarame-disabilita-i-sistemi-di-sicurezza', 'Disabilita i sistemi di sicurezza'], ['madarame-nelle-profondita-del-museo', 'Nelle profondità del Museo'],
    ['madarame-il-furto-del-cuore-di-madarame', 'Il furto del Cuore di Madarame'],
  ],
  kaneshiro: [
    ['kaneshiro-01-sala-d-ingresso', "Sala d'ingresso"], ['kaneshiro-02-corridoio-dei-banchieri', 'Corridoio dei banchieri'],
    ['kaneshiro-03-ufficio-riciclaggio', 'Ufficio riciclaggio'], ['kaneshiro-04-caveau-sotterraneo', 'Caveau sotterraneo'],
  ],
  futaba: [
    ['futaba-01-entrata-della-piramide', 'Entrata della piramide'],
    ['futaba-02-corridoio-principale-grande-corridoio-della-piramide-prima-s', 'Corridoio principale (Grande Corridoio della Piramide) - prima sezione'],
    ['futaba-03-citta-nel-deserto', 'Città nel deserto'],
    ['futaba-04-caverna-passaggio-sotterraneo-della-piramide-livelli-1p-e-2p', 'Caverna/Passaggio sotterraneo della piramide (livelli 1P e 2P)'],
    ['futaba-05-camera-dei-sarcofagi', 'Camera dei sarcofagi'], ['futaba-06-corridoio-principale-sezione-centrale', 'Corridoio principale - sezione centrale'],
    ['futaba-07-camera-del-rigetto-chamber-of-rejection', 'Camera del rigetto (Chamber of Rejection)'],
    ['futaba-08-camera-del-rimorso-chamber-of-guilt', 'Camera del rimorso (Chamber of Guilt)'],
    ['futaba-09-camera-del-santuario-chamber-of-sanctuary', 'Camera del santuario (Chamber of Sanctuary)'],
    ['futaba-10-santuario-interno-camera-del-vuoto-area-finale-dato-parzialm', 'Santuario Interno / Camera del Vuoto (area finale) - dato parzialmente non-allgamestaff'],
  ],
  okumura: [
    ['okumura-01-entrata-laterale', 'Entrata Laterale'], ['okumura-02-corridoi-del-complesso', 'Corridoi del Complesso'], ['okumura-03-caserma', 'Caserma'],
    ['okumura-04-dintorni-del-complesso', 'Dintorni del Complesso'], ['okumura-05-linea-esportazioni', 'Linea Esportazioni'],
    ['okumura-06-linea-di-produzione', 'Linea di Produzione'], ['okumura-07-linea-di-smaltimento', 'Linea di Smaltimento'],
    ['okumura-08-fabbrica-centrale', 'Fabbrica Centrale'], ['okumura-09-interscambio', 'Interscambio'], ['okumura-10-produzione-armamenti', 'Produzione Armamenti'],
  ],
  niijima: [
    ['niijima-01-entrata-del-casino', 'Entrata del Casinò'], ['niijima-02-piano-terra', 'Piano terra'],
    ['niijima-03-area-riservata-allo-staff-parte-i', 'Area riservata allo staff — Parte I'], ['niijima-04-area-riservata-allo-staff-parte-ii', 'Area riservata allo staff — Parte II'],
    ['niijima-05-area-riservata-allo-staff-parte-iii', 'Area riservata allo staff — Parte III'], ['niijima-06-lobby-piano-riservato-ai-soci', 'Lobby piano riservato ai soci'],
    ['niijima-07-area-dadi-parte-i', 'Area dadi — Parte I'], ['niijima-08-area-dadi-parte-ii', 'Area dadi — Parte II'],
    ['niijima-09-stanza-slot-machine-1', 'Stanza slot machine 1'], ['niijima-10-stanza-slot-machine-2', 'Stanza slot machine 2'],
    ['niijima-11-lobby-piano-puntate-alte', 'Lobby piano puntate alte'], ['niijima-12-arena-combattimenti', 'Arena combattimenti'],
    ['niijima-13-oscura-dimora', 'Oscura dimora'], ['niijima-14-direzione-sala-del-boss', 'Direzione (sala del boss)'],
  ],
  shido: [
    ['shido-01-passaggio-centrale-sala-d-ingresso', "Passaggio Centrale / Sala d'Ingresso"], ['shido-02-sala-centrale', 'Sala Centrale'], ['shido-03-ristorante', 'Ristorante'],
    ['shido-04-corridoio-mezzavia-tribordo', 'Corridoio Mezzavia Tribordo'], ['shido-05-ponte-piscina', 'Ponte Piscina'],
    ['shido-06-corridoio-superiore-tribordo', 'Corridoio Superiore Tribordo'], ['shido-07-ponte-di-poppa', 'Ponte di Poppa'], ['shido-08-sala-intrattenimento', 'Sala Intrattenimento'],
    ['shido-09-corridoio-inferiore-babordo', 'Corridoio Inferiore Babordo'], ['shido-10-ponte-laterale-parte-i', 'Ponte Laterale - Parte I'],
    ['shido-11-corridoio-mezzavia-babordo', 'Corridoio Mezzavia Babordo'], ['shido-12-sala-centrale-seconda-visita-e-ristorante', 'Sala Centrale (seconda visita) e Ristorante'],
    ['shido-13-ponte-laterale-parte-ii', 'Ponte Laterale - Parte II'], ['shido-14-sala-macchine', 'Sala Macchine'], ['shido-15-passaggio-centrale-uscita', 'Passaggio Centrale (Uscita)'],
    ['shido-16-aula-magna-tesoro-e-boss-finali', 'Aula Magna (Tesoro e boss finali)'],
  ],
  maruki: [
    ['maruki-01-ingresso', 'Ingresso'], ['maruki-02-sala-d-ingresso', "Sala d'ingresso"], ['maruki-03-percorso-di-prova', 'Percorso di prova'], ['maruki-04-corridoio', 'Corridoio'],
    ['maruki-05-auditorium', 'Auditorium'], ['maruki-06-ripostiglio', 'Ripostiglio'], ['maruki-07-sala-di-controllo', 'Sala di controllo'], ['maruki-08-ala-ricerca', 'Ala ricerca'],
    ['maruki-09-sala-visite', 'Sala visite'], ['maruki-10-sala-di-supporto', 'Sala di supporto'], ['maruki-11-corridoio-del-crepuscolo', 'Corridoio del Crepuscolo'],
    ['maruki-12-eden-modello-psi-cognitivo-eden', 'Eden (Modello psi-cognitivo Eden)'],
  ],
};

type Certezza = 'certa' | 'multipla' | 'probabile';
type Regola = 'data-nel-nome' | 'letta-voce-per-voce';
export interface Proposta { sigla: string; uid: string; palazzo: string; infiltrazioni: number[]; regola: Regola; certezza: Certezza; motivo: string }

const MOTIVO_DATA = 'La data è nel nome del tutorial.';
const MOTIVO_PIU = 'La voce descrive più infiltrazioni: in quest’ordine secondo la guida italiana.';
const MOTIVO_UNA = 'È l’infiltrazione che la guida italiana fa quel giorno.';
const MOTIVO_SINTESI = 'È l’infiltrazione che la guida fa quel giorno (letta in sintesi o con riserva): da confermare.';
const una = (sigla: string, uid: string, palazzo: string, i: number, sintesi = false): Proposta =>
  ({ sigla, uid, palazzo, infiltrazioni: [i], regola: 'letta-voce-per-voce', certezza: sintesi ? 'probabile' : 'certa', motivo: sintesi ? MOTIVO_SINTESI : MOTIVO_UNA });
const piu = (sigla: string, uid: string, palazzo: string, infiltrazioni: number[]): Proposta =>
  ({ sigla, uid, palazzo, infiltrazioni, regola: 'letta-voce-per-voce', certezza: 'multipla', motivo: MOTIVO_PIU });
const data = (sigla: string, uid: string, i: number): Proposta =>
  ({ sigla, uid, palazzo: 'kamoshida', infiltrazioni: [i], regola: 'data-nel-nome', certezza: 'certa', motivo: MOTIVO_DATA });
const da = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Le proposte di G-022 (guida/registro.md, «VALGONO QUESTE» in lotti/L3/dati.md §8.1): 34 voci con infiltrazioni in ordine, più le tre del
 * «Seguito di G-022» che hanno il riferimento a un Confidente (decisione del PM §7.13). Nessuna per le n/a (K5, K7, K8, M4, M7, M8, M9, B3,
 * B5, O4, R4) né per l'11-13 sera. Certezza: «multipla» con più infiltrazioni; «probabile» dove G-022 dice letta in sintesi o con riserva
 * (B1, N3); altrimenti «certa».
 */
export const PROPOSTE_G022: readonly Proposta[] = [
  data('K1', 'f3d6ddf19b62f76616e3de65ac00f2b9', 0),
  data('K2', 'e4290542b3376439f92c71b76e18b64e', 1),
  data('K3', '6fd5031403067e22f9306de902cf57a6', 2),
  piu('K4', 'a513390589dcbc75a7ae4ef1aa798d06', 'kamoshida', [3, 4, 5]),
  una('K6', 'cdc7e3a818e612b94efe7853135f7617', 'kamoshida', 6),
  una('M1', '3fb31dded3f9581173037ce9d1ec9535', 'madarame', 0),
  una('M2', '445731a85c54f6d1fa541f10ee8c64d1', 'madarame', 0),
  una('M3', 'cea365dae255a9787afdf99661e5aa0f', 'madarame', 1),
  una('M5', '464ccfe40659a41b6b201947ed776312', 'madarame', 2),
  una('M6', '6ebb178b6fc4009d3335635446a2c864', 'madarame', 3),
  una('M10', 'b9371f8061aedd71262a200b98d18bd0', 'madarame', 4),
  una('B1', '65fdbeab5101e6068310fea982553d22', 'kaneshiro', 0, true),
  piu('B2', '5796b127c3400b50853375829f8cf548', 'kaneshiro', da(0, 3)),
  una('B4', '5fa87613387914bfcd9c03f664602169', 'kaneshiro', 3),
  piu('F1', 'ac258051782e4ec99dc9ab4ac25df650', 'futaba', [0, 1]),
  piu('F2', 'f5e781ca22e5ea7a33e5fcf4872f0108', 'futaba', da(0, 4)),
  piu('F3', '62284ab35f052e4dc2bb16daf3b09233', 'futaba', da(5, 8)),
  una('F4', 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2', 'futaba', 9),
  piu('O1', 'fd2a7b29e9906cabc4d03848d332d5ba', 'okumura', [0, 1]),
  piu('O2', 'c66a02b66d02f21793e1f8e0d2f08798', 'okumura', da(0, 9)),
  una('O3', '8d8588deeea8d17f6279c5c26651d08c', 'okumura', 9),
  piu('N1', '7dd92df212b81bb87aba6e7a2fa8c874', 'niijima', [0, 1]),
  piu('N2', 'dece90bfb20d9d3328f2a6b0ca417590', 'niijima', [10, 11, 12, 11, 13]),
  una('N3', '589d82e823703ee879d72f974fd51139', 'niijima', 13, true),
  una('S1', '527cf9832e94e93e855436191e06f8b6', 'shido', 0),
  piu('S2', '746682faca7287278d592da846383d15', 'shido', da(0, 14)),
  una('S3', 'b7122251a674682657fe627319d36d91', 'shido', 15),
  piu('R1', 'cdf1af20cff42ec521e2b4620f6f84a3', 'maruki', [0, 1, 3, 4]),
  piu('R2', '6e28e155072a065d80a68a72ae5be9bb', 'maruki', [0, 4, 5, 6]),
  piu('R3', 'cf66b722af0a5fb76d1906e89b66bb64', 'maruki', da(6, 10)),
  una('R5', '3db90a97fcbc510f8fb97ca5aa142dd2', 'maruki', 11),
  una('R6', 'c3aff3d5cc749a1452814d60bd576b83', 'maruki', 11),
  una('R7', 'ccbbc79f7f8ecf2423794dc9e9683cc6', 'maruki', 11),
  una('R8', '525ed37ba675f84dee6178c4e473365e', 'maruki', 11),
  // seguito di G-022: voci con riferimento a un Confidente (che resta), solo la proposta
  piu('N0', 'ebe00e6b2fe3f80a827f88f5503165fc', 'niijima', [0, 1, 2, 5, 6, 3, 7, 4, 8, 9, 10]),
  piu('R0a', '8742bcf962a80c28b81ab272ee5d5014', 'maruki', [0, 1]),
  piu('R0b', '09e38fddc12a2cce9d5abec6ffc6e7aa', 'maruki', [0, 1, 2]),
];

/**
 * La base ha il diario curato dall'utente, quello su cui l'Esperto ha scritto G-022? Sì se ci sono **tutte** le voci delle proposte e **tutte**
 * le infiltrazioni che elenca (per chiave). Il pacchetto iniziale in git (`pacchetto/gioco.db`, fermo alla versione 93) è una generazione
 * precedente: 18 infiltrazioni di Kamoshida con altre chiavi, la voce M1 assente. Lì proposte e correzioni non hanno senso e la parte del
 * diario si salta (con un avviso). Su una base curata, invece, ogni differenza da quel che G-022 si aspetta — un'infiltrazione con un altro
 * nome, ordine o Palazzo, una voce del validato, un valore cambiato — ferma la migrazione.
 */
export function diarioCurato110(db: AppDatabase): { curato: true } | { curato: false; motivo: string } {
  const voce = db.prepare('SELECT 1 FROM voce_giornata WHERE uid = ?');
  const mancanti = PROPOSTE_G022.filter((p) => !voce.get(p.uid)).map((p) => p.sigla);
  if (mancanti.length > 0) return { curato: false, motivo: `mancano le voci ${mancanti.join(', ')} di G-022` };
  const inf = db.prepare('SELECT 1 FROM dungeon_area WHERE chiave = ?');
  const assenti = Object.values(INFILTRAZIONI).flatMap((elenco) => elenco.map(([chiave]) => chiave)).filter((chiave) => !inf.get(chiave));
  if (assenti.length > 0) return { curato: false, motivo: `mancano le infiltrazioni ${assenti.slice(0, 3).join(', ')}${assenti.length > 3 ? '…' : ''} di G-022` };
  return { curato: true };
}

/** Scrive le proposte di G-022 dopo aver controllato ogni uid e ogni infiltrazione; una voce che ha già proposte non si riscrive. */
function scriviProposte(db: AppDatabase): number {
  const voce = db.prepare('SELECT uid FROM voce_giornata WHERE uid = ?');
  const inf = db.prepare('SELECT dungeon_chiave, ordine, nome FROM dungeon_area WHERE chiave = ?');
  const gia = db.prepare('SELECT 1 FROM proposta_infiltrazione_voce WHERE voce_uid = ?');
  const scrivi = db.prepare('INSERT INTO proposta_infiltrazione_voce (voce_uid, ordine, infiltrazione_chiave, regola, motivo, certezza) VALUES (?, ?, ?, ?, ?, ?)');
  let scritte = 0;
  for (const p of PROPOSTE_G022) {
    if (!voce.get(p.uid)) throw new Error(`migrazione 110: la voce ${p.sigla} (${p.uid}) di G-022 non c'è nel diario`);
    const chiavi = p.infiltrazioni.map((n) => {
      const attesa = INFILTRAZIONI[p.palazzo]?.[n];
      if (!attesa) throw new Error(`migrazione 110: ${p.sigla} cita l'infiltrazione ${n} del Palazzo ${p.palazzo}, che G-022 non elenca`);
      const r = inf.get(attesa[0]) as { dungeon_chiave: string; ordine: number; nome: string } | undefined;
      if (!r || r.dungeon_chiave !== p.palazzo || r.ordine !== n || r.nome !== attesa[1]) {
        throw new Error(`migrazione 110: ${p.sigla}, infiltrazione ${n} del Palazzo ${p.palazzo}: atteso «${attesa[1]}» (${attesa[0]}), trovato ${r ? `«${r.nome}» (${r.dungeon_chiave}, ordine ${r.ordine})` : 'niente'}`);
      }
      return attesa[0];
    });
    if (chiavi.some((c, i) => i > 0 && c === chiavi[i - 1])) throw new Error(`migrazione 110: ${p.sigla} ripete la stessa infiltrazione di seguito`);
    if (gia.get(p.uid)) continue;
    chiavi.forEach((c, i) => { scritte += scrivi.run(p.uid, i, c, p.regola, p.motivo, p.certezza).changes; });
  }
  return scritte;
}

export interface CampiVoce { azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null }
interface RigaVoce110 extends CampiVoce { uid: string; data: string; fascia: string; testo_precedente_json: string | null; da_rivedere: number; motivo_revisione: string | null }

/** Le correzioni del team dopo il 06-01 (§2.1.6, decisioni del PM del 2026-10-20): ognuna dice com'è oggi il campo e come diventa. */
export interface Correzione { sigla: string; uid: string; data: string; correggi: (v: CampiVoce) => Partial<CampiVoce> | null }

const NOTA_B1 = 'Nella guida: Cerca il boss della mala';
const NOTA_S1 = 'Nella guida: Ponte anteriore';
/** La nota con il nome della guida dopo il testo di oggi; null se il testo di oggi non è quello atteso. */
function conNota(attesa: string, aggiunta: string) {
  return (v: CampiVoce): Partial<CampiVoce> | null => (v.note === attesa ? { note: `${attesa}. ${aggiunta}` } : null);
}
const NIIJIMA = (v: CampiVoce): Partial<CampiVoce> | null =>
  (v.riferimento_tipo === 'confidente' && v.riferimento_chiave === 'makoto' ? { riferimento_tipo: 'dungeon', riferimento_chiave: 'niijima' } : null);
const PEZZO_F4 = 'Camera del Rigetto e della Camera del Rimorso';

export const CORREZIONI_TEAM: readonly Correzione[] = [
  { sigla: 'F4', uid: 'c9efdb83a3eeb29a6ceea9a6f6cc2ea2', data: '08-03', correggi: (v) => (v.azione.includes(PEZZO_F4) ? { azione: v.azione.replace(PEZZO_F4, 'Camera del Vuoto') } : null) },
  { sigla: 'N1', uid: '7dd92df212b81bb87aba6e7a2fa8c874', data: '10-29', correggi: NIIJIMA },
  { sigla: 'N2', uid: 'dece90bfb20d9d3328f2a6b0ca417590', data: '11-14', correggi: NIIJIMA },
  { sigla: 'N3', uid: '589d82e823703ee879d72f974fd51139', data: '11-19', correggi: NIIJIMA },
  { sigla: 'B1', uid: '65fdbeab5101e6068310fea982553d22', data: '06-20', correggi: conNota('Usare attacchi nucleari contro i nemici', NOTA_B1) },
  { sigla: 'S1', uid: '527cf9832e94e93e855436191e06f8b6', data: '11-24', correggi: conNota('Assicurarsi di avere equipaggiata una Persona di Arcano Imperatrice per i giorni successivi', NOTA_S1) },
];

/** La voce solo segnalata (11-13 sera, decisione del PM): `da_rivedere` e motivo, nient'altro. */
export const SEGNALATA = { uid: '7c0814176b193cad29d15ec00ffe891c', data: '11-13', azione: "Completare l'infiltrazione del palazzo", motivo: 'La sera non si entra nei Palazzi: il testo va rivisto (Esperto della guida)' };

/** La voce nuova del team (Kaneshiro, 06-26 di giorno: la lettera di sfida al Ritrovo; seguito di G-022). Uid fisso: lo stesso su ogni copia. */
export const VOCE_NUOVA = {
  uid: '8c58ad986d8176c681c76ed93d2d3fe5', data: '06-26', fascia: 'giorno', tipo: 'palazzo',
  azione: 'Ritrovo: invio della lettera di sfida a Kaneshiro (la consegnano Ryuji e Makoto)', riferimento_tipo: 'dungeon', riferimento_chiave: 'kaneshiro', riferimento_testo: 'Palazzo di Kaneshiro',
  dopo: '80914911db15067f54372fd85e724f27',
};

/** Esito delle scritture sul diario: per il log e per i test. */
export interface EsitoDiario { proposte: number; corrette: number; segnalate: number; nuove: number }

function scriviDiario(db: AppDatabase, adesso: string): EsitoDiario {
  const esito: EsitoDiario = { proposte: scriviProposte(db), corrette: 0, segnalate: 0, nuove: 0 };
  const leggi = db.prepare('SELECT uid, data, fascia, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, testo_precedente_json, da_rivedere, motivo_revisione FROM voce_giornata WHERE uid = ?');
  const controlla = (uid: string, sigla: string, dataAttesa: string): RigaVoce110 => {
    const v = leggi.get(uid) as RigaVoce110 | undefined;
    if (!v) throw new Error(`migrazione 110: la voce ${sigla} (${uid}) non c'è nel diario`);
    if (nelValidato(v.data)) throw new Error(`migrazione 110: la voce ${sigla} (${uid}) è del ${v.data}, nel diario validato 04-01..06-01: non si tocca`);
    if (v.data !== dataAttesa) throw new Error(`migrazione 110: la voce ${sigla} (${uid}) è del ${v.data}, attesa del ${dataAttesa}`);
    return v;
  };
  const correggi = db.prepare(`UPDATE voce_giornata SET azione = ?, note = ?, riferimento_tipo = ?, riferimento_chiave = ?, riferimento_testo = ?,
    testo_precedente_json = ?, da_rivedere = 1 WHERE uid = ? AND testo_precedente_json IS NULL`);
  for (const c of CORREZIONI_TEAM) {
    const v = controlla(c.uid, c.sigla, c.data);
    // già corretta (anche se poi l'utente l'ha rivista: «Tieni» o «Rimetti» lasciano il testo precedente)
    if (v.testo_precedente_json !== null) continue;
    const prima: CampiVoce = { azione: v.azione, note: v.note, riferimento_tipo: v.riferimento_tipo, riferimento_chiave: v.riferimento_chiave, riferimento_testo: v.riferimento_testo };
    const nuovi = c.correggi(prima);
    if (!nuovi) throw new Error(`migrazione 110: la voce ${c.sigla} (${c.uid}) non ha più il valore atteso: ${JSON.stringify(prima)}`);
    const dopo = { ...prima, ...nuovi };
    esito.corrette += correggi.run(dopo.azione, dopo.note, dopo.riferimento_tipo, dopo.riferimento_chiave, dopo.riferimento_testo, JSON.stringify(prima), c.uid).changes;
  }
  const s = controlla(SEGNALATA.uid, '11-13 sera', SEGNALATA.data);
  if (s.motivo_revisione === null) {
    if (s.azione !== SEGNALATA.azione || s.fascia !== 'sera') throw new Error(`migrazione 110: la voce dell'11-13 sera (${SEGNALATA.uid}) non è quella attesa: «${s.azione}», ${s.fascia}`);
    esito.segnalate += db.prepare('UPDATE voce_giornata SET da_rivedere = 1, motivo_revisione = ? WHERE uid = ? AND motivo_revisione IS NULL').run(SEGNALATA.motivo, SEGNALATA.uid).changes;
  }
  if (!leggi.get(VOCE_NUOVA.uid)) {
    if (nelValidato(VOCE_NUOVA.data)) throw new Error('migrazione 110: la voce nuova cadrebbe nel diario validato');
    if (!db.prepare('SELECT 1 FROM giorno_percorso WHERE data = ?').get(VOCE_NUOVA.data)) throw new Error(`migrazione 110: il giorno ${VOCE_NUOVA.data} non c'è nel percorso`);
    if (!db.prepare('SELECT 1 FROM dungeon WHERE chiave = ?').get(VOCE_NUOVA.riferimento_chiave)) throw new Error(`migrazione 110: il Palazzo ${VOCE_NUOVA.riferimento_chiave} non c'è`);
    const dopo = db.prepare('SELECT data, fascia FROM voce_giornata WHERE uid = ?').get(VOCE_NUOVA.dopo) as { data: string; fascia: string } | undefined;
    if (!dopo || dopo.data !== VOCE_NUOVA.data || dopo.fascia !== VOCE_NUOVA.fascia) throw new Error(`migrazione 110: la voce B3 (${VOCE_NUOVA.dopo}) non è più del ${VOCE_NUOVA.data} di giorno`);
    // in fondo alla fascia, dopo B3: nessuna voce esistente cambia ordine
    const ordine = (db.prepare('SELECT COALESCE(MAX(ordine) + 1, 0) AS n FROM voce_giornata WHERE data = ? AND fascia = ?').get(VOCE_NUOVA.data, VOCE_NUOVA.fascia) as { n: number }).n;
    esito.nuove += db.prepare(`INSERT INTO voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
        rango_atteso, produce_json, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
      VALUES (?, ?, ?, ?, 'azione', ?, NULL, ?, ?, ?, ?, NULL, '[]', NULL, ?, ?, 1, 'team')`)
      .run(VOCE_NUOVA.uid, VOCE_NUOVA.data, VOCE_NUOVA.fascia, ordine, VOCE_NUOVA.azione, VOCE_NUOVA.tipo, VOCE_NUOVA.riferimento_tipo, VOCE_NUOVA.riferimento_chiave, VOCE_NUOVA.riferimento_testo, adesso, adesso).changes;
  }
  return esito;
}

export const migration110: Migration = {
  id: 110,
  name: 'aree_dei_palazzi',
  up(db) {
    const adesso = new Date().toISOString();
    creaSchema(db);
    const aree = assegnaAreePalazzi110(db, adesso);
    // il diario si tocca solo sulla base curata su cui è scritta G-022 (non sul pacchetto iniziale di una generazione precedente)
    const base = diarioCurato110(db);
    const diario = base.curato ? scriviDiario(db, adesso) : { proposte: 0, corrette: 0, segnalate: 0, nuove: 0 };
    if (!base.curato) logger.warn({ motivo: base.motivo }, 'migrazione 110: base senza il diario curato, proposte e correzioni del diario non applicate');
    const senzaArea = (db.prepare(`SELECT COUNT(*) AS n FROM mappa m JOIN dungeon d ON m.genitore_chiave = 'dungeon-' || d.chiave AND d.tipo = 'palazzo'
      WHERE m.area_chiave IS NULL`).get() as { n: number }).n;
    logger.info({ ...aree, ...diario, diarioCurato: base.curato, senzaArea }, 'migrazione 110: Aree dei Palazzi e infiltrazioni');
  },
};
