import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaAcquisto } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_CATEGORIA_ARTICOLO } from '../../utils/negozi';
import type { ArticoloDto } from '../../types';
import { ChipDisponibilita } from './ChipDisponibilita';

interface Props {
  articoli: ArticoloDto[];
  partitaId: number | null;
  mostraNegozio?: boolean;
  onCambiato: (a: ArticoloDto) => void;
  onModifica?: (a: ArticoloDto) => void;
}

function Prodotto({ a, partitaId, mostraNegozio, onCambiato, onModifica }: Omit<Props, 'articoli'> & { a: ArticoloDto }) {
  const [occupato, setOccupato] = useState(false);
  const nome = a.nomeIt ?? a.nome;
  const acquistoBloccato = a.disponibilita?.stato === 'bloccato' && !a.acquistato;
  const cambia = async (fatto: boolean) => {
    setOccupato(true);
    try { onCambiato(await impostaAcquisto(partitaId!, a.chiave, fatto)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupato(false); }
  };
  return <li className={`catalogo-prodotto${a.acquistato ? ' catalogo-prodotto--acquistato' : ''}`}>
    <div className="catalogo-prodotto__nome">
      <strong className={a.acquistato ? 'line-through' : ''}>{nome}</strong>
      <span className="catalogo-prodotto__meta">{NOME_CATEGORIA_ARTICOLO[a.categoria] ?? a.categoria}{a.per && <> · <span>{a.per}</span></>}</span>
      {a.statistiche && <span className="text-text-secondary">{a.statistiche}</span>}
      {mostraNegozio && <Link to={`/guida/mondo/articolo/${encodeURIComponent(a.chiave)}`}>{a.negozioNome}</Link>}
    </div>
    <div className="catalogo-prodotto__prezzo"><span className="catalogo-prodotto__etichetta">Prezzo</span><strong>{a.prezzo !== null ? `${a.prezzo.toLocaleString('it-IT')} ¥` : 'Non indicato'}</strong></div>
    {/* La colonna dice **se si può comprare**, e basta: c'era anche «2 requisiti · apri
        Dettagli», che è un'istruzione scritta a mano dove serve un comando. Il numero è finito
        dov'è il suo posto, cioè sulla riga dei Dettagli, che i requisiti li elenca davvero. */}
    <div className="catalogo-prodotto__disponibilita"><ChipDisponibilita disponibilita={a.disponibilita} compatto />{!a.condizioni && a.disponibileDal && <span>{a.disponibileDal}</span>}{a.condizioni?.length === 0 && <span>Nessun requisito</span>}</div>
    <div className="catalogo-prodotto__azioni">
      {/* Una cosa sola: la spunta. «Non ancora acquistabile» stava sia qui sia nella pastiglia
          accanto, e la stessa frase due volte sulla stessa riga sembra due informazioni. */}
      {partitaId && <label className="touch flex items-center gap-2" title={acquistoBloccato ? 'Non ancora acquistabile: mancano dei requisiti' : undefined}><input type="checkbox" className="w-5 h-5" checked={a.acquistato} disabled={occupato || acquistoBloccato} onChange={e => void cambia(e.target.checked)} aria-label={`${nome} acquistato`} />Acquistato</label>}
      {onModifica && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => onModifica(a)} aria-label={`Correggi ${nome}`}>Modifica</button>}
    </div>
    <details className="catalogo-prodotto__dettagli">
      <summary className="touch">Dettagli{a.condizioni?.length ? ` · ${a.condizioni.length} ${a.condizioni.length === 1 ? 'requisito' : 'requisiti'}` : ''}{!a.verificato ? ' · fonte secondaria' : ''}</summary>
      <dl>
        {a.nomeIt && a.nomeIt !== a.nome && <><dt>Nome originale</dt><dd>{a.nome}</dd></>}
        <dt>Disponibilità</dt><dd>{a.disponibilita?.requisiti.length ? <ul>{a.disponibilita.requisiti.map((r,i)=><li key={i}>{r.testo} — {r.dettaglio}</li>)}</ul> : a.condizioni?.length ? <ul>{a.condizioni.map((r,i)=><li key={i}>{r.testo}</li>)}</ul> : 'Nessun requisito'}</dd>
        <dt>Effetto</dt><dd>{a.effetto || 'Non indicato'}</dd>
        {a.condizione && <><dt>Nota originale della guida</dt><dd>{a.condizione}</dd></>}
        {a.nota && <><dt>Nota</dt><dd>{a.nota}</dd></>}
        {a.fonte && <><dt>Fonte</dt><dd>{/^https?:\/\//i.test(a.fonte) ? <a href={a.fonte} target="_blank" rel="noreferrer">Consulta la fonte</a> : a.fonte}</dd></>}
      </dl>
    </details>
  </li>;
}

/** Un solo albero accessibile: righe su desktop, schede su tablet/mobile secondo lo spazio effettivo. */
export function ArticoliTabella({ articoli, ...props }: Props) {
  if (articoli.length === 0) return <p>Nessun articolo con questi filtri.</p>;
  return <div className="catalogo-prodotti"><ul aria-label="Prodotti del catalogo">{articoli.map(a => <Prodotto key={a.chiave} a={a} {...props} />)}</ul></div>;
}
