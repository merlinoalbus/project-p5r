// ============================================================
// RicettePersona — come ottenere una Persona (ricette) oppure cosa si ottiene con una Persona (fusioni con)
// ============================================================

import { useState } from 'react';
import { getFusioniCon, getRicettePer } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { SelettorePersona } from './SelettorePersona';
import { RicettaRiga } from './RicettaRiga';
import { Spinner } from '../shared/PageState';
import type { PersonaRiassuntoDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  /** Livello del protagonista della partita attiva (per il filtro). */
  livelloProtagonista: number | null;
  inScorta: Set<number>;
  modalita: 'per' | 'con';
  inizialeId?: number;
  /** Se indicato, il selettore è nascosto e si mostra solo la Persona data (uso nella scheda Persona). */
  fissa?: PersonaRiassuntoDto;
  limiteIniziale?: number;
}

/** Elenco ricette con filtri: livello massimo (protagonista), solo ricette pronte con la scorta, caricamento a blocchi. */
export function RicettePersona({ persone, partitaId, livelloProtagonista, inScorta, modalita, inizialeId, fissa, limiteIniziale = 50 }: Props) {
  const [scelta, setScelta] = useState<PersonaRiassuntoDto | null>(() => fissa ?? persone.find((p) => p.id === inizialeId) ?? null);
  const [soloLivello, setSoloLivello] = useState(false);
  const [soloPronte, setSoloPronte] = useState(false);
  const [limite, setLimite] = useState(limiteIniziale);
  const livelloMax = soloLivello && livelloProtagonista ? livelloProtagonista : undefined;
  const { dati, caricamento, errore } = useCarica(
    () => {
      if (!scelta) return Promise.resolve(null);
      const opz = { partita: partitaId ?? undefined, livelloMax, limite };
      return modalita === 'per' ? getRicettePer(scelta.id, opz) : getFusioniCon(scelta.id, opz);
    },
    [scelta?.id, partitaId, livelloMax, limite, modalita],
  );

  const ricette = (dati?.ricette ?? []).filter((r) => !soloPronte || r.ingredienti.every((i) => inScorta.has(i.id)));

  return (
    <div className="flex flex-col gap-3">
      {!fissa && (
        <SelettorePersona
          etichetta={modalita === 'per' ? 'Persona da ottenere' : 'Persona da usare come ingrediente'}
          persone={persone}
          scelta={scelta}
          onScegli={(p) => { setScelta(p); setLimite(limiteIniziale); }}
          senzaRare={modalita === 'per'}
          inScorta={inScorta}
        />
      )}
      {scelta && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <button type="button" className={`chip touch ${soloLivello ? 'chip--attivo' : ''}`} disabled={!livelloProtagonista} onClick={() => setSoloLivello((v) => !v)} aria-pressed={soloLivello} title={livelloProtagonista ? `Solo Persona fino al livello ${livelloProtagonista} del protagonista` : 'Serve una partita attiva'}>
              Fino al livello {livelloProtagonista ?? '—'} del protagonista
            </button>
            <button type="button" className={`chip touch ${soloPronte ? 'chip--attivo' : ''}`} disabled={inScorta.size === 0} onClick={() => setSoloPronte((v) => !v)} aria-pressed={soloPronte} title={inScorta.size ? 'Solo ricette con tutti gli ingredienti nella scorta' : 'La scorta è vuota'}>
              Solo pronte con la scorta
            </button>
            {dati && (
              <span className="text-text-muted ml-auto">
                {dati.totale} {modalita === 'per' ? 'ricette' : 'fusioni'}{dati.livelloMax !== null && dati.totaleSenzaFiltri !== dati.totale ? ` (${dati.totaleSenzaFiltri} senza limite di livello)` : ''}
                {soloPronte ? ` · ${ricette.length} pronte` : ''}
                {dati.sconto > 0 ? ` · costi con sconto Registro ${dati.sconto}%` : ''}
              </span>
            )}
          </div>
          {errore ? (
            <p className="m-0 text-[13px] text-error">{errore}</p>
          ) : caricamento && !dati ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : dati && dati.totale === 0 ? (
            <p className="m-0 text-[13px] text-text-muted">
              {scelta.rara ? 'I Demoni del Tesoro non si ottengono per fusione: si incontrano nei Palazzi e nei Mementos.' : modalita === 'per' ? 'Nessuna ricetta disponibile con i contenuti considerati.' : 'Nessuna fusione disponibile con questa Persona.'}
            </p>
          ) : dati ? (
            <ul className="m-0 p-0 list-none card py-0 divide-y divide-border-light">
              {ricette.map((r) => (
                <RicettaRiga key={r.ingredienti.map((i) => i.id).join('-') + '>' + r.risultato.id} ricetta={r} inScorta={inScorta} mostraRisultato={modalita === 'con'} />
              ))}
              {ricette.length === 0 && <li className="py-3 text-[13px] text-text-muted">Nessuna ricetta pronta con la scorta attuale.</li>}
            </ul>
          ) : null}
          {dati && dati.ricette.length < dati.totale && (
            <PulsanteVisivo className="self-center" icona={<IconaAzione chiave="carica-altri" dimensione={22} />} titolo="Mostra altre" dettaglio={`${dati.totale - dati.ricette.length} rimanenti`} disabled={caricamento} onClick={() => setLimite((l) => l + 100)} />
          )}
        </>
      )}
    </div>
  );
}
