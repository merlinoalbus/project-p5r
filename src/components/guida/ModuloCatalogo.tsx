// ============================================================
// ModuloCatalogo — il guscio del catalogo: finestra, Salva, Ripristina/Elimina, Nascondi; i campi li mette il modulo del tipo
// ============================================================
//
// Quello che aggiungi resta anche quando i dati della guida vengono aggiornati: la riga è marcata
// come tua. Correggendo una riga della guida, l'originale viene conservato e «Ripristina» lo
// rimette. Ogni tipo ha il suo modulo in `moduli/` (negozio, articolo, libro, film, attività,
// videogioco, luogo, domanda, cruciverba): questo file sa solo salvare e chiudere.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CondizioniEditor } from './CondizioniEditor';
import { normalizzaCondizioniSpillo, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { aggiornaElementoCatalogo, creaElementoCatalogo, eliminaElementoCatalogo, eliminaNelCestino, isApiError, nascondiElementoCatalogo, ripristinaElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_CATALOGO, tipoCatalogoDi, type TipoModulo } from '../../utils/catalogo';
import { MODULI, type Dati } from './moduli';
import { jsonDi, jsonSenzaPerdite } from './moduli/base';
import type { ElementoCatalogoDto } from '../../types';

interface Props {
  /** Il tipo del catalogo, o «videogioco» (un'attività con il tipo fissato). */
  tipo: TipoModulo;
  /** Presente = modifica di una riga esistente; assente = creazione. */
  elemento?: ElementoCatalogoDto | null;
  /** Per un articolo nuovo: il negozio a cui appartiene. */
  negozioChiave?: string;
  onChiudi: () => void;
  onSalvato: () => void;
}

/**
 * La finestra di creazione o correzione di un elemento del catalogo. Prende dal modulo del tipo (`MODULI`) i dati
 * iniziali, i campi, la validazione e la preparazione del corpo; aggiunge le condizioni (se il tipo le prevede, lette
 * dal JSON salvato), la spunta «Confermato» e i comandi del guscio: «Salva» (attivo solo con dati e condizioni validi),
 * «Ripristina i valori della guida» per le righe corrette, «Elimina» (nel cestino per luoghi e negozi, L5) e «Nascondi» per quelle della guida.
 */
export function ModuloCatalogo({ tipo: tipoModulo, elemento, negozioChiave, onChiudi, onSalvato }: Props) {
  const tipo = tipoCatalogoDi(tipoModulo);
  const modulo = MODULI[tipoModulo];
  const nuovo = !elemento;
  const [dati, setDati] = useState<Dati>(() => modulo.iniziali(elemento ?? null, negozioChiave));
  /** Unisce una modifica parziale ai dati del modulo. */
  const imposta = (patch: Dati) => setDati((d) => ({ ...d, ...patch }));
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => normalizzaCondizioniSpillo(jsonDi(elemento?.dati.condizioni_json, [])));
  const [condizioniDaRisolvere, setCondizioniDaRisolvere] = useState(() => !jsonSenzaPerdite(elemento?.dati.condizioni_json, normalizzaCondizioniSpillo));
  const [condizioniScelte, setCondizioniScelte] = useState(!nuovo);
  const impostaCondizioni = (v: RequisitoSpillo[]) => { setCondizioni(v); setCondizioniScelte(true); setCondizioniDaRisolvere(false); };
  // Il modulo delle attività deve vedere le condizioni effettivamente inviate, non una copia iniziale.
  const datiModulo = tipo === 'attivita' ? { ...dati, condizioni_json: condizioni, _condizioniDaRisolvere: condizioniDaRisolvere } : dati;
  const fonteConfidente = tipo === 'attivita' && typeof dati.confidente_chiave === 'string' && dati.confidente_chiave.length > 0;
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);
  const regoleValide = !modulo.conCondizioni || (!condizioniDaRisolvere && condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null));
  const [occupato, setOccupato] = useState(false);
  const nome = tipoModulo === 'videogioco' ? { singolare: 'Videogioco', nuovo: 'Nuovo videogioco' } : NOME_TIPO_CATALOGO[tipo];
  const lettura = tipo === 'libro' || tipo === 'film' || tipoModulo === 'videogioco' || dati.tipo === 'videogioco';
  const catalogoCasa = typeof elemento?.dati._catalogoCasa === 'string' ? elemento.dati._catalogoCasa : null;

  /** Prepara il corpo col modulo del tipo (più le condizioni, se previste) e crea o aggiorna l'elemento; a buon fine notifica e avvisa il genitore. */
  const salva = async () => {
    setOccupato(true);
    setErroreSalvataggio(null);
    try {
      const corpo: Dati = modulo.prepara(datiModulo);
      if (modulo.conCondizioni && (!nuovo || condizioniScelte)) corpo.condizioni_json = condizioni;
      else if (nuovo) delete corpo.condizioni_json;
      if (nuovo) {
        const e = await creaElementoCatalogo(tipo, corpo);
        notifica('success', `${nome.singolare} «${e.nome}» aggiunto: resta anche quando i dati della guida vengono aggiornati.`);
      } else {
        await aggiornaElementoCatalogo(tipo, elemento.chiave, corpo);
        notifica('success', lettura ? `${nome.singolare} corretto. Il titolo si ripristina dalla pagina dell’oggetto.` : `${nome.singolare} corretto: «Ripristina» rimette i dati della guida.`);
      }
      onSalvato();
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : 'Salvataggio fallito.';
      setErroreSalvataggio(messaggio);
      notifica('error', messaggio);
    } finally {
      setOccupato(false);
    }
  };

  // L5 (M §3.2): due gesti, due rotte. «Ripristina i valori della guida» rimette i dati della guida (`POST …/ripristina`, ogni tipo, mai
  // elimina); «Elimina» di un luogo o di un negozio va nel cestino (con la conferma e, se ha contenuti, il riepilogo del server); gli altri
  // tipi eliminano le righe create dall'utente come prima (fino a L11)
  const nelCestino = tipo === 'luogo' || tipo === 'negozio';
  /** La finestra di conferma dell'eliminazione nel cestino; `riepilogo` è quel che il server ha detto che se ne va (409). */
  const [eliminazione, setEliminazione] = useState<{ riepilogo: string | null } | null>(null);
  /** Rimette i valori della guida su una riga corretta. */
  const ripristina = async () => {
    if (!elemento) return;
    setOccupato(true);
    setErroreSalvataggio(null);
    try {
      const ripristinato = await ripristinaElementoCatalogo(tipo, elemento.chiave);
      notifica('success', 'Ripristinati i valori della guida.');
      if (ripristinato.avvisi?.length) notifica('warning', ripristinato.avvisi.join(' '), 12000);
      onSalvato();
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : 'Operazione fallita.';
      setErroreSalvataggio(messaggio);
      notifica('error', messaggio);
    } finally {
      setOccupato(false);
    }
  };
  /** Elimina la riga creata dall'utente (tipi diversi da luogo e negozio). */
  const elimina = async () => {
    if (!elemento) return;
    setOccupato(true);
    setErroreSalvataggio(null);
    try {
      await eliminaElementoCatalogo(tipo, elemento.chiave);
      notifica('success', 'Eliminato.');
      onSalvato();
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : 'Operazione fallita.';
      setErroreSalvataggio(messaggio);
      notifica('error', messaggio);
    } finally {
      setOccupato(false);
    }
  };
  /** Luogo o negozio nel cestino: la prima conferma chiede senza `conferma`; con dei contenuti il server li elenca (409) e la seconda li porta via. */
  const eliminaLuogoNegozio = async () => {
    if (!elemento || !nelCestino) return;
    setOccupato(true);
    try {
      await eliminaNelCestino(tipo, elemento.chiave, eliminazione?.riepilogo !== null && eliminazione?.riepilogo !== undefined);
      notifica('success', `«${elemento.nome}» è nel cestino: si rimette da Impostazioni › Cestino.`);
      setEliminazione(null);
      onSalvato();
    } catch (err) {
      if (isApiError(err) && err.status === 409) setEliminazione({ riepilogo: testoRiepilogo(err.details) || err.message });
      else notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  /** Inverte la visibilità della riga negli elenchi (nasconde o rimostra), notifica e avvisa il genitore. */
  const nascondi = async () => {
    if (!elemento) return;
    setOccupato(true);
    try {
      await nascondiElementoCatalogo(tipo, elemento.chiave, !elemento.nascosta);
      notifica('success', elemento.nascosta ? 'Di nuovo visibile.' : 'Nascosto: resta nei dati ma non compare più negli elenchi. Lo ritrovi in «Rimossi».');
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const titolo = nuovo ? nome.nuovo : `${nome.singolare}: ${elemento.nome}`;
  const Componente = modulo.Componente;

  return (
    <Modal
      titolo={titolo}
      aperta
      onChiudi={onChiudi}
      larga
      azioni={
        <>
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          {!nuovo && elemento.modificata && (
            <button type="button" className="btn btn-secondary" disabled={occupato} onClick={() => void ripristina()}>{lettura ? 'Ripristina i dati di lettura' : 'Ripristina i valori della guida'}</button>
          )}
          {!nuovo && (nelCestino || (elemento.origine === 'utente' && !elemento.modificata)) && (
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => (nelCestino ? setEliminazione({ riepilogo: null }) : void elimina())}>Elimina</button>
          )}
          <button type="button" className="btn btn-primary" disabled={occupato || !regoleValide || !modulo.valido(datiModulo)} onClick={() => void salva()}>Salva</button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!nuovo && (
          <p className="m-0 text-[12px] text-text-muted">
            {elemento.origine === 'utente' && !elemento.modificata && 'Riga aggiunta da te.'}
            {elemento.modificata && (lettura ? 'Il ripristino riguarda sessioni, effetti e condizioni della lettura.' : 'Riga della guida corretta da te: «Ripristina i valori della guida» rimette i dati originali.')}
            {elemento.origine === 'seed' && !elemento.modificata && 'Riga dei dati della guida: salvando, la correzione resterà anche dopo gli aggiornamenti.'}
            {elemento.nascosta && ' Attualmente nascosta.'}
          </p>
        )}
        {lettura && <p className="m-0 text-[12px] text-text-muted">Il titolo appartiene all’oggetto: cambiarlo aggiorna tutti i riferimenti. Il prezzo si modifica nell’offerta del negozio.
          {catalogoCasa && <> <Link to={catalogoCasa} onClick={onChiudi} className="touch inline-flex items-center">Apri l’oggetto per ripristinare il titolo o vedere le offerte</Link>.</>}
        </p>}
        <Componente dati={datiModulo} imposta={imposta} impostaCondizioni={impostaCondizioni} elemento={elemento ?? null} nuovo={nuovo} disabilitato={occupato} negozioChiave={negozioChiave} />
        {/* Le condizioni valgono per quel che compare e sparisce col procedere della partita. Una
            domanda in classe e una riga del cruciverba hanno già il loro giorno, che è la
            condizione; il negozio ha gli orari, e lo sblocco della merce sta sugli articoli. */}
        {modulo.conCondizioni && <>
          {condizioniDaRisolvere && <div className="flex flex-col gap-2 rounded-md border border-warning p-3 text-sm">
            <p role="alert" className="m-0">Le condizioni salvate contengono parti che l’editor non sa rappresentare. Il salvataggio resta bloccato finché non scegli esplicitamente come risolverle.</p>
            <p className="m-0 whitespace-pre-wrap break-all">{String(elemento?.dati.condizioni_json)}</p>
            <button type="button" className="btn btn-secondary min-h-11 self-start" disabled={occupato} onClick={() => impostaCondizioni(condizioni)}>Usa le condizioni leggibili qui sotto e scarta le altre parti</button>
          </div>}
          {fonteConfidente && !condizioniDaRisolvere && condizioni.length === 0
            ? <p className="m-0 text-sm">Condizioni proprie dell’attività: nessuna. Disponibilità e requisiti vengono dalla fonte Confidente.</p>
            : <CondizioniEditor condizioni={condizioni} onCambia={impostaCondizioni} disabilitato={occupato || condizioniDaRisolvere} />}
          {nuovo && !fonteConfidente && condizioni.length === 0 && <div className="space-y-2 text-sm">
            <p>{condizioniScelte ? 'Hai scelto di non aggiungere condizioni proprie.' : 'Le condizioni proprie non sono ancora state scelte. Una frase non interamente compresa richiederà una tua scelta prima del salvataggio.'}</p>
            {!condizioniScelte && <button type="button" className="btn btn-secondary min-h-11" disabled={occupato} onClick={() => setCondizioniScelte(true)}>Nessuna condizione propria</button>}
          </div>}
        </>}
        {erroreSalvataggio && <p role="alert" className="m-0 text-sm text-error">{erroreSalvataggio} La finestra resta aperta.</p>}
        {!regoleValide && <p role="alert" className="m-0 text-[13px] text-error">Risolvi le parti non leggibili e completa o rimuovi i gruppi vuoti prima di salvare.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {modulo.conVerificato
            ? <label className="flex items-center gap-2 text-[13px] touch" title="Il dato è confermato: senza la spunta compare come «da fonte secondaria»">
              <input type="checkbox" className="h-5 w-5" checked={dati.verificato === true} disabled={occupato} onChange={(e) => imposta({ verificato: e.target.checked })} />
              Confermato
            </label>
            : <span />}
          {!nuovo && elemento.origine === 'seed' && (
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={elemento.nascosta ? 'sbloccato' : 'bloccato'} dimensione={20} />} titolo={elemento.nascosta ? 'Mostra di nuovo' : 'Nascondi dagli elenchi'} disabled={occupato} onClick={() => void nascondi()} />
          )}
        </div>
      </div>
      {/* L5 (R5-21): l'eliminazione di un luogo o di un negozio, nel cestino, con quel che porta con sé */}
      {eliminazione && elemento && (
        <Modal titolo={`Eliminare «${elemento.nome}»?`} aperta onChiudi={() => setEliminazione(null)}
          azioni={<>
            <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setEliminazione(null)}>Annulla</button>
            <button type="button" className="btn btn-danger touch" disabled={occupato} onClick={() => void eliminaLuogoNegozio()}>{eliminazione.riepilogo ? 'Metti nel cestino' : 'Elimina'}</button>
          </>}>
          <div className="flex flex-col gap-2 text-[14px]">
            {eliminazione.riepilogo && <p className="m-0 text-warning" role="alert">Se ne vanno anche: {eliminazione.riepilogo}.</p>}
            <p className="m-0 text-text-secondary">Va nel cestino: si può rimettere da Impostazioni › Cestino.</p>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

/** Il riepilogo del 409 a parole: «2 pin, 1 negozio, 14 articoli, 3 acquisti nelle partite» (solo le voci non a zero). */
function testoRiepilogo(d: Record<string, unknown> | undefined): string {
  if (!d) return '';
  const voci: Array<[string, string, string]> = [['pin', 'pin', 'pin'], ['negozi', 'negozio', 'negozi'], ['attivita', 'attività', 'attività'], ['articoli', 'articolo', 'articoli'], ['acquisti', 'presenza d’acquisto nelle partite', 'presenze d’acquisto nelle partite'], ['punti', 'riga di punti nelle partite', 'righe di punti nelle partite'], ['consumazioni', 'consumazione', 'consumazioni'], ['provenienze', 'fonte d’acquisto', 'fonti d’acquisto'], ['proposte', 'proposta da applicare', 'proposte da applicare'], ['ricevute', 'ricevuta degli effetti', 'ricevute degli effetti']];
  return voci.filter(([k]) => typeof d[k] === 'number' && (d[k] as number) > 0).map(([k, uno, molti]) => `${d[k] as number} ${(d[k] as number) === 1 ? uno : molti}`).join(', ');
}
