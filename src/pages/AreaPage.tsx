// ============================================================
// AreaPage — la pagina di un'Area del mondo: /guida/citta/<quartiere>/<area> (L2, 2026-10-20)
// ============================================================
//
// Un'Area (Central Street, il Sottopasso, il Covo…) è un posto **con la sua pagina**: prima le sue planimetrie stavano nel visore
// dell'atlante, raggiunte per strade diverse, e il selettore «Aree» del pannello cambiava posto invece di versione. Qui:
//   - la testata compatta con le briciole «La città › Shibuya › Sottopasso» (R2-17) e le azioni dell'Area;
//   - le versioni (solo se più d'una) come segmenti sopra il visore: sceglierne una cambia solo `?planimetria=` (R2-14);
//   - il visore della planimetria scelta, a piena risoluzione, nel suo spazio; da 1024 px riempie l'altezza utile, così a
//     1366×657 testata, versioni e visore stanno in una schermata (R2-41);
//   - nel pannello del visore «Luoghi qui» e «Aree vicine», con il nome dei posti (mai «Mappa»).
// Lo staff, che nessuna fonte colloca, è un'Area della città: stessa pagina con contenitore Tokyo (`/guida/citta/tokyo/<slug>`).
// ============================================================

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { eliminaAreaMondo, getArea, isApiError, ripristinaAreaMondo } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { Modal } from '../components/shared/Modal';
import { IconChevronLeft } from '../components/shared/icons';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { VersioniArea } from '../components/mappe/VersioniArea';
import { nomeVersione } from '../utils/aree';
import { FinestraAggiungiPlanimetria } from '../components/mappe/FinestraAggiungiPlanimetria';
import { FinestraModificaArea } from '../components/mappe/FinestraModificaArea';
import { FinestraAggiungiLuogo } from '../components/mappe/FinestraAggiungiLuogo';
import { centroAccessoMondo } from '../utils/accessoMondo';
import { urlLuogo } from '../utils/citta';
import { COVO_AREA, PAGINA_COVO } from '../utils/covo';
import { NEL_CESTINO } from '../utils/cestino';
import type { AreaDettaglioDto, ElementoAreaDto } from '../types';

/** Il suggerimento del collegamento alle sfide del Covo, in testata o in fondo alla fila delle versioni. */
const TITOLO_COVO = 'Nel gioco il Covo si apre dal menu, dal 6/5';

/** La pagina della guida di un elemento segnato sull'Area, quando il server non dice la sua `casa`: il luogo nella sua pagina (L5), il
 *  negozio nella sua scheda (che rimanda alla sua sede), l'attività nell'elenco delle attività, il Confidente nella sua pagina. */
function schedaElemento(e: ElementoAreaDto): string {
  switch (e.tipo) {
    case 'luogo': return urlLuogo(e.chiave);
    case 'negozio': return `/guida/negozi/${encodeURIComponent(e.chiave)}`;
    case 'attivita': return '/guida/attivita';
    case 'confidente': return `/confidenti/${encodeURIComponent(e.chiave)}`;
  }
}

/** La pagina: carica l'Area e mostra testata, versioni, visore e pannello; senza Area, «Area non trovata» col ritorno al quartiere. */
export function AreaPage() {
  const { chiave: contenitore = '', area: slug = '' } = useParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(() => getArea(contenitore, slug, attiva?.id), [contenitore, slug, attiva?.id]);
  const a = dati.dati;
  const nomeContenitore = a?.contenitore.tipo === 'citta' ? 'La città' : a?.contenitore.nome;
  // il titolo della scheda del browser dice il posto e dove sta (L2, M8): «Central Street — Shibuya»
  useDocumentTitle(a ? `${a.nome} — ${a.contenitore.tipo === 'citta' ? 'Tokyo' : a.contenitore.nome}` : 'Area');
  const indirizzoContenitore = contenitore === 'tokyo' ? '/guida/citta' : `/guida/citta/${encodeURIComponent(contenitore)}`;
  if (dati.errore && !a) return <AreaNonTrovata errore={dati.errore} indietro={indirizzoContenitore} onRiprova={() => void dati.ricarica()} />;
  return (
    <PageState isLoading={dati.caricamento && !a} error={null} onRetry={() => void dati.ricarica()}>
      {a && <Contenuto area={a} indirizzoContenitore={indirizzoContenitore} nomeContenitore={nomeContenitore ?? ''} ricarica={dati.ricarica} />}
    </PageState>
  );
}

