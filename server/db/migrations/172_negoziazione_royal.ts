// ============================================================
// 172 — la negoziazione per umore: schema, importazione conservativa e rapporto (L8, B5: R8-07a, R8-07b, R8-07e)
// ============================================================
//
// Nasce la fonte operativa unica della negoziazione, in sei tabelle (`negoziazione_*`, vedi `schemaNegoziazione.ts`):
//   - le 277 domande Royal (831 risposte, 3324 celle per umore, anche le vuote e le quattro multi-esito) dalla trascrizione versionata
//     (`dati/negoziazione-royal-1…7.json`);
//   - il file originale dell'app (230 domande, 691 risposte, 642 attestazioni, nessuna perduta: le contraddizioni restano due attestazioni, la
//     scelta del «peggiore» delle migrazioni 083/084 non le cancella) raccordato a Royal con `dati/negoziazione-abbinamenti.json`;
//   - le 49 domande che mancavano, con la resa italiana dell'Esperto (`dati/negoziazione-rese-it.json`, G-021 §2: resa, non testo del gioco);
//   - le quattro carte degli umori, con gli esempi della guida italiana e il riscontro sul dato Royal;
//   - la fotografia dell'importazione: gli ingressi (impronte), la sezione di runtime tal quale e il rapporto con i conteggi misurati sulle righe.
// Royal vince dove è documentata; l'app resta come altra provenienza; nessuna riga è scartata e nessuna è fusa per somiglianza del testo.
//
// `dati_guida.battaglia` non si tocca: resta la fotografia storica (e la fonte che la pagina Battaglia legge finché B8 non passa al lettore unico).
// Non tocca `partite.db`. Se `negoziazione_domanda` esiste già non fa nulla; se esiste una sola delle sei tabelle si ferma prima di scrivere.
// Nessun import da `server/services/`.
// ============================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { UMORI } from '../../../shared/elementi.js';
import { confrontaConContratto, riconcilia, type CorrispondenzaRisposta, type RigheNegoziazione } from '../../../shared/negoziazione.js';
import { percorsoDatiNegoziazione } from './083_negoziazione_domande.js';
import { DDL_NEGOZIAZIONE, NOMI_TABELLE_NEGOZIAZIONE } from './schemaNegoziazione.js';
import {
  costruisciModelloNegoziazione, costruisciUmori,
  type CartaStorica, type DomandaApp, type FileAbbinamenti, type FileRese, type RoyalDomanda,
} from './modelloNegoziazione.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const CHIAVE_IMPORTAZIONE = 'negoziazione-royal-b5';
const VERSIONE_FORMATO = 1;

