// ============================================================
// SchedaNelCassetto — la scheda completa del Confidente come seconda vista del cassetto della scheda «Confidenti» della partita
// ============================================================
//
// Progetto approvato dall'utente (2026-10-24, tavola 4 del canvas): le informazioni non portano fuori. La pagina del Confidente
// (`ConfidenteDettaglioPage`: abilità per rango, risposte di tutti i ranghi, regali, disponibilità e inviti, «Modifica informazioni») si
// mostra dentro il cassetto con lo stesso meccanismo del pannello sopra il diario (R10-27, `SchedaCorrenteContext`): la pagina legge la
// posizione «virtuale» della scheda al posto dell'indirizzo vero. I suoi spostamenti dentro la stessa scheda (`?informazioni=1`,
// `?requisiti=N`) restano nel cassetto.
//
// Collegamenti verso altre schede: dentro il cassetto c'è una pila di schede. Un clic semplice su un collegamento il cui indirizzo è una
// scheda riconosciuta da `trovaScheda` (altro Confidente, Palazzo, negozio, luogo, oggetto, libro, film, attività, Richiesta) o è il bivio
// «Dove si trova» (`/guida/mondo/:tipo/:chiave`) apre quella scheda DENTRO il cassetto, al posto della precedente, con in alto «← Torna a
// <scheda precedente>»; anche i collegamenti dentro quelle schede restano nel cassetto (stessa tecnica: ognuna legge la sua posizione
// virtuale). La scheda del Confidente sotto resta montata (nascosta): tornando ritrova lo scorrimento e ciò che era aperto. La pila si
// azzera chiudendo il cassetto o tornando al Level up (la vista si smonta). Restano navigazione vera: i collegamenti con Ctrl/Cmd/Maiusc/Alt
// o clic centrale (apertura in un'altra scheda del browser), quelli verso pagine che non sono schede (la mappa intera, le planimetrie, la
// guida della città…: sono azioni esplicite di aprire quella pagina) e gli spostamenti programmatici verso pagine non-scheda.
// ============================================================

