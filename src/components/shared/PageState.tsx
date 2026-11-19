// ============================================================
// PageState / EmptyState / Spinner — stati di pagina uniformi (Fase 11.1: sempre illustrati quando gli asset esistono)
// ============================================================

import type { ReactNode } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { AssetImg } from './AssetImg';
import { useAssetMulti } from '../../stores/assetStore';
import { AzioneElenco, AzioneHome, AzioneIndietro, AzioneRiprova, FiguraStato, TITOLO_ERRORE, TITOLO_NON_TROVATO, VistaErrore } from './VistaErrore';
import { IntestazioneScheda } from './IntestazioneScheda';
import type { CausaErrore, StatoLettura } from '../../hooks/useCarica';
import { ceUnaPaginaPrima } from '../../hooks/useIndietro';
import { useTitoloErrore } from '../../hooks/useDocumentTitle';

const FOTOGRAMMI = Array.from({ length: 8 }, (_, i) => `illustrazioni/caricamento-${i + 1}`);
const ILLUSTRAZIONE_NEUTRA = 'illustrazioni/vuoto-persona-senza-testo';

/** Indicatore di caricamento: gli otto fotogrammi animati se ci sono tutti, altrimenti l'anello. */
export function Spinner({ size = 24 }: { size?: number }) {
  const fotogrammi = useAssetMulti(FOTOGRAMMI).filter((u): u is string => u !== null);
  if (fotogrammi.length === FOTOGRAMMI.length) {
    const lato = Math.max(size, 56);
    return (
      <div className="relative shrink-0" style={{ width: lato, height: lato }} role="status" aria-label="Caricamento">
        {fotogrammi.map((url, i) => (
          <img key={url} src={url} alt="" className="fotogramma absolute inset-0 w-full h-full object-contain" style={{ animationDelay: `${-i * 0.1}s` }} draggable={false} />
        ))}
      </div>
    );
  }
  return (
    <div
      className="border-2 border-border border-t-primary rounded-full animate-[spin_0.8s_linear_infinite]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Caricamento"
    />
  );
}

interface PageStateProps {
  /** La lettura (o le letture) di `useCarica` che la pagina mostra: `PageState` ne legge da sé il primo caricamento (`inPrimoCaricamento` di una
   *  qualunque), l'errore con la sua causa (il primo che c'è) e la rilettura («Riprova» le rilegge tutte). È il modo normale di usarlo: la causa
   *  viaggia con lo stato e non si può dimenticare. Le prop qui sotto restano per i casi che non vengono da `useCarica` e, passate, prevalgono. */
  carica?: StatoLettura | ReadonlyArray<StatoLettura>;
  /** Al posto del primo caricamento delle letture. */
  isLoading?: boolean;
  /** Al posto dell'errore delle letture (`null`: nessun errore da mostrare). La causa delle letture vale solo se il messaggio è il loro. */
  error?: string | null;
  /** Al posto della rilettura delle letture. */
  onRetry?: () => void;
  /** Il genere dell'errore, al posto di quello delle letture: il titolo dice «Sei offline» solo se offline, «Server non raggiungibile» se la rete cade o
   *  il server non risponde in tempo, «Non trovato» per un 404 (senza «Riprova»), altrimenti «Qualcosa è andato storto». */
  causa?: CausaErrore;
  /** Le schede di dettaglio (lotto C): in errore resta l'intestazione con «Indietro» e un h1 col nome generico della scheda («Skill»,
   *  «Palazzo»), e l'errore sta sotto come h2. Senza, l'errore sarebbe un h2 senza h1 e senza modo di tornare se non dal menu. */
  scheda?: { titolo: string; ripiego: string };
  children: ReactNode;
}

/** Il titolo vero dell'errore: offline è solo il dispositivo senza rete; se la rete cade o il server tace, il server non si raggiunge. */
function titoloPerCausa(causa: CausaErrore): string {
  if (causa === 'offline') return 'Sei offline';
  if (causa === 'rete' || causa === 'timeout') return 'Server non raggiungibile';
  if (causa === 'non-trovato') return TITOLO_NON_TROVATO;
  return TITOLO_ERRORE;
}

function elencoLetture(carica: PageStateProps['carica']): ReadonlyArray<StatoLettura> {
  if (!carica) return [];
  return 'ricarica' in carica ? [carica] : carica;
}

/** «Torna indietro» solo se c'è una pagina dell'app prima (da un collegamento diretto uscirebbe dall'app) e dentro il router. */
function AzioneIndietroSePossibile() {
  return useInRouterContext() && ceUnaPaginaPrima() ? <AzioneIndietroNelRouter /> : null;
}

function AzioneIndietroNelRouter() {
  const navigate = useNavigate();
  return <AzioneIndietro onClick={() => void navigate(-1)} />;
}

