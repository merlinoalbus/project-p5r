// ============================================================
// AlberoGerarchia — l'albero dei luoghi: Città › Quartieri › Aree › Planimetrie, Città › Palazzi › Aree › Planimetrie (L11 B5)
// e Memento › Dedali › Aree del dedalo (L11 B6: l'area del dedalo non ha planimetrie)
// ============================================================
//
// Ogni riga ha **due gesti separati**: a sinistra il pulsante che apre e chiude il ramo (44×44), poi il collegamento alla casa del nodo
// (miniatura, nome e conteggi): mai un solo bersaglio con due significati, come faceva il vecchio indice. Casa e conteggi li calcola il
// server (`GET /api/mappe/gerarchia`): qui non si ricostruisce un indirizzo né si somma un numero. Si montano solo i rami aperti
// (le miniature caricano pigre), e i rami aperti si ricordano nella sessione, così tornando indietro dalla casa di un nodo l'albero
// si ritrova com'era. In fondo «Da collocare», sempre presente, raggiungibile dall'albero (R11-13).
// ============================================================

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnteprimaMappa } from './AnteprimaMappa';
import { PlanimetrieDaCollocare } from './PlanimetrieDaCollocare';
import type { ContenitoreColloca } from './FinestraCollocaPlanimetria';
import { EmblemaDungeon } from '../guida/EmblemaDungeon';
import { testoConteggiPin, testoPin } from '../../utils/presentazioneMappa';
import type { GerarchiaMappeDto, NodoGerarchiaDto, TipoNodoGerarchia } from '../../types';

// ---- i rami aperti, nella sessione ----

const CHIAVE_APERTI = 'p5r-albero-aperti';
let apertiInMemoria: string[] | null = null;
/** All'inizio solo Tokyo è aperta: i quartieri e i Palazzi si vedono, le loro aree no finché non li apri. */
const APERTI_INIZIALI = ['citta:tokyo'];

/** I rami aperti ricordati (sessionStorage, con una copia in memoria se lo storage non c'è); all'inizio solo Tokyo. */
function leggiAperti(): Set<string> {
  try {
    const salvato = globalThis.sessionStorage?.getItem(CHIAVE_APERTI);
    if (salvato) {
      const elenco: unknown = JSON.parse(salvato);
      if (Array.isArray(elenco)) return new Set(elenco.filter((x): x is string => typeof x === 'string'));
    }
  } catch {
    // storage non disponibile o contenuto non valido: vale la copia in memoria
  }
  return new Set(apertiInMemoria ?? APERTI_INIZIALI);
}

function salvaAperti(aperti: Set<string>): void {
  apertiInMemoria = [...aperti];
  try { globalThis.sessionStorage?.setItem(CHIAVE_APERTI, JSON.stringify(apertiInMemoria)); } catch { /* resta la copia in memoria */ }
}

// ---- parole ----

const parola = (n: number, uno: string, piu: string): string => `${n} ${n === 1 ? uno : piu}`;

/** Le parole del livello (mai «mappe»): quel che il nodo contiene, dai conteggi del server. */
function testoConteggi(n: NodoGerarchiaDto): string {
  const c = n.conteggi;
  const pin = testoPin(c.pin.contenuto);
  const aree = c.aree ?? 0;
  const planimetrie = parola(c.planimetrie ?? 0, 'planimetria', 'planimetrie');
  switch (n.tipo) {
    case 'citta': return [parola(c.quartieri ?? 0, 'quartiere', 'quartieri'), parola(c.palazzi ?? 0, 'Palazzo', 'Palazzi')].join(' · ');
    case 'quartiere': return (aree === 0 ? ['nessuna area', pin] : [parola(aree, 'area', 'aree'), planimetrie, pin]).join(' · ');
    case 'palazzo': return [parola(aree, 'area', 'aree'), planimetrie, parola(c.infiltrazioni ?? 0, 'infiltrazione', 'infiltrazioni'), pin].join(' · ');
    case 'memento': return [parola(c.dedali ?? 0, 'dedalo', 'dedali'), parola(aree, 'area', 'aree'), parola(c.persone ?? 0, 'Persona', 'Persona'), parola(c.trame ?? 0, 'Trama', 'Trame'),
      parola(c.richieste ?? 0, 'Richiesta', 'Richieste'), ...((c.planimetrie ?? 0) > 0 ? [planimetrie] : [])].join(' · ');
    case 'dedalo': return [parola(aree, 'area', 'aree'), parola(c.persone ?? 0, 'Persona', 'Persona'), parola(c.trame ?? 0, 'Trama', 'Trame'), parola(c.richieste ?? 0, 'Richiesta', 'Richieste')].join(' · ');
    case 'area-dedalo': return [parola(c.persone ?? 0, 'Persona', 'Persona'), parola(c.trame ?? 0, 'Trama', 'Trame'), parola(c.richieste ?? 0, 'Richiesta', 'Richieste')].join(' · ');
    case 'area': return [planimetrie, pin].join(' · ');
    case 'planimetria': return pin;
    case 'da-collocare': return (c.planimetrie ?? 0) === 0 ? 'nessuna planimetria da collocare' : planimetrie;
    default: return '';
  }
}

