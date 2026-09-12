// ============================================================
// RichiestePage — Richieste dei Mementos con bersaglio, ricompense, Confidente e stato per partita; Jose (Fase 7.2)
// ============================================================
//
// Una Richiesta si sceglie guardando due cose: dove sta (che dedalo) e a che cosa è debole il
// bersaglio. Quelle due sono la faccia della carta: le debolezze come pastiglie del colore del
// loro elemento e la posizione in cima. Il resto — committente, date, note — sta dietro «Dettagli».
//
// I filtri sono valori: la ricerca (nome, bersaglio, forma demoniaca, Confidente, dedalo,
// committente), due segmenti indipendenti — accettazione e completamento — e il dedalo scelto
// fra quelli che hanno richieste, nell'ordine di percorrenza, tenuto nell'indirizzo (`?dedalo=`)
// così dalla scheda del dedalo si arriva già filtrati.
// ============================================================

import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
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
import { SezioneConFregio } from '../components/shared/FregioSezione';
import { PulsanteVisivo, CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { IconaScheda } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { coloreElemento } from '../utils/elementi';

type Accettazione = 'tutte' | 'accettate' | 'non-accettate';
type Completamento = 'tutte' | 'completate' | 'da-completare';
const ACCETTAZIONE: ReadonlyArray<{ chiave: Accettazione; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'accettate', nome: 'Accettate' }, { chiave: 'non-accettate', nome: 'Non accettate' }];
const COMPLETAMENTO: ReadonlyArray<{ chiave: Completamento; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'completate', nome: 'Completate' }, { chiave: 'da-completare', nome: 'Da completare' }];
/** I due fogli della pagina: le Richieste, e la bottega di Jose. */
type Foglio = 'richieste' | 'jose';

