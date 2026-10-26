// ============================================================
// useAppuntiDiario — Ctrl+C, Ctrl+X, Ctrl+V ed Esc sulle voci selezionate del Diario, con gli appunti di sistema (2026-10-26)
// ============================================================
//
// Richieste dell'utente: «Vorrei poter selezionare uno o più elementi del diario con ctrl+C e poterli incollare da un'altra parte con
// ctrl+v», «Sì, anche Taglia», «Quella della voce selezionata», «e deve prendere anche quello che succede...», «però deve usare la clipboard
// del sistema non dentro l'app... così da poter anche usare windows V per gestire eventuali copie precedenti».
//
//   - Copia / Taglia: l'evento `copy` / `cut` del documento scrive negli appunti il testo leggibile e l'HTML col blocco delle voci
//     (`utils/appuntiDiario`). Il blocco lo costruisce il server: si chiede appena cambia la selezione (dopo una breve pausa) e si tiene
//     finché la giornata non si ricarica, perché l'evento vuole il contenuto subito. Se non è pronto, o se il browser non manda l'evento
//     (Firefox senza testo selezionato), si scrive con `navigator.clipboard.write` mentre arriva.
//   - Incolla: l'evento `paste` legge gli appunti; un testo qualsiasi che non è un blocco di voci non fa niente (resta il browser).
//     Dal menu della voce («Incolla qui», tablet e telefono) si leggono con `navigator.clipboard.read`; se il browser non lo permette lo si
//     dice e si apre un riquadro in cui incollare col gesto del sistema. Poi l'anteprima del server: senza rilievi da confermare si incolla
//     subito, altrimenti la finestra dei rilievi. Fatto, la notifica ha «Annulla».
//   - Mai mentre si scrive o con del testo selezionato (Ctrl+C copia quel testo), mai con una finestra aperta.
//
// Nell'istanza di rilascio (sola lettura) niente di tutto questo: la costante di build toglie il modulo dal bundle.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { anteprimaIncollaVoci, annullaOperazioneVoci, esportaAppuntiDiario, incollaVociDiario } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useAppuntiDiarioStore } from '../stores/appuntiDiarioStore';
import { comeTaglio, leggiAppunti, scriviAppunti, type FrasiDelleVoci } from '../utils/appuntiDiario';
import { eInCampoModificabile } from '../utils/campiModificabili';
import { dataGiocoTesto } from '../utils/dateGioco';
import type { AppuntiDiario, EsitoAnnulloIncollaDto, PianoIncollaDto, RichiestaEseguiIncolla } from '../../shared/appuntiDiario';
import type { AzionePercorsoDto } from '../types';
import type { SelezioneVoci } from './useSelezioneVoci';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quanto aspettare dopo l'ultimo cambio di selezione prima di chiedere il blocco al server. */
const PAUSA_PRERECUPERO = 120;
/** Quanto resta a schermo la notifica con «Annulla». */
const DURATA_ANNULLABILE = 10000;

const quante = (n: number, uno: string, molti: string) => (n === 1 ? `1 ${uno}` : `${n} ${molti}`);

/** Le istanze montate (una per giorno del Diario a schermo): risponde ai tasti solo l'ultima, così due giornate non incollano due volte. */
const montate: symbol[] = [];

/** Vero se il gesto va lasciato al browser: si scrive in un campo, c'è una finestra aperta o il gesto è già di qualcun altro. */
function lasciaAlBrowser(e: Event): boolean {
  if (e.defaultPrevented) return true;
  if (eInCampoModificabile(e.target) || eInCampoModificabile(document.activeElement)) return true;
  return !!document.querySelector('.modal-overlay');
}
/** Vero se nella pagina c'è del testo selezionato: Ctrl+C / Ctrl+X copiano quel testo. */
const testoSelezionato = (): boolean => !!window.getSelection()?.toString();

/** Il messaggio di un errore per l'utente. */
const messaggio = (err: unknown, riserva: string) => (err instanceof Error && err.message ? err.message : riserva);

/**
 * La notifica di un'operazione sulle voci (incolla, «Copia in…», «Sposta in…») con «Annulla»: l'annullo rimette le voci (le copie nel
 * Cestino) e dice ciò che non si poteva rimettere.
 */