/** L'Area che non c'è (slug o quartiere sbagliati, o eliminata): il messaggio e il ritorno al contenitore. */
function AreaNonTrovata({ errore, indietro, onRiprova }: { errore: string; indietro: string; onRiprova: () => void }) {
  return (
    <div className="card flex flex-col gap-2" role="alert">
      <h1 className="titolo-display m-0">Area non trovata</h1>
      <p className="m-0 text-[13px] text-text-secondary">{errore}</p>
      <span className="flex flex-wrap gap-2">
        <Link className="btn btn-secondary touch" to={indietro}>Torna indietro</Link>
        <button type="button" className="btn btn-ghost touch" onClick={onRiprova}>Riprova</button>
      </span>
    </div>
  );
}

/** Il corpo della pagina di un'Area caricata. */
function Contenuto({ area: a, indirizzoContenitore, nomeContenitore, ricarica }: { area: AreaDettaglioDto; indirizzoContenitore: string; nomeContenitore: string; ricarica: () => Promise<void> }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [finestra, setFinestra] = useState<'modifica' | 'aggiungi' | 'elimina' | 'ripristina' | null>(null);
  // L5 (F5): «Aggiungi luogo» (null = luogo da scegliere) e «Posiziona» di un luogo senza pin, nelle aree di un quartiere
  const [aggiungiLuogo, setAggiungiLuogo] = useState<{ luogo: { chiave: string; nome: string } | null } | null>(null);
  const conLuoghi = a.contenitore.tipo === 'quartiere';
  const [riepilogoElimina, setRiepilogoElimina] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  // «Luoghi qui» e «Aree vicine» (§4.3, UX2-1): da 1280 px nel pannello del visore, aperto all'arrivo, a destra; da 768 a 1279 px nel
  // pannello chiuso, che ruberebbe la tela; sul telefono **sotto il visore, nella pagina**: dentro il visore il pannello stringeva la
  // tela a 240 px e scorreva dentro la pagina che scorre (LAY2-4). Se l'utente apre o chiude il pannello la scelta resta finché resta
  // sulla pagina, anche cambiando versione o pin (il visore si rimonta), senza salvarla.
  const [telefono] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 767.98px)').matches);
  const [pannello, setPannello] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 1280px)').matches);
  /** Il visore, per riportarlo in vista sul telefono quando si sceglie un luogo dall'elenco sotto. */
  const visore = useRef<HTMLDivElement | null>(null);
  // la versione mostrata: quella dell'indirizzo se è dell'Area, altrimenti la predefinita, altrimenti la prima
  const richiesta = params.get('planimetria');
  const scelta = a.planimetrie.find((p) => p.chiave === richiesta) ?? a.planimetrie.find((p) => p.chiave === a.predefinita) ?? a.planimetrie[0] ?? null;
  const indiceScelta = scelta ? a.planimetrie.indexOf(scelta) : -1;
  const spillo = Number(params.get('spillo')) || null;
  const punto = useMemo(() => centroAccessoMondo(params), [params]);
  const conPin = a.planimetrie.find((p) => p.numeroSpilli > 0 && p.chiave !== scelta?.chiave) ?? null;
  const elementiQui = a.elementi.filter((e) => e.planimetria === scelta?.chiave);
  const covo = a.chiave === COVO_AREA.chiave;
  /** L'Area ha la fila delle versioni (più di una planimetria). */
  const conFila = a.planimetrie.length > 1;

  /** Cambia la versione mostrata nell'indirizzo, sostituendo la voce della cronologia: è la stessa pagina, la stessa Area. */
  const scegli = (chiave: string) => {
    const q = new URLSearchParams(params);
    if (chiave === a.predefinita) q.delete('planimetria'); else q.set('planimetria', chiave);
    for (const k of ['spillo', 'x', 'y', 'zoom']) q.delete(k);
    setParams(q, { replace: true });
  };
  /** Il pin chiesto dall'elenco «Luoghi qui»: un comando di chi guarda, che mostra il pin anche se adesso non è disponibile (UX2-2). */
  const [pinChiesto, setPinChiesto] = useState<number | null>(null);
  // L5 (F3): «Mostra anche i non ancora disponibili» è uno solo per il visore e per «Luoghi qui» (i luoghi chiusi spariscono da tutti e due)
  const [nonDisponibili, setNonDisponibili] = useState(false);
  const interruttore = useMemo(() => ({ valore: nonDisponibili, onCambia: setNonDisponibili }), [nonDisponibili]);
  /** Seleziona un pin nel visore (dall'elenco «Luoghi qui»): lo spillo va nell'indirizzo e il visore lo centra. */
  const selezionaPin = (id: number) => {
    setPinChiesto(id); const q = new URLSearchParams(params); q.set('spillo', String(id)); setParams(q, { replace: true });
    // sul telefono l'elenco sta sotto il visore: il pin si vede solo tornando su
    if (telefono) visore.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  // «Elimina» nella finestra è la conferma (R2-26, UX2-8): la finestra dice già che cosa si porta via, quindi la richiesta parte con
  // `conferma`. Prima partiva senza, il server rispondeva 409 col riepilogo e serviva un secondo «Elimina tutto»: sembrava non eliminare.
  const elimina = async () => {
    setOccupato(true);
    try {
      await eliminaAreaMondo(a.contenitore.chiave, a.slug, true);
      notifica('success', `${a.nome} è nel cestino: da Impostazioni → Cestino la rimetti com’era.`);
      navigate(indirizzoContenitore, { replace: true });
    } catch (err) {
      // il riepilogo del server resta come avviso, se mai rispondesse ancora 409
      if (isApiError(err, 'area-con-contenuti')) setRiepilogoElimina(err.message);
      else notifica('error', err instanceof Error ? err.message : 'Area non eliminata.');
    } finally {
      setOccupato(false);
    }
  };
  /** Che cosa porta con sé l'eliminazione, dai dati dell'Area: versioni, pin, il passaggio sull'illustrazione, l'ingresso. */
  const contenutiArea = [
    a.planimetrie.length === 1 ? 'la sua planimetria' : `le sue ${a.planimetrie.length} planimetrie`,
    a.numeroSpilli === 0 ? null : a.numeroSpilli === 1 ? '1 pin' : `${a.numeroSpilli} pin`,
    a.passaggio ? `il passaggio sull’illustrazione di ${a.contenitore.nome}` : null,
    a.ingresso ? `l’ingresso di ${a.contenitore.nome}, che resterà da scegliere` : null,
  ].filter(Boolean).join(', ');
  const ripristina = async () => {
    setOccupato(true);
    try { await ripristinaAreaMondo(a.contenitore.chiave, a.slug); notifica('success', `${a.nome}: rimessi i valori della guida.`); await ricarica(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Valori non ripristinati.'); }
    finally { setOccupato(false); }
  };

  return (
    // Da 1024 px la pagina prende l'altezza dell'area di lettura e il visore il resto, come la pagina del Palazzo: una schermata.
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:gap-2">
      <header className="card flex shrink-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:py-2">
        {/* da 1024 px briciole e titolo stanno su una riga sola: la testata resta compatta e il visore ha l'altezza (R2-41) */}
        <div className="flex min-w-0 flex-col gap-1 lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3">
          <nav aria-label="Dove sei" className="flex flex-wrap items-center gap-1 text-[12px] text-text-muted">
            <Link to="/guida/citta" className="touch inline-flex items-center">La città</Link>
            {a.contenitore.tipo !== 'citta' && <><span aria-hidden>›</span><Link to={indirizzoContenitore} className="touch inline-flex items-center">{a.contenitore.nome}</Link></>}
            {/* da 1024 a 1279 px le briciole si fermano al contenitore: l'ultima tappa è il titolo subito accanto (variante (a) di Stesura) */}
            <span aria-hidden className="lg:max-xl:hidden">›</span><span className="text-text-secondary lg:max-xl:hidden">{a.nome}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {/* da 1024 px il ritorno al contenitore lo fa la briciola accanto */}
            <Link to={indirizzoContenitore} className="btn btn-ghost btn-sm touch -ml-2 lg:hidden"><IconChevronLeft size={16} /> {nomeContenitore}</Link>
            <h1 className="titolo-display m-0 break-words" aria-current="page">{a.nome}</h1>
            {/* da 1024 px la versione la dice il segmento premuto della fila, subito sotto (variante 2 di Stesura): qui il chip solo sotto */}
            {scelta && a.planimetrie.length > 1 && <span className="chip text-[11px] lg:hidden">Planimetria · {nomeVersione(scelta, indiceScelta)}</span>}
            {a.daVerificare && <span className="chip chip--attivo text-[11px]" title="Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla">Da verificare</span>}
            {/* il Covo: le sfide e le Medaglie P stanno nella pagina del Covo (meta della metro); qui un collegamento compatto nella
                testata, perché la carta a parte toglieva 53 px al visore (LAY2-1, decisione di Stesura). Da 1024 a 1279 px, se c'è la
                fila delle versioni, va in fondo alla fila (sotto): la testata resta su una riga senza accorciare il nome (§4.3) */}
            {covo && <Link to={PAGINA_COVO} className={`chip touch no-underline text-[12px] ${conFila ? 'lg:max-xl:hidden' : ''}`} title={TITOLO_COVO}>Sfide e Medaglie P del Covo</Link>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={<><span className="hidden md:max-lg:inline 2xl:inline">Modifica area</span><span className="md:max-lg:hidden lg:max-xl:hidden 2xl:hidden">Modifica</span></>} aria-label="Modifica area" onClick={() => setFinestra('modifica')} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo={<><span className="hidden md:max-lg:inline 2xl:inline">Aggiungi planimetria</span><span className="md:max-lg:hidden 2xl:hidden">Planimetria</span></>} aria-label="Aggiungi planimetria" onClick={() => setFinestra('aggiungi')} />
          {/* «Ripristina» ed «Elimina area» (variante accolta da Stesura, §4.3): visibili da 768 a 1023 px e da 1280 px, fantasma — mai primari — e sempre con
              la conferma; sotto i 768 px (UX2-3) e da 1024 a 1279 px (variante (b): la testata sta su una riga) stanno nel menu «Altro» */}
          <span className="hidden flex-wrap items-center gap-1.5 md:max-lg:flex xl:flex">
            {a.modificata && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo={<><span className="hidden md:max-lg:inline 2xl:inline">Ripristina i valori della guida</span><span className="md:max-lg:hidden 2xl:hidden">Ripristina</span></>} aria-label="Ripristina i valori della guida" disabled={occupato} onClick={() => setFinestra('ripristina')} />}
            <PulsanteVisivo tono="fantasma" compatto className="text-error" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={<><span className="hidden md:max-lg:inline 2xl:inline">Elimina area</span><span className="md:max-lg:hidden 2xl:hidden">Elimina</span></>} aria-label="Elimina area" onClick={() => { setRiepilogoElimina(null); setFinestra('elimina'); }} />
          </span>
          <details className="menu-altro relative md:max-lg:hidden xl:hidden">
            <summary className="btn btn-ghost btn-sm touch list-none" aria-label="Altre azioni dell’area">Altro ▾</summary>
            <div className="menu-altro__voci">
              {a.modificata && <button type="button" className="btn btn-ghost touch justify-start" disabled={occupato} onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); setFinestra('ripristina'); }}>Ripristina i valori della guida</button>}
              <button type="button" className="btn btn-ghost touch justify-start text-error" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); setRiepilogoElimina(null); setFinestra('elimina'); }}>Elimina area</button>
            </div>
          </details>
        </div>
      </header>

      <div className="shrink-0"><VersioniArea nome={a.nome} planimetrie={a.planimetrie} scelta={scelta?.chiave ?? ''} onScegli={scegli}
        coda={covo ? <Link to={PAGINA_COVO} className="chip touch no-underline hidden shrink-0 whitespace-nowrap text-[12px] lg:max-xl:inline-flex" title={TITOLO_COVO}>Sfide e Medaglie P del Covo</Link> : undefined} /></div>

      {scelta && scelta.numeroSpilli === 0 && conPin && <p className="m-0 flex shrink-0 flex-wrap items-center gap-2 text-[13px] text-text-secondary" role="status">
        Su questa planimetria non ci sono pin: quelli dell’area stanno su «{nomeVersione(conPin, a.planimetrie.indexOf(conPin))}».
        <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => scegli(conPin.chiave)}>Passa a «{nomeVersione(conPin, a.planimetrie.indexOf(conPin))}»</button>
      </p>}

      {/* il punto a cui tornare sul telefono (sopra il visore): alto zero, il margine negativo annulla lo spazio fra i blocchi */}
      <div ref={visore} aria-hidden className="-mt-3 scroll-mt-16 md:hidden" />
      {scelta
        ? <MappaIncorporata key={scelta.chiave} chiave={scelta.chiave} nome={a.nome} spilloIniziale={spillo} rivelaSpilloIniziale={spillo !== null && spillo === pinChiesto} puntoIniziale={punto}
            // il pannello aperto («Luoghi qui» a portata di tocco, UX2-1), il nome dell'area come titolo e niente «Su: …» né briciole
            // doppie: la testata della pagina li ha già (UX2-4, UX2-5)
            pannelloIniziale={pannello} onPannello={setPannello} titoloVisore={a.nome} senzaVicine nonDisponibili={interruttore}
            classeVisore="h-[min(64dvh,560px)] lg:h-auto lg:min-h-[420px] lg:flex-1" className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
            contenutiPannello={telefono ? undefined : <PannelloArea area={a} elementi={elementiQui} onSeleziona={selezionaPin} nonDisponibili={interruttore} pinChiesto={spillo} onAggiungiLuogo={conLuoghi ? (l) => setAggiungiLuogo({ luogo: l }) : undefined} />} />
        : <p className="card m-0 text-[13px] text-text-secondary">{a.nome} non ha più planimetrie: aggiungine una.</p>}
      {scelta && telefono && <div className="card"><PannelloArea area={a} elementi={elementiQui} onSeleziona={selezionaPin} nonDisponibili={interruttore} pinChiesto={spillo} onAggiungiLuogo={conLuoghi ? (l) => setAggiungiLuogo({ luogo: l }) : undefined} /></div>}
      {aggiungiLuogo && scelta && (
        <FinestraAggiungiLuogo quartiere={a.contenitore.chiave} luogo={aggiungiLuogo.luogo} onChiudi={() => setAggiungiLuogo(null)} onFatto={() => void ricarica()}
          // la versione mostrata per prima, poi le altre dell'area
          planimetrie={[scelta, ...a.planimetrie.filter((p) => p.chiave !== scelta.chiave)]} />
      )}

      {finestra === 'modifica' && <FinestraModificaArea area={a} aperta onChiudi={() => setFinestra(null)} onSalvata={ricarica} />}
      <FinestraAggiungiPlanimetria area={a} aperta={finestra === 'aggiungi'} onChiudi={() => setFinestra(null)}
        onAggiunta={(_nuova, chiave) => { void ricarica(); if (chiave) scegli(chiave); }} />
      <Modal titolo={`Rimettere i valori della guida in ${a.nome}?`} aperta={finestra === 'ripristina'} onChiudi={() => setFinestra(null)}
        azioni={<>
          <button type="button" className="btn btn-secondary touch" onClick={() => setFinestra(null)}>Annulla</button>
          <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => { setFinestra(null); void ripristina(); }}>Ripristina</button>
        </>}>
        <p className="m-0 text-[14px]">Nome e planimetria predefinita tornano quelli della guida; le tue correzioni a quest’area si perdono.</p>
      </Modal>
      <Modal titolo={`Eliminare ${a.nome}?`} aperta={finestra === 'elimina'} onChiudi={() => setFinestra(null)}
        azioni={<>
          <button type="button" className="btn btn-secondary touch" onClick={() => setFinestra(null)}>Annulla</button>
          <button type="button" className="btn btn-danger touch" disabled={occupato} onClick={() => void elimina()}>Elimina</button>
        </>}>
        <div className="flex flex-col gap-2 text-[14px]">
          <p className="m-0">Si eliminano l’area, {contenutiArea} e i passaggi che portano qui da altre aree.</p>
          {riepilogoElimina && <p className="m-0 text-warning" role="alert">{riepilogoElimina}</p>}
          <p className="m-0 text-text-secondary">{NEL_CESTINO}</p>
        </div>
      </Modal>
    </div>
  );
}

