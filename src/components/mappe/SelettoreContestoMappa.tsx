import type { MappaRiassuntoDto } from '../../types';
import { Selettore } from '../shared/Selettore';
import { alternativeMappa, risolviContesto } from '../../utils/presentazioneMappa';
export function SelettoreContestoMappa({ mappa, selezione, onCambia }: { mappa: MappaRiassuntoDto; selezione: string | null; onCambia: (id: string | null) => void }) {
  const alternative = alternativeMappa(mappa);
  if (!alternative.length) return null;
  const esito = risolviContesto(mappa, selezione);
  const parziale = alternative.some(a => a.nome === null);
  const valore = esito.stato === 'nominato' ? alternative.find(a => a.nome === esito.titolo)!.valore : alternative.find(a => a.valore === selezione)?.valore ?? '';
  return <section className="card flex flex-col gap-2" aria-label="Nome della mappa secondo il contesto">
    <Selettore etichetta="Nome secondo il contesto" valore={valore} vuoto={parziale ? 'Seleziona un contesto' : 'Mostra tutti i nomi'} opzioni={alternative.map(a => ({ chiave: a.valore, nome: a.nome ?? 'Contesto con nome non ricostruito' }))} onCambia={k => onCambia(k || null)} />
    {esito.stato !== 'nominato' && <ul className="m-0" aria-label="Nomi nei contesti del gioco">{alternative.map(a => <li key={a.valore}>{a.nome ?? 'Nome non ricostruito per questo contesto'}</li>)}</ul>}
    {parziale && esito.stato === 'assente' && <p role="status">Il nome dipende dal contesto.</p>}
    {esito.stato === 'senza-titolo' && <p role="status">Nome non ricostruito per questo contesto.</p>}
    {esito.stato === 'non-valido' && <p role="status">Il contesto richiesto non appartiene a questa mappa oppure la selezione contiene ripetizioni o valori vuoti.</p>}
    {esito.stato === 'multiplo' && <p role="status">La selezione comprende contesti con nomi differenti.</p>}
  </section>;
}
