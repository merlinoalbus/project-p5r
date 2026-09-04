// ============================================================
// VisoreMappa — visore a schermo intero (o incorporato) di una mappa a livelli (Fase 13.2)
// ============================================================
//
// Zoom con minimo «adatta» (rotellina attorno al cursore, pulsanti, pinch), trascinamento, doppio click per adattare; spilli con icona per
// tipo a dimensione costante (scala inversa allo zoom) e raggruppamento «+n» vicino allo zoom minimo; legenda con filtri e conteggi, ricerca,
// scheda dello spillo con le azioni dell'entità collegata; navigazione fra i livelli (percorso, mappe figlie, passaggi). In uso normale nessun
// click sulla mappa modifica i dati: l'editor (13.3) passa i propri strumenti tramite `editor`.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MappaDto, SpilloDto } from '../../types';
import { DEFINIZIONI_SPILLO, NOME_TIPO_MAPPA, TIPI_SPILLO, type TipoSpillo } from '../../../shared/spilli';
import { useAsset } from '../../stores/assetStore';
import { IconaSpillo } from './IconaSpillo';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconMappa } from '../shared/iconeGuida';
import { AssetImg } from '../shared/AssetImg';
import { Modal } from '../shared/Modal';
import type { ImmagineSpilloDto } from '../../types';
import { formattaYen } from '../../utils/punti';
import { useSuggerimenti } from '../../stores/suggerimentiStore';

export type StatoPuntoMappa = 'ottenuto' | 'esaurito' | null;

export interface StrumentiEditor {
  strumento: 'seleziona' | 'aggiungi';
  selezionatoId: number | null;
  onSeleziona: (id: number | null) => void;
  /** Click sulla mappa con lo strumento «aggiungi»: coordinate in percentuale dell'immagine. */
  onClickMappa: (x: number, y: number) => void;
  /** Fine del trascinamento di uno spillo (strumento «seleziona»). */
  onSposta: (id: number, x: number, y: number) => void;
}

