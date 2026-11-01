// ============================================================
// IndiceSezioni — l'indice delle sezioni in testa alle Impostazioni (L10-08, schizzo approvato)
// ============================================================
//
// Una fila di chip da 44 px che scorre con le frecce (`FilaScorrevole`, come le schede della Partita): un tocco porta alla sezione e
// l'indirizzo prende `#sezione` (come già `#nascosti`), un indirizzo con `#sezione` apre la pagina lì. Da 768 px la fila resta ferma in
// cima mentre la pagina scorre e accende la sezione in cui ti trovi; sul telefono sta in testa e scorre con la pagina (c'è già la barra
// in basso). L'indice elenca solo le sezioni davvero presenti nella pagina: la pagina dà le candidate, nell'ordine, e qui si tengono
// quelle che ci sono (nel rilascio mancano quelle della preparazione; una sezione che si mostra solo a volte, come «Edizione di
// rilascio», entra quando compare). Le chip sono collegamenti: `aria-current="location"` dice ai lettori di schermo quale è la corrente.
// ============================================================

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilaScorrevole } from '../shared/FilaScorrevole';
import { comportamentoScorrimento } from '../../utils/movimento';

/** Una sezione candidata: l'id della sua radice nella pagina e il nome nell'indice. */
export interface SezioneIndice { id: string; nome: string }

/** Le sezioni che scorrono da sé con il loro `#` (aspettano i dati che le spostano): qui non si scorre una seconda volta. */
const CON_SCORRIMENTO_PROPRIO = new Set(['nascosti']);
/** Quanto sotto il bordo dell'area che scorre una sezione conta come «quella in cui ti trovi» (la fila ferma è alta circa 56 px). */
const SOGLIA_PX = 96;

/** L'area che scorre della pagina (il `<main>` del layout). */
const scorritore = (): HTMLElement | null => document.getElementById('contenuto');

