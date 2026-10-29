import { useLayoutEffect, useRef, useState } from 'react';
import { archiviaGestoPartita, rileggiRegistroGestiPartita, riprendiGestoPartita, useGestiPartita, type GestoPartita } from '../../services/gestiPartita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';

/** Che cosa è l'operazione, in parole (BON-02: niente identificativi, hash o JSON). */
const nomi: Record<Exclude<GestoPartita['payload']['tipo'], 'decisione-proposte'>, string> = {
  acquisto: 'Acquisto registrato', 'annullo-fonte': 'Acquisto tolto', 'rimozione-legacy': 'Acquisto storico tolto',
  'spunta-acquisti': 'Voce spuntata con acquisti',
  'decisione-effetto-voce': 'Effetto di una voce',
  pesca: 'Pesca',
};
/** La decisione sull'elenco «da applicare» dice quale decisione è (2026-10-29: «Punti applicati o scartati» valeva per tutte), al singolare o al plurale. */
function nomeGesto(g: GestoPartita): string {
  if (g.payload.tipo !== 'decisione-proposte') return nomi[g.payload.tipo];
  const d = g.payload.dati.decisione, una = !('proposte' in d) || d.proposte.length === 1;
  switch (d.tipo) {
    case 'applica': return 'Aggiunta dei punti';
    case 'scarta': return una ? 'Proposta scartata' : 'Proposte scartate';
    case 'non-conteggiata': return 'Punti segnati come non ancora contati';
    case 'ignota': return una ? 'Proposta segnata «non so»' : 'Proposte segnate «non so»';
    case 'gia-conteggiata': return 'Punti segnati come già contati';
    case 'applica-effetto': return 'Effetto applicato alla partita';
  }
}
export interface EsitoRecuperoGestoPartita {
  operazioneId: string;
  payload: GestoPartita['payload'];
  ricevuta: GestoPartita['ricevuta'];
}
/** Come sta l'operazione, in una frase (una completata qui c'è solo se la scheda non ne ha potuto salvare l'esito). */
function statoInParole(g: GestoPartita): string {
  if (g.stato === 'riuscita') return 'Completata: manca solo da salvare qui.';
  if (g.stato === 'invio') return 'In corso…';
  if (g.stato === 'rifiutata') return 'Non è stata accettata: non viene ripetuta.';
  return 'Non è sicuro che sia andata a buon fine (forse è caduta la connessione).';
}
/**
 * Le operazioni sulla partita che non hanno una conferma sicura, e il modo di completarle senza farle due volte. Solo l'elenco
 * di questa scheda del browser. Dentro non si vede niente di tecnico: «Riprova» usa l'operazione originale, che il server riconosce.
 * 2026-10-29 (segnalazione dell'utente, 55 righe quasi tutte «Completata»): una completata esce da sola appena confermata (il registro,
 * `gestiPartita`, tiene solo ciò che è in sospeso); una rifiutata resta con il suo motivo finché non la si toglie, o fino alla prossima apertura.
 */
