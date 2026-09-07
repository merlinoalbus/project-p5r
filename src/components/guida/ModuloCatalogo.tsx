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
import { NOME_DOTE } from '../../utils/citta';
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
  libro: [
    { nome: 'nome', etichetta: 'Titolo del libro', tipo: 'testo' },
    { nome: 'nome_it', etichetta: 'Titolo italiano', tipo: 'testo', aiuto: 'Solo se diverso dal titolo qui sopra' },
    { nome: 'dove', etichetta: 'Dove si trova', tipo: 'testo', aiuto: 'Per esempio: Libreria Taiheido (Shibuya)' },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero', aiuto: 'Vuoto o 0 se è gratis' },
    { nome: 'disponibile_dal', etichetta: 'Disponibile dal', tipo: 'testo', aiuto: 'La data come la scrive la guida: «dal 18 aprile»' },
    { nome: 'dote', etichetta: 'Dote che alza', tipo: 'select', opzioni: NOME_DOTE, aiuto: 'Campo che l’app usa: diventa punti veri quando spunti la lettura nella guida giorno per giorno' },
    { nome: 'note', etichetta: 'Note della Dote (1-3)', tipo: 'numero', aiuto: 'Quante ♪ dà: è il numero, non un testo. Con la Dote qui sopra fa i punti (♪ = 2, ♪♪ = 3, ♪♪♪ = 5, e 7 per un libro)' },
    { nome: 'sessioni', etichetta: 'Sessioni di lettura', tipo: 'numero', aiuto: 'Quante volte va letto per finirlo' },
    { nome: 'sblocca', etichetta: 'Che cosa sblocca', tipo: 'testo', aiuto: 'Testo per te. Perché l’app lo sappia davvero, scrivi la regola in «Condizioni» qui sotto' },
    { nome: 'dettagli', etichetta: 'Dettagli', tipo: 'testolungo' },
    { nome: 'fonte', etichetta: 'Fonte', tipo: 'testo' },
  ],
  film: [
    { nome: 'nome', etichetta: 'Titolo del film', tipo: 'testo' },
    { nome: 'nome_it', etichetta: 'Titolo italiano', tipo: 'testo', aiuto: 'Solo se diverso dal titolo qui sopra' },
    { nome: 'dove', etichetta: 'Dove si vede', tipo: 'select', opzioni: { cinema: 'Al cinema', dvd: 'In DVD' } },
    { nome: 'periodo', etichetta: 'Periodo', tipo: 'testo', aiuto: 'Quando è in programmazione: «dal 24 aprile», «Maggio-Giugno»' },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero' },
    { nome: 'dote', etichetta: 'Dote che alza', tipo: 'select', opzioni: NOME_DOTE, aiuto: 'Campo che l’app usa: diventa punti veri quando spunti la visione nella guida giorno per giorno' },
    { nome: 'note', etichetta: 'Note della Dote (1-3)', tipo: 'numero', aiuto: 'Quante ♪ dà. Con «Anima da cineasta» letto, film e DVD salgono di uno scalino' },
    { nome: 'sessioni', etichetta: 'Visioni per completarlo', tipo: 'numero', aiuto: 'Un film al cinema 1, un DVD 2' },
    { nome: 'dettagli', etichetta: 'Dettagli', tipo: 'testolungo' },
    { nome: 'fonte', etichetta: 'Fonte', tipo: 'testo' },
  ],
  attivita: [
    { nome: 'nome', etichetta: 'Nome dell’attività', tipo: 'testo' },
    { nome: 'tipo', etichetta: 'Tipo', tipo: 'testo', aiuto: 'Per esempio: minigioco, lavoro, videogioco, studio' },
    { nome: 'luogo_chiave', etichetta: 'Quartiere', tipo: 'select' },
    { nome: 'luogo', etichetta: 'Dove, per esteso', tipo: 'testo', aiuto: 'Il quartiere si sceglie nel campo sopra' },
    { nome: 'fascia', etichetta: 'Quando', tipo: 'testo', aiuto: 'Per esempio: giorno, sera, festivi' },
    { nome: 'costo', etichetta: 'Costo in yen', tipo: 'numero' },
    { nome: 'paga', etichetta: 'Quanto paga', tipo: 'testo', aiuto: 'Solo per i lavori' },
    { nome: 'sessioni', etichetta: 'Round o sessioni', tipo: 'numero', aiuto: 'Per i videogiochi: quanti round per finirlo' },
    { nome: 'sblocco', etichetta: 'Come si sblocca', tipo: 'testo', aiuto: 'Testo per te. Perché l’app lo valuti davvero, scrivi la regola in «Condizioni» qui sotto' },
    { nome: 'regole', etichetta: 'Regole', tipo: 'testolungo' },
    { nome: 'premi', etichetta: 'Premi', tipo: 'testolungo', aiuto: 'Nota per te: qui «Coraggio +3» resta una frase. Quello che alza una Dote va dichiarato in «Doti alzate»' },
    { nome: 'altri_effetti', etichetta: 'Altri effetti', tipo: 'testolungo' },
    { nome: 'fonte', etichetta: 'Fonte', tipo: 'testo' },
  ],
};

