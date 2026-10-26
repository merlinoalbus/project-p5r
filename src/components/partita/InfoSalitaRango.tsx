// ============================================================
// InfoSalitaRango — a colpo d'occhio, per il Confidente scelto: la prossima abilità che si ottiene e i regali graditi in breve
// ============================================================
//
// Solo lettura, dal dettaglio del compendio già in memoria (`useDettaglioConfidente`, nessuna API nuova). L'abilità del rango N si ottiene
// raggiungendo N (la scheda del Confidente segna attive quelle con rango ≤ rango della partita): la prossima è quella del rango + 1.
// I regali: nome e reazione (+3/+2/+1, ondata 5), nell'ordine dell'elenco. Un oggetto del catalogo già dato resta com'è, nel suo posto: il
// regalo si può ridare e vale gli stessi punti (decisione 21 (c); revisione dei lotti D e D2). Si sbarra soltanto una vecchia riga senza
// oggetto, la spunta per nome già segnata: lo stesso criterio della scheda del Confidente.
// I comandi per regalare stanno nel pannello («Regala»): qui nessun pulsante duplicato, solo il collegamento alla scheda completa.
// ============================================================

import { useDettaglioConfidente } from './useDettaglioConfidente';
import type { ConfidentePartitaDto, RegaloConfidenteDto } from '../../types';
import { fraIGraditi, testoReazione } from '../../../shared/regali';

/** Quanti regali mostrare in breve prima del «+ altri». */
const REGALI_VISIBILI = 4;

/** Se una vecchia riga senza oggetto del catalogo è segnata come consegnata in questa partita (la spunta per nome). Un oggetto del catalogo
 *  non è mai «già consegnato»: si può ridare (decisione 21 (c)), e le sue consegne stanno nella scheda del Confidente. */
function spuntaPerNome(c: ConfidentePartitaDto, g: RegaloConfidenteDto): boolean {
  return !g.catalogo && c.regaliFatti.includes(g.nomeStorico ?? g.nome);
}

/** Prossima abilità e regali graditi del Confidente; nulla finché il dettaglio non c'è (il caricamento lo mostra la sezione delle risposte). */
export function InfoSalitaRango({ c, onApriScheda }: { c: ConfidentePartitaDto; onApriScheda: () => void }) {
  const { dati } = useDettaglioConfidente(c.chiave);
  if (!dati) return null;
  const abilita = c.rango < 10 ? dati.abilita.filter((a) => a.rango === c.rango + 1) : [];
  // revisione dei lotti D e D2: le righe a +1 valgono quanto ogni altro regalo e non sono «graditi» (stesso criterio della scheda del Confidente)
  // in coda va solo la spunta per nome già segnata: un oggetto del catalogo già dato si può ridare e resta al suo posto
  const ordinati = dati.regali.filter(fraIGraditi).sort((a, b) => Number(spuntaPerNome(c, a)) - Number(spuntaPerNome(c, b)));
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
              const fatto = spuntaPerNome(c, g);
              return (
                <li key={`${g.ordine}-${i}`} className={`chip ${fatto ? 'line-through opacity-60' : ''}`} title={fatto ? 'Già consegnato in questa partita' : undefined}>
                  {g.nome}{g.reazione !== null ? <span className="tabular-nums"> · <span className="sr-only">reazione </span>{testoReazione(g.reazione)}</span> : null}{fatto && <span className="sr-only"> (già consegnato)</span>}
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
