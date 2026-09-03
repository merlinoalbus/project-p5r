// ============================================================
// FusionePage — tabella degli Arcani e regole (il calcolatore arriva con la Fase 1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getRegoleFusione } from '../services/api';
import { useGlossarioStore } from '../stores/glossarioStore';
import { PageState } from '../components/shared/PageState';

/** Consultazione delle regole di fusione: combinazione di due arcani, matrice completa, ricette speciali, Demoni del Tesoro. */
export function FusionePage() {
  useDocumentTitle('Fusione');
  const glossario = useGlossarioStore((s) => s.glossario);
  const { dati, caricamento, errore, ricarica } = useCarica(() => getRegoleFusione(), []);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [vista, setVista] = useState<'coppia' | 'matrice' | 'speciali' | 'tesori'>('coppia');

  const nome = (chiave: string) => glossario?.arcani.find((x) => x.chiave === chiave)?.nome ?? chiave;
  const risultato = useMemo(() => {
    if (!dati || !a || !b) return null;
    if (a === b) return a === 'World' ? null : a;
    const r = dati.tabella.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));
    return r?.risultato ?? null;
  }, [dati, a, b]);

  const matrice = useMemo(() => {
    if (!dati) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const t of dati.tabella) {
      m.set(`${t.a}|${t.b}`, t.risultato);
      m.set(`${t.b}|${t.a}`, t.risultato);
    }
    return m;
  }, [dati]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold">Fusione — regole degli Arcani</h1>
      <p className="m-0 text-[13px] text-text-secondary">Consulta la combinazione degli arcani, le ricette speciali e i modificatori dei Demoni del Tesoro. Il calcolatore di fusione con Persona e livelli arriva con la Fase 1 della roadmap.</p>
      <div className="flex gap-1.5 flex-wrap">
        {([['coppia', 'Due arcani'], ['matrice', 'Matrice completa'], ['speciali', 'Ricette speciali'], ['tesori', 'Demoni del Tesoro']] as const).map(([k, l]) => (
          <button key={k} type="button" className={`chip touch ${vista === k ? 'chip--attivo' : ''}`} onClick={() => setVista(k)} aria-pressed={vista === k}>{l}</button>
        ))}
      </div>

      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {dati && vista === 'coppia' && (
          <div className="card flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <select className="form-input" value={a} onChange={(e) => setA(e.target.value)} aria-label="Primo arcano">
                <option value="">Primo arcano…</option>
                {dati.arcani.map((k) => <option key={k} value={k}>{nome(k)}</option>)}
              </select>
              <span className="text-center text-text-muted text-xl">+</span>
              <select className="form-input" value={b} onChange={(e) => setB(e.target.value)} aria-label="Secondo arcano">
                <option value="">Secondo arcano…</option>
                {dati.arcani.map((k) => <option key={k} value={k}>{nome(k)}</option>)}
              </select>
            </div>
            {a && b && (
              <div className="text-center py-4">
                {risultato ? (
                  <>
                    <div className="text-[12px] text-text-muted uppercase tracking-wide">Arcano risultante</div>
                    <div className="text-3xl font-black text-primary">{nome(risultato)}</div>
                    <div className="text-[13px] text-text-secondary mt-1">
                      {a === b ? 'Stesso arcano: il risultato è la Persona di livello più alto sotto la media dei due ingredienti (+1).' : 'Arcani diversi: il risultato è la prima Persona con livello ≥ media dei due ingredienti +1.'}
                    </div>
                  </>
                ) : (
                  <div className="text-error font-semibold">Questa combinazione non è possibile.</div>
                )}
              </div>
            )}
          </div>
        )}

        {dati && vista === 'matrice' && (
          <div className="card overflow-x-auto p-0">
            <table className="tabella text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-bg z-10">×</th>
                  {dati.arcani.map((k) => <th key={k}>{nome(k)}</th>)}
                </tr>
              </thead>
              <tbody>
                {dati.arcani.map((r) => (
                  <tr key={r}>
                    <th className="sticky left-0 bg-bg z-10 text-left">{nome(r)}</th>
                    {dati.arcani.map((c) => {
                      const v = r === c ? (r === 'World' ? null : r) : matrice.get(`${r}|${c}`) ?? null;
                      return <td key={c} className={v ? '' : 'text-text-muted'}>{v ? nome(v) : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dati && vista === 'speciali' && (
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {dati.speciali.map((r) => (
              <li key={r.risultato.id} className="card flex flex-wrap items-center gap-1 text-[13px]">
                {r.ingredienti.map((i, idx) => (
                  <span key={i.id} className="flex items-center gap-1">
                    <Link to={`/compendio/persona/${i.id}`} className="chip no-underline">{i.nome}</Link>
                    {idx < r.ingredienti.length - 1 && <span className="text-text-muted">+</span>}
                  </span>
                ))}
                <span className="text-text-muted mx-1">→</span>
                <Link to={`/compendio/persona/${r.risultato.id}`} className="chip chip--attivo no-underline">{r.risultato.nome}</Link>
              </li>
            ))}
          </ul>
        )}

        {dati && vista === 'tesori' && (
          <div className="card overflow-x-auto p-0">
            <p className="m-0 px-3 pt-3 text-[12px] text-text-secondary">Fondendo un Demone del Tesoro con una Persona, il risultato è la Persona dello stesso arcano spostata di tanti ranghi quanti indicati (+ verso l'alto, − verso il basso).</p>
            <table className="tabella text-[12px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-bg z-10">Arcano</th>
                  {dati.tesori.nomi.map((n) => <th key={n}>{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {dati.arcani.map((k) => (
                  <tr key={k}>
                    <th className="sticky left-0 bg-bg z-10 text-left">{nome(k)}</th>
                    {(dati.tesori.modificatori[k] ?? []).map((m, i) => (
                      <td key={i} className={m > 0 ? 'text-success font-semibold' : 'text-error font-semibold'}>{m > 0 ? `+${m}` : m}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageState>
    </div>
  );
}
