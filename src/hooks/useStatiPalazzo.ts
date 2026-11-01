// ============================================================
// useStatiPalazzo — i gesti della scheda di un Palazzo (o dei Memento) che cambiano lo stato nella partita, con le riletture che seguono
// ============================================================
//
// Gli aggiornamenti locali partono dai dati correnti (forma funzionale di `imposta`), non dalla scheda del disegno: arrivano dopo un
// `await`, e due gesti ravvicinati si annullerebbero a vicenda. Dove lo stato dipende dal server (un pin agganciato a una voce, un Enigma
// riaperto) la scheda si rilegge in silenzio, e vale solo l'ultima rilettura chiesta. `versioneStati` cresce a ogni cambio: il visore
// incorporato la legge per ricaricarsi.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { getDungeon } from '../services/api';
import { catturaNelCompendio, salvaStatoVoce } from '../services/gestiGuida';
import { notifica } from '../stores/notificationStore';
import { personeRegistrate } from '../utils/piastrelleCattura';
import { raccoltaDeiDedali, ricalcolaDedalo } from '../utils/dedali';
import type { useCarica } from './useCarica';
import type { AreaDedaloDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto, StatoRichiesta } from '../types';

/** Lo stato della scheda come lo dà `useCarica`. */
type DatiScheda = ReturnType<typeof useCarica<DungeonDettaglioDto>>;

/** I gesti di stato della scheda `chiave` nella partita `partitaId` (null: nessuna partita, niente da segnare). `giornoPartita`: cambiato
 *  il giorno, la scheda si rilegge in silenzio (dal giorno dipende dove si atterra dalla mappa di Tokyo). */
