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
import { CondizioniEditor } from './CondizioniEditor';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { aggiornaElementoCatalogo, creaElementoCatalogo, eliminaElementoCatalogo, nascondiElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_CATALOGO, tipoCatalogoDi, type TipoModulo } from '../../utils/catalogo';
import { MODULI, type Dati } from './moduli';
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

export function ModuloCatalogo({ tipo: tipoModulo, elemento, negozioChiave, onChiudi, onSalvato }: Props) {
  const tipo = tipoCatalogoDi(tipoModulo);
  const modulo = MODULI[tipoModulo];
  const nuovo = !elemento;
  const [dati, setDati] = useState<Dati>(() => modulo.iniziali(elemento ?? null, negozioChiave));
  const imposta = (patch: Dati) => setDati((d) => ({ ...d, ...patch }));
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => { try { return JSON.parse(String(elemento?.dati.condizioni_json ?? '[]')) as RequisitoSpillo[]; } catch { return []; } });
  const regoleValide = !modulo.conCondizioni || condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null);
  const [occupato, setOccupato] = useState(false);
  const nome = tipoModulo === 'videogioco' ? { singolare: 'Videogioco', nuovo: 'Nuovo videogioco' } : NOME_TIPO_CATALOGO[tipo];

  const salva = async () => {
    setOccupato(true);
    try {
      const corpo: Dati = modulo.prepara(dati);
      if (modulo.conCondizioni) corpo.condizioni_json = condizioni;
      if (nuovo) {
        const e = await creaElementoCatalogo(tipo, corpo);
        notifica('success', `${nome.singolare} «${e.nome}» aggiunto: resta anche quando i dati della guida vengono aggiornati.`);
      } else {
        await aggiornaElementoCatalogo(tipo, elemento.chiave, corpo);
        notifica('success', `${nome.singolare} corretto: «Ripristina» rimette i dati della guida.`);
      }
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  const ripristinaOelimina = async () => {
    if (!elemento) return;
    setOccupato(true);
    try {
      const esito = await eliminaElementoCatalogo(tipo, elemento.chiave);
      notifica('success', esito.esito === 'eliminata' ? 'Eliminato.' : 'Ripristinati i dati della guida.');
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

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
          {!nuovo && (elemento.origine === 'utente' || elemento.nascosta) && (
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void ripristinaOelimina()}>
              {elemento.modificata || elemento.nascosta ? 'Ripristina dalla guida' : 'Elimina'}
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={occupato || !regoleValide || !modulo.valido(dati)} onClick={() => void salva()}>Salva</button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!nuovo && (
          <p className="m-0 text-[12px] text-text-muted">
            {elemento.origine === 'utente' && !elemento.modificata && 'Riga aggiunta da te.'}
            {elemento.modificata && 'Riga della guida corretta da te: «Ripristina dalla guida» rimette i dati originali.'}
            {elemento.origine === 'seed' && !elemento.modificata && 'Riga dei dati della guida: salvando, la correzione resterà anche dopo gli aggiornamenti.'}
            {elemento.nascosta && ' Attualmente nascosta.'}
          </p>
        )}
        <Componente dati={dati} imposta={imposta} elemento={elemento ?? null} nuovo={nuovo} disabilitato={occupato} negozioChiave={negozioChiave} />
        {/* Le condizioni valgono per quel che compare e sparisce col procedere della partita. Una
            domanda in classe e una riga del cruciverba hanno già il loro giorno, che è la
            condizione; il negozio ha gli orari, e lo sblocco della merce sta sugli articoli. */}
        {modulo.conCondizioni && <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={occupato} />}
        {!regoleValide && <p role="alert" className="m-0 text-[13px] text-error">Completa o rimuovi i gruppi vuoti prima di salvare.</p>}
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
    </Modal>
  );
}
