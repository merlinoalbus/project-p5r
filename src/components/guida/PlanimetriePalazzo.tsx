// ============================================================
// PlanimetriePalazzo — le stanze di un Palazzo, con le loro planimetrie
// ============================================================
//
// **Un Palazzo è fatto di stanze, non di immagini.** L'estrazione ha prodotto più tavole della
// stessa stanza — «Cancello del castello» come planimetria completa e come porzione occidentale,
// il Tetto in cinque inquadrature — e restano separate, perché ognuna ha i suoi spilli e serve a
// vedere una cosa diversa (decisione dell'utente, 2026-09-18: tenerle separate, ma in ordine).
//
// **L'elenco serve a scegliere, la scheda a sistemare** (ristrutturazione chiesta dall'utente,
// 2026-09-30: «tutta la parte nella colonna a sinistra è fatta molto molto male ed è poco usabile»).
// Prima ogni riga portava maniglia, frecce, matita, Editor, cestino e selettore delle aree: la
// matita apriva il modulo dentro la colonna stretta, che sforava, e la conferma del cestino compariva
// in fondo all'elenco, fuori vista. Ora:
// - ogni riga dice la stanza, quanto resta da raccogliere e le aree della guida che contiene, e
//   toccarla porta la planimetria nel visore;
// - l'ordine si cambia **trascinando la maniglia** ⠿ (la stanza, e dentro la stanza le sue versioni),
//   oppure con le frecce su/giù quando la maniglia ha il focus: il trascinamento è a puntatore, perché
//   l'HTML5 drag-and-drop col dito non parte, e la colonna scorre da sola vicino ai bordi;
// - «Gestisci» apre la scheda della planimetria (`SchedaPlanimetria`): nome della stanza, «Che cosa
//   mostra», nome, aree della guida, editor ed eliminazione, con la conferma nella finestra;
// - in coda, le aree della guida senza planimetria, con la loro scheda (`SchedaAreaGuida`): si
//   collegano a una planimetria o si eliminano.
//
// I nomi vengono da `presentazioneMappa` ed `etichettaVersione`, l'unico posto che decide come si
// chiama una mappa: qui non si compone niente, altrimenti la stessa stanza si chiamerebbe in due modi.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { aggiornaArea, aggiornaMappa, aggiornaPresentazioneMappa, creaMappa, eliminaArea, eliminaMappa, impostaAreeMappa, impostaStanzaMappa, riordinaMappe } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { CampoCorrezione } from './CorrezioneGuida';
import { SchedaPlanimetria, type ModificheScheda } from './SchedaPlanimetria';
import { SchedaAreaGuida } from './SchedaAreaGuida';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { chiaviInOrdine, nomeSenzaPalazzo, perOrdineDiGuida, raggruppaPlanimetrie, spostaGruppo, spostaVersioneA, type GruppoPlanimetrie, type Planimetria, type VersionePlanimetria } from '../../utils/gruppiPlanimetrie';
import { etichettaVersione } from '../../utils/etichettaVersione';
import { titoloGruppoImmagini } from '../../utils/presentazioneMappa';
import type { MappaRiassuntoDto } from '../../types';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';

export type { Planimetria };

interface Props {
  /** Chiave del dungeon: la radice dell'albero è `dungeon-<chiave>`. */
  dungeonChiave: string;
  planimetrie: Planimetria[];
  /** L'atlante: serve per il nome di presentazione e per sapere quali versioni sono la stessa stanza. */
  albero: MappaRiassuntoDto[];
  /** Finché l'atlante non c'è, le stanze non si sanno: l'ordine resta bloccato (vedi sotto). */
  alberoPronto: boolean;
  alberoErrore: string | null;
  onRiprovaAlbero: () => void;
  /** Tutte le aree del Palazzo, in ordine di guida: le scelte per le aree di una planimetria. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** Le aree della guida senza planimetria, con quanti punti hanno: in coda all'elenco. */
  areeOrfane: Array<{ chiave: string; nome: string; ordine: number; descrizione: string; punti: number }>;
  /** L'area aperta nella scheda: evidenzia la sua riga anche quando la stanza non è scelta. */
  areaScelta: string | null;
  onScegliArea: (chiave: string) => void;
  /** La planimetria che si sta guardando nel visore, evidenziata nell'elenco. */
  sceltaChiave: string | null;
  onScegli: (chiave: string) => void;
  /** Dopo ogni modifica strutturale: la scheda rilegge il Palazzo. */
  onCambiato: () => Promise<void> | void;
  /** Un'area eliminata: la pagina smette di mostrarla. */
  onAreaEliminata: (chiave: string) => void;
}

