// ============================================================
// DungeonDettaglioPage — la scheda di un Palazzo (e dei Memento)
// ============================================================
//
// **L'intestazione dice il tempo, non lo elenca**: le tre date sono una linea del tempo in tre
// tappe; la prosa della guida resta ripiegata sotto. **Le aree sono un elenco**, colonna fissa da
// 1024 px in su e fila scorrevole sotto; ogni voce dice quanto resta da raccogliere con la stessa
// misura dell'anello in cima. **Il tre colonne è progressivo** (aree, mappa, obiettivi).
//
// **Quel che si raccoglie sta sulle planimetrie** (voce 5): l'anello conta i collezionabili
// dell'atlante, e la colonna di destra li elenca con «Raccolto» in un tocco — quelli dell'area
// scelta e, ripiegate, tutte le planimetrie del Palazzo. I punti della guida (sicure, enigmi,
// boss) restano in una piega «Dalla guida» con Ottenuto/Esaurito, senza effetto sulla percentuale.
//
// I Memento non hanno aree fisse: al posto della colonna delle aree c'è il pozzo disegnato, e la
// colonna di destra sono gli **obiettivi del dedalo** — i timbri dichiarati dalla guida e le
// richieste — che fanno la percentuale. La pianta della guida non c'è: i piani si generano.
// ============================================================

import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { aggiornaArea, aggiornaDungeon, aggiornaMappa, aggiornaPunto as salvaPunto, creaPunto, eliminaPunto, getAlberoMappe, getDungeon, impostaStatoPunto } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { IconChevronLeft } from '../components/shared/icons';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { RaccoltaPlanimetrie } from '../components/guida/RaccoltaPlanimetrie';
import { PlanimetriePalazzo } from '../components/guida/PlanimetriePalazzo';
import { nomeSenzaPalazzo } from '../utils/gruppiPlanimetrie';
import { LIMITI_GUIDA } from '../../shared/limitiGuida';
import { CampoCorrezione, CorrezioneGuida } from '../components/guida/CorrezioneGuida';
import { ObiettiviDedalo } from '../components/guida/ObiettiviDedalo';
import { dataBreve } from '../utils/testoBreve';
import { COLORE_TIPO, NOME_TIPO } from '../utils/dungeon';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto, StatoRichiesta } from '../types';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
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
    <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
      {voci.map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-text-muted capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd className="m-0">{Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
      ))}
    </dl>
  );
}

