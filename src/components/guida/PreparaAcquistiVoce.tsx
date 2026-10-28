import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RichiestaRegistraAcquisto } from '../../../shared/acquisti';
import type { RichiestaRegistraSessionePesca } from '../../../shared/pesca';
import type { AzionePercorsoDto } from '../../types';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { getVocePercorso } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { preparaOsservazioniVoce, richiesteOsservazioni, rigaAnteprima, type OsservataSpunta, type RisposteOsservazione, type RisposteOsservazioni } from '../../services/osservazioniVoce';
import { usePartitaStore } from '../../stores/partitaStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const fotografia = (a: AzionePercorsoDto) => JSON.stringify([a.uid, a.fatta, a.giorno, a.fascia, a.genere, a.azione, a.tipo, a.riferimento, a.rangoAtteso, a.effettiVoce?.revisione]);

/**
 * 2026-10-28: la finestra della spunta compare solo se la voce lascia davvero aperto qualcosa (`services/osservazioniVoce`): chiede soltanto
 * quello (il succo se la voce non lo dice e la rotazione non lo sa, se un consumo o una visita già registrati in quel momento sono gli stessi,
 * il vecchio segno «Acquistato», il turno di pesca) e dice in una riga che cosa la spunta registrerà. Momento, succo scritto nella voce,
 * Fortuna e prezzo non si chiedono più. Il comando finale invia un'unica spunta atomica, come prima.
 * Se il server rifiuta il giorno della voce per l'Aojiru, la finestra chiede mese e giorno; un rifiuto che nessuna domanda risolve offre
 * «Modifica la voce» (`onModifica`, il gesto della riga), così la finestra non resta mai senza una via d'uscita oltre ad «Annulla».
 */
