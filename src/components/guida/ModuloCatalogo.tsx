import { CondizioniEditor } from './CondizioniEditor';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
// ============================================================
// ModuloCatalogo — aggiungere o correggere negozi e articoli dall'interfaccia (Fase 16.1)
// ============================================================
//
// Quello che aggiungi resta anche quando i dati della guida vengono aggiornati: la riga è marcata come tua.
// Correggendo una riga della guida, l'originale viene conservato e «Ripristina» lo rimette.
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getQuartieri } from '../../services/api/compendio';
import { useState } from 'react';
import { aggiornaElementoCatalogo, creaElementoCatalogo, eliminaElementoCatalogo, nascondiElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO } from '../../utils/negozi';
import type { ElementoCatalogoDto, TipoCatalogo } from '../../types';

interface Campo {
  nome: string;
  etichetta: string;
  tipo: 'testo' | 'testolungo' | 'numero' | 'select';
  opzioni?: Record<string, string>;
  aiuto?: string;
}

/** Campi mostrati dal modulo, nell'ordine: gli stessi che l'API accetta. */
const CAMPI: Record<TipoCatalogo, Campo[]> = {
  negozio: [
    { nome: 'nome', etichetta: 'Nome del negozio', tipo: 'testo' },
    { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', opzioni: NOME_TIPO_NEGOZIO },
    { nome: 'luogo_chiave', etichetta: 'Quartiere', tipo: 'select' },
    { nome: 'luogo', etichetta: 'Posizione nel quartiere', tipo: 'testo', aiuto: 'Per esempio: vicino alla stazione. Il quartiere si sceglie nel campo sopra.' },
    { nome: 'gestore', etichetta: 'Chi lo gestisce', tipo: 'testo' },
    { nome: 'orari', etichetta: 'Orari', tipo: 'testo' },
    { nome: 'note', etichetta: 'Note', tipo: 'testolungo' },
    { nome: 'fonte', etichetta: 'Fonte', tipo: 'testo', aiuto: 'Indirizzo della pagina da cui hai preso i dati' },
  ],
  articolo: [
    { nome: 'nome', etichetta: 'Nome dell\'articolo', tipo: 'testo' },
    { nome: 'categoria', etichetta: 'Categoria', tipo: 'select', opzioni: NOME_CATEGORIA_ARTICOLO },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero' },
    { nome: 'per', etichetta: 'Per chi', tipo: 'testo', aiuto: 'Nome del personaggio, «tutti» o «party»' },
    { nome: 'effetto', etichetta: 'Effetto', tipo: 'testo' },
    { nome: 'statistiche', etichetta: 'Statistiche', tipo: 'testo' },
    { nome: 'nota', etichetta: 'Nota', tipo: 'testolungo' },
    { nome: 'fonte', etichetta: 'Fonte', tipo: 'testo' },
  ],
};

interface Props {
  tipo: TipoCatalogo;
  /** Presente = modifica di una riga esistente; assente = creazione. */
  elemento?: ElementoCatalogoDto | null;
  /** Per un articolo nuovo: il negozio a cui appartiene. */
  negozioChiave?: string;
  onChiudi: () => void;
  onSalvato: () => void;
}

export function ModuloCatalogo({ tipo, elemento, negozioChiave, onChiudi, onSalvato }: Props) {
  const quartieri = useCarica(() => tipo === 'negozio' ? getQuartieri() : Promise.resolve([]), [tipo]);
  const iniziali = () => {
    const v: Record<string, string> = {};
    for (const c of CAMPI[tipo]) {
      const valore = elemento?.dati[c.nome];
      v[c.nome] = valore === null || valore === undefined ? (c.tipo === 'select' && c.nome !== 'luogo_chiave' ? 'altro' : '') : String(valore);
    }
    return v;
  };
  const [valori, setValori] = useState<Record<string, string>>(iniziali);
  const [condizioni,setCondizioni]=useState<RequisitoSpillo[]>(()=>JSON.parse(String(elemento?.dati.condizioni_json ?? '[]')));
  const regoleValide=condizioni.every(c=>normalizzaRequisitoSpillo(c)!==null);
  const [occupato, setOccupato] = useState(false);
  const nuovo = !elemento;

  const salva = async () => {
    setOccupato(true);
    try {
      const dati: Record<string, unknown> = { condizioni_json: condizioni };
      for (const c of CAMPI[tipo]) {
        const grezzo = valori[c.nome]?.trim() ?? '';
        if (c.tipo === 'numero') dati[c.nome] = grezzo === '' ? null : Number(grezzo);
        else dati[c.nome] = grezzo === '' ? (['nome', 'luogo', 'fonte'].includes(c.nome) ? '' : null) : grezzo;
      }
      if (tipo === 'articolo' && nuovo) dati.negozio_chiave = negozioChiave;
      if (nuovo) {
        const e = await creaElementoCatalogo(tipo, dati);
        notifica('success', `${tipo === 'negozio' ? 'Negozio' : 'Articolo'} «${e.nome}» aggiunto: resta anche quando i dati della guida vengono aggiornati.`);
      } else {
        await aggiornaElementoCatalogo(tipo, elemento.chiave, dati);
        notifica('success', `${tipo === 'negozio' ? 'Negozio' : 'Articolo'} corretto: «Ripristina» rimette i dati della guida.`);
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
      notifica('success', elemento.nascosta ? 'Di nuovo visibile.' : 'Nascosto: resta nei dati ma non compare più negli elenchi.');
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const titolo = nuovo
    ? (tipo === 'negozio' ? 'Nuovo negozio' : 'Nuovo articolo')
    : `${tipo === 'negozio' ? 'Negozio' : 'Articolo'}: ${elemento.nome}`;

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
          <button type="button" className="btn btn-primary" disabled={occupato || !regoleValide || !valori.nome?.trim()} onClick={() => void salva()}>Salva</button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {!nuovo && (
          <p className="m-0 text-[12px] text-text-muted">
            {elemento.origine === 'utente' && !elemento.modificata && 'Riga aggiunta da te.'}
            {elemento.modificata && 'Riga della guida corretta da te: «Ripristina dalla guida» rimette i dati originali.'}
            {elemento.origine === 'seed' && !elemento.modificata && 'Riga dei dati della guida: salvando, la correzione resterà anche dopo gli aggiornamenti.'}
            {elemento.nascosta && ' Attualmente nascosta.'}
          </p>
        )}
        {tipo === 'negozio' && quartieri.errore && <p role="alert">Impossibile caricare i quartieri. <button type="button" className="btn touch" onClick={() => void quartieri.ricarica()}>Riprova</button></p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CAMPI[tipo].map((c) => (
            <label key={c.nome} className={`editor-mappa__campo ${c.tipo === 'testolungo' ? 'sm:col-span-2' : ''}`}>
              {c.etichetta}
              {c.tipo === 'select' ? (
                <select className="form-input" value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })}>
                  {c.nome === 'luogo_chiave' && <option value="">Nessun quartiere (online, ambulante o da assegnare)</option>}
                  {c.nome === 'luogo_chiave' && valori.luogo_chiave && !quartieri.dati?.some(q => q.chiave === valori.luogo_chiave) && <option value={valori.luogo_chiave}>{valori.luogo_chiave}</option>}
                  {Object.entries(c.nome === 'luogo_chiave' ? Object.fromEntries((quartieri.dati ?? []).map(q => [q.chiave, q.nome])) : c.opzioni ?? {}).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              ) : c.tipo === 'testolungo' ? (
                <textarea className="form-input" rows={2} value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })} maxLength={2000} />
              ) : (
                <input className="form-input" type={c.tipo === 'numero' ? 'number' : 'text'} min={c.tipo === 'numero' ? 0 : undefined} value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })} maxLength={400} />
              )}
              {c.aiuto && <span className="text-[11px] text-text-muted">{c.aiuto}</span>}
            </label>
          ))}
        </div>
        <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={occupato}/>
        {!regoleValide&&<p role="alert">Completa o rimuovi i gruppi vuoti prima di salvare.</p>}
        {!nuovo && elemento.origine === 'seed' && (
          <div className="flex justify-end">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={elemento.nascosta ? 'sbloccato' : 'bloccato'} dimensione={20} />} titolo={elemento.nascosta ? 'Mostra di nuovo' : 'Nascondi dagli elenchi'} disabled={occupato} onClick={() => void nascondi()} />
          </div>
        )}
      </div>
    </Modal>
  );
}
