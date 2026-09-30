// ============================================================
// nomiMappe — i nomi delle mappe come li legge chi gioca, condivisi da frontend e backend
// ============================================================
//
// Il server ne ha bisogno da quando fissa il nome di una stanza (2026-09-30): deve scrivere lo stesso
// nome che l'interfaccia mostrava, e l'interfaccia lo mostra senza il gergo dell'estrattore.
// ============================================================

/** Il vocabolario dell'estrattore non arriva a chi gioca.
 *
 * Quattordici mappe dell'atlante si presentano così: «Palazzo di Madarame — Immagini native che
 * nessun campo usa — tela quadrata, disegno minuto — la seconda per estensione». Ogni pezzo vuol
 * dire qualcosa a chi ha estratto i file — nessun campo del gioco fa riferimento a quell'immagine,
 * il rapporto fra i lati della tela, quanta parte ne occupa il disegno, l'ordine per estensione —
 * e **niente** a chi sta cercando dove andare. Due di quelle di Kamoshida hanno pure cinque
 * spilli, quindi non stanno nemmeno in fondo: compaiono fra le aree vere.
 *
 * Qui resta il fatto onesto — è una planimetria che l'estrazione non ha saputo attribuire a una
 * stanza — e sparisce il resto. A distinguerle ci pensano la miniatura, che si vede, e il numero
 * che `etichetteDistinte` aggiunge quando due finiscono con lo stesso nome. Il nome tecnico resta
 * nei dati: la ricerca lo trova ancora, e chi cura l'atlante ce l'ha nell'editor. */
export function senzaGergo(nome: string): string {
  const i = nome.search(/(?:\s*—\s*)?Immagini native che nessun campo usa/i);
  if (i < 0) return nome;
  const prefisso = nome.slice(0, i).replace(/\s*—\s*$/, '');
  return prefisso ? `${prefisso} — Planimetria non attribuita` : 'Planimetria non attribuita';
}
