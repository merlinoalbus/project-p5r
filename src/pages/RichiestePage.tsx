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
//
// Le Richieste si correggono, si aggiungono e si eliminano da qui (richiesta dell'utente, 2026-10-11): «Modifica» su ogni carta
// e «Aggiungi una Richiesta» in cima aprono `ModuloRichiesta`, lo stesso della colonna del dedalo.
// ============================================================

import { useMemo, useState } from 'react';
import { OggettiCollegati } from '../components/catalogo/OggettiCollegati';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questo hook, fuori dal pannello, è quello di react-router-dom
import { useSearchParams } from '../components/scheda/routerScheda';
import { getRichieste, impostaStatoRichiesta } from '../services/api';
import { segnalaMutazioneEffetti } from '../services/gestiPartita';
import { PARAMETRO_ELEMENTO } from '../../shared/ricerca';
import { useCarica } from '../hooks/useCarica';
import { useSchede } from '../hooks/useSchede';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import type { RichiestaDto, StatoCalcolatoRichiestaDto, StatoRichiesta } from '../types';
import { dataLeggibile } from '../../shared/condizioniSpillo';

/** L13: il nome dello stato calcolato di una Richiesta nella partita. */
const NOME_STATO: Record<StatoCalcolatoRichiestaDto['stato'], string> = { bloccata: 'Bloccata', disponibile: 'Disponibile', 'da-verificare': 'Da verificare', accettata: 'Accettata', completata: 'Completata', scaduta: 'Scaduta' };
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { SezioneConFregio } from '../components/shared/FregioSezione';
import { PulsanteVisivo, CollegamentoVisivo, FrecciaApertura } from '../components/shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { IconaScheda } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { coloreElemento } from '../utils/elementi';
import { chiaveElementoDaTesto, nomeCanonicoNelTesto } from '../utils/elementiGuida';
import { piatto } from '../utils/testo';
import { ModuloRichiesta } from '../components/guida/ModuloRichiesta';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { DaApplicare } from '../components/partita/DaApplicare';
import { conferma } from '../stores/confermaStore';
import { GIORNI_AVVISO_SCADENZA_RICHIESTE as GIORNI_AVVISO } from '../../shared/richieste';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type Accettazione = 'tutte' | 'accettate' | 'non-accettate';
type Completamento = 'tutte' | 'completate' | 'da-completare';
const ACCETTAZIONE: ReadonlyArray<{ chiave: Accettazione; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'accettate', nome: 'Accettate' }, { chiave: 'non-accettate', nome: 'Non accettate' }];
const COMPLETAMENTO: ReadonlyArray<{ chiave: Completamento; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'completate', nome: 'Completate' }, { chiave: 'da-completare', nome: 'Da completare' }];
/** I due fogli della pagina: le Richieste, e la bottega di Jose. */
type Foglio = 'richieste' | 'jose';
/** I fogli della pagina: chiave, nome e icona. */
const FOGLI: ReadonlyArray<[Foglio, string, string]> = [['richieste', 'Le Richieste', 'richiesta'], ['jose', 'Jose: fiori e scambi', 'jose']];

/** Pastiglia di una debolezza o di una resistenza: colorata se l'elemento si riconosce (vocabolario unico `shared/elementi`), con il nome canonico. */
function Affinita({ testo: scritto, tipo }: { testo: string; tipo: 'debole' | 'resiste' }) {
  const elemento = chiaveElementoDaTesto(scritto);
  const testo = nomeCanonicoNelTesto(scritto);
  if (!elemento) return <span className="chip testo-12" title={tipo === 'debole' ? 'Debolezza del bersaglio' : 'Il bersaglio resiste'}>{testo}</span>;
  const colore = coloreElemento(elemento);
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 testo-12 font-semibold"
    style={{ borderColor: colore, color: colore, background: `color-mix(in srgb, ${colore} ${tipo === 'debole' ? 18 : 8}%, transparent)` }}
    title={tipo === 'debole' ? 'Debolezza del bersaglio' : 'Il bersaglio resiste'}>
    <span aria-hidden>{tipo === 'debole' ? '▼' : '▲'}</span>{testo}
  </span>;
}

