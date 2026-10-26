// ============================================================
// useAppuntiDiario — Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+Z ed Esc sulle voci selezionate del Diario, con gli appunti di sistema (2026-10-26)
// ============================================================
//
// Richieste dell'utente: «Vorrei poter selezionare uno o più elementi del diario con ctrl+C e poterli incollare da un'altra parte con
// ctrl+v», «Sì, anche Taglia», «Quella della voce selezionata», «e deve prendere anche quello che succede...», «però deve usare la clipboard
// del sistema non dentro l'app... così da poter anche usare windows V per gestire eventuali copie precedenti».
//
//   - Copia / Taglia: l'evento `copy` / `cut` del documento scrive negli appunti il testo leggibile e l'HTML col blocco delle voci
//     (`utils/appuntiDiario`). Il blocco lo costruisce il server: si chiede appena cambia la selezione (dopo una breve pausa) o si apre il
//     menu di una voce, e si tiene finché la giornata non si ricarica, perché l'evento vuole il contenuto subito. Dal menu e dalla barra il
//     blocco già pronto si scrive con lo stesso evento (`document.execCommand('copy')` dentro il gesto: niente HTML ripulito dal browser);
//     se non è pronto, o se il browser non manda l'evento, con `navigator.clipboard.write` mentre arriva, e lì il blocco va anche nel testo
//     (l'HTML scritto così il browser può ripulirlo).
//   - Incolla: l'evento `paste` legge gli appunti; un testo qualsiasi che non è un blocco di voci non fa niente (resta il browser).
//     Dal menu della voce («Incolla qui», tablet e telefono) si leggono con `navigator.clipboard.read`; se il browser non lo permette lo si
//     dice e si apre un riquadro in cui incollare col gesto del sistema. Ctrl+V senza evento `paste` legge con l'API solo se in questa
//     sessione l'app ha scritto voci negli appunti (niente richiesta di permesso a ogni Ctrl+V). Poi l'anteprima del server: senza rilievi
//     da confermare si incolla subito, altrimenti la finestra dei rilievi (rinfrescata se nel frattempo il piano cambia). Fatto, la
//     notifica ha «Annulla», che vale anche come Ctrl+Z SOLO finché la notifica è a schermo (si vede che cosa si annulla); il conto alla
//     rovescia della notifica si ferma col puntatore o il fuoco sopra.
//   - Il fuoco: dopo l'incolla va sulla prima voce arrivata, dopo «Annulla» sulla voce dopo cui si era incollato (o sulla prima del giorno),
//     mai in cima alla pagina (WCAG 2.4.3).
//   - Il segno del taglio se ne va quando si sa che negli appunti non c'è più (si copia altro nella pagina, si incolla altro, o tornando
//     alla finestra lo si può rileggere e non c'è); se non lo si può sapere resta, perché Ctrl+V sposterebbe comunque le voci.
//   - Esc chiude prima il menu della voce aperto, poi annulla la selezione e il segno del taglio.
//   - Mai mentre si scrive in un campo di testo o con del testo selezionato (Ctrl+C copia quel testo), mai con una finestra aperta.
//
// Nell'istanza di rilascio (sola lettura) niente di tutto questo: la costante di build toglie il modulo dal bundle.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { anteprimaIncollaVoci, annullaOperazioneVoci, esportaAppuntiDiario, incollaVociDiario, isApiError } from '../services/api';
import { notifica, useNotificationStore, type AzioneNotifica } from '../stores/notificationStore';
import { useAppuntiDiarioStore } from '../stores/appuntiDiarioStore';
import { comeTaglio, leggiAppunti, scriviAppunti, type ContenutoAppunti, type FrasiDelleVoci } from '../utils/appuntiDiario';
import { eInCampoDiTesto } from '../utils/campiModificabili';
import { dataGiocoTesto } from '../utils/dateGioco';
import type { AppuntiDiario, EsitoAnnulloIncollaDto, PianoIncollaDto, RichiestaEseguiIncolla } from '../../shared/appuntiDiario';
import type { AzionePercorsoDto } from '../types';
import type { SelezioneVoci } from './useSelezioneVoci';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quanto aspettare dopo l'ultimo cambio di selezione prima di chiedere il blocco al server. */
const PAUSA_PRERECUPERO = 120;
/** Quanto resta a schermo la notifica con «Annulla» (si ferma col puntatore o il fuoco sopra). */
const DURATA_ANNULLABILE = 10000;
/** Quanti blocchi pronti si tengono per la giornata a schermo (selezione e menu aperti di recente). */
const BLOCCHI_TENUTI = 8;

