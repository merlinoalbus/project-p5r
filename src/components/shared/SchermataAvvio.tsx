// ============================================================
// SchermataAvvio — l'attesa a tutta pagina del primo caricamento (HydrateFallback del router)
// ============================================================
//
// Con i `loader` delle route, al primo caricamento di un indirizzo profondo il router non è «pronto» finché il file della pagina non è
// arrivato: senza questa schermata si vedrebbe una pagina vuota (e React Router lo segnala in console).
//
// È la stessa anteprima statica di `index.html` (logo «P5», anello, «Caricamento…»), con le sue classi `.avvio*` definite lì in linea:
// React sostituisce l'anteprima e al suo posto ricompare identica, senza salti fra il caricamento del bundle e quello della pagina.
// Le classi restano nella <head> per tutta la vita della pagina; il movimento rispetta `prefers-reduced-motion` (sempre in index.html).
// ============================================================

/** Logo, anello e «Caricamento…» centrati a tutta altezza, sul fondo del tema. */
export function SchermataAvvio() {
  return (
    <div className="avvio" role="status" aria-live="polite">
      <div className="avvio__logo" aria-hidden="true">P5</div>
      <div className="avvio__anello" aria-hidden="true" />
      <p className="avvio__testo">Caricamento…</p>
    </div>
  );
}