/** Dal nome italiano dell'elemento, come lo scrive la guida, alla chiave del colore. */
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
          <span className="text-[12px] text-text-muted">{r.areaNome ?? r.area}{r.piano ? ` · ${r.piano}` : ''}</span>
        </div>
        {r.stato && <span className={`chip shrink-0 text-[11px] ${r.stato === 'completata' ? '' : 'chip--attivo'}`}>{r.stato}</span>}
      </div>
      {sugg.evidenziato('richieste', r.chiave) && <TargaSuggerito motivo={sugg.motivo('richieste', r.chiave)} compatta />}

      {/* Il bersaglio è la ragione per cui si apre questa pagina prima di scendere: chi è, e a
          che cosa cede. */}
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

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {partitaId && r.stato !== 'accettata' && r.stato !== 'completata' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Accettata" disabled={occupato} onClick={() => void cambia('accettata')} />}
        {partitaId && r.stato !== 'completata' && <button type="button" className="btn btn-primary btn-sm touch" disabled={occupato} onClick={() => void cambia('completata')}>Completata</button>}
        {partitaId && r.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" disabled={occupato} onClick={() => void cambia(null)} />}
        {r.areaChiave && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri il Dedalo" to={`/guida/dungeon/mementos?area=${r.areaChiave}`} />}
        {r.confidente && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Confidente" to={`/confidenti/${r.confidente.chiave}`} />}
      </div>
    </li>
  );
}

const piatto = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');

export function RichiestePage() {
  useDocumentTitle('Richieste dei Mementos');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getRichieste(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [accettazione, setAccettazione] = useState<Accettazione>('tutte');
  const [completamento, setCompletamento] = useState<Completamento>('tutte');
  // Il foglio e il dedalo stanno nell'indirizzo: un collegamento a Jose porta a Jose, uno dal dedalo arriva già filtrato.
  const [params, setParams] = useSearchParams();
  const foglio: Foglio = params.get('foglio') === 'jose' ? 'jose' : 'richieste';
  const dedalo = params.get('dedalo') ?? '';
  const impostaDedalo = (k: string) => setParams((p) => { const n = new URLSearchParams(p); if (k) n.set('dedalo', k); else n.delete('dedalo'); return n; }, { replace: true });
  const d = dati.dati;
  const q = piatto(ricerca.trim());
  const visibili = useMemo(() => (d?.richieste ?? [])
    .filter((r) => {
      if (dedalo && r.areaChiave !== dedalo) return false;
      if (accettazione === 'accettate' && r.stato !== 'accettata') return false;
      if (accettazione === 'non-accettate' && r.stato !== null) return false;
      if (completamento === 'completate' && r.stato !== 'completata') return false;
      if (completamento === 'da-completare' && r.stato === 'completata') return false;
      if (q && !piatto(`${r.nome} ${r.bersaglio.nome} ${r.bersaglio.formaDemoniaca} ${r.confidente?.nome ?? ''} ${r.areaNome ?? r.area} ${r.committente}`).includes(q)) return false;
      return true;
    })
    // Le completate in fondo: restano consultabili, ma non davanti a quelle da fare.
    .sort((a, b) => Number(a.stato === 'completata') - Number(b.stato === 'completata')), [d, dedalo, accettazione, completamento, q]);
  const accettate = useMemo(() => (d?.richieste ?? []).filter((r) => r.stato === 'accettata').length, [d]);
  const aggiorna = (r: RichiestaDto) => {
    if (!d) return;
    const richieste = d.richieste.map((x) => (x.chiave === r.chiave ? r : x));
    dati.imposta({ ...d, richieste, completate: richieste.filter((x) => x.stato === 'completata').length, dedali: d.dedali.map((x) => ({ ...x, completate: richieste.filter((y) => y.areaChiave === x.chiave && y.stato === 'completata').length })) });
  };
  const filtriAttivi = !!q || !!dedalo || accettazione !== 'tutte' || completamento !== 'tutte';

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Richieste dei Mementos" sottotitolo={<>{d.totale} Richieste: committente, date, dedalo, bersaglio con debolezze, ricompense e Confidente collegato.{partitaId ? ` Nella partita «${attiva?.nome}».` : ' Attiva una partita per segnare accettate e completate.'}</>} />

          {/* Jose è un foglio a parte: i suoi fiori, i timbri e la tabella degli scambi sono un'altra faccenda. */}
          {d.jose && <FilaScorrevole role="tablist" aria-label="Fogli">
            {([['richieste', 'Le Richieste', 'richiesta'], ['jose', 'Jose: fiori e scambi', 'jose']] as Array<[Foglio, string, string]>).map(([k, l, icona]) => (
              <button key={k} type="button" role="tab" aria-selected={foglio === k} title={l}
                className={`piastrella-scheda touch ${foglio === k ? 'piastrella-scheda--attiva' : ''}`}
                onClick={() => setParams((p) => { const n = new URLSearchParams(p); if (k === 'richieste') n.delete('foglio'); else n.set('foglio', k); return n; }, { replace: true })}>
                {k === 'richieste' ? <IconaCategoria categoria={icona} dimensione={28} /> : <IconaScheda chiave="jose" dimensione={28} />}
                <span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>}

          {foglio === 'richieste' && <>
          {partitaId && <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Riepilogo delle Richieste">
            <div className="kpi-tile"><span className="kpi-value">{d.totale}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="catalogo" />in tutto</span></div>
            <div className="kpi-tile"><span className="kpi-value">{d.totale - d.completate - accettate}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="sfide" />da fare</span></div>
            <div className="kpi-tile"><span className="kpi-value">{accettate}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="iniziati" />accettate</span></div>
            <div className="kpi-tile"><span className="kpi-value">{d.completate}</span><span className="kpi-label kpi-label--segno"><IconaSegno chiave="completati" />completate</span></div>
          </section>}

          <section className="filtri-articoli" role="search" aria-label="Filtri delle Richieste">
            <div className="filtri-articoli__riga">
              <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca richiesta, bersaglio, Confidente, dedalo…" />
              {/* I dedali nell'ordine in cui si percorrono, con quante richieste hanno. */}
              <Selettore compatto etichetta="Dedalo" valore={dedalo} vuoto="Tutti i Dedali" opzioni={d.dedali.map((x) => ({ chiave: x.chiave, nome: x.nome, dettaglio: partitaId ? `${x.completate} completate su ${x.totale}` : `${x.totale} richieste` }))} onCambia={impostaDedalo} />
              {filtriAttivi && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => { setRicerca(''); setAccettazione('tutte'); setCompletamento('tutte'); impostaDedalo(''); }}>Azzera i filtri</button>}
            </div>
            {partitaId && <div className="filtri-articoli__riga">
              <Segmenti etichetta="Accettazione" valore={accettazione} opzioni={ACCETTAZIONE} onCambia={setAccettazione} />
              <Segmenti etichetta="Completamento" valore={completamento} opzioni={COMPLETAMENTO} onCambia={setCompletamento} />
            </div>}
          </section>

          <p className="m-0 text-[12px] text-text-muted">{visibili.length} {visibili.length === 1 ? 'richiesta' : 'richieste'}{dedalo ? ` in ${d.dedali.find((x) => x.chiave === dedalo)?.nome ?? dedalo}` : ''}</p>
          <ul className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Richieste">
            {visibili.length === 0 && <li className="text-[13px] text-text-muted" role="status">Nessuna Richiesta con questi filtri.</li>}
            {visibili.map((r) => <Richiesta key={r.chiave} r={r} partitaId={partitaId} onCambiata={aggiorna} />)}
          </ul>
          </>}

          {foglio === 'jose' && d.jose && (
            <div className="flex flex-col gap-3 text-[13px]">
              <SezioneConFregio chiave="jose-fiori" disposizione="grande">
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
              </SezioneConFregio>
              {d.jose.scambi.length > 0 && (
                <SezioneConFregio chiave="jose-scambi" forma="banda" disposizione="fascia" aria-label="Scambi con Jose">
                  <h3 className="m-0 font-display text-[15px] uppercase leading-none">Che cosa dà, e per quanti fiori</h3>
                  <div className="overflow-x-auto">
                    <table className="tabella tabella--adattiva text-[12px]">
                      <thead><tr><th>Oggetto</th><th>Fiori</th><th>Effetto</th><th>Requisito</th></tr></thead>
                      <tbody>{d.jose.scambi.map((s, i) => <tr key={i}><td data-etichetta="Oggetto"><strong>{s.nome}</strong></td><td data-etichetta="Fiori" className="tabular-nums">{s.costo}</td><td data-etichetta="Effetto">{s.effetto}</td><td data-etichetta="Requisito">{s.requisito}</td></tr>)}</tbody>
                    </table>
                  </div>
                </SezioneConFregio>
              )}
            </div>
          )}
        </div>
      )}
    </PageState>
  );
}
