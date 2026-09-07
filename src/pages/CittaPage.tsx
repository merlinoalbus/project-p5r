// ============================================================
// CittaPage — la città: la mappa di Tokyo e le schede dei quartieri (Fase 8.1, mappe 13.4)
// ============================================================
//
// Una sola mappa di Tokyo, e va detto perché prima ce n'erano due: sotto alla `MappaTokyo`
// disegnata con gli elementi originali stava anche il visore dell'atlante con la chiave `tokyo`,
// cioè la stessa città una seconda volta, con un'altra interazione e un'altra gerarchia visiva.
// Non era un di più: era la stessa domanda posta due volte senza dire quale delle due risposte
// valesse. `MappaTokyo` **è** la mappa di Tokyo, e da qui in avanti anche `Mappe → Tokyo` porta
// qui invece di aprire il visore.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getDungeons, getQuartieri } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { MappaTokyo } from '../components/mappe/MappaTokyo';
import { quartiereAperto } from '../components/mappe/aperturaTokyo';
import { SagomaQuartiere } from '../components/mappe/SagomaQuartiere';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { radiciMetaverso } from '../utils/palazzi';

export function CittaPage() {
  const sugg = useSuggerimenti();
  useDocumentTitle('La città');
  const attiva = usePartitaStore((s) => s.attiva);
  // La partita serve all'API, non solo alla pagina: senza, non può dire se un quartiere che si
  // apre col rango di un Confidente o con un libro sia già nel mondo.
  const dati = useCarica(() => getQuartieri(attiva?.id), [attiva?.id]);
  // Mappa e schede sono **una** selezione vista in due modi, come nei Memento: si passa sopra a
  // una scheda e si accende la sagoma lassù, si passa sopra a una sagoma e si accende la scheda.
  // Su una mappa fatta di figure accostate, ritrovare «quale delle due è Ogikubo» è il lavoro che
  // il lettore stava facendo a mano.
  const [acceso, setAcceso] = useState<string | null>(null);
  // Le radici del Metaverso servono alla mappa disegnata: portano la finestra in cui esistono, ed
  // è quella a decidere se compaiono. Senza partita non decide nulla e si vedono tutte. Qui va
  // `radiciMetaverso` e non `soloPalazzi`, che è il filtro dell'*elenco* dei Palazzi: sulla mappa
  // ci stanno anche i Memento, che l'utente ha chiesto per nome e che dal 9 maggio sono un posto
  // dove si può andare quanto gli altri.
  const dungeon = useCarica(async () => radiciMetaverso(await getDungeons()), []);
  const q = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="La città" sottotitolo="La mappa di Tokyo con i quartieri come passaggi: tocca un quartiere per aprirne la mappa con negozi, ristoranti, attività e Confidenti. Sotto, le schede dei quartieri con luoghi, orari e sblocchi." />
          {/* Tokyo disegnata con gli elementi originali del gioco, viva col calendario: i
              quartieri compaiono quando si sbloccano, i Palazzi quando esistono. È **la** mappa
              di Tokyo, non una di due: sotto ci stava anche il visore della planimetria con la
              chiave `tokyo`, e la pagina mostrava la stessa città due volte, con due interazioni
              diverse e nessun modo di capire quale delle due fosse quella buona. */}
          {/* Su schermo largo la mappa e le schede stanno **affiancate**, e non una sopra l'altra.
              Impilate, a 1900×950 la mappa si prendeva tutta la finestra e le schede finivano
              tutte sotto la piega: si vedeva l'una o le altre, mai le due cose insieme — ed è
              proprio guardando la scheda che si vuole vedere accendersi la sagoma. Sotto i 1280
              px restano impilate, perché due colonne strette non le legge nessuno. */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,26rem)]">
            <MappaTokyo quartieri={q} dungeon={dungeon.dati ?? []} dataGioco={attiva?.dataGioco ?? null}
              evidenziato={acceso} onEvidenzia={setAcceso} className="xl:sticky xl:top-2" />
            <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-1 xl:max-h-[calc(68vh+2.5rem)] xl:overflow-y-auto xl:pr-1" aria-label="Quartieri">
            {q.map((x) => {
              const aperto = quartiereAperto(x, attiva?.dataGioco ?? null);
              const suggerito = sugg.evidenziato('quartieri', x.chiave);
              return (
              <li key={x.chiave} className="flex">
                <Link to={`/guida/mondo/quartiere/${encodeURIComponent(x.chiave)}`}
                  onMouseEnter={() => setAcceso(x.chiave)} onMouseLeave={() => setAcceso(null)}
                  onFocus={() => setAcceso(x.chiave)} onBlur={() => setAcceso(null)}
                  className={`card card--cliccabile piastrella no-underline text-text flex w-full gap-3 ${classiSuggerito(suggerito)} ${
                    acceso === x.chiave ? 'ring-2 ring-[#ffd23f] ring-offset-0' : ''}`}>
                  {/* La stessa sagoma della mappa qui sopra, non l'anteprima del nodo d'atlante:
                      quella per quasi tutti i quartieri non esiste e lasciava riquadri vuoti. */}
                  <SagomaQuartiere chiave={x.chiave} nome={x.nome} acceso={acceso === x.chiave} className={aperto ? '' : 'opacity-40 grayscale'} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display uppercase text-[20px] leading-none">{x.nome}</span>
                    {/* Il quartiere chiuso resta in elenco — la guida serve anche a sapere cosa
                        arriverà — ma la scheda lo dice, perché lassù non c'è una sagoma da
                        accendere e il collegamento sembrerebbe rotto. */}
                    {!aperto && <span className="chip text-[11px]" title={x.bloccoMotivo ?? undefined}>Non ancora aperto{x.sbloccoData ? ` · dal ${x.sbloccoData}` : ''}</span>}
                  </span>
                  {suggerito && <TargaSuggerito motivo={sugg.motivo('quartieri', x.chiave)} compatta />}
                  <span className="text-[12px] text-text-secondary">{x.luoghi} {x.luoghi === 1 ? 'luogo' : 'luoghi'}{x.verificati < x.luoghi ? ` · ${x.luoghi - x.verificati} da fonte secondaria` : ''}</span>
                  {x.sblocco && <span className="text-[12px] text-text-muted line-clamp-2">Sblocco: {x.sblocco}</span>}
                  {x.descrizione && <span className="text-[12px] text-text-secondary line-clamp-2">{x.descrizione}</span>}
                  </span>
                </Link>
              </li>
            );})}
            </ul>
          </div>
        </div>
      )}
    </PageState>
  );
}
