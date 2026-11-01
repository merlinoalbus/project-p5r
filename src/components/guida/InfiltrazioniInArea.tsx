// ============================================================
// InfiltrazioniInArea — il pannello del visore nella scheda di un Palazzo (§4.2): le infiltrazioni che passano dall'area aperta
// ============================================================

import { SpuntaCompletata, TestoCompletata } from './SpuntaCompletata';
import type { AreaRiassuntoDto } from '../../types';

/** Il pannello del visore nei Palazzi (§4.2): le infiltrazioni che passano dall'area aperta; toccarne una la apre restando sull'area. */
export function InfiltrazioniInArea({ area, aperta, completate, onScegli }: { area: AreaRiassuntoDto; aperta: string; completate: ReadonlySet<string>; onScegli: (chiave: string) => void }) {
  // nell'ordine della guida, comunque arrivino
  const infiltrazioni = [...(area.infiltrazioni ?? [])].sort((x, y) => x.ordine - y.ordine);
  return (
    <section className="visore-mappa__sezione" aria-label="Infiltrazioni in quest’area">
      <h3 className="visore-mappa__intestazione">Infiltrazioni in quest’area</h3>
      {infiltrazioni.length === 0
        ? <p className="m-0 testo-12 text-text-muted">Nessuna infiltrazione passa di qui.</p>
        : <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
          {infiltrazioni.map((x) => (
            <li key={x.chiave}>
              <button type="button" className={`chip touch testo-12 ${x.chiave === aperta ? 'chip--attivo' : ''} ${completate.has(x.chiave) ? 'chip--icona' : ''}`} aria-pressed={x.chiave === aperta} onClick={() => onScegli(x.chiave)}>
                {completate.has(x.chiave) && <SpuntaCompletata />}{x.ordine + 1}. {x.nome}{completate.has(x.chiave) && <TestoCompletata />}
              </button>
            </li>
          ))}
        </ul>}
    </section>
  );
}
