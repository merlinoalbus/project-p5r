// ============================================================
// SceltaPunto — un punto su un'immagine, toccandola (o con le frecce): dove sta un'Area sull'illustrazione del quartiere (L2)
// ============================================================
//
// Lo stesso gesto dell'ingresso del quartiere (stessi stili `ingresso-quartiere__*`): si tocca l'immagine e il punto, in
// percentuale, compare sopra. Serve a «Aggiungi area» (dove mettere il pin di passaggio verso l'area nuova) e a «Segna
// sull'illustrazione» (un'area che sull'illustrazione non ha ancora il suo pin).
// ============================================================

interface Props {
  src: string;
  /** Testo alternativo dell'immagine (dice quale illustrazione è). */
  alt: string;
  punto: { x: number; y: number } | null;
  onPunto: (punto: { x: number; y: number }) => void;
  disabilitato?: boolean;
}

/** L'immagine da toccare con il segno del punto scelto; le frecce lo spostano (Maiusc per passi da 5), partendo dal centro. */
export function SceltaPunto({ src, alt, punto, onPunto, disabilitato = false }: Props) {
  const tocca = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabilitato) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPunto({ x: Math.round((e.clientX - r.left) / r.width * 10000) / 100, y: Math.round((e.clientY - r.top) / r.height * 10000) / 100 });
  };
  const sposta = (dx: number, dy: number) => {
    const base = punto ?? { x: 50, y: 50 };
    onPunto({ x: Math.min(100, Math.max(0, base.x + dx)), y: Math.min(100, Math.max(0, base.y + dy)) });
  };
  return (
    <div className={`ingresso-quartiere__immagine ${disabilitato ? 'ingresso-quartiere__immagine--occupata' : ''}`} role="application" tabIndex={0}
      aria-label={`${alt}: tocca il punto, o usa le frecce`}
      onKeyDown={(e) => { const d = e.shiftKey ? 5 : 1; const mosse: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; const m = mosse[e.key]; if (m) { e.preventDefault(); sposta(m[0], m[1]); } }}
      onClick={tocca}>
      <img src={src} alt={alt} draggable={false} />
      {punto && <span className="ingresso-quartiere__punto" style={{ left: `${punto.x}%`, top: `${punto.y}%` }} aria-hidden="true">+</span>}
    </div>
  );
}
