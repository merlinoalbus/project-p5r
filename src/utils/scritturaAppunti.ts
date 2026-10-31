// ============================================================
// scritturaAppunti — scrivere negli appunti di sistema dentro il gesto dell'utente (appunti del Diario 2026-10-26; appunti fissi C7)
// ============================================================
//
// Due vie, le stesse per le voci del Diario e per gli appunti fissi:
//   - `scriviConEvento`: l'evento `copy` del browser con `document.execCommand('copy')`, dentro il gesto (clic, tocco, tasto). Mette i tipi
//     così come sono (l'HTML con il blocco delle voci non viene ripulito, come può fare `navigator.clipboard.write`). Falso se il browser non
//     lo fa.
//   - `copiaTesto`: il solo testo con `navigator.clipboard.writeText`; se il browser lo rifiuta (permesso, contesto non sicuro) o non c'è, il
//     ripiego è `scriviConEvento`. Lancia se nessuna delle due riesce.
// ============================================================

/**
 * Scrive negli appunti con l'evento `copy` del browser, dentro il gesto dell'utente: ogni tipo (`text/plain`, `text/html`) con il suo
 * contenuto. L'evento è nostro: i gestori della pagina (Ctrl+C delle voci del Diario) non lo vedono. Falso se il browser non lo fa.
 */
export function scriviConEvento(tipi: Readonly<Record<string, string>>): boolean {
  let fatto = false;
  const h = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    for (const [tipo, valore] of Object.entries(tipi)) e.clipboardData.setData(tipo, valore);
    fatto = true;
  };
  document.addEventListener('copy', h, true);
  try { return document.execCommand('copy') && fatto; } catch { return false; } finally { document.removeEventListener('copy', h, true); }
}

/** Il testo negli appunti di sistema: `writeText`, e se non riesce l'evento `copy` (vedi sopra). Lancia se nessuna delle due vie riesce. */
export async function copiaTesto(testo: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(testo); return; } catch { /* sotto, il ripiego */ }
  }
  if (!scriviConEvento({ 'text/plain': testo })) throw new Error('Questo browser non permette di scrivere negli appunti da qui.');
}
