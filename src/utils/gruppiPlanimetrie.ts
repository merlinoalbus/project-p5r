// ============================================================
// gruppiPlanimetrie — il nome di una planimetria senza il Palazzo
// ============================================================
//
// Il raggruppamento delle planimetrie di un Palazzo per stanza (`raggruppaPlanimetrie` e le sue funzioni di spostamento) leggeva il gruppo
// d'immagini dell'estrazione (`gruppoImmagini`): da L11 · B9 la stanza è l'Area (`mappa.area`) e quel codice, che nessuno chiamava più, è stato
// tolto. Resta la sola funzione che serve ancora alle pagine della guida.
// ============================================================

/** «Palazzo di Kamoshida › Torre» → «Torre»: il Palazzo lo dice già la pagina. */
export function nomeSenzaPalazzo(nome: string): string {
  return nome.split(' › ').slice(1).join(' › ') || nome;
}
