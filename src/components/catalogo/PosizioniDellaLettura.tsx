import type { OggettoDettaglioDto } from '../../types';
import { DoveSiTrova } from '../mappe/DoveSiTrova';

export function PosizioniDellaLettura({ oggetto }: { oggetto: OggettoDettaglioDto }) {
  const lettura = oggetto.lettura;
  if (!lettura || lettura.tipo === 'videogioco') return null;
  const negozi = new Set(oggetto.inVendita.map((o) => o.negozio));
  return <>{lettura.voce.posizioni.map((p) => {
    const ruolo = 'ruolo' in p ? p.ruolo === 'cinema' ? 'Visione al cinema' : p.ruolo === 'noleggio' ? 'Noleggio' : 'Visione'
      : p.tipo === 'negozio' && negozi.has(p.chiave) ? 'Acquisto: offerta elencata sopra' : 'Ottenimento indicato dalla guida';
    return <div key={`${p.tipo}:${p.chiave}:${'ruolo' in p ? p.ruolo : ''}`} className="flex min-w-0 flex-col gap-1">
      <span className="testo-13 text-text-secondary">{ruolo} · {p.etichetta}</span>
      <DoveSiTrova tipo={p.tipo} chiave={p.chiave} titolo={p.etichetta} altezza={240} />
    </div>;
  })}</>;
}
