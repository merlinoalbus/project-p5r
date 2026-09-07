// ============================================================
// DungeonDettaglioPage — la scheda di un Palazzo
// ============================================================
//
// È la pagina che si apre cliccando una carta in «Palazzi», ed è stata rifatta perché era una
// scheda con delle liste: un blocco di testo in cima, una fila di diciotto pastiglie da scorrere
// per scegliere l'area, e due colonne che sotto i 1024 px diventavano un nastro lunghissimo.
//
// Tre cose sono cambiate, e ognuna risolve un problema che si vedeva usandola.
//
// **L'intestazione dice il tempo, non lo elenca.** In Persona 5 un Palazzo è una scadenza: si apre
// un giorno, conviene rubare il Tesoro entro un altro, e il giorno dopo la scadenza è finita la
// partita. Prima erano tre pastiglie in fila fra le altre, e sotto le stesse tre date ripetute per
// esteso. Ora sono una **linea del tempo** in tre tappe, dove si legge in un colpo d'occhio a che
// punto si è; la prosa della guida resta, ripiegata, sotto.
//
// **Le aree sono un elenco, non una fila da scorrere.** Diciotto pastiglie in orizzontale
// nascondono la diciottesima e non dicono a che punto si è in ciascuna. Da 1024 px in su sono una
// colonna fissa a sinistra, con il numero, il nome e quanti punti restano; sotto restano una fila
// scorrevole, che su un telefono è la forma giusta.
//
// **Il tre colonne è progressivo.** Oltre i 1280 px: aree, mappa, punti. Fra 1024 e 1280: aree a
// lato, e sotto la mappa i punti. Sul telefono: aree, mappa, punti, uno sotto l'altro — e la lista
// dei punti non ha più un'altezza fissa che creava un secondo scorrimento dentro la pagina.
//
// I Memento restano il caso a parte che sono: non hanno aree fisse — i piani si generano a ogni
// discesa — e al posto della colonna delle aree c'è il pozzo disegnato, con la stessa selezione.
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDungeon, impostaStatoPunto, scaricaPianta } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { segnaImmaginePresente } from '../components/shared/immaginiCache';
import { IconChevronLeft } from '../components/shared/icons';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { dataBreve } from '../utils/testoBreve';
import { COLORE_TIPO, NOME_TIPO } from '../utils/dungeon';
import { eCollezionabile } from '../../shared/puntiDungeon';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto } from '../types';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { MappaMemento } from '../components/mappe/MappaMemento';
import { urlStratoDedalo } from '../components/mappe/stratiMemento';

const TIPI = Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][];

function Dettagli({ d }: { d: Record<string, unknown> }) {
  const voci = Object.entries(d).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
  if (voci.length === 0) return null;
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
      {voci.map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-text-muted capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd className="m-0">{Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
      ))}
    </dl>
  );
}

/** Le tre date di un Palazzo come una linea, non come tre pastiglie sparse.
 *
 * Sono una sequenza — si apre, conviene rubare, scade — e messe in fila si legge la finestra
 * invece di leggere tre fatti separati. La data breve sta in grande, la prosa della guida nel
 * `title`: «12 Aprile (Martedì) — prima infiltrazione esplorativa» è la spiegazione, non
 * l'informazione che serve quando si guarda la pagina di corsa. */
