// ============================================================
// OrariEditor — gli orari di un negozio come valori: giorni, fasce, pioggia, nota
// ============================================================
//
// Al posto della frase «Sera, dal lunedi al venerdi; assente nei giorni di pioggia»: sette
// interruttori per i giorni (nessuno acceso = tutti i giorni), due per le fasce (nessuno = giorno
// e sera), una levetta per la chiusura con la pioggia e una nota per ciò che non è un orario.
// Sotto, la frase che l'app mostrerà, scritta da `descriviOrari`: la stessa per ogni valore uguale.
// ============================================================

import { GIORNI_SETTIMANA } from '../../../shared/condizioniSpillo';
import { FASCE_ORARIO, descriviOrari, type FasciaOrario, type GiornoChiave, type OrariNegozio } from '../../../shared/orariNegozio';

interface Props { valore: OrariNegozio; onCambia: (o: OrariNegozio) => void; disabilitato?: boolean }

export function Interruttori<T extends string>({ etichetta, scelte, opzioni, onCambia, disabilitato }: { etichetta: string; scelte: T[]; opzioni: ReadonlyArray<{ chiave: T; nome: string }>; onCambia: (v: T[]) => void; disabilitato?: boolean }) {
  const attive = new Set(scelte);
  return (
    <div role="group" aria-label={etichetta} className="orari-editor__gruppo">
      {opzioni.map((o) => (
        <button key={o.chiave} type="button" className={`chip touch orari-editor__chip ${attive.has(o.chiave) ? 'chip--attivo' : ''}`} aria-pressed={attive.has(o.chiave)} disabled={disabilitato}
          onClick={() => onCambia(attive.has(o.chiave) ? scelte.filter((s) => s !== o.chiave) : [...scelte, o.chiave])}>{o.nome}</button>
      ))}
    </div>
  );
}

export function OrariEditor({ valore, onCambia, disabilitato }: Props) {
  // l'ordine salvato è quello del catalogo, non quello dei clic
  const ordina = <T extends string>(scelte: T[], catalogo: ReadonlyArray<{ chiave: T }>) => catalogo.map((c) => c.chiave).filter((c) => scelte.includes(c));
  return (
    <fieldset className="regole-editor orari-editor flex flex-col gap-2">
      <legend>Orari</legend>
      <p className="m-0 text-[12px] text-text-muted">Nessun giorno acceso vuol dire tutti i giorni; nessuna fascia, giorno e sera.</p>
      <Interruttori etichetta="Giorni di apertura" scelte={valore.giorni} disabilitato={disabilitato} opzioni={GIORNI_SETTIMANA.map((g) => ({ chiave: g.chiave as GiornoChiave, nome: g.nome }))} onCambia={(giorni) => onCambia({ ...valore, giorni: ordina(giorni, GIORNI_SETTIMANA as ReadonlyArray<{ chiave: GiornoChiave }>) })} />
      <Interruttori etichetta="Fasce di apertura" scelte={valore.fasce} disabilitato={disabilitato} opzioni={FASCE_ORARIO.map((f) => ({ chiave: f.chiave as FasciaOrario, nome: f.nome }))} onCambia={(fasce) => onCambia({ ...valore, fasce: ordina(fasce, FASCE_ORARIO as ReadonlyArray<{ chiave: FasciaOrario }>) })} />
      <label className="flex items-center gap-2 text-[13px] touch">
        <input type="checkbox" className="w-5 h-5" checked={valore.chiusoConPioggia} disabled={disabilitato} onChange={(e) => onCambia({ ...valore, chiusoConPioggia: e.target.checked })} />
        Chiuso nei giorni di pioggia
      </label>
      <label className="editor-mappa__campo">
        Nota (ciò che non è un orario)
        <input className="form-input" type="text" maxLength={300} value={valore.nota ?? ''} disabled={disabilitato} onChange={(e) => onCambia({ ...valore, nota: e.target.value.trim() ? e.target.value : null })} placeholder="Per esempio: in date specifiche del calendario" />
      </label>
      <p className="m-0 text-[12px] text-text-muted" role="status">Verrà mostrato così: <strong>{descriviOrari(valore)}</strong></p>
    </fieldset>
  );
}