import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { matchPath, resolvePath, useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { SchedaCorrenteContext, type SchedaCorrente } from '../scheda/contestoScheda';
import { ContenutoScheda } from '../scheda/ContenutoScheda';
import { DoveSiTrovaNelCassetto, ConfidenteDettaglioPage } from '../scheda/pagineScheda';
import { ErroreInRiquadro } from '../shared/ErrorePagina';
import { IconChevronLeft } from '../shared/icons';
import { Spinner } from '../shared/PageState';
import { scomponiIndirizzo, trovaScheda } from '../../utils/pannelloScheda';

/** L'indirizzo del bivio «Dove si trova». */
const MODELLO_MONDO = '/guida/mondo/:tipo/:chiave';

interface Props {
  chiave: string;
  /** I parametri con cui aprire la scheda (es. `?requisiti=5` da «Correggi» dei requisiti). */
  searchIniziale?: string;
  /** Torna alla vista «Level up» del cassetto: la usa «Aggiorna il rango» della scheda, che fuori dal cassetto porta alla pagina dei
   *  Confidenti (dentro, quella funzione è già qui accanto). */
  onLevelUp: () => void;
}

/** Una scheda sulla pila: l'indirizzo che mostra (cambia con gli spostamenti dentro la stessa scheda) e un numero per riconoscerla. */
interface Voce { id: number; indirizzo: string }

/** Cosa mostra un indirizzo del cassetto: il bivio «Dove si trova», una scheda, o niente (una pagina vera). */
type Vista =
  | { tipo: 'mondo'; etichetta: string; pathname: string; search: string; hash: string; params: Record<string, string | undefined> }
  | { tipo: 'scheda'; etichetta: string; scheda: NonNullable<ReturnType<typeof trovaScheda>> };

function leggiVista(indirizzo: string): Vista | null {
  const parti = scomponiIndirizzo(indirizzo);
  if (!parti) return null;
  const mondo = matchPath({ path: MODELLO_MONDO, end: true }, parti.pathname);
  if (mondo) return { tipo: 'mondo', etichetta: 'Dove si trova', ...parti, params: { ...mondo.params } };
  const scheda = trovaScheda(indirizzo);
  return scheda ? { tipo: 'scheda', etichetta: scheda.etichetta, scheda } : null;
}

/** La stessa scheda (stessa pagina, stesso elemento): un cambio di soli parametri non apre una scheda nuova. */
function stessaScheda(a: Vista, b: Vista): boolean {
  if (a.tipo === 'mondo' && b.tipo === 'mondo') return a.pathname === b.pathname;
  if (a.tipo === 'scheda' && b.tipo === 'scheda') return a.scheda.pathname === b.scheda.pathname && a.scheda.elemento === b.scheda.elemento;
  return false;
}

/** La pagina del Confidente dentro il cassetto, con la sua posizione virtuale `/confidenti/<chiave>`, e sopra la pila delle schede aperte
 *  dai suoi collegamenti. */
export function SchedaNelCassetto({ chiave, searchIniziale = '', onLevelUp }: Props) {
  const navigate = useNavigate();
  const percorso = `/confidenti/${encodeURIComponent(chiave)}`;
  const [search, setSearch] = useState(searchIniziale);
  const [pila, setPila] = useState<Voce[]>([]);
  const contatore = useRef(0);
  const radice = useRef<HTMLDivElement | null>(null);
  /** Lo scorrimento delle schede lasciate (l'indice è la posizione sulla pila: 0 = la scheda del Confidente). */
  const scorrimenti = useRef<number[]>([]);
  const lunghezzaPrima = useRef(0);

  /** Il corpo del cassetto: l'unica area che scorre. */
  const corpo = useCallback((): HTMLElement | null => radice.current?.closest<HTMLElement>('.modal-body') ?? null, []);

  /** Apre un indirizzo nel cassetto (sopra la scheda mostrata, o al suo posto con `sostituisce`); falso se non è una scheda. */
  const apri = useCallback((indirizzo: string, sostituisce = false): boolean => {
    if (!leggiVista(indirizzo)) return false;
    setPila((p) => {
      const voce: Voce = { id: ++contatore.current, indirizzo };
      if (sostituisce && p.length > 0) return [...p.slice(0, -1), voce];
      scorrimenti.current[p.length] = corpo()?.scrollTop ?? 0;
      return [...p, voce];
    });
    return true;
  }, [corpo]);

  const indietro = useCallback(() => setPila((p) => p.slice(0, -1)), []);

  // aprendo una scheda si riparte dall'alto; tornando indietro si ritrova lo scorrimento della scheda lasciata
  useLayoutEffect(() => {
    const el = corpo();
    if (el && pila.length !== lunghezzaPrima.current) {
      el.scrollTo?.({ top: pila.length > lunghezzaPrima.current ? 0 : scorrimenti.current[pila.length] ?? 0 });
    }
    lunghezzaPrima.current = pila.length;
  }, [pila.length, corpo]);

  /** Un indirizzo cercato dalla scheda `da` (percorso risolto rispetto alla sua posizione). */
  const risolvi = (a: To, da: string) => { const p = resolvePath(a, da); return `${p.pathname}${p.search}${p.hash}`; };

  /** Gli spostamenti della scheda del Confidente: dentro la stessa scheda cambia solo la posizione virtuale; verso un'altra scheda si apre
   *  sulla pila; verso una pagina vera si naviga davvero. */
  const navigaRadice = useCallback((a: To | number, opzioni?: NavigateOptions) => {
    if (typeof a === 'number') { void navigate(a); return; }
    const p = resolvePath(a, percorso);
    if (p.pathname === percorso) { setSearch(p.search); return; }
    const verso = `${p.pathname}${p.search}${p.hash}`;
    if (apri(verso)) return;
    void navigate(verso, opzioni);
  }, [navigate, percorso, apri]);

  const corrente = useMemo<SchedaCorrente>(() => ({
    posizione: { pathname: percorso, search, hash: '', state: null, key: `${percorso}${search}` },
    params: { chiave },
    naviga: navigaRadice,
  }), [percorso, search, chiave, navigaRadice]);

  /** Gli spostamenti di una scheda sulla pila (`id`): stessa scheda → cambiano i suoi parametri; un'altra scheda → si apre (o sostituisce, se
   *  è un reindirizzamento); una pagina vera → si naviga davvero; `-1` → torna alla scheda di prima. */
  const navigaVoce = useCallback((id: number, daIndirizzo: string, a: To | number, opzioni?: NavigateOptions) => {
    if (typeof a === 'number') { if (a < 0) indietro(); else void navigate(a); return; }
    const verso = risolvi(a, daIndirizzo);
    const vista = leggiVista(verso);
    const attuale = leggiVista(daIndirizzo);
    if (!vista) { void navigate(verso, opzioni); return; }
    if (attuale && stessaScheda(attuale, vista)) {
      setPila((p) => p.map((v) => (v.id === id ? { ...v, indirizzo: verso } : v)));
      return;
    }
    apri(verso, opzioni?.replace === true);
  }, [navigate, apri, indietro]);

  /** Un clic semplice su un collegamento: alla scheda «Confidenti» della partita («Aggiorna il rango») torna al Level up del cassetto; a una
   *  scheda riconosciuta o al bivio «Dove si trova» la apre dentro il cassetto. Gli altri collegamenti navigano come sempre. */
  const intercetta = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !e.currentTarget.contains(a) || a.target === '_blank' || a.hasAttribute('download')) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === '/partita' && url.searchParams.get('scheda') === 'confidenti') { e.preventDefault(); e.stopPropagation(); onLevelUp(); return; }
    if (apri(`${url.pathname}${url.search}${url.hash}`)) { e.preventDefault(); e.stopPropagation(); }
  };

  const ultima = pila.length > 0 ? pila[pila.length - 1] : null;
  const precedente = pila.length > 1 ? leggiVista(pila[pila.length - 2].indirizzo) : null;
  const etichettaPrecedente = pila.length > 1 ? precedente?.etichetta ?? 'scheda' : 'Confidente';

  return (
    <div ref={radice} onClickCapture={intercetta}>
      {/* la scheda del Confidente resta montata sotto le altre: tornando indietro è com'era (scorrimento, finestre, campi) */}
      <div hidden={ultima !== null}>
        <SchedaCorrenteContext.Provider value={corrente}>
          <Suspense fallback={<div className="flex justify-center py-10"><Spinner size={36} /></div>}>
            <ConfidenteDettaglioPage.Componente />
          </Suspense>
        </SchedaCorrenteContext.Provider>
      </div>
      {pila.map((voce, i) => (
        <div key={voce.id} hidden={i !== pila.length - 1}>
          {i === pila.length - 1 && (
            <div className="sticky top-0 z-10 -mx-1 mb-3 bg-bg-secondary px-1 py-1">
              <button type="button" className="btn btn-ghost btn-sm touch" onClick={indietro} aria-label={`Torna a ${etichettaPrecedente}`}>
                <IconChevronLeft size={18} /> Torna a {etichettaPrecedente}
              </button>
            </div>
          )}
          <VoceNelCassetto voce={voce} naviga={navigaVoce} />
        </div>
      ))}
    </div>
  );
}

