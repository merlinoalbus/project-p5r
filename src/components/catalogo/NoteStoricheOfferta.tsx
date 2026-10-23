import type { NotaStoricaOfferta } from '../../../shared/tanakaNotaStorica';

/** La nota documentale è separata dalle note personali e dal prezzo letto dall'offerta. */
export function NoteStoricheOfferta({ note }: { note?: readonly NotaStoricaOfferta[] }) {
  if (!note?.length) return null;
  return <div className="flex min-w-0 flex-col gap-2 text-[12px]">{note.map(n => <div key={`${n.id}:${n.versione}`} className="min-w-0">
    <p className="m-0 whitespace-pre-line break-words"><strong>Nota storica della fonte. </strong>{n.testo}</p>
    <p className="m-0 break-words text-text-secondary">Fonte: {n.fonte} · versione {n.versione}</p>
  </div>)}</div>;
}