/** Un file dei dati versionati, cercato accanto al codice e nei sorgenti (test e sviluppo). */
function leggiDati<T>(nome: string): { dati: T; impronta: string } {
  for (const p of [path.join(QUI, 'dati', nome), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', nome)]) {
    if (!fs.existsSync(p)) continue;
    const dati = JSON.parse(fs.readFileSync(p, 'utf8')) as T;
    // L'impronta è sul JSON letto, non sui byte: non cambia con i fine riga del checkout.
    return { dati, impronta: crypto.createHash('sha256').update(JSON.stringify(dati)).digest('hex') };
  }
  throw new Error(`172: manca il file dei dati ${nome} (server/db/migrations/dati); nessuna migrazione parziale.`);
}

export const migration172: Migration = {
  id: 172,
  name: 'negoziazione_royal',
  up(db: AppDatabase) {
    const esiste = (t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    const presenti = NOMI_TABELLE_NEGOZIAZIONE.filter(esiste);
    if (presenti.length === NOMI_TABELLE_NEGOZIAZIONE.length) return;
    if (presenti.length > 0) throw new Error(`172: esistono già alcune tabelle della negoziazione (${presenti.join(', ')}) ma non tutte; nessuna riparazione automatica, nessuna migrazione parziale.`);

    // ---- gli ingressi ----
    const fontiLette: Array<{ file: string; sha256: string }> = [];
    const leggi = <T>(nome: string): T => { const { dati, impronta } = leggiDati<T>(nome); fontiLette.push({ file: nome, sha256: impronta }); return dati; };
    const indice = leggi<{ totali: { domande: number; risposte: number; celle: number } }>('negoziazione-royal.json');
    const royal: RoyalDomanda[] = [];
    for (let i = 1; i <= 7; i++) royal.push(...leggi<{ domande: RoyalDomanda[] }>(`negoziazione-royal-${i}.json`).domande);
    if (royal.length !== indice.totali.domande || royal.reduce((s, q) => s + q.risposte.length, 0) !== indice.totali.risposte) {
      throw new Error(`172: la trascrizione Royal non torna con il suo indice (${royal.length} domande); nessuna migrazione parziale.`);
    }
    const abbinamenti = leggi<FileAbbinamenti>('negoziazione-abbinamenti.json');
    const rese = leggi<FileRese>('negoziazione-rese-it.json');
    const fileApp = percorsoDatiNegoziazione();
    if (!fileApp) throw new Error('172: manca il file originale delle domande dell\'app (server/db/dati/negoziazione-domande.json); nessuna migrazione parziale.');
    const appOriginale = (JSON.parse(fs.readFileSync(fileApp, 'utf8')) as { domande: DomandaApp[] }).domande;
    fontiLette.push({ file: 'negoziazione-domande.json (file originale dell\'app)', sha256: crypto.createHash('sha256').update(JSON.stringify(appOriginale)).digest('hex') });

    // La sezione di runtime (già normalizzata da 083/084): serve per riconoscere i ritocchi e per conservarla tal quale.
    const rigaBattaglia = db.prepare("SELECT json FROM main.dati_guida WHERE chiave = 'battaglia'").get() as { json: string } | undefined;
    let runtime: DomandaApp[] | null = null;
    let carte: CartaStorica[] = [];
    let sezioneRuntime: Record<string, unknown> | null = null;
    if (rigaBattaglia) {
      const neg = (JSON.parse(rigaBattaglia.json) as { negoziazione?: Record<string, unknown> }).negoziazione;
      if (neg) {
        sezioneRuntime = { domande: neg.domande ?? null, fonteDomande: neg.fonteDomande ?? null, personalita: neg.personalita ?? null };
        if (Array.isArray(neg.domande)) runtime = neg.domande as DomandaApp[];
        if (Array.isArray(neg.personalita)) carte = neg.personalita as CartaStorica[];
      }
    } else {
      logger.warn('[migration172] nessun dato di Battaglia: importo Royal e il file originale, senza fotografia di runtime');
    }

    // ---- la costruzione ----
    const modello = costruisciModelloNegoziazione({ royal, abbinamenti, rese, appOriginale, runtime });
    const righe: RigheNegoziazione = { domande: modello.domande, varianti: modello.varianti, risposte: modello.risposte, verdetti: modello.verdetti };
    const chiaviRisposta = new Set(righe.risposte.map((r) => r.chiave));
    for (const r of righe.risposte) {
      for (const c of JSON.parse(r.corrispondenze_json) as CorrispondenzaRisposta[]) {
        if (!chiaviRisposta.has(c.risposta)) throw new Error(`172: la risposta ${r.chiave} punta a ${c.risposta}, che non esiste; nessuna migrazione parziale.`);
      }
    }
    const misurato = riconcilia(righe);
    // Strutturale: ogni cella Royal e ogni attestazione del file originale è entrata, altrimenti si ferma.
    if (misurato.righe.varianti.royal !== 277 || misurato.righe.risposte.royal !== 831 || misurato.righe.celleRoyal !== 3324) {
      throw new Error(`172: Royal incompleta (${misurato.righe.varianti.royal}/${misurato.righe.risposte.royal}/${misurato.righe.celleRoyal}); nessuna migrazione parziale.`);
    }
    const attesteOriginali = appOriginale.reduce((s, q) => s + q.risposte.reduce((t, r) => t + r.verdetti.length, 0), 0);
    if (misurato.righe.varianti['app-originale'] !== appOriginale.length || misurato.righe.attestazioni['app-originale'] !== attesteOriginali) {
      throw new Error('172: il file originale dell\'app non è entrato per intero; nessuna migrazione parziale.');
    }

    // ---- la scrittura ----
    for (const sql of DDL_NEGOZIAZIONE) db.exec(sql);
    const adesso = new Date().toISOString();
    const insDomanda = db.prepare('INSERT INTO main.negoziazione_domanda (chiave, ordine) VALUES (?, ?)');
    for (const d of righe.domande) insDomanda.run(d.chiave, d.ordine);
    const insVariante = db.prepare(`INSERT INTO main.negoziazione_variante (chiave, domanda_chiave, testo, testo_originale, testo_origine, fonte, versione_fonte, localizzatore, ordine, note_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const v of righe.varianti) insVariante.run(v.chiave, v.domanda_chiave, v.testo, v.testo_originale, v.testo_origine, v.fonte, v.versione_fonte, v.localizzatore, v.ordine, v.note_json);
    const insRisposta = db.prepare(`INSERT INTO main.negoziazione_risposta (chiave, variante_chiave, testo, testo_originale, testo_origine, testo_disponibile, ordine, corrispondenze_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of righe.risposte) insRisposta.run(r.chiave, r.variante_chiave, r.testo, r.testo_originale, r.testo_origine, r.testo_disponibile, r.ordine, r.corrispondenze_json);
    const insVerdetto = db.prepare(`INSERT INTO main.negoziazione_verdetto (chiave, risposta_chiave, umore, esito, incerto, fonte, versione_fonte, localizzatore, alternativa, valore_grezzo, colore_grezzo, origine_indicata_fonte)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const v of righe.verdetti) insVerdetto.run(v.chiave, v.risposta_chiave, v.umore, v.esito, v.incerto, v.fonte, v.versione_fonte, v.localizzatore, v.alternativa, v.valore_grezzo, v.colore_grezzo, v.origine_indicata_fonte);

    const umori = costruisciUmori(carte, UMORI, righe.verdetti);
    const insUmore = db.prepare('INSERT INTO main.negoziazione_umore (umore, nome, descrizione, esempi_json, da_evitare_json, fonte, versione_fonte) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const u of umori) insUmore.run(u.umore, u.nome, u.descrizione, u.esempi_json, u.da_evitare_json, u.fonte, u.versione_fonte);

    // ---- la fotografia e il rapporto ----
    const confronto = confrontaConContratto(misurato);
    const cercaCella = (lista: typeof misurato.elenchi.contraddittorie, risposta: string, umore: string) => lista.find((c) => c.risposta === risposta && c.umore === umore) ?? null;
    const rapporto = {
      versione: VERSIONE_FORMATO,
      migrazione: 172,
      note: 'Misure rifatte sulle righe importate. Il confronto con il contratto è un riscontro, non una soglia: una voce che non coincide è una differenza da leggere, non un errore da nascondere.',
      misurato: { ...misurato, elenchi: undefined },
      confronto: { voci: confronto, coincidono: confronto.filter((v) => v.coincide).length, differenti: confronto.filter((v) => !v.coincide) },
      elenchi: misurato.elenchi,
      rettifiche: {
        A19_cupa_risposta2: { app: cercaCella(misurato.elenchi.senzaCoincidenza, 'app-A19-2', 'cupa'), nota: 'passabile + buona nell\'app contro cattiva in Royal: vale Royal, le due attestazioni dell\'app restano.' },
        A142_giocosa_risposta3: { app: cercaCella(misurato.elenchi.contraddittorie, 'app-A142-3', 'giocosa'), nota: 'cattiva + buona nell\'app; Royal cattiva non confermata: vale Royal, l\'attestazione «buona» dell\'app resta come altra provenienza.' },
      },
      famiglie: { totale: righe.domande.length, conPiuVarianti: modello.info.famiglieMultiVariante },
      domandeNuove: { numero: modello.info.nuoveConResa.length, varianti: modello.info.nuoveConResa, resa: 'resa-esperto (G-021 §2): non è il testo del gioco' },
      relazioniVarianti: modello.info.relazioniVarianti,
      risposteAppSenzaCorrispondente: modello.info.appSenzaCorrispondente,
      abbinamentiDaRivedere: modello.info.abbinamentiDaRivedere,
      testiNonDisponibili: modello.info.testiNonDisponibili,
      runtime: modello.info.runtime,
      colori: { disponibili: false, nota: 'La trascrizione Royal conserva la classe «unconfirmed» della fonte (minuscola nei dati); i colori ARGB delle celle non sono nella trascrizione e restano a NULL. Censimento del 2026-10-21: 304 celle documentate non confermate (298 con 00000000, 5 con FFFF0000, 1 con FFFFC000).' },
      conservazione: {
        dati_guida_battaglia: 'invariata (fotografia storica)',
        attestazioniOriginaliDellApp: 'tutte importate una per una con la loro coordinata (A<domanda>/risposta/<i>/verdetto/<j>)',
        celleRoyal: 'tutte importate, anche le vuote (esito nullo) e le quattro multi-esito scomposte in alternative',
      },
    };
    db.prepare('INSERT INTO main.negoziazione_importazione (chiave, versione_formato, fonti_json, input_runtime_json, rapporto_json, creata_il) VALUES (?, ?, ?, ?, ?, ?)')
      .run(CHIAVE_IMPORTAZIONE, VERSIONE_FORMATO, JSON.stringify(fontiLette), sezioneRuntime ? JSON.stringify(sezioneRuntime) : null, JSON.stringify(rapporto), adesso);

    logger.info({
      varianti: righe.varianti.length, risposte: righe.risposte.length, verdetti: righe.verdetti.length, famiglie: righe.domande.length,
      coincidono: confronto.filter((v) => v.coincide).length, voci: confronto.length,
    }, 'migrazione 172: negoziazione per umore');
  },
};