/** Una scheda sulla pila, con la sua posizione virtuale (la stessa tecnica del pannello sopra il diario). */
function VoceNelCassetto({ voce, naviga }: { voce: Voce; naviga: (id: number, daIndirizzo: string, a: To | number, opzioni?: NavigateOptions) => void }) {
  const vista = useMemo(() => leggiVista(voce.indirizzo), [voce.indirizzo]);
  const { id, indirizzo } = voce;
  const vai = useCallback((a: To | number, opzioni?: NavigateOptions) => naviga(id, indirizzo, a, opzioni), [naviga, id, indirizzo]);
  const corrente = useMemo<SchedaCorrente | null>(() => {
    if (!vista) return null;
    if (vista.tipo === 'mondo') return { posizione: { pathname: vista.pathname, search: vista.search, hash: vista.hash, state: null, key: voce.indirizzo }, params: vista.params, naviga: vai };
    const s = vista.scheda;
    return { posizione: { pathname: s.pathname, search: s.search, hash: s.hash, state: null, key: s.indirizzo }, params: s.params, naviga: vai };
  }, [vista, voce.indirizzo, vai]);
  if (!vista || !corrente) return null;
  // come nel pannello: la stessa pagina con parametri diversi non si rimonta, un'altra pagina (o un altro elemento di un elenco) sì
  const chiaveVista = vista.tipo === 'mondo' ? vista.pathname : `${vista.scheda.modello}|${vista.scheda.elemento ?? ''}`;
  return (
    <SchedaCorrenteContext.Provider value={corrente}>
      <ErroreInRiquadro key={chiaveVista}>
        <Suspense fallback={<div className="flex justify-center py-10"><Spinner size={36} /></div>}>
          {vista.tipo === 'mondo'
            ? <DoveSiTrovaNelCassetto.Componente tipo={vista.params.tipo ?? ''} chiave={vista.params.chiave ?? ''} />
            : <ContenutoScheda key={chiaveVista} scheda={vista.scheda} />}
        </Suspense>
      </ErroreInRiquadro>
    </SchedaCorrenteContext.Provider>
  );
}
