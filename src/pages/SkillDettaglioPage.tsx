// ============================================================
// SkillDettaglioPage — scheda di una skill: chi la impara e come si ottiene
// ============================================================

import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getSkill } from '../services/api';
import { PageState } from '../components/shared/PageState';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';

/** Scheda skill. */
export function SkillDettaglioPage() {
  const { id } = useParams();
  const skillId = Number(id);
  const { dati: s, inPrimoCaricamento, errore, ricarica } = useCarica(() => getSkill(skillId), [skillId]);
  useDocumentTitle(s ? s.nomeIt : 'Skill');

  return (
    <PageState isLoading={inPrimoCaricamento} error={errore} onRetry={() => void ricarica()}>
      {s && (
        <div className="flex flex-col gap-4">
          <IntestazioneScheda ripiego="/skill" titolo={s.nomeIt}
            chip={<>
              {s.nomeIt !== s.nome && <span className="testo-13 text-text-muted" title="Nome nella localizzazione inglese">{s.nome}</span>}
              <ElementoChip elemento={s.elemento} nome={s.elementoNome} />
              <span className="chip">{s.costo.testo}</span>
            </>}
            azioni={<MenuModifica cosa={`la skill «${s.nomeIt}»`}>
              <ModificaGuida tipo="skill" chiave={String(s.id)} cosa={`la skill «${s.nomeIt}»`} etichetta="Testi della skill" onSalvato={() => void ricarica()} />
              {/* la resa italiana dell'effetto è condivisa da tutte le skill con lo stesso testo: si modifica solo dalle Traduzioni */}
              <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Traduzione dell’effetto"
                to={`/impostazioni?${new URLSearchParams({ traduzione: 'effettoSkill', q: s.effetto }).toString()}`} />
            </MenuModifica>}>
            <p className="m-0 testo-15 min-w-0">{s.effettoNome}</p>
          </IntestazioneScheda>
          {(s.fonteCartaNome || s.negoziazioneNome || s.unicaNome || s.fontiEsecuzione.length > 0) && <div className="card flex flex-col gap-2">
            <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 testo-13">
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
          </div>}

          <section className="card">
            <TitoloSezione className="mb-2">Persona che la imparano ({s.persone.length})</TitoloSezione>
            {s.persone.length === 0 ? (
              <p className="m-0 testo-13 text-text-muted">Nessuna Persona del compendio la apprende per livello.</p>
            ) : (
              <ul className="m-0 p-0 list-none grid gap-1 grid-cols-1 sm:grid-cols-2">
                {s.persone.map((p) => (
                  <li key={p.id}>
                    <Link to={`/compendio/persona/${p.id}`} className="flex items-center gap-2 py-1.5 no-underline text-text hover:text-primary-testo">
                      <span className="w-9 text-right testo-12 text-text-muted">Liv. {p.livelloPersona}</span>
                      <span className="font-semibold">{p.nome}</span>
                      <span className="chip">{p.arcanaNome}</span>
                      <span className="testo-12 text-text-secondary ml-auto">{p.livello === 0 ? 'innata' : `a liv. ${p.livello}`}</span>
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
