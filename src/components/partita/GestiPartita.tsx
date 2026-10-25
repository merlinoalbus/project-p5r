import { useLayoutEffect, useRef, useState } from 'react';
import { archiviaGestoPartita, rileggiRegistroGestiPartita, riprendiGestoPartita, useGestiPartita, type GestoPartita } from '../../services/gestiPartita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Che cosa è l'operazione, in parole (BON-02: niente identificativi, hash o JSON). */
const nomi: Record<GestoPartita['payload']['tipo'], string> = {
  acquisto: 'Acquisto registrato', 'annullo-fonte': 'Acquisto tolto', 'rimozione-legacy': 'Acquisto storico tolto',
  'decisione-proposte': 'Punti applicati o scartati', 'spunta-acquisti': 'Voce spuntata con acquisti',
  'decisione-effetto-voce': 'Effetto di una voce',
  pesca: 'Pesca',
};
export interface EsitoRecuperoGestoPartita {
  operazioneId: string;
  payload: GestoPartita['payload'];
  ricevuta: GestoPartita['ricevuta'];
}
/** Come sta l'operazione, in una frase. */
function statoInParole(g: GestoPartita): string {
  if (g.stato === 'riuscita') return g.ricevutaPersistita ? 'Completata.' : 'Completata: manca solo da salvare qui.';
  if (g.stato === 'invio') return 'In corso…';
  if (g.stato === 'rifiutata') return 'Non è stata accettata.';
  return 'Non è sicuro che sia andata a buon fine (forse è caduta la connessione).';
}
/**
 * Le operazioni sulla partita che non hanno una conferma sicura, e il modo di completarle senza farle due volte. Solo l'elenco
 * di questa scheda del browser. Dentro non si vede niente di tecnico: «Riprova» usa l'operazione originale, che il server riconosce.
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
  const daRivedere = elenco.some(g => g.stato === 'invio' || g.stato === 'incerto' || !g.ricevutaPersistita);
  return <details className="card min-w-0" open={daRivedere || !!erroreArchivio || !!errore || !elenco.length}>
    <summary className="touch cursor-pointer font-display testo-17 uppercase">Operazioni da completare{elenco.length ? ` · ${elenco.length}` : ''}</summary>
    <div className="flex min-w-0 flex-col gap-2 pt-2" aria-label="Operazioni sulla partita da completare">
    <p className="m-0 testo-12 text-text-secondary">Qui compaiono le operazioni di cui non c’è una conferma sicura, per esempio dopo una connessione caduta. «Riprova» le completa senza ripeterle due volte. Nulla parte da solo.</p>
    {erroreArchivio && <div role="alert" className="flex flex-col items-start gap-2 text-error"><p className="m-0">L’elenco di questa scheda non si legge.</p><PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Rileggi l’elenco" onClick={rileggiRegistroGestiPartita} /></div>}
    {errore && <p role="alert" className="m-0 testo-13 text-error">{errore}</p>}
    {!elenco.length && !erroreArchivio && <p className="m-0 testo-13">Nessuna operazione da completare.</p>}
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">{elenco.map(g => {
      const inCorso = g.stato === 'invio';
      const risolta = g.stato === 'riuscita' && g.ricevutaPersistita;
      const rifiutata = g.stato === 'rifiutata' && g.ricevutaPersistita;
      const readonly = g.payload.tipo === 'spunta-acquisti';
      return <li key={g.id} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2 testo-13">
        <strong>{nomi[g.payload.tipo]} · {g.bersaglio.etichetta}</strong>
        <span>{statoInParole(g)}</span>
        {g.errore && <p className="m-0 break-words text-warning">{g.errore}</p>}
        {g.stato === 'incerto' && <span>{readonly ? 'Controllo solo che la voce e i suoi dati ci siano: non ripeto la spunta.' : 'Riprovando non si fa due volte la stessa cosa: se era già andata a buon fine, lo si vede subito.'}</span>}
        <div className="flex flex-wrap gap-2">
          {!risolta && !rifiutata && <PulsanteVisivo compatto icona={<IconaAzione chiave={g.stato === 'riuscita' || g.stato === 'rifiutata' ? 'registra' : 'riprova'} dimensione={20} />} titolo={inCorso ? 'In corso…' : g.stato === 'riuscita' ? 'Salva l’esito' : g.stato === 'rifiutata' ? 'Salva l’esito' : readonly ? 'Controlla' : 'Riprova'} disabled={inCorso || (erroreArchivio !== null && g.stato !== 'riuscita' && g.stato !== 'rifiutata')} onClick={() => void recupera(g)} />}
          {(risolta || rifiutata) && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli dall’elenco" disabled={inCorso || erroreArchivio !== null} onClick={() => archivia(g)} />}
        </div>
      </li>;
    })}</ul>
    </div>
  </details>;
}