/**
 * La carta di una Richiesta: nome, dedalo e piano, stato nella partita, suggerimento, il
 * bersaglio con forma demoniaca, livello, debolezze e resistenze colorate e l'utilità della
 * confusione, il Confidente collegato e le ricompense; «Dettagli» apre committente, date e note.
 * Con una partita offre i comandi Accettata, Completata e Riapri secondo lo stato, e sempre i
 * collegamenti al dedalo e al Confidente.
 */
function Richiesta({ r, partitaId, onCambiata, onModifica }: { r: RichiestaDto; partitaId: number | null; onCambiata: (r: RichiestaDto) => void; onModifica: () => void }) {
  const [aperta, setAperta] = useState(false);
  const sugg = useSuggerimenti();
  const [occupato, setOccupato] = useState(false);
  /** Imposta lo stato della Richiesta nella partita (null la riapre), disattivando i comandi durante la richiesta; passa al genitore la Richiesta aggiornata o notifica l'errore. */
  const cambia = async (stato: StatoRichiesta | null) => {
    if (!partitaId) return;
    // L13: una Richiesta «da verificare» si può accettare, ma prima si dice perché (sblocco o scadenza ancora solo nel testo della guida)
    if (stato === 'accettata' && r.statoPartita?.stato === 'da-verificare'
      && !(await conferma({ titolo: `Accettare «${r.nome}»?`, testo: `Lo sblocco o la scadenza non sono ancora dati verificati: ${r.statoPartita.motivi.join(' ')} Controlla nel gioco che sia davvero disponibile.`, etichetta: 'Accetta' }))) return;
    setOccupato(true);
    // dopo il cambio di stato il server ha mosso da solo gli yen (decisione 18) o, per una proposta nata prima, l'ha chiusa: tutto si rilegge subito
    try { onCambiata(await impostaStatoRichiesta(partitaId, r.chiave, stato)); segnalaMutazioneEffetti(partitaId); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex min-w-0 flex-col gap-2 ${r.stato === 'completata' ? 'border-success/40 opacity-70' : ''} ${classiSuggerito(sugg.evidenziato('richieste', r.chiave))}`}>
      <div className="flex items-start gap-2.5">
        <IconaCategoria categoria="richiesta" dimensione={36} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="m-0 testo-16 leading-tight">{r.nome}</h3>
          <span className="testo-12 text-text-muted">{r.areaNome ?? r.area}{r.piano ? ` · ${r.piano}` : ''}</span>
        </div>
        {r.statoPartita ? <span className={`chip shrink-0 testo-12 ${r.statoPartita.stato === 'accettata' || r.statoPartita.stato === 'disponibile' ? 'chip--attivo' : r.statoPartita.stato === 'da-verificare' ? 'border-warning text-warning' : ''}`}>{NOME_STATO[r.statoPartita.stato]}</span>
          : r.stato && <span className={`chip shrink-0 testo-12 ${r.stato === 'completata' ? '' : 'chip--attivo'}`}>{r.stato}</span>}
      </div>
      {/* L13: perché è bloccata, scaduta o da verificare (il server lo calcola, la pagina lo mostra); in scadenza entro una settimana lo dice */}
      {r.statoPartita && r.statoPartita.motivi.length > 0 && (
        <ul className={`m-0 flex flex-col gap-0.5 pl-4 testo-12 ${r.statoPartita.stato === 'bloccata' || r.statoPartita.stato === 'scaduta' || r.statoPartita.stato === 'da-verificare' ? 'text-warning' : 'text-text-secondary'}`}>
          {r.statoPartita.motivi.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      {r.statoPartita && r.statoPartita.giorniAllaScadenza !== null && r.statoPartita.giorniAllaScadenza <= GIORNI_AVVISO && r.statoPartita.stato !== 'completata' && r.statoPartita.stato !== 'bloccata' && (
        <span className="testo-12 text-warning">{r.statoPartita.giorniAllaScadenza === 0 ? 'Scade oggi' : `Scade fra ${r.statoPartita.giorniAllaScadenza} ${r.statoPartita.giorniAllaScadenza === 1 ? 'giorno' : 'giorni'}`} ({dataLeggibile(r.statoPartita.scadenzaEffettiva!)})</span>
      )}
      {sugg.evidenziato('richieste', r.chiave) && <TargaSuggerito motivo={sugg.motivo('richieste', r.chiave)} compatta />}

      {/* Il bersaglio è la ragione per cui si apre questa pagina prima di scendere: chi è, e a
          che cosa cede. */}
      <div className="flex flex-col gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-2">
        <span className="testo-13">
          <strong>{r.bersaglio.nome}</strong>
          {r.bersaglio.formaDemoniaca && <span className="text-text-secondary"> · {r.bersaglio.formaDemoniaca}</span>}
          {r.bersaglio.livello && <span className="text-text-muted"> · livello {r.bersaglio.livello}</span>}
        </span>
        {/* L13: livello e affinità letti dalla scheda dell'Ombra del compendio (il server li risolve), detto in chiaro */}
        {r.ombra && r.bersaglio.daOmbra && (r.bersaglio.daOmbra.livello || r.bersaglio.daOmbra.affinita) && (
          <span className="testo-12 text-text-muted">{[r.bersaglio.daOmbra.livello ? 'Livello' : null, r.bersaglio.daOmbra.affinita ? 'affinità' : null].filter(Boolean).join(' e ')} dalla scheda dell’Ombra «{r.ombra.nome}»</span>
        )}
        {(r.bersaglio.debolezze.length > 0 || r.bersaglio.resistenze.length > 0 || r.bersaglio.vulnerabileConfusione) && (
          <div className="flex flex-wrap gap-1">
            {r.bersaglio.debolezze.map((x, i) => <Affinita key={`d${i}`} testo={x} tipo="debole" />)}
            {r.bersaglio.resistenze.map((x, i) => <Affinita key={`r${i}`} testo={x} tipo="resiste" />)}
            {r.bersaglio.vulnerabileConfusione && <span className="chip testo-12" title="Confondendolo si ottengono yen">Confusione utile</span>}
          </div>
        )}
      </div>

      {r.confidente && <span className="testo-12 text-text-secondary">Confidente: <strong className="text-text">{r.confidente.nome}</strong>{r.confidente.rango ? ` · rango ${r.confidente.rango}` : ''}</span>}
      {r.ombra && <span className="testo-12 text-text-secondary">Ombra del compendio: <strong className="text-text">{r.ombra.nome}</strong>{r.ombra.livello ? ` · livello ${r.ombra.livello}` : ''}</span>}
      {!!r.oggettiRicompensa?.length && <div className="min-w-0 testo-12"><span className="text-text-muted">Ricompense:</span><OggettiCollegati oggetti={r.oggettiRicompensa} /></div>}
      {(r.yen || r.esperienza) && <span className="testo-12 text-text-secondary">{[r.yen ? `¥${r.yen.toLocaleString('it-IT')}` : null, r.esperienza ? `${r.esperienza.toLocaleString('it-IT')} PE` : null].filter(Boolean).join(' · ')}</span>}
      {/* L13 (decisione 18): che cosa fanno davvero gli yen della ricompensa in questa partita (il server lo legge dal registro): con una proposta
          «Applica» nata prima (`yenDaProposta`) vale quella, qui sotto; entrati da soli completandola; già nel saldo da prima (`fuori-registro`);
          altrimenti entreranno completandola */}
      {partitaId && !!r.yen && r.yen > 0 && <span className="testo-12 text-text-muted">{r.statoPartita?.yenDaProposta
        ? 'La ricompensa in yen di questa Richiesta è legata a una proposta «Applica» nata prima: non entra né esce da sola dal saldo.'
        : r.statoPartita?.yenRicompensa === 'entrati'
          ? 'La ricompensa in yen è entrata da sola nel saldo; riaprendo la Richiesta si toglie (al più fino a zero).'
          : r.statoPartita?.yenRicompensa === 'fuori-registro'
            ? 'La ricompensa in yen era già nel saldo da prima che gli yen si muovessero da soli: completandola o riaprendola il saldo non cambia.'
            : 'Completandola, la ricompensa in yen entra da sola nel saldo.'}</span>}
      {r.ricompense.length > 0 && (r.oggettiRicompensa?.length
        ? <details className="testo-12 text-text-secondary"><summary className="touch">Indicazioni della guida sulle ricompense</summary><p className="m-0 whitespace-pre-line">{r.ricompense.join(', ')}</p></details>
        : <span className="testo-12 text-text-secondary"><span className="text-text-muted">Ricompense indicate dalla guida:</span> {r.ricompense.join(', ')}</span>)}

      {/* L13 (decisione 3): le ricompense le applica la Richiesta completata. Gli yen (decisione 18) si muovono da soli; qui restano solo le
          proposte «Applica» nate prima (anche l'inversa, se la si riapre dopo averli applicati); gli oggetti del catalogo sono fra gli oggetti
          ottenuti della partita, finché resta completata */}
      {partitaId && !!r.yen && r.yen > 0 && <DaApplicare partitaId={partitaId} richiesta={r.chiave} />}
      {partitaId && r.stato === 'completata' && !!r.oggettiRicompensa?.length && (
        <CollegamentoVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Fra gli oggetti ottenuti"
          aria-label="I suoi oggetti sono fra gli oggetti ottenuti: apri Partita, Denaro e squadra" to="/partita?scheda=squadra" />
      )}

      <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="dettagli" dimensione={20} />} aria-expanded={aperta} onClick={() => setAperta((a) => !a)}
        titolo={<>{aperta ? 'Nascondi i dettagli' : 'Dettagli'}<FrecciaApertura aperto={aperta} /></>} />
      {aperta && (
        <div className="flex flex-col gap-1 testo-12 text-text-secondary">
          <span><span className="text-text-muted">Da:</span> {r.committente || '—'}</span>
          {r.condizioni.length > 0 && <span><span className="text-text-muted">Si sblocca:</span> {r.condizioni.map((c) => c.testo).join(' · ')}</span>}
          {r.disponibileDal && <span><span className="text-text-muted">Disponibile dal (guida)</span> {r.disponibileDal}</span>}
          {!r.condizioni.length && !r.disponibileDal && <span><span className="text-text-muted">Si sblocca:</span> da subito</span>}
          {r.scadenzaData && <span><span className="text-text-muted">Scadenza</span> {dataLeggibile(r.scadenzaData)}{r.proroga ? ` · prorogata al ${dataLeggibile(r.proroga.data)} se ${r.proroga.condizioni.map((c) => c.testo).join(' e ') || 'vale la proroga'}` : ''}</span>}
          {r.scadenza && <span><span className="text-text-muted">Scadenza (guida)</span> {r.scadenza}</span>}
          {r.note && <span>{r.note}</span>}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {/* L13: «Accetta» solo se la Richiesta è disponibile nella partita, o da verificare con l'avviso (il server rifiuta il resto anche lui) */}
        {partitaId && r.stato !== 'accettata' && r.stato !== 'completata' && (!r.statoPartita || r.statoPartita.accettabile) && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Accettata"
          dettaglio={r.statoPartita?.stato === 'da-verificare' ? 'da verificare' : undefined} disabled={occupato} onClick={() => void cambia('accettata')} />}
        {partitaId && r.stato !== 'completata' && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Completata" disabled={occupato} onClick={() => void cambia('completata')} />}
        {partitaId && r.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" disabled={occupato} onClick={() => void cambia(null)} />}
        {r.areaChiave && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri il Dedalo" to={`/guida/dungeon/mementos?area=${r.areaChiave}`} />}
        {r.confidente && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Confidente" to={`/confidenti/${r.confidente.chiave}`} />}
        {r.ombra && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Ombra" aria-label={`Apri la scheda dell’Ombra «${r.ombra.nome}»`} to={`/guida/ombra/${encodeURIComponent(r.ombra.chiave)}`} />}
        {/* la Richiesta si corregge (o si elimina) dove la si legge (scelta dell'utente, 2026-10-11) */}
        {!IN_RILASCIO && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica la Richiesta «${r.nome}»`} onClick={onModifica} />}
      </div>
    </li>
  );
}