export function notificaOperazioneAnnullabile(testo: string, operazioneId: string | undefined, dopo: () => void | Promise<void>): void {
  if (!operazioneId) { notifica('success', testo); return; }
  notifica('success', testo, DURATA_ANNULLABILE, {
    azione: {
      etichetta: 'Annulla',
      onClick: () => {
        void annullaOperazioneVoci(operazioneId).then(async (esito: EsitoAnnulloIncollaDto) => {
          await dopo();
          const rimesse = esito.rimesse.length;
          const cosa = esito.modo === 'copia' ? (rimesse === 1 ? 'copia nel Cestino' : 'copie nel Cestino') : (rimesse === 1 ? 'voce rimessa al suo posto' : 'voci rimesse al loro posto');
          const testoRimesse = rimesse ? `${rimesse} ${cosa}.` : 'Niente da rimettere.';
          if (esito.nonRimesse.length) notifica('warning', `${testoRimesse} Non rimesse: ${esito.nonRimesse.map((x) => `${x.azione ? `«${x.azione.slice(0, 50)}» ` : ''}(${x.motivo})`).join('; ')}.`);
          else notifica('success', testoRimesse);
        }).catch((err: unknown) => notifica('error', messaggio(err, 'Annullo non riuscito.')));
      },
    },
  });
}

/** La richiesta d'incolla in attesa della conferma dei rilievi (la finestra dei rilievi la mostra). */
export interface IncollaInAttesa { piano: PianoIncollaDto; appunti: AppuntiDiario; dopoUid: string | null }

export interface AppuntiDelGiorno {
  /** Copia negli appunti le voci (dal menu della voce o dalla barra: scrittura asincrona). */
  copia: (uid: readonly string[]) => void;
  /** Taglia: come la copia, e le voci si attenuano fino all'incolla. */
  taglia: (uid: readonly string[]) => void;
  /** Incolla dagli appunti (menu «Incolla qui» o barra): dopo la voce `dopoUid`, o ognuna nella sua fascia in fondo. */
  incollaDagliAppunti: (dopoUid: string | null) => void;
  /** Incolla un contenuto letto altrove (il riquadro d'incolla manuale); falso se non sono voci del Diario. */
  incollaContenuto: (contenuto: { testo: string; html: string }, dopoUid: string | null) => boolean;
  /** La finestra dei rilievi: aperta con un piano da confermare. */
  inAttesa: IncollaInAttesa | null;
  conferma: (senzaSegnalati: boolean) => void;
  chiudiAttesa: () => void;
  /** Il riquadro d'incolla manuale (il browser non lascia leggere gli appunti): aperto con l'ancora. */
  manuale: { dopoUid: string | null } | null;
  chiudiManuale: () => void;
  /** Un incolla è in corso. */
  occupato: boolean;
}

interface Opzioni {
  giorno: string;
  /** Le voci del giorno (per le frasi di «Spuntando succede» nel testo leggibile); cambiano a ogni ricarica. */
  voci: readonly AzionePercorsoDto[];
  selezione: SelezioneVoci;
  /** Dopo l'incolla o l'annullo: la giornata si ricarica. */
  onModificata: () => Promise<void>;
}

const NESSUNO: AppuntiDelGiorno = {
  copia: () => undefined, taglia: () => undefined, incollaDagliAppunti: () => undefined, incollaContenuto: () => false,
  inAttesa: null, conferma: () => undefined, chiudiAttesa: () => undefined, manuale: null, chiudiManuale: () => undefined, occupato: false,
};

/** Gli appunti del giorno (solo nella preparazione: nel rilascio un hook vuoto, e il modulo esce dal bundle). */
export const useAppuntiDiario: (o: Opzioni) => AppuntiDelGiorno = IN_RILASCIO ? () => NESSUNO : useAppuntiDiarioReale;

