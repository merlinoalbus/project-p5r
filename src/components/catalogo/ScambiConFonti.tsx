import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CampoScambioCensimento, DestinazioneScambioCensimento, NodoScambioCensimento, RaccordoScambioCensimento } from '../../../shared/censimentoScambiCatalogo';
import { descriviRequisitoSpillo } from '../../../shared/condizioniSpillo';
import { getScambiConFonti } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { collegamentoProposta } from '../../utils/collegamentiProposte';
import { normalizzaTesto } from '../../utils/testo';
import { CampoRicerca } from '../shared/CampoRicerca';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { CostoDellOggetto } from './CostoDellOggetto';
import { ConfrontoTanaka } from './ConfrontoTanaka';

const STATO_FONTE: Record<RaccordoScambioCensimento['statoFonte'], string> = {
  coincidente: 'Fonte coincidente con il riferimento documentato', 'cambiata-dopo-registrazione': 'Fonte cambiata dopo la registrazione',
  'diversa-dal-manifest': 'Fonte diversa dal riferimento pubblico', 'fuori-manifest': 'Fonte aggiunta, senza raccordo documentato',
  'registro-assente': 'Raccordo non ancora registrato', 'registro-non-supportato': 'Registro non leggibile o non riconosciuto',
};
const RILIEVI: Record<string, string> = {
  'identita-ricevuta-da-risolvere': 'Identità dell’oggetto ricevuto ancora da risolvere.',
  'divergenza-nirvana-tutte-statistiche': 'La copia sintetica descrive tutte le statistiche insieme; le cinque offerte complete sono distinte.',
  'variante-non-fusa': 'Le varianti restano distinte; la proposta di fusione richiede una scelta esplicita.',
  'baratto-distinto-da-capsula-casuale': 'Il baratto è distinto dall’acquisto di una capsula casuale.',
  'differenza-soglia-mothman': 'Le fonti non concordano sulla soglia dello scambio Mothman: la proposta resta da esaminare.',
  'risultati-alternativi-mothman': 'I premi dello scambio Mothman sono alternativi: non vengono ricevuti entrambi.',
  'copia-sintetica-in-archivio': 'Copia sintetica conservata in archivio, senza creare nuove offerte.',
  'gradi-sintetici-non-operativi': 'I gradi della copia sintetica non determinano la disponibilità delle offerte.',
  'intervallo-non-prezzo-individuale': 'L’intervallo di prezzo del raggruppamento non è il prezzo di ciascun articolo.',
  'offerte-alternative-non-pacchetto': 'Le offerte richiamate sono distinte; non costituiscono un pacchetto cumulativo.',
};
const RUOLO: Record<DestinazioneScambioCensimento['ruolo'], string> = {
  'offerta-principale': 'Offerta di riferimento', 'variante-non-equiparata': 'Variante ancora distinta', 'riferimento-archivio': 'Rinvio conservato nell’archivio',
};
const PER_PAGINA = 20;
const leggiCampo = (c: CampoScambioCensimento | undefined) => !c || c.stato === 'assente' ? 'Assente nella fonte'
  : c.stato === 'null' ? 'Non indicato (NULL)' : c.stato === 'non-supportato' ? 'Formato non riconosciuto'
  : c.valore === '' ? 'Testo vuoto' : String(c.valore);
const nome = (r: NodoScambioCensimento) => {
  const c = r.campi.nome ?? r.campi.ricevi;
  return c?.stato === 'valido' && c.valore !== '' ? String(c.valore) : r.percorso;
};
const conflitto = (r: NodoScambioCensimento) => r.stato !== 'valido' || r.raccordo.statoFonte !== 'coincidente' || r.raccordo.rilievi.length > 0
  || r.raccordo.destinazioni.some(d => d.stato !== 'presente' || d.costoDaVerificare || d.prezzoDaVerificare
    || d.condizioni.stato === 'malformate' || d.condizioni.stato === 'non-supportate'
    || d.catalogo !== null && d.catalogo.stato !== 'presente'
    || d.risultati.some(x => !x.valido || x.catalogo.stato !== 'presente')
    || d.costo?.tipo === 'oggetti' && d.costo.oggetti.some(x => !x.casa || !x.nome)
    || d.proposte.some(p => p.snapshot !== 'coincidente' || p.modificaStato === 'malformata' || p.modificaStato === 'non-supportata'));

