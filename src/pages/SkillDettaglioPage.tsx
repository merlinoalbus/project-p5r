// ============================================================
// SkillDettaglioPage — scheda di una skill: chi la impara e come si ottiene
// ============================================================

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getSkill } from '../services/api';
import { PageState } from '../components/shared/PageState';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { IconChevronLeft } from '../components/shared/icons';

/** Scheda skill. */
export function SkillDettaglioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const skillId = Number(id);
  const { dati: s, caricamento, errore, ricarica } = useCarica(() => getSkill(skillId), [skillId]);
  useDocumentTitle(s ? s.nome : 'Skill');

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      {s && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}>
            <IconChevronLeft size={18} /> Indietro
          </button>
          <div className="card flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="m-0 text-2xl font-bold">{s.nome}</h1>
              <ElementoChip elemento={s.elemento} nome={s.elementoNome} />
              <span className="chip">{s.costo.testo}</span>
            </div>
            <p className="m-0 text-[15px]">{s.effettoNome}</p>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              {s.fonteCartaNome && (<><dt className="text-text-muted">Carta abilità</dt><dd className="m-0">{s.fonteCartaNome}</dd></>)}
              {s.negoziazioneNome && (<><dt className="text-text-muted">Negoziazione</dt><dd className="m-0">{s.negoziazioneNome}</dd></>)}
              {s.unicaNome && (<><dt className="text-text-muted">Esclusiva</dt><dd className="m-0">{s.unicaNome}</dd></>)}
              {s.fontiEsecuzione.length > 0 && (
                <>
                  <dt className="text-text-muted">Carta da esecuzione di</dt>
                  <dd className="m-0 flex flex-wrap gap-1">{s.fontiEsecuzione.map((p) => <Link key={p.id} to={`/compendio/persona/${p.id}`} className="chip no-underline">{p.nome}</Link>)}</dd>
                </>
              )}
            </dl>
          </div>

          <section className="card">
            <h2 className="m-0 mb-2 text-[15px] font-semibold">Persona che la imparano ({s.persone.length})</h2>
            {s.persone.length === 0 ? (
              <p className="m-0 text-[13px] text-text-muted">Nessuna Persona del compendio la apprende per livello.</p>
            ) : (
              <ul className="m-0 p-0 list-none grid gap-1 grid-cols-1 sm:grid-cols-2">
                {s.persone.map((p) => (
                  <li key={p.id}>
                    <Link to={`/compendio/persona/${p.id}`} className="flex items-center gap-2 py-1.5 no-underline text-text hover:text-primary">
                      <span className="w-9 text-right text-[12px] text-text-muted">Liv. {p.livelloPersona}</span>
                      <span className="font-semibold">{p.nome}</span>
                      <span className="chip">{p.arcanaNome}</span>
                      <span className="text-[12px] text-text-secondary ml-auto">{p.livello === 0 ? 'innata' : `a liv. ${p.livello}`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageState>
  );
}
