// ============================================================
// GuidaNelVisore — la guida della mappa da **usare** nel visore, l'unica (L3 RG-1, decisione dell'utente del 2026-10-20)
// ============================================================
//
// Una sola guida per tutti i visori, a schermo intero (`MappaPage`) e incorporati (`MappaIncorporata`), su ogni mappa che ha voci della
// guida (`VisoreMappa`): le planimetrie dei Palazzi e ogni mappa con un pin collegato a una voce. «Il visore doveva già essere unico»
// (2026-10-31): la vecchia lista testuale dei contenuti non si monta più. Le parti comuni con la scheda del Palazzo (`GuidaDellArea`) sono
// condivise: il salvataggio dello stato con le notifiche delle voci toccate (`salvaStatoVoce`), la conferma di «Riapri»
// (`useConfermaRiapertura`), i passi sotto il loro Enigma (`raggruppaPassi`), la descrittiva, il conteggio delle segnate e la voce segnata
// in vista (`voceDescrittiva`, `quanteSegnate`, `segnataInVista`; `quanteDaSegnare` è solo del visore), i dettagli (`DettagliPunto`), le Persona da catturare con la loro
// piastrella e la loro chiamata (`PersoneDelPalazzo`, `voceDaCatturare`, `catturaNelCompendio`); lo spostamento della finestra è quello delle
// modali (`useSpostamentoFinestra`).
//
// «nel visore devono esserci solo le funzioni di utilizzo e non quelle di modifica... quindi solo dei checkpoint per segnare come fatto
// il punto della guida... e tutti i dettagli informativi dentro la voce... riferimenti ai pin della mappa (il click su un pin deve
// evidenziare il punto)». Le voci sono quelle della planimetria, con la regola dell'utente (`GET /api/mappe/:chiave/guida`: con un pin
// su di lei, o senza pin e con lei come planimetria effettiva); una voce fatta sparisce, salvo «Anche le fatte».
// - ogni voce da segnare ha una casella: spuntata vale «Ottenuto», tolta vale «Riapri» (gli stessi stati della scheda del Palazzo e del
//   popup del pin, con la stessa conferma quando si riaprono anche altre voci o un Enigma risolto); le descrittive non ne hanno; i passi
//   degli Enigmi hanno la loro;
// - aperta, la voce mostra testo, dettagli e i suoi pin: un pin di questa planimetria si tocca e il visore lo seleziona e lo centra;
// - il tocco su un pin della mappa evidenzia le sue voci (e le porta in vista);
// - niente modifica: le voci si correggono nella scheda del Palazzo.
// Finestra fluttuante che si sposta dalla sua testata o con le frecce sulla maniglia ⠿ (da 768 px), foglio dal basso sotto i 768 px.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getGuidaMappa } from '../../services/api';
import { catturaNelCompendio, salvaStatoVoce } from '../../services/gestiGuida';
import { useCarica } from '../../hooks/useCarica';
import { useMedia } from '../../hooks/useMedia';
import { useSpostamentoFinestra } from '../../hooks/useSpostamentoFinestra';
import { notifica } from '../../stores/notificationStore';
import { NOME_TIPO, COLORE_TIPO } from '../../utils/dungeon';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import { raggruppaPassi } from '../../utils/passiEnigmi';
import { quanteDaSegnare, quanteSegnate, segnataInVista, voceDescrittiva } from '../../utils/vociDellaGuida';
import { DettagliPunto } from '../guida/DettagliPunto';
import { useConfermaRiapertura } from '../guida/ConfermaRiapertura';
import { PersoneDelPalazzo } from '../guida/PersoneDelPalazzo';
import { voceDaCatturare } from '../../utils/piastrelleCattura';
import { IconaAzione } from '../shared/IconaAzione';
import type { PuntoInteresseDto } from '../../types';
import { TitoloSezione } from '../shared/TitoloSezione';

/** Margine dai bordi dello schermo per la finestra. */
const MARGINE = 8;
/** L'altezza che la finestra si tiene comunque (testata e qualche voce): più in basso di così non si apre né si lascia. */
const ALTEZZA_UTILE = 320;

interface Props {
  /** La planimetria. */
  mappa: string;
  partitaId: number | null;
  /** Lo spillo selezionato sulla mappa: le sue voci si evidenziano. */
  spilloSelezionato: number | null;
  /** Gli spilli di questa planimetria: i riferimenti a loro si toccano, quelli di altre planimetrie si leggono. */
  spilliQui: ReadonlySet<number>;
  /** Seleziona e centra uno spillo della planimetria. */
  onCentra: (spilloId: number) => void;
  /** Uno stato salvato: chi ospita il visore rilegge la mappa (i pin seguono le voci). */
  onCambiato?: () => void;
  onChiudi: () => void;
  /** Dove si apre la finestra la prima volta: l'angolo in alto a destra della tela, in coordinate dello schermo. */
  ancora: { top: number; right: number } | null;
  /** Cambia quando gli stati della mappa cambiano altrove (popup, pagina): la guida si rilegge in silenzio. */
  versione: string;
}

