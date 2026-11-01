// ============================================================
// InvitoInstallazione — l'invito a installare l'app, sulla Home, la prima volta che la si apre da telefono o tablet
// ============================================================
//
// Richiesta dell'utente (2026-11-01): «Vorrei che i fe quando aperti da mobile o tablet si installassero come app» — una web app
// collegata al browser, non un'app vera e propria —, «come modale in primo piano sulla home page la prima volta soltanto». Un sito non
// si installa da solo: l'invito apre la finestra d'installazione del browser con un tocco (Android: Chrome, Edge, Samsung Internet) o
// dice i due passi di Safari (iPhone e iPad); con gli altri browser indica la voce del menu. Una volta per dispositivo (preferenza del
// browser, `localStorage`), solo con lo schermo a tocco e mai con l'app già aperta come app installata.
// ============================================================

import { useEffect, useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { apertaComeApp, apriInstallazione, dispositivoApple, installabileDalBrowser, seCambiaInstallabile } from '../../utils/installazioneApp';
import { leggiMemoria, scriviMemoria } from '../../utils/memoriaDispositivo';

/** La chiave del browser che ricorda che l'invito è già stato mostrato su questo dispositivo. */
const CHIAVE_VISTO = 'p5r-invito-installazione';
/** L'attesa prima di aprire l'invito: lascia al browser il tempo di dire se l'app si installa con la sua finestra. */
const ATTESA_MS = 1500;

/** Già mostrato su questo dispositivo; senza memoria del dispositivo (`undefined`) vale come già mostrato. */
function giaVisto(): boolean {
  return leggiMemoria(CHIAVE_VISTO) !== null;
}
/** Ricorda che l'invito è stato mostrato; senza storage l'invito può tornare: niente di grave. */
function segnaVisto(): void {
  scriviMemoria(CHIAVE_VISTO, new Date().toISOString());
}
/** Telefono o tablet: lo schermo a tocco come puntatore principale. */
function aTocco(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/** L'icona «Condividi» di Safari (un riquadro con la freccia in su), decorativa: il testo accanto la nomina. */
function IconaCondividi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block align-text-bottom">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function InvitoInstallazione() {
  const [aperto, setAperto] = useState(false);
  const [dalBrowser, setDalBrowser] = useState(installabileDalBrowser);
  useEffect(() => seCambiaInstallabile(() => setDalBrowser(installabileDalBrowser())), []);
  useEffect(() => {
    if (giaVisto() || apertaComeApp() || !aTocco()) return;
    const t = window.setTimeout(() => { segnaVisto(); setAperto(true); }, ATTESA_MS);
    return () => window.clearTimeout(t);
  }, []);
  const chiudi = () => setAperto(false);
  // la finestra del browser può anche fallire: l'invito si chiude comunque, e l'utente ha la voce del menu
  const installa = async () => { try { await apriInstallazione(); } catch { /* niente da fare: si chiude */ } finally { chiudi(); } };
  const apple = dispositivoApple();

  return (
    <Modal titolo="Installa l'app" aperta={aperto} onChiudi={chiudi} idDescrizione="invito-installazione-testo"
      azioni={<>
        {dalBrowser && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="giu" dimensione={22} />} titolo="Installa" onClick={() => void installa()} />}
        <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo={dalBrowser ? 'Non ora' : 'Ho capito'} onClick={chiudi} />
      </>}>
      <div className="flex flex-col gap-3 testo-14">
        <div className="flex items-center gap-3">
          <img src="/pwa/icona-192.png" alt="" width={56} height={56} className="shrink-0 rounded-md" />
          <p id="invito-installazione-testo" className="m-0">Aggiungi P5R alla schermata Home: si apre a schermo intero, come un'app, e resta collegata al browser.</p>
        </div>
        {dalBrowser ? null : apple ? (
          <ol className="m-0 flex flex-col gap-1.5 pl-5">
            <li>Tocca <strong>Condividi</strong> <IconaCondividi /> nella barra del browser.</li>
            <li>Scegli <strong>Aggiungi alla schermata Home</strong>, poi <strong>Aggiungi</strong>.</li>
          </ol>
        ) : (
          <p className="m-0">Apri il menu del browser e scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.</p>
        )}
      </div>
    </Modal>
  );
}
