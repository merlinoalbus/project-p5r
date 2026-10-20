// ============================================================
// MappaIncorporata — visore a altezza fissa dentro una pagina (Città, quartiere, area di un Palazzo, home della Partita) — Fase 13.4
// ============================================================
//
// Stesso visore dello schermo intero: navigazione fra i livelli apre la pagina a schermo intero; «Modifica planimetria» apre l'editor (L2: il gesto porta il nome di quel che modifica).
// ============================================================

import { haPlanimetria } from '../../utils/haPlanimetria';
import { presentaMappa } from '../../utils/presentazioneMappa';
import { risolviMappa } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
import { nomeDellaMeta, urlMappa, type NavigaMappa } from '../../utils/navigazioneMappa';
import { nomeFiglieMappa } from '../../utils/vocabolarioMappe';
import { useEffect, useState, type ReactNode } from 'react';
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
  /** Lo spillo iniziale l'ha chiesto un comando di chi guarda (vedi `VisoreMappa.rivelaSelezione`): se non è disponibile adesso si mostra. */
  rivelaSpilloIniziale?: boolean;
  /** Partita per lo stato degli spilli (predefinita: quella attiva). */
  partitaId?: number | null;
  /** Mostra «Modifica planimetria». Predefinito **sì**, che è giusto nelle pagine dell'atlante.
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
  /** Contenuti in più nel pannello del visore (la pagina dell'Area ci mette «Luoghi qui» e «Aree vicine», L2). */
  contenutiPannello?: ReactNode;
  /** Opzioni del visore per la pagina dell'Area (L2): pannello aperto all'inizio, il solo titolo nella barra, niente «Su: …». */
  pannelloIniziale?: boolean;
  onPannello?: (aperto: boolean) => void;
  titoloVisore?: string;
  senzaVicine?: boolean;
  /** Il nome del posto mostrato, per dirlo anche quando la mappa non si carica (L2, M11: mai la chiave interna). */
  nome?: string;
}

/** Risolve prima la chiave ricevuta: se è una sezione
 * della guida mostra un riquadro col collegamento al luogo che la contiene, aperto su quell'area;
 * se è una mappa passa a `MappaIncorporataRisolta` con la chiave risolta. Solo la chiave rifà la risoluzione: la `versione`
 * (gli stati cambiati dalla pagina) la rilegge `useMappaPartita` tenendo la mappa a schermo. Prima la cambiava anche lei, e ogni
 * tocco di un pin nel «Collega pin» smontava la mappa sotto uno spinner: zoom azzerato e colonna che saltava («ogni volta che
 * clicco su un pin mi si sposta la mappa», «mi si resetta anche lo zoom», 2026-10-18). */
export function MappaIncorporata(props: Props) {
  const esito = useCarica(() => risolviMappa(props.chiave), [props.chiave]);
  return <PageState isLoading={esito.caricamento} error={esito.errore} onRetry={esito.ricarica}>
    {esito.dati?.tipo === 'guida' ? <div className="card flex flex-col gap-2">
      <h3 className="m-0 text-base">{esito.dati.nome}</h3>
      <Link className="touch inline-flex items-center self-start" to={`/guida/mappe/${encodeURIComponent(esito.dati.mappaPalazzo)}?area=${encodeURIComponent(esito.dati.area)}`}>Apri la planimetria e i contenuti della guida</Link>
    </div> : esito.dati?.tipo === 'mappa' ? <MappaIncorporataRisolta {...props} chiave={esito.dati.mappa} /> : null}
  </PageState>;
}

/** Il visore di una mappa già risolta, con lo stato degli spilli della partita indicata (o di quella
 * attiva). Mostra uno spinner al primo caricamento e un avviso con «Riprova» se la mappa manca; una
 * mappa senza planimetria diventa una scheda con il collegamento e l'elenco scorrevole delle figlie.
 * Altrimenti incorpora `VisoreMappa` (rimontato quando cambiano mappa, spillo o punto iniziale) con
 * «Schermo intero», che porta la stessa istanza a tutto schermo finché non si chiude o si preme Esc,
 * e, se `conEditor`, «Modifica planimetria». Senza `onNaviga` la navigazione fra livelli apre la pagina
 * della mappa. Senza `altezza` né classi dell'ospite il riquadro è alto 560 px. */
