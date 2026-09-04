// ============================================================
// PianiFusione — piani di fusione ricorsivi verso una Persona (albero con foglie scorta / Registro / cattura)
// ============================================================

import { useState } from 'react';
import { getPianiFusione, getSkills, salvaPiano } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { AlberoPiano } from './AlberoPiano';
import { useCarica } from '../../hooks/useCarica';
import { SelettorePersona } from './SelettorePersona';
import { SelettoreSkill } from './SelettoreSkill';
import { Spinner } from '../shared/PageState';
import { formattaYen } from '../../utils/punti';
import type { PersonaRiassuntoDto, PianiFusioneDto, PianoFusioneDto, SkillRiassuntoDto } from '../../types';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  livelloProtagonista: number | null;
  inizialeId?: number;
  /** Skill preselezionate (id), ad esempio da un obiettivo. */
  skillInizialiIds?: number[];
  /** Obiettivo a cui legare i piani salvati (dal collegamento «Piano di fusione» di un obiettivo). */
  obiettivoId?: number;
}

/** Scheda di un piano: costo totale, conteggi e albero. */
function Piano({ piano, indice, onSalva, salvato }: { piano: PianoFusioneDto; indice: number; onSalva?: () => void; salvato?: boolean }) {
  return (
    <article className="card flex flex-col gap-2">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-semibold">Piano {indice + 1}</span>
        <span className="text-[13px] text-text-secondary">
          {piano.fusioni} {piano.fusioni === 1 ? 'fusione' : 'fusioni'} · profondità {piano.profondita}
          {piano.evocazioni > 0 && ` · ${piano.evocazioni} dal Registro`}
          {piano.catture > 0 && ` · ${piano.catture} da catturare`}
        </span>
        <span className="ml-auto font-black tabular-nums text-[16px]">{formattaYen(piano.costo)}</span>
        {onSalva && (
          <button type="button" className={`btn btn-sm ${salvato ? 'btn-ghost' : 'btn-secondary'}`} onClick={onSalva} disabled={salvato} title="Salva questo piano nella partita: l'avanzamento verrà ricalcolato sulla scorta">
            {salvato ? 'Salvato ✓' : 'Salva piano'}
          </button>
        )}
      </div>
      <AlberoPiano radice={piano.radice} />
    </article>
  );
}

