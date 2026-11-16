// ============================================================
// areeDeiPalazzi — la regola che dà un'Area a ogni planimetria di un Palazzo che non ne ha una, con i legami infiltrazione ↔ area
// ============================================================
//
// Gerarchia dei Palazzi: **Città → Palazzo → Area → Planimetria**, con le **infiltrazioni** (`dungeon_area`) legate alle Aree **molti a
// molti** (`infiltrazione_area`). Ogni planimetria figlia di `dungeon-<k>` (tutti i Palazzi tranne i Memento, R3-12) appartiene a
// un'Area (tabella `area` con `dungeon_chiave`), col nome che la pagina del Palazzo mostra (`nomeAreaPalazzo`). La regola **aggiunge i
// legami, non riscrive i contenuti**: nessuna chiave di mappa, pin o infiltrazione cambia; nessun pin cambia mappa, posizione o
// riferimento. Si può rieseguire: la seconda volta non tocca niente.
//
// La chiama l'importazione di un pacchetto di mappe (`mappeService`, `areeService.assegnaAreePalazzi`): una planimetria di un Palazzo
// arrivata senza Area la riceve qui.
// ============================================================

import type { AppDatabase } from '../../db/dbService.js';

// ------------------------------------------------------------
// Il nome dell'Area: copia della resa dell'interfaccia (src/utils/presentazioneMappa.ts, shared/nomiMappe.ts)
// ------------------------------------------------------------

interface Contesto { id: string; nome: string | null }
/** Ciò che serve per presentare una planimetria come la presenta la pagina del Palazzo. */
export interface IdentitaPlanimetria { nome: string; contesti: Contesto[]; genitoreNome: string | null; nomeRivisto: boolean }

/** `senzaGergo` di shared/nomiMappe.ts, copiata: il vocabolario dell'estrattore non arriva a chi gioca. */
function senzaGergo(nome: string): string {
  const i = nome.search(/(?:\s*—\s*)?Immagini native che nessun campo usa/i);
  if (i < 0) return nome;
  const prefisso = nome.slice(0, i).replace(/\s*—\s*$/, '');
  return prefisso ? `${prefisso} — Planimetria non attribuita` : 'Planimetria non attribuita';
}

/** `nomePresentazioneMappa` senza contesto selezionato, copiata (con `alternativeMappa` e `nomeConVersione`). */
function nomePresentazione(m: IdentitaPlanimetria): string {
  if (m.nomeRivisto) return m.nome;
  if (m.contesti.some((c) => c.nome === null)) return m.genitoreNome ? `${m.genitoreNome} — Planimetria` : 'Planimetria';
  const gruppi = new Map<string, string | null>();
  for (const c of m.contesti) {
    const chiave = c.nome === null ? `ignoto:${c.id}` : `nome:${c.nome}`;
    if (!gruppi.has(chiave)) gruppi.set(chiave, c.nome);
  }
  const base = [...gruppi.values()].join(' / ') || m.nome;
  return senzaGergo(base);
}

/** Il nome dell'Area e se è un nome rivisto da una persona: `nomePresentazioneMappa` della planimetria. */
export function nomeAreaPalazzo(predefinita: IdentitaPlanimetria): { nome: string; rivisto: boolean } {
  return { nome: nomePresentazione(predefinita), rivisto: predefinita.nomeRivisto };
}

/** Gli slug che non possono essere di un'Area: sono segmenti delle rotte delle Aree (come in `areeDelMondo.ts`). */
const SLUG_RISERVATI = new Set(['ordine', 'da-collocare', 'nuova']);

