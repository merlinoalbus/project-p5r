// ============================================================
// PageState / EmptyState / Spinner — stati di pagina uniformi (Fase 11.1: sempre illustrati quando gli asset esistono)
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { useAssetMulti } from '../../stores/assetStore';
import { AzioneHome, AzioneRiprova, TITOLO_ERRORE, VistaErrore } from './VistaErrore';
import { IntestazioneScheda } from './IntestazioneScheda';
import type { CausaErrore } from '../../hooks/useCarica';

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
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** Il genere dell'errore (`causaErrore` di `useCarica`): il titolo dice «Sei offline» solo se offline, «Server non raggiungibile» se la rete cade o il
   *  server non risponde in tempo, altrimenti «Qualcosa è andato storto». */
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
  return TITOLO_ERRORE;
}

/** Switch uniforme caricamento / errore / contenuto per ogni pagina. */
export function PageState({ isLoading, error, onRetry, causa = null, scheda, children }: PageStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) {
    // un solo aspetto per gli errori (VistaErrore); h2: sta sotto l'h1 dell'intestazione della pagina
    const vista = (
      <VistaErrore
        titolo={titoloPerCausa(causa)}
        spiegazione={error}
        azioni={<>
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

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Nome dell'illustrazione dedicata (`illustrazioni/<nome>`); se manca si usa quella neutra, poi l'icona. */
  illustrazione?: string;
  /** Il livello del titolo: h2 (default, lo stato vuoto sta sotto l'h1 della pagina), h1 quando è la pagina intera (la 404) o h3 sotto un h2. */
  livello?: 1 | 2 | 3;
  /** La pagina intera che non deve superare il 30% dell'altezza della schermata (la 404): illustrazione piccola e, da 640 px in su,
   *  illustrazione e testo affiancati; niente altezza minima. */
  compatta?: boolean;
}

/** Stato vuoto illustrato con messaggio, suggerimento e azione facoltativa. */
export function EmptyState({ icon, title, hint, action, illustrazione, livello = 2, compatta = false }: EmptyStateProps) {
  const dedicata = illustrazione ? `illustrazioni/${illustrazione}` : null;
  const [urlDedicata, urlNeutra] = useAssetMulti([dedicata, ILLUSTRAZIONE_NEUTRA]);
  const nome = urlDedicata ? dedicata : urlNeutra ? ILLUSTRAZIONE_NEUTRA : null;
  const Titolo = livello === 1 ? 'h1' : livello === 3 ? 'h3' : 'h2';
  if (compatta) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
        <AssetImg
          nome={nome}
          alt=""
          decorativa
          className="max-h-[min(80px,9dvh)] sm:max-h-[min(120px,16dvh)] w-auto object-contain"
          fallback={icon ? <div className="text-text-muted testo-40 leading-none">{icon}</div> : null}
        />
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
      <AssetImg
        nome={nome}
        alt=""
        decorativa
        className="max-h-[200px] w-auto object-contain"
        fallback={icon ? <div className="text-text-muted testo-40 leading-none">{icon}</div> : null}
      />
      <Titolo className="m-0 font-decor uppercase tracking-wide testo-28 leading-none text-text">{title}</Titolo>
      {hint && <p className="m-0 testo-14 text-text-muted max-w-[420px]">{hint}</p>}
      {action && <div className="mt-2 flex gap-2">{action}</div>}
    </div>
  );
}