export function PreparaAcquistiVoce({ a, partitaId, onChiudi, onConferma, onRileggi, onModifica }: { a: AzionePercorsoDto; partitaId: number; onChiudi: () => void; onRileggi: (aggiornata: AzionePercorsoDto) => void; onConferma: (acquisti: RichiestaRegistraAcquisto[], pesche: RichiestaRegistraSessionePesca[], osservate: OsservataSpunta[]) => Promise<void>; onModifica?: () => void }) {
  const verifica = useCarica(() => getVocePercorso(a.uid, partitaId), [partitaId, a.uid]);
  useGestiPartita();
  const oggi = usePartitaStore((s) => (s.attiva?.id === partitaId ? s.attiva.dataGioco : null));
  const pendente = gestoPendenteNelloScope(partitaId, { voceUid: a.uid, ...(a.effettiVoce?.effetti.some(e => e.effetto.tipo === 'pesca') ? { pesca: true } : {}) });
  const cambiata = verifica.dati !== null && fotografia(verifica.dati) !== fotografia(a);
  const nonPronta = verifica.caricamento || !!verifica.errore || !verifica.dati || verifica.dati.fatta || cambiata;
  const [risposte, setRisposte] = useState<RisposteOsservazioni>({});
  // dopo un rifiuto le anteprime si rifanno (token nuovi), con le risposte già date
  const [giro, setGiro] = useState(0);
  const prep = useCarica(() => preparaOsservazioniVoce(partitaId, a, oggi, risposte), [partitaId, a.uid, a.effettiVoce?.revisione, oggi, risposte, giro]);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [incerto, setIncerto] = useState(false);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const effetti = prep.dati?.effetti ?? [];
  const aperti = effetti.filter((x) => x.domande.length > 0 || x.errore);
  // prima della spunta il prezzo o la quota (il saldo può cambiare fino al gesto): gli yen davvero scalati li dice l'avviso dopo la spunta
  const pronte = effetti.flatMap((x) => x.pronta ? [rigaAnteprima(x.pronta)] : []);
  const pronto = !!prep.dati?.complete && !prep.caricamento;
  // un altro mese azzera il giorno; un altro giorno azzera la scelta del consumo, che dipende dal giorno
  const rispondi = (uid: string, campo: keyof RisposteOsservazione, valore: string) => { setErrore(null); setRisposte((r) => {
    const prima: RisposteOsservazione = { ...r[uid] };
    if (campo === 'mese' && prima.mese !== valore) { prima.giorno = undefined; prima.consumo = undefined; }
    if (campo === 'giorno' && prima.giorno !== valore) prima.consumo = undefined;
    return { ...r, [uid]: { ...prima, [campo]: valore } as RisposteOsservazione };
  }); };
  const spunta = async () => {
    if (blocco.current || incerto || pendente || nonPronta || !pronto || !prep.dati) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    const { acquisti, pesche, osservate } = richiesteOsservazioni(prep.dati);
    try { await onConferma(acquisti, pesche, osservate); }
    catch (e) {
      if (!vivo.current) return;
      setErrore(e instanceof Error ? e.message : 'Spunta non confermata.');
      // Nessun replay del PUT: il registro dei gesti permette soltanto la verifica readonly delle ricevute esatte.
      const dubbio = !!gestoPendenteNelloScope(partitaId, { voceUid: a.uid });
      setIncerto(dubbio);
      if (!dubbio) { setGiro((g) => g + 1); await verifica.ricarica(); }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  return <Modal aperta titolo="Prima di spuntare" onChiudi={() => { if (!occupato && !incerto) onChiudi(); }} azioni={<>
    <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={onChiudi}>Annulla</button>
    <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Spunta la voce" disabled={occupato || incerto || !!pendente || nonPronta || !pronto} onClick={() => void spunta()} />
  </>}>
    <div className="flex min-w-0 flex-col gap-3 testo-13">
      <strong className="text-pretty">{a.azione}</strong>
      {prep.inPrimoCaricamento && <p role="status" className="m-0">Un attimo…</p>}
      {prep.errore && <p role="alert" className="m-0 text-error-testo">{prep.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="riprova" dimensione={22} />} titolo="Riprova" onClick={() => void prep.ricarica()} /></p>}
      {verifica.errore && <p role="alert" className="m-0 text-error-testo">{verifica.errore}<PulsanteVisivo tono="fantasma" className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi la voce" disabled={occupato || incerto} onClick={() => void verifica.ricarica()} /></p>}
      {verifica.dati?.fatta && <p role="alert" className="m-0 text-warning">Questa voce risulta già fatta: nessuna nuova spunta viene inviata.</p>}
      {cambiata && <p role="alert" className="m-0 text-warning">La voce è cambiata: nessuna spunta viene inviata.<PulsanteVisivo className="ml-2" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Mostra la voce aggiornata" onClick={() => { if (verifica.dati) { onRileggi(verifica.dati); onChiudi(); } }} /></p>}
      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={occupato || incerto || nonPronta}>
        {aperti.map((x) => <section className="flex min-w-0 flex-col gap-2" key={x.effettoUid}>
          {/* il nome dell'effetto serve solo a distinguere due riquadri */}
          {aperti.length > 1 && <h3 className="m-0 testo-14">{x.nome}</h3>}
          {x.domande.map((d) => <Selettore key={d.campo} etichetta={d.etichetta} valore={risposte[x.effettoUid]?.[d.campo] ?? ''} opzioni={d.opzioni} onCambia={(v) => rispondi(x.effettoUid, d.campo, v)} />)}
          {x.errore && <p role="alert" className="m-0 text-error-testo">{x.errore}</p>}
          {x.daCorreggereNellaVoce && onModifica && <PulsanteVisivo className="self-start" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Modifica la voce" onClick={() => { onChiudi(); onModifica(); }} />}
        </section>)}
      </fieldset>
      {pronte.length > 0 && <div className="flex min-w-0 flex-col gap-1">
        <span className="text-text-secondary">{pronto ? 'La spunta registra' : 'Già pronto'}</span>
        <ul className="m-0 pl-4 tabular-nums">{pronte.map((d, i) => <li key={i}>{d}</li>)}</ul>
      </div>}
      {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
      {incerto && <p role="alert" className="m-0 text-warning">Il gesto resta nel registro delle operazioni: lì puoi verificarne in sola lettura le ricevute; il comando non viene ripetuto. <Link className="touch inline-flex items-center" to="/impostazioni">Apri il registro delle operazioni</Link></p>}
    </div>
  </Modal>;
}
