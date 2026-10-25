// ============================================================
// PreparaEdizione — «Prepara edizione» dalle Impostazioni della PREPARAZIONE (L12, passi 7 e 9)
// ============================================================
//
// L'istanza pubblica di rilascio riceve i contenuti chiusi da questa azione: il server lavora su copie (i dati dell'utente non si toccano),
// prepara `gioco.db` (regole a zero, miniature di tutte le immagini, controlli, nessun giornale WAL), `partite-vuoto.db`, i caratteri, il
// manifesto con gli SHA-256 e il confronto di compatibilità con l'edizione precedente, e deposita tutto nella cartella d'appoggio.
//
// Dura minuti, più dei cento secondi che un proxy concede: la richiesta parte e risponde subito, poi si interroga lo stato (come per
// l'importazione del pacchetto). Se la pagina si ricarica durante il lavoro lo stato lo ritrova. Il componente compare solo se l'istanza ha la
// funzione `importaEsporta` (`<SoloPreparazione>` nella pagina); nel rilascio non esiste nemmeno nel bundle.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { avviaPreparazioneEdizione, getStatoEdizione } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { byteTesto } from '../../utils/byte';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { BarraInvio } from './BarraInvio';
import type { CategoriaProblemaEdizione, EsitoEdizioneDto, FaseEdizione, ProblemaContenutoEdizioneDto, StatoEdizioneDto } from '../../types';

/** Ogni quanto si richiede lo stato mentre il server lavora. */
const ATTESA_FRA_CONTROLLI_MS = 3_000;

/** Numero con i separatori delle migliaia all'italiana. */
const numero = (n: number): string => n.toLocaleString('it-IT');

/** Che cosa sta facendo il server, detto all'utente. */
const NOME_FASE: Record<FaseEdizione, string> = {
  copia: 'Il server sta copiando i dati di gioco',
  regole: 'Il server sta applicando le regole sui dati alla copia',
  correzioni: 'Il server sta scrivendo le correzioni della guida dentro i blocchi della copia',
  miniature: 'Il server sta preparando le miniature di tutte le immagini',
  compattazione: 'Il server sta compattando il database dell’edizione',
  'partite-vuoto': 'Il server sta creando il file delle partite vuoto',
  controlli: 'Il server sta controllando l’integrità dei dati',
  caratteri: 'Il server sta copiando i caratteri',
  compatibilita: 'Il server sta confrontando l’edizione con la precedente',
  manifesto: 'Il server sta scrivendo il manifesto',
  deposito: 'Il server sta depositando l’edizione nella cartella d’appoggio',
};

/** Il titolo di ciascun genere di problema dei contenuti. */
const TITOLO_CATEGORIA: Record<CategoriaProblemaEdizione, string> = {
  'condizione-illeggibile': 'Condizioni illeggibili',
  'condizione-non-riconosciuta': 'Condizioni non riconosciute',
  'json-malformato': 'JSON malformati',
  'chiave-orfana': 'Riferimenti a chiavi che non esistono',
  'spillo-senza-uid': 'Spilli senza uid',
  'regola-pesca': 'Regole di pesca con punti base diversi da 2',
  'immagine-mancante': 'Immagini citate e assenti',
  'correzione-orfana': 'Correzioni della guida non più accolte',
};

