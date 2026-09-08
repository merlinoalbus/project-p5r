// ============================================================
// 062 — i dodici effetti che erano rimasti una frase
// ============================================================
//
// La migrazione 061 aveva convertito dodici libri su ventiquattro: quelli che aprono un quartiere.
// Gli altri dodici li avevo lasciati come prosa sostenendo che «non sono luoghi e non vanno forzati
// a diventarlo». Era vero solo a metà: non sono luoghi, ma **non sono nemmeno dodici casi unici**.
// Riletti uno per uno, sono tre famiglie:
//
//   - **una capacità che si apre dentro un'attività** — il Terzo Occhio alla pesca, alle freccette
//     e al centro battute, i tiri speciali e il tiro masse a biliardo, i trucchi dei videogiochi
//     retro, il linguaggio dei fiori nel lavoro da fioraio, le combinazioni di attacchi tecnici;
//   - **una resa che raddoppia** — la velocità di lettura, gli strumenti creati per sessione;
//   - **punti Dote che aumentano** dove già si guadagnavano — film e DVD, studio.
//
// Lasciarle prosa voleva dire lasciarle fuori dall'interfaccia: si potevano leggere e non
// modificare, che è la cosa che questo lavoro sta togliendo di mezzo dappertutto.
//
// L'attività è una **chiave**, non un nome scritto: `dove` punta a una riga di `attivita`, così la
// scheda può portarci. Dove l'attività non è una sola — gli attacchi tecnici valgono in battaglia,
// non in un minigioco — `dove` resta `null`, ed è una risposta, non un buco.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Il testo della guida, la capacità che apre, e dove. Le chiavi delle attività si risolvono a
 *  runtime: se il seed le rinomina, la conversione salta invece di scrivere un riferimento rotto. */
const REGOLE: ReadonlyArray<{ rx: RegExp; funzione: string; attivita: RegExp | null }> = [
  { rx: /terzo occhio.*pesca/i, funzione: 'terzo-occhio', attivita: /pesca/i },
  { rx: /terzo occhio.*freccette/i, funzione: 'terzo-occhio', attivita: /freccette/i },
  { rx: /terzo occhio.*battut/i, funzione: 'terzo-occhio', attivita: /battut/i },
  { rx: /tiro masse/i, funzione: 'tiro-masse', attivita: /biliardo/i },
  { rx: /tiri speciali.*biliardo/i, funzione: 'tiri-speciali', attivita: /biliardo/i },
  { rx: /trucchi.*videogioch/i, funzione: 'trucchi', attivita: null },
  { rx: /linguaggio dei fiori/i, funzione: 'linguaggio-fiori', attivita: /fiorai|fiori/i },
  { rx: /attacchi tecnici/i, funzione: 'attacchi-tecnici', attivita: null },
];

const MOLTIPLICA: ReadonlyArray<{ rx: RegExp; cosa: string }> = [
  { rx: /velocita.*lettura|velocità.*lettura/i, cosa: 'lettura' },
  { rx: /strumenti creati/i, cosa: 'fabbricazione' },
];

const PUNTI: ReadonlyArray<{ rx: RegExp; dove: string }> = [
  { rx: /film e dvd|guardando film/i, dove: 'film' },
  { rx: /studiando/i, dove: 'studio' },
];

export const migration062: Migration = {
  id: 62,
  name: 'i_dodici_che_restavano_prosa',
  up(db) {
    const attivita = db.prepare('SELECT chiave, nome FROM attivita').all() as Array<{ chiave: string; nome: string }>;
    const righe = db.prepare("SELECT chiave, sblocca FROM libro WHERE effetto_json IS NULL AND sblocca IS NOT NULL AND trim(sblocca) <> ''")
      .all() as Array<{ chiave: string; sblocca: string }>;
    const scrivi = db.prepare('UPDATE libro SET effetto_json = ? WHERE chiave = ?');

    for (const r of righe) {
      const t = r.sblocca;
      const cap = REGOLE.find((x) => x.rx.test(t));
      if (cap) {
        const dove = cap.attivita ? (attivita.find((a) => cap.attivita!.test(a.nome))?.chiave ?? null) : null;
        scrivi.run(JSON.stringify({ famiglia: 'sblocca-funzione', funzione: cap.funzione, dove }), r.chiave);
        continue;
      }
      const mol = MOLTIPLICA.find((x) => x.rx.test(t));
      if (mol) {
        // «Raddoppia» è l'unico moltiplicatore che i dati nominano: il fattore non si indovina.
        scrivi.run(JSON.stringify({ famiglia: 'moltiplica', cosa: mol.cosa, fattore: 2 }), r.chiave);
        continue;
      }
      const pun = PUNTI.find((x) => x.rx.test(t));
      if (pun) scrivi.run(JSON.stringify({ famiglia: 'aumenta-punti', dove: pun.dove }), r.chiave);
    }
  },
};
