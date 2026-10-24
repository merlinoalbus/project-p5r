// ============================================================
// ArticoliTabella — elenco degli articoli del catalogo: nome, prezzo, disponibilità, spunta «acquistato» e dettagli
// ============================================================
//
// Una riga per articolo, resa come riga su desktop e come scheda su tablet/mobile dallo stesso markup. La spunta
// compare solo con una partita attiva ed è bloccata finché l'articolo non è disponibile (salvo se già acquistato).
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getNegozio, impostaAcquisto } from '../../services/api';
import { eOffertaAojiru } from '../../../shared/acquisti';
import { notifica } from '../../stores/notificationStore';
import { NOME_CATEGORIA_ARTICOLO } from '../../utils/negozi';
import type { ArticoloDto } from '../../types';
import { ChipDisponibilita } from './ChipDisponibilita';
import { descriviRequisitoSpillo } from '../../../shared/condizioniSpillo';
import { CostoDellOggetto } from '../catalogo/CostoDellOggetto';
import { OggettiCollegati } from '../catalogo/OggettiCollegati';
import { ContenutoDellaVoce } from '../catalogo/ContenutoDellaVoce';
import { AcquistiOfferta } from '../catalogo/AcquistiOfferta';
import { NoteStoricheOfferta } from '../catalogo/NoteStoricheOfferta';

interface Props {
  articoli: ArticoloDto[];
  partitaId: number | null;
  mostraNegozio?: boolean;
  onCambiato: (a: ArticoloDto) => void;
  onModifica?: (a: ArticoloDto) => void;
  onContenutoCambiato?: () => void | Promise<void>;
}

/**
 * Riga di un articolo: nome (barrato se acquistato), categoria e destinatario, statistiche, collegamento alla scheda
 * del negozio se `mostraNegozio`, prezzo, chip di disponibilità, spunta «Acquistato» (solo con partita), pulsante
 * «Modifica» se c'è `onModifica` e un riquadro di dettagli con nome originale, requisiti, effetto e nota.
 */
