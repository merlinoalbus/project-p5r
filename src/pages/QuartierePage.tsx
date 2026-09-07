import { IngressoQuartiere } from '../components/mappe/IngressoQuartiere';
// ============================================================
// QuartierePage — un quartiere: la sua mappa e i suoi luoghi
// ============================================================
//
// Cosa offre ogni luogo, quando è aperto, come si sblocca, quali Confidenti ci si incontrano, che
// piatti si mangiano. Il posizionamento degli spilli e le immagini di base si gestiscono
// nell'editor delle mappe («Modifica mappa» nel visore).
//
// Era una colonna sola: intestazione nuda, un pulsante grigio in mezzo, la mappa a tutta larghezza
// e sotto un nastro di schede una sull'altra. Su uno schermo largo si leggeva una riga di testo in
// mezzo a due palmi di vuoto, e per confrontare due luoghi si scorreva.
//
// Ora l'intestazione porta la **stessa sagoma** che il lettore ha appena toccato sulla mappa di
// Tokyo — è il modo di sapere in un istante di essere nel posto giusto — e da 1280 px in su la
// mappa sta a sinistra e i luoghi a destra, che è la coppia che si guarda insieme. Sotto, in
// colonna, e i luoghi in due colonne dove c'è spazio.
//
// «Configura ingresso da Città» sta accanto alla mappa e non più fra il titolo e il resto: è la
// didascalia della mappa, non un capitolo della pagina. Decide **quale** planimetria si apre
// cliccando il quartiere sulla mappa di Tokyo, e centrata su quale punto.
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuartiere, scaricaPiantaQuartiere } from '../services/api';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_TIPO_LUOGO } from '../utils/citta';
import type { LuogoDto } from '../types';
import { PulsanteVisivo, CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { SagomaQuartiere } from '../components/mappe/SagomaQuartiere';

function Luogo({ l }: { l: LuogoDto }) {
  const sugg = useSuggerimenti();
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${classiSuggerito(sugg.evidenziato('luoghi', l.chiave))}`}>
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-[15px]">{l.nome}</strong>
        <span className="chip">{NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
        {sugg.evidenziato('luoghi', l.chiave) && <TargaSuggerito motivo={sugg.motivo('luoghi', l.chiave)} compatta />}
        {l.quando && <span className="chip">{l.quando === 'entrambe' ? 'giorno e sera' : l.quando}</span>}
        {!l.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
      </div>
      <p className="m-0">{l.cosaOffre}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {l.giorni && <span><strong className="text-text">Giorni:</strong> {l.giorni}</span>}
        {l.sblocco && <span><strong className="text-text">Sblocco:</strong> {l.sblocco}</span>}
      </div>
      {(l.confidenti.length > 0 || l.attivita.length > 0) && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {l.confidenti.map((c) => <Link key={c.chiave} to={`/confidenti/${c.chiave}`} className="chip chip--attivo no-underline">{c.nome}</Link>)}
          {l.attivita.map((a) => <span key={a} className="chip">{a}</span>)}
        </div>
      )}
      {l.piatti && l.piatti.length > 0 && (
        <div className="overflow-x-auto">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
            <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {l.negozio && <CollegamentoVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="negozio" dimensione={20} />} titolo="Articoli in vendita" to={`/guida/negozi/${l.negozio}`} />}
      {l.note && <p className="m-0 text-[12px] text-text-muted">{l.note}</p>}
      {l.fonte && <a href={l.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
    </li>
  );
}

export function QuartierePage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const dati = useCarica(() => getQuartiere(chiave), [chiave]);
  const q = dati.dati;
  useDocumentTitle(q?.nome ?? 'Quartiere');
  const [configuraIngresso,setConfiguraIngresso]=useState(false);
  const [tipo, setTipo] = useState<string>('');
  // Mappa pubblicata ma non ancora nell'istanza: scaricata appena il quartiere è aperto, poi il visore la usa come immagine di base
  const download = useCarica(() => (q && !q.ingresso && !q.mappa && q.pianta ? scaricaPiantaQuartiere(q.chiave) : Promise.resolve(null)), [q?.chiave, q?.mappa, q?.pianta?.url, q?.ingresso]);
  const scaricata = !!q && !!download.dati && download.dati.quartiere === q.chiave;
  const tipi = useMemo(() => [...new Set((q?.luoghi ?? []).map((l) => l.tipo))], [q]);
  const visibili = useMemo(() => (q?.luoghi ?? []).filter((l) => !tipo || l.tipo === tipo), [q, tipo]);
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost btn-sm self-start touch -ml-2" onClick={() => navigate('/guida/citta')}><IconChevronLeft size={16} /> La città</button>

          <header className="card flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* La sagoma della mappa di Tokyo, la stessa che si è appena toccata: dice «sei nel
                posto che hai scelto» prima che si legga il titolo. */}
            <SagomaQuartiere chiave={q.chiave} nome={q.nome} larghezza={132} altezza={100} className="self-center sm:self-start" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="titolo-display m-0 break-words">{q.nome}</h1>
                <span className="text-[12px] text-text-muted">{q.luoghi.length} {q.luoghi.length === 1 ? 'luogo' : 'luoghi'}</span>
              </div>
              {q.sblocco && <p className="m-0 text-[13px]"><strong className="text-text-secondary">Si apre:</strong> {q.sblocco}</p>}
              {q.descrizione && <p className="m-0 text-[13px] text-text-secondary">{q.descrizione}</p>}
              {q.fonte && <a href={q.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
            </div>
          </header>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="flex flex-col gap-1.5 xl:sticky xl:top-2" aria-label={`Mappa di ${q.nome}`}>
              {(q.ingresso?.mappa || q.mappaChiave) && <MappaIncorporata chiave={q.ingresso?.mappa ?? q.mappaChiave ?? ''} puntoIniziale={q.ingresso} versione={scaricata ? download.dati?.byte ?? 0 : 0} altezza="max(420px, min(64vh, 740px))" />}
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
                {q.ingresso ? <span>Si apre su <strong className="text-text-secondary">{q.ingresso.nome}</strong>, nel punto che hai scelto.</span> : q.pianta ? (
                  <span>Mappa da <a href={q.pianta.pagina ?? q.pianta.url} target="_blank" rel="noreferrer" className="credito">{q.pianta.fonte}</a>, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}. Spilli e immagine si modificano dall’editor.</span>
                ) : (
                  <span>Nessuna mappa pubblicata per questo quartiere{q.piantaAssente ? `: ${q.piantaAssente}` : ''}: carica una tua immagine dall’editor della mappa (resta nella tua istanza).</span>
                )}
                {download.errore && q.pianta && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void download.ricarica()} />}
              </div>
              {/* Non è un capitolo della pagina: è la didascalia della mappa. Decide quale
                  planimetria si apre cliccando questo quartiere sulla mappa di Tokyo, e dove
                  centrarla — che è la cosa che si sta guardando proprio qui sopra. */}
              {configuraIngresso
                ? <IngressoQuartiere key={q.chiave} quartiere={q} onSalvato={async () => { await dati.ricarica(); }} onChiudi={() => setConfiguraIngresso(false)} />
                : <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="mappa" dimensione={20} />}
                    titolo="Ingresso da Città" dettaglio={q.ingresso ? 'cambia mappa e punto' : 'scegli mappa e punto'} onClick={() => setConfiguraIngresso(true)} />}
            </section>

            <section className="flex flex-col gap-2" aria-label="Luoghi del quartiere">
              {tipi.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={`chip touch ${tipo === '' ? 'chip--attivo' : ''}`} onClick={() => setTipo('')} aria-pressed={tipo === ''}>Tutti ({q.luoghi.length})</button>
                  {tipi.map((t) => <button key={t} type="button" className={`chip touch ${tipo === t ? 'chip--attivo' : ''}`} onClick={() => setTipo(t)} aria-pressed={tipo === t}>
                    {NOME_TIPO_LUOGO[t] ?? t} ({q.luoghi.filter((l) => l.tipo === t).length})
                  </button>)}
                </div>
              )}
              <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 md:grid-cols-2 xl:grid-cols-1" aria-label="Luoghi">
                {visibili.map((l) => <Luogo key={l.chiave} l={l} />)}
              </ul>
              {visibili.length === 0 && <p className="m-0 text-[13px] text-text-muted" role="status">Nessun luogo di questo tipo in {q.nome}.</p>}
            </section>
          </div>
        </div>
      )}
    </PageState>
  );
}