/** Un luogo chiuso adesso o non ancora sbloccato (L5 §2): fuori dai menu, salvo «Mostra anche i non ancora disponibili» o se è il pin chiesto. */
const chiusoAdesso = (e: ElementoAreaDto) => !!e.presenza && (e.presenza.sbloccato === false || e.presenza.aperto === false);

/** Il pannello del visore: «Luoghi qui» (tocco = seleziona il pin, e il collegamento alla pagina del luogo), «Da posizionare» e «Aree vicine».
 *  L5 (F3): i luoghi chiusi adesso o non ancora sbloccati spariscono, come nel visore, con lo stesso interruttore; quelli solo per gli eventi
 *  di un Confidente non ci sono mai. */
function PannelloArea({ area, elementi, onSeleziona, nonDisponibili, pinChiesto, onAggiungiLuogo }: { area: AreaDettaglioDto; elementi: ElementoAreaDto[]; onSeleziona: (spillo: number) => void;
  nonDisponibili: { valore: boolean; onCambia: (v: boolean) => void }; pinChiesto: number | null;
  /** L5 (F5): «Aggiungi luogo» (null) e «Posiziona» di un luogo senza pin; assente fuori dai quartieri. */
  onAggiungiLuogo?: (luogo: { chiave: string; nome: string } | null) => void }) {
  const candidati = elementi.filter((e) => !e.soloEventi);
  const chiusi = candidati.filter(chiusoAdesso).length;
  const visibili = candidati.filter((e) => nonDisponibili.valore || !chiusoAdesso(e) || e.spillo === pinChiesto);
  const daPosizionare = area.daPosizionare ?? [];
  return (
    <div className="flex flex-col gap-3">
      <section className="visore-mappa__sezione" aria-label="Luoghi qui">
        <h3 className="visore-mappa__intestazione">Luoghi qui</h3>
        {candidati.length === 0
          ? <p className="m-0 text-[12px] text-text-muted">Nessun luogo segnato su questa planimetria.</p>
          : <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {visibili.map((e) => <li key={`${e.tipo}:${e.chiave}:${e.spillo}`} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className={`visore-mappa__azione-testo touch text-left ${chiusoAdesso(e) ? 'opacity-60' : ''}`} onClick={() => onSeleziona(e.spillo)} title={e.presenza?.testo}>{e.nome}</button>
                {/* L5: la pagina del luogo (per un negozio con sede, la sua sezione) */}
                <Link className="text-[12px] touch inline-flex items-center" to={e.casa ?? schedaElemento(e)} aria-label={`Scheda di ${e.nome}`}>Scheda</Link>
              </div>
              {(chiusoAdesso(e) || e.daRivedere) && <div className="flex flex-wrap gap-1">
                {chiusoAdesso(e) && <span className="chip chip--bloccata text-[11px]">{e.presenza?.sbloccato === false ? 'Non ancora nel mondo' : 'Chiuso adesso'}</span>}
                {e.daRivedere === 'negozio-altro-quartiere' && <span className="chip chip--oro text-[11px]" title="Il pin è agganciato a un negozio di un altro quartiere: si sistema dall'editor della planimetria">Da rivedere · negozio di un altro quartiere</span>}
              </div>}
            </li>)}
          </ul>}
        {chiusi > 0 && (
          <button type="button" className={`chip chip--icona touch self-start text-[11px] ${nonDisponibili.valore ? 'chip--attivo' : ''}`} aria-pressed={nonDisponibili.valore} onClick={() => nonDisponibili.onCambia(!nonDisponibili.valore)}>
            <IconaAzione chiave="bloccato" dimensione={14} />Mostra anche i non ancora disponibili ({chiusi})
          </button>
        )}
        {onAggiungiLuogo && <button type="button" className="btn btn-secondary btn-sm touch self-start" onClick={() => onAggiungiLuogo(null)}>Aggiungi luogo</button>}
      </section>
      {/* L5: i luoghi dell'area senza pin su una planimetria: la loro pagina, e «Posiziona» (il tocco sul punto della planimetria) */}
      {daPosizionare.length > 0 && <section className="visore-mappa__sezione" aria-label="Da posizionare">
        <h3 className="visore-mappa__intestazione">Da posizionare ({daPosizionare.length})</h3>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {daPosizionare.map((l) => <li key={l.chiave} className="flex items-center justify-between gap-2">
            <Link className="touch inline-flex items-center" to={l.casa ?? `/guida/citta/${encodeURIComponent(l.quartiere ?? '')}`}>{l.nome}</Link>
            {onAggiungiLuogo && <button type="button" className="visore-mappa__azione-testo touch text-[12px]" aria-label={`Posiziona ${l.nome}`} onClick={() => onAggiungiLuogo({ chiave: l.chiave, nome: l.nome })}>Posiziona</button>}
          </li>)}
        </ul>
      </section>}
      {area.vicine.length > 0 && <section className="visore-mappa__sezione" aria-label="Aree vicine">
        <h3 className="visore-mappa__intestazione">Aree vicine</h3>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {area.vicine.map((v) => <li key={v.casa}><Link className="touch inline-flex items-center" to={v.casa}>{v.nome}{v.quartiereNome && v.quartiereNome !== area.contenitore.nome ? <span className="ml-1 text-[11px] text-text-muted">· {v.quartiereNome}</span> : null}</Link></li>)}
        </ul>
      </section>}
    </div>
  );
}
