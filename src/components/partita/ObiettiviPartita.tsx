// ============================================================
// ObiettiviPartita — Persona da ottenere: elenco per stato con avanzamento, creazione e modifica (Fase 5.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaObiettivo, creaObiettivo, eliminaObiettivo, getObiettivi, getPersone, getSkills, isApiError } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { EmptyState, Spinner } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { SelettoreSkill } from '../fusione/SelettoreSkill';
import { PRIORITA, linkPiano } from '../../utils/obiettivi';
import type { ObiettivoDto, PersonaRiassuntoDto, SkillRiassuntoDto, StatoObiettivo } from '../../types';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import type { ReactNode } from 'react';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  partitaId: number;
}

const ICONE_STATO: Record<StatoObiettivo | 'tutti', ReactNode> = { tutti: <IconaAzione chiave="tutti" dimensione={14} />, aperto: <IconaAzione chiave="aperti" dimensione={14} />, raggiunto: <IconaAzione chiave="raggiunto" dimensione={14} />, annullato: <IconaAzione chiave="annulla" dimensione={14} /> };

const STATI: ReadonlyArray<{ v: StatoObiettivo | 'tutti'; l: string }> = [
  { v: 'aperto', l: 'Aperti' },
  { v: 'raggiunto', l: 'Raggiunti' },
  { v: 'annullato', l: 'Annullati' },
  { v: 'tutti', l: 'Tutti' },
];

