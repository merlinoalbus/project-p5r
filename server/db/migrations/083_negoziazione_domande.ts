// ============================================================
// 083 — le domande della negoziazione, tutte, con il verdetto per ogni personalità
// ============================================================
//
// Nella scheda «Negoziazione» c'erano quattro personalità con due risposte d'esempio l'una: utili
// a capire la regola, inutili davanti all'Ombra che ti fa una domanda strampalata mentre stai
// giocando. La domanda è l'unica cosa che si legge sullo schermo, e da lì deve partire la ricerca.
//
// Qui entrano **230 domande con 691 risposte e 642 verdetti**: per ogni risposta si dice quali
// personalità la prendono bene («buona»), quali così così («passabile») e quali male («cattiva»).
// Una risposta può essere buona per un carattere e pessima per un altro — è tutto il gioco della
// trattativa — e la stessa risposta può non avere verdetto per una personalità: vuol dire che
// nessuno l'ha ancora verificata, non che sia indifferente.
//
// Il dato sta in un file del repository (`server/db/dati/negoziazione-domande.json`) e finisce
// dentro la riga `dati_guida` «battaglia», accanto alle altre sezioni della guida alla battaglia:
// è testo della guida, non una tabella da interrogare, e la scheda lo cerca da sola nel browser.
// Fonte e resa italiana sono dichiarate dentro il file e mostrate nella scheda (vedi `NOTICE`).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import type { EsitoRisposta, NegoziazioneDomandaDto, TrattoOmbra } from '../../../shared/types.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));

/** Il file dei dati, cercato accanto al codice compilato e nei sorgenti (test e sviluppo). */
export function percorsoDatiNegoziazione(): string | null {
  for (const p of [
    path.join(QUI, '..', 'dati', 'negoziazione-domande.json'),
    path.join(process.cwd(), 'server', 'db', 'dati', 'negoziazione-domande.json'),
  ]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Dal peggiore al migliore: davanti all'Ombra conta prima quello che fa fallire la trattativa. */
const PEGGIORE: EsitoRisposta[] = ['cattiva', 'passabile', 'buona'];

/**
 * La trascrizione è fedele alla fonte, e la fonte a volte si contraddice: la stessa risposta
 * risulta **buona e cattiva per lo stesso carattere** (24 casi), e cinque domande compaiono due
 * volte con verdetti diversi perché sono state annotate in momenti diversi.
 *
 * Qui si mette ordine, con due regole che stanno dalla parte di chi gioca:
 *
 * 1. **Un carattere, un verdetto per risposta, e nel dubbio il peggiore.** Se una fonte dice
 *    «buona» e «cattiva» per lo stesso carattere, consigliarla come buona farebbe fallire la
 *    trattativa: vale la peggiore, marcata `incerto` perché la fonte non è d'accordo con sé stessa.
 * 2. **Una domanda, una scheda.** Le domande ripetute si fondono — risposte per testo, verdetti
 *    per carattere con la stessa regola — invece di comparire come due righe gemelle che si
 *    spartiscono l'informazione.
 */
export function normalizzaDomande(domande: NegoziazioneDomandaDto[]): NegoziazioneDomandaDto[] {
  const perDomanda = new Map<string, Map<string, NegoziazioneDomandaDto['risposte'][number]['verdetti']>>();
  const ordine: string[] = [];
  for (const d of domande) {
    let risposte = perDomanda.get(d.domanda);
    if (!risposte) { risposte = new Map(); perDomanda.set(d.domanda, risposte); ordine.push(d.domanda); }
    for (const r of d.risposte) risposte.set(r.testo, [...(risposte.get(r.testo) ?? []), ...r.verdetti]);
  }
  return ordine.map((domanda) => ({
    domanda,
    risposte: [...perDomanda.get(domanda)!.entries()].map(([testo, verdetti]) => ({ testo, verdetti: unicoPerTratto(verdetti) })),
  }));
}

/** Un solo verdetto per carattere: il peggiore fra quelli raccolti, incerto se non erano d'accordo. */
function unicoPerTratto(verdetti: NegoziazioneDomandaDto['risposte'][number]['verdetti']): NegoziazioneDomandaDto['risposte'][number]['verdetti'] {
  const per = new Map<TrattoOmbra, { esito: EsitoRisposta; tratto: TrattoOmbra; incerto?: boolean }>();
  for (const v of verdetti) {
    const avuto = per.get(v.tratto);
    if (!avuto) { per.set(v.tratto, { ...v }); continue; }
    const discordi = avuto.esito !== v.esito;
    const esito = PEGGIORE[Math.min(PEGGIORE.indexOf(avuto.esito), PEGGIORE.indexOf(v.esito))];
    const incerto = avuto.incerto || v.incerto || discordi;
    per.set(v.tratto, incerto ? { tratto: v.tratto, esito, incerto: true } : { tratto: v.tratto, esito });
  }
  return [...per.values()];
}

export const migration083: Migration = {
  id: 83,
  name: 'negoziazione_domande',
  up(db) {
    const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'battaglia'").get() as { json: string } | undefined;
    if (!riga) { logger.warn('migrazione 083: la guida alla battaglia non è caricata, domande della negoziazione non inserite'); return; }
    const file = percorsoDatiNegoziazione();
    if (!file) { logger.warn('migrazione 083: file delle domande della negoziazione non trovato'); return; }
    const dati = JSON.parse(fs.readFileSync(file, 'utf8')) as { fonte: unknown; domande: NegoziazioneDomandaDto[] };
    const domande = normalizzaDomande(dati.domande);
    const battaglia = JSON.parse(riga.json) as { negoziazione?: Record<string, unknown> };
    if (!battaglia.negoziazione) { logger.warn('migrazione 083: sezione «negoziazione» assente, domande non inserite'); return; }
    battaglia.negoziazione.fonteDomande = dati.fonte;
    battaglia.negoziazione.domande = domande;
    db.prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'battaglia'").run(JSON.stringify(battaglia));
    logger.info({ domande: domande.length, trascritte: dati.domande.length }, 'migrazione 083: domande della negoziazione');
  },
};
