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
// in ErrorBoundary.tsx): stessa struttura, colori dei token del tema con il valore del token come ripiego (`var(--color-…, #valore)`), nessuno store, nessun asset
// caricato da sé. Il dettaglio tecnico lungo scorre in un'area col bordo visibile e `overscroll-behavior: contain`.
// ============================================================

import type { ReactNode } from 'react';
import { useInRouterContext, useLocation } from 'react-router-dom';
import { AssetImg } from './AssetImg';
import { IconAlert, IconHome } from './icons';
import { CollegamentoVisivo, PulsanteVisivo, type TonoPulsante } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';
import { useAssetMulti, useAssetStore } from '../../stores/assetStore';
import { usePreferenzeStore } from '../../stores/preferenzeStore';
import type { CausaErrore } from '../../hooks/useCarica';

/** Il titolo più usato: l'errore che non ha un nome più preciso. */
export const TITOLO_ERRORE = 'Qualcosa è andato storto';

/** Il titolo di una lettura a cui il server risponde 404: quello che si cerca non c'è (riprovare non serve). */
export const TITOLO_NON_TROVATO = 'Non trovato';

/** L'illustrazione d'errore generica (con `autonoma`, `ErrorBoundary`, la dà il manifest): è anche il ripiego delle due specifiche. */
const ILLUSTRAZIONE_ERRORE = 'illustrazioni/errore-senza-testo';
/** L'illustrazione neutra degli stati vuoti: il ripiego di «Non trovato», che non è un guasto. */
const ILLUSTRAZIONE_NEUTRA = 'illustrazioni/vuoto-persona-senza-testo';

/** Le illustrazioni che dicono la causa, dalla preferita al ripiego: `errore-offline` se il dispositivo è senza rete, `errore-server` se la rete cade,
 *  il server non risponde in tempo o risponde 5xx, `vuoto-ricerca` per un 404 (poi la neutra degli stati vuoti); per ogni altra causa (e per ogni
 *  errore di codice) la generica, che è anche il ripiego delle due di guasto. Se nessuna c'è resta l'icona. */
function illustrazioniErrore(causa: CausaErrore | undefined): readonly string[] {
  if (causa === 'offline') return ['illustrazioni/errore-offline', ILLUSTRAZIONE_ERRORE];
  if (causa === 'rete' || causa === 'timeout' || causa === 'server') return ['illustrazioni/errore-server', ILLUSTRAZIONE_ERRORE];
  if (causa === 'non-trovato') return ['illustrazioni/vuoto-ricerca', ILLUSTRAZIONE_NEUTRA];
  return [ILLUSTRAZIONE_ERRORE];
}

/** La misura del riquadro di una figura di stato (`.figura-stato--<misura>` in `tailwind.css`): altezza fissa e rapporto 3:2 delle illustrazioni 1200×800. */
export type MisuraFiguraStato = 'vuoto' | 'pagina' | 'errore' | 'riquadro';

/** La larghezza in pixel CSS del riquadro di ogni misura, data ad `AssetImg` per chiedere la miniatura (il server la serve WebP, `shared/miniature.ts`). */
const LARGHEZZA_FIGURA: Record<MisuraFiguraStato, number> = { vuoto: 320, pagina: 160, errore: 320, riquadro: 160 };

/**
 * La figura di uno stato (vuoto, errore, «Non trovato»): la prima di `nomi` che il manifest conosce, altrimenti il `ripiego` (un'icona).
 * Con la grafica predefinita attiva il riquadro ha SEMPRE la stessa misura dichiarata (altezza fissa, rapporto 3:2): vuoto finché il manifest
 * non è arrivato, poi la figura o l'icona al centro. Così il titolo sotto non scende quando il file arriva, e la figura si sceglie una volta sola,
 * a manifest caricato (prima la dedicata poteva cedere il posto alla neutra e poi tornare). Senza grafica predefinita resta l'icona, o niente.
 * Un file che dà 404 si segna mancante (`AssetImg`) e cede il posto alla figura seguente o all'icona, nello stesso riquadro.
 */
