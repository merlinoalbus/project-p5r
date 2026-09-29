// ============================================================
// SceltaAreePlanimetria — le aree della guida contenute in una planimetria
// ============================================================
//
// **Una planimetria può contenere più aree della guida** (richiesta dell'utente, 2026-09-29): la
// tavola del primo piano del castello mostra insieme corridoio, sala e scalone, che la guida
// racconta come tre aree. Prima si sceglieva un'area sola da un menu a tendina.
//
// Qui si spuntano tutte quelle che la tavola contiene, nell'ordine della guida. Resta vero che
// **un'area ha una sola planimetria** (decisione del 2026-09-18): un'area già legata a un'altra
// tavola lo dice accanto al nome, e spuntarla la sposta qui — lo fa il server, e la finestra lo
// scrive prima di salvare, così nessun legame sparisce senza che lo si sia visto.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  /** Come si chiama la planimetria nella finestra: stanza e versione. */
  nome: string;
  /** Tutte le aree del Palazzo, in ordine di guida. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** Le aree che la planimetria contiene adesso. */
  scelte: string[];
  /** Per ogni area legata a **un'altra** planimetria, il nome di quella. */
  altrove: ReadonlyMap<string, string>;
  occupato: boolean;
  onSalva: (aree: string[]) => void;
  onChiudi: () => void;
}

export function SceltaAreePlanimetria({ nome, aree, scelte, altrove, occupato, onSalva, onChiudi }: Props) {
  const [spuntate, setSpuntate] = useState(() => new Set(scelte));
  const cambia = (k: string) => setSpuntate((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const spostate = aree.filter((a) => spuntate.has(a.chiave) && altrove.has(a.chiave));
  const invariata = spuntate.size === scelte.length && scelte.every((k) => spuntate.has(k));

  return (
    <Modal titolo={`Aree della guida · ${nome}`} aperta onChiudi={onChiudi}
      azioni={<>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onChiudi} />
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || invariata}
          onClick={() => onSalva(aree.filter((a) => spuntate.has(a.chiave)).map((a) => a.chiave))} />
      </>}>
      <p className="m-0 text-[12px] text-text-muted">
        Spunta tutte le aree che questa planimetria contiene: le vedrai in quest’ordine, quello della guida. Un’area ha una sola planimetria: se è già su un’altra, spuntarla la sposta qui.
      </p>
      {/* Sopra l'elenco e sempre montato: si vede senza scorrere, e un lettore di schermo annuncia la regione viva. */}
      <p className="m-0 text-[12px] text-text-secondary empty:hidden" role="status">
        {spostate.length > 0 && <>{spostate.length === 1 ? 'Un’area lascia la planimetria dove stava' : `${spostate.length} aree lasciano la planimetria dove stavano`}: {spostate.map((a) => a.nome).join(', ')}.</>}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Aree del Palazzo">
        {aree.map((a) => {
          const dove = altrove.get(a.chiave);
          const qui = spuntate.has(a.chiave);
          return (
            <li key={a.chiave}>
              <label className={`touch flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 ${qui ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={qui} onChange={() => cambia(a.chiave)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{a.ordine + 1}. {a.nome}</span>
                  {dove && <span className="block text-[11px] leading-tight text-text-muted">{qui ? `si sposta qui da «${dove}»` : `ora su «${dove}»`}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
