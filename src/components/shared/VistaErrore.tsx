// ============================================================
// VistaErrore — la sola presentazione di un errore nell'app (lotto B, punto 8)
// ============================================================
//
// Prima le schermate d'errore erano tre, ognuna a modo suo: `PageState` (illustrazione, h3 sotto l'h1 della pagina, «Riprova»),
// `ErrorePagina` (icona, h2, pulsanti grigi di solo testo, «Vai alla Home») ed `ErrorBoundary` (riquadro col bordo rosso,
// «Ricarica app»). Ora la gerarchia è una: illustrazione → titolo → spiegazione → dettaglio tecnico → azioni («Riprova»,
// «Torna alla home» e le altre del caso), con `PulsanteVisivo` e i token del tema.
//
// Il livello del titolo lo sceglie chi la usa: h1 quando l'errore è tutta la pagina (route caduta, app caduta), h2 sotto
// l'intestazione di una pagina che c'è (`PageState`) o in un riquadro.
//
// `autonoma`: la variante di `ErrorBoundary`, che sta sopra tutto e deve leggersi anche se il tema non c'è (scelta documentata
// in ErrorBoundary.tsx): stessa struttura, colori scritti a mano con i valori dei token, nessuno store, nessun asset caricato da sé.
// ============================================================

import type { ReactNode } from 'react';
import { useInRouterContext, useLocation } from 'react-router-dom';
import { AssetImg } from './AssetImg';
import { IconAlert, IconHome } from './icons';
import { CollegamentoVisivo, PulsanteVisivo, type TonoPulsante } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';

/** Il titolo più usato: l'errore che non ha un nome più preciso. */
export const TITOLO_ERRORE = 'Qualcosa è andato storto';

interface Props {
  titolo: string;
  /** Che cosa è successo e che cosa resta (i dati salvati), in parole dell'utente. */
  spiegazione?: ReactNode;
  /** Il messaggio tecnico dell'errore, più piccolo e attenuato. */
  dettaglio?: string | null;
  /** I pulsanti (`AzioneRiprova`, `AzioneHome`, …); in ordine d'importanza. */
  azioni?: ReactNode;
  /** 1 se la vista è tutta la pagina, 2 sotto l'intestazione di una pagina o in un riquadro (default 2). */
  livello?: 1 | 2;
  /** Dentro un riquadro: meno spazio, illustrazione più piccola. */
  compatta?: boolean;
  /** Variante a colori fissi di `ErrorBoundary`: l'URL dell'illustrazione d'errore se il manifest la conosce (null = icona). */
  autonoma?: { illustrazione: string | null };
}

/** Titolo, spiegazione, dettaglio e azioni di un errore, con la stessa gerarchia ovunque. */
export function VistaErrore({ titolo, spiegazione, dettaglio, azioni, livello = 2, compatta = false, autonoma }: Props) {
  const Titolo = livello === 1 ? 'h1' : 'h2';
  const fisso = autonoma !== undefined;
  const altezzaFigura = compatta ? 'max-h-[96px]' : 'max-h-[150px]';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${fisso ? 'min-h-dvh p-6 font-sans bg-[#0b0b0e] text-[#ececf1]' : compatta ? 'py-8 px-4' : 'flex-1 min-h-[40vh] p-6'}`}
      role="alert"
    >
      {fisso ? (
        autonoma.illustrazione
          ? <img src={autonoma.illustrazione} alt="" className={`${altezzaFigura} w-auto object-contain`} draggable={false} />
          : <IconAlert size={32} className="text-[#ef4444]" />
      ) : (
        <AssetImg nome="illustrazioni/errore-senza-testo" alt="" decorativa className={`${altezzaFigura} w-auto object-contain`} fallback={<IconAlert size={32} className="text-error-testo" />} />
      )}
      <Titolo className={`m-0 font-decor uppercase tracking-wide leading-none ${compatta ? 'testo-24' : 'testo-28'} ${fisso ? 'text-[#ef4444]' : 'text-error-testo'}`}>
        {titolo}
      </Titolo>
      {spiegazione && <p className={`m-0 max-w-[460px] ${fisso ? 'text-[#a3a3b3]' : 'text-text-secondary'}`}>{spiegazione}</p>}
      {dettaglio && (
        <p className={`m-0 max-w-[460px] max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words testo-13 ${fisso ? 'text-[#8e8ea0]' : 'text-text-muted'}`}>
          {dettaglio}
        </p>
      )}
      {azioni && <div className="flex flex-wrap items-center justify-center gap-2">{azioni}</div>}
    </div>
  );
}

/** «Riprova»: ripete il caricamento o ridisegna ciò che è caduto. */
export function AzioneRiprova({ onClick, tono = 'primario', inCorso = false }: { onClick: () => void; tono?: TonoPulsante; inCorso?: boolean }) {
  // `inCorso`: la ripetizione è già partita, il pulsante resta ma non si può ripremere finché non finisce
  return <PulsanteVisivo tono={tono} compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={onClick} disabled={inCorso} />;
}

/** «Torna indietro»: alla pagina di prima. */
export function AzioneIndietro({ onClick }: { onClick: () => void }) {
  return <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo="Torna indietro" onClick={onClick} />;
}

/** «Torna alla home» con l'icona della Home della navigazione; niente se si è già sulla Home o fuori dal router. */
export function AzioneHome() {
  // fuori dal router (un componente provato da solo) un collegamento non si può fare: si resta con le altre azioni
  return useInRouterContext() ? <AzioneHomeNelRouter /> : null;
}

/** Il collegamento vero e proprio (legge la posizione: va montato dentro il router). */
function AzioneHomeNelRouter() {
  const { pathname } = useLocation();
  if (pathname === '/home' || pathname === '/') return null;
  return (
    <CollegamentoVisivo
      to="/home"
      tono="secondario"
      compatto
      icona={<AssetImg nome="ui/nav-home" alt="" decorativa className="object-contain" style={{ width: 20, height: 20 }} fallback={<IconHome size={20} />} />}
      titolo="Torna alla home"
    />
  );
}
