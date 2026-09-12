// ============================================================
// ObiettiviDedalo — timbri e richieste di un dedalo dei Memento: il contatore e le spunte
// ============================================================
//
// La percentuale dei Memento conta gli obiettivi dei dedali: i timbri dichiarati dalla guida più
// le richieste. Qui si segnano: i timbri con «−» e «+» (bersagli da 44 px, «su N»), le richieste
// con Accettata / Completata / Riapri. Dove la guida non dichiara i timbri lo si dice, senza
// contatore: non c'è un totale da raggiungere.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaStatoRichiesta, impostaTimbri } from '../../services/api/partite';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { DedaloDto, StatoRichiesta } from '../../types';

interface Props {
  areaChiave: string;
  areaNome: string;
  dedalo: DedaloDto;
  partitaId: number | null;
  onTimbri: (raccolti: number) => void;
  onRichiesta: (chiave: string, stato: StatoRichiesta | null) => void;
}

export function ObiettiviDedalo({ areaChiave, areaNome, dedalo, partitaId, onTimbri, onRichiesta }: Props) {
  // Chi è in volo: i timbri o una richiesta; gli altri pulsanti restano vivi.
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const occupa = (k: string, v: boolean) => setOccupati((o) => ({ ...o, [k]: v }));
  const { timbri, richieste, obiettivi } = dedalo;
  const raccolti = timbri.raccolti ?? 0;
  const cambiaTimbri = async (n: number) => {
    if (!partitaId || timbri.totale === null) return;
    const valore = Math.min(Math.max(n, 0), timbri.totale);
    if (valore === raccolti) return;
    occupa('timbri', true);
    try { const r = await impostaTimbri(partitaId, areaChiave, valore); onTimbri(r.raccolti); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { occupa('timbri', false); }
  };
  const cambiaRichiesta = async (chiave: string, stato: StatoRichiesta | null) => {
    if (!partitaId) return;
    occupa(chiave, true);
    try { const r = await impostaStatoRichiesta(partitaId, chiave, stato); onRichiesta(chiave, r.stato); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { occupa(chiave, false); }
  };
  const fatti = obiettivi.fatti ?? 0;
  return (
    <div className="flex flex-col gap-2" aria-label={`Obiettivi di ${areaNome}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">Obiettivi del dedalo</h3>
        <span className="text-[11px] tabular-nums text-text-muted">{partitaId ? `${fatti}/${obiettivi.totale}` : `${obiettivi.totale} in tutto`}</span>
      </div>
      {obiettivi.totale === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">La guida non dichiara obiettivi misurabili per questo dedalo.</p>}
      {partitaId && obiettivi.totale > 0 && <div className="flex items-center gap-2">
        <span className="visore-mappa__progresso h-1.5 flex-1" role="progressbar" aria-label={`Obiettivi di ${areaNome}`} aria-valuemin={0} aria-valuemax={obiettivi.totale} aria-valuenow={fatti}>
          <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((fatti / obiettivi.totale) * 100)}%` }} />
        </span>
      </div>}
      <section className="flex flex-col gap-1 rounded-md bg-white/[0.04] px-2 py-1.5" aria-label="Timbri">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <strong>Timbri</strong>
          {timbri.totale === null
            ? <span className="text-[12px] text-text-muted">non dichiarati dalla guida</span>
            : <span className="tabular-nums text-text-secondary">{partitaId ? `${raccolti} su ${timbri.totale}` : `${timbri.totale} da raccogliere`}</span>}
        </div>
        {partitaId && timbri.totale !== null && (
          <div className="flex items-center gap-2" role="group" aria-label={`Timbri raccolti in ${areaNome}`}>
            <button type="button" className="btn btn-ghost touch !px-3" disabled={!!occupati.timbri || raccolti === 0} onClick={() => void cambiaTimbri(raccolti - 1)} aria-label="Togli un timbro">−</button>
            <span className="min-w-[3ch] text-center font-display text-[19px] tabular-nums" aria-live="polite">{raccolti}</span>
            <button type="button" className="btn btn-ghost touch !px-3" disabled={!!occupati.timbri || raccolti >= timbri.totale} onClick={() => void cambiaTimbri(raccolti + 1)} aria-label="Aggiungi un timbro">+</button>
            <span className="text-[12px] text-text-muted">su {timbri.totale}</span>
          </div>
        )}
      </section>
      <section className="flex flex-col gap-1" aria-label="Richieste del dedalo">
        <strong className="text-[13px]">Richieste · {richieste.length}</strong>
        {richieste.length === 0 && <span className="text-[12px] text-text-muted">Nessuna richiesta in questo dedalo.</span>}
        <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
          {richieste.map((r) => (
            <li key={r.chiave} className={`flex flex-col gap-1 py-1.5 text-[13px] ${r.stato === 'completata' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/guida/richieste?dedalo=${encodeURIComponent(areaChiave)}`} className={`touch inline-flex items-center min-w-0 flex-1 ${r.stato === 'completata' ? 'line-through' : ''}`}>{r.nome}</Link>
                {r.stato && <span className={`chip shrink-0 text-[11px] ${r.stato === 'completata' ? '' : 'chip--attivo'}`}>{r.stato}</span>}
              </div>
              {partitaId && (
                <div className="flex flex-wrap gap-1.5">
                  {r.stato !== 'accettata' && r.stato !== 'completata' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Accettata" disabled={!!occupati[r.chiave]} onClick={() => void cambiaRichiesta(r.chiave, 'accettata')} />}
                  {r.stato !== 'completata' && <button type="button" className="btn btn-primary btn-sm touch" disabled={!!occupati[r.chiave]} onClick={() => void cambiaRichiesta(r.chiave, 'completata')}>Completata</button>}
                  {r.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" disabled={!!occupati[r.chiave]} onClick={() => void cambiaRichiesta(r.chiave, null)} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
