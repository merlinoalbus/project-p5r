// ============================================================
// InfoSalitaRango — a colpo d'occhio, per il Confidente scelto: la prossima abilità che si ottiene e i regali graditi in breve
// ============================================================
//
// Solo lettura, dal dettaglio del compendio già in memoria (`useDettaglioConfidente`, nessuna API nuova). L'abilità del rango N si ottiene
// raggiungendo N (la scheda del Confidente segna attive quelle con rango ≤ rango della partita): la prossima è quella del rango + 1.
// I regali: nome ed effetto, quelli già consegnati in questa partita in coda e sbarrati (stesso criterio della scheda del Confidente).
// I comandi per regalare stanno nel pannello («Regala»): qui nessun pulsante duplicato, solo il collegamento alla scheda completa.
// ============================================================

import { useDettaglioConfidente } from './useDettaglioConfidente';
import type { ConfidentePartitaDto, RegaloConfidenteDto } from '../../types';

/** Quanti regali mostrare in breve prima del «+ altri». */
const REGALI_VISIBILI = 4;

/** Se il regalo è già stato consegnato in questa partita (per oggetto del catalogo, altrimenti per nome). */
function consegnato(c: ConfidentePartitaDto, g: RegaloConfidenteDto): boolean {
  if (g.catalogo && c.regaliFattiCatalogo !== undefined) return c.regaliFattiCatalogo.includes(g.catalogo.chiave);
  return c.regaliFatti.includes(g.nomeStorico ?? g.nome);
}

/** Prossima abilità e regali graditi del Confidente; nulla finché il dettaglio non c'è (il caricamento lo mostra la sezione delle risposte). */
export function InfoSalitaRango({ c, onApriScheda }: { c: ConfidentePartitaDto; onApriScheda: () => void }) {
  const { dati } = useDettaglioConfidente(c.chiave);
  if (!dati) return null;
  const abilita = c.rango < 10 ? dati.abilita.filter((a) => a.rango === c.rango + 1) : [];
  const ordinati = [...dati.regali].sort((a, b) => Number(consegnato(c, a)) - Number(consegnato(c, b)));
  const visibili = ordinati.slice(0, REGALI_VISIBILI);
  const altri = ordinati.length - visibili.length;
  if (abilita.length === 0 && ordinati.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 testo-13" aria-label={`Per salire di rango: ${c.nome}`}>
      {abilita.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="testo-12 font-semibold uppercase tracking-[.06em] text-text-muted">Al rango {c.rango + 1} ottieni</span>
          {abilita.map((a) => (
            <p key={a.nome} className="m-0"><strong>{a.nome}</strong>{a.descrizione && <span className="text-text-secondary line-clamp-2"> — {a.descrizione}</span>}</p>
          ))}
        </div>
      )}
      {ordinati.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="testo-12 font-semibold uppercase tracking-[.06em] text-text-muted">Regali graditi</span>
          <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
            {visibili.map((g, i) => {
              const fatto = consegnato(c, g);
              return (
                <li key={`${g.ordine}-${i}`} className={`chip ${fatto ? 'line-through opacity-60' : ''}`} title={fatto ? 'Già consegnato in questa partita' : undefined}>
                  {g.nome}{g.effetto ? ` · ${g.effetto}` : ''}{fatto && <span className="sr-only"> (già consegnato)</span>}
                </li>
              );
            })}
          </ul>
          {/* gli altri regali stanno nella Scheda completa del cassetto: niente collegamento che porta fuori */}
          {altri > 0 && <button type="button" onClick={onApriScheda} className="touch inline-flex items-center testo-12 text-primary-testo underline underline-offset-2 self-start bg-transparent border-0 p-0 cursor-pointer">+ altri {altri} nella scheda completa</button>}
        </div>
      )}
    </section>
  );
}