export function FiguraStato({ nomi, misura, ripiego }: { nomi: ReadonlyArray<string | null | undefined>; misura: MisuraFiguraStato; ripiego?: ReactNode }) {
  const attiva = usePreferenzeStore((s) => s.graficaPredefinita);
  const caricato = useAssetStore((s) => s.caricato);
  const url = useAssetMulti(nomi);
  const classe = `figura-stato figura-stato--${misura}`;
  if (!attiva) return ripiego ? <>{ripiego}</> : null;
  if (!caricato) return <span className={classe} aria-hidden="true" />;
  const indice = url.findIndex((u) => u !== null);
  const conRiquadro = ripiego ? <span className={`${classe} figura-stato--icona`} aria-hidden="true">{ripiego}</span> : null;
  if (indice < 0) return conRiquadro;
  return <AssetImg nome={nomi[indice]} alt="" decorativa className={classe} dimensione={LARGHEZZA_FIGURA[misura]} fallback={conRiquadro} />;
}

interface Props {
  titolo: string;
  /** Il genere dell'errore (`causaErrore` di `useCarica`): sceglie l'illustrazione (offline, server, «Non trovato», generica); con `non-trovato` il
   *  titolo è nel colore del testo e la vista non si annuncia come allarme. */
  causa?: CausaErrore;
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
export function VistaErrore({ titolo, causa, spiegazione, dettaglio, azioni, livello = 2, compatta = false, autonoma }: Props) {
  const Titolo = livello === 1 ? 'h1' : 'h2';
  const fisso = autonoma !== undefined;
  // un 404 non è un guasto: niente annuncio d'allarme e il titolo nel colore del testo
  const nonTrovato = causa === 'non-trovato';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${fisso ? 'min-h-dvh p-6 font-sans bg-[color:var(--color-bg,#0b0b0e)] text-[color:var(--color-text,#ececf1)]' : compatta ? 'py-8 px-4' : 'flex-1 min-h-[40vh] p-6'}`}
      role={nonTrovato ? 'status' : 'alert'}
    >
      {fisso ? (
        autonoma.illustrazione
          ? <img src={autonoma.illustrazione} alt="" className={`${compatta ? 'max-h-[96px]' : 'max-h-[150px]'} w-auto object-contain`} draggable={false} />
          : <IconAlert size={32} className="text-[color:var(--color-error-testo,#fb7c7c)]" />
      ) : (
        <FiguraStato nomi={illustrazioniErrore(causa)} misura={compatta ? 'riquadro' : 'errore'}
          ripiego={<IconAlert size={32} className={nonTrovato ? 'text-text-muted' : 'text-error-testo'} />} />
      )}
      <Titolo className={`m-0 font-decor uppercase tracking-wide leading-none ${compatta ? 'testo-24' : 'testo-28'} ${fisso ? 'text-[color:var(--color-error-testo,#fb7c7c)]' : nonTrovato ? 'text-text' : 'text-error-testo'}`}>
        {titolo}
      </Titolo>
      {spiegazione && <p className={`m-0 max-w-[460px] ${fisso ? 'text-[color:var(--color-text-secondary,#a3a3b3)]' : 'text-text-secondary'}`}>{spiegazione}</p>}
      {dettaglio && (
        <p className={`m-0 max-w-[460px] max-h-[120px] overflow-y-auto overscroll-contain rounded-md border px-3 py-2 whitespace-pre-wrap break-words testo-13 ${fisso ? 'border-[color:var(--color-border,#34343f)] text-[color:var(--color-text-muted,#8e8ea0)]' : 'border-border text-text-muted'}`}>
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

/** «Torna all'elenco»: all'elenco a cui appartiene la scheda che non c'è (la rotta di ripiego della scheda). */
export function AzioneElenco({ to }: { to: string }) {
  return <CollegamentoVisivo to={to} tono="primario" compatto icona={<IconaAzione chiave="tutti" dimensione={20} />} titolo="Torna all'elenco" />;
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
