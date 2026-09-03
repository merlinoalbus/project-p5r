// ============================================================
// slug — nome file canonico per gli asset grafici (stessa regola di docs/grafica/prompt-immagini.md §10)
// ============================================================
//
// Minuscolo, accenti rimossi, apostrofi eliminati, ogni altro carattere non alfanumerico → trattino,
// trattini doppi compressi, nessun trattino ai bordi. Esempi: "Jack Frost" → jack-frost, "Arsène" → arsene,
// "Jack-o'-Lantern" → jack-o-lantern, "Izanagi-no-Okami Picaro" → izanagi-no-okami-picaro, "Queen's Necklace" → queens-necklace.
// Usata sia dal plugin Vite che genera il manifest (Node) sia dal frontend che cerca l'asset di un'entità.
// ============================================================

/** Slug di un singolo segmento (nome di entità o di file senza estensione). */
export function slug(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/** Slug di un percorso relativo (segmenti separati da "/"), senza estensione. */
export function slugPercorso(percorso: string): string {
  return percorso
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s.length > 0)
    .map(slug)
    .filter((s) => s.length > 0)
    .join('/');
}
