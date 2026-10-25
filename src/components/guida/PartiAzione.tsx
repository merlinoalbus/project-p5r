// ============================================================
// PartiAzione — i pezzi comuni di una riga d'azione della giornata: immagine, cartellini, scelta delle note del Confidente
// ============================================================
//
// Dal 2026-09-30 un'azione della guida e una cosa da fare aggiunta dall'utente sono la stessa cosa, una voce della giornata
// canone per tutte le partite («devo poter modificare al 100% gli eventi della guida»; «le modifiche diventano nuovo canone»):
// tipo, collegamento, rango atteso, note, effetti della spunta, stato nella partita. La riga `Azione` di GiornoGuida li
// mostra con questi pezzi; eventi, scadenze e promemoria hanno la loro riga (`VoceEvento` in VociAgenda).
// ============================================================

import { useState, type MouseEvent } from 'react';
import { usePartitaStore } from '../../stores/partitaStore';
import { ConfidentiPartita } from '../partita/ConfidentiPartita';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NOME_TIPO_AZIONE, collegamentoAzione, descriviEffetti, gruppiDellaVoce, noteDellaGuidaCoincideConEffetto, stessoNomeDiPosto } from '../../utils/percorso';
import { RiepilogoEffettiVoce } from './RiepilogoEffettiVoce';
import { conRitornoDiario } from '../../utils/ritornoDiario';
import { trovaScheda } from '../../utils/pannelloScheda';
import { useApriPannello } from '../scheda/contestoScheda';
import type { AzionePercorsoDto, DialogoVoceDto } from '../../types';
import { IconaCategoria } from './IconaCategoria';
import { EmblemaDungeon } from './EmblemaDungeon';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaSpillo } from '../mappe/IconaSpillo';
import { PulsanteGuidaQuiz } from './GuidaQuiz';
import { fraseMovimentoYen } from '../../../shared/yenAutomatici';

/** Ciò che i cartellini di una riga d'azione leggono. */
// L3: le infiltrazioni della voce servono a «Entra» (il cartellino del Palazzo apre l'infiltrazione giusta, `collegamentoAzione`)
export type AzioneMostrata = Pick<AzionePercorsoDto, 'azione' | 'tipo' | 'riferimento' | 'riferimentoTesto' | 'rangoAtteso' | 'note' | 'produceTesto' | 'fatta' | 'effetti' | 'stato' | 'mappa' | 'atterraggio' | 'quiz'>
  & Partial<Pick<AzionePercorsoDto, 'produceRiepilogo' | 'uid' | 'infiltrazioni' | 'infiltrazioneDaAprire' | 'infiltrazioniDelPalazzo' | 'propostaInfiltrazioni' | 'oggettoRiferimento' | 'oggettiCitati' | 'avvisiDisponibilita' | 'riferimentoNomeAttuale' | 'produce' | 'yenAutomatici' | 'yenFuoriRegistro'>>;

/** L'immagine della riga: il ritratto del Confidente, l'emblema del Palazzo o l'icona del tipo. */
export function ImmagineAzione({ a }: { a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'riferimentoTesto'> }) {
  if (a.riferimento?.tipo === 'confidente') return <ImmagineEntita ambito="confidente" chiave={a.riferimento.chiave} etichetta={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} adatta="copri" />;
  if (a.riferimento?.tipo === 'dungeon') return <EmblemaDungeon chiave={a.riferimento.chiave} nome={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} />;
  return <IconaCategoria categoria={a.tipo} dimensione={40} />;
}

interface PropsCartellini {
  a: AzioneMostrata;
  onSullaMappa?: () => void;
  /** Apre una planimetria nella mappa accanto (la scheda «Oggi»): il cartellino di un Palazzo con una regola d'atterraggio la usa
   *  invece di cambiare pagina, come l'icona della mappa di Tokyo. Senza, il cartellino è un collegamento. */
  onApriMappa?: (mappa: { chiave: string; spilloId: number | null }) => void;
  /** Dopo la chiusura del cassetto del Confidente aperto dal cartellino: la voce va riletta (rango della partita, stato, risposte). */
  onCassettoChiuso?: () => void;
}

