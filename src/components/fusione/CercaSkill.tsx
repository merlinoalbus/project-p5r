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
import { AnteprimaPersona } from '../shared/AnteprimaPersona';

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
      <div className="passo-guida">
        <span className="passo-guida__numero" aria-hidden="true">1</span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-display uppercase text-[18px] leading-none">Scegli le skill che la Persona deve avere</span>
          <span className="text-[12px] text-text-secondary">Fino a 4 skill: l'app cerca le fusioni in cui gli ingredienti le possiedono e il risultato può ereditarle tutte insieme.</span>
          {skill.dati ? <SelettoreSkill skill={skill.dati} scelte={scelte} onCambia={setScelte} /> : <div className="flex justify-center py-4"><Spinner /></div>}
        </div>
      </div>
      <div className="passo-guida">
        <span className="passo-guida__numero" aria-hidden="true">2</span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-display uppercase text-[18px] leading-none">Facoltativo: la Persona che vuoi ottenere</span>
          <span className="text-[12px] text-text-secondary">Senza una scelta vedi tutte le Persona che possono nascere con quelle skill; toccane una per restringere.</span>
          <SelettorePersona etichetta="Risultato desiderato (facoltativo)" persone={persone} scelta={risultato} onScegli={setRisultato} senzaRare inScorta={inScorta} />
        </div>
      </div>
      <div className="passo-guida">
        <span className="passo-guida__numero" aria-hidden="true">3</span>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-display uppercase text-[18px] leading-none">Ricette trovate</span>
          <span className="text-[12px] text-text-secondary">Ordinate per costo; «Pronta» se hai già tutti gli ingredienti nella scorta.</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <button type="button" className={`chip touch ${soloLivello ? 'chip--attivo' : ''}`} disabled={!livelloProtagonista} onClick={() => setSoloLivello((v) => !v)} aria-pressed={soloLivello}>
          Fino al livello {livelloProtagonista ?? '—'} del protagonista
        </button>
        {dati && <span className="text-text-muted ml-auto">{dati.totale} ricette · {dati.perRisultato.length} Persona</span>}
      </div>
      <details className="text-[12px] text-text-muted">
        <summary className="cursor-pointer touch">Come funziona la ricerca</summary>
        <p className="m-0 mt-1">
        Una ricetta è valida se il tipo di eredità del risultato ammette le skill, gli ingredienti le possiedono (skill della scorta se possedute, altrimenti al livello base) e il numero da ereditare non supera gli slot scelti a mano (il gioco ne assegna sempre uno a caso).
      </p>
      </details>
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
                <button key={r.persona.id} type="button" className="persona-chip touch cursor-pointer" onClick={() => setRisultato(persone.find((p) => p.id === r.persona.id) ?? null)} title={`${r.ricette} ricette, dal costo di ${r.costoMinimo.toLocaleString('it-IT')} ¥`}>
                  <AnteprimaPersona nome={r.persona.nome} etichetta={r.persona.nomeIt} dimensione={32} />
                  <span className="persona-chip__testo"><span className="persona-chip__nome">{r.persona.nomeIt}</span><span className="persona-chip__livello">L{r.persona.livello} · {r.ricette} {r.ricette === 1 ? 'ricetta' : 'ricette'}</span></span>
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