function LineaDelTempo({ date }: { date: DungeonDettaglioDto['date'] }) {
  const tappe = [
    { chiave: 'sblocco', etichetta: 'Si apre', valore: date.sblocco, tono: 'bg-white/10 text-text' },
    { chiave: 'furto', etichetta: 'Furto consigliato', valore: date.furtoConsigliato, tono: 'bg-[#f5c542]/15 text-[#f5c542]' },
    { chiave: 'scadenza', etichetta: 'Scade', valore: date.scadenza, tono: 'bg-primary/20 text-primary' },
  ].filter((t) => !!t.valore);
  if (tappe.length === 0) return null;
  return (
    <ol className="m-0 flex list-none flex-wrap items-stretch gap-1.5 p-0" aria-label="Finestra del Palazzo">
      {tappe.map((t, i) => (
        <li key={t.chiave} className="flex items-stretch gap-1.5">
          {i > 0 && <span aria-hidden className="self-center text-text-muted">→</span>}
          <span className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 ${t.tono}`} title={t.valore!}>
            <span className="text-[10px] uppercase tracking-[0.08em] opacity-80">{t.etichetta}</span>
            <span className="font-display text-[17px] leading-none">{dataBreve(t.valore!)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Una voce dell'elenco delle aree: numero, nome, e quanto ne resta. */
function VoceArea({ a, scelta, suggerita, onScegli, compatta }: {
  a: AreaDungeonDto; scelta: boolean; suggerita: boolean; onScegli: () => void; compatta?: boolean;
}) {
  // Quel che resta **da raccogliere**, la stessa misura dell'anello in cima: la colonna diceva
  // «5 da vedere su 6» contando anche sicure, scorciatoie e boss, cioè una cosa diversa da quella
  // che la percentuale del Palazzo misura due centimetri più in alto.
  const raccogliere = a.punti.filter((p) => eCollezionabile(p.tipo));
  const restano = raccogliere.filter((p) => !p.stato).length;
  if (compatta) {
    return (
      <button type="button" role="tab" aria-selected={scelta} onClick={onScegli} title={a.descrizione}
        className={`chip touch shrink-0 ${scelta ? 'chip--attivo' : ''} ${classiSuggerito(suggerita, 'chip')}`}>
        {a.ordine + 1}. {a.nome}{a.mappa ? ' 🗺' : ''}
      </button>
    );
  }
  return (
    <button type="button" role="tab" aria-selected={scelta} onClick={onScegli} title={a.descrizione}
      className={`touch flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        scelta ? 'border-primary bg-primary-bg text-text' : 'border-border-light bg-white/[0.02] text-text-secondary hover:border-border hover:bg-white/[0.05] hover:text-text'
      } ${classiSuggerito(suggerita)}`}>
      <span className={`mt-[1px] w-6 shrink-0 text-right font-display text-[15px] leading-tight ${scelta ? 'text-primary' : 'text-text-muted'}`}>{a.ordine + 1}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold leading-tight">{a.nome}</span>
        <span className="text-[11px] text-text-muted">
          {raccogliere.length === 0 ? 'niente da raccogliere' : restano > 0 ? `${restano} da prendere su ${raccogliere.length}` : `${raccogliere.length} raccolti · completa`}
          {a.mappa || a.pianta ? ' · pianta' : ''}
        </span>
      </span>
    </button>
  );
}

export function DungeonDettaglioPage() {
  const sugg = useSuggerimenti();
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDungeon(chiave, partitaId ?? undefined), [chiave, partitaId]);
  useDocumentTitle(dati.dati ? dati.dati.nome : 'Palazzo');
  const d = dati.dati;
  const areaChiave = params.get('area') ?? d?.aree[0]?.chiave ?? null;
  const area: AreaDungeonDto | null = useMemo(() => d?.aree.find((a) => a.chiave === areaChiave) ?? d?.aree[0] ?? null, [d, areaChiave]);
  const [filtro, setFiltro] = useState<Set<PuntoInteresseDto['tipo']>>(new Set());
  const [mostraGestiti, setMostraGestiti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [mappaVersione, setMappaVersione] = useState(0);
  // ogni cambio di stato dall'elenco ricarica il visore (e viceversa il visore ricarica l'elenco)
  const [versioneStati, setVersioneStati] = useState(0);
  // Pianta pubblicata dalla guida ma non ancora nell'istanza: viene scaricata appena l'area è aperta (una richiesta per area)
  const download = useCarica(() => (area && !area.mappa && area.pianta ? scaricaPianta(area.chiave).then((r) => { segnaImmaginePresente('mappa', r.area); return r; }) : Promise.resolve(null)), [area?.chiave, area?.mappa, area?.pianta?.url]);
  const scaricata = !!area && !!download.dati && download.dati.area === area.chiave;
  // Credito della fonte davvero usata: quella registrata nell'immagine, oppure quella appena scaricata (principale o alternativa)
  const fonteUsata = area?.piantaScaricata ?? (scaricata && download.dati && area?.pianta
    ? { url: download.dati.url, fonte: download.dati.fonte, pagina: download.dati.url === area.pianta.url ? area.pianta.pagina : (area.pianta.alternative.find((x) => x.url === download.dati?.url)?.pagina ?? null) }
    : null);

  const puntiVisibili = useMemo(() => (area?.punti ?? []).filter((p) => (filtro.size === 0 || filtro.has(p.tipo)) && (mostraGestiti || !p.stato)), [area, filtro, mostraGestiti]);
  const gestitiArea = (area?.punti ?? []).filter((p) => p.stato).length;
  const raccogliereArea = useMemo(() => {
    const c = (area?.punti ?? []).filter((p) => eCollezionabile(p.tipo));
    return { totale: c.length, presi: c.filter((p) => p.stato).length };
  }, [area]);

  const aggiornaPunto = (nuovo: PuntoInteresseDto) => {
    if (!d) return;
    dati.imposta({ ...d, aree: d.aree.map((a) => ({ ...a, punti: a.punti.map((p) => (p.chiave === nuovo.chiave ? nuovo : p)) })) });
  };
  const cambiaStato = async (p: PuntoInteresseDto, stato: StatoPunto | null) => {
    if (!partitaId) return;
    try {
      aggiornaPunto(await impostaStatoPunto(partitaId, p.chiave, stato));
      setVersioneStati((v) => v + 1);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };
  // Quale planimetria dell'area si sta guardando. Quasi sempre ce n'è una sola; qualche area ne
  // ha due (una porzione e la pianta intera) e allora si sceglie. La scelta si azzera cambiando
  // area, altrimenti resterebbe una chiave che appartiene a un'altra.
  const [piantaScelta, setPianta] = useState<string | null>(null);
  const mappaScelta = area && area.mappe.some((m) => m.chiave === piantaScelta) ? piantaScelta : area?.mappe[0]?.chiave ?? null;
  // Quale delle due viste dell'area si sta guardando. Dove l'atlante non ha una planimetria
  // navigabile resta solo la pianta della guida, e non c'è niente da scegliere.
  const [vista, setVista] = useState<'gioco' | 'guida'>('gioco');
  // «Come la disegna il gioco» esiste dove c'è una planimetria d'atlante e, nei Memento, sempre:
  // lì il disegno è il pezzo del pozzo. Dove non c'è nulla del gioco resta la pianta della guida,
  // che è anche l'unico posto da cui si importa un'immagine propria.
  const vistaGiocoDisponibile = !!mappaScelta || d?.tipo === 'mementos';
  const vistaGuida = !vistaGiocoDisponibile || vista === 'guida';
  const scegliArea = (k: string) => { setParams({ area: k }); setSelezionato(null); setPianta(null); setVista('gioco'); };
  // La percentuale conta **quel che si raccoglie**: forzieri, forzieri chiusi, oggetti e Semi
  // della Bramosia. Prima era «punti gestiti su punti totali», e fra i punti totali ci sono le
  // sicure, le scorciatoie, gli enigmi e il boss: per arrivare al 100% bisognava spuntare anche
  // «Cancello del Castello». Vedi `shared/puntiDungeon.ts`.
  const quota = d && d.collezionabiliGestiti !== null && d.collezionabili > 0 ? d.collezionabiliGestiti / d.collezionabili : null;
  const memento = d?.tipo === 'mementos';
  // L'alone dorato distingue: quando il suggerimento del giorno è «esplora questo Palazzo», il
  // motore suggerisce **tutte** le sue aree, e diciotto voci tutte d'oro non distinguono niente —
  // sono solo diciotto bordi accesi che fanno sembrare l'elenco un blocco unico. In quel caso il
  // suggerimento resta vero, ma si dice una volta sola qui sopra invece che su ogni riga.
  const areeSuggerite = (d?.aree ?? []).filter((a) => sugg.evidenziato('aree', a.chiave)).length;
  const suggerimentoDiffuso = !!d && d.aree.length > 0 && areeSuggerite === d.aree.length;
  const areaSuggerita = (chiaveArea: string) => !suggerimentoDiffuso && sugg.evidenziato('aree', chiaveArea);
  // Le date per esteso valgono solo dove dicono **più** della data breve già in cima: «12 Aprile
  // (Martedì) — prima infiltrazione esplorativa» spiega, «12 Aprile» no.
  const tempoInProsa = !d ? [] : ([
    { etichetta: 'Si apre', valore: d.date.sblocco },
    { etichetta: 'Furto consigliato', valore: d.date.furtoConsigliato },
    { etichetta: 'Scade', valore: d.date.scadenza },
  ] as const).filter((t) => !!t.valore && t.valore !== dataBreve(t.valore));

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && area && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>

          {/* ---- Intestazione: l'emblema grande, il nome, il tempo ---- */}
          <header className="card relative overflow-hidden">
            {/* L'emblema una seconda volta, enorme e appena visibile: fa da fondo alla scheda senza
                aggiungere un'immagine che non c'è. È decorativo, quindi non lo legge nessuno. */}
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 hidden opacity-[0.07] sm:block">
              <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={280} />
            </span>
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
              <div className="flex shrink-0 items-center gap-3 sm:flex-col">
                <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={96} />
                {quota !== null && (
                  <AnelloAvanzamento quota={quota} dimensione={64} spessore={5} etichetta={`Avanzamento in ${d.nome}: ${d.collezionabiliGestiti} da raccogliere presi su ${d.collezionabili}`}>
                    <span className="font-display text-[17px] leading-none tabular-nums">{Math.round(quota * 100)}%</span>
                  </AnelloAvanzamento>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <h1 className="titolo-display m-0 break-words">{d.nome}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                    {d.sovrano && <span className="break-words">{d.sovrano}</span>}
                    {d.arcanaSovranoNome && <span className="chip chip--attivo">{d.arcanaSovranoNome}</span>}
                  </div>
                </div>
                <LineaDelTempo date={d.date} />
                <div className="flex flex-wrap items-center gap-2">
                  <CollegamentoMappa tipo="dungeon" chiave={d.chiave} testo="Mappa del Palazzo" />
                  <span className="chip">{d.aree.length} aree</span>
                  {/* Prima di ogni altro conto: quanto c'è da raccogliere qui dentro, che è la
                      cifra su cui è calcolata la percentuale dell'anello. Il totale dei punti
                      resta, ma detto per quello che è — tutto compreso, sicure e boss. */}
                  <span className="chip" title="Forzieri, forzieri chiusi, oggetti a terra e Semi della Bramosia: sono questi a fare la percentuale.">{d.collezionabili} da raccogliere</span>
                  <span className="chip">{d.esauribili} esauribili</span>
                  <span className="chip" title="Comprese sicure, scorciatoie, enigmi, incontri e boss.">{d.punti} punti in tutto</span>
                  {d.gestiti !== null && <span className="chip">{d.gestiti} segnati</span>}
                  {/* Quando il suggerimento del giorno riguarda tutto il Palazzo lo si dice qui,
                      una volta, invece di accendere d'oro tutte le aree dell'elenco. */}
                  {suggerimentoDiffuso && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                </div>
                {/* **Una piega sola, chiusa.** Qui c'erano cinque righe di prosa grigia una sotto
                    l'altra — livello consigliato, e poi le tre date già scritte in grande nella
                    linea del tempo, ripetute per esteso, e le note — che occupavano metà
                    dell'intestazione per dire cose che si leggono una volta sola in tutta la
                    partita. Restano tutte, ma dietro una riga: quando servono si aprono. */}
                {(d.livelloConsigliato || d.note || tempoInProsa.length > 0) && <details className="text-[12px]">
                  <summary className="touch cursor-pointer text-text-muted">Dettagli dalla guida</summary>
                  <div className="flex flex-col gap-1 pt-1.5">
                    {d.livelloConsigliato && <TestoRipiegabile testo={`Livello consigliato: ${d.livelloConsigliato}`} massimo={120} className="text-[13px] text-text-secondary" />}
                    {tempoInProsa.map((t) => <TestoRipiegabile key={t.etichetta} testo={`${t.etichetta}: ${t.valore}`} massimo={90} className="text-[12px] text-text-muted" />)}
                    {d.note && <TestoRipiegabile testo={d.note} massimo={140} className="text-[12px] text-text-muted whitespace-pre-wrap" />}
                  </div>
                </details>}
              </div>
            </div>
          </header>

          <div className={`grid grid-cols-1 items-start gap-4 ${memento ? 'xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]' : 'lg:grid-cols-[248px_minmax(0,1fr)]'}`}>
            {/* ---- Le aree: colonna da 1024 px in su, fila scorrevole sotto ---- */}
            {!memento && (
              <nav className="contents lg:block" aria-label="Aree del Palazzo">
                <FilaScorrevole className="items-center lg:hidden" role="tablist" aria-label="Aree">
                  {d.aree.map((a) => <VoceArea key={a.chiave} a={a} compatta scelta={a.chiave === area.chiave} suggerita={areaSuggerita(a.chiave)} onScegli={() => scegliArea(a.chiave)} />)}
                </FilaScorrevole>
                {/* Un dito di aria fra una voce e l'altra: a 2 px di distacco diciotto riquadri
                    bordati si leggono come un unico blocco rigato, ed era esattamente l'effetto
                    che si vedeva quando ogni voce aveva anche il bordo dorato del suggerimento. */}
                <div className="card hidden max-h-[min(70vh,720px)] flex-col gap-1.5 overflow-y-auto p-2 lg:flex" role="tablist" aria-label="Aree">
                  {d.aree.map((a) => <VoceArea key={a.chiave} a={a} scelta={a.chiave === area.chiave} suggerita={areaSuggerita(a.chiave)} onScegli={() => scegliArea(a.chiave)} />)}
                </div>
              </nav>
            )}
            {/* I Memento non sono un Palazzo con delle aree: sono una discesa di nove dedali, e il
                gioco li presenta così. Al posto della colonna delle aree, il pozzo disegnato — e
                sta **nella colonna**, non a tutta pagina sopra tutto il resto: a piena larghezza
                il pozzo è alto quanto la finestra (16:10 di 1600 px fanno 1000 px di altezza) e
                per arrivare al dedalo scelto bisognava scorrere due schermate. Il tetto è scritto
                sulla larghezza perché con `aspect-ratio` è la larghezza a decidere l'altezza. */}
            {memento && (
              <div className="flex min-w-0 flex-col gap-2">
                <MappaMemento aree={d.aree} selezionata={area.chiave} onSeleziona={scegliArea}
                  className="mx-auto w-[min(100%,calc(min(46vh,460px)*1.6))] xl:w-full" />
                <FilaScorrevole className="items-center" role="tablist" aria-label="Dedali">
                  {d.aree.map((a) => <VoceArea key={a.chiave} a={a} compatta scelta={a.chiave === area.chiave} suggerita={areaSuggerita(a.chiave)} onScegli={() => scegliArea(a.chiave)} />)}
                </FilaScorrevole>
              </div>
            )}

            {/* ---- L'area scelta: mappa e punti ---- */}
            <div className={`grid grid-cols-1 items-start gap-4 ${memento ? '2xl:grid-cols-[minmax(0,1fr)_320px]' : 'xl:grid-cols-[minmax(0,1fr)_352px]'}`}>
              <section className="card flex flex-col gap-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="m-0 font-display text-[19px] uppercase leading-none">{area.nome}</h2>
                  <span className="text-[12px] text-text-muted">area {area.ordine + 1} di {d.aree.length}</span>
                  <span className="flex-1" />
                  {/* **Due disegni della stessa stanza, e prima si vedevano tutti e due insieme**:
                      la miniatura della pianta della guida in cima, con accanto un paragrafo che
                      spiegava da dove viene, e sotto la planimetria del gioco, grande. La
                      miniatura non si legge e il paragrafo occupava il posto della mappa. Sono
                      due viste della stessa area: si sceglie quale guardare. */}
                  {vistaGiocoDisponibile && (
                    <div className="flex gap-1" role="tablist" aria-label="Come guardare l’area">
                      <button type="button" role="tab" aria-selected={!vistaGuida} onClick={() => setVista('gioco')}
                        className={`chip touch text-[11px] ${!vistaGuida ? 'chip--attivo' : ''}`}>{memento ? 'Come la disegna il gioco' : 'Planimetria del gioco'}</button>
                      <button type="button" role="tab" aria-selected={vistaGuida} onClick={() => setVista('guida')}
                        className={`chip touch text-[11px] ${vistaGuida ? 'chip--attivo' : ''}`}>Pianta della guida</button>
                    </div>
                  )}
                </div>
                {area.descrizione && <p className="m-0 text-[13px] text-text-secondary">{area.descrizione}</p>}
                {/* **Il pezzo con cui il gioco disegna il dedalo nel pozzo**, e non una pianta: i
                    piani dei Memento si generano a ogni discesa. Prima compariva solo dove la
                    guida non pubblicava niente, e così il Dedalo di Iweleth — l'unico che una
                    pianta ce l'ha — si presentava con un foglio bianco in mezzo a otto
                    raffigurazioni rosse: nove pagine sorelle, una diversa. Ora la raffigurazione
                    è la vista predefinita per tutti e nove, e la pianta della guida sta nella sua
                    scheda dove c'è. */}
                {memento && !vistaGuida && <span className="flex h-[min(46vh,420px)] w-full items-center justify-center overflow-hidden rounded bg-[#8d0012]">
                  <img src={urlStratoDedalo(area.ordine)} alt={`${area.nome}, come lo disegna il gioco`} className="max-h-full max-w-full object-contain" />
                </span>}
                <div className={`flex flex-wrap items-center gap-2 ${vistaGuida ? '' : 'hidden'}`}>
                  <ImmagineEntita key={`${area.chiave}-${mappaVersione}-${scaricata ? 's' : 'n'}`} ambito="mappa" chiave={area.chiave} etichetta={`Mappa: ${area.nome}`} dimensione={420} forma="orizzontale" modificabile className="mx-auto" />
                  <span className="min-w-[200px] flex-1 text-[11px] text-text-muted">
                    {fonteUsata ? (
                      <>
                        Pianta scaricata da <a href={fonteUsata.pagina ?? fonteUsata.url} target="_blank" rel="noreferrer" className="credito">{fonteUsata.fonte}</a>{area.pianta && fonteUsata.url === area.pianta.url && area.pianta.copertura === 'dungeon' ? ' (pianta dell’intero piano)' : ''}{area.pianta && fonteUsata.url !== area.pianta.url ? ' (fonte alternativa: la principale non era raggiungibile)' : ''}, nella tua istanza. Puoi sostituirla con una tua immagine; gli spilli si spostano in modalità «posiziona».
                      </>
                    ) : area.mappa && !area.pianta ? (
                      <>Immagine della pianta importata da te. Gli spilli si spostano in modalità «posiziona».</>
                    ) : area.mappa ? (
                      <>Immagine della pianta importata da te (la guida <a href={area.pianta!.pagina ?? area.pianta!.url} target="_blank" rel="noreferrer" className="credito">{area.pianta!.fonte}</a> ne pubblica una). Gli spilli si spostano in modalità «posiziona».</>
                    ) : area.pianta ? (
                      <>
                        Pianta dalla guida <a href={area.pianta.pagina ?? area.pianta.url} target="_blank" rel="noreferrer" className="credito">{area.pianta.fonte}</a>{area.pianta.copertura === 'dungeon' ? ' (pianta dell’intero piano)' : ''}, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}{download.errore ? '. Scaricamento non riuscito: riprova o importa un’immagine tua.' : '.'} Puoi sostituirla con una tua immagine; gli spilli si spostano in modalità «posiziona».
                      </>
                    ) : memento ? (
                      <>I piani dei Memento sono generati a ogni visita e nessuna guida ne pubblica una pianta. Qui sopra c’è il pezzo con cui il gioco disegna questo dedalo nel pozzo: non è una pianta, è la sua raffigurazione. Puoi importare una tua immagine (file o URL); resta nella tua istanza.</>
                    ) : (
                      <>Nessuna pianta pubblicata per quest’area{area.piantaAssente ? `: ${area.piantaAssente}` : ''}. Puoi importare una tua immagine (file o URL); resta nella tua istanza.</>
                    )}
                  </span>
                  {download.errore && area.pianta && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void download.ricarica()} />}
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Ricarica mappa" onClick={() => setMappaVersione((v) => v + 1)} />
                </div>
                {/* Il visore vuole la chiave di un **nodo dell'atlante**, e la chiave dell'area
                    della guida non lo è: interrogato su quella, il risolutore risponde «contenuto
                    di guida» — giusto per lui — e qui compariva un riquadro vuoto con dentro un
                    collegamento, su tutte le aree di tutti i Palazzi. La planimetria però esiste,
                    ed è dichiarata in `mappa_entita`: adesso l'API la porta in `area.mappe` e la
                    scheda la monta. Dove non c'è (i piani dei Memento, e le aree che il pacchetto
                    nativo non copre) si dice, invece di mostrare un riquadro che non spiega. */}
                {mappaScelta && !vistaGuida && <>
                  {area.mappe.length > 1 && (
                    <label className="flex flex-wrap items-center gap-2 text-[12px] text-text-secondary">
                      Planimetria
                      <select className="form-input max-w-full" value={mappaScelta} onChange={(e) => setPianta(e.target.value)}>
                        {area.mappe.map((m) => <option key={m.chiave} value={m.chiave}>{m.nome}</option>)}
                      </select>
                    </label>
                  )}
                  <MappaIncorporata chiave={mappaScelta} versione={`${mappaVersione}-${versioneStati}`} altezza="max(420px, min(62vh, 720px))" onCambiato={() => void dati.ricarica()} />
                  <p className="m-0 text-[11px] text-text-muted">Spilli e immagine della pianta si modificano dall’editor («Modifica mappa» nel visore).</p>
                </>}
                {!mappaScelta && !memento && <p className="m-0 rounded-md bg-white/[0.04] px-3 py-2 text-[12px] text-text-muted" role="status">
                  Per quest’area l’atlante non ha una planimetria navigabile. I punti restano qui accanto, e la pianta della guida è qui sopra.
                </p>}
              </section>

              <aside className="card flex flex-col gap-2" aria-label={`Punti di interesse di ${area.nome}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="m-0 font-display text-[15px] uppercase leading-none">Punti · {puntiVisibili.length}</h3>
                  <button type="button" className={`chip touch text-[11px] ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Anche i gestiti ({gestitiArea})</button>
                </div>
                {/* Quanto manca **in quest'area**, con la stessa misura dell'anello in cima: la
                    colonna diceva solo quanti punti sta mostrando, che dipende dai filtri. */}
                {raccogliereArea.totale > 0 && <div className="flex items-center gap-2">
                  <span className="visore-mappa__progresso h-1.5 flex-1" role="progressbar" aria-label={`Raccolti in ${area.nome}`}
                    aria-valuemin={0} aria-valuemax={raccogliereArea.totale} aria-valuenow={raccogliereArea.presi}>
                    <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((raccogliereArea.presi / raccogliereArea.totale) * 100)}%` }} />
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-text-muted">{raccogliereArea.presi}/{raccogliereArea.totale} da raccogliere</span>
                </div>}
                <div className="flex flex-wrap gap-1" aria-label="Filtri per tipo">
                  {TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
                    <button key={tp} type="button" className={`chip touch text-[11px] ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                      <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />{NOME_TIPO[tp]} ({area.punti.filter((p) => p.tipo === tp).length})
                    </button>
                  ))}
                  {filtro.size > 0 && <button type="button" className="chip touch text-[11px]" onClick={() => setFiltro(new Set())}>Tutti</button>}
                </div>
                {/* Niente altezza fissa: era `max-h-[70vh]` con lo scorrimento suo, e su un
                    telefono diventava una finestrella da far scorrere dentro una pagina che già
                    scorreva. Da 1280 px in su, dove la colonna sta accanto alla mappa, si limita
                    all'altezza della mappa; sotto, cresce quanto serve. */}
                <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0 xl:max-h-[calc(62vh+40px)] xl:overflow-y-auto">
                  {puntiVisibili.length === 0 && <li className="py-2 text-[13px] text-text-muted">Nessun punto con questi filtri{!mostraGestiti && gestitiArea > 0 ? ` (${gestitiArea} gestiti nascosti)` : ''}.</li>}
                  {puntiVisibili.map((p) => (
                    <li key={p.chiave} className={`flex flex-col gap-1 rounded-md px-1 py-2 text-[13px] ${p.chiave === selezionato ? 'bg-primary-bg' : ''} ${p.stato ? 'opacity-60' : ''}`}>
                      <button type="button" className="touch flex items-start gap-2 text-left" onClick={() => setSelezionato(p.chiave === selezionato ? null : p.chiave)} aria-expanded={p.chiave === selezionato}>
                        <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{p.nome}</span>
                          <span className="text-[12px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.esauribile ? ' · esauribile' : ''}{p.stato ? ` · ${p.stato}` : ''}</span>
                        </span>
                      </button>
                      {p.chiave === selezionato && (
                        <div className="flex flex-col gap-1.5 pl-5">
                          {p.descrizione && <p className="m-0 text-text-secondary">{p.descrizione}</p>}
                          <Dettagli d={p.dettagli} />
                          {p.fonte && <a href={p.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
                          <div className="flex flex-wrap gap-1.5">
                            {partitaId && p.stato !== 'ottenuto' && <button type="button" className="btn btn-primary btn-sm" onClick={() => void cambiaStato(p, 'ottenuto')}>Ottenuto</button>}
                            {partitaId && p.esauribile && p.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void cambiaStato(p, 'esaurito')} />}
                            {partitaId && p.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void cambiaStato(p, null)} />}
                          </div>
                          {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare i punti ottenuti.</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>

          {d.fonti.length > 0 && <p className="m-0 text-[11px] text-text-muted">Fonti: {d.fonti.map((f, i) => <a key={i} href={f} target="_blank" rel="noreferrer" className="credito">{new URL(f).hostname}{i < d.fonti.length - 1 ? ', ' : ''}</a>)}</p>}
        </div>
      )}
    </PageState>
  );
}