/** Switch uniforme caricamento / errore / contenuto per ogni pagina. */
export function PageState({ carica, isLoading: isLoadingPassato, error: errorePassato, onRetry: onRetryPassato, causa: causaPassata, scheda, children }: PageStateProps) {
  const letture = elencoLetture(carica);
  const isLoading = isLoadingPassato ?? letture.some((l) => l.inPrimoCaricamento);
  const fallita = letture.find((l) => l.errore !== null);
  const error = errorePassato !== undefined ? errorePassato : fallita?.errore ?? null;
  // la causa passata dalla pagina, altrimenti quella della lettura fallita, solo se il messaggio mostrato è il suo
  const causa = causaPassata !== undefined ? causaPassata : fallita && fallita.errore === error ? fallita.causaErrore : null;
  const onRetry = onRetryPassato ?? (letture.length > 0 ? () => { for (const l of letture) void l.ricarica(); } : undefined);
  // una scheda in errore è tutta la pagina: il titolo della scheda del browser dice l'errore («Non trovato — …»), non il nome generico
  useTitoloErrore(!isLoading && error && scheda ? titoloPerCausa(causa) : null);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) {
    // un solo aspetto per gli errori (VistaErrore); h2: sta sotto l'h1 dell'intestazione della pagina. Un 404 non si riprova: si torna
    // all'elenco della scheda (o alla pagina di prima) o alla home
    const vista = (
      <VistaErrore
        titolo={titoloPerCausa(causa)}
        causa={causa}
        spiegazione={error}
        azioni={causa === 'non-trovato' ? <>
          {scheda ? <AzioneElenco to={scheda.ripiego} /> : <AzioneIndietroSePossibile />}
          <AzioneHome />
        </> : <>
          {onRetry && <AzioneRiprova onClick={onRetry} />}
          <AzioneHome />
        </>}
      />
    );
    if (!scheda) return vista;
    return (
      <div className="flex flex-1 flex-col gap-4">
        <IntestazioneScheda titolo={scheda.titolo} ripiego={scheda.ripiego} />
        {vista}
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * La figura di uno stato vuoto che sta dentro una riga o un riquadro (la ricerca senza risultati, il giorno senza voci): `illustrazioni/<nome>`
 * se è nel manifest e si carica, altrimenti NIENTE (nessuno spazio, nessuna icona rotta, nessuna richiesta ripetuta: un 404 la segna mancante
 * una volta sola, `AssetImg`). Appena il file è nel database compare da sola, alla riga di testo già mostrata si affianca la figura. L'altezza e
 * il rapporto 3:2 delle illustrazioni di stato (1200×800) sono dichiarati, così quando arriva non sposta il testo. Decorativa: il testo accanto dice già tutto.
 * Si chiede la miniatura da 160 px (il riquadro è largo 144 px): WebP di poche decine di KB invece del PNG pieno da 500–870 KB.
 */
export function FiguraVuoto({ illustrazione, className = '' }: { illustrazione: string; className?: string }) {
  return (
    <AssetImg
      nome={`illustrazioni/${illustrazione}`}
      alt=""
      decorativa
      className={`figura-vuoto shrink-0 ${className}`}
      dimensione={160}
      fallback={null}
    />
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Nome dell'illustrazione dedicata (`illustrazioni/<nome>`, es. `vuoto-ricerca`); se non è nel manifest o non si carica si usa quella neutra, poi
   *  l'icona. La scelta la fa `FiguraStato` a manifest caricato, nel riquadro di misura fissa (nessun salto del titolo, nessun cambio di figura). */
  illustrazione?: string;
  /** Il livello del titolo: h2 (default, lo stato vuoto sta sotto l'h1 della pagina), h1 quando è la pagina intera (la 404) o h3 sotto un h2. */
  livello?: 1 | 2 | 3;
  /** La pagina intera che non deve superare il 30% dell'altezza della schermata (la 404): illustrazione piccola e, da 640 px in su,
   *  illustrazione e testo affiancati; niente altezza minima. */
  compatta?: boolean;
}

/** Stato vuoto illustrato con messaggio, suggerimento e azione facoltativa. */
export function EmptyState({ icon, title, hint, action, illustrazione, livello = 2, compatta = false }: EmptyStateProps) {
  const nomi = [illustrazione ? `illustrazioni/${illustrazione}` : null, ILLUSTRAZIONE_NEUTRA];
  const ripiego = icon ? <div className="text-text-muted testo-40 leading-none">{icon}</div> : undefined;
  const Titolo = livello === 1 ? 'h1' : livello === 3 ? 'h3' : 'h2';
  if (compatta) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
        <FiguraStato nomi={nomi} misura="pagina" ripiego={ripiego} />
        <div className="flex flex-col items-center sm:items-start gap-2">
          <Titolo className="m-0 font-decor uppercase tracking-wide testo-28 leading-none text-text">{title}</Titolo>
          {hint && <p className="m-0 testo-14 text-text-muted max-w-[420px]">{hint}</p>}
          {action && <div className="mt-1 flex gap-2">{action}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
      <FiguraStato nomi={nomi} misura="vuoto" ripiego={ripiego} />
      <Titolo className="m-0 font-decor uppercase tracking-wide testo-28 leading-none text-text">{title}</Titolo>
      {hint && <p className="m-0 testo-14 text-text-muted max-w-[420px]">{hint}</p>}
      {action && <div className="mt-2 flex gap-2">{action}</div>}
    </div>
  );
}