const quante = (n: number, uno: string, molti: string) => (n === 1 ? `1 ${uno}` : `${n} ${molti}`);

/** Le istanze montate (una per giorno del Diario a schermo): risponde ai tasti solo l'ultima, così due giornate non incollano due volte. */
const montate: symbol[] = [];

/** Vero se il gesto va lasciato al browser: si scrive in un campo di testo, c'è una finestra aperta o il gesto è già di qualcun altro. */
function lasciaAlBrowser(e: Event): boolean {
  if (e.defaultPrevented) return true;
  if (eInCampoDiTesto(e.target) || eInCampoDiTesto(document.activeElement)) return true;
  return !!document.querySelector('.modal-overlay');
}
/** Vero se nella pagina c'è del testo selezionato: Ctrl+C / Ctrl+X copiano quel testo. */
const testoSelezionato = (): boolean => !!window.getSelection()?.toString();

/** Vero se questo `copy` / `cut` lasciato al browser scrive davvero qualcosa negli appunti (testo selezionato nella pagina o in un campo, o
 *  un altro gestore che l'ha già scritto): solo allora il taglio negli appunti non c'è più. Un Ctrl+C a vuoto non cambia gli appunti. */
function siCopiaAltro(e: ClipboardEvent): boolean {
  if (e.defaultPrevented || testoSelezionato()) return true;
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    try { return el.selectionStart !== null && el.selectionStart !== el.selectionEnd; } catch { return false; }
  }
  return false;
}

/** Vero se il fuoco si è perso (sul corpo della pagina, o su un elemento che non c'è più). */
const fuocoPerso = (): boolean => { const a = document.activeElement; return !a || a === document.body || !a.isConnected; };

/**
 * Dopo una ricarica della giornata: se il fuoco si è perso (la riga che lo aveva si è rimontata o è sparita), lo mette su `trova()`.
 * Si guarda per qualche frame, perché la ricarica si disegna subito dopo e i comandi delle righe restano disattivati finché l'operazione
 * non finisce (un pulsante disattivato non prende il fuoco: si riprova); non sposta mai un fuoco che è altrove (l'utente è andato oltre).
 */
export function rimettiFuoco(trova: () => HTMLElement | null, frame = 12): void {
  requestAnimationFrame(() => {
    if (fuocoPerso()) {
      const el = trova();
      if (el?.isConnected) { el.focus(); if (document.activeElement === el) return; }
    }
    if (frame > 0) rimettiFuoco(trova, frame - 1);
  });
}

/** Il messaggio di un errore per l'utente. */
const messaggio = (err: unknown, riserva: string) => (err instanceof Error && err.message ? err.message : riserva);

/**
 * Scrive negli appunti con l'evento `copy` del browser, dentro il gesto dell'utente (menu, barra): lo stesso percorso di Ctrl+C, che
 * mette testo e HTML così come sono (`navigator.clipboard.write` può ripulire l'HTML e togliere il blocco). Falso se il browser non lo fa.
 */
function scriviConEvento(c: ContenutoAppunti): boolean {
  let fatto = false;
  const h = (e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    e.preventDefault();
    // è nostro: i gestori della pagina (Ctrl+C delle voci) non lo vedono
    e.stopImmediatePropagation();
    e.clipboardData.setData('text/plain', c.testo);
    e.clipboardData.setData('text/html', c.html);
    fatto = true;
  };
  document.addEventListener('copy', h, true);
  try { return document.execCommand('copy') && fatto; } catch { return false; } finally { document.removeEventListener('copy', h, true); }
}

