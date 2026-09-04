// ============================================================
// ScortaPersona — Persona possedute nella partita: aggiunta, livello, skill, statistiche, rimozione
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaPosseduta, aggiungiPosseduta, getPersone, getPossedute, getSkills, isApiError, rimuoviPosseduta, getCompendioPartita, registraPosseduta } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState, EmptyState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { CampoRicerca } from '../shared/CampoRicerca';
import { ElementoChip } from '../compendio/ElementoChip';
import { StatisticheBarre } from '../compendio/StatisticheBarre';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { statistichePerLivello } from '../../../shared/statistiche';
import type { CompendioPartitaDto, PersonaPossedutaDto, StatisticheDto } from '../../types';
import { ORDINE_STATISTICHE, SIGLA_STATISTICA } from '../../utils/elementi';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  partitaId: number;
}

/** Scorta della partita con modifica di livello, statistiche potenziate e skill conosciute. */
export function ScortaPersona({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getPossedute(partitaId), [partitaId]);
  const [aggiunta, setAggiunta] = useState(false);
  const [modifica, setModifica] = useState<PersonaPossedutaDto | null>(null);
  const compendio = useCarica(() => getCompendioPartita(partitaId), [partitaId]);
  const istantanee = useMemo(() => new Map((compendio.dati ?? []).map((c) => [c.personaId, c])), [compendio.dati]);
  const [registrazione, setRegistrazione] = useState<number | null>(null);
  const registra = async (p: PersonaPossedutaDto) => {
    setRegistrazione(p.id);
    try {
      compendio.imposta(await registraPosseduta(partitaId, p.id));
      notifica('success', `${p.nomeIt} registrata nel compendio al livello ${p.livello}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Registrazione fallita.');
    } finally {
      setRegistrazione(null);
    }
  };

  const rimuovi = async (p: PersonaPossedutaDto) => {
    if (!dati || !window.confirm(`Rimuovere ${p.nomeIt} dalla scorta? Resta registrata nel compendio.`)) return;
    try {
      await rimuoviPosseduta(partitaId, p.id);
      imposta(dati.filter((x) => x.id !== p.id));
      notifica('info', `${p.nomeIt} rimossa dalla scorta.`);
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
                <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={64} />
                <span className="w-11 h-11 rounded-md bg-bg-tertiary flex items-center justify-center font-bold text-primary" title="Livello">{p.livello}</span>
                <Link to={`/compendio/persona/${p.personaId}`} className="font-semibold text-[15px] no-underline text-text hover:text-primary">{p.nomeIt}</Link>
                {p.nomeIt !== p.nome && <span className="text-[12px] text-text-muted">{p.nome}</span>}
                <span className="chip">{p.arcanaNome}</span>
                {!p.inSquadra && <span className="chip">In deposito</span>}
                {!p.statisticheBase && <span className="chip chip--attivo" title={descriviBonus(p.bonus)}>Bonus {totaleBonus(p.bonus) > 0 ? '+' : ''}{totaleBonus(p.bonus)}</span>}
                {(() => { const st = statoIstantanea(p, istantanee.get(p.personaId)); return st === 'aggiornata' ? <span className="chip" title="Il compendio conserva questa versione">Registrata</span> : null; })()}
                <span className="flex-1" />
                {statoIstantanea(p, istantanee.get(p.personaId)) !== 'aggiornata' && (
                  <PulsanteVisivo compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Registra" dettaglio={statoIstantanea(p, istantanee.get(p.personaId)) === 'assente' ? 'nel compendio' : 'aggiorna il compendio'} disabled={registrazione === p.id} onClick={() => void registra(p)} title="Salva nel compendio livello, bonus, skill e tratto di questo esemplare: l'evocazione dal Registro li ripristina" />
                )}
                <PulsanteVisivo compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={() => setModifica(p)} />
                <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi" onClick={() => void rimuovi(p)} />
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
                <summary className="cursor-pointer text-text-secondary touch flex items-center">Statistiche al livello {p.livello} {p.statisticheBase ? '(stima del livello)' : `(stima più bonus ${descriviBonus(p.bonus)})`}</summary>
                <div className="pt-2"><StatisticheBarre statistiche={p.statistiche} base={p.statisticheStimate} compatta /></div>
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
    return (dati ?? []).filter((p) => !p.rara && (!testo || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))).slice(0, 40);
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
            <span className="font-semibold flex-1">{p.nomeIt}{p.nomeIt !== p.nome && <span className="text-[12px] font-normal text-text-muted"> {p.nome}</span>}</span>
            <span className="chip">{p.arcanaNome}</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={occupato === p.id} onClick={() => void aggiungi(p.id, p.nomeIt)}>Aggiungi</button>
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
  const [bonus, setBonus] = useState<StatisticheDto>(posseduta.bonus);
  const stimate = statistichePerLivello(posseduta.statisticheBaseLivello, posseduta.livelloBase, livello);
  const effettive = Object.fromEntries(ORDINE_STATISTICHE.map((k) => [k, Math.min(99, Math.max(1, stimate[k] + bonus[k]))])) as unknown as StatisticheDto;
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
        livello, inSquadra, note, skillIds, bonus,
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
          <div className="flex flex-col gap-1">
            <span className="form-label m-0">Bonus per statistica (Potenziamento, Addestramento, Isolamento, Forca)</span>
            <div className="grid grid-cols-5 gap-1">
              {ORDINE_STATISTICHE.map((k) => (
                <label key={k} className="text-[11px] text-text-muted text-center">
                  {SIGLA_STATISTICA[k]} <span className="text-text-secondary">({stimate[k]})</span>
                  <input type="number" min={-99} max={99} className="form-input form-input--compatto mt-1 px-1 text-center w-full" value={bonus[k]} onChange={(e) => setBonus({ ...bonus, [k]: Math.max(-99, Math.min(99, Number(e.target.value) || 0)) })} aria-label={`Bonus ${SIGLA_STATISTICA[k]}`} />
                  <span className="block text-[12px] font-semibold text-text mt-0.5">= {effettive[k]}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn btn-ghost btn-sm" disabled={ORDINE_STATISTICHE.every((k) => bonus[k] === 0)} onClick={() => setBonus({ forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 })}>Azzera i bonus</button>
            </div>
          </div>
          <StatisticheBarre
            statistiche={effettive}
            base={stimate}
            didascalia={`Stima al livello ${livello} (+3 punti per livello dalla base di livello ${posseduta.livelloBase}) più i bonus: i bonus restano quando la Persona sale di livello.`}
          />
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

// ---- Aiuti: bonus e istantanea del compendio ----

function totaleBonus(b: StatisticheDto): number {
  return ORDINE_STATISTICHE.reduce((acc, k) => acc + b[k], 0);
}

function descriviBonus(b: StatisticheDto): string {
  return ORDINE_STATISTICHE.filter((k) => b[k] !== 0).map((k) => `${SIGLA_STATISTICA[k]} ${b[k] > 0 ? '+' : ''}${b[k]}`).join(' · ') || 'nessuno';
}

/** Confronta l'esemplare con l'istantanea del compendio: assente, da aggiornare o aggiornata. */
function statoIstantanea(p: PersonaPossedutaDto, c: CompendioPartitaDto | undefined): 'assente' | 'da-aggiornare' | 'aggiornata' {
  if (!c || !c.registrata || c.livelloRegistrato === null) return 'assente';
  const stesseSkill = c.skill.length === p.skill.length && c.skill.every((s, i) => s.id === p.skill[i]?.id);
  const stessoBonus = ORDINE_STATISTICHE.every((k) => c.bonus[k] === p.bonus[k]);
  return c.livelloRegistrato === p.livello && stesseSkill && stessoBonus && (c.tratto?.id ?? null) === (p.tratto?.id ?? null) && c.carica === p.carica ? 'aggiornata' : 'da-aggiornare';
}
