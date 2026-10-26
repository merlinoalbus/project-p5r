// ============================================================
// SceltaAcquistoAlternativo — alla spunta, quale set hai comprato: uno solo, o nessuno (L13, decisione 4: le televendite)
// ============================================================
//
// Richiesta dell'utente (2026-10-26): sulla voce delle televendite «non posso effettivamente scegliere». Gli articoli in alternativa della voce
// (Set A o Set B: il catalogo dice che non si comprano insieme) diventano una scelta della spunta, come l'esito di un turno (`SceltaEsito`):
// una scheda per articolo con nome, prezzo e contenuto (che va a capo, mai troncato), e «Nessuno». Un articolo che il giorno della voce non si
// può comprare (per esempio l'altro set è già comprato) resta raggiungibile da tastiera ma spento, con il motivo scritto e collegato
// (`aria-describedby`): il server lo rifiuterebbe comunque. Due colonne da 641 px in su (tablet e desktop), una sul telefono; bersagli ≥ 44 px.
// ============================================================

import { useId } from 'react';
import type { SceltaEsitoVoceDto } from '../../../shared/esitiAttivita';
import { formatoYen, REGOLA_ALTERNATIVE } from '../../../shared/effettiVoce';
import { testoContenuto } from '../../../shared/riepilogoEffetti';

type Scelta = Extract<SceltaEsitoVoceDto, { tipo: 'alternativa' }>;

interface Props {
  s: Scelta;
  /** L'UID dell'effetto scelto, null = «Nessuno», undefined = non ancora scelto. */
  scelto: string | null | undefined;
  occupato: boolean;
  onScegli: (effettoUid: string | null) => void;
}

/** La scelta fra gli articoli in alternativa di un gruppo della voce: vedi l'intestazione del file. */
export function SceltaAcquistoAlternativo({ s, scelto, occupato, onScegli }: Props) {
  const prefisso = useId();
  const titolo = `${s.negozioNome ?? 'Acquisto'}: quale hai comprato?`;
  return (
    <span className="flex w-full flex-col gap-1.5" role="group" aria-labelledby={`${prefisso}-titolo`}>
      {/* la regola detta in un modo solo, come il riepilogo e l'editor della voce (`REGOLA_ALTERNATIVE`, rilievo L3 della revisione UX) */}
      <span id={`${prefisso}-titolo`} className="text-text-secondary text-pretty">{titolo} {REGOLA_ALTERNATIVE}.</span>
      <span className="grid w-full grid-cols-1 gap-1.5 min-[641px]:grid-cols-2">
        {s.opzioni.map((o) => {
          const idMotivo = `${prefisso}-motivo-${o.effettoUid}`;
          const contenuto = testoContenuto(o.contenuto);
          // «¥1.680» come il riepilogo «Il gioco dà» e l'editor della stessa voce (rilievo della revisione UX: qui era «1680 ¥»)
          const prezzo = o.articolo.prezzo === null ? 'senza prezzo' : formatoYen(o.articolo.prezzo * o.quantita);
          const attivo = scelto === o.effettoUid;
          return (
            // `self-stretch`: `button.chip` ha `align-self:start` (src/tailwind.css, livello `components`, che le utilità superano); qui le due
            // schede affiancate (da 641 px) prendono l'altezza della riga, anche con contenuti di lunghezza diversa (rilievo della revisione UX)
            <button key={o.effettoUid} type="button" disabled={occupato}
              className={`chip touch w-full self-stretch flex-col items-start justify-start gap-0.5 text-left ${attivo ? 'chip--attivo' : ''} ${!o.disponibile ? 'cursor-not-allowed' : ''}`}
              aria-pressed={attivo} aria-disabled={!o.disponibile ? true : undefined} aria-describedby={!o.disponibile ? idMotivo : undefined}
              aria-label={`${o.articolo.nome}${o.quantita > 1 ? ` ×${o.quantita}` : ''}, ${prezzo}${contenuto ? `; contiene ${contenuto}` : ''}${!o.disponibile ? '; non si può comprare' : ''}`}
              onClick={() => { if (o.disponibile) onScegli(o.effettoUid); }}>
              {/* spenta: si attenua ciò che non si può scegliere, mai il motivo, che è l'informazione della scheda e resta a pieno contrasto */}
              <span className={`flex w-full flex-wrap items-baseline justify-between gap-x-2 ${!o.disponibile ? 'opacity-60' : ''}`}>
                <span className="font-semibold break-words text-pretty">{o.articolo.nome}{o.quantita > 1 ? ` ×${o.quantita}` : ''}</span>
                <span className="tabular-nums">{prezzo}</span>
              </span>
              {contenuto && <span className={`testo-12 text-text-secondary break-words text-pretty ${!o.disponibile ? 'opacity-60' : ''}`}>{contenuto}</span>}
              {!o.disponibile && o.motivo && <span id={idMotivo} className="testo-12 text-text-secondary break-words text-pretty">{o.motivo}</span>}
            </button>
          );
        })}
      </span>
      <span className="flex">
        <button type="button" className={`chip touch ${scelto === null ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={scelto === null} onClick={() => onScegli(null)}>Nessuno</button>
      </span>
    </span>
  );
}
