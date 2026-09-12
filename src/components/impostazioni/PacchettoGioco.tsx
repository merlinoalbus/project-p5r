// ============================================================
// PacchettoGioco — esportazione e importazione dei dati di gioco dalle Impostazioni (voce 10)
// ============================================================
//
// Il pacchetto è un solo file, `gioco.db`: i dati di gioco con dentro anche le immagini (mappe,
// Confidenti, sfondi…), senza le partite. «Scarica» lo produce; «Importa» passa SEMPRE dall'anteprima:
// il server legge il file e dice versione dello schema, tabelle che cambiano, immagini e riferimenti
// delle partite che resterebbero orfani; si sostituisce solo alla conferma. Dopo l'importazione
// l'esito resta a video con gli orfani finché l'utente non ricarica l'app: le cache di pagina
// (glossario, mappe, catalogo, grafica) sono da rifare.
//
// **Due strade per far arrivare il pacchetto.** Con il file dal dispositivo (istanza locale: il corpo
// della richiesta sono centinaia di MB, e la barra dice a che punto è) oppure con un **indirizzo** da cui
// se lo prende il server: è l'unica che funziona quando l'istanza sta dietro un proxy o un tunnel, che un
// corpo così grande lo rifiuta in partenza («Failed to fetch» immediato).
// ============================================================

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { anteprimaPacchettoGioco, anteprimaPacchettoGiocoDaUrl, getStatoIstanza, importaPacchettoGioco, importaPacchettoGiocoDaUrl, scaricaPacchettoGioco, statoImportazionePacchetto } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { byteTesto } from '../../utils/byte';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, OrfanoPartiteDto } from '../../types';
import type { AvanzamentoInvio } from '../../services/api';
import { BarraInvio } from './BarraInvio';