/** Tipo, collegamento, «Sulla mappa», la guida del quiz dei lavori, stato nella partita, rango atteso, note, effetti dichiarati o applicati. */
export function CartelliniAzione({ a, onSullaMappa, onApriMappa, onCassettoChiuso }: PropsCartellini) {
  const link = collegamentoAzione(a);
  const stato = a.fatta ? null : a.stato;
  // l'atterraggio di un Palazzo si apre nella mappa accanto, se c'è (un clic semplice: con un modificatore resta un collegamento)
  const apriAccanto = link?.atterraggio && onApriMappa ? link.atterraggio : null;
  // R10-27. Nella Home e nella Guida › Giorno per giorno (dove il diario ha il pannello, `useApriPannello`) un clic semplice sull'oggetto
  // di una voce apre la sua scheda in un pannello sopra il diario: la pagina non cambia, quindi chiudendo si torna alla stessa voce e alla
  // stessa posizione di scorrimento. Dove il pannello non c'è (Partita › Oggi, che non cambia) il cartellino navigherebbe alla scheda e
  // la voce attuale della cronologia prende l'ancora `#voce-<uid>`, così «indietro» riporta alla stessa pagina sulla stessa voce
  const posizione = useLocation();
  const navigate = useNavigate();
  const apriPannello = useApriPannello();
  const uid = (a as { uid?: string }).uid;
  // 2026-10-24 (scelta dell'utente): il cartellino di un Confidente apre il cassetto «Gestione del Confidente» sopra il diario, con la
  // partita attiva (level up, note, regali, risposte migliori, scheda completa); senza partita resta il collegamento alla scheda
  const partitaAttiva = usePartitaStore((s) => s.attiva?.id ?? null);
  const [cassetto, setCassetto] = useState<string | null>(null);
  const confidente = a.riferimento?.tipo === 'confidente' ? a.riferimento.chiave : null;
  // R10-28: l'«Entra» in un Palazzo porta la pagina di partenza e la voce, perché la scheda possa dire «Esci» e riportarci qui
  const partenza = `${posizione.pathname}${posizione.search}`;
  const ricordaVoce = (e: MouseEvent<HTMLElement>) => {
    if (!uid || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    navigate({ pathname: posizione.pathname, search: posizione.search, hash: `#voce-${uid}` }, { replace: true, state: posizione.state });
  };
  /** Con il pannello e un clic semplice: apre la scheda dell'indirizzo sopra il diario e dice che il clic è servito. */
  const apriSopra = (e: MouseEvent<HTMLElement>, indirizzo: string): boolean => {
    if (!apriPannello || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false;
    if (!trovaScheda(indirizzo)) return false;
    e.preventDefault();
    apriPannello(indirizzo, e.currentTarget);
    return true;
  };
  // 2026-10-25 (la voce del distributore accanto al Bagno Pubblico mostrava due chip «Distributore del bagno pubblico»): quando il pin della
  // mappa è lo stesso posto del collegamento, il chip della mappa dice soltanto «Sulla mappa» (il suo ruolo); il collegamento porta il nome e
  // apre la scheda. Ruoli diversi, un solo nome
  const postoMappa = a.mappa?.posto && !stessoNomeDiPosto(a.mappa.posto, link?.etichetta ?? a.riferimentoTesto) ? a.mappa.posto : null;
  const gruppi = a.fatta ? [] : gruppiDellaVoce(a);
  return (
    <>
    <span className="flex flex-wrap items-center gap-1.5">
      {a.oggettiCitati?.filter((o) => o.casa !== link?.href).map((o) => <Link key={o.chiave} to={conRitornoDiario(o.casa, partenza, uid)}
        onClick={(e) => { if (!apriSopra(e, o.casa)) ricordaVoce(e); }} className="chip touch no-underline">{o.nome}</Link>)}
      <span className="chip testo-12">{NOME_TIPO_AZIONE[a.tipo] ?? a.tipo}</span>
      {link ? <Link to={conRitornoDiario(link.href, partenza, uid)} className="chip chip--attivo no-underline testo-12"
        onClick={(e) => {
          if (apriAccanto && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) { e.preventDefault(); onApriMappa!(apriAccanto); return; }
          if (confidente && partitaAttiva !== null && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) { e.preventDefault(); setCassetto(confidente); return; }
          // il Palazzo porta con sé la pagina di partenza e la voce (R10-28): nel pannello la scheda dice «Esci» e riporta alla voce
          if (apriSopra(e, conRitornoDiario(link.scheda ?? link.href, partenza, uid))) return;
          ricordaVoce(e);
        }}>{link.etichetta}</Link>
        : a.riferimentoTesto && <span className="chip testo-12">{a.riferimentoTesto}</span>}
      {cassetto && partitaAttiva !== null && <ConfidentiPartita partitaId={partitaAttiva} soloCassetto={{ chiave: cassetto, onChiudi: () => { setCassetto(null); onCassettoChiuso?.(); } }} />}
      {a.mappa && onSullaMappa && (
        <button type="button" className="chip chip--icona touch testo-12" onClick={onSullaMappa} aria-label={`${a.mappa.posto ? `Apri in ${a.mappa.posto}` : 'Sulla mappa'}: ${a.azione.slice(0, 60)}`}>
          {/* L5 (M23): il nome del posto del pin («Clinica Takemi», «Central Street»); «Sulla mappa» se il posto non ha un nome o se è
              lo stesso del collegamento accanto (un nome solo, 2026-10-25) */}
          <IconaSpillo tipo="passaggio" dimensione={14} />{postoMappa ?? 'Sulla mappa'}
        </button>
      )}
      {/* la guida del quiz del lavoro (il quiz dei codici a barre al Triple Seven), consultabile da ogni turno: in oro nei giorni del quiz */}
      {a.quiz?.map((q) => <PulsanteGuidaQuiz key={q.attivita} voce={q} />)}
      {stato?.tipo === 'consigliata' && <span className="chip chip--oro testo-12" title={stato.motivo ?? undefined}>Consigliata{stato.motivo ? ` · ${stato.motivo}` : ''}</span>}
      {stato?.tipo === 'bloccata' && <span className="chip chip--bloccata testo-12" title={stato.motivo ?? undefined}>Bloccata{stato.motivo ? `: ${stato.motivo}` : ''}</span>}
      {stato?.tipo === 'neutra' && stato.motivo && <span className="testo-12 text-text-muted">{stato.motivo}</span>}
      {/* R9-06: il testo salvato della voce non si riscrive; se il nome del Confidente è cambiato, il nome di adesso sta accanto */}
      {a.riferimentoNomeAttuale && <span className="testo-12 text-text-muted" title="Il testo della voce usa il nome di prima">oggi: {a.riferimentoNomeAttuale}</span>}
      {/* R9-03: il Confidente non è disponibile al giorno o alla fascia della voce: un avviso ambra, mai un blocco (la voce si spunta lo stesso) */}
      {a.avvisiDisponibilita?.map((v) => (
        <span key={`${v.tipo}:${v.testo}`} className="chip chip--icona testo-12 text-warning" title={v.testo} role="img" aria-label={`Incontro ${v.tipo === 'fuori-fascia' ? 'fuori orario' : 'fuori giorno'}: ${v.testo}`}>
          <IconaAzione chiave="allarme" dimensione={12} />{v.tipo === 'fuori-fascia' ? 'Fuori orario' : 'Fuori giorno'}
        </span>
      ))}
      {a.rangoAtteso !== null && <span className="testo-12 text-text-muted">rango atteso {a.rangoAtteso}</span>}
      {/* un solo valore: il testo della guida si nasconde se dice lo stesso dell'effetto («Perizia +2» = «Perizia ♪♪ · 3 punti»), altrimenti si etichetta */}
      {a.note && !noteDellaGuidaCoincideConEffetto(a.note, a.produce ?? []) && <span className="testo-12 text-text-secondary">Guida: {a.note}</span>}
      {a.fatta && !a.yenAutomatici?.length && a.produceTesto?.filter((t) => t.includes(' paga ¥')).map((t) => <span key={t} className="testo-12 text-text-muted">{t.slice(t.indexOf('paga ¥'))}</span>)}
      {a.fatta && a.effetti && <span className="chip chip--attivo testo-12" title="Effetti della spunta: togliendola si annullano i punti del Confidente, i turni e gli yen mossi dalla spunta; le Doti le segni tu (la spunta non le tocca), letture e visioni restano (si disfano dalla loro pagina)">{descriviEffetti(a.effetti)}</span>}
      {/* L13 (decisione 18): gli yen che la spunta ha mosso da soli, uno per causa, con l'importo davvero mosso (il saldo non scende sotto zero) */}
      {a.fatta && a.yenAutomatici?.map((m, i) => (
        <span key={`${m.creatoIl}:${i}`} className="chip testo-12" title="Mossi da soli dalla spunta: togliendola tornano com'erano">
          {m.motivo} · {fraseMovimentoYen(m)}
        </span>
      ))}
      {/* la voce spuntata prima degli yen automatici, tolta e rimessa: il suo denaro era già nel saldo, e la spunta non lo muove */}
      {a.fatta && a.yenFuoriRegistro && <span className="testo-12 text-text-muted">Yen già nel saldo da prima che si muovessero da soli: questa spunta non li muove.</span>}
    </span>
    {/* che cosa dà il gioco, per gruppi (richiesta dell'utente del 2026-10-25, «formattarlo in modo adeguato, per tutti gli acquisti»): le Doti
        si segnano a mano (scelta dell'utente, 2026-09-30); gli yen (decisione 18) si muovono da soli spuntando la voce, e il riepilogo lo dice */}
    <RiepilogoEffettiVoce gruppi={gruppi} />
    </>
  );
}

/** «Quante note hai ottenuto?»: ♪, ♪♪, ♪♪♪, nessun punto, annulla. Con il dialogo del rango (R10-11/C) le scelte stanno sopra: toccarne una
 *  dà le sue note (o nessun punto), come toccare le note; le scelte dal valore incerto (amicizia/amore) si leggono soltanto. */
export function SceltaNote({ occupato, onScegli, onAnnulla, dialogo }: { occupato: boolean; onScegli: (note: 1 | 2 | 3 | null) => void; onAnnulla: () => void; dialogo?: DialogoVoceDto }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 testo-12" role="group" aria-label="Note ottenute con il Confidente">
      {dialogo && (
        <span className="flex w-full flex-col gap-1" role="group" aria-label={`Scelte del dialogo, rango ${dialogo.rango}`}>
          <span className="text-text-secondary">Scelte del dialogo (rango {dialogo.rango})</span>
          <span className="flex flex-wrap gap-1.5">
            {dialogo.scelte.map((s) => {
              const valore = s.note !== null ? '♪'.repeat(s.note) : s.puntiTesto && /^\+?0\b|da evitare/.test(s.puntiTesto) ? '0' : s.puntiTesto ?? '';
              const toccabile = s.note !== null || s.puntiTesto === null || /^\+?0\b|da evitare/.test(s.puntiTesto);
              const etichetta = `${s.testo}${valore ? ` ${valore}` : ''}`;
              return toccabile
                ? <button key={s.ordine} type="button" className="chip touch" disabled={occupato} onClick={() => onScegli(s.note)} title={s.avviso ?? undefined} aria-label={`${s.testo}: ${s.note !== null ? `${s.note} ${s.note === 1 ? 'nota' : 'note'}` : 'nessun punto'}`}>{etichetta}</button>
                : <span key={s.ordine} className="chip text-text-muted" title={s.avviso ?? 'Il valore dipende dalla scelta (amicizia o amore): usa le note qui sotto.'}>{etichetta}</span>;
            })}
          </span>
        </span>
      )}
      <span className="text-text-secondary">Quante note hai ottenuto?</span>
      {([1, 2, 3] as const).map((n) => (
        <button key={n} type="button" className={`chip touch ${n === 2 ? 'chip--attivo' : ''}`} disabled={occupato} onClick={() => onScegli(n)} aria-label={`${n} ${n === 1 ? 'nota' : 'note'}`}>{'♪'.repeat(n)}</button>
      ))}
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Nessun punto" disabled={occupato} onClick={() => onScegli(null)} />
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onAnnulla} />
    </span>
  );
}
