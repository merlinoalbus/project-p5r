// ============================================================
// IndiceLuoghi — il corpo di `/guida/mappe`: i «Luoghi della guida» come schede e griglia di carte (L11 B5, ridisegno «Schede e griglia»)
// ============================================================
//
// Intestazione compatta (titolo, una riga di sottotitolo, ricerca per nome), poi quattro schede — Città, Palazzi, Memento, Da collocare — con i
// totali del server nelle etichette, e sotto una griglia di carte (`GrigliaLuoghi`). La scheda sta nell'indirizzo (`?sezione=`) e il ramo
// scelto pure (`?ramo=quartiere:shibuya,area:centro`): «Aree (n)» scende di livello e «indietro» del browser risale; le briciole
// («Città › Shibuya › Centro») risalgono a un livello qualunque. Scorre solo la pagina: nessuna area scorrevole annidata.
// Con un testo nella ricerca la griglia mostra i nodi che lo contengono nel nome, ciascuno col suo percorso in piccolo.
// ============================================================

import { useMemo, useState } from 'react';
import { GrigliaLuoghi, ChipConteggi, Infiltrazioni, SegniNodo, type VoceLuogo } from './GrigliaLuoghi';
import { etichettaScendi, parola } from './paroleLuoghi';
import { PlanimetrieDaCollocare } from './PlanimetrieDaCollocare';
import type { ContenitoreColloca } from './FinestraCollocaPlanimetria';
import { PageState } from '../shared/PageState';
import { IntestazionePagina } from '../shared/IntestazionePagina';
import { CampoRicerca } from '../shared/CampoRicerca';
import { FilaScorrevole } from '../shared/FilaScorrevole';
import { CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { useSearchParams } from '../scheda/routerScheda';
import { useCarica } from '../../hooks/useCarica';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getGerarchiaMappe } from '../../services/api';
import { usePartitaStore } from '../../stores/partitaStore';
import { testoConteggiPin } from '../../utils/presentazioneMappa';
import type { GerarchiaMappeDto, NodoGerarchiaDto } from '../../types';

type Sezione = 'citta' | 'palazzi' | 'memento' | 'da-collocare';

/** Un oggetto statico (mai classi interpolate): il nome della radice di ogni scheda, per le briciole. */
const NOME_SEZIONE: Record<Sezione, string> = { citta: 'Città', palazzi: 'Palazzi', memento: 'Memento', 'da-collocare': 'Da collocare' };
/** Oltre questo numero di risultati la ricerca chiede di restringere (le immagini si caricano pigre, ma la pagina resta leggibile). */
const MASSIMO_RISULTATI = 200;

// ---- il ramo nell'indirizzo ----

/** Il segmento del ramo di un nodo: `tipo:chiave` (la chiave codificata, perché può contenere virgole e due punti). */
const segmento = (n: NodoGerarchiaDto): string => `${n.tipo}:${encodeURIComponent(n.chiave)}`;
const leggiRamo = (testo: string | null): string[] => (testo ? testo.split(',').filter(Boolean) : []);

/** I nodi del ramo, scendendo dall'inizio: si ferma al primo segmento che non trova (indirizzo vecchio o scritto a mano). */
function risolviRamo(inizio: NodoGerarchiaDto, ramo: string[]): NodoGerarchiaDto[] {
  const percorso: NodoGerarchiaDto[] = [];
  let corrente = inizio;
  for (const s of ramo) {
    const figlio = corrente.figli.find((f) => segmento(f) === s);
    if (!figlio) break;
    percorso.push(figlio);
    corrente = figlio;
  }
  return percorso;
}

// ---- la ricerca ----

interface Trovato { nodo: NodoGerarchiaDto; percorso: string; sezione: Sezione; ramo: string[] }

