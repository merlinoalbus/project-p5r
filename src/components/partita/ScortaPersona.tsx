// ============================================================
// ScortaPersona — Persona possedute nella partita: aggiunta, livello, skill, statistiche, rimozione
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaPosseduta, aggiungiPosseduta, getPersone, getPossedute, getSkills, isApiError, rimuoviPosseduta } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState, EmptyState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { CampoRicerca } from '../shared/CampoRicerca';
import { ElementoChip } from '../compendio/ElementoChip';
import { StatisticheBarre } from '../compendio/StatisticheBarre';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { statistichePerLivello } from '../../../shared/statistiche';
import type { PersonaPossedutaDto, StatisticheDto } from '../../types';
import { ORDINE_STATISTICHE, SIGLA_STATISTICA } from '../../utils/elementi';

interface Props {
  partitaId: number;
}

/** Scorta della partita con modifica di livello, statistiche potenziate e skill conosciute. */
export function ScortaPersona({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getPossedute(partitaId), [partitaId]);
  const [aggiunta, setAggiunta] = useState(false);
  const [modifica, setModifica] = useState<PersonaPossedutaDto | null>(null);

  const rimuovi = async (p: PersonaPossedutaDto) => {
    if (!dati || !window.confirm(`Rimuovere ${p.nome} dalla scorta? Resta registrata nel compendio.`)) return;
    try {
      await rimuoviPosseduta(partitaId, p.id);
      imposta(dati.filter((x) => x.id !== p.id));
      notifica('info', `${p.nome} rimossa dalla scorta.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    }
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <span className="text-[13px] text-text-muted">{dati?.length ?? 0} Persona in scorta</span>
        <button type="button" className="btn btn-primary" onClick={() => setAggiunta(true)}>+ Aggiungi Persona</button>
      </div>
      {dati && dati.length === 0 ? (
        <EmptyState illustrazione="vuoto-persona" title="La scorta è vuota" hint="Aggiungi le Persona che possiedi nel gioco: livello, skill e statistiche vengono precompilati dal compendio." />
      ) : (
        <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 xl:grid-cols-2">
          {dati?.map((p) => (
            <li key={p.id} className="card flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nome} dimensione={64} />
                <span className="w-11 h-11 rounded-md bg-bg-tertiary flex items-center justify-center font-bold text-primary" title="Livello">{p.livello}</span>
                <Link to={`/compendio/persona/${p.personaId}`} className="font-semibold text-[15px] no-underline text-text hover:text-primary">{p.nome}</Link>
                <span className="chip">{p.arcanaNome}</span>
                {!p.inSquadra && <span className="chip">In deposito</span>}
                {!p.statisticheBase && <span className="chip chip--attivo">Potenziata</span>}
                <span className="flex-1" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModifica(p)}>Modifica</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => void rimuovi(p)}>Rimuovi</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.skill.map((s) => (
                  <Link key={s.slot} to={`/skill/${s.id}`} className="no-underline" title={s.effettoNome}>
                    <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo />
                  </Link>
                ))}
              </div>
              {p.tratto && <div className="text-[12px] text-text-secondary">Tratto: <strong className="text-text">{p.tratto.nomeIt}</strong> — {p.tratto.effettoNome}</div>}
              <details className="text-[13px]">
                <summary className="cursor-pointer text-text-secondary touch flex items-center">Statistiche al livello {p.livello} {p.statisticheBase ? '(stimate)' : '(registrate)'}</summary>
                <div className="pt-2"><StatisticheBarre statistiche={p.statistiche} base={p.statisticheBaseLivello} compatta /></div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <AggiungiPersonaModal
        aperta={aggiunta}
        onChiudi={() => setAggiunta(false)}
        onAggiunta={(p) => { imposta([p, ...(dati ?? [])]); setAggiunta(false); }}
        partitaId={partitaId}
      />
      {modifica && (
        <ModificaPossedutaModal
          posseduta={modifica}
          partitaId={partitaId}
          onChiudi={() => setModifica(null)}
          onSalvata={(p) => { imposta((dati ?? []).map((x) => (x.id === p.id ? p : x))); setModifica(null); }}
        />
      )}
    </PageState>
  );
}

// ---- Modale: aggiunta dal compendio ----

function AggiungiPersonaModal({ aperta, onChiudi, onAggiunta, partitaId }: { aperta: boolean; onChiudi: () => void; onAggiunta: (p: PersonaPossedutaDto) => void; partitaId: number }) {
  const { dati } = useCarica(() => (aperta ? getPersone() : Promise.resolve([])), [aperta]);
  const [q, setQ] = useState('');
  const [occupato, setOccupato] = useState<number | null>(null);
  const filtrate = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return (dati ?? []).filter((p) => !p.rara && (!testo || p.nome.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))).slice(0, 40);
  }, [dati, q]);

  const aggiungi = async (personaId: number, nome: string) => {
    setOccupato(personaId);
    try {
      const p = await aggiungiPosseduta(partitaId, personaId);
      notifica('success', `${nome} aggiunta alla scorta.`);
      onAggiunta(p);
    } catch (err) {
      if (isApiError(err, 'persona-gia-posseduta')) notifica('warning', `${nome} è già nella scorta.`);
      else notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(null);
    }
  };

  return (
    <Modal titolo="Aggiungi Persona alla scorta" aperta={aperta} onChiudi={onChiudi}>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca nel compendio…" autoFocus />
      <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light max-h-[50vh] overflow-y-auto">
        {filtrate.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <span className="w-9 text-right text-[12px] text-text-muted">Liv. {p.livello}</span>
            <span className="font-semibold flex-1">{p.nome}</span>
            <span className="chip">{p.arcanaNome}</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={occupato === p.id} onClick={() => void aggiungi(p.id, p.nome)}>Aggiungi</button>
          </li>
        ))}
        {dati && filtrate.length === 0 && <li className="py-3 text-[13px] text-text-muted">Nessuna Persona trovata.</li>}
      </ul>
    </Modal>
  );
}

// ---- Modale: modifica livello, statistiche, skill, squadra, note ----

function ModificaPossedutaModal({ posseduta, partitaId, onChiudi, onSalvata }: { posseduta: PersonaPossedutaDto; partitaId: number; onChiudi: () => void; onSalvata: (p: PersonaPossedutaDto) => void }) {
  const { dati: tutteSkill } = useCarica(() => getSkills(), []);
  const [livello, setLivello] = useState(posseduta.livello);
  const [inSquadra, setInSquadra] = useState(posseduta.inSquadra);
  const [note, setNote] = useState(posseduta.note);
  const [potenziata, setPotenziata] = useState(!posseduta.statisticheBase);
  const [statistiche, setStatistiche] = useState<StatisticheDto>(posseduta.statistiche);
  const [skillIds, setSkillIds] = useState<number[]>(posseduta.skill.map((s) => s.id));
  const [ricerca, setRicerca] = useState('');
  const [occupato, setOccupato] = useState(false);

  const candidate = useMemo(() => {
    const testo = ricerca.trim().toLowerCase();
    if (!testo || !tutteSkill) return [];
    return tutteSkill.filter((s) => s.elemento !== 'trait' && !skillIds.includes(s.id) && (s.nome.toLowerCase().includes(testo) || s.nomeIt.toLowerCase().includes(testo))).slice(0, 8);
  }, [ricerca, tutteSkill, skillIds]);

  const salva = async () => {
    setOccupato(true);
    try {
      const p = await aggiornaPosseduta(partitaId, posseduta.id, {
        livello, inSquadra, note, skillIds, statistiche: potenziata ? statistiche : null,
      });
      notifica('success', 'Persona aggiornata.');
      onSalvata(p);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  const nomeSkill = (id: number) => tutteSkill?.find((s) => s.id === id) ?? posseduta.skill.find((s) => s.id === id) ?? null;

  return (
    <Modal
      titolo={`${posseduta.nome} — modifica`}
      aperta
      onChiudi={onChiudi}
      larga
      azioni={
        <>
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          <button type="button" className="btn btn-primary" disabled={occupato} onClick={() => void salva()}>Salva</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <label className="form-label">Livello
            <input type="number" min={1} max={99} className="form-input mt-1" value={livello} onChange={(e) => setLivello(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="flex items-center gap-2 text-[13px] touch">
            <input type="checkbox" checked={inSquadra} onChange={(e) => setInSquadra(e.target.checked)} /> In squadra (non in deposito)
          </label>
          <label className="flex items-center gap-2 text-[13px] touch">
            <input type="checkbox" checked={potenziata} onChange={(e) => setPotenziata(e.target.checked)} /> Statistiche potenziate (Potenziamento / Addestramento)
          </label>
          {potenziata ? (
            <div className="grid grid-cols-5 gap-1">
              {ORDINE_STATISTICHE.map((k) => (
                <label key={k} className="text-[11px] text-text-muted text-center">
                  {SIGLA_STATISTICA[k]}
                  <input type="number" min={1} max={99} className="form-input mt-1 px-1 text-center" value={statistiche[k]} onChange={(e) => setStatistiche({ ...statistiche, [k]: Number(e.target.value) })} />
                </label>
              ))}
            </div>
          ) : (
            <StatisticheBarre
              statistiche={statistichePerLivello(posseduta.statisticheBaseLivello, posseduta.livelloBase, livello)}
              base={posseduta.statisticheBaseLivello}
              didascalia={`Stima al livello ${livello} (+3 punti per livello dalla base di livello ${posseduta.livelloBase}); spunta "potenziate" per registrare i valori reali.`}
            />
          )}
          <label className="form-label">Note
            <textarea className="form-input mt-1 min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="form-label">Skill conosciute ({skillIds.length}/8)</span>
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {skillIds.map((id, i) => {
              const s = nomeSkill(id);
              return (
                <li key={id} className="flex items-center gap-2 text-[13px]">
                  <span className="w-5 text-text-muted">{i + 1}.</span>
                  {s ? <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo /> : <span>#{id}</span>}
                  <span className="flex-1 text-text-secondary truncate">{s?.effettoNome}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSkillIds(skillIds.filter((x) => x !== id))} aria-label="Rimuovi skill">×</button>
                </li>
              );
            })}
          </ul>
          {skillIds.length < 8 && (
            <div className="relative">
              <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Aggiungi una skill…" />
              {candidate.length > 0 && (
                <ul className="m-0 p-0 list-none absolute z-10 left-0 right-0 mt-1 card p-1 max-h-[220px] overflow-y-auto shadow-lg">
                  {candidate.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-md hover:bg-bg-tertiary bg-transparent border-none text-text cursor-pointer" onClick={() => { setSkillIds([...skillIds, s.id]); setRicerca(''); }}>
                        <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo />
                        <span className="text-[12px] text-text-secondary truncate">{s.effettoNome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