interface Props {
  mappa: MappaDto;
  partitaId: number | null;
  /** Apertura di un'altra mappa (percorso, figlie, passaggi). */
  onNaviga: (chiave: string) => void;
  /** Cambio dello stato «raccolto» di uno spillo collezionabile nella partita. */
  onRaccolto?: (spillo: SpilloDto, raccolto: boolean) => Promise<void> | void;
  /** Stato nella Guida di un punto di dungeon collegato allo spillo (ottenuto, esaurito, riaperto). */
  onStatoPunto?: (spillo: SpilloDto, stato: StatoPuntoMappa) => Promise<void> | void;
  /** Acquisto (o riapertura) di un articolo del negozio collegato allo spillo. */
  onAcquisto?: (spillo: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void> | void;
  onChiudi?: () => void;
  /** Testo del pulsante di chiusura (predefinito «Chiudi»; «Torna alla pagina» per lo schermo intero aperto da una pagina). */
  etichettaChiudi?: string;
  /** Altezza fissa dentro una pagina (home della Partita) invece dello schermo intero. */
  incorporato?: boolean;
  /** Azioni aggiuntive nella barra superiore (es. «Modifica mappa»). */
  azioni?: ReactNode;
  editor?: StrumentiEditor;
  /** Spillo da selezionare e centrare all'apertura (es. dall'azione della guida). */
  selezioneIniziale?: number | null;
  /** Contenuto del pannello laterale al posto di quello predefinito (editor). */
  pannello?: ReactNode;
  /** Elemento davanti al percorso nella barra (es. targhetta «Modifica»). */
  intestazione?: ReactNode;
  className?: string;
}

const FATTORE_ZOOM_MASSIMO = 8;
const PASSO_ROTELLA = 1.15;
const CELLA_RAGGRUPPAMENTO = 30;
const SOGLIA_RAGGRUPPAMENTO = 1.6;
const DIMENSIONE_RISERVA = 1000;

interface Dimensioni { w: number; h: number }
interface Punto { x: number; y: number }
type Gruppo = { chiave: string; x: number; y: number; spilli: SpilloDto[] };

const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Immagine dell'entità collegata (istanza → asset del repository); niente se l'entità non ha immagini nell'app. */
export function ImmagineRiferimento({ immagine, nome, dimensione = 56 }: { immagine: { url: string | null; asset: string | null } | null | undefined; nome: string; dimensione?: number }) {
  if (!immagine || (!immagine.url && !immagine.asset)) return null;
  const stile = { width: dimensione, height: dimensione };
  if (immagine.url) return <img src={immagine.url} alt={`Immagine: ${nome}`} className="object-cover border border-border shrink-0" style={stile} draggable={false} />;
  return <AssetImg nome={immagine.asset} alt={`Immagine: ${nome}`} className="object-cover border border-border shrink-0" style={stile} fallback={null} />;
}

/** Galleria delle schermate di riferimento dello spillo: miniature, ingrandimento in finestra. */
export function GalleriaSpillo({ immagini, nome, compatta }: { immagini: ImmagineSpilloDto[]; nome: string; compatta?: boolean }) {
  const [aperta, setAperta] = useState<ImmagineSpilloDto | null>(null);
  if (immagini.length === 0) return null;
  const d = compatta ? 48 : 72;
  return (
    <>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-1" aria-label={`Schermate di ${nome}`}>
        {immagini.map((i, n) => (
          <li key={i.id}>
            <button type="button" className="p-0 border border-border bg-bg-tertiary block" style={{ width: d, height: d }} onClick={() => setAperta(i)} title={i.didascalia || `Schermata ${n + 1}`} aria-label={`Ingrandisci: ${i.didascalia || `schermata ${n + 1}`}`}>
              {i.url ? <img src={i.url} alt="" className="w-full h-full object-cover" draggable={false} /> : <AssetImg nome={i.asset} alt="" decorativa className="w-full h-full object-cover" fallback={<span className="text-[10px] text-text-muted">asset</span>} />}
            </button>
          </li>
        ))}
      </ul>
      <Modal titolo={aperta?.didascalia || nome} aperta={aperta !== null} onChiudi={() => setAperta(null)} larga>
        {aperta && (aperta.url ? <img src={aperta.url} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" /> : <AssetImg nome={aperta.asset} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" fallback={<p className="m-0 text-[13px] text-text-muted">Asset «{aperta.asset}» non ancora presente nel repository.</p>} />)}
      </Modal>
    </>
  );
}

/** Etichetta leggibile della disponibilità di un articolo. */
function disponibilita(a: { disponibileDal: string | null }): string {
  return a.disponibileDal ? `dal ${a.disponibileDal}` : 'sempre';
}

export function VisoreMappa({ mappa, partitaId, onNaviga, onRaccolto, onStatoPunto, onAcquisto, onChiudi, etichettaChiudi, incorporato, azioni, editor, pannello, intestazione, className, selezioneIniziale }: Props) {
  const sugg = useSuggerimenti();
  const tela = useRef<HTMLDivElement | null>(null);
  const [dim, setDim] = useState<Dimensioni>({ w: 0, h: 0 });
  const [natCaricata, setNatCaricata] = useState<Dimensioni | null>(null);
  const [zoomEsplicito, setZoomEsplicito] = useState<number | null>(null);
  const [panEsplicito, setPanEsplicito] = useState<Punto | null>(null);
  const [tipiNascosti, setTipiNascosti] = useState<Set<TipoSpillo>>(new Set());
  const [mostraRaccolti, setMostraRaccolti] = useState(false);
  const [ricerca, setRicerca] = useState('');
  const [selezionatoUso, setSelezionatoUso] = useState<number | null>(selezioneIniziale ?? null);
  // Incorporato in una pagina lo spazio è poco: il pannello è chiuso finché l'utente non lo apre; a schermo intero è aperto.
  // Stato derivato (nessun effetto che sincronizza): `null` = comportamento predefinito del contesto.
  const [pannelloScelto, setPannelloScelto] = useState<boolean | null>(null);
  const pannelloAperto = pannelloScelto ?? !incorporato;
  const [occupato, setOccupato] = useState(false);
  const assetBase = useAsset(mappa.asset);
  const src = mappa.immagineUrl ?? assetBase ?? null;

  // Dimensioni naturali: dal DTO quando note, altrimenti dall'immagine caricata, altrimenti un quadrato di riserva.
  const nat: Dimensioni = natCaricata ?? (mappa.larghezza && mappa.altezza ? { w: mappa.larghezza, h: mappa.altezza } : { w: DIMENSIONE_RISERVA, h: DIMENSIONE_RISERVA });
  const zoomMin = dim.w > 0 && dim.h > 0 ? Math.min(dim.w / nat.w, dim.h / nat.h) : 1;
  const zoomMax = zoomMin * FATTORE_ZOOM_MASSIMO;
  const zoom = zoomEsplicito === null ? zoomMin : limita(zoomEsplicito, zoomMin, zoomMax);
  const pan: Punto = panEsplicito ?? { x: (dim.w - nat.w * zoom) / 2, y: (dim.h - nat.h * zoom) / 2 };
  const selezionatoId = editor ? editor.selezionatoId : selezionatoUso;
  const seleziona = useCallback((id: number | null) => { if (editor) editor.onSeleziona(id); else setSelezionatoUso(id); }, [editor]);

  // Misura dell'area visibile (ResizeObserver quando disponibile; altrimenti finestra).
  useEffect(() => {
    const el = tela.current;
    if (!el) return;
    const misura = () => { const r = el.getBoundingClientRect(); setDim((d) => (d.w === r.width && d.h === r.height ? d : { w: r.width, h: r.height })); };
    if (typeof ResizeObserver === 'undefined') {
      const id = requestAnimationFrame(misura);
      window.addEventListener('resize', misura);
      return () => { cancelAnimationFrame(id); window.removeEventListener('resize', misura); };
    }
    const oss = new ResizeObserver(misura);
    oss.observe(el);
    return () => oss.disconnect();
  }, []);

  // Rotellina non passiva (React registra `wheel` come passivo: `preventDefault` non avrebbe effetto).
  const stato = useRef({ zoom, pan, zoomMin, zoomMax });
  useEffect(() => { stato.current = { zoom, pan, zoomMin, zoomMax }; });
  const applicaZoom = useCallback((nuovo: number, cx: number, cy: number) => {
    const { zoom: z1, pan: p1, zoomMin: mn, zoomMax: mx } = stato.current;
    const z2 = limita(nuovo, mn, mx);
    const k = z2 / z1;
    setZoomEsplicito(z2);
    setPanEsplicito({ x: cx - (cx - p1.x) * k, y: cy - (cy - p1.y) * k });
  }, []);
  useEffect(() => {
    const el = tela.current;
    if (!el) return;
    const suRotella = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      applicaZoom(stato.current.zoom * (e.deltaY < 0 ? PASSO_ROTELLA : 1 / PASSO_ROTELLA), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', suRotella, { passive: false });
    return () => el.removeEventListener('wheel', suRotella);
  }, [applicaZoom]);

  const adatta = () => { setZoomEsplicito(null); setPanEsplicito(null); };
  // Selezione iniziale: centra lo spillo appena l'area è misurata (rinviato di un tick: nessuno stato impostato durante il render)
  useEffect(() => {
    if (!selezioneIniziale || dim.w === 0) return;
    const s = mappa.spilli.find((x) => x.id === selezioneIniziale);
    if (!s) return;
    const id = setTimeout(() => {
      const z = Math.max(stato.current.zoomMin * 2.5, stato.current.zoomMin);
      setSelezionatoUso(s.id);
      setZoomEsplicito(z);
      setPanEsplicito({ x: dim.w / 2 - (s.x / 100) * nat.w * z, y: dim.h / 2 - (s.y / 100) * nat.h * z });
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selezioneIniziale, dim.w, dim.h, nat.w, nat.h, mappa.chiave]);
  const zoomCentro = (fattore: number) => applicaZoom(zoom * fattore, dim.w / 2, dim.h / 2);
  const centraSu = (s: SpilloDto) => {
    const z = Math.max(zoom, zoomMin * 2.5);
    setZoomEsplicito(z);
    setPanEsplicito({ x: dim.w / 2 - (s.x / 100) * nat.w * z, y: dim.h / 2 - (s.y / 100) * nat.h * z });
  };

  // Coordinate in percentuale dell'immagine a partire da un punto dello schermo.
  const percentuali = (clientX: number, clientY: number): Punto | null => {
    const el = tela.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left - pan.x) / (nat.w * zoom)) * 100;
    const y = ((clientY - r.top - pan.y) / (nat.h * zoom)) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  // Puntatori: trascinamento, pinch, click sulla mappa (editor), trascinamento di uno spillo (editor).
  const puntatori = useRef(new Map<number, Punto>());
  const gesto = useRef<{ tipo: 'trascina'; x: number; y: number; px: number; py: number; mosso: boolean } | { tipo: 'pinch'; d0: number; z0: number; cx: number; cy: number; px: number; py: number } | { tipo: 'spillo'; id: number; mosso: boolean; x: number; y: number } | null>(null);
  const [trascinato, setTrascinato] = useState<{ id: number; x: number; y: number } | null>(null);
  const [trascinando, setTrascinando] = useState(false);

  const suPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (puntatori.current.size === 2) {
      const [a, b] = [...puntatori.current.values()];
      const r = e.currentTarget.getBoundingClientRect();
      gesto.current = { tipo: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: zoom, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, px: pan.x, py: pan.y };
    } else if (puntatori.current.size === 1 && !gesto.current) {
      gesto.current = { tipo: 'trascina', x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, mosso: false };
    }
  };
  const suPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (puntatori.current.has(e.pointerId)) puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinch' && puntatori.current.size >= 2) {
      const [a, b] = [...puntatori.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const z2 = limita(g.z0 * (d / Math.max(1, g.d0)), zoomMin, zoomMax);
      const k = z2 / g.z0;
      setZoomEsplicito(z2);
      setPanEsplicito({ x: g.cx - (g.cx - g.px) * k, y: g.cy - (g.cy - g.py) * k });
    } else if (g.tipo === 'trascina') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) + Math.abs(dy) > 4 && !g.mosso) { g.mosso = true; setTrascinando(true); }
      if (g.mosso) setPanEsplicito({ x: g.px + dx, y: g.py + dy });
    } else if (g.tipo === 'spillo') {
      if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 4) g.mosso = true;
      if (g.mosso) { const p = percentuali(e.clientX, e.clientY); if (p) setTrascinato({ id: g.id, x: p.x, y: p.y }); }
    }
  };
  const suPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    puntatori.current.delete(e.pointerId);
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === 'pinch') { if (puntatori.current.size < 2) gesto.current = null; return; }
    gesto.current = null;
    setTrascinando(false);
    if (g.tipo === 'spillo') {
      if (g.mosso && editor) { const p = percentuali(e.clientX, e.clientY); if (p) editor.onSposta(g.id, p.x, p.y); }
      setTrascinato(null);
      return;
    }
    if (!g.mosso) {
      if (editor?.strumento === 'aggiungi') { const p = percentuali(e.clientX, e.clientY); if (p) editor.onClickMappa(p.x, p.y); }
      else seleziona(null);
    }
  };
  const annullaGesto = () => { puntatori.current.clear(); gesto.current = null; setTrascinato(null); setTrascinando(false); };

  // Spilli visibili: filtri per tipo, raccolti nascosti, ricerca.
  const tipiPresenti = useMemo(() => TIPI_SPILLO.filter((t) => mappa.spilli.some((s) => s.tipo === t)), [mappa.spilli]);
  const raccoltiNascosti = useMemo(() => mappa.spilli.filter((s) => s.collezionabile && s.raccolto).length, [mappa.spilli]);
  const ricercaNorm = ricerca.trim().toLowerCase();
  const visibili = mappa.spilli.filter((s) => !tipiNascosti.has(s.tipo) && (mostraRaccolti || !(s.collezionabile && s.raccolto)) && (!ricercaNorm || s.nome.toLowerCase().includes(ricercaNorm)));
  const selezionato = mappa.spilli.find((s) => s.id === selezionatoId) ?? null;
  const collezionabili = mappa.spilli.filter((s) => s.collezionabile);
  const raccolti = collezionabili.filter((s) => s.raccolto).length;
  const percentualeRaccolti = collezionabili.length > 0 ? Math.round((raccolti / collezionabili.length) * 100) : 0;
  const mostraTutti = () => setTipiNascosti(new Set());
  const nascondiTutti = () => setTipiNascosti(new Set(tipiPresenti));

  // Raggruppamento vicino allo zoom minimo: gli spilli che cadono nella stessa cella dello schermo diventano un gruppo «+n».
  const raggruppa = zoom <= zoomMin * SOGLIA_RAGGRUPPAMENTO && !editor;
  const { singoli, gruppi } = (() => {
    if (!raggruppa) return { singoli: visibili, gruppi: [] as Gruppo[] };
    const celle = new Map<string, SpilloDto[]>();
    for (const s of visibili) {
      const sx = pan.x + (s.x / 100) * nat.w * zoom;
      const sy = pan.y + (s.y / 100) * nat.h * zoom;
      const chiave = `${Math.floor(sx / CELLA_RAGGRUPPAMENTO)}:${Math.floor(sy / CELLA_RAGGRUPPAMENTO)}`;
      celle.set(chiave, [...(celle.get(chiave) ?? []), s]);
    }
    const singoli: SpilloDto[] = [];
    const gruppi: Gruppo[] = [];
    for (const [chiave, lista] of celle) {
      if (lista.length === 1 || lista.some((s) => s.id === selezionatoId)) singoli.push(...lista);
      else gruppi.push({ chiave, x: lista.reduce((a, s) => a + s.x, 0) / lista.length, y: lista.reduce((a, s) => a + s.y, 0) / lista.length, spilli: lista });
    }
    return { singoli, gruppi };
  })();

  const cambiaRaccolto = async (s: SpilloDto, raccolto: boolean) => {
    if (!onRaccolto) return;
    setOccupato(true);
    try { await onRaccolto(s, raccolto); } finally { setOccupato(false); }
  };
  const cambiaStatoPunto = async (s: SpilloDto, stato: StatoPuntoMappa) => {
    if (!onStatoPunto) return;
    setOccupato(true);
    try { await onStatoPunto(s, stato); } finally { setOccupato(false); }
  };
  const cambiaAcquisto = async (s: SpilloDto, articolo: string, fatto: boolean) => {
    if (!onAcquisto) return;
    setOccupato(true);
    try { await onAcquisto(s, articolo, fatto); } finally { setOccupato(false); }
  };

  const stileLivello: CSSProperties = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: nat.w, height: nat.h };
  const cursore = editor?.strumento === 'aggiungi' ? 'cursor-crosshair' : 'cursor-grab';
  const percorsoTesto = mappa.percorso.map((p) => p.nome).join(' › ');

  return (
    <div className={`visore-mappa ${incorporato ? 'visore-mappa--incorporato' : 'visore-mappa--intero'} ${pannelloAperto ? '' : 'visore-mappa--pannello-chiuso'} ${className ?? ''}`} data-testid="visore-mappa">
      <header className="visore-mappa__barra">
        <nav className="visore-mappa__percorso" aria-label="Percorso della mappa">
          {intestazione}
          {mappa.percorso.map((p, i) => (
            <span key={p.chiave} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-text-muted" aria-hidden="true">›</span>}
              {i < mappa.percorso.length - 1 ? <button type="button" className="visore-mappa__briciola" onClick={() => onNaviga(p.chiave)}>{p.nome}</button> : <span className="visore-mappa__titolo">{p.nome}</span>}
            </span>
          ))}
          <span className="chip text-[11px]">{NOME_TIPO_MAPPA[mappa.tipo]}</span>
        </nav>
        <div className="visore-mappa__strumenti">
          {azioni}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={pannelloAperto ? 'Nascondi pannello' : 'Pannello'} onClick={() => setPannelloScelto(!pannelloAperto)} aria-expanded={pannelloAperto} aria-controls="visore-mappa-pannello" />
          {onChiudi && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo={etichettaChiudi ?? 'Chiudi'} onClick={onChiudi} />}
        </div>
      </header>

      <div className="visore-mappa__corpo">
        <aside id="visore-mappa-pannello" className="visore-mappa__pannello" hidden={!pannelloAperto} aria-label="Pannello della mappa">
          {pannello ?? <>
          {(mappa.genitore || mappa.figli.length > 0) && (
            <section className="visore-mappa__sezione">
              <h3 className="visore-mappa__intestazione">Livelli</h3>
              {mappa.genitore && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={`Su: ${mappa.genitoreNome ?? mappa.genitore}`} onClick={() => onNaviga(mappa.genitore!)} />}
              {mappa.figli.length > 0 && (
                <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Mappe figlie">
                  {mappa.figli.map((f) => (
                    <li key={f.chiave}>
                      <button type="button" className="visore-mappa__figlia" onClick={() => onNaviga(f.chiave)}>
                        <IconaSpillo tipo="passaggio" dimensione={18} />
                        <span className="flex-1 min-w-0 truncate">{f.nome}</span>
                        <span className="text-[11px] text-text-muted">{NOME_TIPO_MAPPA[f.tipo]}{f.numeroSpilli > 0 ? ` · ${f.numeroSpilli}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="visore-mappa__sezione">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="visore-mappa__intestazione">Categorie</h3>
              {tipiPresenti.length > 0 && (
                <span className="flex gap-1">
                  <button type="button" className="visore-mappa__azione-testo" onClick={mostraTutti} disabled={tipiNascosti.size === 0}>Mostra tutti</button>
                  <button type="button" className="visore-mappa__azione-testo" onClick={nascondiTutti} disabled={tipiNascosti.size === tipiPresenti.length}>Nascondi tutti</button>
                </span>
              )}
            </div>
            {tipiPresenti.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuno spillo su questa mappa.</p>}
            <ul className="m-0 p-0 list-none visore-mappa__categorie" aria-label="Categorie degli spilli">
              {tipiPresenti.map((t) => {
                const delTipo = mappa.spilli.filter((s) => s.tipo === t);
                const attivo = !tipiNascosti.has(t);
                return (
                  <li key={t}>
                    <button type="button" className={`visore-mappa__categoria ${attivo ? '' : 'visore-mappa__categoria--nascosta'}`} aria-pressed={attivo}
                      onClick={() => setTipiNascosti((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; })}>
                      <span className="spillo-mappa__punto" style={{ background: DEFINIZIONI_SPILLO[t].colore }} aria-hidden="true"><IconaSpillo tipo={t} dimensione={12} /></span>
                      <span className="flex-1 min-w-0 truncate">{DEFINIZIONI_SPILLO[t].nome}</span>
                      <span className="tabular-nums text-text-muted">{delTipo.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {(raccoltiNascosti > 0 || mostraRaccolti) && (
              <button type="button" className={`chip chip--icona touch text-[11px] self-start ${mostraRaccolti ? 'chip--attivo' : ''}`} aria-pressed={mostraRaccolti} onClick={() => setMostraRaccolti((v) => !v)}>
                <IconaAzione chiave="raggiunto" dimensione={14} />Mostra anche i raccolti ({raccoltiNascosti})
              </button>
            )}
            <label className="flex flex-col gap-1 text-[12px]">
              <span className="sr-only">Cerca uno spillo per nome</span>
              <input type="search" className="form-input" placeholder="Cerca uno spillo…" value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
            </label>
          </section>

          {collezionabili.length > 0 && (
            <section className="visore-mappa__sezione" aria-label="Progresso dei collezionabili">
              <h3 className="visore-mappa__intestazione">Progresso</h3>
              <div className="visore-mappa__progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentualeRaccolti} aria-label="Collezionabili raccolti">
                <span className="visore-mappa__progresso-barra" style={{ width: `${percentualeRaccolti}%` }} />
              </div>
              <span className="text-[12px] text-text-secondary">{raccolti} di {collezionabili.length} raccolti · {percentualeRaccolti}%{partitaId ? '' : ' · attiva una partita per segnarli'}</span>
            </section>
          )}

          {selezionato && (
            <SchedaSpillo spillo={selezionato} partitaId={partitaId} occupato={occupato} onNaviga={onNaviga} onRaccolto={onRaccolto ? cambiaRaccolto : undefined} onStatoPunto={onStatoPunto ? cambiaStatoPunto : undefined} onAcquisto={onAcquisto ? cambiaAcquisto : undefined} onChiudi={() => seleziona(null)} onCentra={() => centraSu(selezionato)} />
          )}

          <section className="visore-mappa__sezione">
            <h3 className="visore-mappa__intestazione">Spilli ({visibili.length}{visibili.length !== mappa.spilli.length ? ` di ${mappa.spilli.length}` : ''})</h3>
            <ul className="m-0 p-0 list-none flex flex-col visore-mappa__elenco" aria-label="Spilli visibili">
              {visibili.map((s) => (
                <li key={s.id}>
                  <button type="button" className={`visore-mappa__voce ${s.id === selezionatoId ? 'visore-mappa__voce--attiva' : ''} ${s.raccolto ? 'opacity-60' : ''}`} onClick={() => { seleziona(s.id); centraSu(s); }} aria-pressed={s.id === selezionatoId}>
                    <span className="spillo-mappa__punto" style={{ background: s.colore }} aria-hidden="true"><IconaSpillo tipo={s.tipo} dimensione={12} /></span>
                    <span className="flex-1 min-w-0 truncate">{s.nome}</span>
                    <span className="text-[11px] text-text-muted">{s.tipoNome}{s.raccolto ? ' · raccolto' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          </>}
        </aside>

        <div
          ref={tela}
          className={`visore-mappa__tela ${cursore} ${trascinando ? 'cursor-grabbing' : ''}`}
          role="application"
          aria-label={`Mappa: ${percorsoTesto}`}
          onPointerDown={suPointerDown} onPointerMove={suPointerMove} onPointerUp={suPointerUp} onPointerCancel={annullaGesto} onDoubleClick={adatta}
        >
          <div className="visore-mappa__livello" style={stileLivello}>
            {src ? (
              <img src={src} alt={`Mappa: ${mappa.nome}`} className="visore-mappa__immagine" draggable={false} onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setNatCaricata({ w: img.naturalWidth, h: img.naturalHeight }); }} />
            ) : (
              <div className="visore-mappa__senza-immagine" role="img" aria-label="Nessuna immagine di base">
                <IconMappa size={64} />
                <span className="font-display text-[26px]">Nessuna immagine di base</span>
                <span className="text-[13px] text-text-secondary">Caricala dall'editor oppure sposta gli spilli sulla griglia.</span>
              </div>
            )}
            {singoli.map((s) => {
              const pos = trascinato?.id === s.id ? trascinato : s;
              const attivo = s.id === selezionatoId;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`spillo-mappa ${attivo ? 'spillo-mappa--selezionato' : ''} ${s.raccolto ? 'spillo-mappa--raccolto' : ''} ${ricercaNorm ? 'spillo-mappa--trovato' : ''} ${sugg.evidenziato('spilli', s.id) ? 'spillo-mappa--suggerito' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--colore-spillo': s.colore, transform: `scale(${1 / zoom}) translate(-50%, -100%)` } as CSSProperties}
                  aria-label={`${s.tipoNome}: ${s.nome}${s.raccolto ? ' (raccolto)' : ''}`}
                  aria-pressed={attivo}
                  title={s.nome}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (editor?.strumento === 'seleziona') {
                      editor.onSeleziona(s.id);
                      gesto.current = { tipo: 'spillo', id: s.id, mosso: false, x: e.clientX, y: e.clientY };
                      tela.current?.setPointerCapture?.(e.pointerId);
                    }
                  }}
                  onClick={(e) => { e.stopPropagation(); if (editor?.strumento === 'aggiungi') return; seleziona(attivo ? null : s.id); }}
                >
                  <span className="spillo-mappa__goccia"><IconaSpillo tipo={s.tipo} dimensione={18} /></span>
                  <span className="spillo-mappa__etichetta">{s.nome}</span>
                </button>
              );
            })}
            {selezionato && !editor && singoli.some((s) => s.id === selezionato.id) && (
              <div className="spillo-popup" role="dialog" aria-label={selezionato.nome} style={{ left: `${selezionato.x}%`, top: `${selezionato.y}%`, transform: `scale(${1 / zoom}) translate(-50%, calc(-100% - 42px))` }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-2">
                  <span className="spillo-mappa__punto" style={{ background: selezionato.colore }} aria-hidden="true"><IconaSpillo tipo={selezionato.tipo} dimensione={12} /></span>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-[13px] leading-tight">{selezionato.nome}</strong>
                    <span className="block text-[11px] text-text-muted">{selezionato.tipoNome}{selezionato.raccolto ? ' · raccolto' : ''}</span>
                  </div>
                  <button type="button" className="spillo-popup__chiudi" onClick={() => seleziona(null)} aria-label="Chiudi il popup">×</button>
                </div>
                {selezionato.descrizione && <p className="m-0 text-[12px] text-text-secondary spillo-popup__testo">{selezionato.descrizione}</p>}
                {(selezionato.immagini.length > 0 || selezionato.dettaglio?.immagine) && (
                  <div className="flex flex-wrap gap-1 items-start">
                    <ImmagineRiferimento immagine={selezionato.dettaglio?.immagine} nome={selezionato.nome} dimensione={48} />
                    <GalleriaSpillo immagini={selezionato.immagini} nome={selezionato.nome} compatta />
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {selezionato.dettaglio?.tipo === 'mappa' && selezionato.dettaglio.mappa && <PulsanteVisivo tono="primario" compatto icona={<IconaSpillo tipo="passaggio" dimensione={20} />} titolo={`Apri: ${selezionato.dettaglio.mappa.nome}`} onClick={() => onNaviga(selezionato.dettaglio!.mappa!.chiave)} />}
                  {partitaId && <AzioniStato spillo={selezionato} occupato={occupato} onRaccolto={onRaccolto ? cambiaRaccolto : undefined} onStatoPunto={onStatoPunto ? cambiaStatoPunto : undefined} />}
                  {(selezionato.dettaglio?.negozio || selezionato.dettaglio?.tipo === 'punto' || selezionato.dettaglio?.tipo === 'luogo' || selezionato.dettaglio?.tipo === 'confidente' || selezionato.dettaglio?.tipo === 'richiesta') && (
                    <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Dettagli" onClick={() => setPannelloScelto(true)} />
                  )}
                </div>
              </div>
            )}
            {gruppi.map((g) => (
              <button
                key={g.chiave}
                type="button"
                className="spillo-mappa spillo-mappa--gruppo"
                style={{ left: `${g.x}%`, top: `${g.y}%`, transform: `scale(${1 / zoom}) translate(-50%, -50%)` }}
                aria-label={`${g.spilli.length} spilli vicini: ${g.spilli.map((s) => s.nome).join(', ')}`}
                title={g.spilli.map((s) => s.nome).join(', ')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); applicaZoom(zoom * 2.2, pan.x + (g.x / 100) * nat.w * zoom, pan.y + (g.y / 100) * nat.h * zoom); }}
              >
                <span className="spillo-mappa__gruppo">+{g.spilli.length}</span>
              </button>
            ))}
          </div>
          <div className="visore-mappa__controlli" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <button type="button" className="visore-mappa__controllo" onClick={() => zoomCentro(1.4)} disabled={zoom >= zoomMax - 1e-6} aria-label="Ingrandisci" title="Ingrandisci"><IconaAzione chiave="ingrandisci" dimensione={20} /></button>
            <button type="button" className="visore-mappa__controllo" onClick={() => zoomCentro(1 / 1.4)} disabled={zoom <= zoomMin + 1e-6} aria-label="Riduci" title="Riduci"><IconaAzione chiave="riduci" dimensione={20} /></button>
            <button type="button" className="visore-mappa__controllo" onClick={adatta} aria-label="Adatta alla finestra" title="Adatta alla finestra"><IconaAzione chiave="adatta" dimensione={20} /></button>
            <span className="visore-mappa__zoom tabular-nums" aria-live="polite">{Math.round((zoom / zoomMin) * 100)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}

interface PropsAzioni { spillo: SpilloDto; occupato: boolean; onRaccolto?: (spillo: SpilloDto, raccolto: boolean) => Promise<void>; onStatoPunto?: (spillo: SpilloDto, stato: StatoPuntoMappa) => Promise<void> }

/** Azioni di stato nella partita: per i punti della Guida «Ottenuto/Esaurito/Riapri» (stessi stati della scheda del Palazzo), altrimenti «Raccolto/Riapri». */
export function AzioniStato({ spillo: s, occupato, onRaccolto, onStatoPunto }: PropsAzioni) {
  const punto = s.dettaglio?.tipo === 'punto' ? s.dettaglio.punto ?? null : null;
  if (punto && onStatoPunto) {
    return (
      <>
        {punto.stato !== 'ottenuto' && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Ottenuto" onClick={() => void onStatoPunto(s, 'ottenuto')} disabled={occupato} />}
        {punto.esauribile && punto.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void onStatoPunto(s, 'esaurito')} disabled={occupato} />}
        {punto.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void onStatoPunto(s, null)} disabled={occupato} />}
      </>
    );
  }
  if (!s.collezionabile || !onRaccolto) return null;
  return s.raccolto
    ? <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void onRaccolto(s, false)} disabled={occupato} />
    : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Raccolto" onClick={() => void onRaccolto(s, true)} disabled={occupato} />;
}

interface PropsScheda {
  spillo: SpilloDto;
  partitaId: number | null;
  occupato: boolean;
  onNaviga: (chiave: string) => void;
  onRaccolto?: (spillo: SpilloDto, raccolto: boolean) => Promise<void>;
  onStatoPunto?: (spillo: SpilloDto, stato: StatoPuntoMappa) => Promise<void>;
  onAcquisto?: (spillo: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void>;
  onChiudi: () => void;
  onCentra: () => void;
}

/** Scheda dello spillo selezionato: descrizione, entità collegata e azioni. */
export function SchedaSpillo({ spillo: s, partitaId, occupato, onNaviga, onRaccolto, onStatoPunto, onAcquisto, onChiudi, onCentra }: PropsScheda) {
  const acquistabile = Boolean(partitaId && onAcquisto);
  const d = s.dettaglio;
  const negozio = d?.negozio ?? null;
  return (
    <section className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Scheda: ${s.nome}`}>
      <div className="flex items-start gap-2">
        <span className="spillo-mappa__punto spillo-mappa__punto--grande" style={{ background: s.colore }} aria-hidden="true"><IconaSpillo tipo={s.tipo} dimensione={20} /></span>
        <ImmagineRiferimento immagine={d?.immagine} nome={s.nome} />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display text-[19px] leading-tight break-words">{s.nome}</h3>
          <p className="m-0 text-[11px] uppercase tracking-wide text-text-muted">{s.tipoNome}{s.collezionabile ? ' · collezionabile' : ''}{s.raccolto ? ' · raccolto' : ''}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi la scheda">×</button>
      </div>
      {s.descrizione && <p className="m-0 text-[13px] text-text-secondary whitespace-pre-line">{s.descrizione}</p>}
      <GalleriaSpillo immagini={s.immagini} nome={s.nome} />

      {d?.tipo === 'mappa' && d.mappa && <PulsanteVisivo tono="primario" compatto icona={<IconaSpillo tipo="passaggio" dimensione={20} />} titolo={`Apri: ${d.mappa.nome}`} dettaglio={NOME_TIPO_MAPPA[d.mappa.tipo]} onClick={() => onNaviga(d.mappa!.chiave)} />}
      {d?.tipo === 'punto' && d.punto && (
        <p className="m-0 text-[12px] text-text-secondary">
          {d.punto.esauribile ? 'Esauribile · ' : ''}{d.punto.stato ? `Nella Guida: ${d.punto.stato}` : 'Non ancora gestito nella Guida'} · <Link to={`/guida/dungeon/${encodeURIComponent(d.punto.dungeon)}`} className="text-primary">scheda del Palazzo</Link>
        </p>
      )}
      {d?.tipo === 'luogo' && d.luogo && (
        <p className="m-0 text-[12px] text-text-secondary">
          {d.luogo.cosaOffre && d.luogo.cosaOffre !== s.descrizione ? `${d.luogo.cosaOffre} · ` : ''}{d.luogo.quando ? `${d.luogo.quando} · ` : ''}<Link to={`/guida/citta/${encodeURIComponent(d.luogo.quartiere)}`} className="text-primary">scheda del quartiere</Link>
        </p>
      )}
      {negozio && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold">{negozio.nome} · {negozio.articoli.length} articoli</span>
            <Link to={`/guida/negozi/${encodeURIComponent(negozio.chiave)}`} className="text-[12px] text-primary">scheda del negozio</Link>
          </div>
          {negozio.articoli.length > 0 && (
            <div className="overflow-x-auto">
              <table className="visore-mappa__articoli" aria-label={`Articoli di ${negozio.nome}`}>
                <thead><tr><th>{acquistabile ? 'Comprato' : ''}</th><th>Articolo</th><th>Prezzo</th><th>Disponibile</th></tr></thead>
                <tbody>
                  {negozio.articoli.map((a) => (
                    <tr key={a.chiave} className={a.comprato ? 'opacity-60' : ''}>
                      <td>{acquistabile
                        ? <input type="checkbox" className="w-5 h-5" checked={a.comprato} disabled={occupato} onChange={(e) => void onAcquisto!(s, a.chiave, e.target.checked)} aria-label={`${a.nome} comprato`} />
                        : <span aria-label={a.comprato ? 'comprato' : 'non comprato'}>{a.comprato ? '✓' : ''}</span>}</td>
                      <td className={a.comprato ? 'line-through' : ''}>{a.nome}<span className="text-text-muted no-underline"> · {a.categoria}</span></td>
                      <td className="tabular-nums whitespace-nowrap">{a.prezzo !== null ? formattaYen(a.prezzo) : '—'}</td>
                      <td className="whitespace-nowrap">{disponibilita(a)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {d?.tipo === 'confidente' && d.confidente && <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(d.confidente.chiave)}`} tono="secondario" compatto icona={<IconaSpillo tipo="confidente" dimensione={20} />} titolo={d.confidente.nome} dettaglio={d.confidente.arcanaNome} />}
      {d?.tipo === 'richiesta' && d.richiesta && <CollegamentoVisivo to="/guida/richieste" tono="secondario" compatto icona={<IconaAzione chiave="obiettivo" dimensione={20} />} titolo={d.richiesta.nome} dettaglio={d.richiesta.stato ?? 'richiesta dei Mementos'} />}

      <div className="flex flex-wrap gap-1.5">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Centra" onClick={onCentra} />
        {partitaId && <AzioniStato spillo={s} occupato={occupato} onRaccolto={onRaccolto} onStatoPunto={onStatoPunto} />}
      </div>
      {(s.collezionabile || d?.tipo === 'punto' || negozio) && !partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare i punti raccolti e gli acquisti.</span>}
    </section>
  );
}