function Prodotto({ a, partitaId, mostraNegozio, onCambiato, onModifica, onContenutoCambiato }: Omit<Props, 'articoli'> & { a: ArticoloDto }) {
  const [occupato, setOccupato] = useState(false);
  const nome = a.nome;
  const ripetibile = eOffertaAojiru({ chiave: a.chiave, catalogoChiave: a.catalogo?.chiave });
  const acquistoBloccato = a.disponibilita !== undefined && a.disponibilita.stato !== 'disponibile';
  /** Segna o toglie l'acquisto nella partita e passa al genitore l'articolo aggiornato; l'errore va in notifica. */
  const cambia = async (articolo: string, fatto: boolean) => {
    setOccupato(true);
    try { onCambiato(await impostaAcquisto(partitaId!, articolo, fatto, a.sedeChiave)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  return <li className={`catalogo-prodotto${a.acquistato && !ripetibile ? ' catalogo-prodotto--acquistato' : ''}`}>
    <div className="catalogo-prodotto__nome">
      <strong className={a.acquistato && !ripetibile ? 'line-through' : ''}>{a.catalogo ? <Link to={a.catalogo.casa} className="touch inline-flex items-center">{nome}</Link> : nome}</strong>
      <span className="catalogo-prodotto__meta">{NOME_CATEGORIA_ARTICOLO[a.categoria] ?? a.categoria}{a.per && <> · <span>{a.per}</span></>}</span>
      {a.statistiche && <span className="text-text-secondary">{a.statistiche}</span>}
      {!!a.ricevuti?.length && <div className="flex min-w-0 flex-col gap-1"><span>Si riceve:</span><OggettiCollegati oggetti={a.ricevuti} /></div>}
      {mostraNegozio && <Link to={`/guida/mondo/articolo/${encodeURIComponent(a.chiave)}`} className="touch inline-flex items-center">{a.negozioNome}</Link>}
    </div>
    <div className="catalogo-prodotto__prezzo"><span className="catalogo-prodotto__etichetta">Costo</span><strong><CostoDellOggetto costo={a.costo ?? null} prezzo={a.prezzo} daVerificare={a.costoDaVerificare} /></strong></div>
    {/* La colonna dice **se si può comprare**, e basta: c'era anche «2 requisiti · apri
        Dettagli», che è un'istruzione scritta a mano dove serve un comando. Il numero è finito
        dov'è il suo posto, cioè sulla riga dei Dettagli, che i requisiti li elenca davvero. */}
    <div className="catalogo-prodotto__disponibilita"><ChipDisponibilita disponibilita={a.disponibilita} compatto />{a.condizioni?.length === 0 && <span>Nessun requisito</span>}</div>
    <div className="catalogo-prodotto__azioni">
      {/* Una cosa sola: la spunta. «Non ancora acquistabile» stava sia qui sia nella pastiglia
          accanto, e la stessa frase due volte sulla stessa riga sembra due informazioni. */}
      {partitaId && <AcquistiOfferta articolo={a.chiave} nome={nome} registrati={a.acquistiRegistrati ?? []}
        partitaId={partitaId} acquisti={a.acquisti} onRileggi={async () => {
          const aggiornato = await getNegozio(a.negozioChiave, partitaId);
          const articolo = aggiornato.articoliElenco.find((x) => x.chiave === a.chiave);
          if (!articolo) throw new Error('Operazione registrata; l’articolo non è più presente nel listino.');
          onCambiato(articolo); await onContenutoCambiato?.();
        }}
        acquistato={a.acquistato} bloccato={acquistoBloccato} occupato={occupato} onCambia={(chiave, fatto) => void cambia(chiave, fatto)} />}
      {onModifica && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => onModifica(a)} aria-label={`Correggi ${nome}`}>Modifica</button>}
    </div>
    <details className="catalogo-prodotto__dettagli">
      <summary className="touch">Dettagli{a.condizioni?.length ? ` · ${a.condizioni.length} ${a.condizioni.length === 1 ? 'requisito' : 'requisiti'}` : ''}{!a.verificato ? ' · fonte secondaria' : ''}</summary>
      <dl>
        {a.nomeOriginale && <><dt>Nome originale</dt><dd>{a.nomeOriginale}</dd></>}
        <dt>Disponibilità</dt><dd>{a.disponibilita?.requisiti.length ? <ul>{a.disponibilita.requisiti.map((r,i)=><li key={i}>{r.testo} — {r.dettaglio}</li>)}</ul> : a.condizioni?.length ? <ul>{a.condizioni.map((r,i)=><li key={i}>{r.tipo === 'avviso' ? descriviRequisitoSpillo(r) : r.testo}</li>)}</ul> : 'Nessun requisito'}</dd>
        <dt>Effetto</dt><dd>{a.effetto || 'Non indicato'}</dd>
        {a.nota && <><dt>Nota</dt><dd>{a.nota}</dd></>}
        {!!a.noteStoriche?.length && <><dt>Nota storica della fonte</dt><dd><NoteStoricheOfferta note={a.noteStoriche} onLegamiCambiati={onContenutoCambiato} /></dd></>}
      </dl>
      {onModifica && onContenutoCambiato && !a.catalogo && <ContenutoDellaVoce
        fonte={{ tipo: 'ricompensa', chiave: `articolo/${a.chiave}` }} contenuto={a.ricevuti ?? []}
        onCambiato={async () => { await onContenutoCambiato(); }} />}
    </details>
  </li>;
}

/** Un solo albero accessibile: righe su desktop, schede su tablet/mobile secondo lo spazio effettivo. */
export function ArticoliTabella({ articoli, ...props }: Props) {
  if (articoli.length === 0) return <p>Nessun articolo con questi filtri.</p>;
  return <div className="catalogo-prodotti"><ul aria-label="Prodotti del catalogo">{articoli.map(a => <Prodotto key={a.chiave} a={a} {...props} />)}</ul></div>;
}
