// ============================================================
// GlossarioPage — termini della localizzazione italiana ufficiale (dalla guida) per categoria
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getTermini } from '../services/api';
import { PageState, EmptyState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { IconChevronLeft } from '../components/shared/icons';
import type { TermineDto } from '../types';

const NOMI_CATEGORIA: Record<string, string> = {
  battaglia: 'Battaglia',
  negoziazione: 'Negoziazione',
  fusione: 'Fusione',
  velluto: 'Stanza di Velluto',
  doti: 'Doti sociali',
  confidenti: 'Confidenti',
  luoghi: 'Luoghi',
  oggetti: 'Oggetti',
  calendario: 'Calendario e tempo',
  altro: 'Altro',
};

/** Glossario italiano ↔ inglese dei termini di gioco, con ricerca e filtro per categoria. */
export function GlossarioPage() {
  useDocumentTitle('Glossario');
  const { dati, caricamento, errore, ricarica } = useCarica(() => getTermini(), []);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');

  const categorie = useMemo(() => [...new Set((dati ?? []).map((t) => t.categoria))], [dati]);
  const filtrati = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return (dati ?? [])
      .filter((t) => (!categoria || t.categoria === categoria) && (!testo || t.nome.toLowerCase().includes(testo) || t.chiave.toLowerCase().includes(testo) || (t.definizione ?? '').toLowerCase().includes(testo)))
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome, 'it'));
  }, [dati, q, categoria]);

  const perCategoria = useMemo(() => {
    const m = new Map<string, TermineDto[]>();
    for (const t of filtrati) m.set(t.categoria, [...(m.get(t.categoria) ?? []), t]);
    return m;
  }, [filtrati]);

  return (
    <div className="flex flex-col gap-4">
      <Link to="/compendio" className="btn btn-ghost self-start -ml-2 no-underline"><IconChevronLeft size={18} /> Compendio</Link>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="m-0 text-2xl font-bold">Glossario dei termini</h1>
        <span className="text-[13px] text-text-muted">{dati ? `${filtrati.length} di ${dati.length}` : ''}</span>
      </div>
      <p className="m-0 text-[13px] text-text-secondary">Termini della localizzazione italiana ufficiale di Persona 5 Royal con il corrispondente inglese, ricavati dalla guida allgamestaff.it. Modificabili in Impostazioni → Traduzioni (ambito «termine»).</p>
      <div className="flex flex-wrap gap-2 items-center">
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca in italiano o inglese…" />
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" className={`chip touch ${categoria === '' ? 'chip--attivo' : ''}`} onClick={() => setCategoria('')} aria-pressed={categoria === ''}>Tutte</button>
          {categorie.map((c) => (
            <button key={c} type="button" className={`chip touch ${categoria === c ? 'chip--attivo' : ''}`} onClick={() => setCategoria(c)} aria-pressed={categoria === c}>{NOMI_CATEGORIA[c] ?? c}</button>
          ))}
        </div>
      </div>
      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {dati && dati.length === 0 ? (
          <EmptyState title="Glossario non ancora disponibile" hint="I termini vengono caricati con il dataset: questa versione non ne contiene." />
        ) : filtrati.length === 0 ? (
          <EmptyState title="Nessun termine corrisponde alla ricerca" />
        ) : (
          [...perCategoria.entries()].map(([cat, termini]) => (
            <section key={cat} className="card">
              <h2 className="m-0 mb-2 text-[15px] font-semibold">{NOMI_CATEGORIA[cat] ?? cat}</h2>
              <dl className="m-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {termini.map((t) => (
                  <div key={`${t.categoria}/${t.chiave}`} className="flex flex-col">
                    <dt className="font-semibold text-[14px]">{t.nome} <span className="text-[12px] font-normal text-text-muted">({t.chiave})</span></dt>
                    {t.definizione && <dd className="m-0 text-[13px] text-text-secondary">{t.definizione}</dd>}
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </PageState>
    </div>
  );
}
