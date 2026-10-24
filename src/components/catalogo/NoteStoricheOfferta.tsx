import { useEffect, useState } from 'react';
import type { NotaStoricaOfferta } from '../../types';
import { modificaNotaStorica, ripristinaNotaStorica } from '../../services/api';
import { Modal } from '../shared/Modal';
import { ModificaGuida } from '../guida/ModificaGuida';
import { elenchiDaOpzioni } from '../guida/elenchiDaOpzioni';
import { notifica } from '../../stores/notificationStore';

/** La nota documentale è separata dalle note personali e dal prezzo letto dall'offerta. F6: è un dato (migrazione 139), che si
 *  modifica da qui e torna al valore della guida con «Ripristina»; lo stesso dato si vede in negozi, catalogo e confronto Tanaka. */
export function NoteStoricheOfferta({ note, onLegamiCambiati }: { note?: readonly NotaStoricaOfferta[]; onLegamiCambiati?: () => void | Promise<void> }) {
  if (!note?.length) return null;
  return <div className="flex min-w-0 flex-col gap-2 text-[12px]">{note.map(n => <NotaStorica key={n.id} nota={n} onLegamiCambiati={onLegamiCambiati} />)}</div>;
}

/** Le offerte e gli oggetti a cui si riferisce la nota si scelgono per nome con la ricerca (R11-17/1). */
const CAMPI_LEGAMI = elenchiDaOpzioni(['articoli', 'oggetti']);

/** Dopo un salvataggio la nota nuova si annuncia a tutte le istanze della stessa nota montate insieme (offerta, listino, confronto…). */
const NOTA_SALVATA = 'nota-storica-salvata';

/** Una nota con i suoi gesti. La nota mostrata deriva dalla prop: un refetch (o un'altra vista) vince sempre; il valore restituito dal
 *  server dopo un salvataggio si usa solo finché la prop è quella su cui si è salvato, e si annuncia alle altre istanze con lo stesso id. */
function NotaStorica({ nota, onLegamiCambiati }: { nota: NotaStoricaOfferta; onLegamiCambiati?: () => void | Promise<void> }) {
  const [salvata, setSalvata] = useState<{ su: NotaStoricaOfferta; nuova: NotaStoricaOfferta } | null>(null);
  const attuale = salvata && salvata.su === nota ? salvata.nuova : nota;
  useEffect(() => {
    const ascolta = (e: Event) => { const n = (e as CustomEvent<NotaStoricaOfferta>).detail; if (n.id === nota.id) setSalvata({ su: nota, nuova: n }); };
    window.addEventListener(NOTA_SALVATA, ascolta);
    return () => window.removeEventListener(NOTA_SALVATA, ascolta);
  }, [nota]);
  const [aperta, setAperta] = useState<'modifica' | 'ripristina' | null>(null);
  const [testo, setTesto] = useState(nota.testo);
  const [fonte, setFonte] = useState(nota.fonte);
  const [occupato, setOccupato] = useState(false);
  const apri = (gesto: 'modifica' | 'ripristina') => { setTesto(attuale.testo); setFonte(attuale.fonte); setAperta(gesto); };
  const esegui = async () => {
    setOccupato(true);
    try {
      const nuova = aperta === 'ripristina'
        ? await ripristinaNotaStorica(attuale.id, attuale.testo)
        : await modificaNotaStorica(attuale.id, { testo, fonte, testoAttuale: attuale.testo });
      setSalvata({ su: nota, nuova }); setAperta(null);
      window.dispatchEvent(new CustomEvent<NotaStoricaOfferta>(NOTA_SALVATA, { detail: nuova }));
      notifica('success', aperta === 'ripristina' ? 'Nota storica ripristinata al valore della guida.' : 'Nota storica salvata.');
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  const vuota = !testo.trim() || !fonte.trim();
  return <div className="min-w-0">
    <p className="m-0 whitespace-pre-line break-words"><strong>Nota storica della fonte. </strong>{attuale.testo}</p>
    <p className="m-0 break-words text-text-secondary">Fonte: {attuale.fonte} · versione {attuale.versione}{attuale.modificata ? ' · modificata' : ''}</p>
    <div className="mt-1 flex flex-wrap gap-2">
      <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => apri('modifica')}>Modifica nota</button>
      {attuale.modificata && <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => apri('ripristina')}>Ripristina</button>}
      {onLegamiCambiati && <ModificaGuida tipo="nota-storica-legami" chiave={attuale.id} cosa="dove compare la nota storica" etichetta="Dove compare" campiSpeciali={CAMPI_LEGAMI}
        onSalvato={() => void onLegamiCambiati()} />}
    </div>
    {aperta && <Modal aperta titolo={aperta === 'ripristina' ? 'Ripristina la nota storica' : 'Modifica la nota storica'} onChiudi={() => { if (!occupato) setAperta(null); }} azioni={<>
      <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setAperta(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato || (aperta === 'modifica' && vuota)} onClick={() => void esegui()}>{aperta === 'ripristina' ? 'Ripristina' : 'Salva'}</button>
    </>}>
      {aperta === 'ripristina'
        ? <p className="m-0">Testo e fonte della nota tornano come li dà la guida. Prezzi, acquisti e progressi non cambiano.</p>
        : <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">Testo
            <textarea className="input min-h-32" value={testo} maxLength={2000} disabled={occupato} onChange={(e) => setTesto(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Fonte
            <input className="input touch" value={fonte} maxLength={500} disabled={occupato} onChange={(e) => setFonte(e.target.value)} />
          </label>
          <p className="m-0 text-sm text-text-secondary">È una nota sulla fonte: non cambia il prezzo dell’offerta né gli acquisti registrati.</p>
        </div>}
    </Modal>}
  </div>;
}