/** Le tre date di un Palazzo come una linea: si apre, conviene rubare, scade. La prosa della guida nel `title`. */
function LineaDelTempo({ date }: { date: DungeonDettaglioDto['date'] }) {
  const tappe = [
    { chiave: 'sblocco', etichetta: 'Si apre', valore: date.sblocco, tono: 'bg-white/10 text-text', segno: 'si-apre' as const },
    { chiave: 'furto', etichetta: 'Furto consigliato', valore: date.furtoConsigliato, tono: 'bg-[#f5c542]/15 text-[#f5c542]', segno: 'furto' as const },
    { chiave: 'scadenza', etichetta: 'Scade', valore: date.scadenza, tono: 'bg-primary/20 text-primary', segno: 'scade' as const },
  ].filter((t) => !!t.valore);
  if (tappe.length === 0) return null;
  return (
    <ol className="m-0 flex list-none flex-wrap items-stretch gap-1.5 p-0" aria-label="Finestra del Palazzo">
      {tappe.map((t, i) => (
        <li key={t.chiave} className="flex items-stretch gap-1.5">
          {/* Le tappe vanno a capo sugli schermi stretti, e una freccia a inizio riga non collega
              più niente: da lì in giù l'ordine lo dicono già le etichette. */}
          {i > 0 && <span aria-hidden className="hidden self-center text-text-muted sm:inline">→</span>}
          <span className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 ${t.tono}`} title={t.valore!}>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] opacity-80"><IconaSegno chiave={t.segno} dimensione={14} />{t.etichetta}</span>
            <span className="font-display text-[17px] leading-none">{dataBreve(t.valore!)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Quanto resta da raccogliere in un'area, con la stessa misura dell'anello: i collezionabili delle sue planimetrie
 *  (Palazzi) o gli obiettivi del dedalo (Memento). */
function contoArea(a: AreaDungeonDto, memento: boolean): { totale: number; fatti: number | null } {
  if (memento) return a.dedalo ? { totale: a.dedalo.obiettivi.totale, fatti: a.dedalo.obiettivi.fatti } : { totale: 0, fatti: null };
  const totale = a.mappe.reduce((s, m) => s + m.n, 0);
  const fatti = a.mappe.some((m) => m.presi !== null) ? a.mappe.reduce((s, m) => s + (m.presi ?? 0), 0) : null;
  return { totale, fatti };
}

/** Una voce dell'elenco delle aree: numero, nome, e quanto ne resta. */
function VoceArea({ a, memento, scelta, suggerita, onScegli, compatta }: {
  a: AreaDungeonDto; memento: boolean; scelta: boolean; suggerita: boolean; onScegli: () => void; compatta?: boolean;
}) {
  const conto = contoArea(a, memento);
  const restano = conto.fatti === null ? conto.totale : conto.totale - conto.fatti;
  if (compatta) {
    return (
      <button type="button" role="tab" aria-selected={scelta} onClick={onScegli} title={a.descrizione}
        className={`chip touch shrink-0 ${scelta ? 'chip--attivo' : ''} ${classiSuggerito(suggerita, 'chip')}`}>
        {a.ordine + 1}. {a.nome}{conto.totale > 0 && conto.fatti !== null ? ` · ${restano}` : ''}
      </button>
    );
  }
  return (
    <button type="button" role="tab" aria-selected={scelta} onClick={onScegli} title={a.descrizione}
      className={`touch flex w-full shrink-0 items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        scelta ? 'border-primary bg-primary-bg text-text' : 'border-border-light bg-white/[0.02] text-text-secondary hover:border-border hover:bg-white/[0.05] hover:text-text'
      } ${classiSuggerito(suggerita)}`}>
      <span className={`mt-[1px] w-6 shrink-0 text-right font-display text-[15px] leading-tight ${scelta ? 'text-primary' : 'text-text-muted'}`}>{a.ordine + 1}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold leading-tight">{a.nome}</span>
        <span className="text-[11px] text-text-muted">
          {conto.totale === 0 ? (memento ? 'nessun obiettivo dichiarato' : a.mappe.length === 0 ? 'nessuna planimetria legata' : 'niente da raccogliere sulla sua planimetria') : conto.fatti === null ? `${conto.totale} ${memento ? 'obiettivi' : 'da raccogliere'}` : restano > 0 ? `${restano} ${memento ? 'obiettivi' : 'da prendere'} su ${conto.totale}` : `${conto.totale} ${memento ? 'obiettivi fatti' : 'raccolti'} · completa`}
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
  const [mappaVersione] = useState(0);
  // ogni cambio di stato dalla colonna ricarica il visore (e viceversa il visore ricarica la pagina)
  const [versioneStati, setVersioneStati] = useState(0);
  const memento = d?.tipo === 'mementos';

  const puntiVisibili = useMemo(() => (area?.punti ?? []).filter((p) => (filtro.size === 0 || filtro.has(p.tipo)) && (mostraGestiti || !p.stato)), [area, filtro, mostraGestiti]);
  const gestitiArea = (area?.punti ?? []).filter((p) => p.stato).length;

  const aggiornaPunto = (nuovo: PuntoInteresseDto) => {
    if (!d) return;
    dati.imposta({ ...d, aree: d.aree.map((a) => ({ ...a, punti: a.punti.map((p) => (p.chiave === nuovo.chiave ? nuovo : p)) })) });
  };
  const cambiaStato = async (p: PuntoInteresseDto, stato: StatoPunto | null) => {
    if (!partitaId) return;
    try {
      aggiornaPunto(await impostaStatoPunto(partitaId, p.chiave, stato));
      setVersioneStati((v) => v + 1);
      // Un punto della guida può essere agganciato a uno spillo collezionabile (il server lo conta come raccolto):
      // la raccolta si rilegge dal server, senza stato di caricamento, così anello e colonna non divergono.
      const fresco = await getDungeon(chiave, partitaId);
      dati.imposta(fresco);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };
  /** Uno spillo raccolto (o riaperto): si aggiornano le planimetrie del Palazzo, quelle delle aree e l'anello, senza ricaricare. */
  const segnaRaccolto = (spilloId: number, raccolto: boolean) => {
    if (!d) return;
    const aggiornaMappa = <T extends { presi: number | null; spilli: Array<{ id: number; raccolto: boolean | null }> }>(m: T): T => {
      if (!m.spilli.some((s) => s.id === spilloId)) return m;
      const spilli = m.spilli.map((s) => (s.id === spilloId ? { ...s, raccolto } : s));
      return { ...m, spilli, presi: spilli.filter((s) => s.raccolto).length };
    };
    const planimetrie = d.planimetrie.map(aggiornaMappa);
    const aree = d.aree.map((a) => ({ ...a, mappe: a.mappe.map(aggiornaMappa) }));
    const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
    dati.imposta({ ...d, planimetrie, aree, raccolta: { ...d.raccolta, presi, mappeComplete: planimetrie.filter((p) => p.n > 0 && p.presi === p.n).length } });
    setVersioneStati((v) => v + 1);
  };
  /** I timbri di un dedalo cambiano: obiettivi del dedalo e anello dei Memento seguono. */
  const aggiornaTimbri = (chiaveArea: string, raccolti: number) => {
    if (!d) return;
    const aree = d.aree.map((a) => a.chiave === chiaveArea && a.dedalo ? { ...a, dedalo: { ...a.dedalo, timbri: { ...a.dedalo.timbri, raccolti }, obiettivi: { ...a.dedalo.obiettivi, fatti: raccolti + a.dedalo.richieste.filter((r) => r.stato === 'completata').length } } } : a);
    dati.imposta({ ...d, aree, raccolta: { ...d.raccolta, presi: aree.reduce((s, a) => s + (a.dedalo?.obiettivi.fatti ?? 0), 0) } });
  };
  const aggiornaRichiesta = (chiaveArea: string, chiaveRichiesta: string, stato: StatoRichiesta | null) => {
    if (!d) return;
    const aree = d.aree.map((a) => {
      if (a.chiave !== chiaveArea || !a.dedalo) return a;
      const richieste = a.dedalo.richieste.map((r) => (r.chiave === chiaveRichiesta ? { ...r, stato } : r));
      return { ...a, dedalo: { ...a.dedalo, richieste, obiettivi: { ...a.dedalo.obiettivi, fatti: (a.dedalo.timbri.raccolti ?? 0) + richieste.filter((r) => r.stato === 'completata').length } } };
    });
    dati.imposta({ ...d, aree, raccolta: { ...d.raccolta, presi: aree.reduce((s, a) => s + (a.dedalo?.obiettivi.fatti ?? 0), 0) } });
  };
  // Quale planimetria dell'area si sta guardando: quasi sempre una sola; la scelta si azzera cambiando area.
  const [piantaScelta, setPianta] = useState<string | null>(null);
  // Una planimetria scelta dal pannello «Planimetrie» vale **su tutto il Palazzo**, anche quando non
  // è legata a nessuna area: è il modo di guardare (e segnare) una tavola che la guida non aggancia.
  const [planimetriaLibera, setPlanimetriaLibera] = useState<string | null>(null);
  const [nuovoPunto, setNuovoPunto] = useState<{ nome: string; tipo: PuntoInteresseDto['tipo'] } | null>(null);
  // L'atlante serve all'elenco del Palazzo: da lì vengono il nome di presentazione, il
  // gruppo che dice quali tavole sono la stessa stanza e l'etichetta di ogni versione. Si carica
  // subito, perché l'elenco è la colonna di atterraggio, e **si rilegge dopo ogni modifica**:
  // correggere il nome di una stanza o l'etichetta di una planimetria cambia l'atlante, non la
  // scheda del Palazzo, e ricaricare solo quest'ultima lasciava a schermo il testo vecchio benché
  // salvato. Nei Memento non serve: i dedali non hanno planimetrie.
  const albero = useCarica(() => (memento ? Promise.resolve([]) : getAlberoMappe()), [memento]);
  const planimetriaAperta = (d?.planimetrie ?? []).find((p) => p.chiave === planimetriaLibera) ?? null;
  const mappaScelta = planimetriaAperta?.chiave ?? (area && area.mappe.some((m) => m.chiave === piantaScelta) ? piantaScelta : area?.mappe[0]?.chiave ?? null);
  const scegliArea = (k: string) => { setParams({ area: k }); setSelezionato(null); setPianta(null); setPlanimetriaLibera(null); };
  /** Una planimetria scelta dal pannello: se è legata a un'area si apre quell'area, altrimenti resta «libera». */
  const scegliPlanimetria = (k: string) => {
    const p = (d?.planimetrie ?? []).find((x) => x.chiave === k);
    setSelezionato(null);
    if (p?.area) { setParams({ area: p.area.chiave }); setPianta(k); setPlanimetriaLibera(null); }
    else setPlanimetriaLibera(k);
  };
  // L'anello conta quel che si raccoglie: collezionabili delle planimetrie (Palazzi) o obiettivi dei dedali (Memento).
  const quota = d && d.raccolta.presi !== null && d.raccolta.totale > 0 ? d.raccolta.presi / d.raccolta.totale : null;
  const areeSuggerite = (d?.aree ?? []).filter((a) => sugg.evidenziato('aree', a.chiave)).length;
  const suggerimentoDiffuso = !!d && d.aree.length > 0 && areeSuggerite === d.aree.length;
  const areaSuggerita = (chiaveArea: string) => !suggerimentoDiffuso && sugg.evidenziato('aree', chiaveArea);
  const tempoInProsa = !d ? [] : ([
    { etichetta: 'Si apre', valore: d.date.sblocco },
    { etichetta: 'Furto consigliato', valore: d.date.furtoConsigliato },
    { etichetta: 'Scade', valore: d.date.scadenza },
  ] as const).filter((t) => !!t.valore && t.valore !== dataBreve(t.valore));
  const mappeArea = area?.mappe ?? [];
  // 132 collezionabili su 185 stanno su planimetrie che la guida non lega a nessuna area: quando l'area
  // scelta non ne ha, la colonna mostra direttamente la raccolta di tutto il Palazzo, non una piega chiusa.
  const areaConRaccolta = mappeArea.some((m) => m.n > 0);
  // Perché la colonna mostra tutto il Palazzo: l'area non ha una planimetria legata, oppure ce l'ha ma senza collezionabili.
  const notaPalazzo = mappeArea.length === 0 ? 'Quest’area non ha planimetrie legate: qui c’è tutto il Palazzo.' : 'La planimetria di quest’area non ha collezionabili: qui c’è tutto il Palazzo.';
  const altrePlanimetrie = (d?.planimetrie ?? []).filter((p) => !mappeArea.some((m) => m.chiave === p.chiave));
  // Le tavole del Palazzo che nessuna area si è ancora presa: sono quelle da collegare.
  const tavoleLibere = (d?.planimetrie ?? []).filter((p) => !p.area);
  const restanoAltre = altrePlanimetrie.reduce((s, p) => s + p.n - (p.presi ?? 0), 0);

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && area && (
        <div className="flex flex-col gap-4">
          {/* ---- Intestazione: l'emblema grande, il nome, il tempo ---- */}
          <header className="card relative overflow-hidden">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 hidden opacity-[0.07] sm:block">
              <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={280} />
            </span>
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
              <div className="flex shrink-0 items-center gap-3 sm:flex-col">
                <span className="sm:hidden"><EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={52} /></span>
                <span className="hidden sm:block"><EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={80} /></span>
                {quota !== null && (
                  <AnelloAvanzamento quota={quota} dimensione={64} spessore={5} etichetta={`Avanzamento in ${d.nome}: ${d.raccolta.presi} ${memento ? 'obiettivi fatti' : 'da raccogliere presi'} su ${d.raccolta.totale}`}>
                    <span className="font-display text-[17px] leading-none tabular-nums">{Math.round(quota * 100)}%</span>
                  </AnelloAvanzamento>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-ghost btn-sm touch -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>
                    <h1 className="titolo-display m-0 break-words">{d.nome}</h1>
                    <CorrezioneGuida cosa={`il Palazzo «${d.nome}»`} etichetta="Correggi la scheda"
                      iniziale={() => ({ nome: d.nome, sovrano: d.sovrano, dataSblocco: d.date.sblocco, dataScadenza: d.date.scadenza, furtoConsigliato: d.date.furtoConsigliato, livelloConsigliato: d.livelloConsigliato, note: d.note })}
                      onSalva={async (b) => { await aggiornaDungeon(d.chiave, b); await dati.ricarica(); }}>
                      {(b, cambia) => { const campo = (k: keyof typeof b & string, etichetta: string, massimo: number, multilinea?: boolean) => <CampoCorrezione key={k} etichetta={etichetta} valore={b[k]} multilinea={multilinea} massimo={massimo} onCambia={(v) => cambia({ [k]: v } as Partial<typeof b>)} />;
                        return <>
                          {campo('nome', 'Nome', LIMITI_GUIDA.dungeon.nome)}{campo('sovrano', 'Sovrano', LIMITI_GUIDA.dungeon.sovrano)}
                          {campo('dataSblocco', 'Si apre', LIMITI_GUIDA.dungeon.data)}{campo('furtoConsigliato', 'Furto consigliato', LIMITI_GUIDA.dungeon.data)}{campo('dataScadenza', 'Scade', LIMITI_GUIDA.dungeon.data)}
                          {campo('livelloConsigliato', 'Livello consigliato', LIMITI_GUIDA.dungeon.livello)}{campo('note', 'Note della guida', LIMITI_GUIDA.dungeon.note, true)}
                        </>; }}
                    </CorrezioneGuida>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                    {d.sovrano && <span className="break-words">{d.sovrano}</span>}
                    {d.arcanaSovranoNome && <span className="chip chip--attivo">{d.arcanaSovranoNome}</span>}
                  </div>
                </div>
                <LineaDelTempo date={d.date} />
                <div className="flex flex-wrap items-center gap-2">
                  <CollegamentoMappa tipo="dungeon" chiave={d.chiave} testo="Mappa del Palazzo" />
                  <span className="chip">{d.aree.length} {memento ? 'dedali' : 'aree'}</span>
                  <span className="chip" title={memento ? 'Timbri dichiarati dalla guida e richieste dei dedali: sono questi a fare la percentuale.' : 'I collezionabili sulle planimetrie (forzieri, semi, tesori): sono questi a fare la percentuale.'}>{d.raccolta.totale} {memento ? 'obiettivi' : 'da raccogliere'}</span>
                  {!memento && <span className="chip" title="Le tavole dell’atlante del Palazzo. Si ordinano e si correggono nell’elenco qui sotto.">
                    {d.planimetrie.length} planimetrie{d.raccolta.mappeComplete !== null ? ` · ${d.raccolta.mappeComplete} complete` : ''}
                  </span>}
                  <span className="chip" title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
                  {suggerimentoDiffuso && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                </div>
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

          <div className={`grid grid-cols-1 items-start gap-4 ${memento ? 'xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]' : 'lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
            {/* ---- Le aree: colonna da 1024 px in su, fila scorrevole sotto ---- */}
            {/* **Un elenco solo.** Le stanze in ordine di percorso con i loro comandi, e in coda le
                aree della guida ancora da collegare: è la lista di atterraggio e insieme il posto
                dove si sistema il Palazzo, senza un secondo pannello da scoprire. Sotto i 1024 px
                la fila di chip resta come salto rapido fra le aree. */}
            {!memento && (
              <nav aria-label="Il Palazzo" className="order-2 lg:order-none">
                {/* **Niente fila di chip sotto i 1024 px.** C'era, e rimetteva in piedi la doppia
                    lista appena tolta: diciotto aree in otto righe di chip sopra l'elenco che le
                    contiene già. L'elenco vale a tutte le larghezze.

                    Ma in colonna unica **va dopo il contenuto che serve a scegliere**, e con il suo
                    tetto d'altezza: srotolato, per Kamoshida è alto 4053 px, e l'area aperta finiva
                    a 4682 px dall'alto — la navigazione seppelliva ciò che seleziona (rilievo della
                    revisione). Sopra i 1024 px è la colonna di sinistra e resta al suo posto. */}
                <div className="card max-h-[70vh] overflow-y-auto p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-11rem)]">
                  <PlanimetriePalazzo dungeonChiave={d.chiave} planimetrie={d.planimetrie} albero={albero.dati ?? []}
                    alberoPronto={!!albero.dati} alberoErrore={albero.errore} onRiprovaAlbero={() => void albero.ricarica()}
                    aree={d.aree.map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine }))}
                    areeOrfane={d.aree.filter((a) => a.mappe.length === 0).map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine, descrizione: a.descrizione }))}
                    tavoleLibere={tavoleLibere}
                    areaScelta={area.chiave} onScegliArea={scegliArea}
                    sceltaChiave={mappaScelta} onScegli={scegliPlanimetria}
                    onCambiato={async () => { await Promise.all([dati.ricarica(), albero.ricarica()]); }} />
                </div>
              </nav>
            )}
            {/* I Memento: il pozzo disegnato al posto della colonna delle aree, nella colonna. */}
            {memento && (
              <div className="flex min-w-0 flex-col gap-2">
                <MappaMemento aree={d.aree} selezionata={area.chiave} onSeleziona={scegliArea}
                  className="mx-auto w-[min(100%,calc(min(46vh,460px)*1.6))] xl:w-full" />
                <FilaScorrevole className="items-center" role="tablist" aria-label="Dedali">
                  {d.aree.map((a) => <VoceArea key={a.chiave} a={a} memento compatta scelta={a.chiave === area.chiave} suggerita={areaSuggerita(a.chiave)} onScegli={() => scegliArea(a.chiave)} />)}
                </FilaScorrevole>
              </div>
            )}

            {/* ---- L'area scelta: mappa e obiettivi ---- */}
            <div className={`order-1 grid grid-cols-1 items-start gap-4 lg:order-none ${memento ? '2xl:grid-cols-[minmax(0,1fr)_340px]' : 'xl:grid-cols-[minmax(0,1fr)_352px]'}`}>
              <section className="card flex flex-col gap-2.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="m-0 font-display text-[19px] uppercase leading-none">{area.nome}</h2>
                  {/* `key`: cambiando area il modulo si rimonta, altrimenti resterebbe aperto con il
                      testo dell'area di prima e lo salverebbe su quella nuova (rilievo della revisione). */}
                  {!memento && <CorrezioneGuida key={area.chiave} cosa={`l’area «${area.nome}»`}
                    iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
                    onSalva={async (b) => { await aggiornaArea(area.chiave, b); await dati.ricarica(); }}>
                    {(b, cambia) => <>
                      <CampoCorrezione etichetta="Nome dell’area" valore={b.nome} massimo={LIMITI_GUIDA.area.nome} onCambia={(v) => cambia({ nome: v })} />
                      <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                    </>}
                  </CorrezioneGuida>}
                  <span className="text-[12px] text-text-muted">{memento ? 'dedalo' : 'area'} {area.ordine + 1} di {d.aree.length}</span>
                  <span className="flex-1" />
                </div>
                {area.descrizione && <p className="m-0 text-[13px] text-text-secondary">{area.descrizione}</p>}
                {/* Il pezzo con cui il gioco disegna il dedalo nel pozzo: non una pianta, i piani si generano. */}
                {memento && <span className="flex h-[min(46vh,420px)] w-full items-center justify-center overflow-hidden rounded bg-[#8d0012]">
                  <img src={urlStratoDedalo(area.ordine)} alt={`${area.nome}, come lo disegna il gioco`} className="max-h-full max-w-full object-contain" />
                </span>}
                {/* La planimetria dell'atlante legata all'area, se c'è. */}
                {!memento && mappaScelta && <>
                  {area.mappe.length > 1 && (
                    <Selettore etichetta="Planimetria" valore={mappaScelta} opzioni={area.mappe.map((m) => ({ chiave: m.chiave, nome: m.nome }))} onCambia={setPianta} />
                  )}
                  <MappaIncorporata chiave={mappaScelta} versione={`${mappaVersione}-${versioneStati}`} altezza="max(300px, min(41vh, 560px))" onCambiato={() => void dati.ricarica()} />
                  <p className="m-0 text-[11px] text-text-muted">Spilli e immagine della pianta si modificano dall’editor («Modifica mappa» nel visore).</p>
                </>}
                {/* **Dove manca il legame si collega, non si mostra un'altra immagine.** Prima qui
                    c'era la pianta scaricata dalla guida: una seconda figura della stessa stanza,
                    presa da un sito, che copriva il fatto che nessuno avesse ancora detto quale
                    tavola dell'atlante è quest'area. Le tavole ci sono quasi sempre: manca il
                    legame, e questo è il posto per farlo — la scelta vale per tutte le partite. */}
                {!mappaScelta && !memento && (
                  <div className="flex flex-col gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-[12px]" role="status">
                    <p className="m-0 text-text-muted">Quest’area non ha ancora una planimetria: sceglila fra le tavole del Palazzo non ancora assegnate. Quel che c’è da raccogliere sta nella colonna accanto.</p>
                    {tavoleLibere.length > 0
                      ? <Selettore etichetta="Collega una planimetria" valore="" vuoto="— scegli —"
                          opzioni={tavoleLibere.map((t) => ({ chiave: t.chiave, nome: nomeSenzaPalazzo(t.nome), dettaglio: t.n > 0 ? `${t.n} da raccogliere` : undefined }))}
                          onCambia={(k) => { if (!k) return; void aggiornaMappa(k, { entita: { tipo: 'area', chiave: area.chiave } })
                            .then(async () => { await dati.ricarica(); notifica('success', `Planimetria collegata a «${area.nome}».`); })
                            .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Collegamento non riuscito.')); }} />
                      : <span className="text-text-muted">Nel Palazzo non restano tavole libere: aggiungine una dal pannello «Planimetrie».</span>}
                  </div>
                )}
              </section>

              {/* ---- La colonna degli obiettivi: quel che fa la percentuale, e sotto i punti della guida ---- */}
              <aside className="card flex flex-col gap-3" aria-label={memento ? `Obiettivi di ${area.nome}` : areaConRaccolta ? `Da raccogliere in ${area.nome}` : `Da raccogliere nel ${d.nome}`}>
                {!memento && planimetriaAperta
                  ? <RaccoltaPlanimetrie planimetrie={[planimetriaAperta]} partitaId={partitaId} onRaccolto={segnaRaccolto}
                      etichetta="Su questa planimetria" nota="Planimetria scelta dal pannello: qui c’è solo quel che si raccoglie su di lei."
                      vuoto="Su questa planimetria non c’è niente da raccogliere." />
                  : memento
                  ? (area.dedalo
                    ? <ObiettiviDedalo areaChiave={area.chiave} areaNome={area.nome} dedalo={area.dedalo} partitaId={partitaId} onTimbri={(n) => aggiornaTimbri(area.chiave, n)} onRichiesta={(k, s) => aggiornaRichiesta(area.chiave, k, s)} />
                    : <p className="m-0 text-[12px] text-text-muted" role="status">La guida non dichiara obiettivi per questo dedalo.</p>)
                  : areaConRaccolta
                    ? <RaccoltaPlanimetrie planimetrie={mappeArea} partitaId={partitaId} onRaccolto={segnaRaccolto} />
                    : <RaccoltaPlanimetrie planimetrie={d.planimetrie} partitaId={partitaId} onRaccolto={segnaRaccolto} etichetta="Da raccogliere nel Palazzo" nota={notaPalazzo} vuoto="Nessun collezionabile sulle planimetrie di questo Palazzo." />}
                {/* Le altre planimetrie del Palazzo, quando l'area ne ha di sue: ripiegate, con quanto resta. */}
                {!memento && areaConRaccolta && altrePlanimetrie.length > 0 && (
                  <details className="text-[12px]">
                    <summary className="touch cursor-pointer text-text-muted">Tutte le planimetrie del Palazzo · {restanoAltre} da raccogliere</summary>
                    <div className="pt-2">
                      <RaccoltaPlanimetrie planimetrie={altrePlanimetrie} partitaId={partitaId} onRaccolto={segnaRaccolto} etichetta="Nel resto del Palazzo" />
                    </div>
                  </details>
                )}
                {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare quel che raccogli.</span>}

                {/* I punti della guida: sicure, scorciatoie, enigmi, incontri e boss. Si segnano Ottenuto/Esaurito, ma non fanno la percentuale. */}
                {area.punti.length > 0 && (
                  <details className="text-[12px]">
                    <summary className="touch cursor-pointer text-text-muted">Dalla guida · {area.punti.length} punti{gestitiArea > 0 ? ` (${gestitiArea} segnati)` : ''}</summary>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-text-muted">Non contano nella percentuale: quella misura {memento ? 'gli obiettivi dei dedali' : 'le planimetrie'}.</span>
                        <button type="button" className={`chip touch text-[11px] ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Anche i gestiti ({gestitiArea})</button>
                      </div>
                      <div className="flex flex-wrap gap-1" aria-label="Filtri per tipo">
                        {TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
                          <button key={tp} type="button" className={`chip touch text-[11px] ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />{NOME_TIPO[tp]} ({area.punti.filter((p) => p.tipo === tp).length})
                          </button>
                        ))}
                        {filtro.size > 0 && <button type="button" className="chip touch text-[11px]" onClick={() => setFiltro(new Set())}>Tutti</button>}
                      </div>
                      <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`Punti della guida di ${area.nome}`}>
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
                                <div className="flex flex-wrap gap-1.5">
                                  {partitaId && p.stato !== 'ottenuto' && <button type="button" className="btn btn-primary btn-sm touch" onClick={() => void cambiaStato(p, 'ottenuto')}>Ottenuto</button>}
                                  {partitaId && p.esauribile && p.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void cambiaStato(p, 'esaurito')} />}
                                  {partitaId && p.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void cambiaStato(p, null)} />}
                                  <CorrezioneGuida key={p.chiave} cosa={`il punto «${p.nome}»`} compatto
                                    iniziale={() => ({ nome: p.nome, descrizione: p.descrizione, tipo: p.tipo as string, esauribile: p.esauribile ? 'sì' : 'no' })}
                                    onSalva={async (b) => { await salvaPunto(p.chiave, { nome: b.nome, descrizione: b.descrizione, tipo: b.tipo as PuntoInteresseDto['tipo'], esauribile: b.esauribile === 'sì' }); await dati.ricarica(); }}
                                    elimina={{ avviso: 'Se ne va dalla guida, con quel che le partite ne avevano segnato.', onElimina: async () => { await eliminaPunto(p.chiave); await dati.ricarica(); } }}>
                                    {(b, cambia) => <>
                                      <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => cambia({ nome: v })} />
                                      <span className="min-w-[150px]">
                                        <Selettore etichetta="Tipo" valore={b.tipo} opzioni={TIPI.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => cambia({ tipo: v })} />
                                      </span>
                                      <label className="touch flex items-center gap-1.5 text-[12px]">
                                        <input type="checkbox" className="h-5 w-5" checked={b.esauribile === 'sì'} onChange={(e) => cambia({ esauribile: e.target.checked ? 'sì' : 'no' })} />Esauribile
                                      </label>
                                      <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.punto.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                                    </>}
                                  </CorrezioneGuida>
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {/* La guida non ha trascritto tutto: quel che manca si aggiunge qui, dove lo si è cercato. */}
                      {nuovoPunto
                        ? <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
                            onSubmit={(e) => { e.preventDefault(); const n = nuovoPunto.nome.trim(); if (!n) return; void creaPunto(area.chiave, { nome: n, tipo: nuovoPunto.tipo }).then(async () => { setNuovoPunto(null); await dati.ricarica(); notifica('success', `Punto «${n}» aggiunto a ${area.nome}.`); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Punto non aggiunto.')); }}>
                            <CampoCorrezione etichetta="Nuovo punto" valore={nuovoPunto.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => setNuovoPunto({ ...nuovoPunto, nome: v })} />
                            <span className="min-w-[150px]">
                              <Selettore etichetta="Tipo" valore={nuovoPunto.tipo} opzioni={TIPI.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => setNuovoPunto({ ...nuovoPunto, tipo: v as PuntoInteresseDto['tipo'] })} />
                            </span>
                            <div className="flex gap-1.5">
                              <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!nuovoPunto.nome.trim()} />
                              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuovoPunto(null)} />
                            </div>
                          </form>
                        : <button type="button" className="chip touch self-start text-[11px]" onClick={() => setNuovoPunto({ nome: '', tipo: 'altro' })}>+ Aggiungi un punto</button>}
                    </div>
                  </details>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
