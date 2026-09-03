// ============================================================
// EseguiForcaModal — registra un'esecuzione alla Forca: livello raggiunto, skill trasferite, incidente con punti statistica
// ============================================================

import { useState } from 'react';
import { eseguiForca } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { CHIAVI_STATISTICHE, NOMI_STATISTICHE } from '../../utils/statistiche';
import { FORCA_INCIDENTE_BONUS } from '../../../shared/bonusVelluto';
import type { EsitoForca } from '../../../shared/bonusVelluto';
import type { EsitoForcaDto, PersonaPossedutaDto } from '../../types';

interface Props {
  partitaId: number;
  ricevente: PersonaPossedutaDto;
  sacrificio: PersonaPossedutaDto;
  /** Esito calcolato (moltiplicatori) da mostrare. */
  stima: Pick<EsitoForca, 'moltiplicatore' | 'fattori' | 'skillTrasferite'>;
  allarme: boolean;
  onChiudi: () => void;
  onEseguita: (esito: EsitoForcaDto) => void;
}

export function EseguiForcaModal({ partitaId, ricevente, sacrificio, stima, allarme, onChiudi, onEseguita }: Props) {
  const [incidente, setIncidente] = useState(false);
  const [nuovoLivello, setNuovoLivello] = useState(ricevente.livello);
  const [trasferite, setTrasferite] = useState<number[]>([]);
  const [rimosse, setRimosse] = useState<number[]>([]);
  const [punti, setPunti] = useState<Record<string, number>>({});
  const [occupato, setOccupato] = useState(false);
  const maxTrasferite = allarme ? 3 : 1;
  const totalePunti = CHIAVI_STATISTICHE.reduce((s, k) => s + (punti[k] ?? 0), 0);
  const skillFinali = ricevente.skill.length - rimosse.length + trasferite.filter((id) => !ricevente.skill.some((s) => s.id === id)).length;
  const daDimenticare = Math.max(0, skillFinali - 8);

  const esegui = async () => {
    setOccupato(true);
    try {
      const esito = await eseguiForca(partitaId, {
        riceventeId: ricevente.id, sacrificioId: sacrificio.id, incidente,
        nuovoLivello: incidente ? undefined : nuovoLivello, skillTrasferiteIds: incidente ? [] : trasferite, skillRimosseIds: rimosse,
        puntiStatistica: totalePunti > 0 ? punti : undefined,
      });
      notifica('success', incidente ? `Incidente registrato: +${totalePunti} punti a ${ricevente.nomeIt}.` : `${sacrificio.nomeIt} sacrificata: ${ricevente.nomeIt} al livello ${esito.ricevente.livello}.`);
      onEseguita(esito);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione non registrata.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal titolo={`Forca: ${sacrificio.nomeIt} → ${ricevente.nomeIt}`} aperta onChiudi={onChiudi}>
      <form className="flex flex-col gap-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); void esegui(); }}>
        <p className="m-0 text-text-secondary">
          EXP stimata ×{stima.moltiplicatore.toLocaleString('it-IT')} ({stima.fattori.length ? stima.fattori.map((f) => `${f.nome} ×${f.valore.toLocaleString('it-IT')}`).join(' · ') : 'nessun bonus'}). Il gioco mostra il livello raggiunto: riportalo qui. Skill trasferibili: {stima.skillTrasferite}.
        </p>
        <label className="flex items-center gap-2 touch">
          <input type="checkbox" checked={incidente} onChange={(e) => setIncidente(e.target.checked)} /> Incidente (nessuna EXP, punti statistica garantiti: +{FORCA_INCIDENTE_BONUS.sacrificioNormale} normale, +{FORCA_INCIDENTE_BONUS.unaPersonaCarica} con Persona «gialla», +{FORCA_INCIDENTE_BONUS.entrambeCariche} con due)
        </label>
        {!incidente && (
          <>
            <label className="form-label">Livello raggiunto da {ricevente.nomeIt}
              <input type="number" min={ricevente.livello} max={99} className="form-input mt-1" value={nuovoLivello} onChange={(e) => setNuovoLivello(Math.min(99, Math.max(ricevente.livello, Number(e.target.value) || ricevente.livello)))} aria-label="Livello raggiunto" />
              <span className="block text-[12px] text-text-muted mt-1">Ogni livello vale +3 punti statistica (ripartizione casuale): se vuoi registrarla, indica i punti qui sotto.</span>
            </label>
            <div>
              <div className="form-label">Skill trasferite dal sacrificio ({trasferite.length}/{maxTrasferite})</div>
              <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5 mt-1" aria-label="Skill del sacrificio">
                {sacrificio.skill.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={`chip touch ${trasferite.includes(s.id) ? 'chip--attivo' : ''}`} aria-pressed={trasferite.includes(s.id)} onClick={() => setTrasferite((t) => (t.includes(s.id) ? t.filter((x) => x !== s.id) : t.length < maxTrasferite ? [...t, s.id] : t))}>{s.nomeIt}</button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        <div>
          <div className="form-label">Punti statistica {incidente ? 'garantiti' : 'osservati'} (totale {totalePunti})</div>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {CHIAVI_STATISTICHE.map((k) => (
              <label key={k} className="text-[12px] flex flex-col gap-1">{NOMI_STATISTICHE[k]}
                <input type="number" min={0} max={99} className="form-input" value={punti[k] ?? 0} onChange={(e) => setPunti((p) => ({ ...p, [k]: Math.max(0, Number(e.target.value) || 0) }))} aria-label={`Punti ${NOMI_STATISTICHE[k]}`} />
              </label>
            ))}
          </div>
        </div>
        {daDimenticare > 0 && (
          <div>
            <div className="form-label text-warning">Scegli {daDimenticare} skill da dimenticare (massimo 8)</div>
            <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5 mt-1" aria-label="Skill del ricevente">
              {ricevente.skill.map((s) => (
                <li key={s.id}><button type="button" className={`chip touch ${rimosse.includes(s.id) ? 'chip--attivo' : ''}`} aria-pressed={rimosse.includes(s.id)} onClick={() => setRimosse((r) => (r.includes(s.id) ? r.filter((x) => x !== s.id) : [...r, s.id]))}>{s.nomeIt}</button></li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={occupato || daDimenticare > 0 || (incidente && totalePunti === 0)}>Registra: rimuovi {sacrificio.nomeIt}</button>
        </div>
      </form>
    </Modal>
  );
}
