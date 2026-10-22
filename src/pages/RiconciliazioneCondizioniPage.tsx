import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getRiconciliazioneCondizioni, decidiRiconciliazioneCondizioni } from '../services/api';
import { CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { Modal } from '../components/shared/Modal';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { Selettore } from '../components/shared/Selettore';
import { FonteConfidenteAttivita } from '../components/confidenti/FonteConfidenteAttivita';
import { FontePescaAttivita } from '../components/pesca/FontePescaAttivita';
import { SFIDA_PESCA } from '../../shared/pesca';
import type { AzioneRiconciliazione, FormulaRiconciliazione, RigaRiconciliazioneDto } from '../../shared/riconciliazioneCondizioni';

const AZIONI: Record<AzioneRiconciliazione, string> = {
  'conferma-corrente': 'Conferma resa corrente', 'applica-proposta': 'Applica proposta', 'mantieni-nota': 'Mantieni come nota',
};
const FONTI = { 'presente-identica': 'Frase invariata', mutata: 'Frase modificata', nuova: 'Nuova frase', assente: 'Oggetto assente' };
const FORMULE = { coincide: 'Formula corrispondente', diversa: 'Formula differente', 'non-confrontabile': 'Confronto da completare', 'da-ricercare': 'Ricerca aperta' };
const TIPI = { luogo: 'Luogo', negozio: 'Negozio', attivita: 'Attività', articolo: 'Articolo' };
const BOTTONE = 'btn btn-secondary min-h-11 whitespace-normal disabled:!opacity-100';
const a10 = (r: RigaRiconciliazioneDto) => r.tabella === 'attivita' && r.chiave === SFIDA_PESCA;
const azioniMostrate = (r: RigaRiconciliazioneDto) => a10(r) ? r.azioniConsentite.filter(a => a === 'mantieni-nota') : r.azioniConsentite;

function Formula({ valore }: { valore: FormulaRiconciliazione }) {
  if (valore.errore) return <p role="status" className="text-red-300">{valore.errore}</p>;
  return <ul className="list-disc pl-5 space-y-1">{valore.testo.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

/** Fonte corrente e singoli esiti storici rimangono attestazioni distinte. */
function EsitiBonifiche({ riga: r }: { riga: RigaRiconciliazioneDto }) {
  return <section><h2 className="font-bold">Esito delle bonifiche</h2>
    {r.auditMigrazioni.length ? <ul>{r.auditMigrazioni.map((a, i) => <li key={i}>{a.migrazione}: {a.esito === 'gia-corretta' ? 'già corretta' : a.esito} — {a.motivo}</li>)}</ul> : <p>Nessun esito di riga leggibile nelle bonifiche. Non significa che la proposta sia applicata.</p>}
    {r.statoAuditConfidente === 'assente' && <p className="mt-2">Il registro 135 è assente: i due esiti della rettifica Takemi non sono attestati.</p>}
    {r.statoAuditConfidente === 'illeggibile' && <p role="alert" className="mt-2">Il registro 135 non è leggibile: i dati restano conservati e non è possibile attestare i due esiti.</p>}
    {r.statoAuditAcquisto === 'assente' && <p className="mt-2">Il registro 136 è assente: la rettifica Aojiru non è attestata.</p>}
    {r.statoAuditAcquisto === 'illeggibile' && <p role="alert" className="mt-2">Il registro 136 non è leggibile: nessun esito della rettifica Aojiru viene attribuito.</p>}
    {r.statoAuditPesca === 'assente' && <p className="mt-2">Il registro 138 è assente: gli esiti della visita A02 e degli obiettivi A10 non sono attestati.</p>}
    {r.statoAuditPesca === 'illeggibile' && <p role="alert" className="mt-2">Il registro 138 non è leggibile: nessuno dei due esiti viene dedotto dalla sola fonte corrente.</p>}
    {r.statoAuditPesca === 'leggibile' && <p className="mt-2">Gli esiti A02 e A10 della bonifica restano distinti dal collegamento corrente e dalla ricerca sulle meccaniche controverse.</p>}
  </section>;
}

function InformazionePesca({ riga: r }: { riga: RigaRiconciliazioneDto }) {
  if (!r.informazionePesca && !r.fontePesca && !a10(r)) return null;
  return <section className="space-y-2"><h2 className="font-bold">Fonte comune della pesca e ambito delle prove</h2>
    <p>L’ingresso al laghetto, la comparsa del pesce, la catturabilità e la cattura osservata sono distinti. Le vie documentate sono sufficienti; i casi non coperti restano da verificare. Una soglia unica di Perizia non descrive tutti i profili.</p>
    {r.fontePesca ? <FontePescaAttivita fonte={r.fontePesca} /> : <p role="alert">Il collegamento corrente alla fonte pesca non è attestato in questa lettura. Nessun profilo o sblocco viene ricostruito dal nome dell’attività.</p>}
    {r.informazionePesca && <><p>Compatibilità tecnica del gesto: {r.informazionePesca.compatibilitaTecnicaRegistrazione ? 'presente' : 'da risolvere'}. Questo esito non certifica tutte le meccaniche, la disponibilità storica o l’applicazione della bonifica.</p><ul>{r.informazionePesca.motivi.map((m, i) => <li key={i}>{m}</li>)}</ul></>}
    {a10(r) && <p>La ricerca A10 resta aperta nei casi non dimostrati. Non si offre una conferma generale o una sostituzione di formula che certifichi quelle meccaniche. Le osservazioni personali si registrano con le proprie fonti, senza dedurle dai vecchi contatori.</p>}
  </section>;
}

/** La ricerca restringe la vista, mai l'inventario o i contatori della risposta completa. */
export function RiconciliazioneCondizioniPage() {
  useDocumentTitle('Frasi e condizioni');
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(getRiconciliazioneCondizioni, []);
  const [ricerca, setRicerca] = useState('');
  const [tipo, setTipo] = useState('');
  const [stato, setStato] = useState('');
  const [gesto, setGesto] = useState<{ riga: RigaRiconciliazioneDto; azione: AzioneRiconciliazione } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroreGesto, setErroreGesto] = useState<string | null>(null);
  const [esito, setEsito] = useState<string | null>(null);
  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati?.righe ?? []).filter((r) => (!tipo || r.tabella === tipo)
      && (!stato || (stato === 'da-riconfermare' ? r.decisione?.daRiconfermare : stato === 'escluse' ? r.auditMigrazioni.some((a) => a.esito === 'esclusa') : r.esitoFonte === stato || r.esitoFormula === stato))
      && (!q || [r.nome, r.chiave, r.gruppo, r.fraseStorica, r.fraseAttuale, r.propostaTesto].some((s) => s?.toLocaleLowerCase('it').includes(q))));
  }, [dati, ricerca, tipo, stato]);
  async function salva() {
    if (!gesto || salvando || !azioniMostrate(gesto.riga).includes(gesto.azione)) return;
    setSalvando(true); setErroreGesto(null);
    try {
      const aggiornati = await decidiRiconciliazioneCondizioni({ id: gesto.riga.id, azione: gesto.azione, revisioneAttesa: gesto.riga.revisioneAttesa });
      imposta(aggiornati); setEsito(`${AZIONI[gesto.azione]}: decisione salvata per ${gesto.riga.nome}.`); setGesto(null);
    } catch (e) { setErroreGesto(e instanceof Error ? e.message : 'Impossibile salvare la decisione.'); }
    finally { setSalvando(false); }
  }
  return <div className="space-y-4 min-w-0">
    <IntestazionePagina compatta titolo="Frasi e condizioni"
      sottotitolo="Confronta la frase della guida con la resa attuale. Ogni decisione riguarda una singola voce e conserva la nota."
      azioni={<button className={BOTTONE} onClick={() => void ricarica()} disabled={caricamento}>Rileggi</button>} />
    {errore && <p role="alert">{errore}</p>}
    {caricamento && <p role="status">Lettura delle fonti correnti…</p>}
    {esito && <p role="status">{esito}</p>}
    {dati && <>
      <p className="text-sm">{dati.totali.storiche} voci storiche · {dati.totali.nuove} nuove · {dati.totali.mutate} modificate · {dati.totali.assenti} assenti · {dati.totali.confermate} confermate · {dati.totali.daRiconfermare} da riconfermare</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">Cerca<input className="input min-h-11 min-w-0 w-full" value={ricerca} onChange={(e) => setRicerca(e.target.value)} type="search" /></label>
        <Selettore etichetta="Tipo" valore={tipo} onCambia={setTipo} vuoto="Tutti" className="min-w-0 w-full"
          opzioni={Object.entries(TIPI).map(([chiave, nome]) => ({ chiave, nome }))} />
        <Selettore etichetta="Stato" valore={stato} onCambia={setStato} vuoto="Tutti" className="min-w-0 w-full"
          opzioni={Object.entries({ ...FONTI, ...FORMULE, 'da-riconfermare': 'Da riconfermare', escluse: 'Escluse dalle bonifiche' }).map(([chiave, nome]) => ({ chiave, nome }))} />
      </div>
      <p className="text-sm">{visibili.length} voci mostrate su {dati.righe.length}. Le classi storiche M/E/R non attestano che una conversione sia stata applicata.</p>
      <ul className="space-y-3">
        {visibili.map((r) => <li key={r.id} className="card min-w-0 break-words">
          <details>
            <summary className="min-h-11 cursor-pointer py-2">
              <strong>{r.nome}</strong> <span className="text-sm">{r.gruppo ? `${r.gruppo} · ` : ''}{TIPI[r.tabella]} · {FONTI[r.esitoFonte]} · {FORMULE[r.esitoFormula]}{r.nascosto ? ' · Nascosto' : ''}</span>
            </summary>
            <div className="space-y-4 pt-3 text-sm">
              <p className="break-all">{r.chiave}{r.origine ? ` · Origine: ${r.origine}` : ''}</p>
              {r.casa && r.esitoFonte !== 'assente' && <Link className="inline-flex min-h-11 items-center underline" to={r.casa}>Apri la scheda</Link>}
              <section><h2 className="font-bold">Frase storica</h2><p>{r.fraseStorica ?? 'Frase non presente nel censimento storico.'}</p>{r.esitoFonte !== 'presente-identica' && <p className="mt-2"><strong>Frase attuale: </strong>{r.fraseAttuale ?? 'Assente'}</p>}</section>
              <section><h2 className="font-bold">Resa corrente — condizioni proprie</h2><Formula valore={r.condizioniProprie} />{r.destinazione && <p className="mt-1">Campo: {r.destinazione.campo === 'sblocco_json' ? 'sblocco proprio del negozio' : 'condizioni proprie'}</p>}</section>
              {r.fonteConfidente && <section className="space-y-2"><h2 className="font-bold">Fonte della progressione</h2><p>Il confronto riguarda il collegamento dell’attività alla fonte corrente del Confidente. L’esito del beneficio verso il rango 8 è riportato separatamente nelle bonifiche; il collegamento non certifica il calendario degli incontri.</p><FonteConfidenteAttivita fonte={r.fonteConfidente} /></section>}
              {r.informazioneAcquisto && <section className="space-y-2"><h2 className="font-bold">Regola della consumazione</h2><p>{r.informazioneAcquisto.regola}</p><p>Compatibilità tecnica del gesto: {r.informazioneAcquisto.compatibilitaTecnicaRegistrazione ? 'presente' : 'da risolvere'}. Questo dato non certifica l’identità canonica né la disponibilità nel gioco.</p><ul>{r.informazioneAcquisto.motivi.map((m) => <li key={m}>{m}</li>)}</ul></section>}
              <InformazionePesca riga={r} />
              {r.fontiEreditate.length > 0 && <section><h2 className="font-bold">Fonti ereditate e riferimenti</h2><p>Le condizioni della sede e del quartiere restano nelle rispettive fonti. Gli inviti sono vie alternative effettive, non nuove copie sulla voce.</p><ul className="space-y-3 mt-2">{r.fontiEreditate.map((f) => <li key={`${f.tipo}:${f.chiave}`} className="border-l-2 pl-3"><strong>{f.nome}</strong> · {f.tipo}{f.mancante ? <p>Riferimento non trovato: disponibilità da verificare.</p> : <>{f.formula && <Formula valore={f.formula} />}{f.orari && <p className="break-words">Orari dichiarati: {f.orari}</p>}</>}{f.casa && <Link className="inline-flex min-h-11 items-center underline" to={f.casa}>Apri la fonte</Link>}</li>)}</ul></section>}
              <section><h2 className="font-bold">Proposta</h2><p>{r.propostaTesto}</p>{r.formulaProposta && <Formula valore={r.formulaProposta} />}{r.esitoFormula === 'non-confrontabile' && <p className="mt-2">Il confronto completo della formula resta aperto. La proposta descrittiva non autorizza una sostituzione automatica.</p>}</section>
              <section><h2 className="font-bold">Nota conservata</h2><p>{r.notaConservata}</p></section>
              <section><h2 className="font-bold">Fonti e certezza</h2><p>{r.analisi === 'ricerca' ? 'Ricerca fattuale ancora aperta.' : 'La fonte della proposta e il confronto con la formula corrente sono distinti.'}</p><ul>{r.fonti.map((f) => <li key={f.url}><a className="inline-flex min-h-11 items-center underline" href={f.url} target="_blank" rel="noreferrer">{f.titolo}</a></li>)}</ul></section>
              <EsitiBonifiche riga={r} />
              {r.decisione && <section><h2 className="font-bold">Decisione</h2><p>{AZIONI[r.decisione.azione]} · {r.decisione.data} · revisione {r.decisione.revisione}{r.decisione.daRiconfermare ? ' · Da riconfermare: le fonti sono cambiate.' : ''}</p>{r.decisione.azione === 'mantieni-nota' && <p>Scelta sulla nota: non chiude la ricerca e non elimina condizioni.</p>}{r.decisione.storico.length > 0 && <details><summary className="min-h-11 cursor-pointer py-2">Decisioni precedenti ({r.decisione.storico.length})</summary><ul>{r.decisione.storico.map((d) => <li key={d.revisione}>{d.revisione} · {AZIONI[d.azione]} · {d.data} · manifest {d.revisioneManifest}</li>)}</ul></details>}</section>}
              <div className="flex flex-wrap gap-2">
                {azioniMostrate(r).map((a) => <button key={a} className={BOTTONE} onClick={() => { setErroreGesto(null); setGesto({ riga: r, azione: a }); }}>{AZIONI[a]}</button>)}
                {r.esitoFonte !== 'assente' && <CorreggiElemento tipo={r.tabella} chiave={r.chiave} compatto={false} onSalvato={() => { void ricarica(); }} />}
              </div>
            </div>
          </details>
        </li>)}
      </ul>
      {!visibili.length && <p>Nessuna voce corrisponde ai filtri.</p>}
    </>}
    <Modal aperta={gesto !== null} titolo={gesto ? AZIONI[gesto.azione] : 'Decisione'} onChiudi={() => { if (!salvando) setGesto(null); }}
      azioni={<><button className={BOTTONE} disabled={salvando} onClick={() => setGesto(null)}>Annulla</button><button className={BOTTONE} disabled={salvando} onClick={() => void salva()}>{salvando ? 'Salvataggio…' : 'Conferma'}</button></>}>
      {gesto && <div className="space-y-3 break-words"><p className="font-bold">{gesto.riga.nome}</p><p>{gesto.riga.propostaTesto}</p>
        {a10(gesto.riga) && <><InformazionePesca riga={gesto.riga} /><EsitiBonifiche riga={gesto.riga} /></>}
        {gesto.azione === 'applica-proposta' ? <><p>Verrà sostituita solo la formula propria indicata. Frase e altri dati resteranno conservati.</p>{gesto.riga.formulaProposta && <Formula valore={gesto.riga.formulaProposta} />}</>
          : gesto.azione === 'mantieni-nota' ? <p>Conserva questa interpretazione come nota. Non elimina requisiti e non risolve fatti ancora da ricercare.</p>
            : <><p>Confermi la resa corrente mostrata, senza modificare condizioni. La tua scelta resta distinta dalla proposta della fonte.</p><Formula valore={gesto.riga.condizioniProprie} />{gesto.riga.fonteConfidente && <><p>Confermi il raccordo dell’attività alla fonte corrente del Confidente. Il beneficio verso il rango 8 ha un esito separato nella bonifica 135 e questa scelta non certifica la disponibilità degli incontri.</p><FonteConfidenteAttivita fonte={gesto.riga.fonteConfidente} /><EsitiBonifiche riga={gesto.riga} /></>}</>}
        {erroreGesto && <p role="alert">{erroreGesto} Chiudi e usa Rileggi per confrontare i dati aggiornati.</p>}
      </div>}
    </Modal>
  </div>;
}