/** Il suggerimento dei conteggi: i passaggi e le note che stanno accanto ai pin; per l'Area anche la regola del conteggio. */
function suggerimentoConteggi(n: NodoGerarchiaDto): string | undefined {
  if (n.tipo === 'da-collocare' || n.tipo === 'infiltrazione' || n.tipo === 'area-dedalo') return undefined;
  const base = testoConteggiPin(n.conteggi.pin);
  return n.tipo === 'area' ? `${base} — ogni oggetto una volta, anche se sta su più versioni` : base;
}

// ---- le righe ----

/** I tipi con le loro etichette, in un oggetto statico (mai classi interpolate); un'area del dedalo non ha figli (nessuna planimetria). */
const NOME_RAMO: Record<TipoNodoGerarchia, { ramo: string }> = {
  citta: { ramo: 'Quartieri, aree e Palazzi' },
  quartiere: { ramo: 'Aree' },
  area: { ramo: 'Planimetrie' },
  planimetria: { ramo: '' },
  palazzo: { ramo: 'Aree' },
  infiltrazione: { ramo: '' },
  memento: { ramo: 'Dedali e strutture fisse' },
  dedalo: { ramo: 'Aree e archivio' },
  'area-dedalo': { ramo: '' },
  'da-collocare': { ramo: 'Planimetrie da collocare' },
};

/** Oltre questo numero di figli il corpo di un quartiere o di un Palazzo aperto ha un'area scorrevole sua (R11-27: un livello solo). */
const SOGLIA_SCORREVOLE = 8;
const CLASSE_SCORREVOLE = 'area-scorrevole max-h-[min(60vh,520px)] p-1';

interface Contesto { aperti: Set<string>; alterna: (k: string) => void; contenitori: ContenitoreColloca[]; onRicarica: () => Promise<void> }

