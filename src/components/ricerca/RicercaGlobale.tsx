// ============================================================
// RicercaGlobale — la finestra della ricerca per nome in tutta la guida (L11, B4: R11-07/2, R11-08/1, R11-10b/2)
// ============================================================
//
// Come funziona:
// - si apre dal pulsante «Cerca» della barra superiore o dal tasto «/» (`ricercaStore`); è montata una volta in `MainLayout`, sopra la pagina:
//   sotto 1024 px a tutto schermo (telefono e tablet verticale), da 1024 px un pannello a destra come la scheda sopra il diario;
// - il fuoco entra sul campo; dopo 200 ms dall'ultima battuta, con almeno due caratteri, chiede `GET /api/ricerca` (con la partita attiva,
//   per «Chiuso adesso» e «Non ancora aperto»); conta solo l'ultima richiesta (il client non ha un segnale di annullamento);
// - i risultati sono raggruppati per tipo con le etichette di `shared/ricerca.ts` (mai «Mappa» né «atlante»); ogni riga è un collegamento alla
//   `casa` calcolata dal server, con miniatura (risolutore unico delle immagini), percorso, «trovato come» e il segno di stato;
// - tastiera: Invio nel campo apre il primo risultato, frecce su e giù spostano il fuoco fra campo e righe, Esc chiude, Tab resta dentro;
//   alla chiusura il fuoco torna a chi aveva aperto la finestra (non se si è scelto un risultato: la pagina cambia);
// - non è una superficie di approvazione: nessuna azione di scrittura, nessun «Da rivedere».
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as TastoReact, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cercaGlobale } from '../../services/api';
import { useRicercaStore } from '../../stores/ricercaStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { ETICHETTE_RICERCA, LIMITE_MASSIMO_RICERCA, MIN_CARATTERI_RICERCA, type GruppoRicercaDto, type RicercaGlobaleDto, type RisultatoRicercaDto, type TipoRicerca } from '../../../shared/ricerca';
import { urlMiniatura } from '../../../shared/miniature';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Spinner } from '../shared/PageState';
import { IconBolt, IconClose, IconMask } from '../shared/icons';
import {
  IconAppunti, IconBersaglio, IconBussola, IconChiave, IconFilm, IconGioca, IconGioco, IconLibro, IconMedaglia, IconMessaggio, IconNegozio,
  IconOrologio, IconPersone, IconPianta, IconPosizione, IconRegalo, IconScudo,
} from '../shared/iconeGuida';

/** Quanto si aspetta dall'ultima battuta prima di chiedere al server. */
const ATTESA_MS = 200;

/** L'icona di ogni tipo, per i risultati senza immagine; un `Record` completo: un tipo nuovo senza icona non compila. Mai l'icona delle mappe per un posto. */
const ICONE_TIPO: Readonly<Record<TipoRicerca, (dimensione: number) => ReactNode>> = {
  confidente: (s) => <IconPersone size={s} />,
  persona: (s) => <IconMask size={s} />,
  skill: (s) => <IconBolt size={s} />,
  oggetto: (s) => <IconRegalo size={s} />,
  libro: (s) => <IconLibro size={s} />,
  film: (s) => <IconFilm size={s} />,
  videogioco: (s) => <IconGioco size={s} />,
  luogo: (s) => <IconPosizione size={s} />,
  negozio: (s) => <IconNegozio size={s} />,
  attivita: (s) => <IconGioca size={s} />,
  quartiere: (s) => <IconPosizione size={s} />,
  citta: (s) => <IconPosizione size={s} />,
  area: (s) => <IconPosizione size={s} />,
  planimetria: (s) => <IconPianta size={s} />,
  palazzo: (s) => <IconScudo size={s} />,
  infiltrazione: (s) => <IconChiave size={s} />,
  dedalo: (s) => <IconBussola size={s} />,
  'area-dedalo': (s) => <IconBussola size={s} />,
  voce: (s) => <IconAppunti size={s} />,
  richiesta: (s) => <IconMessaggio size={s} />,
  giorno: (s) => <IconOrologio size={s} />,
  trofeo: (s) => <IconMedaglia size={s} />,
  sfida: (s) => <IconBersaglio size={s} />,
};

