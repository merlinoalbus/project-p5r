// ============================================================
// CicliFusione — vista «Cicli di fusione»: bersaglio, opzioni, cicli trovati (anelli con partner e costo) e salvataggio (Fase 5.5)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCicliFusione, salvaCiclo } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { SelettorePersona } from './SelettorePersona';
import { Spinner } from '../shared/PageState';
import { formattaYen } from '../../utils/punti';
import type { CicloFusioneDto, PersonaRiassuntoDto } from '../../types';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  livelloProtagonista: number | null;
  inScorta: Set<number>;
  inizialeId?: number;
  onSalvato?: () => void;
}

const NOME_MODO = { scorta: 'dalla scorta', registro: 'dal Registro', cattura: 'da catturare' } as const;

/** Un ciclo: anelli in sequenza con partner, modo/costo, risultato e bonus di livello. */
export function SchedaCiclo({ ciclo, indice, onSalva, salvato }: { ciclo: CicloFusioneDto; indice: number; onSalva?: () => void; salvato?: boolean }) {
  return (
    <article className="card flex flex-col gap-2">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-semibold">Ciclo {indice + 1}</span>
        <span className="text-[13px] text-text-secondary">
          {ciclo.lunghezza} anelli · {ciclo.evocazioni} dal Registro{ciclo.catture > 0 ? ` · ${ciclo.catture} da catturare` : ''}{ciclo.dallaScorta > 0 ? ` · ${ciclo.dallaScorta} dalla scorta (solo la prima volta)` : ''}
        </span>
        <span className="ml-auto font-black tabular-nums text-[16px]" title="Costo di una iterazione (evocazioni dal Registro)">{formattaYen(ciclo.costo)} / giro</span>
        {onSalva && <button type="button" className={`btn btn-sm ${salvato ? 'btn-ghost' : 'btn-secondary'}`} onClick={onSalva} disabled={salvato}>{salvato ? 'Salvato ✓' : 'Salva ciclo'}</button>}
      </div>
      <ol className="m-0 p-0 list-none flex flex-col gap-1" aria-label={`Anelli del ciclo ${indice + 1}`}>
        {ciclo.anelli.map((a, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-text-muted w-5">{i + 1}.</span>
            <Link to={`/compendio/persona/${a.ingrediente.id}`} className={`chip touch no-underline ${i === 0 ? 'chip--attivo' : ''}`}>{a.ingrediente.nomeIt}</Link>
            <span aria-hidden="true">+</span>
            <Link to={`/compendio/persona/${a.partner.id}`} className="chip touch no-underline" title={`${a.partner.arcanaNome} · livello ${a.partner.livello}`}>{a.partner.nomeIt}</Link>
            <span className={`text-[12px] ${a.partnerModo === 'cattura' ? 'text-warning' : 'text-text-secondary'}`}>{NOME_MODO[a.partnerModo]}{a.partnerModo === 'registro' ? ` · ${formattaYen(a.partnerCosto)}` : ''}</span>
            <span aria-hidden="true">→</span>
            <Link to={`/compendio/persona/${a.risultato.id}`} className={`chip touch no-underline ${i === ciclo.anelli.length - 1 ? 'chip--attivo' : ''}`}>{a.risultato.nomeIt} <span className="opacity-70">L{a.risultato.livello}</span></Link>
            <span className="text-[12px] text-text-muted">
              {a.tipo === 'tesoro' ? 'con Demone del Tesoro' : a.tipo === 'stesso-arcano' ? 'stesso arcano' : 'normale'}
              {a.bonusLivelli.max > 0 ? ` · nasce +${a.bonusLivelli.min === a.bonusLivelli.max ? a.bonusLivelli.min : `${a.bonusLivelli.min}…${a.bonusLivelli.max}`} livelli (${a.risultato.arcanaNome} rango ${a.rangoArcano})` : ` · ${a.risultato.arcanaNome} rango 0: nessun bonus`}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function CicliFusione({ persone, partitaId, livelloProtagonista, inScorta, inizialeId, onSalvato }: Props) {
  const [scelta, setScelta] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeId) ?? null);
  const [lunghezza, setLunghezza] = useState(3);
  const [lunghezzaMin, setLunghezzaMin] = useState(2);
  const [partnerDistinti, setPartnerDistinti] = useState(true);
  const [alternative, setAlternative] = useState(5);
  const [catture, setCatture] = useState(false);
  const [limitaLivello, setLimitaLivello] = useState(true);
  const [salvati, setSalvati] = useState<Record<string, true>>({});
  const { dati, caricamento, errore } = useCarica(
    () => (scelta ? getCicliFusione(scelta.id, { partita: partitaId ?? undefined, lunghezza, lunghezzaMin: Math.min(lunghezzaMin, lunghezza), partnerDistinti, alternative, catture, limitaLivello: limitaLivello && livelloProtagonista !== null }) : Promise.resolve(null)),
    [scelta?.id, partitaId, lunghezza, lunghezzaMin, partnerDistinti, alternative, catture, limitaLivello, livelloProtagonista],
  );

  const salva = async (c: CicloFusioneDto, i: number) => {
    if (!partitaId || !scelta) return;
    const chiave = `${scelta.id}|${i}|${lunghezzaMin}-${lunghezza}|${partnerDistinti}|${alternative}|${catture}|${limitaLivello}`;
    try {
      await salvaCiclo(partitaId, { personaId: scelta.id, anelli: c.anelli.map((a) => ({ ingredienteId: a.ingrediente.id, partnerId: a.partner.id, risultatoId: a.risultato.id })), nome: `Ciclo ${i + 1} per ${scelta.nomeIt}` });
      setSalvati((m) => ({ ...m, [chiave]: true }));
      notifica('success', 'Ciclo salvato: lo trovi in Partita → Cicli, dove puoi eseguirlo anello per anello.');
      onSalvato?.();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SelettorePersona etichetta="Persona di partenza (e di arrivo)" persone={persone} scelta={scelta} onScegli={setScelta} inScorta={inScorta} senzaRare />
      <p className="m-0 text-[13px] text-text-secondary">
        Un ciclo fonde la Persona scelta con un partner, poi il risultato con un altro partner, e così via finché l'ultima fusione la rigenera. Si ripete identico a ogni giro. In Royal la fusione non trasferisce statistiche né livelli dei materiali: ogni anello dà al risultato il bonus di livello del Confidente del suo arcano e, durante l'Allarme, +15/+20/+25 punti e lo stato «gialla» (utile poi alla Forca o come ingrediente). I partner dal Registro costano l'evocazione (sconto del compendio applicato), quelli da catturare vanno ripresi ogni giro.
      </p>
      {scelta && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="flex items-center gap-1.5" role="group" aria-label="Numero di anelli">
              Anelli da
              <select className="form-input form-input--compatto" value={Math.min(lunghezzaMin, lunghezza)} onChange={(e) => setLunghezzaMin(Number(e.target.value))} aria-label="Numero minimo di anelli">
                {[2, 3, 4, 5].filter((n) => n <= lunghezza).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              a
              <select className="form-input form-input--compatto" value={lunghezza} onChange={(e) => { const v = Number(e.target.value); setLunghezza(v); if (lunghezzaMin > v) setLunghezzaMin(v); }} aria-label="Numero massimo di anelli">
                {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
            <button type="button" className={`chip touch ${partnerDistinti ? 'chip--attivo' : ''}`} onClick={() => setPartnerDistinti((v) => !v)} aria-pressed={partnerDistinti} title="Ogni partner compare una sola volta nella catena: a ogni giro servono Persona diverse fra loro">Partner distinti</button>
            <label className="flex items-center gap-1.5 touch">Alternative
              <select className="form-input w-auto" value={alternative} onChange={(e) => setAlternative(Number(e.target.value))} aria-label="Numero di alternative">
                {[3, 5, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" className={`chip touch ${catture ? 'chip--attivo' : ''}`} onClick={() => setCatture((v) => !v)} aria-pressed={catture} title="Ammetti partner da catturare in battaglia (costo zero, ma vanno ripresi a ogni giro)">Ammetti catture</button>
            <button type="button" className={`chip touch ${limitaLivello ? 'chip--attivo' : ''}`} disabled={livelloProtagonista === null} onClick={() => setLimitaLivello((v) => !v)} aria-pressed={limitaLivello && livelloProtagonista !== null}>Fino al livello {livelloProtagonista ?? '—'}</button>
          </div>
          {errore ? (
            <p className="m-0 text-[13px] text-error">{errore}</p>
          ) : caricamento && !dati ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : dati && dati.cicli.length === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">Nessun ciclo con queste opzioni: {dati.disponibilita.registro === 0 ? 'il Registro della partita è vuoto (registra Persona nel compendio o ammetti le catture)' : 'aumenta gli anelli, ammetti le catture o togli il limite di livello'}.</p>
          ) : dati ? (
            <>
              <p className="m-0 text-[12px] text-text-muted">
                {dati.inScorta ? `${dati.persona.nomeIt} è nella scorta.` : `${dati.persona.nomeIt} non è nella scorta: prima procurala (`}{!dati.inScorta && <Link to={`/fusione?vista=piani&piani=${dati.persona.id}`} className="text-primary">piano di fusione</Link>}{!dati.inScorta && ').'}
                {dati.sconto > 0 && ` Costi con lo sconto del Registro (${dati.sconto}%).`}
                {!partitaId && ' Senza partita attiva scorta e Registro sono vuoti.'}
              </p>
              <div className="flex flex-col gap-3">
                {dati.cicli.map((c, i) => {
                  const chiave = `${scelta.id}|${i}|${lunghezzaMin}-${lunghezza}|${partnerDistinti}|${alternative}|${catture}|${limitaLivello}`;
                  return <SchedaCiclo key={i} ciclo={c} indice={i} onSalva={partitaId ? () => void salva(c, i) : undefined} salvato={salvati[chiave] === true} />;
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
