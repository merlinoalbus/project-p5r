// ============================================================
// GuidaPage — indice della Guida a piastrelle illustrate (asset `guida/<sezione>` in arrivo con la 11.6, riserva vettoriale)
// ============================================================

import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { SEZIONI_GUIDA } from '../components/guida/sezioniGuida';
import { TestoNote } from '../components/shared/TestoNote';
import { usePartitaStore } from '../stores/partitaStore';
import { useCovoNellaPartita } from '../hooks/useCovoNellaPartita';

/** Indice della guida: una piastrella per ogni sezione di `SEZIONI_GUIDA`, con l'illustrazione `guida/<chiave>` (o l'icona di riserva se l'asset non c'è), titolo e descrizione, che porta alla sezione. */
export function GuidaPage() {
  useDocumentTitle('Guida');
  // 2026-10-29: con una partita prima del 5 maggio il Covo non c'è ancora e la sua piastrella non compare (esito dell'Area del Covo)
  const attiva = usePartitaStore((s) => s.attiva);
  const covo = useCovoNellaPartita(attiva?.id, attiva);
  // si nasconde solo quando il server dice «non ancora» (in attesa, senza partita o con la lettura fallita resta visibile)
  const covoAperto = covo?.disponibile !== false;
  const sezioni = SEZIONI_GUIDA.filter((s) => s.chiave !== 'covo' || covoAperto);
  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Guida" sottotitolo="La guida italiana allgamestaff resa consultabile in gioco, con lo stato della tua partita." />
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4" aria-label="Sezioni della guida">
        {sezioni.map((s) => (
          <li key={s.chiave} className="min-w-0">
            <Link to={s.to} className="card card--cliccabile piastrella piastrella-guida no-underline text-text flex flex-col gap-2 h-full">
              <AssetImg nome={`guida/${s.chiave}`} alt="" decorativa className="piastrella-guida__icona object-contain" fallback={<span className="piastrella-guida__riserva" aria-hidden="true">{s.icona}</span>} />
              <span className="font-display uppercase testo-20 leading-none">{s.titolo}</span>
              <span className="testo-12 text-text-secondary"><TestoNote testo={s.descrizione} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
