// ============================================================
// RequisitiVoce — l'elenco «In scorta» di una voce del Diario: una casella per ogni requisito (arcano o Persona specifica)
// ============================================================
//
// Una voce può chiedere di avere in scorta certe Persona (`AzionePercorsoDto.requisiti`, scelti nell'editor della voce). La casella di ogni
// requisito è della partita ed è un promemoria manuale: non legge né scrive la scorta. La prima spunta della voce è consentita solo con tutte le
// caselle spuntate (la casella di completamento resta spenta, e il server risponde comunque 409 `requisiti-incompleti`); l'annullo è libero.
// Una chiamata per cambio, senza ottimismo: la casella cambia quando il server ha risposto, con un'occupazione per riga. Aperta finché la voce non
// è fatta, chiusa a voce fatta (la voce si rimonta quando cambia `fatta`, vedi `Azione`). Senza partita l'elenco si legge senza caselle.
// Bersagli da 44 px (`.touch` sull'etichetta), testo da 12 px, un nome per riga: «Carro» o «Carro (Agathion)».
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { impostaRequisitoVoce } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { chiaveRequisito, type RequisitoVoceDto } from '../../../shared/requisitiVoce';
import type { AzionePercorsoDto } from '../../types';
import { Ripiegabile } from '../shared/Ripiegabile';
import { idContatoreScorta, nomeRequisito } from '../../utils/requisitiVoce';

interface Props {
  a: AzionePercorsoDto;
  partitaId: number | null;
  /** La voce aggiornata dal server (dopo ogni cambio di casella). */
  onCambiata: (a: AzionePercorsoDto) => void;
}

/** L'elenco «In scorta» della voce (solo per le voci che hanno requisiti). */
export function RequisitiVoce({ a, partitaId, onCambiata }: Props) {
  const [occupate, setOccupate] = useState<ReadonlySet<string>>(new Set());
  const vivo = useRef(true);
  // le richieste partono una alla volta, in ordine: ogni risposta contiene gli effetti di tutte le precedenti, quindi con due caselle toccate di
  // seguito la voce mostrata è sempre quella più recente e nessuna risposta può riportarla indietro
  const coda = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const requisiti = a.requisiti;
  if (!requisiti?.length) return null;
  const conCaselle = partitaId !== null;
  const fatti = requisiti.filter((r) => r.fatto === true).length;
  const riepilogo = conCaselle ? `${fatti}/${requisiti.length}` : `${requisiti.length}`;
  const cambia = async (r: RequisitoVoceDto, fatto: boolean) => {
    if (partitaId === null) return;
    const chiave = chiaveRequisito(r.arcana, r.persona);
    setOccupate((s) => new Set(s).add(chiave));
    const richiesta = async () => {
      try {
        const agg = await impostaRequisitoVoce(partitaId, a.uid, r.arcana, r.persona, fatto);
        if (vivo.current) onCambiata(agg);
      } catch (err) {
        if (vivo.current) notifica('error', err instanceof Error ? err.message : 'Casella non aggiornata.');
      } finally {
        if (vivo.current) setOccupate((s) => { const n = new Set(s); n.delete(chiave); return n; });
      }
    };
    coda.current = coda.current.then(richiesta);
    await coda.current;
  };
  return (
    <>
      {/* il contatore per la casella di completamento: il suo nome non cambia, la descrizione dice quante caselle mancano */}
      {conCaselle && <span id={idContatoreScorta(a.uid)} className="sr-only">In scorta: {riepilogo}</span>}
      <Ripiegabile titolo="In scorta" riepilogo={riepilogo} apertaDiPartenza={!a.fatta}>
        <ul className="m-0 grid list-none grid-cols-1 gap-x-3 gap-y-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {requisiti.map((r) => {
            const chiave = chiaveRequisito(r.arcana, r.persona);
            const nome = nomeRequisito(r);
            return (
              <li key={chiave} className="min-w-0">
                {conCaselle
                  ? (
                    <label className="touch flex cursor-pointer items-center gap-2 testo-12 text-text">
                      <input type="checkbox" className="h-5 w-5 shrink-0" checked={r.fatto === true} disabled={occupate.has(chiave)} aria-label={nome}
                        onChange={(e) => void cambia(r, e.target.checked)} />
                      <span className="min-w-0 break-words">{nome}</span>
                    </label>
                  )
                  : <span className="touch flex items-center testo-12 text-text break-words">{nome}</span>}
              </li>
            );
          })}
        </ul>
      </Ripiegabile>
    </>
  );
}