/** Gli appunti letti con l'API del browser (testo e HTML), o null se il browser non la offre. Può fallire (permesso negato). */
async function leggiConApi(): Promise<{ testo: string; html: string } | null> {
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
}

/** Il piano dice «niente da incollare»: lo si dice, con i motivi. */
const nienteDaIncollare = (piano: PianoIncollaDto) => notifica('warning', `Niente da incollare: ${piano.rilievi.map((x) => x.testo).join(' ') || 'nessuna voce si può incollare qui.'}`);

/** L'ultima operazione annullabile sulle voci (incolla, «Copia in…», «Sposta in…») con la sua notifica: Ctrl+Z la annulla come «Annulla»
 *  della notifica, ma SOLO mentre quella notifica è a schermo (rilievo dei revisori, 2026-10-26: un Ctrl+Z d'abitudine, minuti dopo, non
 *  deve mandare nel Cestino copie già modificate senza che nulla a schermo lo facesse prevedere). Una sola, la più recente. */
let ultimaAnnullabile: { annulla: () => void; azione: AzioneNotifica } | null = null;

/** L'operazione che Ctrl+Z annulla adesso: l'ultima, se la sua notifica con «Annulla» è ancora a schermo; altrimenti nessuna. */
function annullabileAdesso(): (() => void) | null {
  const u = ultimaAnnullabile;
  if (!u) return null;
  if (useNotificationStore.getState().notifications.some((n) => n.azione === u.azione)) return u.annulla;
  ultimaAnnullabile = null;
  return null;
}

/**
 * La notifica di un'operazione sulle voci (incolla, «Copia in…», «Sposta in…») con «Annulla» (anche Ctrl+Z finché è a schermo): l'annullo
 * rimette le voci (le copie nel Cestino) e dice ciò che non si poteva rimettere. `cosa`: che cosa si annulla, per il nome del pulsante
 * («l’incolla di 3 voci»), che da solo direbbe solo «Annulla». `fuoco`: dove va il fuoco dopo l'annullo (il pulsante sparisce, e la
 * giornata si ricarica).
 */
export function notificaOperazioneAnnullabile(testo: string, operazioneId: string | undefined, dopo: () => void | Promise<void>, cosa = 'questa operazione sulle voci del Diario', fuoco?: () => HTMLElement | null): void {
  if (!operazioneId) { notifica('success', testo); return; }
  let usato = false;
  const annulla = () => {
    if (usato) return;
    usato = true;
    // il fuoco era su un comando (il pulsante «Annulla», o altro con Ctrl+Z)? Allora, se la ricarica lo perde, si rimette
    const conFuoco = !fuocoPerso();
    if (ultimaAnnullabile?.annulla === annulla) ultimaAnnullabile = null;
    // con Ctrl+Z la notifica è ancora a schermo: se ne va qui (dal suo pulsante si chiude da sé)
    const coda = useNotificationStore.getState();
    const n = coda.notifications.find((x) => x.azione === azione);
    if (n) coda.removeNotification(n.id);
    void annullaOperazioneVoci(operazioneId).then(async (esito: EsitoAnnulloIncollaDto) => {
      await dopo();
      if (fuoco && conFuoco) rimettiFuoco(fuoco);
      const rimesse = esito.rimesse.length;
      const che = esito.modo === 'copia' ? (rimesse === 1 ? 'copia nel Cestino' : 'copie nel Cestino') : (rimesse === 1 ? 'voce rimessa al suo posto' : 'voci rimesse al loro posto');
      const testoRimesse = rimesse ? `${rimesse} ${che}.` : 'Niente da rimettere.';
      if (esito.nonRimesse.length) notifica('warning', `${testoRimesse} Non rimesse: ${esito.nonRimesse.map((x) => `${x.azione ? `«${x.azione.slice(0, 50)}» ` : ''}(${x.motivo})`).join('; ')}.`);
      else notifica('success', testoRimesse);
    }).catch((err: unknown) => notifica('error', messaggio(err, 'Annullo non riuscito.')));
  };
  const azione: AzioneNotifica = { etichetta: 'Annulla', nomeAccessibile: `Annulla ${cosa}`, scorciatoia: { aria: 'Control+Z', testo: 'Ctrl+Z' }, onClick: annulla, ...(fuoco ? { fuocoDopo: fuoco } : {}) };
  ultimaAnnullabile = { annulla, azione };
  notifica('success', testo, DURATA_ANNULLABILE, { azione });
}

