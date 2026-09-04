// ============================================================
// EseguiFusioneModal — esegue una fusione dalla scorta: anteprima (risultato, livello con bonus, skill ereditabili, tratti) e conferma
// ============================================================

import { useMemo, useState } from 'react';
import { eseguiFusioneScorta, getAnteprimaFusione } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/PageState';
import { ElementoChip } from '../compendio/ElementoChip';
import type { EsitoFusioneScortaDto } from '../../types';
import { PersonaChip } from './PersonaChip';
import { OperatoreRicetta } from './RicettaRiga';

interface Props {
  partitaId: number;
  /** Esemplari posseduti da fondere (due, o tutti gli ingredienti di una ricetta speciale). */
  possedutaIds: number[];
  /** Risultato atteso (obbligatorio per le ricette speciali). */
  risultatoId?: number;
  onChiudi: () => void;
  onEseguita: (esito: EsitoFusioneScortaDto) => void;
}

export function EseguiFusioneModal({ partitaId, possedutaIds, risultatoId, onChiudi, onEseguita }: Props) {
  const anteprima = useCarica(() => getAnteprimaFusione(partitaId, { possedutaIds, risultatoId }), [partitaId, possedutaIds.join(','), risultatoId]);
  const [livello, setLivello] = useState<number | null>(null);
  const [skill, setSkill] = useState<number[]>([]);
  const [tratto, setTratto] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [occupato, setOccupato] = useState(false);
  const a = anteprima.dati;
  const livelloScelto = a ? Math.min(99, Math.max(a.livelloBase, livello ?? a.livelloSuggerito)) : 1;
  const ereditabili = useMemo(() => (a ? a.candidate.filter((c) => c.ereditabile) : []), [a]);
  const nonEreditabili = useMemo(() => (a ? a.candidate.filter((c) => !c.ereditabile) : []), [a]);
  const trattoScelto = tratto ?? a?.tratti[a.tratti.length - 1]?.id ?? null;

  const toggla = (id: number) => setSkill((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < (a?.slotScelti ?? 0) ? [...s, id] : s));

  const esegui = async () => {
    if (!a) return;
    setOccupato(true);
    try {
      const esito = await eseguiFusioneScorta(partitaId, { possedutaIds, risultatoId, skillIds: skill, trattoSkillId: trattoScelto, livello: livelloScelto, note: note || undefined });
      notifica('success', `${esito.risultato.nomeIt} è nella scorta al livello ${esito.risultato.livello}; rimosse: ${esito.rimosse.map((r) => r.nomeIt).join(', ')}.`);
      onEseguita(esito);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Fusione non eseguita.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal titolo="Esegui la fusione dalla scorta" aperta onChiudi={onChiudi}>
      {anteprima.errore && <p className="m-0 text-[13px] text-error">{anteprima.errore}</p>}
      {!a && !anteprima.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {a && (
        <form className="flex flex-col gap-3 text-[13px]" onSubmit={(e) => { e.preventDefault(); void esegui(); }}>
          <div className="flex flex-wrap items-center gap-2">
            {a.ingredienti.map((i, n) => <span key={i.possedutaId} className="ricetta-riga__gruppo"><PersonaChip p={{ id: i.personaId, nome: i.nome, nomeIt: i.nomeIt, livello: i.livello }} suffisso={i.carica ? ' ⚡ carica' : undefined} />{n < a.ingredienti.length - 1 && <OperatoreRicetta tipo="piu" />}</span>)}
            <OperatoreRicetta tipo="risultato" />
            <PersonaChip p={a.risultato} evidenza />
            <span className="text-text-muted">fusione {a.tipo === 'speciale' ? 'speciale' : a.tipo === 'tesoro' ? 'con Demone del Tesoro' : a.tipo === 'stesso-arcano' ? 'stesso arcano' : 'normale'}{a.allarme ? ' · Allarme attivo' : ''}</span>
          </div>
          {a.sopraProtagonista && <p className="m-0 text-warning">Il risultato supera il livello del protagonista: in gioco serve il «Trattamento speciale» delle Gemelle (a pagamento).</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="form-label">Livello di partenza osservato
              <input type="number" min={a.livelloBase} max={99} className="form-input mt-1" value={livelloScelto} onChange={(e) => setLivello(Number(e.target.value) || a.livelloBase)} aria-label="Livello di partenza" />
              <span className="block text-[12px] text-text-muted mt-1">
                Base {a.livelloBase}{a.bonusLivelli.max > 0 ? ` + bonus Confidente ${a.bonusLivelli.min === a.bonusLivelli.max ? `+${a.bonusLivelli.min}` : `+${a.bonusLivelli.min}…+${a.bonusLivelli.max}`} (Matto rango ${a.bonusLivelli.rangoMatto}, ${a.risultato.arcanaNome} rango ${a.bonusLivelli.rangoArcano}; stima)` : ' · nessun bonus del Confidente (rango 0)'}.
                {a.puntiAllarme > 0 && ` Con l'Allarme il gioco aggiunge +${a.puntiAllarme} punti statistica casuali: registrali dopo nella scheda della Persona.`}
              </span>
            </label>
            <label className="form-label">Tratto
              <select className="form-input mt-1" value={trattoScelto ?? ''} onChange={(e) => setTratto(e.target.value ? Number(e.target.value) : null)} aria-label="Tratto">
                {a.tratti.map((t) => <option key={t.id} value={t.id}>{t.nomeIt}{t.da === null ? ' (proprio del risultato)' : ''}</option>)}
              </select>
            </label>
          </div>
          <div>
            <div className="form-label">Skill da ereditare ({skill.length}/{a.slotScelti}{a.allarme ? ', tutti gli slot con l\'Allarme' : ', una la assegna il gioco'})</div>
            {ereditabili.length === 0 && <p className="m-0 text-text-muted">Nessuna skill ereditabile da questi ingredienti.</p>}
            <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5 mt-1" aria-label="Skill ereditabili">
              {ereditabili.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`chip touch ${skill.includes(c.id) ? 'chip--attivo' : ''}`} onClick={() => toggla(c.id)} aria-pressed={skill.includes(c.id)} title={c.giaAppresa ? 'Il risultato la apprende comunque da sé' : c.elementoNome}>
                    {c.nomeIt}{c.giaAppresa ? ' (la apprende da sé)' : ''}
                  </button>
                </li>
              ))}
            </ul>
            {nonEreditabili.length > 0 && (
              <details className="mt-1">
                <summary className="text-text-muted cursor-pointer">{nonEreditabili.length} non ereditabili</summary>
                <ul className="m-0 p-0 list-none flex flex-col gap-0.5 mt-1">
                  {nonEreditabili.map((c) => <li key={c.id} className="flex items-center gap-2"><ElementoChip elemento={c.elemento} nome={c.nomeIt} piccolo /> <span className="text-text-muted">{c.motivo}</span></li>)}
                </ul>
              </details>
            )}
            <p className="m-0 text-[12px] text-text-muted mt-1">Skill innate al livello scelto: {a.skillInnate.map((s) => s.nomeIt).join(', ') || '—'} (le ereditate hanno la precedenza, massimo 8 in tutto).</p>
          </div>
          <label className="form-label">Note
            <input className="form-input mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={occupato}>Esegui: rimuovi gli ingredienti e aggiungi {a.risultato.nomeIt}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
