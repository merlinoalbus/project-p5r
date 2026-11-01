// ============================================================
// etichetteSpilli — i nomi dei pin di spostamento sulla tela del visore, posati in modo che non escano e non si coprano (UX2-10)
// ============================================================

/** I nomi dei pin di spostamento sulla tela, su telefono e tablet (UX2-10): ognuno si sposta in orizzontale quanto basta per stare
 *  nella tela e a sinistra dei comandi dello zoom; quello che coprirebbe un nome già posato si nasconde (`data-coperta`). Prima i pin
 *  selezionati, poi dall'alto in basso. I pin fuori dalla tela restano come sono: un nome trascinato dentro si staccherebbe dal pin. */
export function sistemaEtichette(t: HTMLElement): void {
  const etichette = [...t.querySelectorAll<HTMLElement>('.spillo-mappa--spostamento .spillo-mappa__etichetta')];
  for (const e of etichette) { e.style.transform = ''; e.removeAttribute('data-coperta'); }
  const bordo = t.getBoundingClientRect();
  const comandi = t.querySelector<HTMLElement>('.visore-mappa__controlli')?.getBoundingClientRect() ?? null;
  const dentro = (r: DOMRect) => r.right > bordo.left && r.left < bordo.right && r.bottom > bordo.top && r.top < bordo.bottom;
  const misurate = etichette
    .map((e) => ({ e, r: e.getBoundingClientRect(), pin: e.closest('.spillo-mappa')?.getBoundingClientRect() ?? null, primo: !!e.closest('.spillo-mappa--selezionato') }))
    .filter((m) => m.pin && dentro(m.pin))
    .sort((a, b) => Number(b.primo) - Number(a.primo) || a.r.top - b.r.top);
  const posate: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  for (const { e, r, primo } of misurate) {
    let dx = 0;
    if (r.left < bordo.left + 4) dx = bordo.left + 4 - r.left;
    if (r.right > bordo.right - 4) dx = bordo.right - 4 - r.right;
    // accanto ai comandi dello zoom (in colonna a destra) il nome passa a sinistra dei comandi
    if (comandi && r.bottom > comandi.top && r.top < comandi.bottom && r.right + dx > comandi.left - 4) dx = Math.min(dx, comandi.left - 4 - r.right);
    if (dx) e.style.transform = `translateX(${Math.round(dx)}px)`;
    const q = { left: r.left + dx, right: r.right + dx, top: r.top, bottom: r.bottom };
    if (!primo && posate.some((p) => q.left < p.right + 2 && q.right > p.left - 2 && q.top < p.bottom + 1 && q.bottom > p.top - 1)) { e.setAttribute('data-coperta', ''); continue; }
    posate.push(q);
  }
}
