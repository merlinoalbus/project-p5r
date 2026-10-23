// ============================================================
// DungeonPage — i Palazzi come schede visive: emblema, anello di avanzamento nella partita, date e livello in breve (Fase 7.1, grafica 11.4)
// ============================================================
//
// Si chiamava «Palazzi e Dedali» e ne elencava dieci. I Dedali erano due — Iweleth e i Memento —
// e i due non si somigliano affatto: Iweleth si visita per aree come un Palazzo, e le sue mappe
// esistono; i Memento non hanno aree fisse, i piani sono generati a ogni discesa, e la loro pagina
// li disegna per intero. Tenerli nello stesso elenco prometteva la stessa cosa a proposito di due
// posti diversi. Ora la sezione è **Palazzi**, Iweleth ci sta dentro perché si comporta come loro,
// e i Memento si raggiungono da `/guida/dungeon/mementos` e dalle Richieste. Il filtro è
// `soloPalazzi`, condiviso con la mappa di Tokyo.

import { Link } from 'react-router-dom';
import { getDungeons } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { dataBreve, sintesi } from '../utils/testoBreve';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { schedaAccessoMondo } from '../utils/accessoMondo';
import { soloPalazzi } from '../utils/palazzi';
import { anelloPalazzo, livelloPalazzo } from '../utils/completamentoPalazzo';

/**
 * Elenco dei Palazzi: carica i dungeon per la partita attiva tenendo solo i Palazzi (i Memento e
 * Iweleth, che dal lotto L8 è un dedalo dei Memento, esclusi) e li mostra come carte che aprono la scheda, con emblema, anello
 * dei collezionabili presi (solo se la partita ha un conteggio e c'è qualcosa da raccogliere),
 * suggerimento del giorno, arcano, sovrano, date in breve, livello consigliato e conteggi.
 */
export function DungeonPage() {
  useDocumentTitle('Palazzi');
  const attiva = usePartitaStore((s) => s.attiva);
  const dati = useCarica(async () => soloPalazzi(await getDungeons(attiva?.id)), [attiva?.id]);
  const sugg = useSuggerimenti();
  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {dati.dati && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Palazzi" sottotitolo="I Palazzi (Iweleth è un dedalo dei Memento): infiltrazioni e punti di interesse dalla guida allgamestaff (sicure, forzieri, Volontà, enigmi, mini-boss e boss con debolezze). Con una partita attiva segni ciò che hai ottenuto o esaurito; le planimetrie portano gli spilli preposizionati." />
          <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Palazzi">
            {dati.dati.map((d) => {
              // L4 (§1.5, §8.10): l'anello conta gli oggetti permanenti (numeri del server); il segno dice «Concluso» o «Completato»
              const anello = anelloPalazzo(d);
              const livello = livelloPalazzo(d);
              return (
                <li key={d.chiave} className="flex">
                  {/* La carta porta alla **scheda** del Palazzo, non al risolutore della mappa.
                      Sotto ci stava un secondo collegamento, «Scheda del Palazzo», che era
                      l'unico modo di arrivarci: usciva di 48 px dal riquadro e finiva coperto
                      dalla carta della riga dopo — di qui il «compare e sparisce». Non andava
                      aggiustato: cliccare la carta *è* aprire la scheda, e il secondo
                      collegamento diceva due volte la stessa cosa. La mappa del Palazzo si apre
                      dalla scheda, dov'è insieme alle aree e ai punti. */}
                  <Link to={schedaAccessoMondo('dungeon', d.chiave)} className={`card card--cliccabile piastrella no-underline text-text flex gap-4 w-full ${classiSuggerito(sugg.evidenziato('dungeon', d.chiave))}`} aria-label={`${d.nome}${d.sovrano ? `, ${d.sovrano}` : ''}`}>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={84} />
                      {anello && (
                        <AnelloAvanzamento quota={anello.quota} dimensione={56} spessore={4} etichetta={anello.etichetta}>
                          <span className="font-display text-[15px] leading-none tabular-nums">{Math.floor(anello.quota * 100)}%</span>
                        </AnelloAvanzamento>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display uppercase text-[21px] leading-none">{d.nome}</span>
                        {sugg.evidenziato('dungeon', d.chiave) && <TargaSuggerito motivo={sugg.motivo('dungeon', d.chiave)} compatta />}
                        {d.arcanaSovranoNome && <span className="chip">{d.arcanaSovranoNome}</span>}
                        {livello && <span className={`chip ${livello.testo === 'Completato' ? 'chip--attivo' : ''}`} title={livello.perche}>{livello.testo}</span>}
                        {!!d.daVerificare && <span className="chip chip--oro" title="Pin fatti con una voce non fatta, da prima dell’aggiornamento: si sistemano dalla scheda">{d.daVerificare} da verificare</span>}
                      </div>
                      {d.sovrano && <span className="text-[13px] text-text-secondary">{d.sovrano}</span>}
                      <div className="flex flex-wrap gap-1.5">
                        {d.date.sblocco && <span className="chip" title={d.date.sblocco}>Sblocco {dataBreve(d.date.sblocco)}</span>}
                        {d.date.scadenza && <span className="chip chip--attivo" title={d.date.scadenza}>Scadenza {dataBreve(d.date.scadenza)}</span>}
                        {d.livelloConsigliato && <span className="chip" title={d.livelloConsigliato}>Livello: {sintesi(d.livelloConsigliato, 36)}</span>}
                      </div>
                      <span className="text-[12px] text-text-muted">{d.aree} infiltrazioni · {d.raccolta.totale} da raccogliere · {d.esauribili} esauribili · {d.punti} punti in tutto{d.gestiti !== null ? ` · ${d.gestiti} segnati` : ''}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageState>
  );
}