/** Selezione del bersaglio, opzioni (profondità, catture, limite di livello, alternative) e piani ordinati per costo. */
export function PianiFusione({ persone, partitaId, livelloProtagonista, inizialeId, skillInizialiIds, obiettivoId }: Props) {
  const [scelta, setScelta] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeId) ?? null);
  const [profondita, setProfondita] = useState(3);
  const [catture, setCatture] = useState(true);
  const [limitaLivello, setLimitaLivello] = useState(true);
  const [alternative, setAlternative] = useState(3);
  const [skillModificate, setSkillScelte] = useState<SkillRiassuntoDto[] | null>(null);
  const [slotFortunato, setSlotFortunato] = useState(false);
  const tutteSkill = useCarica(() => getSkills(), []);
  // Finché l'utente non tocca la selezione, le skill scelte sono quelle arrivate dall'URL (es. da un obiettivo).
  const skillScelte = skillModificate ?? (skillInizialiIds && tutteSkill.dati ? tutteSkill.dati.filter((s) => skillInizialiIds.includes(s.id)) : []);
  const skillIds = skillScelte.map((s) => s.id);
  const [salvati, setSalvati] = useState<Record<string, true>>({});
  const salva = async (d: PianiFusioneDto, piano: PianoFusioneDto, indice: number) => {
    if (!partitaId || !scelta) return;
    const chiave = `${scelta.id}|${indice}|${skillIds.join(',')}|${profondita}|${alternative}|${catture}|${limitaLivello}|${slotFortunato}`;
    try {
      const salvato = await salvaPiano(partitaId, { personaId: scelta.id, piano, opzioni: d.opzioni, skillIds, obiettivoId: obiettivoId ?? null, nome: `Piano ${indice + 1} per ${scelta.nomeIt}` });
      setSalvati((m) => ({ ...m, [chiave]: true }));
      notifica('success', `Piano salvato nella partita${obiettivoId ? ' e legato all\'obiettivo' : ''}: lo trovi in Partita → Piani salvati.`);
      return salvato;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    }
  };
  const { dati, caricamento, errore } = useCarica(
    () => (scelta ? getPianiFusione(scelta.id, { partita: partitaId ?? undefined, profondita, alternative, catture, limitaLivello: limitaLivello && livelloProtagonista !== null, skill: skillIds, slotFortunato }) : Promise.resolve(null)),
    [scelta?.id, partitaId, profondita, alternative, catture, limitaLivello, livelloProtagonista, skillIds.join(','), slotFortunato],
  );

  return (
    <div className="flex flex-col gap-3">
      <SelettorePersona etichetta="Persona da ottenere" persone={persone} scelta={scelta} onScegli={setScelta} senzaRare />
      {scelta && (
        <>
          {tutteSkill.dati && <SelettoreSkill skill={tutteSkill.dati} scelte={skillScelte} onCambia={setSkillScelte} etichetta="Skill da portare sul bersaglio" />}
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <label className="flex items-center gap-1.5 touch">Profondità
              <select className="form-input w-auto" value={profondita} onChange={(e) => setProfondita(Number(e.target.value))} aria-label="Profondità massima">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 touch">Alternative
              <select className="form-input w-auto" value={alternative} onChange={(e) => setAlternative(Number(e.target.value))} aria-label="Numero di alternative">
                {[1, 3, 5, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" className={`chip touch ${catture ? 'chip--attivo' : ''}`} onClick={() => setCatture((v) => !v)} aria-pressed={catture} title="Ammetti Persona da catturare in battaglia come foglie del piano">Ammetti catture</button>
            <button type="button" className={`chip touch ${limitaLivello ? 'chip--attivo' : ''}`} disabled={livelloProtagonista === null} onClick={() => setLimitaLivello((v) => !v)} aria-pressed={limitaLivello && livelloProtagonista !== null} title={livelloProtagonista !== null ? `Nessuna fusione sopra il livello ${livelloProtagonista} del protagonista` : 'Serve una partita attiva'}>
              Fino al livello {livelloProtagonista ?? '—'}
            </button>
            {skillScelte.length > 0 && (
              <button type="button" className={`chip touch ${slotFortunato ? 'chip--attivo' : ''}`} onClick={() => setSlotFortunato((v) => !v)} aria-pressed={slotFortunato} title="Conta anche lo slot che il gioco assegna a caso (serve fortuna o ritentare la fusione)">
                Conta lo slot casuale
              </button>
            )}
          </div>
          <p className="m-0 text-[12px] text-text-muted">
            Foglie: <span className="chip chip--attivo">in scorta</span> gratis (ogni esemplare una volta), <span className="text-text-secondary">dal Registro</span> al prezzo di evocazione, <span className="text-warning">da catturare</span> in battaglia. Il costo del piano è la somma delle evocazioni.
            {skillScelte.length > 0 && ' Le skill richieste sono propagate a catena: ogni fusione deve poterle ereditare (tipo compatibile e slot a scelta sufficienti) e le foglie devono possederle; «↑» = la Persona la apprende salendo di livello.'}
            {!partitaId && ' Senza partita attiva scorta e Registro sono considerati vuoti.'}
          </p>
          {errore ? (
            <p className="m-0 text-[13px] text-error">{errore}</p>
          ) : caricamento && !dati ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : dati && dati.piani.length === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">Nessun piano trovato con queste opzioni: aumenta la profondità, ammetti le catture, togli il limite di livello{skillScelte.length > 0 ? ' o riduci le skill richieste (verifica che il tipo di eredità del bersaglio le ammetta)' : ''}.</p>
          ) : dati ? (
            <>
              {dati.sconto > 0 && <p className="m-0 text-[12px] text-text-muted">Costi con lo sconto del Registro ({dati.sconto}%) della partita.</p>}
              <div className="flex flex-col gap-3">
                {dati.piani.map((p, i) => {
                  const chiave = `${scelta.id}|${i}|${skillIds.join(',')}|${profondita}|${alternative}|${catture}|${limitaLivello}|${slotFortunato}`;
                  return <Piano key={i} piano={p} indice={i} onSalva={partitaId ? () => void salva(dati, p, i) : undefined} salvato={salvati[chiave] === true} />;
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