/** La richiesta d'incolla in attesa della conferma dei rilievi (la finestra dei rilievi la mostra). */
export interface IncollaInAttesa { piano: PianoIncollaDto; appunti: AppuntiDiario; dopoUid: string | null }

export interface AppuntiDelGiorno {
  /** Copia negli appunti le voci (dal menu della voce o dalla barra). */
  copia: (uid: readonly string[]) => void;
  /** Taglia: come la copia, e le voci si attenuano fino all'incolla. */
  taglia: (uid: readonly string[]) => void;
  /** Prepara il blocco di queste voci (all'apertura del menu di una voce), così Copia e Taglia lo scrivono subito, nel gesto. */
  prepara: (uid: readonly string[]) => void;
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
  /** Esc: chiude il menu della voce, se ce n'è uno aperto (vero se l'ha chiuso: la selezione resta). */
  chiudiMenu?: () => boolean;
  /** Il posto del fuoco nel giorno: il «⋯» della voce `uid` se c'è, altrimenti un posto stabile del giorno (dopo l'incolla e l'annullo). */
  fuoco?: (uid: string | null) => HTMLElement | null;
}

const NESSUNO: AppuntiDelGiorno = {
  copia: () => undefined, taglia: () => undefined, prepara: () => undefined, incollaDagliAppunti: () => undefined, incollaContenuto: () => false,
  inAttesa: null, conferma: () => undefined, chiudiAttesa: () => undefined, manuale: null, chiudiManuale: () => undefined, occupato: false,
};

/** Gli appunti del giorno (solo nella preparazione: nel rilascio un hook vuoto, e il modulo esce dal bundle). */
export const useAppuntiDiario: (o: Opzioni) => AppuntiDelGiorno = IN_RILASCIO ? () => NESSUNO : useAppuntiDiarioReale;