/** La regola di `shared/slug.ts`, copiata (come in `areeDelMondo.ts`). */
function slug(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
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

interface RigaPlanimetria { chiave: string; nome: string; ordine: number; origine: string; nome_rivisto: number; dungeon: string; genitore_nome: string | null; contesti_json: string | null }

/** Esito della regola delle Aree dei Palazzi: per il log e per i test. */
export interface EsitoAreePalazzi { aree: number; planimetrie: number; legami: number; legamiDaRegola: number }

/** Il pin 777: la sola coppia infiltrazione ↔ area deducibile dai pin in tutta la base. */
const COPPIA_PIN_777 = { infiltrazione: 'madarame-il-furto-del-cuore-di-madarame', planimetria: 'nativo-rmap-153-5-0' };

/**
 * La regola delle Aree dei Palazzi: le planimetrie figlie di `dungeon-<k>` (ogni Palazzo tranne i Memento, tutti i tipi) ancora senza
 * Area ne ricevono una: una per planimetria. Per le Aree nate qui si aggiunge la
 * coppia infiltrazione ↔ area del pin 777. Un'Area o un legame esistente non si ricrea. È la regola con cui l'import di un pacchetto
 * di mappe assegna le Aree ai Palazzi (`assegnaAreePalazzi` del servizio).
 */
export function assegnaAreeDeiPalazzi(db: AppDatabase, adesso: string): EsitoAreePalazzi {
  const esito: EsitoAreePalazzi = { aree: 0, planimetrie: 0, legami: 0, legamiDaRegola: 0 };
  // Come la regola delle Aree del mondo: gli altri legami con le infiltrazioni li porta l'import di un pacchetto (`legami`, o il campo `aree`).
  const righe = db.prepare(`SELECT m.chiave, m.nome, m.ordine, m.origine, COALESCE(m.nome_rivisto, 0) AS nome_rivisto, d.chiave AS dungeon,
      r.nome AS genitore_nome, p.contesti_json
    FROM mappa m
    JOIN mappa r ON r.chiave = m.genitore_chiave
    JOIN dungeon d ON r.chiave = 'dungeon-' || d.chiave AND d.tipo = 'palazzo'
    LEFT JOIN mappa_presentazione p ON p.mappa_chiave = m.chiave
    WHERE m.area_chiave IS NULL`).all() as RigaPlanimetria[];
  // Palazzo → planimetrie (ognuna è un'Area a sé)
  const perPalazzo = new Map<string, RigaPlanimetria[]>();
  for (const r of righe) perPalazzo.set(r.dungeon, [...(perPalazzo.get(r.dungeon) ?? []), r]);
  const inserisci = db.prepare(`INSERT INTO area (chiave, quartiere_chiave, dungeon_chiave, citta_chiave, slug, nome, nome_rivisto, ordine, planimetria_predefinita, origine, seed_json, da_verificare, updated_at)
    VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`);
  const lega = db.prepare('UPDATE mappa SET area_chiave = ?, versione_ordine = ?, versione_etichetta = ? WHERE chiave = ? AND area_chiave IS NULL');
  // le Aree nate in questa chiamata: solo per loro si ricavano i legami qui sotto. Un legame che l'utente ha tolto da un'Area che
  // c'era già non deve tornare
  const nuove = new Set<string>();
  for (const [dungeon, planimetrie] of [...perPalazzo].sort(([a], [b]) => a.localeCompare(b))) {
    const giaUsati = new Set((db.prepare('SELECT slug FROM area WHERE dungeon_chiave = ?').all(dungeon) as Array<{ slug: string }>).map((r) => r.slug));
    // le Aree nell'ordine di mappa (decisione PM b), poi per chiave
    const aree = planimetrie.map((r) => [r]).sort((a, b) => a[0].ordine - b[0].ordine || a[0].chiave.localeCompare(b[0].chiave));
    for (const ms of aree) {
      const predefinita = ms[0];
      const { nome, rivisto } = nomeAreaPalazzo({ nome: predefinita.nome, contesti: contestiDi(predefinita.contesti_json), genitoreNome: predefinita.genitore_nome, nomeRivisto: predefinita.nome_rivisto === 1 });
      let s = slug(nome) || 'area';
      if (SLUG_RISERVATI.has(s)) s = `${s}-area`;
      let candidato = s; let n = 2;
      while (giaUsati.has(candidato)) candidato = `${s}-${n++}`;
      giaUsati.add(candidato);
      const chiave = `dungeon/${dungeon}/${candidato}`;
      const utente = ms.some((r) => r.origine === 'utente' || r.nome_rivisto === 1);
      inserisci.run(chiave, dungeon, candidato, nome.trim(), rivisto ? 1 : 0, ms[0].ordine, predefinita.chiave, utente ? 'utente' : 'seed', adesso);
      nuove.add(chiave);
      esito.aree++;
      ms.forEach((r, v) => {
        esito.planimetrie += lega.run(chiave, v, null, r.chiave).changes;
      });
    }
  }
  // i legami: la coppia del pin 777
  interface Legame { infiltrazione: string; area: string; dungeon: string; ordineMin: number; ordineArea: number; iniziale: string; origine: 'regola' }
  const coppie = new Map<string, Legame>();
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