const chiaveNodo = (n: NodoGerarchiaDto): string => `${n.tipo}:${n.chiave}`;
const idCorpo = (n: NodoGerarchiaDto): string => `albero-${n.tipo}-${n.chiave.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

function haCorpo(n: NodoGerarchiaDto): boolean {
  if (n.tipo === 'da-collocare') return (n.daCollocare?.length ?? 0) > 0;
  return n.figli.length > 0 || (n.accanto?.length ?? 0) > 0 || (n.senzaArea?.length ?? 0) > 0;
}

/** La miniatura del nodo: il segno del Palazzo, altrimenti l'immagine del server (e lo stemma dove la mappa non ne ha una, come altrove). */
function Miniatura({ nodo }: { nodo: NodoGerarchiaDto }) {
  if (nodo.tipo === 'palazzo' || nodo.tipo === 'memento' || nodo.tipo === 'dedalo') return <span className="flex w-12 shrink-0 justify-center"><EmblemaDungeon chiave={nodo.chiave} nome={nodo.nome} dimensione={36} /></span>;
  if (nodo.tipo === 'da-collocare' || nodo.tipo === 'infiltrazione' || nodo.tipo === 'area-dedalo') return null;
  // la chiave serve solo allo stemma di riserva di Tokyo e del Covo (`AnteprimaMappa`)
  const chiave = nodo.tipo === 'citta' ? 'tokyo' : nodo.tipo === 'area' ? nodo.slug : nodo.tipo === 'planimetria' ? nodo.chiave : undefined;
  return <AnteprimaMappa mappa={{ immagineUrl: nodo.immagine?.immagineUrl ?? null, asset: nodo.immagine?.asset ?? null, nome: nodo.nome, chiave }} className="h-9 w-12 shrink-0" sizes="48px" />;
}

/** I segni accanto al nome: «Da verificare», «Non ancora aperto». */
function Segni({ nodo }: { nodo: NodoGerarchiaDto }) {
  return <>
    {nodo.daVerificare && <span className="chip chip--attivo text-[11px]" title="Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla">Da verificare</span>}
    {nodo.disponibile === false && <span className="chip text-[11px]" title={nodo.bloccoMotivo ?? undefined}>Non ancora aperto</span>}
  </>;
}

/** Le infiltrazioni, ciascuna un collegamento alla sua casa, in una riga che va a capo. */
function Infiltrazioni({ titolo, elenco }: { titolo: string; elenco: NodoGerarchiaDto[] }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-2 text-[12px] text-text-secondary">
      <span className="text-text-muted">{titolo}</span>
      {elenco.map((i, k) => <Fragment key={i.chiave}>
        {k > 0 && <span aria-hidden className="text-text-muted">·</span>}
        {i.casa ? <Link to={i.casa} className="touch inline-flex min-w-0 items-center break-words">{i.nome}</Link> : <span>{i.nome}</span>}
      </Fragment>)}
    </p>
  );
}

/** Una riga con il suo ramo (se aperto): `livello` 0 sono le radici (Tokyo e il Memento), 1 quartieri, Palazzi e dedali, 2 aree, 3 planimetrie. */
function Riga({ nodo, livello, ctx, totali }: { nodo: NodoGerarchiaDto; livello: number; ctx: Contesto; totali: GerarchiaMappeDto['totali'] }) {
  const k = chiaveNodo(nodo);
  const corpo = haCorpo(nodo);
  const aperto = corpo && ctx.aperti.has(k);
  const conteggi = testoConteggi(nodo);
  const contenuto = (
    <>
      <Miniatura nodo={nodo} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={`min-w-0 break-words font-semibold ${livello === 0 ? 'font-display text-[18px] uppercase leading-tight' : ''}`}>{nodo.nome}</span>
          <Segni nodo={nodo} />
        </span>
        {conteggi && <span className="break-words text-[11px] leading-tight text-text-muted" title={suggerimentoConteggi(nodo)}>{conteggi}</span>}
      </span>
    </>
  );
  return (
    <li className="min-w-0">
      <div className="flex items-center">
        {corpo
          ? <button type="button" className="touch inline-flex w-11 shrink-0 items-center justify-center text-text-muted" aria-expanded={aperto} aria-controls={aperto ? idCorpo(nodo) : undefined}
              aria-label={`${aperto ? 'Chiudi' : 'Apri'} ${nodo.nome}`} onClick={() => ctx.alterna(k)}><span aria-hidden>{aperto ? '▾' : '▸'}</span></button>
          : <span className="w-11 shrink-0" aria-hidden />}
        {nodo.casa
          ? <Link to={nodo.casa} className="touch flex min-w-0 flex-1 items-center gap-2 py-0.5 text-text no-underline hover:text-primary">{contenuto}</Link>
          : <div className="touch flex min-w-0 flex-1 items-center gap-2 py-0.5">{contenuto}</div>}
      </div>
      {aperto && <Corpo nodo={nodo} livello={livello} ctx={ctx} totali={totali} />}
    </li>
  );
}

/** I figli di un nodo aperto, con i gruppi di Tokyo, le infiltrazioni dei Palazzi e «Da collocare». */
function Corpo({ nodo, livello, ctx, totali }: { nodo: NodoGerarchiaDto; livello: number; ctx: Contesto; totali: GerarchiaMappeDto['totali'] }) {
  const id = idCorpo(nodo);
  if (nodo.tipo === 'da-collocare') {
    return <div id={id} className="pl-3"><PlanimetrieDaCollocare elenco={nodo.daCollocare ?? []} contenitori={ctx.contenitori} onCollocata={ctx.onRicarica} /></div>;
  }
  if (nodo.tipo === 'citta') return <div id={id} className="pl-3"><GruppiDiTokyo nodo={nodo} livello={livello} ctx={ctx} totali={totali} /></div>;
  const scorrevole = livello === 1 && nodo.figli.length > SOGLIA_SCORREVOLE;
  return (
    <div id={id} className="flex flex-col gap-0.5 pl-3">
      {nodo.tipo === 'area' && (nodo.accanto?.length ?? 0) > 0 && <div className="pl-11"><Infiltrazioni titolo="Infiltrazioni:" elenco={nodo.accanto ?? []} /></div>}
      {nodo.figli.length > 0 && (
        <ul className={`m-0 list-none p-0 ${scorrevole ? CLASSE_SCORREVOLE : ''}`} aria-label={`${NOME_RAMO[nodo.tipo].ramo} di ${nodo.nome}`}>
          {nodo.figli.map((f) => <Riga key={chiaveNodo(f)} nodo={f} livello={livello + 1} ctx={ctx} totali={totali} />)}
        </ul>
      )}
      {nodo.tipo === 'palazzo' && (nodo.senzaArea?.length ?? 0) > 0 && <div className="pl-11 pt-1"><Infiltrazioni titolo={`Infiltrazioni senza area (${nodo.senzaArea?.length ?? 0}):`} elenco={nodo.senzaArea ?? []} /></div>}
    </div>
  );
}

/** Sotto Tokyo i figli stanno in gruppi con un'intestazione, dedotta dal tipo dei figli consecutivi (il DTO non ha un nodo «gruppo»). */
function GruppiDiTokyo({ nodo, livello, ctx, totali }: { nodo: NodoGerarchiaDto; livello: number; ctx: Contesto; totali: GerarchiaMappeDto['totali'] }) {
  const gruppi: Array<{ titolo: string; sottotitolo: string; nodi: NodoGerarchiaDto[] }> = [];
  for (const f of nodo.figli) {
    const titolo = f.tipo === 'quartiere' ? `Quartieri · ${totali.quartieri}` : f.tipo === 'palazzo' ? `Palazzi · ${totali.palazzi}` : f.daVerificare ? 'Da verificare' : 'Aree della città';
    const sottotitolo = f.tipo === 'quartiere' ? `${parola(totali.areeMondo, 'area', 'aree')} · ${parola(totali.planimetrieMondo, 'planimetria', 'planimetrie')}`
      : f.tipo === 'palazzo' ? `${parola(totali.areePalazzi, 'area', 'aree')} · ${parola(totali.planimetriePalazzi, 'planimetria', 'planimetrie')}` : '';
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.titolo === titolo) ultimo.nodi.push(f);
    else gruppi.push({ titolo, sottotitolo, nodi: [f] });
  }
  return <>{gruppi.map((g): ReactNode => (
    <section key={g.titolo} className="flex flex-col gap-0.5 pt-2" aria-label={g.titolo}>
      <h3 className="m-0 flex flex-wrap items-baseline gap-x-2 pl-1 font-display text-[13px] uppercase leading-tight text-text-secondary">
        {g.titolo}{g.sottotitolo && <span className="font-body text-[11px] normal-case text-text-muted">{g.sottotitolo}</span>}
      </h3>
      <ul className="m-0 list-none p-0">
        {g.nodi.map((f) => <Riga key={chiaveNodo(f)} nodo={f} livello={livello + 1} ctx={ctx} totali={totali} />)}
      </ul>
    </section>
  ))}</>;
}

/** Dove si può collocare una planimetria: i quartieri e i Palazzi dell'albero, con le loro aree già note (nessuna chiamata in più). */
function contenitoriDa(radici: NodoGerarchiaDto[]): ContenitoreColloca[] {
  const out: ContenitoreColloca[] = [];
  for (const r of radici) {
    for (const f of r.figli) {
      if (f.tipo !== 'quartiere' && f.tipo !== 'palazzo') continue;
      out.push({
        tipo: f.tipo === 'quartiere' ? 'quartiere' : 'dungeon', chiave: f.chiave, nome: f.nome, mappa: f.mappa,
        aree: f.figli.filter((a) => a.tipo === 'area' && a.slug).map((a) => ({ slug: a.slug as string, nome: a.nome })),
      });
    }
  }
  return out;
}

/** L'albero dei luoghi: le radici (Tokyo e, in fondo, «Da collocare») con i rami aperti ricordati nella sessione. */
export function AlberoGerarchia({ radici, totali, onRicarica }: { radici: NodoGerarchiaDto[]; totali: GerarchiaMappeDto['totali']; onRicarica: () => Promise<void> }) {
  const [aperti, setAperti] = useState<Set<string>>(leggiAperti);
  useEffect(() => { salvaAperti(aperti); }, [aperti]);
  const alterna = (k: string) => setAperti((prima) => {
    const dopo = new Set(prima);
    if (dopo.has(k)) dopo.delete(k); else dopo.add(k);
    return dopo;
  });
  const ctx: Contesto = { aperti, alterna, contenitori: contenitoriDa(radici), onRicarica };
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Luoghi della guida">
      {radici.map((r) => <Riga key={chiaveNodo(r)} nodo={r} livello={0} ctx={ctx} totali={totali} />)}
    </ul>
  );
}
