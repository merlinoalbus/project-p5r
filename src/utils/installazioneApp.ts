// ============================================================
// installazioneApp — l'installazione dell'app dal browser (web app sulla schermata Home, `manifest.webmanifest`)
// ============================================================
//
// Nessun browser installa un sito da solo: serve un tocco dell'utente. Chrome, Edge e Samsung Internet (Android) annunciano che l'app si
// può installare con l'evento `beforeinstallprompt`, una volta sola e spesso prima che la pagina che lo usa sia montata: per questo
// l'ascolto parte all'avvio (`main.tsx`) e l'evento resta qui, finché l'invito della Home (`InvitoInstallazione`) non lo usa.
// Safari su iPhone e iPad non ha l'evento: si installa da «Condividi» → «Aggiungi alla schermata Home», e l'invito lo spiega.
// ============================================================

/** L'evento che Chrome, Edge e Samsung Internet lanciano quando l'app si può installare (non è ancora nei tipi del DOM). */
interface EventoInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let evento: EventoInstallazione | null = null;
const ascoltatori = new Set<() => void>();
const avvisa = () => { for (const f of ascoltatori) f(); };

/** Registra l'ascolto dell'evento di installazione: una volta, all'avvio dell'app. */
export function ascoltaInstallazione(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // la barra d'installazione del browser non compare da sola: la finestra si apre dall'invito, con il tocco dell'utente
    e.preventDefault();
    evento = e as EventoInstallazione;
    avvisa();
  });
  window.addEventListener('appinstalled', () => { evento = null; avvisa(); });
}

/** Vero se il browser ha detto che l'app si può installare con la sua finestra (Android: Chrome, Edge, Samsung Internet). */
export function installabileDalBrowser(): boolean {
  return evento !== null;
}

/** Avvisa quando cambia `installabileDalBrowser` (l'evento può arrivare dopo che l'invito è montato); restituisce la disiscrizione. */
export function seCambiaInstallabile(f: () => void): () => void {
  ascoltatori.add(f);
  return () => { ascoltatori.delete(f); };
}

/** Apre la finestra d'installazione del browser; vero se l'utente ha accettato. L'evento vale una volta sola. */
export async function apriInstallazione(): Promise<boolean> {
  const e = evento;
  if (!e) return false;
  evento = null;
  // chi ascolta lo sa solo a finestra chiusa: mentre la finestra del browser è aperta, l'invito sotto resta quello di prima
  try {
    await e.prompt();
    return (await e.userChoice).outcome === 'accepted';
  } finally {
    avvisa();
  }
}

/** Vero se l'app è aperta come app installata (schermo intero dalla schermata Home), non nel browser. */
export function apertaComeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = typeof window.matchMedia === 'function'
    && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Vero su iPhone e iPad (anche l'iPad che si presenta come Mac, con lo schermo a tocco): lì si installa da «Condividi». */
export function dispositivoApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
