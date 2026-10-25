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
import { EseguiFusioneModal } from './EseguiFusioneModal';
import type { PersonaPossedutaDto, PersonaRiassuntoDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  inScorta: Set<number>;
  /** Preselezione dall'URL. */
  inizialeA?: number;
  inizialeB?: number;
  /** Scorta della partita (per eseguire la fusione dagli esemplari posseduti). */
  scorta?: PersonaPossedutaDto[];
  onScortaCambiata?: () => void;
}

/**
 * Due Persona → risultato (o motivo dell'impossibilità), con costo e tipo di fusione.
 *
 * Lotto C: con le due Persona scelte il risultato sta **prima** degli ingressi, così sul telefono si vede senza scorrere
 * (prima arrivava sotto i due selettori, a y ≈ 855 px su una schermata di 844); l'eredità delle skill, lunga, sta dopo gli
 * ingressi, nella sua carta, per non allontanare i selettori dal risultato.
 */
export function Calcolatore({ persone, partitaId, inScorta, inizialeA, inizialeB, scorta, onScortaCambiata }: Props) {
  const [esecuzione, setEsecuzione] = useState(false);
  const [a, setA] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeA) ?? null);
  const [b, setB] = useState<PersonaRiassuntoDto | null>(() => persone.find((p) => p.id === inizialeB) ?? null);
  const { dati: esito, caricamento, errore } = useCarica(
    () => (a && b ? getFondi(a.id, b.id, { partita: partitaId ?? undefined }) : Promise.resolve(null)),
    [a?.id, b?.id, partitaId],
  );

  const r = esito?.ricetta ?? null;
  return (
    <div className="flex flex-col gap-3">
      {/* La carta c'è sempre, con un'altezza minima: scelta la seconda Persona il risultato compare al suo posto invece di spingere
          giù i selettori mentre li si usa; e la regione `aria-live` esiste già prima del primo risultato */}
      <section className="card min-h-32 flex flex-col justify-center" aria-live="polite" aria-label="Risultato della fusione">
          {!a || !b ? (
            <p className="m-0 testo-13 text-text-muted">Scegli due Persona qui sotto: il risultato della fusione compare qui.</p>
          ) : errore ? (
            <div className="testo-13 text-error-testo">{errore}</div>
          ) : caricamento && !esito ? (
            <div className="testo-13 text-text-muted">Calcolo…</div>
          ) : r ? (
            <div className="flex items-start gap-3 sm:gap-4">
              <ImmagineEntita ambito="persona" chiave={r.risultato.nome} etichetta={r.risultato.nomeIt} dimensione={96} forma="orizzontale" />
              <div className="flex-1 min-w-0">
                <div className="testo-12 uppercase tracking-wide text-text-muted">Risultato</div>
                <Link to={`/compendio/persona/${r.risultato.id}`} className="text-2xl font-black text-primary-testo no-underline break-words">{r.risultato.nomeIt}</Link>
                {r.risultato.nomeIt !== r.risultato.nome && <span className="testo-13 text-text-muted ml-2">{r.risultato.nome}</span>}
                <div className="testo-13 text-text-secondary mt-1">{r.risultato.arcanaNome} · livello {r.risultato.livello}{r.risultato.speciale ? ' · fusione speciale' : ''}</div>
                <div className="testo-13 text-text-secondary">Tipo: {r.tipo === 'normale' ? 'normale' : r.tipo === 'stesso-arcano' ? 'stesso arcano' : r.tipo === 'tesoro' ? 'con Demone del Tesoro' : 'speciale'} · costo stimato <strong className="text-text whitespace-nowrap">{formattaYen(r.costo)}</strong>{(esito?.sconto ?? 0) > 0 && <span className="text-text-muted"> (sconto Registro {esito?.sconto}%)</span>}</div>
                {esito?.bonusConfidente && (
                  <div className="testo-13 text-text-secondary">
                    Bonus EXP del Confidente {esito.bonusConfidente.arcanaNome}{esito.bonusConfidente.confidenteNome ? ` (${esito.bonusConfidente.confidenteNome})` : ''}: rango {esito.bonusConfidente.rango} → <strong className="text-text">×{esito.bonusConfidente.moltiplicatoreExp.toLocaleString('it-IT')}</strong>
                    {esito.bonusConfidente.rango === 0 && <span className="text-text-muted"> · aggiorna i ranghi nella scheda Confidenti</span>}
                  </div>
                )}
                {inScorta.has(a.id) && inScorta.has(b.id) && (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="chip chip--attivo">Hai entrambi gli ingredienti nella scorta</span>
                    {partitaId && scorta && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="esegui" dimensione={20} />} titolo="Esegui la fusione dalla scorta" onClick={() => setEsecuzione(true)} />}
                  </div>
                )}
                {esecuzione && partitaId && scorta && (
                  <EseguiFusioneModal
                    partitaId={partitaId}
                    possedutaIds={[scorta.find((p) => p.personaId === a.id)!.id, scorta.find((p) => p.personaId === b.id)!.id]}
                    onChiudi={() => setEsecuzione(false)}
                    onEseguita={() => { setEsecuzione(false); onScortaCambiata?.(); }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="testo-14"><span className="text-error-testo font-semibold">Fusione non possibile.</span> <span className="text-text-secondary">{esito?.motivo}</span></div>
          )}
      </section>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <SelettorePersona etichetta="Prima Persona" persone={persone} scelta={a} onScegli={setA} inScorta={inScorta} />
        <span className="text-center text-text-muted text-2xl md:pt-8" aria-hidden="true">+</span>
        <SelettorePersona etichetta="Seconda Persona" persone={persone} scelta={b} onScegli={setB} inScorta={inScorta} />
      </div>
      {a && b && r && !errore && (
        <div className="card">
          <PannelloEredita a={a.id} b={b.id} partitaId={partitaId} />
        </div>
      )}
      {!partitaId && <p className="m-0 testo-12 text-text-muted">Nessuna partita attiva: le Persona DLC sono considerate non possedute.</p>}
    </div>
  );
}
