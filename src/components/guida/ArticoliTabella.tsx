// ============================================================
// ArticoliTabella — elenco degli articoli del catalogo: nome, prezzo, disponibilità, spunta «acquistato» e dettagli
// ============================================================
//
// Una riga per articolo, resa come riga su desktop e come scheda su tablet/mobile dallo stesso markup. La spunta
// compare solo con una partita attiva ed è bloccata finché l'articolo non è disponibile (salvo se già acquistato).
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { annullaRigaAcquisto, getNegozio, impostaAcquisto, togliSegnoSenzaGiorno } from '../../services/api';
import { eOffertaAojiru } from '../../../shared/acquisti';
import { eRifornibile } from '../../../shared/rifornimento';
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
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

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
  // Ondata 5 (decisione 21): si barra solo ciò che una volta comprato non torna (pezzo unico, o senza regola come prima); ciò che si
  // rifornisce resta in chiaro, e la scorta del ciclo la dicono «Compra» e la disponibilità
  const ripetibile = eOffertaAojiru({ chiave: a.chiave, catalogoChiave: a.catalogo?.chiave }) || eRifornibile(a.rifornimento?.regola ?? null);
  const acquistoBloccato = a.disponibilita !== undefined && a.disponibilita.stato !== 'disponibile';
  /** Segna o toglie l'acquisto nella partita e passa al genitore l'articolo aggiornato; l'errore va in notifica. */
  const cambia = async (articolo: string, fatto: boolean) => {
    setOccupato(true);
    try { onCambiato(await impostaAcquisto(partitaId!, articolo, fatto, a.sedeChiave)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  /** Annulla un solo acquisto del ciclo (una riga del registro) e passa al genitore l'articolo aggiornato. */
  const annullaRiga = async (rigaId: number) => {
    setOccupato(true);
    try { onCambiato(await annullaRigaAcquisto(partitaId!, rigaId)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Annullamento fallito.'); }
    finally { setOccupato(false); }
  };
  /** Toglie il segno «ottenuto» senza un giorno registrato (di prima del registro, o senza data di gioco) e passa al genitore l'articolo aggiornato. */
  const togliSegno = async (articolo: string) => {
    setOccupato(true);
    try { onCambiato(await togliSegnoSenzaGiorno(partitaId!, articolo, a.sedeChiave)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Annullamento fallito.'); }
    finally { setOccupato(false); }
  };
  return <li className={`catalogo-prodotto${a.acquistato && !ripetibile ? ' catalogo-prodotto--acquistato' : ''}`}>
    <div className="catalogo-prodotto__nome">
      <strong className={a.acquistato && !ripetibile ? 'line-through' : ''}>{a.catalogo ? <Link to={a.catalogo.casa} className="touch inline-flex items-center">{nome}</Link> : nome}</strong>
      <span className="catalogo-prodotto__meta">{NOME_CATEGORIA_ARTICOLO[a.categoria] ?? a.categoria}{a.per && <> · <span>{a.per}</span></>}</span>
      {a.statistiche && <span className="text-text-secondary"><TestoNote testo={a.statistiche} daParole="conteggi" /></span>}
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
        acquistato={a.acquistato} bloccato={acquistoBloccato} occupato={occupato} onCambia={(chiave, fatto) => void cambia(chiave, fatto)}
        rifornimento={a.rifornimento} scorta={a.scorta} onAnnullaRiga={(id) => void annullaRiga(id)} onTogliSegno={(k) => void togliSegno(k)} />}
      {!IN_RILASCIO && onModifica && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={() => onModifica(a)} aria-label={`Modifica ${nome}`} />}
    </div>
    <details className="catalogo-prodotto__dettagli">
      <summary className="touch">Dettagli{a.condizioni?.length ? ` · ${a.condizioni.length} ${a.condizioni.length === 1 ? 'requisito' : 'requisiti'}` : ''}{!a.verificato ? ' · fonte secondaria' : ''}</summary>
      <dl>
        {a.nomeOriginale && <><dt>Nome originale</dt><dd>{a.nomeOriginale}</dd></>}
        <dt>Disponibilità</dt><dd>{a.disponibilita?.requisiti.length ? <ul>{a.disponibilita.requisiti.map((r,i)=><li key={i}>{r.testo} — {r.dettaglio}</li>)}</ul> : a.condizioni?.length ? <ul>{a.condizioni.map((r,i)=><li key={i}>{r.tipo === 'avviso' ? descriviRequisitoSpillo(r) : r.testo}</li>)}</ul> : 'Nessun requisito'}</dd>
        {a.rifornimento?.regola.origine === 'guida' && <><dt>Rifornimento</dt><dd className="text-pretty">{a.rifornimento.testo}</dd></>}
        <dt>Effetto</dt><dd>{a.effetto ? <TestoNote testo={a.effetto} daParole="conteggi" /> : 'Non indicato'}</dd>
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