function salvaFile(nome: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const numero = (n: number): string => n.toLocaleString('it-IT');

/** Ogni quanto si richiede lo stato dell'importazione, e per quanto si insiste. */
const ATTESA_FRA_CONTROLLI_MS = 5_000;
const CONTROLLI_MASSIMI = 240; // venti minuti

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Che cosa sta facendo il server, detto all'utente. */
const NOME_FASE: Record<string, string> = {
  scarico: 'Il server sta scaricando il pacchetto dall’indirizzo',
  verifica: 'Il server sta verificando il pacchetto',
  'copia-di-sicurezza': 'Il server sta salvando la copia di sicurezza',
  sostituzione: 'Il server sta sostituendo i dati di gioco',
  riapertura: 'Il server sta riaprendo il database e applicando le migrazioni',
  controllo: 'Il server sta controllando i riferimenti delle partite',
};

/** I riferimenti delle partite senza più la loro riga: tabella, quante righe e partite, esempi. */
function ElencoOrfani({ orfani, quando }: { orfani: OrfanoPartiteDto[]; quando: 'prima' | 'dopo' }) {
  if (orfani.length === 0) {
    return <p className="m-0 text-[13px] text-success">{quando === 'prima' ? 'Nessun riferimento delle partite resterebbe orfano.' : 'Nessun riferimento delle partite è rimasto orfano.'}</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-[13px] text-warning">
        {quando === 'prima' ? 'Queste righe delle partite non troverebbero più la loro voce nei dati di gioco:' : 'Queste righe delle partite non trovano più la loro voce nei dati di gioco:'}
      </p>
      <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[13px]" aria-label="Riferimenti orfani">
        {orfani.map((o) => (
          <li key={`${o.tabella}.${o.colonna}.${o.entita}`} className="flex flex-col gap-0.5 rounded border border-border px-2 py-1">
            <span><strong>{o.entita}</strong> <span className="text-text-muted">· {o.tabella}.{o.colonna}</span></span>
            <span className="text-text-secondary">{numero(o.righe)} {o.righe === 1 ? 'riga' : 'righe'} in {numero(o.partite)} {o.partite === 1 ? 'partita' : 'partite'}{o.nota ? ` · ${o.nota}` : ''}</span>
            {o.esempi.length > 0 && <span className="text-text-muted break-all">es. {o.esempi.join(', ')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Che cosa cambierebbe importando: versioni, tabelle, immagini, orfani. */
function Anteprima({ a, origine }: { a: AnteprimaPacchettoDto; origine: string }) {
  const daApplicare = a.versioneSchema < a.versioneSchemaCodice ? a.versioneSchemaCodice - a.versioneSchema : 0;
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="m-0 text-[14px]">
        Il pacchetto «{origine}» ({byteTesto(a.databaseByte)}) sostituirà i <strong>dati di gioco</strong> di questa istanza: compendio, guida, catalogo, mappe, luoghi e immagini.
        Le <strong>partite non vengono toccate</strong>. Prima della sostituzione il server salva una copia di sicurezza in <code>data/backups</code>.
      </p>
      {!a.importabile && <p className="m-0 text-error" role="alert">{a.motivo}</p>}
      <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2">
        <li><strong>Schema</strong> <span className="text-text-muted">pacchetto {a.versioneSchema} · istanza {a.versioneSchemaIstanza} · app {a.versioneSchemaCodice}{daApplicare ? ` (${daApplicare} ${daApplicare === 1 ? 'migrazione da applicare' : 'migrazioni da applicare'})` : ''}</span></li>
        <li><strong>Database</strong> <span className="text-text-muted">{byteTesto(a.databaseByte)}</span></li>
        <li><strong>Immagini</strong> <span className="text-text-muted">{numero(a.immagini.pacchetto)} nel pacchetto · {numero(a.immagini.istanza)} nell'istanza ora</span></li>
      </ul>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[14px]">Tabelle che cambiano</h3>
        {a.differenze.length === 0 ? (
          <p className="m-0 text-text-muted">Stessi conteggi dell'istanza in ogni tabella.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]" aria-label="Tabelle che cambiano">
              <thead><tr className="text-left text-text-muted"><th className="py-0.5 pr-2 font-normal">Tabella</th><th className="py-0.5 pr-2 font-normal text-right">Ora</th><th className="py-0.5 font-normal text-right">Pacchetto</th></tr></thead>
              <tbody>
                {a.differenze.map((d) => (
                  <tr key={d.tabella}><td className="py-0.5 pr-2 font-mono">{d.tabella}</td><td className="py-0.5 pr-2 text-right tabular-nums">{numero(d.istanza)}</td><td className={`py-0.5 text-right tabular-nums ${d.pacchetto < d.istanza ? 'text-warning' : 'text-success'}`}>{numero(d.pacchetto)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {a.tabelleAssenti.length > 0 && <p className="m-0 text-text-muted">Non nel pacchetto (le migrazioni le ricreano vuote): {a.tabelleAssenti.join(', ')}.</p>}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[14px]">Riferimenti delle partite</h3>
        <ElencoOrfani orfani={a.orfani} quando="prima" />
      </div>
    </div>
  );
}

export function PacchettoGioco() {
  const stato = useCarica(() => getStatoIstanza(), []);
  const [occupato, setOccupato] = useState(false);
  // l'anteprima viene da un file del dispositivo o da un indirizzo: la conferma deve ripartire dalla stessa origine
  const [origine, setOrigine] = useState<{ tipo: 'file'; file: File } | { tipo: 'url'; url: string } | null>(null);
  const [url, setUrl] = useState('');
  const [anteprima, setAnteprima] = useState<AnteprimaPacchettoDto | null>(null);
  const [esito, setEsito] = useState<EsitoImportazionePacchettoDto | null>(null);
  const [avanzamento, setAvanzamento] = useState<AvanzamentoInvio | null>(null);
  // la fase che il server sta eseguendo quando il lavoro è suo (scarico da indirizzo, oppure risposta non arrivata)
  const [lavoroSulServer, setLavoroSulServer] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  // l'attesa dell'esito sul server si interrompe se l'utente lo chiede o se la card sparisce
  const smetti = useRef(false);
  useEffect(() => () => { smetti.current = true; }, []);
  const s = stato.dati;

  const esporta = async () => {
    setOccupato(true);
    try {
      const { nome, blob } = await scaricaPacchettoGioco();
      salvaFile(nome, blob);
      notifica('success', `Pacchetto di gioco scaricato: ${nome} (${byteTesto(blob.size)}).`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Esportazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const scegli = async (f: File) => {
    setOccupato(true);
    setAvanzamento({ byteInviati: 0, byteTotali: f.size, percentuale: 0, inviato: false });
    try {
      setAnteprima(await anteprimaPacchettoGioco(f, setAvanzamento));
      setOrigine({ tipo: 'file', file: f });
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Anteprima fallita.');
    } finally {
      setOccupato(false);
      setAvanzamento(null);
    }
  };

  const scegliUrl = async () => {
    const indirizzo = url.trim();
    if (!indirizzo) return;
    setOccupato(true);
    setLavoroSulServer('scarico');
    try {
      setAnteprima(await anteprimaPacchettoGiocoDaUrl(indirizzo));
      setOrigine({ tipo: 'url', url: indirizzo });
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Anteprima fallita.');
    } finally {
      setOccupato(false);
      setLavoroSulServer(null);
    }
  };

  /**
   * La richiesta è caduta: non vuol dire che l'importazione sia fallita. Un proxy chiude la connessione
   * dopo un minuto e mezzo mentre il server sta ancora sostituendo i dati; se qui dicessimo «fallita»,
   * l'utente ritenterebbe sopra un lavoro in corso. Si chiede al server come sta andando e, se sta
   * ancora lavorando, si aspetta la fine per mostrare l'esito vero.
   */
  const seguiSulServer = async (operazionePrecedente: string | null | undefined): Promise<EsitoImportazionePacchettoDto | null> => {
    // `undefined` = non siamo riusciti a leggere lo stato prima di partire: senza quel riferimento un esito
    // vecchio sarebbe indistinguibile dal nostro, e dichiarare riuscita un'importazione mai partita è il
    // danno peggiore di tutti. Meglio riportare l'errore.
    if (operazionePrecedente === undefined) return null;
    for (let tentativo = 0; tentativo < CONTROLLI_MASSIMI && !smetti.current; tentativo++) {
      let stato;
      try {
        stato = await statoImportazionePacchetto();
      } catch {
        return null; // il server non risponde: l'errore originale resta l'unica cosa da dire
      }
      if (stato.inCorso) {
        setLavoroSulServer(stato.fase);
        await attendi(ATTESA_FRA_CONTROLLI_MS);
        continue;
      }
      // l'esito vale solo se è di QUESTO tentativo: l'operazione dev'essere diversa da quella di prima
      const nostra = stato.ultima && stato.ultima.operazione !== operazionePrecedente ? stato.ultima : null;
      if (!nostra) return null;
      if (nostra.riuscita && nostra.esito) return nostra.esito;
      notifica('error', nostra.messaggio);
      return null;
    }
    return null;
  };

  const importa = async () => {
    if (!origine || !anteprima?.importabile) return;
    setOccupato(true);
    smetti.current = false;
    // qual era l'ultima importazione PRIMA di questo tentativo: serve a non scambiare il suo esito per il nostro
    const operazionePrecedente = await statoImportazionePacchetto().then((x) => x.ultima?.operazione ?? null).catch(() => undefined);
    if (origine.tipo === 'file') setAvanzamento({ byteInviati: 0, byteTotali: origine.file.size, percentuale: 0, inviato: false });
    else setLavoroSulServer('scarico');
    const concludi = async (e: EsitoImportazionePacchettoDto) => {
      setAnteprima(null);
      setOrigine(null);
      setUrl('');
      setEsito(e);
      stato.imposta(e.stato);
      // i dati di gioco sono cambiati sotto i piedi dell'app: le partite si rileggono subito, il resto alla ricarica
      await usePartitaStore.getState().carica();
      notifica('success', `Dati di gioco sostituiti (schema ${e.versioneSchema}${e.migrazioniApplicate ? `, ${e.migrazioniApplicate} migrazioni applicate` : ''}). Copia di sicurezza: ${e.copiaDiSicurezza}.`);
    };
    try {
      await concludi(origine.tipo === 'file' ? await importaPacchettoGioco(origine.file, setAvanzamento) : await importaPacchettoGiocoDaUrl(origine.url));
    } catch (err) {
      // la connessione può cadere mentre il server lavora: prima di dire «fallita», glielo si chiede
      const esitoVero = await seguiSulServer(operazionePrecedente);
      if (esitoVero) await concludi(esitoVero);
      else notifica('error', err instanceof Error ? err.message : 'Importazione fallita.');
    } finally {
      setOccupato(false);
      setAvanzamento(null);
      setLavoroSulServer(null);
    }
  };

  const chiudiAnteprima = () => { setAnteprima(null); setOrigine(null); };

  return (
    <section className="card flex flex-col gap-3" aria-label="Pacchetto di gioco">
      <h2 className="m-0 text-[15px] font-semibold">Pacchetto di gioco</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Un solo file, <code>gioco.db</code>: i <strong>dati di gioco</strong> senza le partite, con dentro compendio, guida, catalogo, mappe, luoghi e le immagini.
        Un'istanza nuova parte con i soli dati iniziali: il pacchetto completo si carica da qui e sostituisce il file dell'istanza; è anche il modo in cui le correzioni fatte nell'app passano a un'altra istanza. L'importazione mostra prima un'anteprima e non tocca l'avanzamento delle partite.
      </p>
      {s && (
        <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2 text-[13px]">
          <li><strong>Dati di gioco</strong> <span className="text-text-muted">{s.database.inMemoria ? 'in memoria (nessun file)' : `${s.database.nome} · ${byteTesto(s.database.byte)} · schema ${s.versioneSchema}`}</span></li>
          <li><strong>Immagini nel database</strong> <span className="text-text-muted">{numero(s.immagini.file)} · {byteTesto(s.immagini.byte)}</span></li>
        </ul>
      )}
      {s?.vuota && <p className="m-0 text-[13px] text-warning" role="status">Questa istanza non ha dati di gioco: importa il pacchetto completo <code>gioco.db</code> con «Importa un pacchetto».</p>}
      {s && !s.vuota && !s.completo && <p className="m-0 text-[13px] text-warning" role="status">Questa istanza ha solo i dati iniziali (nessuna immagine): importa il pacchetto completo <code>gioco.db</code> con «Importa un pacchetto» per avere mappe e grafica di gioco.</p>}
      {stato.errore && <p className="m-0 text-[13px] text-error">{stato.errore}</p>}
      {anteprima === null && <BarraInvio avanzamento={avanzamento} etichetta="Invio del pacchetto" elaborazione="Il server sta leggendo il pacchetto" />}
      {anteprima === null && lavoroSulServer && (
        <div className="flex flex-col gap-1.5">
          <BarraInvio avanzamento={{ byteInviati: 0, byteTotali: 0, percentuale: 100, inviato: true }} etichetta="Lavoro sul server" elaborazione={NOME_FASE[lavoroSulServer] ?? 'Il server sta lavorando'} />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Scarica il pacchetto di gioco" dettaglio="file gioco.db, immagini comprese" disabled={occupato} onClick={() => void esporta()} />
        <input ref={input} type="file" accept=".db,application/vnd.sqlite3,application/x-sqlite3,application/octet-stream" className="sr-only" aria-label="Pacchetto di gioco da importare"
          onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void scegli(f); e.target.value = ''; }} />
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Importa un pacchetto" dettaglio="anteprima, poi sostituisce i dati di gioco" disabled={occupato} onClick={() => input.current?.click()} />
      </div>
      <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); void scegliUrl(); }}>
        <label className="form-label" htmlFor="pacchetto-da-url">Oppure importa da un indirizzo (lo scarica il server)</label>
        <p className="m-0 text-[12px] text-text-muted">Serve quando l'app è pubblicata: un file da centinaia di MB non passa dal proxy, un indirizzo sì. Indica un http/https che questo server riesce a raggiungere.</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <input id="pacchetto-da-url" className="form-input flex-1 min-w-[220px] touch" type="url" inputMode="url" placeholder="https://…/api/impostazioni/istanza/database" value={url} disabled={occupato} onChange={(e) => setUrl(e.target.value)} />
          <PulsanteVisivo tono="pericolo" compatto type="submit" icona={<IconaAzione chiave="url" dimensione={20} />} titolo="Importa da indirizzo" dettaglio="anteprima, poi sostituisce" disabled={occupato || url.trim().length === 0} />
        </div>
      </form>
      <Modal
        titolo="Importare il pacchetto di gioco?"
        aperta={anteprima !== null}
        onChiudi={chiudiAnteprima}
        larga
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={chiudiAnteprima}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={occupato || !anteprima?.importabile} onClick={() => void importa()}>Sostituisci i dati di gioco</button>
          </>
        }
      >
        {anteprima && <Anteprima a={anteprima} origine={origine?.tipo === 'file' ? origine.file.name : origine?.url ?? ''} />}
        <BarraInvio avanzamento={avanzamento} etichetta="Invio del pacchetto" elaborazione="Sostituzione dei dati di gioco in corso" />
        {lavoroSulServer && (
          <div className="flex flex-col gap-1.5">
            <BarraInvio avanzamento={{ byteInviati: 0, byteTotali: 0, percentuale: 100, inviato: true }} etichetta="Lavoro sul server" elaborazione={NOME_FASE[lavoroSulServer] ?? 'Il server sta lavorando'} />
            <button type="button" className="btn btn-secondary btn-sm touch self-start" onClick={() => { smetti.current = true; }}>Smetti di attendere</button>
          </div>
        )}
      </Modal>
      <Modal
        titolo="Pacchetto importato"
        aperta={esito !== null}
        onChiudi={() => setEsito(null)}
        larga
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setEsito(null)}>Chiudi</button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Ricarica l'app</button>
          </>
        }
      >
        {esito && (
          <div className="flex flex-col gap-3 text-[13px]">
            <p className="m-0 text-[14px]">
              I dati di gioco sono stati sostituiti: schema {esito.versioneSchema}{esito.migrazioniApplicate ? ` (${esito.migrazioniApplicate} ${esito.migrazioniApplicate === 1 ? 'migrazione applicata' : 'migrazioni applicate'} dal ${esito.versioneSchemaPacchetto})` : ''}, {numero(esito.immagini)} immagini.
              Copia di sicurezza: <code>{esito.copiaDiSicurezza}</code>. Le partite sono {numero(esito.stato.partite)}, intatte.
            </p>
            <ElencoOrfani orfani={esito.orfani} quando="dopo" />
            <p className="m-0 text-text-muted">Ricarica l'app per rileggere glossario, mappe, catalogo e grafica con i dati nuovi.</p>
          </div>
        )}
      </Modal>
    </section>
  );
}
