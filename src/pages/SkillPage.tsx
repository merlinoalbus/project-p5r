// ============================================================
// SkillPage — elenco delle 525 skill con ricerca ed elemento (client-side)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getSkills } from '../services/api';
import { useGlossarioStore } from '../stores/glossarioStore';
import { PageState, EmptyState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { ORDINE_ELEMENTI_SKILL, coloreElemento } from '../utils/elementi';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { IconaAzione } from '../components/shared/IconaAzione';

/** Elenco skill: ricerca su nome ed effetto italiano, filtro per elemento. */
export function SkillPage() {
  useDocumentTitle('Skill');
  const glossario = useGlossarioStore((s) => s.glossario);
  const { dati, caricamento, errore, ricarica } = useCarica(() => getSkills(), []);
  const [q, setQ] = useState('');
  const [elemento, setElemento] = useState('');

  const filtrate = useMemo(() => {
    if (!dati) return [];
    const testo = q.trim().toLowerCase();
    return dati.filter((s) =>
      (!elemento || s.elemento === elemento)
      && (!testo || s.nome.toLowerCase().includes(testo) || s.nomeIt.toLowerCase().includes(testo) || s.effettoNome.toLowerCase().includes(testo)),
    );
  }, [dati, q, elemento]);

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina
        titolo="Skill"
        sottotitolo="Tutte le abilità con effetto, costo ed elemento, e le Persona che le apprendono."
        azioni={<span className="text-[13px] text-text-muted">{dati ? `${filtrate.length} di ${dati.length}` : ''}</span>}
      />
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca per nome o effetto…" />
      <FilaScorrevole role="group" aria-label="Filtro per elemento">
        <button type="button" className={`chip chip--icona touch ${elemento === '' ? 'chip--attivo' : ''}`} onClick={() => setElemento('')} aria-pressed={elemento === ''}><IconaAzione chiave="tutti" dimensione={14} />Tutti</button>
        {ORDINE_ELEMENTI_SKILL.map((el) => (
          <button
            key={el}
            type="button"
            className="chip chip--icona touch"
            style={elemento === el ? { borderColor: coloreElemento(el), color: coloreElemento(el), background: `color-mix(in srgb, ${coloreElemento(el)} 16%, transparent)` } : undefined}
            onClick={() => setElemento(el)}
            aria-pressed={elemento === el}
          >
            <AssetImg nome={`elementi/${el}`} alt="" decorativa className="w-5 h-5 object-contain" fallback={<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: coloreElemento(el) }} aria-hidden="true" />} />
            {glossario?.elementiSkill[el] ?? el}
          </button>
        ))}
      </FilaScorrevole>

      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {filtrate.length === 0 ? (
          <EmptyState title="Nessuna skill corrisponde alla ricerca" />
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light card py-0">
            {filtrate.map((s) => (
              <li key={s.id}>
                <Link to={`/skill/${s.id}`} className="flex items-center gap-3 py-2.5 no-underline text-text hover:text-primary">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.nomeIt}</span>
                      {s.nomeIt !== s.nome && <span className="text-[12px] text-text-muted">{s.nome}</span>}
                      <ElementoChip elemento={s.elemento} nome={s.elementoNome} piccolo />
                      <span className="text-[12px] text-text-muted">{s.costo.testo}</span>
                    </div>
                    <div className="text-[13px] text-text-secondary">{s.effettoNome}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageState>
    </div>
  );
}
