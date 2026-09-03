// ============================================================
// PianiFusione — piani di fusione ricorsivi verso una Persona (albero con foglie scorta / Registro / cattura)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPianiFusione, getSkills } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { SelettorePersona } from './SelettorePersona';
import { SelettoreSkill } from './SelettoreSkill';
import { Spinner } from '../shared/PageState';
import { formattaYen } from '../../utils/punti';
import type { NodoPianoDto, PersonaRiassuntoDto, PianoFusioneDto, SkillRiassuntoDto } from '../../types';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  livelloProtagonista: number | null;
  inizialeId?: number;
  /** Skill preselezionate (id), ad esempio da un obiettivo. */
  skillInizialiIds?: number[];
}

const NOME_MODO: Record<NodoPianoDto['modo'], string> = { scorta: 'In scorta', registro: 'Dal Registro', cattura: 'Da catturare', fusione: 'Fusione' };
const NOME_TIPO: Record<string, string> = { normale: 'normale', 'stesso-arcano': 'stesso arcano', tesoro: 'con Demone del Tesoro', speciale: 'speciale' };

/** Nodo dell'albero: riga con Persona, modo (colore), costo; i figli rientrati sotto. */
function Nodo({ nodo, radice }: { nodo: NodoPianoDto; radice?: boolean }) {
  const p = nodo.persona;
  const classeModo = nodo.modo === 'scorta' ? 'chip--attivo' : nodo.modo === 'cattura' ? 'text-warning' : nodo.modo === 'registro' ? 'text-text-secondary' : '';
  return (
    <li className="flex flex-col gap-1">
      <div className={`flex flex-wrap items-center gap-2 py-1 ${radice ? 'text-[15px]' : 'text-[13px]'}`}>
        <Link to={`/compendio/persona/${p.id}`} className={`chip touch no-underline ${radice ? 'chip--attivo' : ''}`} title={`${p.arcanaNome} · livello ${p.livello}`}>
          {p.nomeIt} <span className="opacity-70">L{p.livello}</span>
        </Link>
        <span className={`text-[12px] ${classeModo}`}>
          {nodo.modo === 'fusione' ? `${NOME_MODO.fusione} ${NOME_TIPO[nodo.tipo ?? 'normale']}` : NOME_MODO[nodo.modo]}
          {nodo.modo === 'registro' && ` · ${formattaYen(nodo.costo)}`}
        </span>
        {nodo.skillPortate.map((s) => (
          <span key={s.id} className={`chip text-[11px] ${nodo.skillDaLivello.some((d) => d.id === s.id) ? 'text-warning' : 'chip--attivo'}`} title={nodo.skillDaLivello.some((d) => d.id === s.id) ? 'La apprende salendo di livello' : nodo.modo === 'fusione' ? 'Da ereditare in questa fusione' : 'Posseduta'}>
            {s.nomeIt}{nodo.skillDaLivello.some((d) => d.id === s.id) ? ' ↑' : ''}
          </span>
        ))}
      </div>
      {nodo.figli.length > 0 && (
        <ul className="m-0 p-0 list-none pl-4 ml-2 border-l border-border-light flex flex-col">
          {nodo.figli.map((f, i) => <Nodo key={`${f.persona.id}-${i}`} nodo={f} />)}
        </ul>
      )}
    </li>
  );
}

/** Scheda di un piano: costo totale, conteggi e albero. */
function Piano({ piano, indice }: { piano: PianoFusioneDto; indice: number }) {
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
      </div>
      <ul className="m-0 p-0 list-none">
        <Nodo nodo={piano.radice} radice />
      </ul>
    </article>
  );
}

/** Selezione del bersaglio, opzioni (profondità, catture, limite di livello, alternative) e piani ordinati per costo. */
export function PianiFusione({ persone, partitaId, livelloProtagonista, inizialeId, skillInizialiIds }: Props) {
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
              <div className="flex flex-col gap-3">{dati.piani.map((p, i) => <Piano key={i} piano={p} indice={i} />)}</div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
