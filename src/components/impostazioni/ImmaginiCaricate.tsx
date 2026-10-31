// ============================================================
// ImmaginiCaricate — riepilogo delle immagini caricate dall'utente per ambito, con rimozione multipla (12.1)
// ============================================================
//
// Le immagini caricate hanno la precedenza sulla grafica inclusa nell'app: da qui si rimuovono tutte quelle di un
// ambito (o tutte) per tornare agli asset predefiniti. Il caricamento resta singolo, dal riquadro di ogni immagine.
// ============================================================

import { useMemo, useState } from 'react';
import { eliminaImmagini, getImmagini, isApiError, type AmbitoImmagine } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { azzeraCacheImmagini } from '../shared/immaginiCache';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TitoloSezione } from '../shared/TitoloSezione';

const AMBITI: Array<{ chiave: AmbitoImmagine; nome: string }> = [
  { chiave: 'persona', nome: 'Persona' },
  { chiave: 'confidente', nome: 'Confidenti' },
  { chiave: 'personaggio', nome: 'Personaggi' },
  { chiave: 'arcana', nome: 'Arcani' },
  { chiave: 'skill', nome: 'Skill' },
  { chiave: 'mappa', nome: 'Mappe scaricate' },
  // O9-5: le miniature delle carte dei Palazzi, dei Dedali e delle loro aree nella pagina Luoghi
  { chiave: 'dungeon', nome: 'Miniature dei Palazzi e dei Memento' },
  { chiave: 'altro', nome: 'Altro' },
];

/** Sezione Impostazioni: conteggi per ambito e pulsanti «Rimuovi» con conferma. */
export function ImmaginiCaricate() {
  const elenco = useCarica(() => getImmagini(), []);
  const [daRimuovere, setDaRimuovere] = useState<AmbitoImmagine | 'tutte' | null>(null);
  const [occupato, setOccupato] = useState(false);
  /** Il messaggio del server quando la rimozione toglierebbe l'immagine a mappe con dei pezzi (409 `mappa-con-pezzi`). */
  const [pezziDaConfermare, setPezziDaConfermare] = useState<string | null>(null);
  const conteggi = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of elenco.dati ?? []) c[i.ambito] = (c[i.ambito] ?? 0) + 1;
    return c;
  }, [elenco.dati]);
  const totale = elenco.dati?.length ?? 0;

  /**
   * Esegue la rimozione confermata nella finestra: elimina sul server le immagini dell'ambito scelto (o tutte),
   * svuota la cache locale delle immagini per lo stesso ambito, chiude la finestra e ricarica i conteggi.
   */
  const rimuovi = async (eliminaPezzi = false) => {
    if (!daRimuovere) return;
    setOccupato(true);
    try {
      const esito = await eliminaImmagini(daRimuovere === 'tutte' ? undefined : daRimuovere, { eliminaPezzi });
      azzeraCacheImmagini(daRimuovere === 'tutte' ? undefined : daRimuovere);
      notifica('success', esito.eliminate === 1 ? 'Rimossa 1 immagine.' : `Rimosse ${esito.eliminate} immagini.`);
      chiudi();
      void elenco.ricarica();
    } catch (err) {
      // fra le immagini c'è quella di una mappa con pezzi ritagliati da lei (L1, F5): la finestra resta aperta e chiede la conferma
      if (isApiError(err, 'mappa-con-pezzi')) setPezziDaConfermare(err.message);
      else notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    } finally {
      setOccupato(false);
    }
  };
  /** Chiude la finestra di conferma e dimentica l'eventuale richiesta sui pezzi. */
  const chiudi = () => { setDaRimuovere(null); setPezziDaConfermare(null); };

  /** Complemento oggetto per il testo della conferma: «tutte le immagini caricate» o «le immagini caricate per <ambito>». */
  const nomeAmbito = (a:AmbitoImmagine | 'tutte') => (a === 'tutte' ? 'tutte le immagini caricate' : `le immagini caricate per ${AMBITI.find((x) => x.chiave === a)?.nome ?? a}`);

  return (
    <section className="card flex flex-col gap-3">
      <TitoloSezione>Immagini caricate</TitoloSezione>
      <p className="m-0 testo-13 text-text-secondary">
        Le immagini che carichi dal riquadro di una Persona, di un Confidente o di un Arcano hanno la precedenza sulla grafica inclusa nell'app. Da qui le rimuovi per tornare agli asset predefiniti; le mappe scaricate dalla guida si riscaricano al prossimo accesso all'area.
      </p>
      {elenco.errore && <p className="m-0 testo-13 text-error-testo">{elenco.errore}</p>}
      <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Immagini caricate per ambito">
        {AMBITI.map((a) => {
          const n = conteggi[a.chiave] ?? 0;
          return (
            <li key={a.chiave} className="flex items-center justify-between gap-2 border border-border-light px-3 py-2">
              <span className="testo-13"><strong>{a.nome}</strong> <span className="text-text-muted">· {n} {n === 1 ? 'immagine' : 'immagini'}</span></span>
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi" disabled={n === 0 || occupato} onClick={() => setDaRimuovere(a.chiave)} aria-label={`Rimuovi le immagini caricate per ${a.nome}`} />
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 flex-wrap">
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={<>Rimuovi tutte ({totale})</>} disabled={totale === 0 || occupato} onClick={() => setDaRimuovere('tutte')} />
        <span className="testo-12 text-text-muted">{elenco.dati ? `${totale} ${totale === 1 ? 'immagine caricata' : 'immagini caricate'} in questa istanza.` : 'Conteggio in corso…'}</span>
      </div>
      <Modal
        titolo="Conferma rimozione"
        aperta={daRimuovere !== null}
        onChiudi={chiudi}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={chiudi}>Annulla</button>
            {pezziDaConfermare
              ? <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Rimuovi anche i pezzi" disabled={occupato} onClick={() => void rimuovi(true)} />
              : <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Rimuovi" disabled={occupato} onClick={() => void rimuovi()} />}
          </>
        }
      >
        <p className="m-0 testo-14">Rimuovere {daRimuovere ? nomeAmbito(daRimuovere) : ''}? L'app tornerà a mostrare la grafica predefinita; l'operazione non si può annullare.</p>
        {pezziDaConfermare && <p className="m-0 mt-2 testo-14 text-warning">{pezziDaConfermare} I pezzi sono ritagli in pixel di quelle immagini: senza di loro non hanno più senso e se ne vanno con loro.</p>}
      </Modal>
    </section>
  );
}
