// ============================================================
// Entry point frontend — monta React, router e gestione errori iniziali
// ============================================================
//
// Boot bloccante su /api/config: se il server non risponde si mostra
// una schermata d'errore in HTML puro (funziona anche se il bundle
// React ha problemi) e l'App NON viene montata.
// Nell'attesa `#root` contiene l'anteprima statica di `index.html` (logo e «Caricamento…»): la sostituiscono il montaggio di
// React (`render`, che svuota il contenitore) o la schermata d'errore qui sotto.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import App from './App.tsx';
import { useConfigStore } from './stores/configStore';
import { tuttePrecarica } from './router';
import { precaricaPagineScheda } from './components/scheda/pagineScheda';
import { precaricaSchedePartita } from './components/partita/schedePartita';
import { avviaControlloVersione } from './utils/versioneApp';
import { ascoltaInstallazione } from './utils/installazioneApp';
import { registraEdizione } from './services/api/cacheGioco';
import { impostaGestoreAvanzamento } from './services/api/_helpers';
import { seAvanzamentoInIntestazione } from './utils/giornoAvanzato';
import { precaricaInBackground } from './utils/pagineLazy';
import { verificaCoerenzaModalita } from './utils/modalita';
import type { AppConfigDto } from './types';

const BOOT_CONFIG_TIMEOUT_MS = 15_000;

/**
 * Sostituisce il contenuto di `#root` con la schermata d'errore d'avvio in HTML puro (stili in
 * linea, nessuna dipendenza da React o dal CSS del bundle), con il motivo e un pulsante che
 * ricarica la pagina. Se `#root` manca non fa niente.
 */
function renderBootErrorScreen(
  reason: string,
  suggerimento = 'Controlla la connessione e ricarica la pagina. Se il problema resta, il server potrebbe essere spento.',
): void {
  const root = document.getElementById('root');
  if (!root) return;
  // HTML statico — nessun valore controllato dall'utente interpolato (motivo e suggerimento sono testi scritti nel codice).
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0e;color:#ececf1;padding:20px;box-sizing:border-box;">
      <div role="alert" style="max-width:560px;padding:40px;text-align:center;background:#14141a;border-radius:12px;border:1px solid #34343f;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
        <h1 style="color:#e5352b;margin:0 0 16px 0;font-size:1.5rem;">Impossibile avviare l'app</h1>
        <p style="margin:0 0 8px 0;line-height:1.5;color:#a3a3b3;">${reason}.</p>
        <p style="margin:0 0 24px 0;line-height:1.5;color:#8e8ea0;font-size:0.9rem;">${suggerimento}</p>
        <button onclick="location.reload()" style="padding:12px 28px;background:#e5352b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;">Ricarica</button>
      </div>
    </div>
  `;
}

/**
 * Avvio dell'app: chiede `/api/config` con un timeout di BOOT_CONFIG_TIMEOUT_MS, accetta sia la
 * busta `{ data }` sia il corpo nudo e salva la configurazione nello store. Se la risposta non è
 * ok, va in timeout o la rete fallisce, compone il motivo leggibile e mostra la schermata
 * d'errore senza montare React; altrimenti monta `<App />` in StrictMode.
 */
async function boot(): Promise<void> {
  let configOk = false;
  let configErrorReason = 'Non riesco a raggiungere il server';
  let configSuggerimento: string | undefined;
  try {
    const res = await fetch('/api/config', {
      signal: AbortSignal.timeout(BOOT_CONFIG_TIMEOUT_MS),
    });
    if (res.ok) {
      const body = await res.json();
      const config = (body?.data ?? body) as AppConfigDto;
      // L12: la modalità fissata nella build deve coincidere con quella del backend; altrimenti si blocca tutto (un frontend di
      // rilascio davanti a un backend di preparazione, o il contrario, non deve funzionare a metà)
      const incoerenza = verificaCoerenzaModalita(config);
      if (incoerenza) {
        console.error('[boot] modalità incoerente:', incoerenza);
        renderBootErrorScreen(incoerenza, 'L\'app e il server non appartengono alla stessa istanza: contatta chi gestisce l\'installazione.');
        return;
      }
      useConfigStore.getState().setConfig(config);
      registraEdizione(config.edizione);
      configOk = true;
    } else {
      configErrorReason = 'Il server ha un problema in questo momento';
      configSuggerimento = 'Riprova tra poco: se il problema resta, avvisa chi gestisce l\'installazione.';
      console.error('[boot] /api/config fallita, status:', res.status);
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    console.error('[boot] Server non raggiungibile:', err);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      configErrorReason = 'Sei offline';
      configSuggerimento = 'Riconnetti la rete e ricarica la pagina.';
    } else if (isTimeout) {
      configErrorReason = `Il server non ha risposto entro ${BOOT_CONFIG_TIMEOUT_MS / 1000} secondi`;
      configSuggerimento = 'Riprova tra poco: se il problema resta, il server potrebbe essere spento.';
    }
  }

  if (!configOk) {
    renderBootErrorScreen(configErrorReason, configSuggerimento);
    return;
  }

  // un gesto fuori da `/partite/:id` (o con un corpo che non può portarlo) che ha fatto avanzare la partita lo dice nell'intestazione della risposta
  impostaGestoreAvanzamento((esiti) => esiti.forEach((e) => void seAvanzamentoInIntestazione(e)));
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // UI-ASSET-01: avviso «nuova versione» e precarico in tempo morto di tutte le pagine (solo nella build: in sviluppo i file non hanno hash)
  avviaControlloVersione();
  // (L5-11: per prime le schede della pagina Partita, la pagina che si usa durante il gioco)
  if (import.meta.env.PROD) precaricaInBackground([...precaricaSchedePartita, ...tuttePrecarica, ...precaricaPagineScheda]);
}

// l'evento d'installazione arriva una volta sola, anche prima che la configurazione sia letta e la Home montata: si ascolta da subito
// (`InvitoInstallazione`)
ascoltaInstallazione();
void boot();
