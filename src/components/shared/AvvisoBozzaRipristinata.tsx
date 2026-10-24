// ============================================================
// AvvisoBozzaRipristinata — la riga che dice «questa è la bozza che avevi lasciato» (B2 fase 2)
// ============================================================
//
// Compare in cima a un form la cui bozza è stata ritrovata in sessionStorage dopo un vero ricaricamento della pagina. «Scarta» riporta i campi ai
// valori di partenza e cancella la copia (lo fa chi lo usa con `onScarta`). Una riga sola, bersaglio da 44 px.
// ============================================================

export function AvvisoBozzaRipristinata({ onScarta }: { onScarta: () => void }) {
  return (
    <p role="status" className="m-0 flex w-full flex-wrap items-center gap-2 rounded border border-border-light bg-white/[0.04] px-2 py-1 text-[12px] text-text-secondary">
      <span>Bozza ripristinata dopo l’aggiornamento ·</span>
      <button type="button" className="btn btn-ghost btn-sm touch" onClick={onScarta}>Scarta</button>
    </p>
  );
}