function useAppuntiDiarioReale({ giorno, voci, selezione, onModificata }: Opzioni): AppuntiDelGiorno {
  const [inAttesa, setInAttesa] = useState<IncollaInAttesa | null>(null);
  const [manuale, setManuale] = useState<{ dopoUid: string | null } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const occupatoRif = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  // ---- il blocco pronto per l'evento `copy` / `cut`: si chiede al cambio di selezione, vale finché la giornata non si ricarica ----
  const pronto = useRef<{ voci: readonly AzionePercorsoDto[]; chiave: string; appunti: AppuntiDiario } | null>(null);
  const chiave = selezione.uid.join(',');
  useEffect(() => {
    if (!chiave) return;
    let annullato = false;
    const t = setTimeout(() => {
      void esportaAppuntiDiario(chiave.split(',')).then((a) => { if (!annullato) pronto.current = { voci, chiave, appunti: a }; }).catch(() => undefined);
    }, PAUSA_PRERECUPERO);
    return () => { annullato = true; clearTimeout(t); };
  }, [chiave, voci]);
  /** Il blocco già pronto per queste voci e per la giornata di adesso, o null. */
  const bloccoPronto = (uid: readonly string[]): AppuntiDiario | null => {
    const p = pronto.current;
    return p && p.voci === voci && p.chiave === uid.join(',') ? p.appunti : null;
  };
  const frasi: FrasiDelleVoci = useMemo(() => new Map(voci.map((v) => [v.uid, v.produceTesto ?? []])), [voci]);

  // i riferimenti che i gestori dei tasti (montati una volta) leggono sempre aggiornati
  const ultimi = useRef({ giorno, selezione, frasi, onModificata, bloccoPronto });
  useLayoutEffect(() => { ultimi.current = { giorno, selezione, frasi, onModificata, bloccoPronto }; });

  /** Dopo aver scritto negli appunti: la conferma e, per il taglio, il segno sulle righe e la selezione vuota. */
  const scritto = useCallback((a: AppuntiDiario) => {
    const n = a.voci.length;
    if (a.modo === 'taglia') {
      useAppuntiDiarioStore.getState().imposta({ id: a.taglio!, uid: a.voci.map((v) => v.uid), giorno: ultimi.current.giorno });
      ultimi.current.selezione.svuota();
      notifica('success', `${quante(n, 'voce tagliata', 'voci tagliate')}: incollale dove vuoi.`);
    } else {
      useAppuntiDiarioStore.getState().svuota();
      notifica('success', `${quante(n, 'voce copiata', 'voci copiate')} negli appunti.`);
    }
  }, []);

  /** Scrive negli appunti mentre il blocco arriva dal server (menu, barra, o browser che non manda l'evento). */
  const scriviAsincrono = useCallback((uid: readonly string[], modo: 'copia' | 'taglia') => {
    if (!uid.length) return;
    const gia = ultimi.current.bloccoPronto(uid);
    const blocco = (gia ? Promise.resolve(gia) : esportaAppuntiDiario([...uid])).then((a) => (modo === 'taglia' ? comeTaglio(a) : a));
    const { frasi: f } = ultimi.current;
    const scrivi = async (): Promise<AppuntiDiario> => {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        // l'oggetto si crea subito (dentro il gesto: Safari lo pretende), il contenuto arriva con la promessa
        const contenuto = blocco.then((a) => scriviAppunti(a, f));
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': contenuto.then((c) => new Blob([c.testo], { type: 'text/plain' })),
          'text/html': contenuto.then((c) => new Blob([c.html], { type: 'text/html' })),
        })]);
        return blocco;
      }
      if (navigator.clipboard?.writeText) {
        // solo testo: il blocco va nel testo, se no l'incolla non lo ritroverebbe
        const a = await blocco;
        await navigator.clipboard.writeText(scriviAppunti(a, f, { bloccoNelTesto: true }).testo);
        return a;
      }
      throw new Error('Questo browser non permette di scrivere negli appunti.');
    };
    void scrivi().then(scritto).catch((err: unknown) => notifica('error', `Appunti non scritti: ${messaggio(err, 'il browser non lo permette')}.`));
  }, [scritto]);

  /** Esegue l'incolla, ricarica la giornata, seleziona le voci arrivate e notifica con «Annulla». */
  const esegui = useCallback(async (r: RichiestaEseguiIncolla) => {
    const esito = await incollaVociDiario(r);
    const store = useAppuntiDiarioStore.getState();
    if (r.appunti.modo === 'taglia' && store.taglio?.id === r.appunti.taglio) store.svuota();
    const { onModificata: ricarica } = ultimi.current;
    await ricarica();
    if (vivo.current) ultimi.current.selezione.imposta(esito.uid);
    const n = esito.uid.length;
    const dove = `nel giorno ${dataGiocoTesto(esito.giorno)}`;
    const base = esito.modo === 'taglia' ? `${quante(n, 'voce spostata', 'voci spostate')} ${dove}` : `${quante(n, 'voce incollata', 'voci incollate')} ${dove}`;
    const saltate = esito.saltate.length ? ` ${quante(esito.saltate.length, 'saltata', 'saltate')}: ${esito.saltate.map((s) => `«${s.azione.slice(0, 40)}» (${s.motivo})`).join('; ')}.` : '';
    const tolti = esito.effettiTolti ? ` Lasciati fuori ${quante(esito.effettiTolti, 'effetto segnalato', 'effetti segnalati')}.` : '';
    notificaOperazioneAnnullabile(`${base}.${saltate}${tolti}`, esito.operazioneId, ricarica);
  }, []);

  /** L'incolla di un blocco: anteprima; senza rilievi da confermare subito, altrimenti la finestra dei rilievi. */
  const avvia = useCallback(async (a: AppuntiDiario, dopoUid: string | null) => {
    if (occupatoRif.current) return;
    occupatoRif.current = true; setOccupato(true);
    const g = ultimi.current.giorno;
    try {
      const piano = await anteprimaIncollaVoci({ appunti: a, giorno: g, ...(dopoUid ? { dopoUid } : {}) });
      if (piano.daIncollare === 0) {
        notifica('warning', `Niente da incollare: ${piano.rilievi.map((x) => x.testo).join(' ') || 'nessuna voce si può incollare qui.'}`);
        return;
      }
      if (piano.daConfermare) { if (vivo.current) setInAttesa({ piano, appunti: a, dopoUid }); return; }
      await esegui({ appunti: a, giorno: g, ...(dopoUid ? { dopoUid } : {}), impronta: piano.impronta });
    } catch (err) {
      notifica('error', messaggio(err, 'Incolla non riuscito.'));
    } finally { occupatoRif.current = false; if (vivo.current) setOccupato(false); }
  }, [esegui]);

  const conferma = useCallback((senzaSegnalati: boolean) => {
    const att = inAttesa;
    if (!att || occupatoRif.current) return;
    occupatoRif.current = true; setOccupato(true);
    const g = ultimi.current.giorno;
    void esegui({ appunti: att.appunti, giorno: g, ...(att.dopoUid ? { dopoUid: att.dopoUid } : {}), conferma: true, impronta: att.piano.impronta, ...(senzaSegnalati ? { senzaSegnalati: true } : {}) })
      .then(() => { if (vivo.current) setInAttesa(null); })
      .catch((err: unknown) => notifica('error', messaggio(err, 'Incolla non riuscito.')))
      .finally(() => { occupatoRif.current = false; if (vivo.current) setOccupato(false); });
  }, [inAttesa, esegui]);

  /** «Incolla qui» del menu o della barra: legge gli appunti con l'API del browser; se non può, il riquadro manuale. */
  const incollaDagliAppunti = useCallback((dopoUid: string | null) => {
    const apriManuale = () => { notifica('info', 'Il browser non permette di leggere gli appunti da qui: incollali nel riquadro.'); setManuale({ dopoUid }); };
    const leggi = async (): Promise<{ testo: string; html: string } | null> => {
      if (navigator.clipboard?.read) {
        // `unsanitized`: Chrome altrimenti ripulisce l'HTML letto (gli altri browser ignorano l'opzione)
        const elementi = await (navigator.clipboard.read as (o?: unknown) => Promise<ClipboardItems>)({ unsanitized: ['text/html'] });
        let testo = '', html = '';
        for (const el of elementi) {
          if (!html && el.types.includes('text/html')) html = await (await el.getType('text/html')).text();
          if (!testo && el.types.includes('text/plain')) testo = await (await el.getType('text/plain')).text();
        }
        return { testo, html };
      }
      if (navigator.clipboard?.readText) return { testo: await navigator.clipboard.readText(), html: '' };
      return null;
    };
    void leggi().then((c) => {
      if (!c) { apriManuale(); return; }
      const a = leggiAppunti(c);
      if (!a) { notifica('info', 'Negli appunti non ci sono voci del Diario: copiale o tagliale prima.'); return; }
      void avvia(a, dopoUid);
    }).catch(apriManuale);
  }, [avvia]);

  const incollaContenuto = useCallback((c: { testo: string; html: string }, dopoUid: string | null) => {
    const a = leggiAppunti(c);
    if (!a) return false;
    setManuale(null);
    void avvia(a, dopoUid);
    return true;
  }, [avvia]);

  // ---- i tasti e gli eventi degli appunti del documento ----
  useEffect(() => {
    const io = Symbol('appunti-diario');
    montate.push(io);
    const mia = () => montate[montate.length - 1] === io;
    /** Il gesto atteso da Ctrl+C/X/V: se il browser non manda l'evento, si fa a mano subito dopo. */
    let atteso: { modo: 'copia' | 'taglia' | 'incolla'; t: ReturnType<typeof setTimeout> } | null = null;
    const annullaAtteso = () => { if (atteso) { clearTimeout(atteso.t); atteso = null; } };

    const suCopiaTaglia = (modo: 'copia' | 'taglia') => (e: ClipboardEvent) => {
      if (!mia()) return;
      annullaAtteso();
      const uid = ultimi.current.selezione.uid;
      if (!uid.length || lasciaAlBrowser(e) || testoSelezionato()) return;
      e.preventDefault();
      const blocco = ultimi.current.bloccoPronto(uid);
      if (blocco && e.clipboardData) {
        const a = modo === 'taglia' ? comeTaglio(blocco) : blocco;
        const c = scriviAppunti(a, ultimi.current.frasi);
        e.clipboardData.setData('text/plain', c.testo);
        e.clipboardData.setData('text/html', c.html);
        scritto(a);
      } else scriviAsincrono(uid, modo);
    };
    const suCopia = suCopiaTaglia('copia'), suTaglia = suCopiaTaglia('taglia');
    const suIncolla = (e: ClipboardEvent) => {
      if (!mia()) return;
      annullaAtteso();
      if (lasciaAlBrowser(e) || !e.clipboardData) return;
      const a = leggiAppunti({ testo: e.clipboardData.getData('text/plain'), html: e.clipboardData.getData('text/html') });
      // un testo qualsiasi: il comportamento del browser resta
      if (!a) return;
      e.preventDefault();
      void avvia(a, ultimi.current.selezione.ancora);
    };
    const suTasto = (e: KeyboardEvent) => {
      if (!mia() || e.isComposing || e.repeat) return;
      if (e.key === 'Escape') {
        const { selezione } = ultimi.current;
        const taglio = useAppuntiDiarioStore.getState().taglio;
        if ((!selezione.uid.length && !taglio) || lasciaAlBrowser(e)) return;
        selezione.svuota();
        useAppuntiDiarioStore.getState().svuota();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      const modo = k === 'c' ? 'copia' : k === 'x' ? 'taglia' : k === 'v' ? 'incolla' : null;
      if (!modo || lasciaAlBrowser(e)) return;
      if (modo !== 'incolla' && (!ultimi.current.selezione.uid.length || testoSelezionato())) return;
      annullaAtteso();
      // l'evento `copy`/`cut`/`paste` arriva subito dopo questo tasto e annulla l'attesa; se non arriva (Firefox senza testo selezionato), a mano
      atteso = { modo, t: setTimeout(() => {
        atteso = null;
        if (modo === 'incolla') incollaDaTastiera();
        else scriviAsincrono(ultimi.current.selezione.uid, modo);
      }, 0) };
    };
    /** Ctrl+V senza evento `paste`: si legge con l'API; un contenuto che non è un blocco di voci non fa niente. */
    const incollaDaTastiera = () => {
      if (!navigator.clipboard?.read && !navigator.clipboard?.readText) return;
      const lettura = navigator.clipboard.read
        ? (navigator.clipboard.read as (o?: unknown) => Promise<ClipboardItems>)({ unsanitized: ['text/html'] }).then(async (el) => {
            const h = el.find((x) => x.types.includes('text/html')), t = el.find((x) => x.types.includes('text/plain'));
            return { html: h ? await (await h.getType('text/html')).text() : '', testo: t ? await (await t.getType('text/plain')).text() : '' };
          })
        : navigator.clipboard.readText().then((testo) => ({ testo, html: '' }));
      void lettura.then((c) => { const a = leggiAppunti(c); if (a) void avvia(a, ultimi.current.selezione.ancora); }).catch(() => undefined);
    };
    document.addEventListener('copy', suCopia);
    document.addEventListener('cut', suTaglia);
    document.addEventListener('paste', suIncolla);
    document.addEventListener('keydown', suTasto);
    return () => {
      annullaAtteso();
      const i = montate.indexOf(io);
      if (i >= 0) montate.splice(i, 1);
      document.removeEventListener('copy', suCopia);
      document.removeEventListener('cut', suTaglia);
      document.removeEventListener('paste', suIncolla);
      document.removeEventListener('keydown', suTasto);
    };
  }, [avvia, scritto, scriviAsincrono]);

  return {
    copia: (uid) => scriviAsincrono(uid, 'copia'),
    taglia: (uid) => scriviAsincrono(uid, 'taglia'),
    incollaDagliAppunti, incollaContenuto,
    inAttesa, conferma, chiudiAttesa: () => setInAttesa(null),
    manuale, chiudiManuale: () => setManuale(null),
    occupato,
  };
}