function useAppuntiDiarioReale({ giorno, voci, selezione, onModificata, chiudiMenu, fuoco }: Opzioni): AppuntiDelGiorno {
  const [inAttesa, setInAttesa] = useState<IncollaInAttesa | null>(null);
  const [manuale, setManuale] = useState<{ dopoUid: string | null } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const occupatoRif = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const frasi: FrasiDelleVoci = useMemo(() => new Map(voci.map((v) => [v.uid, v.produceTesto ?? []])), [voci]);
  // i riferimenti che i gestori dei tasti (montati una volta) leggono sempre aggiornati
  const ultimi = useRef({ giorno, voci, selezione, frasi, onModificata, chiudiMenu, fuoco });
  useLayoutEffect(() => { ultimi.current = { giorno, voci, selezione, frasi, onModificata, chiudiMenu, fuoco }; });

  // ---- i blocchi pronti per l'evento `copy` / `cut`: per gruppo di voci, validi finché la giornata non si ricarica ----
  const pronti = useRef<{ voci: readonly AzionePercorsoDto[]; blocchi: Map<string, AppuntiDiario> }>({ voci, blocchi: new Map() });
  /** Chiede al server il blocco di queste voci, se non c'è già per la giornata di adesso. */
  const prepara = useCallback((uid: readonly string[]) => {
    if (!uid.length) return;
    const k = uid.join(','), v = ultimi.current.voci;
    if (pronti.current.voci !== v) pronti.current = { voci: v, blocchi: new Map() };
    if (pronti.current.blocchi.has(k)) return;
    void esportaAppuntiDiario([...uid]).then((a) => {
      const p = pronti.current;
      if (p.voci !== v) return;
      p.blocchi.set(k, a);
      if (p.blocchi.size > BLOCCHI_TENUTI) p.blocchi.delete(p.blocchi.keys().next().value!);
    }).catch(() => undefined);
  }, []);
  /** Il blocco già pronto per queste voci e per la giornata di adesso, o null. */
  const bloccoPronto = useCallback((uid: readonly string[]): AppuntiDiario | null => {
    const p = pronti.current;
    return p.voci === ultimi.current.voci ? p.blocchi.get(uid.join(',')) ?? null : null;
  }, []);
  const chiave = selezione.uid.join(',');
  useEffect(() => {
    if (!chiave) return;
    const t = setTimeout(() => prepara(chiave.split(',')), PAUSA_PRERECUPERO);
    return () => clearTimeout(t);
  }, [chiave, voci, prepara]);

  /** Dopo aver scritto negli appunti: la conferma (e l'avviso se Win+V potrebbe non conservarlo) e, per il taglio, il segno sulle righe. */
  const scritto = useCallback((a: AppuntiDiario, c: ContenutoAppunti) => {
    const n = a.voci.length;
    const store = useAppuntiDiarioStore.getState();
    store.segnaScritto();
    // come s'incolla, detto nella conferma: col mouse non c'è un comando a schermo (rilievo del revisore), sul tocco c'è nel menu della voce
    const tocco = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const come = tocco ? '«Incolla qui» nel menu ⋯ di una voce le mette dopo di lei' : 'Ctrl+V le mette dopo la voce selezionata (senza selezione, in fondo alla loro fascia)';
    if (a.modo === 'taglia') {
      store.imposta({ id: a.taglio!, uid: a.voci.map((v) => v.uid), giorno: ultimi.current.giorno });
      ultimi.current.selezione.svuota();
      notifica('success', `${quante(n, 'voce tagliata', 'voci tagliate')}: ${come}, anche in un altro giorno.`);
    } else {
      store.svuota();
      notifica('success', `${quante(n, 'voce copiata', 'voci copiate')} negli appunti: ${come}, anche in un altro giorno.`);
    }
    if (c.troppoPerLaCronologia) notifica('warning', `Le voci negli appunti pesano ${(c.peso / 1048576).toFixed(1)} MB: la cronologia degli appunti di Windows (Win+V) potrebbe non conservarle. Incollale subito, oppure copiane meno alla volta.`);
  }, []);

  /** Scrive negli appunti dal menu o dalla barra (o se il browser non manda l'evento): col blocco pronto nel gesto, se no mentre arriva. */
  const scriviAsincrono = useCallback((uid: readonly string[], modo: 'copia' | 'taglia') => {
    if (!uid.length) return;
    const f = ultimi.current.frasi;
    const gia = bloccoPronto(uid);
    if (gia) {
      const a = modo === 'taglia' ? comeTaglio(gia) : gia;
      const c = scriviAppunti(a, f);
      if (scriviConEvento(c)) { scritto(a, c); return; }
    }
    const blocco = (gia ? Promise.resolve(gia) : esportaAppuntiDiario([...uid])).then((a) => (modo === 'taglia' ? comeTaglio(a) : a));
    // l'HTML scritto con l'API il browser può ripulirlo: il blocco va anche nel testo, perché l'incolla lo ritrovi comunque
    const contenuto = blocco.then((a) => ({ a, c: scriviAppunti(a, f, { bloccoNelTesto: true }) }));
    const scrivi = async (): Promise<{ a: AppuntiDiario; c: ContenutoAppunti }> => {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        // l'oggetto si crea subito (dentro il gesto: Safari lo pretende), il contenuto arriva con la promessa
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': contenuto.then(({ c }) => new Blob([c.testo], { type: 'text/plain' })),
          'text/html': contenuto.then(({ c }) => new Blob([c.html], { type: 'text/html' })),
        })]);
        return contenuto;
      }
      if (navigator.clipboard?.writeText) {
        const x = await contenuto;
        await navigator.clipboard.writeText(x.c.testo);
        return x;
      }
      throw new Error('Questo browser non permette di scrivere negli appunti.');
    };
    void scrivi().then(({ a, c }) => scritto(a, c)).catch((err: unknown) => notifica('error', `Appunti non scritti: ${messaggio(err, 'il browser non lo permette')}.`));
  }, [bloccoPronto, scritto]);

  /** Esegue l'incolla, ricarica la giornata, seleziona le voci arrivate e notifica con «Annulla». */
  const esegui = useCallback(async (r: RichiestaEseguiIncolla, conFuoco: boolean) => {
    const esito = await incollaVociDiario(r);
    const store = useAppuntiDiarioStore.getState();
    if (r.appunti.modo === 'taglia' && store.taglio?.id === r.appunti.taglio) store.svuota();
    const { onModificata: ricarica } = ultimi.current;
    await ricarica();
    if (vivo.current) ultimi.current.selezione.imposta(esito.uid);
    // la riga del gesto («Incolla qui», il «⋯») si rimonta con la ricarica: il fuoco, se era su un comando e si è perso, va sulla prima
    // voce arrivata (con Ctrl+V dopo un clic sulla riga il fuoco non era su niente: resta così)
    const trova = (uid: string | null) => () => ultimi.current.fuoco?.(uid) ?? null;
    if (conFuoco) rimettiFuoco(trova(esito.uid[0] ?? null));
    const n = esito.uid.length;
    const dove = `nel giorno ${dataGiocoTesto(esito.giorno)}`;
    const base = esito.modo === 'taglia' ? `${quante(n, 'voce spostata', 'voci spostate')} ${dove}` : `${quante(n, 'voce incollata', 'voci incollate')} ${dove}`;
    const saltate = esito.saltate.length ? ` ${quante(esito.saltate.length, 'saltata', 'saltate')}: ${esito.saltate.map((s) => `«${s.azione.slice(0, 40)}» (${s.motivo})`).join('; ')}.` : '';
    const tolti = esito.effettiTolti ? ` Lasciati fuori ${quante(esito.effettiTolti, 'effetto segnalato', 'effetti segnalati')}.` : '';
    notificaOperazioneAnnullabile(`${base}.${saltate}${tolti}`, esito.operazioneId, ricarica,
      esito.modo === 'taglia' ? `lo spostamento di ${quante(n, 'voce', 'voci')}` : `l’incolla di ${quante(n, 'voce', 'voci')}`,
      // annullato, il fuoco torna alla voce dopo cui si era incollato (c'è ancora), o al primo posto del giorno
      trova(r.dopoUid ?? null));
  }, []);

  /** L'incolla di un blocco: anteprima; senza rilievi da confermare subito, altrimenti la finestra dei rilievi. */
  const avvia = useCallback(async (a: AppuntiDiario, dopoUid: string | null) => {
    if (occupatoRif.current) return;
    // dopo una delle voci tagliate non si incolla: lo si dice subito, senza chiedere al server
    if (a.modo === 'taglia' && dopoUid && a.voci.some((v) => v.uid === dopoUid)) {
      notifica('info', 'La voce selezionata è una di quelle tagliate: seleziona la voce dopo cui incollarle, oppure nessuna per metterle in fondo alla loro fascia.');
      return;
    }
    occupatoRif.current = true; setOccupato(true);
    const g = ultimi.current.giorno;
    // il fuoco era su un comando («⋯» dopo «Incolla qui»)? Allora, se la ricarica lo perde, si rimette (vedi `esegui`)
    const conFuoco = !fuocoPerso();
    try {
      const piano = await anteprimaIncollaVoci({ appunti: a, giorno: g, ...(dopoUid ? { dopoUid } : {}) });
      if (piano.daIncollare === 0) { nienteDaIncollare(piano); return; }
      if (piano.daConfermare) { if (vivo.current) setInAttesa({ piano, appunti: a, dopoUid }); return; }
      await esegui({ appunti: a, giorno: g, ...(dopoUid ? { dopoUid } : {}), impronta: piano.impronta }, conFuoco);
    } catch (err) {
      notifica('error', messaggio(err, 'Incolla non riuscito.'));
    } finally { occupatoRif.current = false; if (vivo.current) setOccupato(false); }
  }, [esegui]);

  const conferma = useCallback((senzaSegnalati: boolean) => {
    const att = inAttesa;
    if (!att || occupatoRif.current) return;
    occupatoRif.current = true; setOccupato(true);
    const g = ultimi.current.giorno;
    const dove = att.dopoUid ? { dopoUid: att.dopoUid } : {};
    // dalla finestra dei rilievi: chiusa, il fuoco non ha più il suo pulsante e va sulla prima voce arrivata
    void esegui({ appunti: att.appunti, giorno: g, ...dove, conferma: true, impronta: att.piano.impronta, ...(senzaSegnalati ? { senzaSegnalati: true } : {}) }, true)
      .then(() => { if (vivo.current) setInAttesa(null); })
      .catch(async (err: unknown) => {
        // nel frattempo il piano è cambiato (una voce spostata, un effetto tolto): la finestra si rinfresca con i rilievi di adesso, invece di
        // ripetere lo stesso rifiuto a ogni conferma (rilievo del revisore, 2026-10-26)
        if (!isApiError(err, 'piano-cambiato') && !isApiError(err, 'rilievi-non-confermati')) { notifica('error', messaggio(err, 'Incolla non riuscito.')); return; }
        try {
          const piano = await anteprimaIncollaVoci({ appunti: att.appunti, giorno: g, ...dove });
          if (!vivo.current) return;
          if (piano.daIncollare === 0) { setInAttesa(null); nienteDaIncollare(piano); return; }
          setInAttesa({ ...att, piano });
          notifica('info', 'Nel frattempo qualcosa è cambiato: i rilievi sono aggiornati, rivedili e conferma di nuovo.');
        } catch (e2) { notifica('error', messaggio(e2, 'Incolla non riuscito.')); }
      })
      .finally(() => { occupatoRif.current = false; if (vivo.current) setOccupato(false); });
  }, [inAttesa, esegui]);

  /** «Incolla qui» del menu o della barra: legge gli appunti con l'API del browser; se non può, il riquadro manuale. */
  const incollaDagliAppunti = useCallback((dopoUid: string | null) => {
    const apriManuale = () => { notifica('info', 'Il browser non permette di leggere gli appunti da qui: incollali nel riquadro.'); setManuale({ dopoUid }); };
    void leggiConApi().then((c) => {
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
    const store = () => useAppuntiDiarioStore.getState();

    const suCopiaTaglia = (modo: 'copia' | 'taglia') => (e: ClipboardEvent) => {
      if (!mia()) return;
      annullaAtteso();
      const uid = ultimi.current.selezione.uid;
      if (!uid.length || lasciaAlBrowser(e) || testoSelezionato()) {
        // si copia altro (un testo, un campo): negli appunti il taglio non c'è più, e il segno sulle righe se ne va. Un Ctrl+C a vuoto
        // (niente selezionato) non cambia gli appunti: il segno resta (rilievo del revisore)
        if (store().taglio && siCopiaAltro(e)) store().svuota();
        return;
      }
      e.preventDefault();
      const blocco = bloccoPronto(uid);
      if (blocco && e.clipboardData) {
        const a = modo === 'taglia' ? comeTaglio(blocco) : blocco;
        const c = scriviAppunti(a, ultimi.current.frasi);
        e.clipboardData.setData('text/plain', c.testo);
        e.clipboardData.setData('text/html', c.html);
        scritto(a, c);
      } else scriviAsincrono(uid, modo);
    };
    const suCopia = suCopiaTaglia('copia'), suTaglia = suCopiaTaglia('taglia');
    const suIncolla = (e: ClipboardEvent) => {
      if (!mia()) return;
      annullaAtteso();
      if (!e.clipboardData) return;
      const a = leggiAppunti({ testo: e.clipboardData.getData('text/plain'), html: e.clipboardData.getData('text/html') });
      // ciò che si incolla (anche in un campo) dice che cosa c'è negli appunti: se non è il taglio segnato, il segno se ne va
      const t = store().taglio;
      if (t && !(a?.modo === 'taglia' && a.taglio === t.id)) store().svuota();
      if (lasciaAlBrowser(e)) return;
      // un testo qualsiasi: il comportamento del browser resta
      if (!a) return;
      e.preventDefault();
      void avvia(a, ultimi.current.selezione.ancora);
    };
    /** Ctrl+V senza evento `paste`: si legge con l'API solo se l'app ha scritto voci negli appunti in questa sessione (niente richiesta di
     *  permesso a ogni Ctrl+V); un contenuto che non è un blocco di voci non fa niente. */
    const incollaDaTastiera = () => {
      if (!store().scrittoInSessione) return;
      void leggiConApi().then((c) => { const a = c ? leggiAppunti(c) : null; if (a) void avvia(a, ultimi.current.selezione.ancora); }).catch(() => undefined);
    };
    const suTasto = (e: KeyboardEvent) => {
      if (!mia() || e.isComposing || e.repeat) return;
      if (e.key === 'Escape') {
        if (lasciaAlBrowser(e)) return;
        // prima il menu della voce aperto (la selezione resta), poi la selezione e il segno del taglio
        if (ultimi.current.chiudiMenu?.()) { e.preventDefault(); return; }
        const { selezione } = ultimi.current;
        if (!selezione.uid.length && !store().taglio) return;
        selezione.svuota();
        store().svuota();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z') {
        // Ctrl+Z: l'ultima operazione sulle voci, come «Annulla» della sua notifica, solo mentre la notifica è a schermo (fuori dai campi,
        // dove resta l'annulla del testo)
        const annulla = annullabileAdesso();
        if (!annulla || lasciaAlBrowser(e)) return;
        e.preventDefault();
        annulla();
        return;
      }
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
    /**
     * Tornando alla finestra gli appunti possono contenere altro (copiato in un altro programma): se si possono rileggere senza chiedere
     * (permesso di lettura già dato) e il taglio non c'è più, il segno se ne va. Se non si possono rileggere il segno RESTA: Ctrl+V
     * sposterebbe comunque le voci, e un segno sparito mentre il taglio vale direbbe il contrario (rilievo del revisore, 2026-10-26); lo
     * corregge il primo incolla (l'evento `paste` porta ciò che c'è davvero negli appunti) o una copia d'altro nella pagina.
     */
    const suRitorno = () => {
      const t = store().taglio;
      if (!t || !mia() || !navigator.permissions?.query) return;
      const via = () => { if (store().taglio?.id === t.id) store().svuota(); };
      void navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then(async (s) => {
        if (s.state !== 'granted') return;
        const c = await leggiConApi();
        const a = c ? leggiAppunti(c) : null;
        if (!(a?.modo === 'taglia' && a.taglio === t.id)) via();
      }).catch(() => undefined);
    };
    document.addEventListener('copy', suCopia);
    document.addEventListener('cut', suTaglia);
    document.addEventListener('paste', suIncolla);
    document.addEventListener('keydown', suTasto);
    window.addEventListener('focus', suRitorno);
    return () => {
      annullaAtteso();
      const i = montate.indexOf(io);
      if (i >= 0) montate.splice(i, 1);
      document.removeEventListener('copy', suCopia);
      document.removeEventListener('cut', suTaglia);
      document.removeEventListener('paste', suIncolla);
      document.removeEventListener('keydown', suTasto);
      window.removeEventListener('focus', suRitorno);
    };
  }, [avvia, bloccoPronto, scritto, scriviAsincrono]);

  return {
    copia: (uid) => scriviAsincrono(uid, 'copia'),
    taglia: (uid) => scriviAsincrono(uid, 'taglia'),
    prepara,
    incollaDagliAppunti, incollaContenuto,
    inAttesa, conferma, chiudiAttesa: () => setInAttesa(null),
    manuale, chiudiManuale: () => setManuale(null),
    occupato,
  };
}