/** L’elenco oggetto per oggetto dei problemi dei contenuti di una gravità: genere, oggetto, campo, dettaglio e la pagina dove correggerlo. */
function ElencoContenuti({ e, gravita }: { e: EsitoEdizioneDto; gravita: ProblemaContenutoEdizioneDto['gravita'] }) {
  const gruppi = e.riepilogoProblemi.filter((r) => r.gravita === gravita);
  if (gruppi.length === 0) return null;
  const bloccante = gravita === 'bloccante';
  return (
    <div className="flex flex-col gap-2">
      <h3 className={`m-0 testo-14 ${bloccante ? 'text-error' : 'text-warning'}`}>{bloccante ? 'Contenuti da correggere nella preparazione (bloccano l’edizione)' : 'Contenuti da controllare (non bloccano)'}</h3>
      {gruppi.map((g) => (
        <details key={g.categoria} open={bloccante} className="rounded border border-border px-2 py-1">
          <summary className="cursor-pointer">
            <strong>{numero(g.totale)}</strong> {TITOLO_CATEGORIA[g.categoria]}
            {g.mostrati < g.totale && <span className="text-text-muted"> · mostrati i primi {numero(g.mostrati)}</span>}
          </summary>
          <ul className="m-0 mt-1 p-0 list-none flex flex-col gap-1" aria-label={TITOLO_CATEGORIA[g.categoria]}>
            {e.problemiContenuto.filter((p) => p.gravita === gravita && p.categoria === g.categoria).map((p, i) => (
              <li key={`${p.tabella}|${p.oggetto}|${p.campo ?? ''}|${i}`} className="flex flex-col gap-0.5 border-t border-border pt-1">
                <span><strong>{p.oggetto}</strong>{p.campo && <span className="text-text-muted"> · campo <code>{p.campo}</code></span>}</span>
                <span className="text-text-secondary">{p.dettaglio}</span>
                <span className="text-text-muted">
                  {p.dove ? <>Dove correggerlo: <Link to={p.dove} className="underline">{p.dove}</Link></> : 'Nessuna pagina dedicata'} · tabella <code>{p.tabella}</code>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

/** Le correzioni della guida unite nei blocchi e le fotografie tolte, con i conteggi prima e dopo. */
function UnioneCorrezioni({ e }: { e: EsitoEdizioneDto }) {
  const u = e.correzioniGuida;
  const foto = Object.keys(u.fotografie.righeFotoPrima);
  return (
    <div className="flex flex-col gap-1">
      <h3 className="m-0 testo-14">Correzioni della guida nell’edizione</h3>
      <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2">
        <li><strong>Correzioni</strong> <span className="text-text-muted">{numero(u.correzioniPrima)} prima · {numero(u.correzioniApplicate)} scritte nei blocchi · {numero(u.correzioniOrfane)} non accolte · {numero(u.correzioniDopo)} dopo</span></li>
        <li><strong>Blocchi della guida</strong> <span className="text-text-muted">{numero(u.blocchiGuida.prima)} prima · {numero(u.blocchiGuida.riscritti)} riscritti · {numero(u.blocchiGuida.dopo)} dopo</span></li>
        <li><strong>Fotografie dei Confidenti</strong> <span className="text-text-muted">{numero(u.fotografie.chiaviGuidaPrima)} prima · {numero(u.fotografie.chiaviGuidaDopo)} dopo</span></li>
        {foto.map((t) => <li key={t}><strong>{t}</strong> <span className="text-text-muted">{numero(u.fotografie.righeFotoPrima[t] ?? 0)} righe prima · {numero(u.fotografie.righeFotoDopo[t] ?? 0)} dopo</span></li>)}
      </ul>
      {u.blocchi.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-0.5" aria-label="Correzioni per blocco">
          {u.blocchi.map((b) => <li key={b.blocco} className="text-text-secondary"><code>{b.blocco}</code> <span className="text-text-muted">· {numero(b.prima)} prima · {numero(b.applicate)} scritte · {numero(b.orfane)} non accolte · {numero(b.dopo)} dopo</span></li>)}
        </ul>
      )}
    </div>
  );
}

/** Il rapporto di un’edizione: problemi bloccanti, avvisi, contenuti oggetto per oggetto, correzioni unite, file, controlli, compatibilità. */
function Rapporto({ e }: { e: EsitoEdizioneDto }) {
  const c = e.compatibilita;
  return (
    <div className="flex flex-col gap-3 testo-13">
      {e.bloccanti.length > 0 && (
        <div className="flex flex-col gap-1" role="alert">
          <h3 className="m-0 testo-14 text-error">Problemi da risolvere prima di poter depositare l’edizione</h3>
          <ul className="m-0 pl-4 text-error">{e.bloccanti.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      {e.avvisi.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 testo-14 text-warning">Da sapere</h3>
          <ul className="m-0 pl-4 text-warning">{e.avvisi.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      <ElencoContenuti e={e} gravita="bloccante" />
      <ElencoContenuti e={e} gravita="avviso" />
      <UnioneCorrezioni e={e} />
      <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2">
        <li><strong>Schema</strong> <span className="text-text-muted">gioco {e.versioneSchemaGioco} · partite {e.versioneSchemaPartite}</span></li>
        <li><strong>Immagini</strong> <span className="text-text-muted">{numero(e.conteggi.immagini)} · {byteTesto(e.conteggi.byteImmagini)}</span></li>
        <li><strong>Miniature</strong> <span className="text-text-muted">{numero(e.miniature.righe)} nel database ({numero(e.miniature.generate)} generate ora, {numero(e.miniature.originali)} immagini servite a piena risoluzione)</span></li>
        <li><strong>Caratteri</strong> <span className="text-text-muted">{numero(e.conteggi.caratteri)}</span></li>
        <li><strong>Integrità</strong> <span className={e.controlli.integrityCheck === 'ok' ? 'text-success' : 'text-error'}>{e.controlli.integrityCheck}</span> <span className="text-text-muted">· chiavi esterne: {numero(e.controlli.violazioniChiaviEsterne)} violazioni · spilli senza uid: {numero(e.controlli.spilliSenzaUid)}</span></li>
        <li><strong>Edizione precedente</strong> <span className="text-text-muted">{c.precedente ? `numero ${c.precedente.numero}` : 'nessuna: è la prima'}</span></li>
      </ul>
      {c.precedente && (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 testo-14">Compatibilità con l’edizione {c.precedente.numero}</h3>
          {c.strutturaPartiteCambiata && <p className="m-0 text-warning">La struttura delle partite è cambiata: l’istanza di rilascio non ha una strada automatica per convertirla.</p>}
          {c.chiaviRimosse.length === 0 ? (
            <p className="m-0 text-success">Nessuna chiave citata dalle partite è sparita ({numero(c.chiaviAggiunte)} nuove).</p>
          ) : (
            <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Chiavi sparite">
              {c.chiaviRimosse.map((k) => (
                <li key={k.insieme} className="flex flex-col gap-0.5 rounded border border-border px-2 py-1">
                  <span><strong>{numero(k.rimosse)}</strong> {k.rimosse === 1 ? 'chiave sparita' : 'chiavi sparite'} <span className="text-text-muted">· {k.insieme}</span></span>
                  <span className="text-text-secondary">citate da {k.citatoDa.join(', ')}</span>
                  <span className="text-text-muted break-all">es. {k.esempi.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {c.orfaniPreparazione.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 testo-14">Partite di questa istanza senza la loro voce nell’edizione</h3>
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Riferimenti orfani">
            {c.orfaniPreparazione.map((o) => (
              <li key={`${o.tabella}.${o.colonna}.${o.entita}`} className="rounded border border-border px-2 py-1">
                <strong>{o.entita}</strong> <span className="text-text-muted">· {o.tabella}.{o.colonna} · {numero(o.righe)} {o.righe === 1 ? 'riga' : 'righe'} in {numero(o.partite)} {o.partite === 1 ? 'partita' : 'partite'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="m-0 testo-14">File dell’edizione</h3>
        <div className="area-scorrevole-x">
          <table className="w-full border-collapse testo-13" aria-label="File dell’edizione">
            <thead><tr className="text-left text-text-muted"><th className="py-0.5 pr-2 font-normal">File</th><th className="py-0.5 pr-2 font-normal text-right">Dimensione</th><th className="py-0.5 font-normal">SHA-256</th></tr></thead>
            <tbody>
              {e.file.map((f) => (
                <tr key={f.nome}><td className="py-0.5 pr-2 font-mono">{f.nome}</td><td className="py-0.5 pr-2 text-right tabular-nums">{byteTesto(f.byte)}</td><td className="py-0.5 font-mono text-text-muted break-all" title={f.sha256}>{f.sha256}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Card «Edizione di rilascio» delle Impostazioni: stato dell’ultima edizione depositata, avvio della preparazione (con conferma),
 * avanzamento del lavoro sul server e rapporto finale. Non ha props.
 */
export function PreparaEdizione() {
  // lo stato del server: primo caricamento qui, poi riletture periodiche finché il server lavora (un errore di una rilettura lascia a video l'ultimo stato)
  const lettura = useCarica(() => getStatoEdizione(), []);
  const stato: StatoEdizioneDto | null = lettura.dati;
  const errore = lettura.errore;
  const rileggi = lettura.ricarica;
  const [conferma, setConferma] = useState(false);
  const [invio, setInvio] = useState(false);
  // l’operazione conclusa che l’utente ha già visto: se il lavoro finisce mentre guarda, lo si dice una volta sola
  const annunciata = useRef<string | null>(null);

  const inCorso = stato?.inCorso ?? false;
  useEffect(() => {
    if (!inCorso) return;
    const id = setInterval(() => { void rileggi(); }, ATTESA_FRA_CONTROLLI_MS);
    return () => clearInterval(id);
  }, [inCorso, rileggi]);

  // alla fine del lavoro si avvisa con una notifica (una volta per operazione)
  const ultima = stato?.ultima ?? null;
  useEffect(() => {
    if (!ultima || inCorso || annunciata.current === ultima.operazione) return;
    // la prima lettura dopo il caricamento della pagina non annuncia un esito vecchio: serve solo se l’operazione è stata vista in corso
    if (annunciata.current !== null) notifica(ultima.riuscita ? 'success' : 'error', ultima.messaggio);
    annunciata.current = ultima.operazione;
  }, [ultima, inCorso]);

  /** Avvia la preparazione; la risposta è immediata (202), il resto si segue con lo stato. */
  const avvia = async () => {
    setConferma(false);
    setInvio(true);
    try {
      await avviaPreparazioneEdizione();
      // da qui il controllo periodico dell'operazione conclusa si arma: l'esito precedente non va riannunciato, il nuovo sì
      annunciata.current = stato?.ultima?.operazione ?? '';
      await rileggi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Impossibile avviare la preparazione dell’edizione.');
    } finally {
      setInvio(false);
    }
  };

  const fase = stato?.fase ?? null;
  const testoFase = fase ? `${NOME_FASE[fase]}${stato?.avanzamento ? ` (${numero(stato.avanzamento.fatte)} di ${numero(stato.avanzamento.totale)})` : ''}` : 'Il server sta lavorando';
  const depositata = stato?.edizioneDepositata ?? null;

  return (
    <section className="card flex flex-col gap-3" aria-label="Edizione di rilascio">
      <h2 className="m-0 testo-15 font-semibold">Edizione di rilascio</h2>
      <p className="m-0 testo-13 text-text-secondary">
        L’istanza pubblica, in sola lettura, riceve i contenuti da qui. «Prepara edizione» lavora su <strong>copie</strong>: non modifica i dati di questa istanza.
        Applica le regole sui dati, prepara le miniature di tutte le immagini, controlla l’integrità, crea il file delle partite vuoto, confronta l’edizione con la precedente
        e deposita il risultato, con il manifesto degli SHA-256, nella cartella d’appoggio. Dura alcuni minuti.
      </p>
      {errore && <p className="m-0 testo-13 text-error" role="alert">{errore}</p>}
      {stato && !stato.depositoDisponibile && <p className="m-0 testo-13 text-warning" role="status">La cartella d’appoggio non è configurata o non è scrivibile su questo server: l’edizione non si può depositare.</p>}
      {depositata && <p className="m-0 testo-13">Ultima edizione depositata: <strong>numero {depositata.numero}</strong> <span className="text-text-muted">· <code>{depositata.cartella}</code> · {new Date(depositata.creataIl).toLocaleString('it-IT')}</span></p>}
      {stato && !depositata && stato.depositoDisponibile && <p className="m-0 testo-13 text-text-muted">Nessuna edizione depositata finora.</p>}
      {inCorso && <BarraInvio avanzamento={{ byteInviati: 0, byteTotali: 0, percentuale: 100, inviato: true }} etichetta="Preparazione dell’edizione" elaborazione={testoFase} />}
      {!inCorso && ultima && (
        <p className={`m-0 testo-13 ${ultima.riuscita ? 'text-success' : 'text-error'}`} role="status">{ultima.messaggio}</p>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        <PulsanteVisivo
          tono="primario"
          compatto
          icona={<IconaAzione chiave="registra" dimensione={20} />}
          titolo="Prepara edizione"
          dettaglio="copie, controlli, miniature, deposito"
          disabled={invio || inCorso || !stato?.depositoDisponibile}
          onClick={() => setConferma(true)}
        />
      </div>
      {!inCorso && ultima?.esito && <Rapporto e={ultima.esito} />}
      <Modal
        titolo="Preparare una nuova edizione?"
        aperta={conferma}
        onChiudi={() => setConferma(false)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConferma(false)}>Annulla</button>
            <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Prepara l’edizione" onClick={() => void avvia()} />
          </>
        }
      >
        <div className="flex flex-col gap-2 testo-13">
          <p className="m-0 testo-14">Il server prepara l’edizione {depositata ? depositata.numero + 1 : 1} lavorando su copie dei tuoi dati, che restano come sono.</p>
          <p className="m-0 text-text-secondary">Durante il lavoro (alcuni minuti) l’importazione, il ripristino e un’altra edizione sono bloccati, e l’app può rallentare nella fase di compattazione. Se i controlli trovano un problema l’edizione non viene depositata e il rapporto dice perché.</p>
        </div>
      </Modal>
    </section>
  );
}