export function useStatiPalazzo(dati: DatiScheda, chiave: string, partitaId: number | null, giornoPartita: string | null) {
  const d = dati.dati;
  // ogni cambio di stato dalla colonna ricarica il visore (e viceversa il visore ricarica la pagina)
  const [versioneStati, setVersioneStati] = useState(0);
  const aggiornaPunto = (nuovo: PuntoInteresseDto) => {
    dati.imposta((attuale) => {
      // nei Memento una voce è un elemento della sua area del dedalo (099): aree, dedalo e anello seguono subito
      const aree = attuale.aree.map((a) => (a.punti.some((p) => p.chiave === nuovo.chiave) ? ricalcolaDedalo({ ...a, punti: a.punti.map((p) => (p.chiave === nuovo.chiave ? nuovo : p)) }, partitaId !== null) : a));
      return { ...attuale, aree, raccolta: attuale.tipo === 'mementos' ? raccoltaDeiDedali(aree, attuale.raccolta) : attuale.raccolta };
    });
  };
  // Le riletture in silenzio della scheda (dopo uno stato o un raccolto) possono sovrapporsi: vale solo l'ultima chiesta, una
  // risposta più vecchia che arriva dopo non sovrascrive quella più nuova (rilievo del validatore).
  const ultimaLettura = useRef(0);
  /** Rilegge la scheda dal server senza stato di caricamento (solo con una partita) e la applica solo se nel frattempo non è partita una lettura più nuova. */
  const rileggiInSilenzio = async () => {
    if (!partitaId) return;
    const n = ++ultimaLettura.current;
    const fresco = await getDungeon(chiave, partitaId);
    if (n === ultimaLettura.current) dati.imposta(fresco);
  };
  // Cambiato il giorno della partita, la scheda si rilegge in silenzio: da quel giorno dipende dove si atterra dalla mappa di
  // Tokyo («Oggi si atterra su…», 2026-10-04). Non con una dipendenza di `useCarica`, che svuoterebbe la pagina fino alla
  // risposta e chiuderebbe la finestra aperta.
  const giornoLetto = useRef(giornoPartita);
  // la rilettura più recente, letta dall'effetto senza farlo ripartire a ogni render
  const rilettura = useRef(rileggiInSilenzio);
  useEffect(() => { rilettura.current = rileggiInSilenzio; });
  useEffect(() => {
    if (giornoLetto.current === giornoPartita) return;
    giornoLetto.current = giornoPartita;
    void rilettura.current().catch(() => { /* resta la scheda di prima */ });
  }, [giornoPartita]);
  /** Imposta (o toglie, con null) lo stato di un punto della guida nella partita: aggiorna il punto locale, fa ricaricare il visore e poi
   *  rilegge la scheda; l'errore viene notificato. Vero se lo stato è stato salvato (la guida passa alla voce successiva solo allora). */
  const cambiaStato = async (p: PuntoInteresseDto, stato: StatoPunto | null): Promise<boolean> => {
    if (!partitaId) return false;
    try {
      // L4 §8.11: il gesto sulla voce tocca tutti i suoi pin, e con loro le altre voci che li condividono: il server dice quali (la rilettura
      // sotto le aggiorna nella scheda), `salvaStatoVoce` le dice a parole (lo stesso salvataggio della guida del visore)
      const nuovo = await salvaStatoVoce(partitaId, p.chiave, stato, d?.aree);
      aggiornaPunto(nuovo);
      setVersioneStati((v) => v + 1);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      return false;
    }
    // Un punto della guida può essere agganciato a uno spillo collezionabile (il server lo conta come raccolto):
    // la raccolta si rilegge dal server, senza stato di caricamento, così anello e colonna non divergono. Lo stato è già
    // salvato: una rilettura fallita lo dice, ma non lo disfa.
    try { await rileggiInSilenzio(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Rilettura della scheda non riuscita.'); }
    return true;
  };
  /**
   * Nei Memento una Persona è catturata se è registrata nel compendio della partita (scelte dell'utente, 2026-10-12): la registra o
   * la toglie, aggiorna subito le catturate della scheda e notifica. Le catture non contano nella percentuale: niente da ricalcolare.
   */
  const cattura = async (personaId: number, catturata: boolean, ombra?: string): Promise<void> => {
    if (!partitaId) return;
    try {
      // la chiamata unica della cattura (`catturaNelCompendio`), la stessa della guida del visore e delle piastrelle delle altre viste
      const registrate = personeRegistrate(await catturaNelCompendio(partitaId, personaId, catturata, ombra));
      dati.imposta((attuale) => ({ ...attuale, personeCatturate: registrate }));
      // la guida del visore incorporato rilegge le sue piastrelle (`versione` del visore, anche quando la mappa non cambia)
      setVersioneStati((v) => v + 1);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Compendio non aggiornato.'); }
  };
  /** Uno spillo raccolto (o riaperto): si aggiornano le planimetrie del Palazzo, quelle delle aree e l'anello, senza ricaricare. */
  const segnaRaccolto = (spilloId: number, raccolto: boolean) => {
    if (!d) return;
    /** Una planimetria con lo spillo segnato raccolto o no e il conteggio dei presi ricalcolato; resta identica se lo spillo non è suo. */
    const aggiornaMappa = <T extends { presi: number | null; spilli: Array<{ id: number; raccolto: boolean | null }> }>(m: T): T => {
      if (!m.spilli.some((s) => s.id === spilloId)) return m;
      const spilli = m.spilli.map((s) => (s.id === spilloId ? { ...s, raccolto } : s));
      return { ...m, spilli, presi: spilli.filter((s) => s.raccolto).length };
    };
    dati.imposta((attuale) => {
      const planimetrie = attuale.planimetrie.map(aggiornaMappa);
      const aree = attuale.aree.map((a) => ({ ...a, mappe: a.mappe.map(aggiornaMappa) }));
      const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
      return { ...attuale, planimetrie, aree, raccolta: { ...attuale.raccolta, presi, mappeComplete: planimetrie.filter((p) => p.presi !== null && p.presi >= p.n).length } };
    });
    setVersioneStati((v) => v + 1);
    // Il raccolto di un pin segna (o riapre) la sua voce della guida e, se è un passo, il suo Enigma (095): stati che qui non si
    // possono dedurre. Si rilegge la scheda dal server, senza stato di caricamento, come dopo uno stato cambiato dalla guida.
    void rileggiInSilenzio().catch(() => { /* resta l'aggiornamento immediato */ });
  };
  /** Un dedalo cambiato dentro (timbri, stato di una Richiesta): le sue aree, il dedalo e l'anello dei Memento si ricalcolano con
   *  la regola del server (`shared/dedali.ts`, 099). `cambia` riceve un'area del dedalo e la restituisce aggiornata. */
  const aggiornaAreeDedalo = (cambia: (a: AreaDedaloDto) => AreaDedaloDto) => {
    dati.imposta((attuale) => {
      const aree = attuale.aree.map((a) => (a.dedalo ? ricalcolaDedalo({ ...a, dedalo: { ...a.dedalo, aree: a.dedalo.aree.map(cambia) } }, partitaId !== null) : a));
      return { ...attuale, aree, raccolta: raccoltaDeiDedali(aree, attuale.raccolta) };
    });
  };
  /** I timbri di un'area di un dedalo cambiano. */
  const aggiornaTimbri = (areaDedalo: string, raccolti: number) => {
    aggiornaAreeDedalo((a) => (a.chiave === areaDedalo && a.timbri ? { ...a, timbri: { ...a.timbri, raccolti } } : a));
  };
  /** Lo stato di una Richiesta cambia (nell'area in cui sta, o fra quelle da collocare, che non contano). */
  const aggiornaRichiesta = (chiaveRichiesta: string, stato: StatoRichiesta | null) => {
    dati.imposta((attuale) => ({ ...attuale, aree: attuale.aree.map((a) => (a.dedalo ? { ...a, dedalo: { ...a.dedalo, daCollocare: a.dedalo.daCollocare.map((r) => (r.chiave === chiaveRichiesta ? { ...r, stato } : r)) } } : a)) }));
    aggiornaAreeDedalo((a) => (a.richieste.some((r) => r.chiave === chiaveRichiesta) ? { ...a, richieste: a.richieste.map((r) => (r.chiave === chiaveRichiesta ? { ...r, stato } : r)) } : a));
  };
  return { versioneStati, setVersioneStati, aggiornaPunto, cambiaStato, cattura, segnaRaccolto, aggiornaTimbri, aggiornaRichiesta };
}