/** Gli elementi che ricevono il fuoco con Tab. */
const ATTIVABILI = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Quel che il server ha risposto (o l'errore) per una ricerca, con la chiave della ricerca a cui appartiene. */
interface Esito { chiave: string; dati: RicercaGlobaleDto | null; errore: boolean }

/** I gruppi richiesti per intero con «Mostra tutti», validi solo per la ricerca di `chiave`. */
interface Estesi { chiave: string; gruppi: Partial<Record<TipoRicerca, GruppoRicercaDto>> }

/** La miniatura di un risultato: l'immagine col risolutore unico (caricata, poi asset predefinito), altrimenti l'icona del tipo. */
function Miniatura({ r }: { r: RisultatoRicercaDto }) {
  const url = useImmagineMappa(r.immagine);
  return (
    <span className="ricerca-riga__miniatura" aria-hidden="true">
      {url ? <img src={urlMiniatura(url, 160)} alt="" loading="lazy" decoding="async" draggable={false} /> : ICONE_TIPO[r.tipo](22)}
    </span>
  );
}

/** Una riga di risultato: un collegamento a tutta larghezza alla pagina dell'oggetto. */
function Riga({ r, onScelto }: { r: RisultatoRicercaDto; onScelto: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const etichetta = ETICHETTE_RICERCA[r.tipo].singolare;
  return (
    <li className="m-0 list-none p-0">
      <Link to={r.casa} className="ricerca-riga touch" data-riga-ricerca onClick={onScelto}>
        <Miniatura r={r} />
        <span className="ricerca-riga__testo">
          <strong className="text-[14px] leading-tight"><span className="sr-only">{etichetta}: </span>{r.nome}</strong>
          {r.trovatoCome && <span className="text-[12px] text-text-secondary">trovato come «{r.trovatoCome}»</span>}
          {r.percorso.length > 0 && <span className="text-[12px] text-text-muted">{r.percorso.join(' › ')}</span>}
          {r.stato && <span><span className={`chip text-[11px] ${r.stato.tipo === 'da-verificare' ? 'chip--attivo' : ''}`}>{r.stato.testo}</span></span>}
        </span>
      </Link>
    </li>
  );
}

/** La finestra aperta: nasce a ogni apertura (lo stato interno riparte), il testo cercato viene dallo store. */
function FinestraRicerca() {
  const q = useRicercaStore((s) => s.q);
  const impostaQ = useRicercaStore((s) => s.impostaQ);
  const chiudi = useRicercaStore((s) => s.chiudi);
  const partita = usePartitaStore((s) => s.attiva?.id);
  const navigate = useNavigate();
  const foglio = useRef<HTMLDivElement | null>(null);
  const premutoSuSfondo = useRef(false);

  const testo = q.trim();
  const valida = testo.length >= MIN_CARATTERI_RICERCA;
  const [tentativo, setTentativo] = useState(0);
  const chiave = `${testo}|${partita ?? ''}|${tentativo}`;
  const [esito, setEsito] = useState<Esito | null>(null);
  const [estesi, setEstesi] = useState<Estesi>({ chiave: '', gruppi: {} });
  const [inEspansione, setInEspansione] = useState<TipoRicerca | null>(null);
  const [erroreEspansione, setErroreEspansione] = useState<TipoRicerca | null>(null);

  // la ricerca: dopo l'attesa dall'ultima battuta; vale solo l'ultima (`attuale` passa a falso a ogni nuova battuta o alla chiusura)
  useEffect(() => {
    if (!valida) return;
    let attuale = true;
    const timer = window.setTimeout(() => {
      cercaGlobale(testo, { partita }).then(
        (dati) => { if (attuale) setEsito({ chiave, dati, errore: false }); },
        () => { if (attuale) setEsito({ chiave, dati: null, errore: true }); },
      );
    }, ATTESA_MS);
    return () => { attuale = false; window.clearTimeout(timer); };
  }, [chiave, testo, valida, partita]);

  // all'apertura il testo dell'ultima ricerca è selezionato: scrivere lo sostituisce, Invio o le frecce lo usano com'è
  useLayoutEffect(() => { foglio.current?.querySelector<HTMLInputElement>('input')?.select(); }, []);

  // Esc chiude (in cattura, così il campo di ricerca non azzera anche il testo); non se una finestra aperta lo sta già usando
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal-overlay')) return;
      e.preventDefault();
      chiudi();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [chiudi]);

  const inCorso = valida && esito?.chiave !== chiave;
  const errore = valida && esito?.chiave === chiave && esito.errore;
  // finché la ricerca nuova non arriva resta la lista di prima (attenuata): niente salti di contenuto a ogni lettera
  const dati = valida && !errore ? esito?.dati ?? null : null;
  const gruppi = useMemo<GruppoRicercaDto[]>(() => {
    if (!dati || !esito) return [];
    const interi = estesi.chiave === esito.chiave ? estesi.gruppi : {};
    return dati.gruppi.map((g) => interi[g.tipo] ?? g);
  }, [dati, esito, estesi]);
  const primo = gruppi[0]?.risultati[0] ?? null;

  /** Un risultato scelto: la finestra si chiude senza restituire il fuoco (la pagina cambia). Con un tasto di comando (nuova scheda) resta. */
  const scelto = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    chiudi(false);
  };

  /** «Mostra tutti» per un gruppo: lo richiede intero (fino al massimo) e sostituisce solo quel gruppo. */
  const mostraTutti = async (tipo: TipoRicerca) => {
    setInEspansione(tipo);
    setErroreEspansione(null);
    try {
      const r = await cercaGlobale(testo, { tipi: [tipo], limite: LIMITE_MASSIMO_RICERCA, partita });
      const g = r.gruppi.find((x) => x.tipo === tipo);
      if (g) setEstesi((p) => ({ chiave: esito?.chiave ?? chiave, gruppi: { ...(p.chiave === (esito?.chiave ?? chiave) ? p.gruppi : {}), [tipo]: g } }));
    } catch {
      setErroreEspansione(tipo);
    } finally {
      setInEspansione(null);
    }
  };

  /** Tab e Maiusc+Tab restano dentro la finestra. */
  const tieniIlFuoco = (e: TastoReact<HTMLDivElement>) => {
    const el = foglio.current;
    if (e.key !== 'Tab' || !el) return;
    const elenco = [...el.querySelectorAll<HTMLElement>(ATTIVABILI)].filter((x) => !x.closest('[hidden], [inert]'));
    if (elenco.length === 0) { e.preventDefault(); return; }
    const prima = elenco[0];
    const ultima = elenco[elenco.length - 1];
    const attivo = document.activeElement;
    if (e.shiftKey && (attivo === prima || attivo === el)) { e.preventDefault(); ultima.focus(); }
    else if (!e.shiftKey && attivo === ultima) { e.preventDefault(); prima.focus(); }
  };

  /** Invio nel campo apre il primo risultato; le frecce su e giù spostano il fuoco fra il campo e le righe. */
  const tasti = (e: TastoReact<HTMLDivElement>) => {
    tieniIlFuoco(e);
    if (e.defaultPrevented) return;
    const bersaglio = e.target instanceof HTMLElement ? e.target : null;
    const nelCampo = bersaglio instanceof HTMLInputElement;
    if (e.key === 'Enter' && nelCampo) {
      if (primo && !inCorso) { e.preventDefault(); chiudi(false); void navigate(primo.casa); }
      return;
    }
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || !bersaglio || (!nelCampo && !bersaglio.hasAttribute('data-riga-ricerca'))) return;
    const righe = [...(foglio.current?.querySelectorAll<HTMLElement>('[data-riga-ricerca]') ?? [])];
    if (righe.length === 0) return;
    e.preventDefault();
    const i = righe.indexOf(bersaglio);
    if (e.key === 'ArrowDown') righe[Math.min(i + 1, righe.length - 1)].focus();
    else if (i <= 0) foglio.current?.querySelector<HTMLInputElement>('input')?.focus();
    else righe[i - 1].focus();
  };

  return createPortal(
    // lo sfondo chiude solo se il gesto comincia e finisce lì: una selezione di testo rilasciata fuori non chiude la finestra
    <div className="ricerca-globale" role="presentation"
      onMouseDown={(e) => { premutoSuSfondo.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (premutoSuSfondo.current && e.target === e.currentTarget) chiudi(); premutoSuSfondo.current = false; }}>
      <div ref={foglio} className="ricerca-globale__foglio" role="dialog" aria-modal="true" aria-label="Cerca nella guida" tabIndex={-1} onKeyDown={tasti}>
        <div className="ricerca-globale__testa">
          <CampoRicerca valore={q} onCambia={impostaQ} segnaposto="Cerca nella guida…" autoFocus />
          <button type="button" className="btn btn-ghost btn-sm touch shrink-0" onClick={() => chiudi()} aria-label="Chiudi la ricerca">
            <IconClose size={18} /> Chiudi
          </button>
        </div>
        <div className="area-scorrevole ricerca-globale__corpo" aria-busy={inCorso}>
          {/* una riga sola per dire come va: «Cerco…», quanti risultati, nessun risultato, il suggerimento */}
          <p className="m-0 min-h-5 text-[12px] text-text-muted" role="status">
            {!valida && `Scrivi almeno ${MIN_CARATTERI_RICERCA} lettere: si cerca per nome fra Persona, Skill, Confidenti, oggetti, luoghi, negozi, Palazzi, Richieste, trofei e altro.`}
            {valida && errore && 'La ricerca non è riuscita.'}
            {valida && !errore && inCorso && dati && 'Cerco…'}
            {valida && !errore && !inCorso && dati && (dati.totale === 0 ? `Nessun risultato per «${testo}».` : `${dati.totale} ${dati.totale === 1 ? 'risultato' : 'risultati'} per «${testo}».`)}
          </p>
          {valida && errore && (
            <div className="flex flex-col items-start gap-2" role="alert">
              <p className="m-0 text-[13px]">Non riesco a raggiungere la ricerca. Controlla la connessione e riprova.</p>
              <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setTentativo((n) => n + 1)}>Riprova</button>
            </div>
          )}
          {valida && !errore && inCorso && !dati && <div className="flex justify-center py-8"><Spinner size={36} /></div>}
          <div className={inCorso && dati ? 'flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'}>
            {gruppi.map((g) => {
              const titolo = ETICHETTE_RICERCA[g.tipo].plurale;
              return (
                <section key={g.tipo} aria-label={titolo} className="flex min-w-0 flex-col gap-1">
                  <h2 className="m-0 flex items-baseline gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                    {titolo}<span className="text-[12px] font-normal text-text-muted">{g.totale}</span>
                  </h2>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {g.risultati.map((r) => <Riga key={`${r.tipo}|${r.chiave}`} r={r} onScelto={scelto} />)}
                  </ul>
                  {g.totale > g.risultati.length && (
                    g.risultati.length < LIMITE_MASSIMO_RICERCA
                      ? <button type="button" className="btn btn-ghost btn-sm touch self-start" disabled={inEspansione === g.tipo} onClick={() => void mostraTutti(g.tipo)}>
                          {inEspansione === g.tipo ? 'Carico…' : `Mostra tutti (${g.totale})`}
                        </button>
                      : <p className="m-0 text-[12px] text-text-muted">Prime {g.risultati.length} di {g.totale}: scrivi di più per restringere.</p>
                  )}
                  {erroreEspansione === g.tipo && <p className="m-0 text-[12px] text-text-muted" role="alert">Non sono riuscito a caricare gli altri: riprova.</p>}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** La ricerca globale: montata una volta in `MainLayout`; senza apertura non rende niente. Alla chiusura rende il fuoco a chi l'aveva aperta
 *  (salvo un risultato scelto) e si chiude da sola se la pagina cambia (per esempio con «Indietro»). */
export function RicercaGlobale() {
  const aperta = useRicercaStore((s) => s.aperta);
  const eraAperta = useRef(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (eraAperta.current && !aperta) {
      const { chiamante, restituisciFuoco } = useRicercaStore.getState();
      if (restituisciFuoco) {
        const el = chiamante?.isConnected && chiamante !== document.body ? chiamante : document.querySelector<HTMLElement>('[data-pulsante-cerca]');
        el?.focus({ preventScroll: true });
      }
    }
    eraAperta.current = aperta;
  }, [aperta]);

  // un cambio di pagina (anche «Indietro» del browser) chiude la finestra, senza riportare il fuoco sul pulsante
  useEffect(() => { useRicercaStore.getState().chiudi(false); }, [pathname, search]);

  return aperta ? <FinestraRicerca /> : null;
}