export function GestiPartita({ partitaId, onCambiato, mostraVuoto = false, contestoChiave }: { partitaId?: number; onCambiato?: (partitaId: number | null, esito?: EsitoRecuperoGestoPartita) => void | Promise<void>; mostraVuoto?: boolean; contestoChiave?: string }) {
  const { gesti, erroreArchivio } = useGestiPartita();
  const [errore, setErrore] = useState<string | null>(null);
  const callback = useRef(onCambiato);
  useLayoutEffect(() => { callback.current = onCambiato; }, [onCambiato]);
  const contesto = useRef({ partitaId, contestoChiave, generazione: 0, vivo: true });
  useLayoutEffect(() => {
    contesto.current = { partitaId, contestoChiave, generazione: contesto.current.generazione + 1, vivo: true };
    return () => { contesto.current.vivo = false; contesto.current.generazione++; };
  }, [partitaId, contestoChiave]);
  const elenco = gesti.filter(g => partitaId === undefined || g.partitaId === partitaId);
  const recupera = async (g: GestoPartita) => {
    const origine = { ...contesto.current, onCambiato: callback.current };
    setErrore(null);
    try {
      const ricevuta = await riprendiGestoPartita(g.id);
      // La ricevuta e la notifica sono già nel registro anche se questa vista è scomparsa.
      if (contesto.current.vivo && contesto.current.generazione === origine.generazione && contesto.current.partitaId === origine.partitaId && contesto.current.contestoChiave === origine.contestoChiave) await origine.onCambiato?.(g.partitaId, { operazioneId: g.operazioneId, payload: g.payload, ricevuta });
    } catch (e) {
      if (contesto.current.vivo && contesto.current.generazione === origine.generazione) setErrore(e instanceof Error ? e.message : 'Non è stato possibile completare l’operazione.');
    }
  };
  const archivia = (g: GestoPartita) => {
    try { archiviaGestoPartita(g.id); setErrore(null); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Non è stato possibile toglierla dall’elenco.'); }
  };
  if (!elenco.length && !erroreArchivio && !errore && !mostraVuoto) return null;
  // in sospeso: senza una conferma sicura (o con l'esito non ancora salvato); le rifiutate hanno il loro motivo e si tolgono
  const inSospeso = elenco.filter(g => g.stato !== 'rifiutata' || !g.ricevutaPersistita).length;
  const rifiutate = elenco.length - inSospeso;
  const titolo = inSospeso || !rifiutate
    ? `Operazioni da completare${inSospeso ? ` · ${inSospeso}` : ''}${rifiutate ? ` · ${rifiutate} non ${rifiutate === 1 ? 'accettata' : 'accettate'}` : ''}`
    : `${rifiutate === 1 ? 'Operazione non accettata' : `Operazioni non accettate · ${rifiutate}`}`;
  // (aperto: c'è sempre qualcosa da leggere, altrimenti il riquadro non c'è; con `mostraVuoto` dice che non c'è niente)
  return <details className="card min-w-0" open>
    <summary className="touch cursor-pointer font-display testo-17 uppercase">{titolo}</summary>
    <div className="flex min-w-0 flex-col gap-2 pt-2" aria-label={inSospeso || !rifiutate ? 'Operazioni sulla partita da completare' : 'Operazioni sulla partita non accettate'}>
    {inSospeso > 0 && <p className="m-0 testo-12 text-text-secondary">Qui compaiono le operazioni di cui non c’è una conferma sicura, per esempio dopo una connessione caduta. «Riprova» le completa senza ripeterle due volte. Nulla parte da solo.</p>}
    {erroreArchivio && <div role="alert" className="flex flex-col items-start gap-2 text-error-testo"><p className="m-0">L’elenco di questa scheda non si legge.</p><PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Rileggi l’elenco" onClick={rileggiRegistroGestiPartita} /></div>}
    {/* TestoNote: i rifiuti del server possono portare note come ♪ («le note possibili sono ♪♪ o ♪♪♪»), da leggere a parole */}
    {errore && <p role="alert" className="m-0 testo-13 text-error-testo"><TestoNote testo={errore} /></p>}
    {!elenco.length && !erroreArchivio && <p className="m-0 testo-13">Nessuna operazione da completare.</p>}
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{elenco.map(g => {
      const inCorso = g.stato === 'invio';
      // (una completata con l'esito salvato non è più nell'elenco: esce dal registro appena confermata)
      const rifiutata = g.stato === 'rifiutata' && g.ricevutaPersistita;
      const readonly = g.payload.tipo === 'spunta-acquisti';
      return <li key={g.id} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2 testo-13">
        <strong className="break-words">{nomeGesto(g)} · {g.bersaglio.etichetta}</strong>
        <span>{statoInParole(g)}</span>
        {g.errore && <p className={`m-0 break-words ${g.stato === 'rifiutata' ? 'text-error-testo' : 'text-warning'}`}><TestoNote testo={g.errore} /></p>}
        {g.stato === 'incerto' && <span>{readonly ? 'Controllo solo che la voce e i suoi dati ci siano: non ripeto la spunta.' : 'Riprovando non si fa due volte la stessa cosa: se era già andata a buon fine, lo si vede subito.'}</span>}
        <div className="flex flex-wrap gap-2">
          {!rifiutata && <PulsanteVisivo compatto icona={<IconaAzione chiave={g.stato === 'riuscita' || g.stato === 'rifiutata' ? 'registra' : 'riprova'} dimensione={20} />} titolo={inCorso ? 'In corso…' : g.stato === 'riuscita' ? 'Salva l’esito' : g.stato === 'rifiutata' ? 'Salva l’esito' : readonly ? 'Controlla' : 'Riprova'} disabled={inCorso || (erroreArchivio !== null && g.stato !== 'riuscita' && g.stato !== 'rifiutata')} onClick={() => void recupera(g)} />}
          {rifiutata && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli dall’elenco" disabled={inCorso || erroreArchivio !== null} onClick={() => archivia(g)} />}
        </div>
      </li>;
    })}</ul>
    </div>
  </details>;
}
