/** Discordanza documentale G-034, non fotografia dei prezzi pagati o dell'istanza importata. */
export interface NotaStoricaOfferta {
  id: 'homunculus-prezzi-fonte';
  versione: 1;
  fonte: string;
  testo: string;
}
export const NOTA_STORICA_HOMUNCULUS: Readonly<NotaStoricaOfferta> = Object.freeze({
  id: 'homunculus-prezzi-fonte', versione: 1,
  fonte: 'G-034 punto 2; L7 R7-13b e dati §11.1, revisione43ad8889',
  testo: 'La guida si contraddice: 120.000 ¥ nella pagina Oggetti, 5.000 ¥ nel listino Royal di Tanaka. Il dato di riferimento per Persona 5 Royal è 5.000 ¥, dal listino confermato da G-034. È una nota sulla fonte: non indica il prezzo corrente dell’offerta né quanto è stato pagato e non applica modifiche al listino.',
});
export const noteStoricheOfferta = (chiave: string, negozio: string): NotaStoricaOfferta[] =>
  chiave === 'tanaka-affari-loschi/homunculus' && negozio === 'tanaka-affari-loschi' ? [NOTA_STORICA_HOMUNCULUS] : [];

/** L'identità Royal documentata è distinta dall'oggetto del vecchio listino; nessun confronto per nome. */
export const noteStoricheCatalogo = (riga: { chiave: string; fonte_tipo: string; fonte_chiave: string | null }): NotaStoricaOfferta[] =>
  riga.chiave === 'consumabile/homunculus' && riga.fonte_tipo === 'guida' && riga.fonte_chiave === 'consumabili/Homunculus'
    ? [NOTA_STORICA_HOMUNCULUS] : [];
