// ============================================================
// RiepilogoPartita — dati generali della partita attiva (modificabili)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StoricoPartita } from './StoricoPartita';
import { aggiornaPartita } from '../../services/api';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import type { Difficolta, PartitaDto } from '../../types';

const DIFFICOLTA: Array<{ v: Difficolta; l: string }> = [
  { v: 'sicura', l: 'Sicura' },
  { v: 'facile', l: 'Facile' },
  { v: 'normale', l: 'Normale' },
  { v: 'difficile', l: 'Difficile' },
  { v: 'spietata', l: 'Spietata' },
];

interface Props {
  partita: PartitaDto;
}

/** Modulo di modifica: nome, livello del protagonista, data di gioco, difficoltà, NG+, Allarme, note.
 *  Il genitore lo rimonta (prop `key`) quando la partita cambia, così lo stato locale riparte dai dati aggiornati. */
export function RiepilogoPartita({ partita }: Props) {
  const aggiornaLocale = usePartitaStore((s) => s.aggiornaLocale);
  const [nome, setNome] = useState(partita.nome);
  const [livello, setLivello] = useState(partita.livelloProtagonista);
  const [dataGioco, setDataGioco] = useState(partita.dataGioco ?? '');
  const [difficolta, setDifficolta] = useState<Difficolta>(partita.difficolta);
  const [ngPlus, setNgPlus] = useState(partita.nuovaPartitaPlus);
  const [allarme, setAllarme] = useState(partita.allarmeAttivo);
  const [note, setNote] = useState(partita.note);
  const [occupato, setOccupato] = useState(false);

  const salva = async () => {
    setOccupato(true);
    try {
      const p = await aggiornaPartita(partita.id, { nome, livelloProtagonista: livello, dataGioco: dataGioco || null, difficolta, nuovaPartitaPlus: ngPlus, allarmeAttivo: allarme, note });
      aggiornaLocale(p);
      notifica('success', 'Partita aggiornata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  const cambiaAllarme = async (attivo: boolean) => {
    setAllarme(attivo);
    try {
      aggiornaLocale(await aggiornaPartita(partita.id, { allarmeAttivo: attivo }));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <form className="card flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        <label className="form-label">Nome della partita
          <input className="form-input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="form-label">Livello del protagonista
            <input type="number" min={1} max={99} className="form-input mt-1" value={livello} onChange={(e) => setLivello(Number(e.target.value))} />
          </label>
          <label className="form-label">Data di gioco (MM-GG)
            <input className="form-input mt-1" value={dataGioco} onChange={(e) => setDataGioco(e.target.value)} placeholder="es. 04-11" pattern="\d{2}-\d{2}" />
          </label>
          <label className="form-label">Difficoltà
            <select className="form-input mt-1" value={difficolta} onChange={(e) => setDifficolta(e.target.value as Difficolta)}>
              {DIFFICOLTA.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13px] touch">
          <input type="checkbox" checked={ngPlus} onChange={(e) => setNgPlus(e.target.checked)} /> Nuova Partita +
        </label>
        <label className="form-label">Note
          <textarea className="form-input mt-1 min-h-[100px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={occupato}>Salva</button>
        </div>
      </form>
      <div className="flex flex-col gap-3">
        <div className={`card flex flex-col gap-2 ${allarme ? 'border-primary bg-primary-bg' : ''}`}>
          <span className="form-label m-0">Stanza di Velluto</span>
          <div className="text-[13px] text-text-secondary">Segna quando la Stanza è in <strong className="text-text">Allarme</strong>: le fusioni danno più skill e statistiche, ma la ghigliottina può incepparsi.</div>
          <button type="button" className={`btn ${allarme ? 'btn-primary' : 'btn-secondary'}`} onClick={() => void cambiaAllarme(!allarme)}>
            {allarme ? 'Allarme ATTIVO — disattiva' : 'Attiva Allarme'}
          </button>
        </div>
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="form-label m-0">Ultimi eventi</span>
            <Link to="/partita?scheda=storico" className="text-[12px] text-primary">Tutto lo storico</Link>
          </div>
          <StoricoPartita key={partita.updatedAt} partitaId={partita.id} perPagina={5} compatto />
        </div>
        <div className="card text-[13px] text-text-secondary flex flex-col gap-1">
          <span className="form-label m-0">Info</span>
          <span>Creata: {new Date(partita.createdAt).toLocaleString('it-IT')}</span>
          <span>Ultimo aggiornamento: {new Date(partita.updatedAt).toLocaleString('it-IT')}</span>
        </div>
      </div>
    </div>
  );
}