/**
 * Pagina delle Richieste dei Mementos: carica le Richieste per la partita attiva e legge dall'URL
 * il foglio (Richieste o Jose, offerto solo se i dati di Jose ci sono) e il dedalo scelto. Nel
 * foglio delle Richieste mostra i conteggi, i filtri (testo, dedalo, accettazione e
 * completamento) e le carte con le completate in fondo; il cambio di stato aggiorna la riga nei
 * dati correnti e ricalcola le completate in tutto e per dedalo. Il foglio di Jose mostra fiori,
 * timbri, boss segreto e la tabella degli scambi.
 */
export function RichiestePage({ soloChiave }: { soloChiave?: string } = {}) {
  // R10-27: nel pannello sopra il diario `soloChiave` mostra la Richiesta citata dalla voce, senza intestazione, riepilogo e filtri
  useDocumentTitle('Richieste dei Mementos');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getRichieste(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [accettazione, setAccettazione] = useState<Accettazione>('tutte');
  const [completamento, setCompletamento] = useState<Completamento>('tutte');
  /** La Richiesta aperta nel modulo (null = una nuova), o nessun modulo. */
  const [modulo, setModulo] = useState<{ chiave: string | null } | null>(null);
  // Il foglio e il dedalo stanno nell'indirizzo: un collegamento a Jose porta a Jose, uno dal dedalo arriva già filtrato.
  const [params, setParams] = useSearchParams();
  const foglio: Foglio = params.get('foglio') === 'jose' ? 'jose' : 'richieste';
  const dedalo = params.get('dedalo') ?? '';
  /** Scrive il dedalo scelto nel parametro `dedalo` dell'URL (lo toglie se vuoto) senza aggiungere voci alla cronologia. */
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
  // dai dati correnti: la riga arriva dopo un `await`, e due cambi di stato ravvicinati non devono annullarsi
  const aggiorna = (r: RichiestaDto) => dati.imposta((attuale) => {
    const richieste = attuale.richieste.map((x) => (x.chiave === r.chiave ? r : x));
    return { ...attuale, richieste, completate: richieste.filter((x) => x.stato === 'completata').length, dedali: attuale.dedali.map((x) => ({ ...x, completate: richieste.filter((y) => y.areaChiave === x.chiave && y.stato === 'completata').length })) };
  });
  const filtriAttivi = !!q || !!dedalo || accettazione !== 'tutte' || completamento !== 'tutte';
  const fogli = useSchede<Foglio>({ chiavi: FOGLI.map(([k]) => k), attiva: foglio,
    onScegli: (k) => setParams((p) => { const n = new URLSearchParams(p); if (k === 'richieste') n.delete('foglio'); else n.set('foglio', k); return n; }, { replace: true }) });

  // L11 B4 (R11-07/3): l'indirizzo `?elemento=<chiave>` apre la stessa vista anche come pagina (è la «casa» di una Richiesta nella ricerca
  // globale); nel pannello il parametro è quello della scheda, che coincide con `soloChiave`
  const solo = soloChiave ?? params.get(PARAMETRO_ELEMENTO) ?? undefined;
  if (solo) {
    const richiesta = d?.richieste.find((x) => x.chiave === solo) ?? null;
    return (
      <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
        {d && (
          <div className="flex flex-col gap-2">
            {/* fuori dal pannello l'elemento è una pagina: si può tornare all'elenco (il nome della cosa, mai «Torna») */}
            {!soloChiave && <CollegamentoVisivo to="/guida/richieste" tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Tutte le Richieste" />}
            {richiesta
              ? <ul className="m-0 list-none p-0" aria-label="Richiesta"><Richiesta r={richiesta} partitaId={partitaId} onCambiata={aggiorna} onModifica={() => setModulo({ chiave: richiesta.chiave })} /></ul>
              : <p className="m-0 text-sm text-text-muted" role="status">Questa Richiesta non è nel catalogo.</p>}
          </div>
        )}
        {modulo && <ModuloRichiesta chiave={modulo.chiave} onChiudi={() => setModulo(null)} onCambiata={() => dati.ricarica()} />}
      </PageState>
    );
  }

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Richieste dei Mementos" sottotitolo={<>{d.totale} Richieste: committente, date, dedalo, bersaglio con debolezze, ricompense e Confidente collegato.{partitaId ? ` Nella partita «${attiva?.nome}».` : ' Attiva una partita per segnare accettate e completate.'}</>} />

          {/* Jose è un foglio a parte: i suoi fiori, i timbri e la tabella degli scambi sono un'altra faccenda. */}
          {d.jose && <FilaScorrevole {...fogli.lista} aria-label="Fogli">
            {FOGLI.map(([k, l, icona]) => (
              <button key={k} type="button" {...fogli.scheda(k)} title={l}
                className={`piastrella-scheda touch ${foglio === k ? 'piastrella-scheda--attiva' : ''}`}>
                {k === 'richieste' ? <IconaCategoria categoria={icona} dimensione={28} /> : <IconaScheda chiave="jose" dimensione={28} />}
                <span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>}

          {/* i due fogli, come pannello delle schede quando ci sono (con Jose); senza, il contenuto e basta */}
          <div {...(d.jose ? fogli.pannello(foglio) : {})} className="flex min-w-0 flex-col gap-4">
          {foglio === 'richieste' && <>
          {!IN_RILASCIO && <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Richiesta" dettaglio="vale per tutte le partite" onClick={() => setModulo({ chiave: null })} />}
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
              {filtriAttivi && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Azzera i filtri" onClick={() => { setRicerca(''); setAccettazione('tutte'); setCompletamento('tutte'); impostaDedalo(''); }} />}
            </div>
            {partitaId && <div className="filtri-articoli__riga">
              <Segmenti etichetta="Accettazione" valore={accettazione} opzioni={ACCETTAZIONE} onCambia={setAccettazione} />
              <Segmenti etichetta="Completamento" valore={completamento} opzioni={COMPLETAMENTO} onCambia={setCompletamento} />
            </div>}
          </section>

          <p className="m-0 testo-12 text-text-muted">{visibili.length} {visibili.length === 1 ? 'richiesta' : 'richieste'}{dedalo ? ` in ${d.dedali.find((x) => x.chiave === dedalo)?.nome ?? dedalo}` : ''}</p>
          <ul className="m-0 grid list-none grid-cols-1 items-start gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label="Richieste">
            {visibili.length === 0 && <li className="testo-13 text-text-muted" role="status">Nessuna Richiesta con questi filtri.</li>}
            {visibili.map((r) => <Richiesta key={r.chiave} r={r} partitaId={partitaId} onCambiata={aggiorna} onModifica={() => setModulo({ chiave: r.chiave })} />)}
          </ul>
          </>}

          {foglio === 'jose' && d.jose && (
            <div className="flex flex-col gap-3 testo-13">
              <SezioneConFregio chiave="jose-fiori" disposizione="grande">
                <div className="flex items-start gap-2">
                  <TitoloSezione variante="display" className="min-w-0 flex-1">Jose: fiori, timbri e scambi</TitoloSezione>
                  {/* L11 · B11 (R11-15/5): introduzione, fiori, timbri e boss segreto di Jose; gli scambi sono il suo listino */}
                  <ModificaGuida tipo="jose" chiave="jose" cosa="i testi di Jose" soloIcona onSalvato={() => void dati.ricarica()} />
                </div>
                <p className="m-0 text-text-secondary">{d.jose.introduzione}</p>
                <div className="grid gap-1.5 md:grid-cols-2">
                  {d.jose.fiori && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2">
                    <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">Fiori</span>
                    <span>{typeof d.jose.fiori === 'string' ? d.jose.fiori : d.jose.fiori.descrizione}</span>
                  </div>}
                  {d.jose.timbri && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2">
                    <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">Timbri</span>
                    <span>{typeof d.jose.timbri === 'string' ? d.jose.timbri : d.jose.timbri.descrizione}</span>
                  </div>}
                  {d.jose.bossSegreto && <div className="flex flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-2 md:col-span-2">
                    <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">Boss segreto</span>
                    <span><strong>{d.jose.bossSegreto.nome}</strong> — {d.jose.bossSegreto.condizione}</span>
                  </div>}
                </div>
              </SezioneConFregio>
              {d.jose.listino !== undefined ? (
                <SezioneConFregio chiave="jose-scambi" forma="banda" disposizione="fascia" aria-label="Scambi con Jose">
                  <h3 className="m-0 font-display testo-15 uppercase leading-none">Che cosa dà, e per quanti fiori</h3>
                  {d.jose.listino ? <>
                    <CollegamentoVisivo to={`/guida/negozi/${encodeURIComponent(d.jose.listino.chiave)}`} icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={`Apri il listino di ${d.jose.listino.nome}`} compatto />
                    <p className="m-0 testo-12 text-text-muted">Le aperture effettive dei dedali si segnano in Partita → Progressi. Costi, requisiti e acquisti sono gli stessi del listino.</p>
                    <ArticoliTabella articoli={d.jose.listino.articoliElenco} partitaId={partitaId} onCambiato={() => void dati.ricarica()} />
                  </> : <p className="m-0 testo-13 text-text-muted">Il listino di Jose è stato rimosso o nascosto. Le indicazioni della guida restano conservate.</p>}
                </SezioneConFregio>
              ) : d.jose.scambi.length > 0 && (
                <SezioneConFregio chiave="jose-scambi" forma="banda" disposizione="fascia" aria-label="Scambi con Jose">
                  <h3 className="m-0 font-display testo-15 uppercase leading-none">Che cosa dà, e per quanti fiori</h3>
                  <div className="area-scorrevole-x">
                    <table className="tabella tabella--adattiva testo-12">
                      <thead><tr><th>Oggetto</th><th>Fiori</th><th>Effetto</th><th>Requisito</th></tr></thead>
                      <tbody>{d.jose.scambi.map((s, i) => <tr key={i}><td data-etichetta="Oggetto"><strong>{s.nome}</strong></td><td data-etichetta="Fiori" className="tabular-nums">{s.costo}</td><td data-etichetta="Effetto">{s.effetto}</td><td data-etichetta="Requisito">{s.requisito}</td></tr>)}</tbody>
                    </table>
                  </div>
                </SezioneConFregio>
              )}
            </div>
          )}
          </div>
        </div>
      )}
      {/* il modulo della Richiesta: per correggerne una o aggiungerne una nuova (2026-10-11) */}
      {modulo && <ModuloRichiesta chiave={modulo.chiave} onChiudi={() => setModulo(null)} onCambiata={() => dati.ricarica()} />}
    </PageState>
  );
}
