// ============================================================
// ImmaginiCaricate — riepilogo delle immagini caricate dall'utente per ambito, con rimozione multipla (12.1)
// ============================================================
//
// Le immagini caricate hanno la precedenza sulla grafica inclusa nell'app: da qui si rimuovono tutte quelle di un
// ambito (o tutte) per tornare agli asset predefiniti. Il caricamento resta singolo, dal riquadro di ogni immagine.
// ============================================================

import { useMemo, useState } from 'react';
import { eliminaImmagini, getImmagini, type AmbitoImmagine } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { azzeraCacheImmagini } from '../shared/immaginiCache';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const AMBITI: Array<{ chiave: AmbitoImmagine; nome: string }> = [
  { chiave: 'persona', nome: 'Persona' },
  { chiave: 'confidente', nome: 'Confidenti' },
  { chiave: 'arcana', nome: 'Arcani' },
  { chiave: 'skill', nome: 'Skill' },
  { chiave: 'mappa', nome: 'Mappe scaricate' },
  { chiave: 'altro', nome: 'Altro' },
];

/** Sezione Impostazioni: conteggi per ambito e pulsanti «Rimuovi» con conferma. */
export function ImmaginiCaricate() {
  const elenco = useCarica(() => getImmagini(), []);
  const [daRimuovere, setDaRimuovere] = useState<AmbitoImmagine | 'tutte' | null>(null);
  const [occupato, setOccupato] = useState(false);
  const conteggi = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of elenco.dati ?? []) c[i.ambito] = (c[i.ambito] ?? 0) + 1;
    return c;
  }, [elenco.dati]);
  const totale = elenco.dati?.length ?? 0;

  const rimuovi = async () => {
    if (!daRimuovere) return;
    setOccupato(true);
    try {
      const esito = await eliminaImmagini(daRimuovere === 'tutte' ? undefined : daRimuovere);
      azzeraCacheImmagini(daRimuovere === 'tutte' ? undefined : daRimuovere);
      notifica('success', esito.eliminate === 1 ? 'Rimossa 1 immagine.' : `Rimosse ${esito.eliminate} immagini.`);
      setDaRimuovere(null);
      void elenco.ricarica();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const nomeAmbito = (a: AmbitoImmagine | 'tutte') => (a === 'tutte' ? 'tutte le immagini caricate' : `le immagini caricate per ${AMBITI.find((x) => x.chiave === a)?.nome ?? a}`);

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Immagini caricate</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Le immagini che carichi dal riquadro di una Persona, di un Confidente o di un Arcano hanno la precedenza sulla grafica inclusa nell'app. Da qui le rimuovi per tornare agli asset predefiniti; le mappe scaricate dalla guida si riscaricano al prossimo accesso all'area.
      </p>
      {elenco.errore && <p className="m-0 text-[13px] text-error">{elenco.errore}</p>}
      <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Immagini caricate per ambito">
        {AMBITI.map((a) => {
          const n = conteggi[a.chiave] ?? 0;
          return (
            <li key={a.chiave} className="flex items-center justify-between gap-2 border border-border-light px-3 py-2">
              <span className="text-[13px]"><strong>{a.nome}</strong> <span className="text-text-muted">· {n} {n === 1 ? 'immagine' : 'immagini'}</span></span>
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi" disabled={n === 0 || occupato} onClick={() => setDaRimuovere(a.chiave)} aria-label={`Rimuovi le immagini caricate per ${a.nome}`} />
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className="btn btn-danger btn-sm" disabled={totale === 0 || occupato} onClick={() => setDaRimuovere('tutte')}>Rimuovi tutte ({totale})</button>
        <span className="text-[12px] text-text-muted">{elenco.dati ? `${totale} ${totale === 1 ? 'immagine caricata' : 'immagini caricate'} in questa istanza.` : 'Conteggio in corso…'}</span>
      </div>
      <Modal
        titolo="Conferma rimozione"
        aperta={daRimuovere !== null}
        onChiudi={() => setDaRimuovere(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDaRimuovere(null)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void rimuovi()}>Rimuovi</button>
          </>
        }
      >
        <p className="m-0 text-[14px]">Rimuovere {daRimuovere ? nomeAmbito(daRimuovere) : ''}? L'app tornerà a mostrare la grafica predefinita; l'operazione non si può annullare.</p>
      </Modal>
    </section>
  );
}
