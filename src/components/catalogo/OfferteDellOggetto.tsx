import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OffertaOggettoDto } from '../../types';
import { annullaRigaAcquisto, impostaAcquisto, togliSegnoSenzaGiorno } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { ancoraNegozio } from '../../utils/citta';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';
import { descriviRequisitoSpillo } from '../../../shared/condizioniSpillo';
import { CostoDellOggetto } from './CostoDellOggetto';
import { ScontoDellOfferta } from './PrezzoScontato';
import { AcquistiOfferta } from './AcquistiOfferta';
import { NoteStoricheOfferta } from './NoteStoricheOfferta';

function Offerta({ offerta: o, nome, partitaId, onCambiata }: { offerta: OffertaOggettoDto; nome: string; partitaId: number | null; onCambiata: () => void | Promise<void> }) {
  const [occupato, setOccupato] = useState(false);
  const cambia = async (articolo: string, fatto: boolean) => {
    if (partitaId === null || occupato) return;
    setOccupato(true);
    try { await impostaAcquisto(partitaId, articolo, fatto); await onCambiata(); }
    catch (e) { notifica('error', e instanceof Error ? e.message : 'Acquisto non aggiornato.'); }
    finally { setOccupato(false); }
  };
  /** Ondata 5: annulla un solo acquisto del ciclo (una riga del registro della partita). */
  const annullaRiga = async (rigaId: number) => {
    if (partitaId === null || occupato) return;
    setOccupato(true);
    try { await annullaRigaAcquisto(partitaId, rigaId); await onCambiata(); }
    catch (e) { notifica('error', e instanceof Error ? e.message : 'Acquisto non annullato.'); }
    finally { setOccupato(false); }
  };
  /** Ondata 5: toglie il segno «ottenuto» senza un giorno registrato (di prima del registro, o senza data di gioco). */
  const togliSegno = async (articolo: string) => {
    if (partitaId === null || occupato) return;
    setOccupato(true);
    try { await togliSegnoSenzaGiorno(partitaId, articolo); await onCambiata(); }
    catch (e) { notifica('error', e instanceof Error ? e.message : 'Segno non tolto.'); }
    finally { setOccupato(false); }
  };
  const requisiti = o.disponibilita?.requisiti ?? [];
  const casa = o.sedeCasa ? `${o.sedeCasa.split('#')[0]}#${ancoraNegozio(o.negozio)}` : `/guida/negozi/${encodeURIComponent(o.negozio)}`;
  return <tr>
    {/* il nome di una macchina dice già dov'è, e il quartiere sta nell'intestazione del gruppo: il nome del luogo («Distributori di Central
        Street» sotto «Distributore di Central Street (primo)») ripeterebbe il posto nella stessa riga */}
    <td data-etichetta="Negozio"><div className="min-w-0"><Link to={casa} className="touch inline-flex items-center">{o.negozioNome}</Link>{o.negozioTipo !== 'distributore' && o.sedeNome && o.sedeNome !== o.negozioNome && <span className="block testo-12 text-text-secondary">{o.sedeNome}</span>}</div></td>
    <td data-etichetta="Costo"><CostoDellOggetto costo={o.costo} prezzo={o.prezzo} prezzoPerFascia={o.prezzoPerFascia} daVerificare={o.costoDaVerificare} />
      {/* revisione della chiusura dell'ondata 5 (B1): l'importo che l'acquisto da qui scala, o la regola dello sconto del negozio */}
      {o.costo === null && <ScontoDellOfferta scontato={o.prezzoScontato} sconto={o.sconto} className="block" />}<NoteStoricheOfferta note={o.noteStoriche} onLegamiCambiati={onCambiata} /></td>
    <td data-etichetta="Oggi"><div className="flex flex-col items-start gap-1">
      {/* «Disponibile oggi» dice già che si può comprare: «Aperto adesso» accanto non aggiungerebbe niente */}
      {o.disponibileOggi !== true && <span className="testo-12 text-text-secondary">{o.presenza === null ? 'Attiva una partita per la presenza' : o.presenza.stato === 'disponibile' ? 'Aperto adesso' : 'Presenza: vedi requisiti'}</span>}
      {o.disponibileOggi === true && <span className="chip chip--attivo">Disponibile oggi</span>}
      <ChipDisponibilita disponibilita={o.disponibilita ?? undefined} compatto />
      {(requisiti.length > 0 || o.condizioni.length > 0 || o.nota) && <details className="w-full testo-12">
        <summary className="touch">Requisiti e note</summary>
        {requisiti.length ? <ul className="m-0 pl-4">{requisiti.map((r, i) => <li key={i}>{r.testo}{r.dettaglio ? ` — ${r.dettaglio}` : ''}</li>)}</ul>
          : o.condizioni.length > 0 && <ul className="m-0 pl-4">{o.condizioni.map((r, i) => <li key={i}>{r.tipo === 'avviso' ? descriviRequisitoSpillo(r) : r.testo}</li>)}</ul>}
        {o.nota && <p className="m-0 whitespace-pre-line">{o.nota}</p>}
      </details>}
    </div></td>
    {partitaId !== null && <td data-etichetta="Acquisto"><AcquistiOfferta articolo={o.articolo} nome={nome}
      partitaId={partitaId} acquisti={o.acquisti} onRileggi={onCambiata}
      registrati={o.acquistiRegistrati} occupato={occupato}
      bloccato={o.disponibilita !== null && o.disponibilita.stato !== 'disponibile'} onCambia={(chiave, fatto) => void cambia(chiave, fatto)}
      rifornimento={o.rifornimento} scorta={o.scorta} onAnnullaRiga={(id) => void annullaRiga(id)} onTogliSegno={(k) => void togliSegno(k)} />
      {occupato && <span role="status" className="testo-12 text-text-muted">Salvataggio…</span>}</td>}
  </tr>;
}

