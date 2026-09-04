// ============================================================
// PannelloVelluto — stato della Stanza di Velluto per la partita: sconto del Registro, Allarme, Gemelle, ranghi per arcano
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EFFETTI_ALLARME } from '../../../shared/bonusVelluto';
import type { VellutoDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  velluto: VellutoDto | null;
  onCambiaAllarme?: (attivo: boolean) => void;
}

/** Riassunto compatto con dettagli espandibili. */
export function PannelloVelluto({ velluto, onCambiaAllarme }: Props) {
  const [aperto, setAperto] = useState(false);
  if (!velluto) {
    return <p className="m-0 text-[12px] text-text-muted">Nessuna partita attiva: prezzi pieni, nessun bonus del Confidente, Allarme spento.</p>;
  }
  const v = velluto;
  return (
    <div className="card flex flex-col gap-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Stanza di Velluto</span>
        <span className="chip" title={`${v.compendio.registrate} Persona registrate su ${v.compendio.totale} (i DLC non contano)`}>Registro {v.compendio.percentuale}% · sconto {v.sconto}%</span>
        <button
          type="button"
          className={`chip touch ${v.allarmeAttivo ? 'chip--attivo' : ''}`}
          onClick={() => onCambiaAllarme?.(!v.allarmeAttivo)}
          aria-pressed={v.allarmeAttivo}
          title="Segna se nella tua partita è in corso un Allarme delle fusioni (si salva nella partita)"
        >
          Allarme {v.allarmeAttivo ? 'attivo' : 'spento'}
        </button>
        <span className="chip" title={v.gemelle.prossimo ? `Prossimo: rango ${v.gemelle.prossimo.rango} → ${v.gemelle.prossimo.nome}` : 'Tutti gli sblocchi ottenuti'}>Gemelle rango {v.gemelle.rango}</span>
        <PulsanteVisivo tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={aperto ? 'Nascondi dettagli' : 'Dettagli'} onClick={() => setAperto((a) => !a)} aria-expanded={aperto} />
      </div>
      {aperto && (
        <div className="flex flex-col gap-3 pt-1">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-text-muted">Sblocchi delle Gemelle Custodi</div>
            <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
              {v.gemelle.sblocchi.map((s) => (
                <li key={s.rango} className={s.ottenuto ? '' : 'text-text-muted'}>
                  <strong>Rango {s.rango}</strong> · {s.nome}: {s.effetto} {s.ottenuto ? '✓' : ''}
                </li>
              ))}
            </ul>
            {!v.gemelle.trattamentoSpeciale && <p className="m-0 mt-1 text-[12px] text-text-muted">Senza «Trattamento speciale» (rango 5) non puoi fondere Persona sopra il tuo livello: usa il filtro «Fino al livello del protagonista».</p>}
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-text-muted">Bonus EXP del Confidente sulla fusione (per arcano del risultato)</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {v.arcani.filter((a) => a.rango > 0).map((a) => (
                <span key={a.arcana} className="chip" title={`${a.confidenteNome}: rango ${a.rango}`}>{a.arcanaNome} ×{a.moltiplicatoreExp.toLocaleString('it-IT')}</span>
              ))}
              {v.arcani.every((a) => a.rango === 0) && <span className="text-text-muted">Nessun Confidente oltre il rango 0: aggiorna i ranghi nella scheda <Link to="/partita?scheda=confidenti" className="text-primary">Confidenti</Link>.</span>}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide text-text-muted">Effetti dell'Allarme delle fusioni</div>
            <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
              {EFFETTI_ALLARME.map((e) => (
                <li key={e.area}><strong>{e.area}</strong>: {e.effetto} {e.affidabilita !== 'alta' && <span className="text-text-muted">(affidabilità {e.affidabilita})</span>}</li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[12px] text-text-muted">Fonti e affidabilità di ogni regola in <code>docs/riferimenti/bonus-velluto.md</code>.</p>
        </div>
      )}
    </div>
  );
}
