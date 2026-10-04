// ============================================================
// Cache dei dati di gioco — un registro unico, svuotato quando il DB di gioco cambia sotto l'app
// ============================================================
//
// Alcuni servizi tengono in memoria letture costose del DB di gioco (traduzioni, motore di fusione,
// eredità delle skill, finestre dei Palazzi, nomi delle condizioni). Quando il file di gioco viene
// sostituito o ricaricato a runtime (importazione del pacchetto, ripristino di una copia, `caricaPacchetto`
// nei test) quelle copie diventano vecchie. Prima ogni chiamante elencava a mano le cache da svuotare e
// una (`invalidaFinestreDungeon`) era rimasta fuori da tutti e tre gli elenchi.
//
// Ogni modulo con una cache vi registra la propria funzione di invalidazione al caricamento
// (`registraCacheDiGioco`); chi cambia il DB chiama `invalidaCacheDiGioco()`. Il registro non importa
// nessun servizio, quindi non crea cicli fra moduli: un modulo non ancora caricato non ha una cache
// da svuotare.
// ============================================================

const invalidatori = new Set<() => void>();

/** Registra la funzione che svuota una cache di dati di gioco; restituisce la stessa funzione, per poterla anche esportare. */
export function registraCacheDiGioco(invalida: () => void): () => void {
  invalidatori.add(invalida);
  return invalida;
}

/** Svuota tutte le cache registrate: va chiamata ogni volta che il DB di gioco viene sostituito o ricaricato. */
export function invalidaCacheDiGioco(): void {
  for (const invalida of invalidatori) invalida();
}