// ---- Riordino col trascinamento della maniglia (e con le frecce) ----

/** Di quanti pixel scorre la colonna a ogni passo quando il puntatore è vicino al bordo, e quanto è largo il bordo. */
const PASSO_SCORRIMENTO = 14;
const BORDO_SCORRIMENTO = 48;

/**
 * Il riordino di un elenco: `riga(id)` registra l'elemento della riga, `maniglia(id, i)` dà i gestori
 * della maniglia. Durante il trascinamento `sopra` è la posizione che la riga prenderebbe; vicino ai
 * bordi della colonna che scorre, la colonna scorre da sola (un Palazzo ha più stanze di quante ne
 * stanno a schermo, e senza questo si potrebbe spostare una stanza solo fin dove si vede).
 */
function useRiordino(ids: string[], blocco: string | null, onSposta: (id: string, a: number) => void) {
  const bloccato = blocco !== null;
  const righe = useRef(new Map<string, HTMLElement>());
  const maniglie = useRef(new Map<string, HTMLButtonElement>());
  // La maniglia spostata da tastiera va rimessa a fuoco: React riordina le righe spostando nel DOM
  // quella che scende, e un elemento spostato perde il focus (con la freccia giù la seconda pressione
  // non faceva più nulla — rilievo della revisione).
  const daRifocalizzare = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = daRifocalizzare.current;
    if (!id) return;
    const el = maniglie.current.get(id);
    if (el && document.activeElement !== el) el.focus();
    if (el) daRifocalizzare.current = null;
  });
  const [trascinato, setTrascinato] = useState<string | null>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  const ultimoY = useRef(0);
  const contenitore = useRef<HTMLElement | null>(null);
  const velocita = useRef(0);
  // gli id correnti, letti anche dal timer dello scorrimento (che non si ricrea a ogni disegno)
  const elenco = useRef(ids);
  useLayoutEffect(() => { elenco.current = ids; });

  /** La posizione della riga sotto il puntatore: l'ultima il cui bordo alto è già stato superato. Legge solo riferimenti. */
  const indiceSotto = useCallback((y: number): number | null => {
    let trovato: number | null = null;
    elenco.current.forEach((id, i) => { const el = righe.current.get(id); if (el && y >= el.getBoundingClientRect().top) trovato = i; });
    return trovato ?? (elenco.current.length ? 0 : null);
  }, []);

  // lo scorrimento automatico continua anche a puntatore fermo vicino al bordo, finché dura il trascinamento
  useEffect(() => {
    if (!trascinato) return;
    const timer = window.setInterval(() => {
      if (!velocita.current || !contenitore.current) return;
      contenitore.current.scrollTop += velocita.current;
      setSopra(indiceSotto(ultimoY.current));
    }, 30);
    return () => window.clearInterval(timer);
  }, [trascinato, indiceSotto]);

  const fine = () => { setTrascinato(null); setSopra(null); velocita.current = 0; contenitore.current = null; };

  return {
    trascinato,
    sopra,
    blocco,
    riga: (id: string) => (el: HTMLElement | null) => { if (el) righe.current.set(id, el); else righe.current.delete(id); },
    rifManiglia: (id: string) => (el: HTMLButtonElement | null) => { if (el) maniglie.current.set(id, el); else maniglie.current.delete(id); },
    maniglia: (id: string, i: number) => ({
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        // solo il tasto principale (o il dito): il destro apre il menu, non trascina
        if (bloccato || e.button !== 0) return;
        e.preventDefault();
        // la cattura tiene il trascinamento anche fuori dalla maniglia; se il puntatore non è più attivo lancia, e si va avanti senza
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* senza cattura il rilascio fuori dalla maniglia lo chiude la perdita del puntatore */ }
        contenitore.current = e.currentTarget.closest<HTMLElement>('.area-scorrevole');
        ultimoY.current = e.clientY;
        setTrascinato(id); setSopra(i);
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (trascinato !== id) return;
        ultimoY.current = e.clientY;
        const r = contenitore.current?.getBoundingClientRect();
        velocita.current = !r ? 0 : e.clientY < r.top + BORDO_SCORRIMENTO ? -PASSO_SCORRIMENTO : e.clientY > r.bottom - BORDO_SCORRIMENTO ? PASSO_SCORRIMENTO : 0;
        setSopra(indiceSotto(e.clientY));
      },
      onPointerUp: () => { if (trascinato === id && sopra !== null && sopra !== i) onSposta(id, sopra); fine(); },
      onPointerCancel: fine,
      // la cattura può perdersi senza pointerup (finestra che perde il fuoco…): il trascinamento finisce lì
      onLostPointerCapture: () => { if (trascinato === id) fine(); },
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
        const a = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
        if (a === null) return;
        e.preventDefault();
        if (!bloccato && a >= 0 && a < ids.length) { daRifocalizzare.current = id; onSposta(id, a); }
      },
    }),
  };
}