function MappaIncorporataRisolta({ chiave, versione, onCambiato, altezza, className, classeVisore, spilloIniziale, rivelaSpilloIniziale, puntoIniziale, onNaviga, partitaId: partitaEsplicita, conEditor = true, scelta, contenutiPannello, nome, pannelloIniziale, onPannello, titoloVisore, senzaVicine }: Props) {
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
        {/* il nome del posto, mai la chiave interna (L2, M11); «La città», non «Tutte le mappe» */}
        <span>{errore ? `${nome ?? 'Questo posto'} non disponibile: ${errore}` : `${nome ?? 'Questo posto'} non c’è più nella guida.`}</span>
        <div className="flex gap-1.5"><CollegamentoVisivo to="/guida/citta" tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="La città" />{errore && <button type="button" className="visore-mappa__azione-testo" onClick={() => void ricarica()}>Riprova</button>}</div>
      </div>
    );
  }
  // Le mappe figlie in un'area scorrevole propria (rilievo dell'utente, 2026-10-01): le stanze di un Palazzo sono decine
  // e l'elenco usciva dal riquadro della scheda «Oggi». Nel riquadro con un'altezza (`className` dell'ospite) l'area
  // prende lo spazio che resta; senza, ha un tetto suo.
  if (!haPlanimetria(mappa)) return <section className={`card flex flex-col gap-2 min-h-0 ${className ?? ''}`}>
    <h3 className="m-0">{mappa.nome}</h3>
    {/* Una planimetria appena aggiunta non ha ancora l'immagine: qui si va dritti a caricarla («come dovrei fare per aggiungere una
        planimetria?», 2026-10-18; prima la strada era la pagina del luogo, «Modifica luogo», poi la sezione Mappa) */}
    {/* solo senza ruolo: uno stemma caricato resta uno stemma (non si aprirebbe nel visore) */}
    {conEditor && !mappa.figli.length && (mappa.ruoloImmagine ?? 'nessuna') === 'nessuna' && <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica?sezione=mappa`} tono="primario" compatto className="self-start"
      icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Carica l’immagine" dettaglio="la planimetria si apre qui" />}
    {/* il gesto porta il nome del posto (L2, M10 e M12), e la sua casa */}
    <Link className="touch inline-flex items-center self-start" to={mappa.casa ? mappa.casa : urlMappa(mappa.chiave)}>Apri {nomeDellaMeta(mappa)}</Link>
    {!!mappa.figli.length && <ul className="m-0 px-2 py-1 list-none area-scorrevole min-h-0 flex-1 max-h-[min(60vh,520px)]" aria-label={`${nomeFiglieMappa(mappa.tipo)} di ${mappa.nome}`}>
      {mappa.figli.map(f => <li key={f.chiave}><Link className="touch inline-flex items-center" to={f.casa ? f.casa : urlMappa(f.chiave)}>{nomeDellaMeta(f)}</Link></li>)}
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
        rivelaSelezione={rivelaSpilloIniziale}
        incorporato={!intero}
        onNaviga={onNaviga ?? ((k, arrivo) => navigate(urlMappa(k, arrivo)))}
        onRaccolto={raccolto}
        onStatoPunto={statoPunto}
        onAcquisto={acquisto}
        onChiudi={intero ? () => setIntero(false) : undefined}
        scelta={scelta}
        contenutiPannello={contenutiPannello}
        pannelloIniziale={pannelloIniziale}
        onPannello={onPannello}
        titolo={titoloVisore}
        senzaVicine={senzaVicine}
        etichettaChiudi="Torna alla pagina"
        azioni={<>
          {!intero && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="ingrandisci" dimensione={20} />} titolo="Schermo intero" onClick={() => setIntero(true)} />}
          {conEditor && <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica planimetria" />}
        </>}
      />
    </div>
  );
}
