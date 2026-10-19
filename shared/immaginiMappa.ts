// ============================================================
// L'immagine di una mappa: una regola sola (L1 del piano di razionalizzazione, 2026-10-20)
// ============================================================
//
// Prima il ruolo dell'immagine si scriveva in sei posti con cinque regole diverse (migrazioni 043, 044 e 106, sincronizzazione,
// importazione, caricamento), e la stessa mappa poteva ricevere ruoli diversi secondo la strada da cui era arrivata. Il piano
// vuole che il ruolo **si deduca dal posto nella gerarchia**: questa è quella deduzione, in SQL perché la usano il server (dopo
// ogni scrittura che tocca mappe o immagini, `allineaRuoliImmagine`) e la migrazione 107 che la applica una volta a tutto.
//
//   - la radice di un Palazzo o dei Memento ha lo **stemma**: identifica il posto, non è una pianta su cui aprire il visore;
//   - senza un'immagine (caricata nell'istanza o asset predefinito che esiste davvero) la mappa non ne ha: «nessuna»;
//   - città e quartieri hanno un'**illustrazione** (Tokyo, Shibuya);
//   - tutte le altre — aree del mondo, planimetrie dei Palazzi, generiche — sono **planimetrie**.
//
// Quale immagine si mostra è l'altra metà della regola, e anche lei è una sola: **quella caricata vince ovunque**, poi l'asset
// dichiarato della mappa, poi l'icona (`useImmagineMappa` nell'interfaccia). Sagome e stemmi (`segniMappa.ts`) non sono
// l'immagine della mappa: sono i suoi segni sulla metro e nelle intestazioni, e restano quelli che l'utente ha scelto.
// ============================================================

import type { RuoloImmagine } from './types.js';

/**
 * Il ruolo dedotto per la riga di `mappa` con l'alias dato, come espressione SQL (vedi l'intestazione). «Ha un'immagine»: una riga
 * dell'ambito `mappa` con la chiave della mappa o la sua `immagine_chiave`, oppure l'asset dichiarato registrato nella tabella
 * (anche senza contenuto: il pacchetto iniziale ha le righe e non i byte, che arrivano col pacchetto completo — la mappa resta
 * quella che è).
 */
export function sqlRuoloDaGerarchia(m: string): string {
  return `CASE
    WHEN ${m}.genitore_chiave IS NULL AND ${m}.tipo IN ('palazzo', 'dedalo') THEN 'emblema'
    WHEN NOT (EXISTS (SELECT 1 FROM immagine i WHERE i.ambito = 'mappa' AND (i.chiave = ${m}.chiave OR i.chiave = ${m}.immagine_chiave))
      OR EXISTS (SELECT 1 FROM immagine i WHERE ${m}.asset = i.ambito || '/' || i.chiave)) THEN 'nessuna'
    WHEN ${m}.tipo IN ('citta', 'quartiere') THEN 'illustrazione-editoriale'
    ELSE 'planimetria-nativa' END`;
}

/** Se il visore si apre su una mappa con quel ruolo: piante e illustrazioni sì, stemmi e mappe senza immagine no. */
export function ruoloConVisore(ruolo: RuoloImmagine): boolean {
  return ruolo === 'planimetria-nativa' || ruolo === 'illustrazione-editoriale';
}