type Riordino = ReturnType<typeof useRiordino>;

/** La maniglia: un pulsante vero (il focus ci arriva, le frecce spostano), largo quanto un dito. */
function Maniglia({ etichetta, id, i, riordino }: { etichetta: string; id: string; i: number; riordino: Riordino }) {
  const bloccato = riordino.blocco !== null;
  return (
    <button type="button" ref={riordino.rifManiglia(id)} {...riordino.maniglia(id, i)} aria-label={etichetta} aria-keyshortcuts="ArrowUp ArrowDown" aria-disabled={bloccato || undefined}
      title={riordino.blocco ?? 'Trascina per spostare (con la tastiera: frecce su e giù)'}
      className={`touch flex w-8 shrink-0 select-none items-center justify-center rounded text-[18px] leading-none text-text-muted touch-none hover:text-text ${bloccato ? 'cursor-default opacity-40' : 'cursor-grab active:cursor-grabbing'}`}>
      <span aria-hidden>⠿</span>
    </button>
  );
}

/** Quanto resta su una planimetria o su una stanza, a parole. */
function restoDaRaccogliere(totale: number, presi: number | null): string {
  if (totale === 0) return 'niente da raccogliere';
  if (presi === null) return `${totale} da raccogliere`;
  return presi >= totale ? `${totale} raccolti · completa` : `${totale - presi} da prendere su ${totale}`;
}

/** Le aree della guida contenute, in ordine di guida, in una riga. */
function testoAree(aree: Array<{ nome: string; ordine: number; chiave: string }>): string {
  return aree.length ? [...aree].sort(perOrdineDiGuida).map((a) => `${a.ordine + 1}. ${a.nome}`).join(' · ') : 'nessuna area della guida';
}

