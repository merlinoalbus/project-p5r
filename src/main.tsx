// ============================================================
// Entry point frontend — monta React, router e gestione errori iniziali
// ============================================================
//
// Boot bloccante su /api/config: se il backend non risponde si mostra
// una schermata d'errore in HTML puro (funziona anche se il bundle
// React ha problemi) e l'App NON viene montata.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import App from './App.tsx';
import { useConfigStore } from './stores/configStore';
import type { AppConfigDto } from './types';

const BOOT_CONFIG_TIMEOUT_MS = 15_000;

function renderBootErrorScreen(reason: string): void {
  const root = document.getElementById('root');
  if (!root) return;
  // HTML statico — nessun valore controllato dall'utente interpolato.
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0e;color:#ececf1;padding:20px;box-sizing:border-box;">
      <div style="max-width:560px;padding:40px;text-align:center;background:#14141a;border-radius:12px;border:1px solid #34343f;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
        <h1 style="color:#e5352b;margin:0 0 16px 0;font-size:1.5rem;">Impossibile avviare l'app</h1>
        <p style="margin:0 0 8px 0;line-height:1.5;color:#a3a3b3;">${reason}.</p>
        <p style="margin:0 0 24px 0;line-height:1.5;color:#6f6f80;font-size:0.9rem;">Verifica che il backend sia in esecuzione e raggiungibile, poi ricarica.</p>
        <button onclick="location.reload()" style="padding:12px 28px;background:#e5352b;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:1rem;">Ricarica</button>
      </div>
    </div>
  `;
}

async function boot(): Promise<void> {
  let configOk = false;
  let configErrorReason = 'Impossibile contattare il backend';
  try {
    const res = await fetch('/api/config', {
      signal: AbortSignal.timeout(BOOT_CONFIG_TIMEOUT_MS),
    });
    if (res.ok) {
      const body = await res.json();
      const config = (body?.data ?? body) as AppConfigDto;
      useConfigStore.getState().setConfig(config);
      configOk = true;
    } else {
      configErrorReason = `Il backend ha risposto con status ${res.status}`;
      console.error('[boot] /api/config fallita, status:', res.status);
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    configErrorReason = isTimeout
      ? `Timeout: il backend non ha risposto entro ${BOOT_CONFIG_TIMEOUT_MS / 1000}s`
      : 'Impossibile contattare il backend';
    console.error('[boot] Backend non raggiungibile:', err);
  }

  if (!configOk) {
    renderBootErrorScreen(configErrorReason);
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
