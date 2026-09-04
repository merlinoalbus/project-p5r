// ============================================================
// GuidaPage — indice della Guida a piastrelle illustrate (asset `guida/<sezione>` in arrivo con la 11.6, riserva vettoriale)
// ============================================================

import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { SEZIONI_GUIDA } from '../components/guida/sezioniGuida';

export function GuidaPage() {
  useDocumentTitle('Guida');
  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Guida" sottotitolo="La guida italiana allgamestaff resa consultabile in gioco, con lo stato della tua partita." />
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4" aria-label="Sezioni della guida">
        {SEZIONI_GUIDA.map((s) => (
          <li key={s.chiave} className="min-w-0">
            <Link to={s.to} className="card card--cliccabile piastrella piastrella-guida no-underline text-text flex flex-col gap-2 h-full">
              <AssetImg nome={`guida/${s.chiave}`} alt="" decorativa className="piastrella-guida__icona object-contain" fallback={<span className="piastrella-guida__riserva" aria-hidden="true">{s.icona}</span>} />
              <span className="font-display uppercase text-[20px] leading-none">{s.titolo}</span>
              <span className="text-[12px] text-text-secondary">{s.descrizione}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