export function ObiettiviPartita({ partitaId }: Props) {
  const [stato, setStato] = useState<StatoObiettivo | 'tutti'>('aperto');
  const lista = useCarica(() => getObiettivi(partitaId), [partitaId]);
  const [nuovo, setNuovo] = useState(false);
  const [modifica, setModifica] = useState<ObiettivoDto | null>(null);
  const visibili = useMemo(() => (lista.dati ?? []).filter((o) => stato === 'tutti' || o.stato === stato), [lista.dati, stato]);
  const conteggi = useMemo(() => {
    const c = { aperto: 0, raggiunto: 0, annullato: 0 };
    for (const o of lista.dati ?? []) c[o.stato] += 1;
    return c;
  }, [lista.dati]);

  const sostituisci = (o: ObiettivoDto) => lista.imposta((lista.dati ?? []).map((x) => (x.id === o.id ? o : x)));

  const cambiaStato = async (o: ObiettivoDto, s: StatoObiettivo) => {
    try {
      sostituisci(await aggiornaObiettivo(partitaId, o.id, { stato: s }));
      notifica('success', s === 'raggiunto' ? `Obiettivo «${o.nomeIt}» segnato come raggiunto.` : s === 'annullato' ? `Obiettivo «${o.nomeIt}» annullato.` : `Obiettivo «${o.nomeIt}» riaperto.`);
    } catch (err) {
      notifica('error', isApiError(err, 'obiettivo-gia-aperto') ? 'C\'è già un obiettivo aperto per questa Persona.' : err instanceof Error ? err.message : 'Operazione fallita.');
    }
  };

  const elimina = async (o: ObiettivoDto) => {
    if (!window.confirm(`Eliminare l'obiettivo «${o.nomeIt}»?`)) return;
    try {
      await eliminaObiettivo(partitaId, o.id);
      lista.imposta((lista.dati ?? []).filter((x) => x.id !== o.id));
      notifica('info', 'Obiettivo eliminato.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATI.map((s) => (
          <button key={s.v} type="button" className={`chip chip--icona touch ${stato === s.v ? 'chip--attivo' : ''}`} onClick={() => setStato(s.v)} aria-pressed={stato === s.v}>
            {ICONE_STATO[s.v]}{s.l}{s.v !== 'tutti' ? ` (${conteggi[s.v]})` : ''}
          </button>
        ))}
        <PulsanteVisivo tono="primario" className="ml-auto" icona={<IconaAzione chiave="obiettivo" dimensione={22} />} titolo="Nuovo obiettivo" onClick={() => setNuovo(true)} />
      </div>
      <p className="m-0 text-[13px] text-text-secondary">Una Persona che vuoi ottenere, con le skill che deve avere e il livello minimo. L'obiettivo si chiude da solo quando una copia che soddisfa le condizioni entra nella scorta (o viene aggiornata).</p>
      {lista.errore && <div className="text-[13px] text-error">{lista.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void lista.ricarica()} /></div>}
      {!lista.dati && !lista.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {lista.dati && visibili.length === 0 && (
        <EmptyState illustrazione="vuoto-obiettivi" title={stato === 'aperto' ? 'Nessun obiettivo aperto' : 'Nessun obiettivo'} hint="Crea un obiettivo da qui o dalla scheda di una Persona («Aggiungi agli obiettivi»)." />
      )}
      {visibili.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Obiettivi">
          {visibili.map((o) => (
            <li key={o.id} className={`card flex gap-3 ${o.stato !== 'aperto' ? 'opacity-80' : ''}`}>
              <ImmagineEntita ambito="persona" chiave={o.nome} etichetta={o.nomeIt} dimensione={96} forma="quadrata" adatta="copri" />
              <div className="flex-1 min-w-0 flex flex-col gap-1 text-[13px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/compendio/persona/${o.personaId}`} className="font-display uppercase text-[20px] leading-none text-text no-underline hover:text-primary">{o.nomeIt}</Link>
                  <span className="text-text-muted">{o.arcanaNome} · livello base {o.livelloBase}</span>
                  <span className={`chip ${o.priorita === 2 ? 'chip--attivo' : ''}`}>Priorità {PRIORITA.find((p) => p.v === o.priorita)?.l.toLowerCase()}</span>
                  {o.stato === 'raggiunto' && <span className="chip">Raggiunto{o.raggiuntoAt ? ` il ${new Date(o.raggiuntoAt).toLocaleDateString('it-IT')}` : ''}</span>}
                  {o.stato === 'annullato' && <span className="chip">Annullato</span>}
                  {o.rara && <span className="chip">Demone del Tesoro</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {o.livelloMin !== null && <span className={`chip ${o.livelloRaggiunto && o.possedutaId ? 'chip--attivo' : ''}`}>Almeno livello {o.livelloMin}{o.livelloAttuale !== null ? ` (ora ${o.livelloAttuale})` : ''}</span>}
                  {o.skill.map((s) => {
                    const manca = o.skillMancanti.some((m) => m.id === s.id);
                    return <Link key={s.id} to={`/skill/${s.id}`} className={`chip no-underline ${!manca && o.possedutaId ? 'chip--attivo' : ''}`} title={manca ? 'Skill ancora da ottenere' : 'Skill già posseduta'}>{s.nomeIt}{manca && o.possedutaId ? ' ✗' : !manca && o.possedutaId ? ' ✓' : ''}</Link>;
                  })}
                  {o.skill.length === 0 && o.livelloMin === null && <span className="text-text-muted">Basta ottenere la Persona.</span>}
                </div>
                <div className="text-text-secondary">
                  {o.possedutaId
                    ? o.soddisfatto ? 'In scorta: condizioni soddisfatte.' : `In scorta al livello ${o.livelloAttuale}: ${[o.skillMancanti.length ? `${o.skillMancanti.length} skill mancanti` : '', !o.livelloRaggiunto ? 'livello insufficiente' : ''].filter(Boolean).join(', ')}.`
                    : 'Non ancora in scorta.'}
                  {o.note && <span className="text-text-muted"> · {o.note}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {!o.rara && <CollegamentoVisivo to={linkPiano(o)} compatto icona={<IconaAzione chiave="piano" dimensione={20} />} titolo="Piano di fusione" />}
                  <CollegamentoVisivo to={`/fusione?vista=ricette&ricette=${o.personaId}`} tono="fantasma" compatto icona={<IconaAzione chiave="ricetta" dimensione={20} />} titolo="Come ottenerla" />
                  {o.pianiSalvati > 0 && <CollegamentoVisivo to={`/partita?scheda=piani&obiettivo=${o.id}`} tono="fantasma" compatto icona={<IconaAzione chiave="piano" dimensione={20} />} titolo={o.pianiSalvati === 1 ? '1 piano salvato' : `${o.pianiSalvati} piani salvati`} />}
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={() => setModifica(o)} />
                  {o.stato === 'aperto' && <PulsanteVisivo compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Segna raggiunto" onClick={() => void cambiaStato(o, 'raggiunto')} />}
                  {o.stato === 'aperto' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => void cambiaStato(o, 'annullato')} />}
                  {o.stato !== 'aperto' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void cambiaStato(o, 'aperto')} />}
                  <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" onClick={() => void elimina(o)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {nuovo && (
        <ObiettivoModal
          partitaId={partitaId}
          onChiudi={() => setNuovo(false)}
          onSalvato={(o) => { lista.imposta([o, ...(lista.dati ?? [])]); setNuovo(false); }}
        />
      )}
      {modifica && (
        <ObiettivoModal
          partitaId={partitaId}
          obiettivo={modifica}
          onChiudi={() => setModifica(null)}
          onSalvato={(o) => { sostituisci(o); setModifica(null); }}
        />
      )}
    </div>
  );
}

// ---- Modale: nuovo obiettivo / modifica ----

interface ModalProps {
  partitaId: number;
  obiettivo?: ObiettivoDto;
  /** Persona preselezionata (dalla scheda Persona). */
  personaIniziale?: PersonaRiassuntoDto | { id: number; nomeIt: string; arcanaNome: string; livello: number };
  onChiudi: () => void;
  onSalvato: (o: ObiettivoDto) => void;
}

export function ObiettivoModal({ partitaId, obiettivo, personaIniziale, onChiudi, onSalvato }: ModalProps) {
  const persone = useCarica(() => (obiettivo || personaIniziale ? Promise.resolve([] as PersonaRiassuntoDto[]) : getPersone()), [obiettivo?.id, personaIniziale?.id]);
  const tutteSkill = useCarica(() => getSkills(), []);
  const [q, setQ] = useState('');
  const [personaId, setPersonaId] = useState<number | null>(obiettivo?.personaId ?? personaIniziale?.id ?? null);
  const [skill, setSkill] = useState<SkillRiassuntoDto[]>(obiettivo?.skill ?? []);
  const [livelloMin, setLivelloMin] = useState<number | ''>(obiettivo?.livelloMin ?? '');
  const [priorita, setPriorita] = useState(obiettivo?.priorita ?? 1);
  const [note, setNote] = useState(obiettivo?.note ?? '');
  const [occupato, setOccupato] = useState(false);
  const candidati = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return (persone.dati ?? []).filter((p) => !p.rara && (!testo || p.nomeIt.toLowerCase().includes(testo) || p.nome.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))).slice(0, 12);
  }, [persone.dati, q]);
  const sceltaNome = obiettivo?.nomeIt ?? personaIniziale?.nomeIt ?? (persone.dati ?? []).find((p) => p.id === personaId)?.nomeIt ?? null;

  const salva = async () => {
    if (!personaId) return;
    setOccupato(true);
    try {
      const dati = { skillIds: skill.map((s) => s.id), livelloMin: livelloMin === '' ? null : Number(livelloMin), priorita, note };
      const o = obiettivo ? await aggiornaObiettivo(partitaId, obiettivo.id, dati) : await creaObiettivo(partitaId, personaId, dati);
      notifica('success', obiettivo ? 'Obiettivo aggiornato.' : o.stato === 'raggiunto' ? `Obiettivo creato e già raggiunto: ${o.nomeIt} è in scorta con le condizioni richieste.` : `Obiettivo «${o.nomeIt}» creato.`);
      onSalvato(o);
    } catch (err) {
      notifica('error', isApiError(err, 'obiettivo-gia-aperto') ? 'C\'è già un obiettivo aperto per questa Persona: modificalo dalla scheda Obiettivi.' : err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal titolo={obiettivo ? `Modifica obiettivo: ${obiettivo.nomeIt}` : 'Nuovo obiettivo'} aperta onChiudi={onChiudi}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        {!obiettivo && !personaIniziale && (
          <div className="flex flex-col gap-2">
            <label className="form-label">Persona
              <input className="form-input mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome o arcano…" aria-label="Cerca la Persona" />
            </label>
            {sceltaNome && <div className="text-[13px]">Scelta: <strong>{sceltaNome}</strong></div>}
            {persone.dati && (
              <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5" aria-label="Persona trovate">
                {candidati.map((p) => (
                  <li key={p.id}>
                    <button type="button" className={`chip touch ${personaId === p.id ? 'chip--attivo' : ''}`} onClick={() => setPersonaId(p.id)} aria-pressed={personaId === p.id}>{p.nomeIt} · {p.arcanaNome} · liv. {p.livello}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {personaIniziale && !obiettivo && <div className="text-[13px]">Persona: <strong>{personaIniziale.nomeIt}</strong> · {personaIniziale.arcanaNome} · livello base {personaIniziale.livello}</div>}
        {tutteSkill.dati ? <SelettoreSkill skill={tutteSkill.dati} scelte={skill} onCambia={setSkill} massimo={8} etichetta="Skill desiderate (facoltative)" /> : <Spinner size={18} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="form-label">Livello minimo (facoltativo)
            <input type="number" min={1} max={99} className="form-input mt-1" value={livelloMin} onChange={(e) => setLivelloMin(e.target.value === '' ? '' : Math.min(99, Math.max(1, Number(e.target.value))))} aria-label="Livello minimo" />
          </label>
          <label className="form-label">Priorità
            <select className="form-input mt-1" value={priorita} onChange={(e) => setPriorita(Number(e.target.value))} aria-label="Priorità">
              {PRIORITA.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </label>
        </div>
        <label className="form-label">Note
          <textarea className="form-input mt-1 min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={occupato || !personaId}>{obiettivo ? 'Salva' : 'Crea obiettivo'}</button>
        </div>
      </form>
    </Modal>
  );
}
