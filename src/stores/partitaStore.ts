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

/** Il `set` dello store: accetta anche una funzione dello stato corrente (serve a ricostruire l'elenco dal risultato noto di una scrittura). */
type ImpostaStato = (parziale: Partial<PartitaState> | ((s: PartitaState) => Partial<PartitaState>)) => void;

/** Legge l'elenco delle partite e lo applica allo store. Ritorna il messaggio d'errore se la lettura è fallita (e solo se era l'ultima
 *  richiesta: una superata la chiude quella più recente), altrimenti null. I dati precedenti non vengono toccati dall'errore.
 *  Durante un «Riprova» l'errore precedente resta a schermo (si azzera solo all'esito): se sparisse subito la Home direbbe
 *  «Nessuna partita attiva» per tutta la durata della richiesta, proprio il messaggio fuorviante che l'errore evita. */
async function leggiElenco(set: ImpostaStato): Promise<string | null> {
  const questa = ++generazione;
  const versioneAllAvvio = versioneLocale;
  set({ caricamento: true });
  try {
    const partite = await getPartite();
    if (questa !== generazione) return null;
    // un aggiornamento locale è arrivato mentre la lettura era in volo: la risposta può precederlo, si rifà la lettura
    if (versioneLocale !== versioneAllAvvio) return leggiElenco(set);
    set({ partite, attiva: partite.find((p) => p.attiva) ?? null, caricamento: false, caricata: true, errore: null });
    return null;
  } catch (err) {
    if (questa !== generazione) return null;
    const messaggio = err instanceof Error ? err.message : 'Errore di caricamento delle partite';
    set({ caricamento: false, caricata: true, errore: messaggio });
    return messaggio;
  }
}

/** Dopo una scrittura riuscita (crea, attiva, elimina) la rilettura può cadere: la scrittura NON si dà per fallita (ripeterla
 *  duplicherebbe), ma l'utente deve saperlo. Lo store non resta però sulla partita vecchia: lavorare ancora su di essa (spunte, Doti)
 *  colpirebbe una partita non più attiva o già eliminata. `risultatoNoto` ricostruisce lo stato dal solo esito della scrittura. */
async function rileggiDopoScrittura(set: ImpostaStato, risultatoNoto: (s: PartitaState) => Partial<PartitaState>): Promise<void> {
  const errore = await leggiElenco(set);
  if (!errore) return;
  set(risultatoNoto);
  notifica('error', `Operazione eseguita, ma l'elenco delle partite non si è aggiornato: ${errore}. Usa «Riprova» per rileggerlo.`);
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
    // nota: la nuova è attiva (richiesta con `attiva: true`), tutte le altre non lo sono più
    const attivaNuova = { ...nuova, attiva: true };
    await rileggiDopoScrittura(set, (s) => ({
      partite: [attivaNuova, ...s.partite.filter((p) => p.id !== nuova.id).map((p) => ({ ...p, attiva: false }))],
      attiva: attivaNuova,
    }));
    return nuova;
  },
  rendiAttiva: async (id) => {
    await attivaPartita(id);
    // noto: l'id scelto è l'attiva, le altre no (se l'id non è nell'elenco a schermo, nessuna partita nota è attiva)
    await rileggiDopoScrittura(set, (s) => {
      const partite = s.partite.map((p) => ({ ...p, attiva: p.id === id }));
      return { partite, attiva: partite.find((p) => p.id === id) ?? null };
    });
  },
  elimina: async (id) => {
    await eliminaPartita(id);
    // noto: la partita non c'è più. Se era l'attiva il server promuove la più recente rimasta, ma quale sia lo dice solo la rilettura:
    // finché non riesce non c'è una partita attiva su cui scrivere (meglio nessuna che una eliminata o quella sbagliata)
    await rileggiDopoScrittura(set, (s) => {
      const partite = s.partite.filter((p) => p.id !== id);
      return { partite, attiva: s.attiva?.id === id ? null : s.attiva };
    });
  },
  aggiornaLocale: (p) => {
    versioneLocale += 1;
    set((s) => ({
      partite: s.partite.map((x) => (x.id === p.id ? p : x)),
      attiva: s.attiva?.id === p.id ? p : s.attiva,
    }));
  },
}));