/** La finestra (o il foglio) della guida della planimetria, da usare. */
export function GuidaNelVisore({ mappa, partitaId, spilloSelezionato, spilliQui, onCentra, onCambiato, onChiudi, ancora, versione }: Props) {
  const largo = useMedia('(min-width: 768px)');
  const guida = useCarica(() => getGuidaMappa(mappa, partitaId ?? undefined), [mappa, partitaId]);
  const [mostraFatte, setMostraFatte] = useState(false);
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);

  // gli stati cambiati altrove (il popup del pin, la scheda) si rileggono in silenzio, senza lo stato di caricamento
  const imposta = useRef(guida.imposta);
  useEffect(() => { imposta.current = guida.imposta; });
  const versioneVista = useRef(versione);
  useEffect(() => {
    if (versioneVista.current === versione) return;
    versioneVista.current = versione;
    getGuidaMappa(mappa, partitaId ?? undefined).then((g) => imposta.current(g)).catch(() => { /* resta quella di prima */ });
  }, [versione, mappa, partitaId]);

  // il posto della finestra (da 768 px): all'apertura in alto a destra della tela, ancorata al bordo destro dello schermo (così un
  // ridimensionamento non la lascia fuori), abbastanza in alto da lasciare spazio a qualche voce (ALTEZZA_UTILE) anche se la tela sta in
  // basso; da lì si sposta col gesto di tutte le finestre spostabili (`useSpostamentoFinestra`: barra trascinata o frecce sulla maniglia ⠿,
  // sempre per intero nello schermo)
  const [posto] = useState<{ destra: number; alto: number }>(() => {
    const w = typeof document === 'undefined' ? 1280 : document.documentElement.clientWidth;
    const h = typeof window === 'undefined' ? 800 : window.innerHeight;
    return { destra: Math.max(MARGINE, w - (ancora?.right ?? w) + MARGINE), alto: Math.max(MARGINE, Math.min((ancora?.top ?? 80) + MARGINE, h - ALTEZZA_UTILE - MARGINE)) };
  });
  const finestra = useRef<HTMLElement | null>(null);
  const sposta = useSpostamentoFinestra(finestra, { attivo: largo, aperta: true });

  // le voci dello spillo selezionato vengono in vista
  const elenco = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (spilloSelezionato === null) return;
    const el = elenco.current?.querySelector<HTMLElement>(`[data-pin-evidenziato="sì"]`);
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [spilloSelezionato, guida.dati]);

  const infiltrazioni = guida.dati?.infiltrazioni ?? [];
  // L8 (R8-12, R8-29), come nella scheda del Palazzo: le voci Persona con la loro Persona e la loro Ombra non sono righe da segnare ma
  // piastrelle di cattura (`PersoneDelPalazzo`), in cima alla loro infiltrazione; conteggi, «Anche le fatte» e conferme lavorano sulle altre
  const gruppi = infiltrazioni.map((i) => ({ ...i, persone: i.voci.filter(voceDaCatturare), voci: i.voci.filter((p) => !voceDaCatturare(p)) }));
  const tutte = gruppi.flatMap((i) => i.voci);
  const conPersone = gruppi.some((i) => i.persone.length > 0);
  // le regole comuni con la scheda del Palazzo (`utils/vociDellaGuida.ts`): la descrittiva (`voceDescrittiva`: un «Altro» permanente o
  // rigenerabile ha la casella come le altre voci, 2026-10-31), i conteggi e la voce segnata in vista
  const evidenziata = (p: PuntoInteresseDto) => spilloSelezionato !== null && p.pin.some((x) => x.id === spilloSelezionato);
  /** Una voce si vede se non è fatta (o con «Anche le fatte»), se è quella aperta o se è dello spillo selezionato. */
  const visibile = (p: PuntoInteresseDto) => segnataInVista(p, { anche: mostraFatte, aperta, evidenziata: evidenziata(p) });
  const fatte = quanteSegnate(tutte);
  const daFare = quanteDaSegnare(tutte);

  /** Salva lo stato della voce nella partita (null = riapri) col salvataggio della scheda del Palazzo (`salvaStatoVoce`: le altre voci
   *  toccate si dicono a parole), poi rilegge la guida e la mappa. */
  const salva = async (p: PuntoInteresseDto, stato: 'ottenuto' | null) => {
    if (!partitaId) return;
    setOccupato(true);
    try {
      await salvaStatoVoce(partitaId, p.chiave, stato, infiltrazioni, stato ? `«${p.nome}» segnato come ottenuto.` : `«${p.nome}» riaperto.`);
      guida.imposta(await getGuidaMappa(mappa, partitaId));
      onCambiato?.();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  // «Riapri» con la conferma della scheda del Palazzo quando si riaprono anche altre voci o un Enigma risolto (`useConfermaRiapertura`)
  const riapertura = useConfermaRiapertura((v) => void salva(v, null));
  /** La cattura di una Persona (o il suo annullo) con la chiamata della scheda del Palazzo (`catturaNelCompendio`); poi si rileggono la guida,
   *  che ne ricava le catturate, e la mappa. */
  const cattura = async (personaId: number, catturata: boolean, ombra?: string): Promise<void> => {
    if (!partitaId) return;
    try {
      await catturaNelCompendio(partitaId, personaId, catturata, ombra);
      guida.imposta(await getGuidaMappa(mappa, partitaId));
      onCambiato?.();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Compendio non aggiornato.'); }
  };
  /** La casella: spuntata segna «Ottenuto»; tolta riapre, chiedendo prima se si riaprono anche altre voci o un Enigma risolto (come la scheda). */
  const casella = (p: PuntoInteresseDto, spuntata: boolean) => {
    if (spuntata) { void salva(p, 'ottenuto'); return; }
    riapertura.chiedi(p, infiltrazioni, tutte);
  };

  /** Una voce: casella (se si segna), nome con tipo e stato; aperta, testo, dettagli e pin. I passi di un Enigma stanno sotto di lui. */
  const voce = (p: PuntoInteresseDto, passi: PuntoInteresseDto[]) => {
    const apri = p.chiave === aperta;
    const ev = evidenziata(p);
    return (
      <li key={p.chiave} data-pin-evidenziato={ev ? 'sì' : undefined} className={`flex flex-col gap-1 rounded-md px-1 py-1 ${ev ? 'bg-primary-bg outline outline-1 outline-primary' : ''}`}>
        <div className="flex items-start gap-1">
          {voceDescrittiva(p)
            ? <span className="touch flex w-11 shrink-0 items-center justify-center" aria-hidden="true"><span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} /></span>
            : <label className="touch flex w-11 shrink-0 cursor-pointer items-center justify-center">
              <input type="checkbox" className="h-5 w-5" checked={!!p.stato} disabled={!partitaId || occupato} onChange={(e) => casella(p, e.target.checked)}
                aria-label={p.stato ? `${p.nome}: fatto, togli il segno per riaprire` : `${p.nome}: segna come fatto`} />
            </label>}
          <button type="button" className={`touch min-w-0 flex-1 text-left testo-13 ${p.stato ? 'opacity-60' : ''}`} aria-expanded={apri} onClick={() => setAperta(apri ? null : p.chiave)}>
            <span className="font-semibold">{p.nome}</span>
            <span className="testo-12 text-text-muted"> · {NOME_TIPO[p.tipo]}{p.stato ? ` · ${p.stato}` : ''}</span>
          </button>
        </div>
        {apri && (
          <div className="flex flex-col gap-1.5 pb-1 pl-12 testo-12">
            {p.descrizione && <p className="m-0 whitespace-pre-wrap text-text-secondary">{p.descrizione}</p>}
            <DettagliPunto d={p.dettagli} contenuto={p.contenuto} senzaAffinita={p.tipo === 'persona' && !!p.persona} />
            {voceDescrittiva(p) && <p className="m-0 testo-12 text-text-muted">Voce descrittiva: si legge, non si segna.</p>}
            {p.pin.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Pin di ${p.nome}`}>
                {p.pin.map((x) => (
                  <li key={x.id}>
                    {spilliQui.has(x.id)
                      ? <button type="button" className={`chip chip--icona touch testo-12 ${x.id === spilloSelezionato ? 'chip--attivo' : ''}`} aria-label={`Mostra sulla mappa: ${x.nome}`} onClick={() => onCentra(x.id)}>
                        <IconaAzione chiave="posizione" dimensione={14} />{x.nome}
                      </button>
                      : <span className="inline-flex items-center gap-1 text-text-muted"><IconaAzione chiave="posizione" dimensione={14} />{x.nome} · {nomeSenzaPalazzo(x.mappaNome)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {passi.length > 0 && (
          <ul className="m-0 ml-5 flex list-none flex-col border-l-2 border-border-light p-0 pl-1" aria-label={`Passi di ${p.nome}`}>
            {passi.filter(visibile).map((x) => voce(x, []))}
          </ul>
        )}
      </li>
    );
  };

  const corpo = (
    <section ref={finestra} role="dialog" aria-label="Guida della planimetria"
      className={largo
        ? 'fixed z-[70] flex max-h-[min(70dvh,560px)] w-[340px] flex-col border border-primary bg-[rgb(11,11,14)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
        : 'fixed inset-x-2 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[70] flex max-h-[60dvh] flex-col border border-primary bg-[rgb(11,11,14)] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'}
      // l'altezza massima è quella che il posto lascia sotto di lei (mai meno di ALTEZZA_UTILE, mai più di 560 px o del 70% dello schermo):
      // spostata, la finestra resta per intero nello schermo (`useSpostamentoFinestra`)
      style={largo ? { right: posto.destra, top: posto.alto, maxHeight: `min(560px, 70dvh, max(${ALTEZZA_UTILE}px, calc(100dvh - ${posto.alto + MARGINE}px)))`, ...sposta.stile } : undefined}>
      <header className={`flex items-center gap-2 border-b border-border px-2 py-1 ${largo ? `touch-none select-none ${sposta.trascina ? 'cursor-grabbing' : 'cursor-move'}` : ''}`}
        onPointerDown={largo ? sposta.inizia : undefined} onPointerMove={largo ? sposta.muovi : undefined} onPointerUp={largo ? sposta.finisci : undefined} onPointerCancel={largo ? sposta.finisci : undefined}>
        {/* la maniglia ⠿, come nelle finestre: sposta con le frecce (l'alternativa al trascinamento per la tastiera) */}
        {largo && (
          <button type="button" data-maniglia className="touch -ml-1 flex w-11 shrink-0 items-center justify-center bg-transparent text-text-muted hover:text-text"
            aria-label="Sposta la guida (frecce)" title="Trascina la barra per spostare la guida, o usa le frecce" onKeyDown={sposta.frecce}>
            <span aria-hidden="true" className="testo-18 leading-none">⠿</span>
          </button>
        )}
        <TitoloSezione variante="display" className="min-w-0 flex-1 leading-tight">Guida <span className="testo-12 normal-case text-text-muted">· {daFare} da fare{fatte > 0 ? ` · ${fatte} fatte` : ''}</span></TitoloSezione>
        <button type="button" className="touch flex w-11 items-center justify-center bg-transparent text-text-muted" aria-label="Chiudi la guida" onClick={onChiudi}><IconaAzione chiave="chiudi" dimensione={20} /></button>
      </header>
      <div ref={elenco} className="area-scorrevole min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1.5">
        {guida.caricamento && !guida.dati && <p className="m-0 py-2 testo-12 text-text-muted">Carico la guida…</p>}
        {guida.errore && <p className="m-0 py-2 testo-12 text-error-testo" role="alert">{guida.errore}</p>}
        {guida.dati && tutte.length === 0 && !conPersone && <p className="m-0 py-2 testo-12 text-text-muted">Nessuna voce della guida su questa planimetria.</p>}
        {!partitaId && (tutte.length > 0 || conPersone) && <p className="m-0 pb-1 testo-12 text-text-muted">Attiva una partita per segnare quel che fai.</p>}
        {fatte > 0 && (
          <button type="button" className={`chip touch mb-1 testo-12 ${mostraFatte ? 'chip--attivo' : ''}`} aria-pressed={mostraFatte} onClick={() => setMostraFatte((v) => !v)}>Anche le fatte ({fatte})</button>
        )}
        {gruppi.map((i) => {
          // i passi sotto il loro Enigma, come nella scheda del Palazzo; un passo il cui Enigma non è su questa planimetria sta da sé
          const { inCima: radici, passiPer } = raggruppaPassi(i.voci);
          const inVista = radici.filter((p) => visibile(p) || (passiPer.get(p.chiave) ?? []).some(visibile));
          if (inVista.length === 0 && i.persone.length === 0) return null;
          // le catturate: le Persona registrate nel compendio della partita, che il server dà come voci «ottenute» (senza partita, nessuna)
          const catturate = partitaId ? new Set(i.persone.filter((p) => p.stato).map((p) => p.persona!.id)) : null;
          return (
            <section key={i.chiave} className="flex flex-col gap-0.5 pb-1.5" aria-label={`${i.ordine + 1}. ${i.nome}`}>
              {infiltrazioni.length > 1 && <h3 className="m-0 pt-1 testo-12 font-semibold uppercase tracking-wide text-text-muted">{i.ordine + 1}. {i.nome}</h3>}
              {i.persone.length > 0 && <PersoneDelPalazzo persone={i.persone} nomeArea={i.nome} partitaId={partitaId} catturate={catturate} onCattura={cattura} />}
              {inVista.length > 0 && <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">{inVista.map((p) => voce(p, passiPer.get(p.chiave) ?? []))}</ul>}
            </section>
          );
        })}
        {guida.dati && tutte.length > 0 && !mostraFatte && daFare === 0 && <p className="m-0 py-2 testo-12 text-text-muted">Tutto fatto su questa planimetria.</p>}
      </div>
      {riapertura.finestra}
    </section>
  );
  return createPortal(corpo, document.body);
}