/** Sezione su richiesta: la fotografia iniziale dell'audit resta distinta dal raccordo corrente. */
export function ScambiConFonti() {
  const [aperto, setAperto] = useState(false);
  return <section className="flex min-w-0 flex-col gap-2" aria-label="Scambi e fonti correnti">
    <ConfrontoTanaka />
    <button type="button" className="chip touch self-start" aria-expanded={aperto} onClick={() => setAperto(v => !v)}>Scambi e fonti correnti</button>
    {aperto && <ElencoScambi />}
  </section>;
}

function ElencoScambi() {
  const dati = useCarica(getScambiConFonti, []);
  const [q, setQ] = useState('');
  const [famiglia, setFamiglia] = useState('');
  const [stato, setStato] = useState('');
  const [pagina, setPagina] = useState(0);
  const c = dati.dati;
  const righe = useMemo(() => c ? [
    ...c.jose.righe.map(r => ({ r, gruppo: 'jose/scambi', etichetta: 'Jose · fonte completa', mancante: false })),
    ...c.guida.righe.flatMap(g => g.offerte.righe.map(r => ({ r, gruppo: g.percorso, etichetta: leggiCampo(g.campi.venditore), mancante: false }))),
    ...c.fontiMancanti.map(r => ({ r, gruppo: 'mancanti', etichetta: 'Fonti mancanti', mancante: true })),
  ] : [], [c]);
  const famiglie = useMemo(() => [...new Map(righe.map(x => [x.gruppo, x.etichetta])).entries()].map(([chiave, nome]) => ({ chiave, nome })), [righe]);
  const visibili = useMemo(() => {
    const cerca = normalizzaTesto(q);
    const percorsoEsatto = righe.some(x => x.r.percorso === q) ? q : null;
    return righe.filter(({ r, gruppo, mancante }) => (!famiglia || gruppo === famiglia)
      && (!stato || (stato === 'archivi' ? r.raccordo.disposizione === 'archivio' : stato === 'conflitti' ? mancante || conflitto(r)
        : stato === 'mancanti' ? mancante : r.raccordo.destinazioni.some(d => d.proposte.some(p => p.stato === 'da-approvare'))))
      && (percorsoEsatto ? r.percorso === percorsoEsatto : !cerca || normalizzaTesto([r.percorso, nome(r), ...Object.values(r.campi).map(leggiCampo), ...r.raccordo.rilievi,
        ...r.raccordo.destinazioni.flatMap(d => [d.chiave, d.catalogo?.nome ?? '', d.negozioNome ?? '', ...d.proposte.map(p => p.motivo ?? '')])].join(' ')).includes(cerca)));
  }, [righe, q, famiglia, stato]);
  const ultima = Math.max(0, Math.ceil(visibili.length / PER_PAGINA) - 1);
  const corrente = Math.min(pagina, ultima);
  const sezioni = c ? [c.jose, c.guida, ...c.guida.righe.map(g => g.offerte)].filter(s => s.stato !== 'valido' && s.stato !== 'vuoto') : [];
  return <PageState isLoading={dati.caricamento && !c} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {c && <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 text-[13px]">Raccordi documentali fra fonti e offerte attuali. La presenza di un collegamento non certifica identità, costi o condizioni; le proposte restano da esaminare con i loro comandi.</p>
      <p className="m-0 text-[12px]" role={c.registroRaccordi.stato === 'valido' ? 'status' : 'alert'}>
        Registro {c.registroRaccordi.stato === 'valido' ? 'riconosciuto' : c.registroRaccordi.stato === 'assente' ? 'assente' : 'non leggibile o non riconosciuto'}:
        {' '}{c.registroRaccordi.nodiRegistrati} riferimenti su {c.registroRaccordi.nodiAttesi} attesi; {c.registroRaccordi.percorsiMancanti.length} percorsi mancanti.
      </p>
      {sezioni.map(s => <p key={s.percorso} className="m-0 text-warning text-[13px]" role="alert">{s.percorso}: {s.motivo ?? `sezione ${s.stato}`}. Le righe attese mancanti sono elencate separatamente.</p>)}
      {c.registroRaccordi.percorsiMancanti.length > 0 && <details><summary className="touch">Tutti i percorsi mancanti</summary>
        <ul className="m-0 pl-5 text-[12px] break-words">{c.registroRaccordi.percorsiMancanti.map(p => <li key={p}>{p}</li>)}</ul>
      </details>}
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64"><CampoRicerca valore={q} onCambia={v => { setQ(v); setPagina(0); }} segnaposto="Cerca fonti, offerte o motivazioni…" /></div>
        <Selettore etichetta="Fonte" valore={famiglia} vuoto="Tutte" opzioni={famiglie} onCambia={v => { setFamiglia(v); setPagina(0); }} />
        <Selettore etichetta="Mostra" valore={stato} vuoto="Tutti i riferimenti" opzioni={[
          { chiave: 'archivi', nome: 'Copie in archivio' }, { chiave: 'conflitti', nome: 'Da esaminare' },
          { chiave: 'pendenti', nome: 'Con proposte pendenti' }, { chiave: 'mancanti', nome: 'Fonti mancanti' },
        ]} onCambia={v => { setStato(v); setPagina(0); }} />
        <button type="button" className="btn btn-secondary touch" disabled={dati.caricamento} onClick={() => void dati.ricarica()}>Aggiorna i riferimenti</button>
      </div>
      <p className="m-0 text-[12px]" role="status">{visibili.length} riferimenti su {righe.length} · pagina {corrente + 1} di {ultima + 1}. Nessun esito è escluso dai filtri iniziali.</p>
      <ul className="m-0 p-0 list-none flex min-w-0 flex-col gap-2">{visibili.slice(corrente * PER_PAGINA, (corrente + 1) * PER_PAGINA).map(({ r, etichetta, mancante }) =>
        <li key={r.percorso} className="card flex min-w-0 flex-col gap-2 text-[13px] break-words">
          <h3 className="m-0 text-[14px] font-semibold">{mancante ? 'Fonte mancante' : nome(r)}</h3>
          <span className="text-[12px] text-text-muted">{etichetta} · {r.percorso}</span>
          <p className="m-0">{STATO_FONTE[r.raccordo.statoFonte]}{r.raccordo.disposizione === 'archivio' ? ' · Copia sintetica conservata come archivio, non offerta aggiuntiva.' : ''}</p>
          {r.stato !== 'valido' && <p className="m-0 text-warning">Struttura della fonte non riconosciuta; nessun contenuto ricostruito.</p>}
          <details><summary className="touch">Dati della fonte corrente</summary><dl className="m-0 flex flex-col gap-1 text-[12px]">
            {Object.entries(r.campi).map(([k, v]) => <div key={k}><dt className="font-semibold">{({ nome: 'Nome', effetto: 'Effetto', costo: 'Costo', requisito: 'Requisito', fonte: 'Fonte', ricevi: 'Ricevi', dai: 'Dai', note: 'Note' } as Record<string, string>)[k] ?? k}</dt><dd className="m-0 whitespace-pre-wrap">{leggiCampo(v)}</dd></div>)}
          </dl></details>
          {r.raccordo.rilievi.length > 0 && <ul className="m-0 pl-5 text-warning">{r.raccordo.rilievi.map((v, i) => <li key={`${v}/${i}`}>{RILIEVI[v] ?? v}</li>)}</ul>}
          {r.raccordo.relazione === 'offerte-distinte' && <p className="m-0">I rinvii indicano offerte distinte; non un pacchetto da ricevere insieme.</p>}
          {r.raccordo.fontiComplete.length > 0 && <div className="flex flex-wrap gap-1 items-center text-[12px]">Fonti complete di riferimento:
            {r.raccordo.fontiComplete.map(p => <button key={p} type="button" className="btn btn-secondary btn-sm touch" onClick={() => { setQ(p); setFamiglia(''); setStato(''); setPagina(0); }}>
              {righe.some(x => x.r.percorso === p) ? nome(righe.find(x => x.r.percorso === p)!.r) : p}
            </button>)}
          </div>}
          <details><summary className="touch">Offerte e proposte correnti ({r.raccordo.destinazioni.length})</summary>
            {r.raccordo.destinazioni.length === 0 ? <p className="m-0">Nessun raccordo documentale disponibile.</p>
              : <ul className="m-0 pl-4 flex min-w-0 flex-col gap-3">{r.raccordo.destinazioni.map(d => <li key={`${d.chiave}/${d.ruolo}`}><Destinazione dati={d} /></li>)}</ul>}
          </details>
        </li>)}
      </ul>
      {!visibili.length && <p className="m-0">Nessun riferimento corrisponde ai filtri selezionati.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary touch" disabled={corrente === 0} onClick={() => setPagina(corrente - 1)}>Precedente</button>
        <button type="button" className="btn btn-secondary touch" disabled={corrente === ultima} onClick={() => setPagina(corrente + 1)}>Successiva</button></div>
    </div>}
  </PageState>;
}

function Destinazione({ dati: d }: { dati: DestinazioneScambioCensimento }) {
  return <div className="flex min-w-0 flex-col gap-1">
    <strong>{RUOLO[d.ruolo]} · {d.chiave}</strong>
    <span>{d.stato === 'presente' ? 'Offerta presente' : d.stato === 'nascosta' ? 'Offerta nascosta' : d.stato === 'assente' ? 'Offerta assente' : 'Offerta ora in un negozio diverso'}{d.negozioNome ? ` · ${d.negozioNome}` : ''}</span>
    {!d.raccordoDocumentale && <span className="text-warning">Riferimento atteso di contesto: non attribuito alla fonte corrente.</span>}
    {d.casa && <Link className="text-primary touch inline-flex self-start" to={d.casa}>Apri offerta e modifica nel listino</Link>}
    {d.catalogo && <span>Identità corrente: {d.catalogo.casa && d.catalogo.nome ? <Link className="text-primary touch inline-flex" to={d.catalogo.casa}>{d.catalogo.nome}</Link> : d.catalogo.nome ?? d.catalogo.chiave}
      {d.catalogo.stato !== 'presente' ? ` · ${d.catalogo.stato}` : ''}{d.catalogo.nascosto ? ' · nascosta' : ''}</span>}
    {d.stato !== 'assente' && <>
      <CostoDellOggetto costo={d.costo} prezzo={d.prezzo} daVerificare={d.costoDaVerificare || d.prezzoDaVerificare} />
      {d.costo?.tipo === 'oggetti' && d.costo.oggetti.some(x => !x.casa || !x.nome) && <span className="text-warning">Il costo contiene oggetti con identità assente o non risolta; va esaminato nel listino.</span>}
      <span>Condizioni: {d.condizioni.stato === 'valide' ? d.condizioni.valore?.length ? d.condizioni.valore.map(c => descriviRequisitoSpillo(c)).join(' · ') : 'nessuna condizione esplicita'
        : d.condizioni.stato === 'null' ? 'non indicate (NULL)' : 'formato da correggere nel listino'}</span>
      {d.condizioneLegacy && <span className="whitespace-pre-wrap">Indicazione commerciale conservata: {d.condizioneLegacy}</span>}
    </>}
    {d.risultati.length > 0 && <ul className="m-0 pl-4">{d.risultati.map((r, i) => <li key={`${r.catalogo.chiave}/${i}`}>
      {r.quantita === null ? 'Quantità non indicata' : `${r.quantita} ×`} · {r.catalogo.casa && r.catalogo.nome ? <Link className="text-primary touch inline-flex" to={r.catalogo.casa}>{r.catalogo.nome}</Link> : r.catalogo.nome ?? r.catalogo.chiave}
      {r.catalogo.stato !== 'presente' && <span className="text-warning"> · identità {r.catalogo.stato === 'assente' ? 'assente' : 'non riconosciuta'}</span>}{r.catalogo.nascosto && ' · identità nascosta'}
      {!r.valido && ' · da verificare'}{r.nota && <span className="block whitespace-pre-wrap">{r.nota}</span>}
    </li>)}</ul>}
    {d.proposte.length > 0 && <ul className="m-0 pl-4">{d.proposte.map((p, i) => <li key={`${p.rigaTipo}/${p.rigaChiave}/${p.gruppo}/${p.catalogoChiave}/${i}`} className="mt-1">
      <span>Proposta {p.stato === 'da-approvare' ? 'da approvare' : p.stato} · {p.catalogo?.nome ?? p.catalogoChiave ?? 'senza nuova identità'} · {p.quantita === null ? 'quantità non indicata' : `quantità ${p.quantita}`}</span>
      {p.motivo && <p className="m-0 whitespace-pre-wrap">{p.motivo}</p>}
      {p.snapshot !== 'coincidente' && <span className="block text-warning">La fotografia della proposta non coincide con la fonte o non è riconosciuta.</span>}
      {(p.modificaStato === 'malformata' || p.modificaStato === 'non-supportata') && <span className="block text-warning">Dati della modifica non riconosciuti.</span>}
      {p.stato === 'da-approvare' && <Link className="text-primary touch inline-flex" to={collegamentoProposta(p)}>Esamina questa proposta e le alternative</Link>}
    </li>)}</ul>}
  </div>;
}