/** Una Dote alzata da un'attività: quale, quante note, e l'eventuale condizione della guida. */
interface DoteAttivita {
  dote: string | null;
  note: number | null;
  condizione?: string | null;
}

/** L'editor delle Doti: righe che si aggiungono e si tolgono, non un campo di testo.
 *
 * Le note (♪) sono l'unità con cui la guida misura quel che un'attività dà, e sono l'unità che il
 * motore sa convertire in punti. Un menu a tendina con tre voci è quindi tutto quel che serve —
 * scriverlo a mano vorrebbe dire riportare il problema al punto di partenza. */
function EditorDoti({ doti, onCambia, disabilitato }: { doti: DoteAttivita[]; onCambia: (d: DoteAttivita[]) => void; disabilitato?: boolean }) {
  const cambia = (i: number, campo: keyof DoteAttivita, valore: string) => {
    const nuove = doti.map((d, j) => (j === i ? { ...d, [campo]: campo === 'note' ? (valore ? Number(valore) : null) : (valore || null) } : d));
    onCambia(nuove);
  };
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Doti alzate</legend>
      <p className="m-0 text-[12px] text-text-muted">
        Quello che scrivi in «Premi» resta una nota per te. Le Doti dichiarate qui invece l’app le
        usa: spuntando l’azione nella guida giorno per giorno, i punti si alzano davvero.
      </p>
      {doti.length === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">Nessuna Dote dichiarata.</p>}
      {doti.map((d, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <label className="editor-mappa__campo min-w-[160px] flex-1">
            Dote
            <select className="form-input" value={d.dote ?? ''} disabled={disabilitato} onChange={(e) => cambia(i, 'dote', e.target.value)}>
              <option value="">Dote variabile</option>
              {Object.entries(NOME_DOTE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <label className="editor-mappa__campo w-[130px]">
            Note
            <select className="form-input" value={d.note ?? ''} disabled={disabilitato} onChange={(e) => cambia(i, 'note', e.target.value)}>
              <option value="">Non indicate</option>
              <option value="1">♪ (1)</option>
              <option value="2">♪♪ (2)</option>
              <option value="3">♪♪♪ (3)</option>
            </select>
          </label>
          <label className="editor-mappa__campo min-w-[200px] flex-[2]">
            Quando (facoltativo)
            <input className="form-input" type="text" maxLength={400} value={d.condizione ?? ''} disabled={disabilitato}
              onChange={(e) => cambia(i, 'condizione', e.target.value)} placeholder="Per esempio: solo completando la sfida" />
          </label>
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato}
            onClick={() => onCambia(doti.filter((_, j) => j !== i))} aria-label={`Togli la Dote ${i + 1}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />}
        titolo="Aggiungi una Dote" disabled={disabilitato} onClick={() => onCambia([...doti, { dote: null, note: null, condizione: null }])} />
    </fieldset>
  );
}

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
  // Il selettore dei quartieri serve ai negozi e alle attivita': tutte e due hanno un `luogo_chiave`.
  const quartieri = useCarica(() => (tipo === 'negozio' || tipo === 'attivita') ? getQuartieri() : Promise.resolve([]), [tipo]);
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
  // Le Doti di un'attività stanno in `doti_json`, che è già una colonna e già un campo accettato
  // dall'API: mancava solo il modo di scriverlo.
  const [doti, setDoti] = useState<DoteAttivita[]>(() => {
    try { return JSON.parse(String(elemento?.dati.doti_json ?? '[]')) as DoteAttivita[]; } catch { return []; }
  });
  const regoleValide=condizioni.every(c=>normalizzaRequisitoSpillo(c)!==null);
  const [occupato, setOccupato] = useState(false);
  const nuovo = !elemento;

  const salva = async () => {
    setOccupato(true);
    try {
      const dati: Record<string, unknown> = { condizioni_json: condizioni };
      // Solo dove la tabella ce l'ha: le righe vuote non si salvano, e una Dote «variabile» senza
      // note non è una dichiarazione, è un buco.
      // L'API vuole l'**elenco**, non la stringa: è lei a serializzarlo (`doti_json` nello schema
      // è un array che si trasforma in JSON). Mandare già la stringa faceva fallire la convalida.
      if (tipo === 'attivita') {
        dati.doti_json = doti
          .filter((d) => d.dote || d.note)
          .map((d) => ({ dote: d.dote ?? null, note: d.note ?? null, condizione: d.condizione?.trim() || null }));
      }
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
        {/* **Le Doti sono il campo che l'app sa usare davvero.** Un premio scritto «Coraggio +3»
            resta una frase che nessuno legge; dichiarata qui, la Dote con le sue note (♪) diventa
            punti veri con la regola del gioco — `puntiDaNote`, scalini 2/3/5, più uno scalino con
            «Anima da cineasta» — nel momento in cui l'azione viene spuntata nella guida giorno per
            giorno. Libri e film il campo l'avevano già; le attività e i videogiochi ce l'hanno in
            tabella (`doti_json`) e il modulo non lo mostrava: si potevano aggiungere senza poter
            dire che cosa alzano. */}
        {tipo === 'attivita' && <EditorDoti doti={doti} onCambia={setDoti} disabilitato={occupato} />}
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