/** L'indice delle sezioni di `contenitore` (il contenitore della pagina, di cui le sezioni sono figlie). */
export function IndiceSezioni({ sezioni, contenitore }: { sezioni: readonly SezioneIndice[]; contenitore: RefObject<HTMLElement | null> }) {
  const { hash, search } = useLocation();
  const naviga = useNavigate();
  const nav = useRef<HTMLElement>(null);
  const [presenti, setPresenti] = useState<string[]>([]);
  /** La sezione accesa dallo scorrimento o da un tocco, con il `#` dell'indirizzo di quel momento: un `#` cambiato dopo (un collegamento
   *  a un'altra sezione della stessa pagina) vale di più, finché non si scorre di nuovo. */
  const [attiva, setAttiva] = useState<{ id: string; hash: string } | null>(null);
  /** Il `#` corrente, per lo scorrimento (che lo legge fuori dal disegno). */
  const hashCorrente = useRef(hash);
  useEffect(() => { hashCorrente.current = hash; }, [hash]);
  /** Vero dopo un tocco su una chip (o un indirizzo con `#`): la sezione scelta resta accesa finché non si scorre da sé. */
  const scelta = useRef(false);
  /** La sezione scelta (col tocco o con il `#`), per controllare, a scorrimento fermo, che la pagina sia ancora lì. */
  const sceltaId = useRef<string | null>(null);
  /** La sezione dell'ultimo tocco: il cambio di `#` che il tocco stesso fa non la riscorre (lo scorrimento animato è già partito). */
  const toccata = useRef<string | null>(null);
  const firma = sezioni.map((s) => s.id).join('|');

  // le sezioni presenti, rilette quando la pagina aggiunge o toglie una sua sezione (quelle che arrivano dopo, o che si mostrano a volte);
  // la prima lettura al fotogramma dopo, quando la pagina è disegnata
  useEffect(() => {
    const radice = contenitore.current;
    if (!radice) return;
    const ids = firma.split('|');
    const leggi = () => {
      const ci = ids.filter((id) => { const el = document.getElementById(id); return !!el && radice.contains(el); });
      setPresenti((prima) => (prima.join('|') === ci.join('|') ? prima : ci));
    };
    const primo = requestAnimationFrame(leggi);
    const osservatore = typeof MutationObserver === 'undefined' ? null : new MutationObserver(leggi);
    osservatore?.observe(radice, { childList: true });
    return () => { cancelAnimationFrame(primo); osservatore?.disconnect(); };
  }, [contenitore, firma]);

  // la sezione in cui ti trovi: l'ultima che comincia sopra la soglia; in fondo alla pagina, l'ultima
  useEffect(() => {
    const area = scorritore();
    if (!area || presenti.length === 0) return;
    let fotogramma = 0;
    const calcola = () => {
      fotogramma = 0;
      if (scelta.current) return;
      const alto = area.getBoundingClientRect().top + SOGLIA_PX;
      let corrente = presenti[0];
      for (const id of presenti) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= alto) corrente = id;
      }
      if (area.scrollTop > 0 && area.scrollTop + area.clientHeight >= area.scrollHeight - 2) corrente = presenti[presenti.length - 1];
      setAttiva((prima) => (prima?.id === corrente && prima.hash === hashCorrente.current ? prima : { id: corrente, hash: hashCorrente.current }));
    };
    // A scorrimento fermo la sezione scelta resta accesa solo se la pagina è ancora lì (in cima, sotto la fila, o più in basso quando la
    // pagina è finita e non può salire oltre). Altrimenti la pagina è stata spostata in un modo che i gesti qui sotto non vedono (la barra
    // di scorrimento trascinata, un salto in cima) e si torna alla sezione in cui ti trovi: prima restava accesa quella dell'indirizzo
    // anche con la pagina in cima.
    const verifica = () => {
      const id = sceltaId.current;
      if (!scelta.current || !id) return;
      const el = document.getElementById(id);
      const alto = el ? el.getBoundingClientRect().top - area.getBoundingClientRect().top : Infinity;
      const inFondo = area.scrollTop + area.clientHeight >= area.scrollHeight - 2;
      if ((alto >= -8 && alto <= SOGLIA_PX) || (inFondo && alto > 0)) return;
      scelta.current = false;
      calcola();
    };
    let fermo = 0;
    const alloScorrimento = () => {
      if (!fotogramma) fotogramma = requestAnimationFrame(calcola);
      window.clearTimeout(fermo);
      fermo = window.setTimeout(verifica, 200);
    };
    // lo scorrimento fatto da te (rotella, dito, tastiera) libera la sezione scelta con un tocco
    const daTe = () => { scelta.current = false; };
    alloScorrimento();
    // dopo i secondi in cui un `#` riporta la pagina alla sezione mentre il resto si carica, un controllo anche senza scorrimento
    const iniziale = window.setTimeout(verifica, 4500);
    area.addEventListener('scroll', alloScorrimento, { passive: true });
    const eventi = ['wheel', 'touchstart', 'keydown'] as const;
    for (const e of eventi) area.addEventListener(e, daTe, { passive: true });
    return () => {
      area.removeEventListener('scroll', alloScorrimento);
      for (const e of eventi) area.removeEventListener(e, daTe);
      if (fotogramma) cancelAnimationFrame(fotogramma);
      window.clearTimeout(fermo);
      window.clearTimeout(iniziale);
    };
  }, [presenti]);

  // un indirizzo con `#sezione` apre la pagina lì; le sezioni sopra si caricano dopo e la spostano: finché non scorri da te o non passano
  // alcuni secondi, a ogni cambio d'altezza della pagina si torna alla sezione (come fa già «Nascosti dalla guida»)
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  const conSezione = presenti.includes(id);
  useEffect(() => {
    if (!conSezione) return;
    scelta.current = true;
    sceltaId.current = id;
    if (toccata.current === id) { toccata.current = null; return; }
    if (CON_SCORRIMENTO_PROPRIO.has(id)) return;
    const el = document.getElementById(id);
    const radice = contenitore.current;
    if (!el || !radice) return;
    const vai = () => el.scrollIntoView?.({ block: 'start' });
    vai();
    let vivo = true;
    const basta = () => { vivo = false; osservatore?.disconnect(); };
    const osservatore = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (vivo) vai(); }) : null;
    osservatore?.observe(radice);
    const fine = window.setTimeout(basta, 4000);
    const eventi = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const e of eventi) window.addEventListener(e, basta, { passive: true, once: true });
    return () => { window.clearTimeout(fine); basta(); for (const e of eventi) window.removeEventListener(e, basta); };
    // si riparte solo quando cambia la sezione chiesta (o compare): non a ogni sezione che arriva dopo
  }, [id, conSezione, contenitore]);

  // la chip accesa resta in vista nella fila: si scorre la fila di lato, mai la pagina (la fila, al telefono, può essere fuori schermo)
  const voci = sezioni.filter((s) => presenti.includes(s.id));
  // la sezione accesa: quella in cui ti trovi, o quella chiesta dall'indirizzo finché non si scorre, o la prima
  const accesa = attiva && attiva.hash === hash ? attiva.id : conSezione ? id : attiva?.id ?? voci[0]?.id ?? null;
  useEffect(() => {
    const fila = nav.current?.querySelector<HTMLElement>('.fila-scorrevole');
    const chip = accesa ? fila?.querySelector<HTMLElement>(`[data-sezione="${CSS.escape(accesa)}"]`) : null;
    if (!fila || !chip || typeof fila.scrollTo !== 'function') return;
    const f = fila.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    if (c.width === 0 || (c.left >= f.left + 44 && c.right <= f.right - 52)) return;
    fila.scrollTo({ left: fila.scrollLeft + (c.left - f.left) - (f.width - c.width) / 2, behavior: comportamentoScorrimento() });
  }, [accesa]);

  if (voci.length < 2) return null;
  /** Porta alla sezione: la scorre in cima (sotto la fila ferma) e mette `#sezione` nell'indirizzo, senza una voce in più nella cronologia. */
  const vai = (s: SezioneIndice) => {
    scelta.current = true;
    sceltaId.current = s.id;
    toccata.current = s.id === id ? null : s.id;
    setAttiva({ id: s.id, hash: `#${s.id}` });
    document.getElementById(s.id)?.scrollIntoView({ block: 'start', behavior: comportamentoScorrimento() });
    naviga({ search, hash: s.id }, { replace: true, preventScrollReset: true });
  };
  return (
    <nav ref={nav} className="indice-sezioni" aria-label="Sezioni delle impostazioni">
      <FilaScorrevole className="fila-scorrevole--sempre items-center">
        {voci.map((s) => {
          const qui = s.id === accesa;
          return (
            <a key={s.id} href={`#${s.id}`} data-sezione={s.id} aria-current={qui ? 'location' : undefined}
              className={`chip touch no-underline ${qui ? 'chip--attivo' : ''}`}
              onClick={(e) => { if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); vai(s); }}>
              {s.nome}
            </a>
          );
        })}
      </FilaScorrevole>
    </nav>
  );
}
