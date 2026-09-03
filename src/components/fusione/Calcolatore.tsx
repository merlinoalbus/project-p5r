// ============================================================
// Calcolatore — fusione diretta A + B con il contesto della partita attiva (DLC posseduti)
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getFondi } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { SelettorePersona } from './SelettorePersona';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { formattaYen } from '../../utils/punti';
import { PannelloEredita } from './PannelloEredita';
import type { PersonaRiassuntoDto } from '../../types';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  inScorta: Set<number>;
  /** Preselezione dall'URL. */
  inizialeA?: number;
  inizialeB?: number;
}

/** Due Persona → risultato (o motivo dell'impossibilità), con costo e tipo di fusione. */
export function Calcolatore({ persone, partitaId, inScorta, inizialeA, inizialeB }: Props) {
  const [a, setA] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeA) ?? null);
  const [b, setB] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeB) ?? null);
  const { dati: esito, caricamento, errore } = useCarica(
    () => (a && b ? getFondi(a.id, b.id, { partita: partitaId ?? undefined }) : Promise.resolve(null)),
    [a?.id, b?.id, partitaId],
  );

  const r = esito?.ricetta ?? null;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <SelettorePersona etichetta="Prima Persona" persone={persone} scelta={a} onScegli={setA} inScorta={inScorta} />
        <span className="text-center text-text-muted text-2xl md:pt-8">+</span>
        <SelettorePersona etichetta="Seconda Persona" persone={persone} scelta={b} onScegli={setB} inScorta={inScorta} />
      </div>
      {a && b && (
        <div className="card" aria-live="polite">
          {errore ? (
            <div className="text-[13px] text-error">{errore}</div>
          ) : caricamento && !esito ? (
            <div className="text-[13px] text-text-muted">Calcolo…</div>
          ) : r ? (
            <div className="flex items-center gap-4 flex-wrap">
              <ImmagineEntita ambito="persona" chiave={r.risultato.nome} etichetta={r.risultato.nomeIt} dimensione={120} forma="orizzontale" />
              <div className="flex-1 min-w-[200px]">
                <div className="text-[12px] uppercase tracking-wide text-text-muted">Risultato</div>
                <Link to={`/compendio/persona/${r.risultato.id}`} className="text-2xl font-black text-primary no-underline">{r.risultato.nomeIt}</Link>
                {r.risultato.nomeIt !== r.risultato.nome && <span className="text-[13px] text-text-muted ml-2">{r.risultato.nome}</span>}
                <div className="text-[13px] text-text-secondary mt-1">{r.risultato.arcanaNome} · livello {r.risultato.livello}{r.risultato.speciale ? ' · fusione speciale' : ''}</div>
                <div className="text-[13px] text-text-secondary">Tipo: {r.tipo === 'normale' ? 'normale' : r.tipo === 'stesso-arcano' ? 'stesso arcano' : r.tipo === 'tesoro' ? 'con Demone del Tesoro' : 'speciale'} · costo stimato <strong className="text-text">{formattaYen(r.costo)}</strong>{(esito?.sconto ?? 0) > 0 && <span className="text-text-muted"> (sconto Registro {esito?.sconto}%)</span>}</div>
                {esito?.bonusConfidente && (
                  <div className="text-[13px] text-text-secondary">
                    Bonus EXP del Confidente {esito.bonusConfidente.arcanaNome}{esito.bonusConfidente.confidenteNome ? ` (${esito.bonusConfidente.confidenteNome})` : ''}: rango {esito.bonusConfidente.rango} → <strong className="text-text">×{esito.bonusConfidente.moltiplicatoreExp.toLocaleString('it-IT')}</strong>
                    {esito.bonusConfidente.rango === 0 && <span className="text-text-muted"> · aggiorna i ranghi nella scheda Confidenti</span>}
                  </div>
                )}
                {inScorta.has(a.id) && inScorta.has(b.id) && <div className="chip chip--attivo mt-2">Hai entrambi gli ingredienti nella scorta</div>}
              </div>
              <div className="w-full border-t border-border-light pt-3">
                <PannelloEredita a={a.id} b={b.id} partitaId={partitaId} />
              </div>
            </div>
          ) : (
            <div className="text-[14px]"><span className="text-error font-semibold">Fusione non possibile.</span> <span className="text-text-secondary">{esito?.motivo}</span></div>
          )}
        </div>
      )}
      {!partitaId && <p className="m-0 text-[12px] text-text-muted">Nessuna partita attiva: le Persona DLC sono considerate non possedute.</p>}
    </div>
  );
}
