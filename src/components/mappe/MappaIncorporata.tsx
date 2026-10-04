// ============================================================
// MappaIncorporata — il visore delle mappe dentro un'altra pagina (descrizione completa più sotto)
// ============================================================

import { haPlanimetria } from '../../utils/haPlanimetria';
import { presentaMappa } from '../../utils/presentazioneMappa';
import { risolviMappa } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
// ============================================================
// MappaIncorporata — visore a altezza fissa dentro una pagina (Città, quartiere, area di un Palazzo, home della Partita) — Fase 13.4
// ============================================================
//
// Stesso visore dello schermo intero: navigazione fra i livelli apre la pagina a schermo intero; «Modifica mappa» apre l'editor.
// ============================================================

import { urlMappa, type NavigaMappa } from '../../utils/navigazioneMappa';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePartitaStore } from '../../stores/partitaStore';
import { useMappaPartita } from '../../hooks/useMappaPartita';
import { VisoreMappa, type SceltaPin } from './VisoreMappa';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Spinner } from '../shared/PageState';

interface Props {
  chiave: string;
  puntoIniziale?: {x:number;y:number;zoom:number}|null;
  onNaviga?: NavigaMappa;
  /** Cambia per forzare un nuovo caricamento (es. dopo un'azione della pagina ospite). */
  versione?: string | number;
  /** Avvisa la pagina ospite dopo un'azione salvata dal visore (raccolto, punto della Guida, acquisto). */
  onCambiato?: () => void;
  /** Altezza del riquadro (numero in px o espressione CSS, es. `calc(100vh - 220px)`); predefinita 560 px. */
  altezza?: number | string;
  className?: string;
  /** Classi del solo riquadro del visore, per un'altezza che cambia con lo schermo (in alternativa ad `altezza`).
   *  Non valgono per la scheda di una mappa senza planimetria, che resta alta quanto il suo contenuto. */
  classeVisore?: string;
  /** Spillo da selezionare e centrare all'apertura. */
  spilloIniziale?: number | null;
  /** Partita per lo stato degli spilli (predefinita: quella attiva). */
  partitaId?: number | null;
  /** Mostra «Modifica mappa». Predefinito **sì**, che è giusto nelle pagine dell'atlante.
   *
   * Va spento dove il visore è **citato dentro un'altra pagina** per dire dove si trova una cosa:
   * lì si sta leggendo un libro o un negozio, non curando la mappa, e un pulsante che porta
   * all'editor invita a modificare l'atlante da un posto dove nessuno lo sta guardando. Trovato
   * verificando i Libri di Codex: il pannello «Mostra posizione» esibiva «MODIFICA MAPPA», e il
   * pulsante veniva da qui — cioè da me. In `CittaPage` l'avevo già tolto, ma per un'altra strada
   * (togliendo il visore), quindi il difetto era rimasto in piedi ovunque si usi `DoveSiTrova`. */
  conEditor?: boolean;
  /** Modalità scelta dei pin per una voce della guida (vedi `VisoreMappa`). */
  scelta?: SceltaPin;
}

/** Risolve prima la chiave ricevuta (si ricarica anche al cambio di `versione`): se è una sezione
 * della guida mostra un riquadro col collegamento al luogo che la contiene, aperto su quell'area;
 * se è una mappa passa a `MappaIncorporataRisolta` con la chiave risolta. */
export function MappaIncorporata(props: Props) {
  const esito = useCarica(() => risolviMappa(props.chiave), [props.chiave, props.versione]);
  return <PageState isLoading={esito.caricamento} error={esito.errore} onRetry={esito.ricarica}>
    {esito.dati?.tipo === 'guida' ? <div className="card flex flex-col gap-2">
      <h3 className="m-0 text-base">{esito.dati.nome}</h3>
      <Link className="touch inline-flex items-center self-start" to={`/guida/mappe/${encodeURIComponent(esito.dati.mappaPalazzo)}?area=${encodeURIComponent(esito.dati.area)}`}>Apri il luogo e i contenuti della guida</Link>
    </div> : esito.dati?.tipo === 'mappa' ? <MappaIncorporataRisolta {...props} chiave={esito.dati.mappa} /> : null}
  </PageState>;
}