/** Le offerte per quartiere (null: chi non ha una sede) e, dentro il quartiere, quelle dello stesso luogo vicine; altrimenti vale l'ordine del listino. */
function perQuartiere(offerte: OffertaOggettoDto[]): Array<{ quartiere: string | null; offerte: OffertaOggettoDto[] }> {
  const gruppi = new Map<string | null, Map<string | null, OffertaOggettoDto[]>>();
  for (const o of offerte) {
    const sedi = gruppi.get(o.quartiereNome) ?? new Map<string | null, OffertaOggettoDto[]>();
    sedi.set(o.sedeChiave, [...(sedi.get(o.sedeChiave) ?? []), o]);
    gruppi.set(o.quartiereNome, sedi);
  }
  return [...gruppi].map(([quartiere, sedi]) => ({ quartiere, offerte: [...sedi.values()].flat() }));
}

/** Una riga per punto vendita: ogni macchina ha la sua scorta e i suoi acquisti, quindi quelle dello stesso posto restano righe distinte sotto il loro quartiere. */
export function OfferteDellOggetto({ offerte, nome, partitaId, onCambiata }: { offerte: OffertaOggettoDto[]; nome: string; partitaId: number | null; onCambiata: () => void | Promise<void> }) {
  if (!offerte.length) return <p className="m-0 testo-13 text-text-secondary">Nessun negozio collegato. Consulta anche dove si trova.</p>;
  return <div className="min-w-0"><table className="tabella tabella--adattiva w-full testo-13">
    <thead><tr><th>Negozio</th><th>Costo</th><th>Oggi</th>{partitaId !== null && <th>Acquisto</th>}</tr></thead>
    {perQuartiere(offerte).map((g) => <tbody key={g.quartiere ?? ''}>
      {g.quartiere !== null && <tr><th scope="rowgroup" colSpan={partitaId !== null ? 4 : 3} className="static whitespace-normal border-b-0 bg-transparent font-semibold text-text-secondary">{g.quartiere}</th></tr>}
      {g.offerte.map((o) => <Offerta key={`${partitaId}:${o.articolo}:${o.sedeChiave}`} offerta={o} nome={nome} partitaId={partitaId} onCambiata={onCambiata} />)}
    </tbody>)}
  </table></div>;
}
