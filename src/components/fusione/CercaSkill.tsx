// ============================================================
// CercaSkill — ricette che consentono di ereditare un insieme di skill (fino a 4), con risultato facoltativo
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cercaPerSkill, getSkills } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { SelettorePersona } from './SelettorePersona';
import { SelettoreSkill } from './SelettoreSkill';
import { RicettaRiga } from './RicettaRiga';
import { Spinner } from '../shared/PageState';
import type { PersonaRiassuntoDto, SkillRiassuntoDto } from '../../types';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  livelloProtagonista: number | null;
  inScorta: Set<number>;
}

/** Ricerca delle ricette per skill: skill scelte, risultato facoltativo, limite di livello; elenco per risultato e ricette. */
export function CercaSkill({ persone, partitaId, livelloProtagonista, inScorta }: Props) {
  const skill = useCarica(() => getSkills(), []);
  const [scelte, setScelte] = useState<SkillRiassuntoDto[]>([]);
  const [risultato, setRisultato] = useState<PersonaRiassuntoDto | null>(null);
  const [soloLivello, setSoloLivello] = useState(false);
  const ids = scelte.map((s) => s.id);
  const livelloMax = soloLivello && livelloProtagonista ? livelloProtagonista : undefined;
  const { dati, caricamento, errore } = useCarica(
    () => (ids.length > 0 ? cercaPerSkill(ids, { partita: partitaId ?? undefined, risultato: risultato?.id, livelloMax, limite: 100 }) : Promise.resolve(null)),
    [ids.join(','), partitaId, risultato?.id, livelloMax],
  );

  return (
    <div className="flex flex-col gap-3">
      {skill.dati ? <SelettoreSkill skill={skill.dati} scelte={scelte} onCambia={setScelte} /> : <div className="flex justify-center py-4"><Spinner /></div>}
      <SelettorePersona etichetta="Risultato desiderato (facoltativo)" persone={persone} scelta={risultato} onScegli={setRisultato} senzaRare inScorta={inScorta} />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <button type="button" className={`chip touch ${soloLivello ? 'chip--attivo' : ''}`} disabled={!livelloProtagonista} onClick={() => setSoloLivello((v) => !v)} aria-pressed={soloLivello}>
          Fino al livello {livelloProtagonista ?? '—'} del protagonista
        </button>
        {dati && <span className="text-text-muted ml-auto">{dati.totale} ricette · {dati.perRisultato.length} Persona</span>}
      </div>
      <p className="m-0 text-[12px] text-text-muted">
        Una ricetta è valida se il tipo di eredità del risultato ammette le skill, gli ingredienti le possiedono (skill della scorta se possedute, altrimenti al livello base) e il numero da ereditare non supera gli slot scelti a mano (il gioco ne assegna sempre uno a caso).
      </p>
      {ids.length === 0 ? null : errore ? (
        <p className="m-0 text-[13px] text-error">{errore}</p>
      ) : caricamento && !dati ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : dati && dati.totale === 0 ? (
        <p className="m-0 text-[13px] text-text-muted">Nessuna ricetta consente tutte queste skill insieme: prova a toglierne una o a cambiare risultato.</p>
      ) : dati ? (
        <>
          {!risultato && dati.perRisultato.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {dati.perRisultato.slice(0, 24).map((r) => (
                <button key={r.persona.id} type="button" className="chip touch" onClick={() => setRisultato(persone.find((p) => p.id === r.persona.id) ?? null)} title={`${r.ricette} ricette, dal costo di ${r.costoMinimo.toLocaleString('it-IT')} ¥`}>
                  {r.persona.nomeIt} <span className="opacity-70">L{r.persona.livello} · {r.ricette}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="m-0 p-0 list-none card py-0 divide-y divide-border-light">
            {dati.ricette.map((r) => (
              <li key={r.ricetta.ingredienti.map((i) => i.id).join('-') + '>' + r.ricetta.risultato.id} className="flex flex-col">
                <ul className="m-0 p-0 list-none"><RicettaRiga ricetta={r.ricetta} inScorta={inScorta} /></ul>
                <div className="text-[12px] text-text-muted pb-2 -mt-1">
                  Slot {r.slot} ({r.slotScelti} a scelta){r.giaApprese.length > 0 ? ` · ${r.giaApprese.length} già apprese dal risultato` : ''} ·{' '}
                  {r.ricetta.ingredienti.length === 2
                    ? <Link to={`/fusione?vista=calcolatore&a=${r.ricetta.ingredienti[0].id}&b=${r.ricetta.ingredienti[1].id}`} className="text-primary">Apri nel calcolatore</Link>
                    : <Link to={`/compendio/persona/${r.ricetta.risultato.id}`} className="text-primary">Ricetta speciale a {r.ricetta.ingredienti.length} ingredienti: vedi la scheda</Link>}
                </div>
              </li>
            ))}
          </ul>
          {dati.ricette.length < dati.totale && <p className="m-0 text-[12px] text-text-muted text-center">Mostrate le prime {dati.ricette.length} ricette su {dati.totale} (le più economiche).</p>}
        </>
      ) : null}
    </div>
  );
}