const normalizza = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Tutti i nodi dell'albero (figli, infiltrazioni accanto alle aree e senza area) col percorso dei nomi e la scheda/ramo da cui si raggiungono. */
function appiattisci(radici: NodoGerarchiaDto[]): Trovato[] {
  const out: Trovato[] = [];
  const visti = new Set<string>();
  const visita = (n: NodoGerarchiaDto, antenati: string[], sezione: Sezione, ramo: string[]) => {
    out.push({ nodo: n, percorso: antenati.join(' › '), sezione, ramo });
    const nomi = [...antenati, n.nome];
    for (const f of n.figli) visita(f, nomi, n.tipo === 'citta' && f.tipo === 'palazzo' ? 'palazzi' : sezione, [...ramo, segmento(f)]);
    for (const i of [...(n.accanto ?? []), ...(n.senzaArea ?? [])]) {
      const k = `${i.tipo}:${i.chiave}`;
      if (visti.has(k)) continue;
      visti.add(k);
      out.push({ nodo: i, percorso: nomi.join(' › '), sezione, ramo });
    }
  };
  for (const r of radici) if (r.tipo !== 'da-collocare') visita(r, [], r.tipo === 'memento' ? 'memento' : 'citta', []);
  return out;
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

// ---- pezzi della pagina ----

/** L'intestazione di un gruppo di carte: sta su uno sfondo suo (mai il testo direttamente sull'immagine decorativa). */
function TitoloGruppo({ titolo, dettaglio }: { titolo: string; dettaglio?: string }) {
  return (
    <h2 className="m-0 inline-flex max-w-full flex-wrap items-baseline gap-x-2 self-start rounded-md bg-bg-secondary px-3 py-1.5 font-display testo-15 uppercase leading-tight text-text">
      {titolo}{dettaglio && <span className="font-body testo-12 normal-case text-text-secondary">{dettaglio}</span>}
    </h2>
  );
}

function Gruppo({ titolo, dettaglio, voci }: { titolo: string; dettaglio?: string; voci: VoceLuogo[] }) {
  if (voci.length === 0) return null;
  return <section className="flex flex-col gap-2" aria-label={titolo}><TitoloGruppo titolo={titolo} dettaglio={dettaglio} /><GrigliaLuoghi voci={voci} etichetta={titolo} /></section>;
}

/** Le briciole: la radice della scheda e i nodi del ramo, ognuno (tranne l'ultimo) un pulsante che risale a quel livello. */
function Briciole({ sezione, percorso, vai }: { sezione: Sezione; percorso: NodoGerarchiaDto[]; vai: (ramo: string[]) => void }) {
  const voci = [{ nome: NOME_SEZIONE[sezione], ramo: [] as string[] }, ...percorso.map((n, i) => ({ nome: n.nome, ramo: percorso.slice(0, i + 1).map(segmento) }))];
  return (
    <nav aria-label="Percorso" className="card p-1.5">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 p-0 testo-14">
        {voci.map((v, i) => {
          const ultima = i === voci.length - 1;
          return <li key={v.ramo.join(',') || 'radice'} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-text-secondary">›</span>}
            {ultima
              ? <span aria-current="page" className="inline-flex min-h-[44px] items-center px-2 font-semibold text-text">{v.nome}</span>
              : <button type="button" className="touch inline-flex items-center rounded px-2 text-text-secondary hover:text-primary-testo" onClick={() => vai(v.ramo)}>{v.nome}</button>}
          </li>;
        })}
      </ol>
    </nav>
  );
}

/** La testata del livello sceso: nome, segni, conteggi e «Apri» del nodo di cui si vedono i figli. */
function TestataLivello({ nodo }: { nodo: NodoGerarchiaDto }) {
  return (
    <section className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-3" aria-label={nodo.nome}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="m-0 break-words font-display testo-20 leading-tight text-text">{nodo.nome}</h2>
        <SegniNodo nodo={nodo} />
        <ChipConteggi nodo={nodo} />
        {nodo.tipo === 'area' && (nodo.accanto?.length ?? 0) > 0 && <Infiltrazioni titolo="Infiltrazioni:" elenco={nodo.accanto ?? []} />}
      </div>
      {nodo.casa && <CollegamentoVisivo to={nodo.casa} tono="primario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri" aria-label={`Apri ${nodo.nome}`} />}
    </section>
  );
}

/** Il corpo della pagina `/guida/mappe` senza chiave: i luoghi della guida. */
export function IndiceLuoghi() {
  useDocumentTitle('Luoghi della guida');
  const attiva = usePartitaStore((s) => s.attiva);
  const gerarchia = useCarica(() => getGerarchiaMappe(attiva?.id), [attiva?.id]);
  const g = gerarchia.dati;
  const [params, setParams] = useSearchParams();
  const [ricerca, setRicerca] = useState('');

  const tokyo = g?.radici.find((r) => r.tipo === 'citta');
  const memento = g?.radici.find((r) => r.tipo === 'memento');
  const daCollocare = g?.radici.find((r) => r.tipo === 'da-collocare');
  const richiesta = params.get('sezione');
  const sezione: Sezione = richiesta === 'palazzi' || richiesta === 'da-collocare' || (richiesta === 'memento' && memento) ? richiesta : 'citta';
  const ramo = leggiRamo(params.get('ramo'));

  /** Cambia scheda e ramo nell'indirizzo; le scese entrano nella cronologia (così «indietro» risale), il cambio di scheda la sostituisce. */
  const vai = (nuova: Sezione, nuovoRamo: string[], sostituisci = false) => {
    const p = new URLSearchParams(params);
    if (nuova === 'citta') p.delete('sezione'); else p.set('sezione', nuova);
    if (nuovoRamo.length > 0) p.set('ramo', nuovoRamo.join(',')); else p.delete('ramo');
    setParams(p, { replace: sostituisci });
  };

  const trovati = useMemo(() => (g ? appiattisci(g.radici) : []), [g]);
  const testoCercato = normalizza(ricerca);

  const schede: Array<{ chiave: Sezione; etichetta: string }> = g ? [
    { chiave: 'citta', etichetta: `Città (${parola(g.totali.quartieri, 'quartiere', 'quartieri')})` },
    { chiave: 'palazzi', etichetta: `Palazzi (${g.totali.palazzi})` },
    ...(memento ? [{ chiave: 'memento' as const, etichetta: `Memento (${parola(g.totali.dedali ?? memento.figli.length, 'dedalo', 'dedali')})` }] : []),
    { chiave: 'da-collocare', etichetta: `Da collocare (${g.totali.daCollocare})` },
  ] : [];

  return <div className="flex flex-col gap-2">
    {/* niente sottotitolo: le schede subito sotto dicono già che cosa c'è (Città, Palazzi, Memento, Da collocare) */}
    {/* la ricerca sta nella riga del titolo (a destra, o sotto il titolo sul telefono) e le schede da sole nella riga sotto:
        così l'intestazione resta entro il 30% dell'altezza a ogni formato */}
    <IntestazionePagina compatta titolo="Luoghi della guida"
      azioni={g && <div className="flex w-full min-w-[220px] md:w-72"><CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca un luogo" /></div>} />
    <PageState isLoading={gerarchia.inPrimoCaricamento} error={gerarchia.errore} onRetry={gerarchia.ricarica}>
      {g && <>
        <FilaScorrevole role="tablist" aria-label="Sezioni dei luoghi" title={testoConteggiPin(g.totali.pin)}>
          {schede.map((s) => <button key={s.chiave} type="button" role="tab" aria-selected={sezione === s.chiave && testoCercato === ''}
            className={`chip touch ${sezione === s.chiave && testoCercato === '' ? 'chip--attivo' : ''}`}
            onClick={() => { setRicerca(''); vai(s.chiave, [], true); }}>{s.etichetta}</button>)}
        </FilaScorrevole>
        {testoCercato !== ''
          ? <Risultati trovati={trovati} testo={testoCercato} scendi={(t) => { setRicerca(''); vai(t.sezione, t.ramo); }} />
          : <Scheda g={g} sezione={sezione} ramo={ramo} tokyo={tokyo} memento={memento} daCollocare={daCollocare} vai={vai} onRicarica={gerarchia.ricarica} />}
      </>}
    </PageState>
  </div>;
}

/** I nodi che hanno il testo nel nome, come carte col percorso in piccolo. */
function Risultati({ trovati, testo, scendi }: { trovati: Trovato[]; testo: string; scendi: (t: Trovato) => void }) {
  const corrispondenti = trovati.filter((t) => normalizza(t.nodo.nome).includes(testo));
  if (corrispondenti.length === 0) return <p className="card m-0 p-3 text-text-secondary" role="status">Nessun luogo con questo nome.</p>;
  const mostrati = corrispondenti.slice(0, MASSIMO_RISULTATI);
  const voci: VoceLuogo[] = mostrati.map((t) => ({ nodo: t.nodo, percorso: t.percorso || undefined, onScendi: etichettaScendi(t.nodo) ? () => scendi(t) : undefined }));
  return <section className="flex flex-col gap-2" aria-label="Risultati della ricerca">
    <TitoloGruppo titolo="Risultati" dettaglio={parola(corrispondenti.length, 'luogo', 'luoghi')} />
    <GrigliaLuoghi voci={voci} etichetta="Risultati della ricerca" />
    {corrispondenti.length > mostrati.length && <p className="card m-0 p-3 testo-13 text-text-secondary" role="status">Mostrati i primi {MASSIMO_RISULTATI} luoghi su {corrispondenti.length}: scrivi di più per restringere.</p>}
  </section>;
}

/** Il contenuto della scheda scelta: la radice con i suoi gruppi, oppure il ramo sceso con briciole, testata e figli. */
function Scheda({ g, sezione, ramo, tokyo, memento, daCollocare, vai, onRicarica }: {
  g: GerarchiaMappeDto; sezione: Sezione; ramo: string[]; tokyo?: NodoGerarchiaDto; memento?: NodoGerarchiaDto; daCollocare?: NodoGerarchiaDto;
  vai: (s: Sezione, ramo: string[]) => void; onRicarica: () => Promise<void>;
}) {
  if (sezione === 'da-collocare') {
    const elenco = daCollocare?.daCollocare ?? [];
    return <section className="flex flex-col gap-2" aria-label="Da collocare">
      <TitoloGruppo titolo="Planimetrie da collocare" dettaglio={elenco.length === 0 ? 'nessuna planimetria da collocare' : parola(elenco.length, 'planimetria', 'planimetrie')} />
      {elenco.length > 0 && <div className="card p-3"><PlanimetrieDaCollocare elenco={elenco} contenitori={contenitoriDa(g.radici)} onCollocata={onRicarica} /></div>}
    </section>;
  }
  const inizio = sezione === 'memento' ? memento : tokyo;
  if (!inizio) return <p className="card m-0 p-3 text-text-secondary" role="status">Nessun luogo in questa sezione.</p>;
  const percorso = risolviRamo(inizio, ramo);
  const scendiDa = (base: NodoGerarchiaDto[], f: NodoGerarchiaDto): VoceLuogo => ({
    nodo: f, onScendi: etichettaScendi(f) ? () => vai(sezione, [...base.map(segmento), segmento(f)]) : undefined,
  });

  if (percorso.length > 0) {
    const corrente = percorso[percorso.length - 1];
    return <div className="flex flex-col gap-3">
      <Briciole sezione={sezione} percorso={percorso} vai={(r) => vai(sezione, r)} />
      <TestataLivello nodo={corrente} />
      {corrente.figli.length > 0
        ? <GrigliaLuoghi voci={corrente.figli.map((f) => scendiDa(percorso, f))} etichetta={etichettaScendi(corrente) ?? corrente.nome} />
        : <p className="card m-0 p-3 text-text-secondary" role="status">Nessun elemento sotto questo livello.</p>}
      {corrente.tipo === 'palazzo' && (corrente.senzaArea?.length ?? 0) > 0 &&
        <div className="card p-3"><Infiltrazioni titolo={`Infiltrazioni senza area (${corrente.senzaArea?.length ?? 0}):`} elenco={corrente.senzaArea ?? []} /></div>}
    </div>;
  }

  if (sezione === 'palazzi') {
    const palazzi = inizio.figli.filter((f) => f.tipo === 'palazzo');
    return <Gruppo titolo={`Palazzi · ${g.totali.palazzi}`} dettaglio={`${parola(g.totali.areePalazzi, 'area', 'aree')} · ${parola(g.totali.planimetriePalazzi, 'planimetria', 'planimetrie')}`} voci={palazzi.map((f) => scendiDa([], f))} />;
  }
  if (sezione === 'memento') {
    return <div className="flex flex-col gap-4">
      <Gruppo titolo={inizio.nome} voci={[{ nodo: inizio }]} />
      <Gruppo titolo="Dedali e strutture fisse" voci={inizio.figli.map((f) => scendiDa([], f))} />
    </div>;
  }
  const quartieri = inizio.figli.filter((f) => f.tipo === 'quartiere');
  const aree = inizio.figli.filter((f) => f.tipo !== 'quartiere' && f.tipo !== 'palazzo' && !f.daVerificare);
  const daVerificare = inizio.figli.filter((f) => f.tipo !== 'quartiere' && f.tipo !== 'palazzo' && f.daVerificare);
  return <div className="flex flex-col gap-4">
    <Gruppo titolo={`Quartieri · ${g.totali.quartieri}`} dettaglio={`${parola(g.totali.areeMondo, 'area', 'aree')} · ${parola(g.totali.planimetrieMondo, 'planimetria', 'planimetrie')}`} voci={quartieri.map((f) => scendiDa([], f))} />
    <Gruppo titolo="Aree della città" voci={aree.map((f) => scendiDa([], f))} />
    <Gruppo titolo="Da verificare" voci={daVerificare.map((f) => scendiDa([], f))} />
  </div>;
}
