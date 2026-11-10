// ============================================================
// limitiFusione — i limiti della ricerca di fusioni, letti da motore, schemi e interfaccia
// ============================================================

/** Fusioni in profondità al massimo in un piano di fusione. */
export const PROFONDITA_MASSIMA_PIANO = 4;

/** Anelli al minimo in un ciclo di fusione: un anello solo non torna al punto di partenza con un partner diverso. */
export const ANELLI_MINIMI_CICLO = 2;

/** Anelli al massimo in un ciclo di fusione, cercato o salvato. */
export const ANELLI_MASSIMI_CICLO = 15;