/** Il visore di una mappa già risolta, con lo stato degli spilli della partita indicata (o di quella
 * attiva). Mostra uno spinner al primo caricamento e un avviso con «Riprova» se la mappa manca; una
 * mappa senza planimetria diventa una scheda con il collegamento e l'elenco scorrevole delle figlie.
 * Altrimenti incorpora `VisoreMappa` (rimontato quando cambiano mappa, spillo o punto iniziale) con
 * «Schermo intero», che porta la stessa istanza a tutto schermo finché non si chiude o si preme Esc,
 * e, se `conEditor`, «Modifica mappa». Senza `onNaviga` la navigazione fra livelli apre la pagina
 * della mappa. Senza `altezza` né classi dell'ospite il riquadro è alto 560 px. */
function MappaIncorporataRisolta({ chiave, versione, onCambiato, altezza, className, classeVisore, spilloIniziale, puntoIniziale, onNaviga, partitaId: partitaEsplicita, conEditor = true, scelta }: Props) {
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = partitaEsplicita !== undefined ? partitaEsplicita : attiva?.id ?? null;
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId, { versione, onCambiato });
  // Schermo intero in pagina: stessa istanza del visore (zoom e selezione restano), «Torna alla pagina» o Esc per rientrare
  const [intero, setIntero] = useState(false);
  useEffect(() => {
    if (!intero) return;
    /** Esc riporta il visore dentro la pagina. */
    const suTasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setIntero(false); };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [intero]);
  if (!mappa && caricamento) return <div className="flex items-center justify-center py-10 text-text-muted" aria-busy="true"><Spinner /></div>;
  if (!mappa) {
    return (
      <div className="card flex flex-col gap-2 text-[13px] text-text-secondary" role="status">
        <span>{errore ? `Mappa «${chiave}» non disponibile: ${errore}` : `Nessuna mappa «${chiave}».`}</span>
        <div className="flex gap-1.5"><CollegamentoVisivo to="/guida/mappe" tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Tutte le mappe" />{errore && <button type="button" className="visore-mappa__azione-testo" onClick={() => void ricarica()}>Riprova</button>}</div>
      </div>
    );
  }
  // Le mappe figlie in un'area scorrevole propria (rilievo dell'utente, 2026-10-01): le stanze di un Palazzo sono decine
  // e l'elenco usciva dal riquadro della scheda «Oggi». Nel riquadro con un'altezza (`className` dell'ospite) l'area
  // prende lo spazio che resta; senza, ha un tetto suo.
  if (!haPlanimetria(mappa)) return <section className={`card flex flex-col gap-2 min-h-0 ${className ?? ''}`}>
    <h3 className="m-0">{mappa.nome}</h3>
    <Link className="touch inline-flex items-center self-start" to={urlMappa(mappa.chiave)}>Apri il luogo e i contenuti della guida</Link>
    {!!mappa.figli.length && <ul className="m-0 px-2 py-1 list-none area-scorrevole min-h-0 flex-1 max-h-[min(60vh,520px)]" aria-label={`Mappe di ${mappa.nome}`}>
      {mappa.figli.map(f => <li key={f.chiave}><Link className="touch inline-flex items-center" to={urlMappa(f.chiave)}>{f.nome}</Link></li>)}
    </ul>}
  </section>;
  return (
    <div className={[className, classeVisore].filter(Boolean).join(' ') || undefined} style={altezza !== undefined ? { height: altezza } : className || classeVisore ? undefined : { height: 560 }}>
      <VisoreMappa
        key={`${mappa.chiave}-${spilloIniziale ?? ''}-${puntoIniziale?.x ?? ''}-${puntoIniziale?.y ?? ''}-${puntoIniziale?.zoom ?? ''}`}
        puntoIniziale={puntoIniziale}
        mappa={presentaMappa(mappa)}
        partitaId={partitaId}
        selezioneIniziale={spilloIniziale ?? null}
        incorporato={!intero}
        onNaviga={onNaviga ?? ((k, arrivo) => navigate(urlMappa(k, arrivo)))}
        onRaccolto={raccolto}
        onStatoPunto={statoPunto}
        onAcquisto={acquisto}
        onChiudi={intero ? () => setIntero(false) : undefined}
        scelta={scelta}
        etichettaChiudi="Torna alla pagina"
        azioni={<>
          {!intero && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="ingrandisci" dimensione={20} />} titolo="Schermo intero" onClick={() => setIntero(true)} />}
          {conEditor && <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" />}
        </>}
      />
    </div>
  );
}