export function PlanimetriePalazzo({ dungeonChiave, planimetrie, albero, alberoPronto, alberoErrore, onRiprovaAlbero, aree, areeOrfane, areaScelta, onScegliArea, sceltaChiave, onScegli, onCambiato, onAreaEliminata }: Props) {
  // L'ordine mostrato è locale finché il server non risponde: il trascinamento deve vedersi subito.
  // Vale solo per le planimetrie che ci sono adesso; quelle appena aggiunte si accodano nell'ordine
  // del server e quelle eliminate cadono, altrimenti una creazione riuscita sembrerebbe fallita.
  const [ordine, setOrdine] = useState<string[] | null>(null);
  const [occupato, setOccupato] = useState(false);
  // **Senza l'atlante non si riordina.** È l'atlante a dire quali tavole sono la stessa stanza:
  // finché non è arrivato, ogni planimetria sembrerebbe una stanza a sé e trascinare salverebbe lo
  // spostamento della singola tavola invece di quello della stanza (rilievo della revisione, 2026-09-18).
  // Il perché del blocco lo dice la maniglia: atlante che manca o salvataggio ancora in corso.
  const blocco = !alberoPronto ? 'Ordine bloccato: l’atlante non è ancora caricato' : occupato ? 'Un momento: sto salvando l’ultima modifica' : null;
  const [aperta, setAperta] = useState<string | null>(null);
  const [scheda, setScheda] = useState<{ gruppo: GruppoPlanimetrie; versione: VersionePlanimetria } | null>(null);
  const [schedaArea, setSchedaArea] = useState<Props['areeOrfane'][number] | null>(null);
  const [nuova, setNuova] = useState<string | null>(null);

  const gruppi = useMemo(() => {
    const inOrdine = ordine
      ? [
          ...ordine.map((k) => planimetrie.find((p) => p.chiave === k)).filter((p): p is Planimetria => !!p),
          ...planimetrie.filter((p) => !ordine.includes(p.chiave)),
        ]
      : planimetrie;
    return raggruppaPlanimetrie(inOrdine, albero);
  }, [ordine, planimetrie, albero]);

  const esegui = async (azione: () => Promise<unknown>, messaggio: string): Promise<boolean> => {
    setOccupato(true);
    try { await azione(); await onCambiato(); notifica('success', messaggio); return true; }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); setOrdine(null); return false; }
    finally { setOccupato(false); }
  };

  /** Salva l'ordine piatto che i gruppi disegnano: il server lo riscrive da 0 per ogni genitore. */
  const salvaOrdine = (nuovi: GruppoPlanimetrie[], messaggio: string) => {
    const chiavi = chiaviInOrdine(nuovi);
    setOrdine(chiavi);
    void esegui(() => riordinaMappe(`dungeon-${dungeonChiave}`, chiavi), messaggio);
  };

  const stanze = useRiordino(gruppi.map((g) => g.id), blocco, (id, a) => salvaOrdine(spostaGruppo(gruppi, id, a), 'Ordine delle stanze salvato.'));

  /** Il genitore di una planimetria secondo l'atlante (`undefined` finché l'atlante non la conosce). */
  const genitoreDi = (chiave: string): string | null | undefined => albero.find((m) => m.chiave === chiave)?.genitore;
  /** Il nome di una tavola in una riga sola: stanza e, se c'è, che cosa mostra. */
  const etichettaTavola = (t: Planimetria): string => {
    const m = albero.find((x) => x.chiave === t.chiave);
    return m ? [titoloGruppoImmagini(m), etichettaVersione(m)].filter(Boolean).join(' · ') : nomeSenzaPalazzo(t.nome);
  };
  /** Dove sta ciascuna area legata a una planimetria diversa da `tranne`: la scheda lo scrive accanto al nome. */
  const areeAltrove = (tranne: string): Map<string, string> => {
    const dove = new Map<string, string>();
    for (const t of planimetrie) if (t.chiave !== tranne) for (const a of t.aree) dove.set(a.chiave, etichettaTavola(t));
    return dove;
  };
  /** Le tavole fra cui scegliere per un'area: tutte, ognuna con quel che contiene già (l'area si aggiunge). */
  const opzioniTavole = planimetrie.map((t) => ({
    chiave: t.chiave,
    nome: etichettaTavola(t),
    dettaglio: [t.n > 0 ? `${t.n} da raccogliere` : null, t.aree.length ? `contiene ${[...t.aree].sort(perOrdineDiGuida).map((a) => a.nome).join(', ')}` : 'nessuna area'].filter(Boolean).join(' · '),
  }));

  const salvaScheda = async (p: Planimetria, m: ModificheScheda) => {
    const ok = await esegui(async () => {
      if (m.stanza !== undefined || m.etichetta !== undefined) {
        await aggiornaPresentazioneMappa(p.chiave, { ...(m.stanza !== undefined ? { gruppoNome: m.stanza } : {}), ...(m.etichetta !== undefined ? { etichetta: m.etichetta } : {}) });
      }
      if (m.nome !== undefined) await aggiornaMappa(p.chiave, { nome: m.nome });
      if (m.aree !== undefined) await impostaAreeMappa(p.chiave, m.aree);
    }, 'Planimetria aggiornata.');
    if (ok) setScheda(null);
  };

  const totale = planimetrie.reduce((s, p) => s + p.n, 0);
  const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
  const senzaArea = gruppi.filter((g) => g.aree.length === 0).length;

  return (
    <div className="flex flex-col gap-2.5" aria-label="Planimetrie del Palazzo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">Il Palazzo · {gruppi.length + areeOrfane.length}</h3>
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => setNuova('')} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip text-[11px]" title="Le tavole dell’atlante: più di una per stanza quando l’estrazione ne ha trovate diverse inquadrature.">{planimetrie.length} planimetrie</span>
        {senzaArea > 0 && <span className="chip text-[11px]" title="Stanze che non contengono alcuna area della guida: si sistemano con «Gestisci».">{senzaArea} senza area</span>}
        {totale > 0 && <span className="chip text-[11px]">{presi}/{totale} raccolti</span>}
      </div>
      <p className="m-0 text-[11px] text-text-muted">
        Trascina ⠿ per l’ordine in cui percorri il Palazzo. Tocca una stanza per vederla sulla mappa; «Gestisci» per nome, che cosa mostra, aree della guida, editor ed eliminazione.
      </p>

      {!alberoPronto && (
        <p className="m-0 flex flex-wrap items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-[12px] text-text-muted" role="status">
          {alberoErrore
            ? <>L’atlante non si è caricato ({alberoErrore}): le planimetrie si vedono, ma finché manca non si sa quali sono la stessa stanza e l’ordine resta bloccato.</>
            : <>Carico l’atlante per raggruppare le planimetrie per stanza: l’ordine si sblocca appena arriva.</>}
          {alberoErrore && <button type="button" className="chip touch text-[11px]" onClick={onRiprovaAlbero}>Riprova</button>}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Stanze del Palazzo">
        {gruppi.map((g, i) => {
          const dentro = g.versioni.some((v) => v.planimetria.chiave === sceltaChiave);
          const una = g.versioni.length === 1;
          const apertaQui = !una && (aperta === g.id || (dentro && aperta === null));
          const sola = g.versioni[0];
          const bersaglio = stanze.trascinato && stanze.trascinato !== g.id && stanze.sopra === i;
          return (
            <li key={g.id} ref={stanze.riga(g.id)}
              className={`flex flex-col gap-1 rounded-md border px-1.5 py-1.5 transition-colors ${dentro ? 'border-primary bg-primary-bg' : 'border-border-light bg-white/[0.02]'} ${stanze.trascinato === g.id ? 'opacity-50' : ''} ${bersaglio ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-stretch gap-1">
                <Maniglia etichetta={`Sposta la stanza «${g.nome}»`} id={g.id} i={i} riordino={stanze} />
                {una
                  ? <button type="button" className="touch min-w-0 flex-1 text-left" aria-pressed={sola.planimetria.chiave === sceltaChiave} onClick={() => onScegli(sola.planimetria.chiave)}>
                      <span className="block text-[13px] font-semibold leading-tight">{i + 1}. {g.nome}</span>
                      <span className="block text-[11px] leading-tight text-text-muted">{sola.etichetta} · {restoDaRaccogliere(g.totale, g.presi)}</span>
                      <span className="block text-[11px] leading-tight text-text-muted">{testoAree(g.aree)}</span>
                    </button>
                  : <button type="button" className="touch min-w-0 flex-1 text-left" aria-expanded={apertaQui} onClick={() => setAperta(apertaQui ? `chiusa:${g.id}` : g.id)}>
                      <span className="flex items-baseline gap-1 text-[13px] font-semibold leading-tight"><span className="min-w-0 flex-1">{i + 1}. {g.nome}</span><span aria-hidden className="text-text-muted">{apertaQui ? '▾' : '▸'}</span></span>
                      <span className="block text-[11px] leading-tight text-text-muted">{g.versioni.length} planimetrie · {restoDaRaccogliere(g.totale, g.presi)}</span>
                      <span className="block text-[11px] leading-tight text-text-muted">{testoAree(g.aree)}</span>
                    </button>}
                {una && (
                  <button type="button" className="chip touch shrink-0 self-center text-[11px]" disabled={occupato}
                    aria-label={`Gestisci «${sola.etichetta}» di ${g.nome}`} onClick={() => setScheda({ gruppo: g, versione: sola })}>Gestisci</button>
                )}
              </div>
              {g.totale > 0 && g.presi !== null && (
                <span className="visore-mappa__progresso h-1.5" role="progressbar" aria-label={`${g.nome}: raccolti`} aria-valuemin={0} aria-valuemax={g.totale} aria-valuenow={g.presi}>
                  <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((g.presi / g.totale) * 100)}%` }} />
                </span>
              )}
              {apertaQui && (
                <VersioniStanza gruppo={g} blocco={blocco} sceltaChiave={sceltaChiave} occupato={occupato} onScegli={onScegli}
                  onGestisci={(v) => setScheda({ gruppo: g, versione: v })}
                  onSposta={(chiave, a) => salvaOrdine(spostaVersioneA(gruppi, g.id, chiave, a), 'Ordine delle planimetrie salvato.')} />
              )}
            </li>
          );
        })}
        {gruppi.length === 0 && <li className="text-[12px] text-text-muted" role="status">Questo Palazzo non ha ancora planimetrie: aggiungine una.</li>}
      </ul>

      {/* Le aree che la guida racconta ma di cui non si sa ancora quale tavola siano: si collegano o si
          eliminano dalla loro scheda, e da quel momento risalgono nell'elenco o spariscono. */}
      {areeOrfane.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Aree della guida senza planimetria">
          {areeOrfane.map((a) => (
            <li key={a.chiave} className={`flex items-center gap-1 rounded-md border border-dashed px-1.5 py-1.5 ${areaScelta === a.chiave ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
              <span aria-hidden className="w-8 shrink-0 text-center text-text-muted opacity-40">·</span>
              <button type="button" className="touch min-w-0 flex-1 text-left" aria-pressed={areaScelta === a.chiave} title={a.descrizione} onClick={() => onScegliArea(a.chiave)}>
                <span className="block text-[13px] font-semibold leading-tight">{a.ordine + 1}. {a.nome}</span>
                <span className="block text-[11px] leading-tight text-text-muted">area della guida · nessuna planimetria</span>
              </button>
              <button type="button" className="chip touch shrink-0 text-[11px]" disabled={occupato} aria-label={`Gestisci l’area «${a.nome}»`} onClick={() => setSchedaArea(a)}>Gestisci</button>
            </li>
          ))}
        </ul>
      )}

      {scheda && (() => {
        const { gruppo: g, versione: v } = scheda;
        const p = v.planimetria;
        const m = v.mappa;
        const dedotta = m ? etichettaVersione({ ...m, gruppoImmagini: m.gruppoImmagini ? { ...m.gruppoImmagini, etichetta: undefined } : m.gruppoImmagini }) : v.etichetta;
        return (
          <SchedaPlanimetria key={p.chiave} planimetria={p} stanza={g.nome} versioni={g.versioni.length}
            etichetta={m?.gruppoImmagini?.etichetta ?? ''} etichettaDedotta={dedotta} nome={nomeSenzaPalazzo(p.nome)}
            aree={aree} altrove={areeAltrove(p.chiave)}
            // solo le stanze dello stesso livello: il Palazzo elenca anche le planimetrie annidate, ma una stanza
            // raccoglie tavole dello stesso genitore, e il server rifiuta le altre (rilievo della revisione)
            altreStanze={gruppi.filter((x) => x.id !== g.id && genitoreDi(x.versioni[0].planimetria.chiave) === genitoreDi(p.chiave)).map((x) => ({
              chiave: x.versioni[0].planimetria.chiave,
              nome: x.nome,
              dettaglio: [x.versioni.length === 1 ? 'una planimetria' : `${x.versioni.length} planimetrie`, x.aree.length ? testoAree(x.aree) : null].filter(Boolean).join(' · '),
            }))}
            onSalva={(mod) => salvaScheda(p, mod)}
            onCambiaStanza={async (con, nome) => {
              setOrdine(null);
              const messaggio = con === null ? `«${v.etichetta}» è ora la stanza «${nome}».` : `«${v.etichetta}» è ora una planimetria di «${nome}».`;
              if (await esegui(() => impostaStanzaMappa(p.chiave, { con, nome }), messaggio)) setScheda(null);
            }}
            onElimina={async () => { setOrdine(null); if (await esegui(() => eliminaMappa(p.chiave), `«${v.etichetta}» di ${g.nome} eliminata.`)) setScheda(null); }}
            onChiudi={() => setScheda(null)} />
        );
      })()}

      {schedaArea && (
        <SchedaAreaGuida key={schedaArea.chiave} area={schedaArea} punti={schedaArea.punti} tavole={opzioniTavole}
          onCollega={async (k) => {
            const t = planimetrie.find((x) => x.chiave === k);
            if (t && await esegui(() => impostaAreeMappa(t.chiave, [...t.aree.map((x) => x.chiave), schedaArea.chiave]), `«${schedaArea.nome}» collegata a «${etichettaTavola(t)}».`)) setSchedaArea(null);
          }}
          onSalvaTesto={async (testo) => {
            if (await esegui(() => aggiornaArea(schedaArea.chiave, testo), `Testo dell’area «${testo.nome}» salvato.`)) setSchedaArea(null);
          }}
          onElimina={async () => {
            const a = schedaArea;
            if (await esegui(() => eliminaArea(a.chiave), `Area «${a.nome}» eliminata dalla guida.`)) { setSchedaArea(null); onAreaEliminata(a.chiave); }
          }}
          onChiudi={() => setSchedaArea(null)} />
      )}

      {nuova !== null && (
        <Modal titolo="Nuova planimetria" aperta onChiudi={() => setNuova(null)}
          azioni={<>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuova(null)} />
            <PulsanteVisivo type="submit" form="nuova-planimetria" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea" disabled={occupato || !nuova.trim()} />
          </>}>
          <form id="nuova-planimetria" className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const nome = nuova.trim();
              if (!nome) return;
              void esegui(() => creaMappa({ nome, tipo: 'area', genitore: `dungeon-${dungeonChiave}`, ordine: planimetrie.length }), `Planimetria «${nome}» aggiunta in fondo: caricane l’immagine dall’editor.`)
                .then((ok) => { if (ok) setNuova(null); });
            }}>
            <CampoCorrezione etichetta="Nome della planimetria" valore={nuova} massimo={LIMITI_GUIDA.mappa.nome} onCambia={setNuova} />
            <span className="text-[11px] text-text-muted">Si aggiunge in fondo all’elenco; l’immagine e gli spilli si caricano poi dall’editor.</span>
          </form>
        </Modal>
      )}
    </div>
  );
}

/** Le planimetrie di una stanza con più versioni: si scelgono, si riordinano trascinando, si gestiscono. */
function VersioniStanza({ gruppo: g, blocco, sceltaChiave, occupato, onScegli, onGestisci, onSposta }: {
  gruppo: GruppoPlanimetrie; blocco: string | null; sceltaChiave: string | null; occupato: boolean;
  onScegli: (chiave: string) => void; onGestisci: (v: VersionePlanimetria) => void; onSposta: (chiave: string, a: number) => void;
}) {
  const versioni = useRiordino(g.versioni.map((v) => v.planimetria.chiave), blocco, onSposta);
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 pl-2" aria-label={`Planimetrie di ${g.nome}`}>
      {g.versioni.map((v, j) => {
        const p = v.planimetria;
        const scelta = p.chiave === sceltaChiave;
        const bersaglio = versioni.trascinato && versioni.trascinato !== p.chiave && versioni.sopra === j;
        return (
          <li key={p.chiave} ref={versioni.riga(p.chiave)}
            className={`flex items-stretch gap-1 rounded border-l-2 py-0.5 pr-1 ${scelta ? 'border-primary bg-primary-bg' : 'border-border-light'} ${versioni.trascinato === p.chiave ? 'opacity-50' : ''} ${bersaglio ? 'ring-2 ring-primary' : ''}`}>
            <Maniglia etichetta={`Sposta «${v.etichetta}» di ${g.nome}`} id={p.chiave} i={j} riordino={versioni} />
            <button type="button" className="touch min-w-0 flex-1 text-left" onClick={() => onScegli(p.chiave)} aria-pressed={scelta}>
              <span className="block text-[12px] font-semibold leading-tight">{v.etichetta}</span>
              <span className="block text-[11px] leading-tight text-text-muted">{restoDaRaccogliere(p.n, p.presi)}</span>
              <span className="block text-[11px] leading-tight text-text-muted">{testoAree(p.aree)}</span>
            </button>
            <button type="button" className="chip touch shrink-0 self-center text-[11px]" disabled={occupato}
              aria-label={`Gestisci «${v.etichetta}» di ${g.nome}`} onClick={() => onGestisci(v)}>Gestisci</button>
          </li>
        );
      })}
    </ul>
  );
}
