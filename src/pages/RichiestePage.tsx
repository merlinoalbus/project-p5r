// ============================================================
// RichiestePage — Richieste dei Mementos con bersaglio, ricompense, Confidente e stato per partita; Jose (Fase 7.2)
// ============================================================
//
// **Rifatta come si guarda, non come si legge.** Erano trentatré righe a tutta larghezza, una
// sotto l'altra, con dentro tre frasi in grassetto — «Bersaglio: …», «Debole a: …», «Resiste a:
// …» — e i comandi nascosti dentro la riga da aprire. Su un desktop da 1900 px era una colonna di
// testo lunga cinque schermate con mezza pagina di vuoto a destra; su un telefono, un muro.
//
// Una Richiesta però si sceglie **guardando due cose**: dove sta (che Dedalo, che area) e a che
// cosa è debole il bersaglio. Quelle due sono ora la faccia della carta: le debolezze come
// pastiglie del colore del loro elemento, come nel Compendio, e la posizione in cima. Il resto —
// committente, date, note — sta dietro «Dettagli», dove serve una volta sola.
//
// I comandi non si nascondono più: «Accettata» e «Completata» sono il gesto della pagina, e
// stavano dentro la piega. Le completate scendono in fondo e si spengono, invece di restare in
// mezzo a quelle da fare.
// ============================================================

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRichieste, impostaStatoRichiesta } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import type { RichiestaDto, StatoRichiesta } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { FregioSezione } from '../components/shared/FregioSezione';
import { PulsanteVisivo, CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { IconaScheda } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { coloreElemento } from '../utils/elementi';

type Filtro = 'tutte' | 'da-fare' | 'accettate' | 'completate';
/** I due fogli della pagina: le Richieste, e la bottega di Jose. */
type Foglio = 'richieste' | 'jose';

/** Dal nome italiano dell'elemento, come lo scrive la guida, alla chiave del colore.
 *
 * La guida scrive «Tuono», «Psicocinesi (Psio)», «Fuoco (Sig.ra Takase)»: testo libero, non una
 * chiave. Si riconosce l'inizio, che è la parte che nomina l'elemento; quello che non si riconosce
 * — «Attacchi elementali (maggior parte)» — resta una pastiglia neutra, che è meglio di una
 * pastiglia colorata a caso. */
const ELEMENTO_DA_TESTO: Array<[RegExp, string]> = [
  [/^fuoco/i, 'fire'],
  [/^ghiaccio/i, 'ice'],
  [/^(tuono|elettricit)/i, 'electric'],
  [/^vento/i, 'wind'],
  [/^(psicocinesi|psichic|psio)/i, 'psy'],
  [/^nucleare/i, 'nuclear'],
  [/^sacro/i, 'bless'],
  [/^(maledizione|oscurit)/i, 'curse'],
  [/^(danni fisici|fisic|attacchi fisici)/i, 'phys'],
  [/^armi da fuoco/i, 'gun'],
];

function chiaveElemento(testo: string): string | null {
  return ELEMENTO_DA_TESTO.find(([r]) => r.test(testo.trim()))?.[1] ?? null;
}

/** Pastiglia di una debolezza o di una resistenza: colorata se l'elemento si riconosce. */
function Affinita({ testo, tipo }: { testo: string; tipo: 'debole' | 'resiste' }) {
  const elemento = chiaveElemento(testo);
  if (!elemento) return <span className="chip text-[11px]" title={tipo === 'debole' ? 'Debolezza del bersaglio' : 'Il bersaglio resiste'}>{testo}</span>;
  const colore = coloreElemento(elemento);
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold"
    style={{ borderColor: colore, color: colore, background: `color-mix(in srgb, ${colore} ${tipo === 'debole' ? 18 : 8}%, transparent)` }}
    title={tipo === 'debole' ? 'Debolezza del bersaglio' : 'Il bersaglio resiste'}>
    <span aria-hidden>{tipo === 'debole' ? '▼' : '▲'}</span>{testo}
  </span>;
}

function Richiesta({ r, partitaId, onCambiata }: { r: RichiestaDto; partitaId: number | null; onCambiata: (r: RichiestaDto) => void }) {
  const [aperta, setAperta] = useState(false);
  const sugg = useSuggerimenti();
  const [occupato, setOccupato] = useState(false);
  const cambia = async (stato: StatoRichiesta | null) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiata(await impostaStatoRichiesta(partitaId, r.chiave, stato)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex min-w-0 flex-col gap-2 ${r.stato === 'completata' ? 'border-success/40 opacity-70' : ''} ${classiSuggerito(sugg.evidenziato('richieste', r.chiave))}`}>
      <div className="flex items-start gap-2.5">
        <IconaCategoria categoria="richiesta" dimensione={36} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="m-0 text-[16px] leading-tight">{r.nome}</h3>
          <span className="text-[12px] text-text-muted">{r.area}{r.piano ? ` · ${r.piano}` : ''}</span>
        </div>
        {r.stato && <span className={`chip shrink-0 text-[11px] ${r.stato === 'completata' ? '' : 'chip--attivo'}`}>{r.stato}</span>}
      </div>
      {sugg.evidenziato('richieste', r.chiave) && <TargaSuggerito motivo={sugg.motivo('richieste', r.chiave)} compatta />}

      {/* Il bersaglio è la ragione per cui si apre questa pagina prima di scendere: chi è, e a
          che cosa cede. Sta in un riquadro suo perché è il dato, non una frase fra le frasi. */}
      <div className="flex flex-col gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-2">
        <span className="text-[13px]">
          <strong>{r.bersaglio.nome}</strong>
          {r.bersaglio.formaDemoniaca && <span className="text-text-secondary"> · {r.bersaglio.formaDemoniaca}</span>}
          {r.bersaglio.livello && <span className="text-text-muted"> · livello {r.bersaglio.livello}</span>}
        </span>
        {(r.bersaglio.debolezze.length > 0 || r.bersaglio.resistenze.length > 0 || r.bersaglio.vulnerabileConfusione) && (
          <div className="flex flex-wrap gap-1">
            {r.bersaglio.debolezze.map((x, i) => <Affinita key={`d${i}`} testo={x} tipo="debole" />)}
            {r.bersaglio.resistenze.map((x, i) => <Affinita key={`r${i}`} testo={x} tipo="resiste" />)}
            {r.bersaglio.vulnerabileConfusione && <span className="chip text-[11px]" title="Confondendolo si ottengono yen">Confusione utile</span>}
          </div>
        )}
      </div>

      {r.confidente && <span className="text-[12px] text-text-secondary">Confidente: <strong className="text-text">{r.confidente.nome}</strong>{r.confidente.rango ? ` · rango ${r.confidente.rango}` : ''}</span>}
      {r.ricompense.length > 0 && <span className="line-clamp-2 text-[12px] text-text-secondary" title={r.ricompense.join(', ')}><span className="text-text-muted">Ricompense:</span> {r.ricompense.join(', ')}</span>}

      {/* Committente, date e note: si leggono una volta, quindi stanno dietro una riga. */}
      <button type="button" className="touch self-start text-[12px] text-text-muted underline decoration-dotted underline-offset-2" aria-expanded={aperta} onClick={() => setAperta((a) => !a)}>
        {aperta ? 'Nascondi i dettagli' : 'Dettagli'}
      </button>
      {aperta && (
        <div className="flex flex-col gap-1 text-[12px] text-text-secondary">
          <span><span className="text-text-muted">Da:</span> {r.committente || '—'}</span>
          <span><span className="text-text-muted">Disponibile dal</span> {r.disponibileDal || '—'}{r.scadenza ? ` · scadenza ${r.scadenza}` : ''}</span>
          {r.note && <span>{r.note}</span>}
        </div>
      )}

      {/* I comandi stavano dentro la piega: erano il gesto della pagina, chiuso a chiave. */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {partitaId && r.stato !== 'accettata' && r.stato !== 'completata' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Accettata" disabled={occupato} onClick={() => void cambia('accettata')} />}
        {partitaId && r.stato !== 'completata' && <button type="button" className="btn btn-primary btn-sm touch" disabled={occupato} onClick={() => void cambia('completata')}>Completata</button>}
        {partitaId && r.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" disabled={occupato} onClick={() => void cambia(null)} />}
        {r.areaChiave && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri il Dedalo" to={`/guida/dungeon/mementos?area=${r.areaChiave}`} />}
        {r.confidente && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Confidente" to={`/confidenti/${r.confidente.chiave}`} />}
        {r.fonte && <a href={r.fonte} target="_blank" rel="noreferrer" className="credito self-center">fonte</a>}
      </div>
    </li>
  );
}

export function RichiestePage() {
  useDocumentTitle('Richieste dei Mementos');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getRichieste(partitaId ?? undefined), [partitaId]);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const [area, setArea] = useState<string | null>(null);
  // Il foglio sta nell'indirizzo: così un collegamento a Jose porta a Jose.
  const [params, setParams] = useSearchParams();
  const foglio: Foglio = params.get('foglio') === 'jose' ? 'jose' : 'richieste';
  const d = dati.dati;
  const aree = useMemo(() => [...new Set((d?.richieste ?? []).map((r) => r.area))], [d]);
  const visibili = useMemo(() => (d?.richieste ?? [])
    .filter((r) => (area === null || r.area === area) && (filtro === 'tutte' || (filtro === 'da-fare' && !r.stato) || (filtro === 'accettate' && r.stato === 'accettata') || (filtro === 'completate' && r.stato === 'completata')))
    // Le completate in fondo: restano consultabili, ma non davanti a quelle da fare.
    .sort((a, b) => Number(a.stato === 'completata') - Number(b.stato === 'completata')), [d, filtro, area]);
  const accettate = useMemo(() => (d?.richieste ?? []).filter((r) => r.stato === 'accettata').length, [d]);
  const aggiorna = (r: RichiestaDto) => { if (d) dati.imposta({ ...d, richieste: d.richieste.map((x) => (x.chiave === r.chiave ? r : x)), completate: d.richieste.filter((x) => (x.chiave === r.chiave ? r.stato : x.stato) === 'completata').length }); };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Richieste dei Mementos" sottotitolo={<>{d.totale} Richieste dalla guida allgamestaff: committente, date, Dedalo e area, bersaglio con debolezze, ricompense e Confidente collegato.{partitaId ? ` Nella partita «${attiva?.nome}».` : ' Attiva una partita per segnare accettate e completate.'}</>} />

          {/* **Jose è un foglio a parte**, non una coda in fondo alle Richieste: i suoi fiori, i
              timbri e la tabella degli scambi sono un'altra faccenda, e messi sotto trentatré
              carte si trovavano solo scorrendo fino in fondo. Richiesta dell'utente. */}
          {d.jose && <FilaScorrevole role="tablist" aria-label="Fogli">
            {([['richieste', 'Le Richieste', 'richiesta'], ['jose', 'Jose: fiori e scambi', 'jose']] as Array<[Foglio, string, string]>).map(([k, l, icona]) => (
              <button key={k} type="button" role="tab" aria-selected={foglio === k} title={l}
                className={`piastrella-scheda touch ${foglio === k ? 'piastrella-scheda--attiva' : ''}`}
                onClick={() => setParams(k === 'richieste' ? {} : { foglio: k }, { replace: true })}>
                {k === 'richieste' ? <IconaCategoria categoria={icona} dimensione={28} /> : <IconaScheda chiave="jose" dimensione={28} />}
                <span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>}

          {foglio === 'richieste' && <>
          {partitaId && <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo delle Richieste">
            <div className="kpi-tile"><span className="kpi-value">{d.totale}</span><span className="kpi-label">in tutto</span></div>
            <div className="kpi-tile"><span className="kpi-value">{d.totale - d.completate - accettate}</span><span className="kpi-label">da fare</span></div>
            <div className="kpi-tile"><span className="kpi-value">{accettate}</span><span className="kpi-label">accettate</span></div>
            <div className="kpi-tile"><span className="kpi-value">{d.completate}</span><span className="kpi-label">completate</span></div>
          </section>}

          <div className="flex flex-wrap items-center gap-1.5">
            {([['tutte', 'Tutte'], ['da-fare', 'Da fare'], ['accettate', 'Accettate'], ['completate', 'Completate']] as Array<[Filtro, string]>).map(([k, l]) => (
              <button key={k} type="button" className={`chip touch ${filtro === k ? 'chip--attivo' : ''}`} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>{l}</button>
            ))}
            <select className="form-input w-auto sm:ml-auto" value={area ?? ''} onChange={(e) => setArea(e.target.value || null)} aria-label="Dedalo">
              <option value="">Tutti i Dedali</option>
              {aree.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Una griglia, non una colonna: le carte sono corte e su uno schermo largo ne stanno
              tre per riga, che è la differenza fra scorrere cinque schermate e vederne dodici. */}
          <ul className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Richieste">
            {visibili.length === 0 && <li className="text-[13px] text-text-muted" role="status">Nessuna Richiesta con questi filtri.</li>}
            {visibili.map((r) => <Richiesta key={r.chiave} r={r} partitaId={partitaId} onCambiata={aggiorna} />)}
          </ul>
          </>}

          {foglio === 'jose' && d.jose && (
            <div className="flex flex-col gap-3 text-[13px]">
              <section className="card card--con-fregio flex flex-col gap-2">
                <FregioSezione chiave="jose-fiori" />
                <h2 className="m-0 font-display text-[17px] uppercase leading-none">Jose: fiori, timbri e scambi</h2>
                <p className="m-0 text-text-secondary">{d.jose.introduzione}</p>
                <div className="grid gap-1.5 md:grid-cols-2">
                  {d.jose.fiori && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">Fiori</span>
                    <span>{typeof d.jose.fiori === 'string' ? d.jose.fiori : d.jose.fiori.descrizione}</span>
                  </div>}
                  {d.jose.timbri && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">Timbri</span>
                    <span>{typeof d.jose.timbri === 'string' ? d.jose.timbri : d.jose.timbri.descrizione}</span>
                  </div>}
                  {d.jose.bossSegreto && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2 md:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">Boss segreto</span>
                    <span><strong>{d.jose.bossSegreto.nome}</strong> — {d.jose.bossSegreto.condizione}</span>
                  </div>}
                </div>
              </section>
              {d.jose.scambi.length > 0 && (
                <section className="card card--con-fregio flex flex-col gap-2" aria-label="Scambi con Jose">
                  <FregioSezione chiave="jose-scambi" forma="banda" />
                  <h3 className="m-0 font-display text-[15px] uppercase leading-none">Che cosa dà, e per quanti fiori</h3>
                  <div className="overflow-x-auto">
                    <table className="tabella tabella--adattiva text-[12px]">
                      <thead><tr><th>Oggetto</th><th>Fiori</th><th>Effetto</th><th>Requisito</th></tr></thead>
                      <tbody>{d.jose.scambi.map((s, i) => <tr key={i}><td data-etichetta="Oggetto"><strong>{s.nome}</strong></td><td data-etichetta="Fiori" className="tabular-nums">{s.costo}</td><td data-etichetta="Effetto">{s.effetto}</td><td data-etichetta="Requisito">{s.requisito}</td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </PageState>
  );
}
