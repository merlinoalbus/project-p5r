// ============================================================
// Partita Store — elenco partite e partita attiva
// ============================================================

import { create } from 'zustand';
import type { PartitaDto } from '../types';
import { notifica } from './notificationStore';
import { attivaPartita, creaPartita, eliminaPartita, getPartite, type DatiPartita } from '../services/api';

interface PartitaState {
  partite: PartitaDto[];
  attiva: PartitaDto | null;
  caricamento: boolean;
  caricata: boolean;
  errore: string | null;
  carica: () => Promise<void>;
  crea: (dati: DatiPartita & { nome: string }) => Promise<PartitaDto>;
  rendiAttiva: (id: number) => Promise<void>;
  elimina: (id: number) => Promise<void>;
  /** Aggiorna una partita già presente nell'elenco (dopo un PUT). */
  aggiornaLocale: (p: PartitaDto) => void;
}

/** Generazione dell'ultima lettura dell'elenco: `carica` è chiamata più volte di seguito (ogni +1/−1 di Joker, dopo un
 *  ripristino…) e una risposta vecchia arrivata dopo una nuova non deve riportare indietro la partita attiva. */
let generazione = 0;

/** Versione degli aggiornamenti locali (`aggiornaLocale`): una lettura dell'elenco partita prima di uno di essi può non contenerlo
 *  e, applicata così com'è, riporterebbe indietro la partita (giorno, meteo, fascia) appena aggiornata. */
let versioneLocale = 0;

/** Legge l'elenco delle partite e lo applica allo store. Ritorna il messaggio d'errore se la lettura è fallita (e solo se era l'ultima
 *  richiesta: una superata la chiude quella più recente), altrimenti null. I dati precedenti non vengono toccati dall'errore. */
async function leggiElenco(set: (parziale: Partial<PartitaState>) => void): Promise<string | null> {
  const questa = ++generazione;
  const versioneAllAvvio = versioneLocale;
  set({ caricamento: true, errore: null });
  try {
    const partite = await getPartite();
    if (questa !== generazione) return null;
    // un aggiornamento locale è arrivato mentre la lettura era in volo: la risposta può precederlo, si rifà la lettura
    if (versioneLocale !== versioneAllAvvio) return leggiElenco(set);
    set({ partite, attiva: partite.find((p) => p.attiva) ?? null, caricamento: false, caricata: true });
    return null;
  } catch (err) {
    if (questa !== generazione) return null;
    const messaggio = err instanceof Error ? err.message : 'Errore di caricamento delle partite';
    set({ caricamento: false, caricata: true, errore: messaggio });
    return messaggio;
  }
}

/** Dopo una scrittura riuscita (crea, attiva, elimina) la rilettura può cadere: la scrittura NON si dà per fallita (ripeterla
 *  duplicherebbe), ma l'utente deve saperlo, perché l'elenco a schermo è quello vecchio. */
async function rileggiDopoScrittura(set: (parziale: Partial<PartitaState>) => void): Promise<void> {
  const errore = await leggiElenco(set);
  if (errore) notifica('error', `Operazione eseguita, ma l'elenco delle partite non si è aggiornato: ${errore}. Usa «Riprova» per rileggerlo.`);
}

/** Stato delle partite: l'attiva è quella su cui lavorano tutte le pagine di tracking. */
export const usePartitaStore = create<PartitaState>((set) => ({
  partite: [],
  attiva: null,
  caricamento: false,
  caricata: false,
  errore: null,
  carica: async () => {
    await leggiElenco(set);
  },
  crea: async (dati) => {
    const nuova = await creaPartita({ ...dati, attiva: true });
    await rileggiDopoScrittura(set);
    return nuova;
  },
  rendiAttiva: async (id) => {
    await attivaPartita(id);
    await rileggiDopoScrittura(set);
  },
  elimina: async (id) => {
    await eliminaPartita(id);
    await rileggiDopoScrittura(set);
  },
  aggiornaLocale: (p) => {
    versioneLocale += 1;
    set((s) => ({
      partite: s.partite.map((x) => (x.id === p.id ? p : x)),
      attiva: s.attiva?.id === p.id ? p : s.attiva,
    }));
  },
}));
