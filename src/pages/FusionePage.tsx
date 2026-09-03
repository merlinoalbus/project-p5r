// ============================================================
// FusionePage — tabella degli Arcani e regole (il calcolatore arriva con la Fase 1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getPersone, getPossedute, getRegoleFusione } from '../services/api';
import { useGlossarioStore } from '../stores/glossarioStore';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { useAsset } from '../stores/assetStore';
import { Calcolatore } from '../components/fusione/Calcolatore';
import { RicettePersona } from '../components/fusione/RicettePersona';

type Vista = 'calcolatore' | 'ricette' | 'con' | 'coppia' | 'matrice' | 'speciali' | 'tesori';
const VISTE: Array<[Vista, string]> = [
  ['calcolatore', 'Calcolatore A + B'], ['ricette', 'Come ottenere'], ['con', 'Fusioni con…'],
  ['coppia', 'Due arcani'], ['matrice', 'Matrice completa'], ['speciali', 'Ricette speciali'], ['tesori', 'Demoni del Tesoro'],
];

/** Calcolatore di fusione (A + B, ricette per ottenere una Persona, fusioni con una Persona) e regole degli Arcani. */
export function FusionePage() {
  useDocumentTitle('Fusione');
  const glossario = useGlossarioStore((s) => s.glossario);
  const attiva = usePartitaStore((s) => s.attiva);
  const [params, setParams] = useSearchParams();
  const { dati, caricamento, errore, ricarica } = useCarica(() => getRegoleFusione(), []);
  const persone = useCarica(() => getPersone(), []);
  const scorta = useCarica(() => (attiva ? getPossedute(attiva.id) : Promise.resolve([])), [attiva?.id]);
  const inScorta = useMemo(() => new Set((scorta.dati ?? []).map((p) => p.personaId)), [scorta.dati]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const vistaParam = params.get('vista');
  const vista: Vista = VISTE.some(([k]) => k === vistaParam) ? (vistaParam as Vista) : params.has('ricette') ? 'ricette' : params.has('con') ? 'con' : 'calcolatore';
  const setVista = (v: Vista) => setParams((p) => { const n = new URLSearchParams(p); n.set('vista', v); return n; });
  const idParam = (k: string) => { const v = Number(params.get(k)); return Number.isInteger(v) && v > 0 ? v : undefined; };
  const sfondoVelluto = useAsset('sfondi/stanza-velluto');

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
      <h1
        className={`m-0 text-2xl font-bold ${sfondoVelluto ? 'rounded-lg px-4 py-6 bg-cover bg-center [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]' : ''}`}
        style={sfondoVelluto ? { backgroundImage: `linear-gradient(rgba(11,11,14,0.35), rgba(11,11,14,0.75)), url("${sfondoVelluto}")` } : undefined}
      >
        Fusione
      </h1>
      <p className="m-0 text-[13px] text-text-secondary">
        Fondi due Persona, scopri come ottenerne una o cosa produce con le altre; i contenuti scaricabili considerati sono quelli della partita attiva{attiva ? ` («${attiva.nome}», protagonista al livello ${attiva.livelloProtagonista})` : ' (nessuna: solo contenuti base)'}. Le Persona nella scorta sono evidenziate.
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {VISTE.map(([k, l]) => (
          <button key={k} type="button" className={`chip touch ${vista === k ? 'chip--attivo' : ''}`} onClick={() => setVista(k)} aria-pressed={vista === k}>{l}</button>
        ))}
      </div>

      <PageState isLoading={caricamento || persone.caricamento} error={errore ?? persone.errore} onRetry={() => { void ricarica(); void persone.ricarica(); }}>
        {persone.dati && vista === 'calcolatore' && (
          <Calcolatore persone={persone.dati} partitaId={attiva?.id ?? null} inScorta={inScorta} inizialeA={idParam('a')} inizialeB={idParam('b')} />
        )}
        {persone.dati && vista === 'ricette' && (
          <RicettePersona key={`per-${idParam('ricette') ?? 0}`} persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inScorta={inScorta} modalita="per" inizialeId={idParam('ricette')} />
        )}
        {persone.dati && vista === 'con' && (
          <RicettePersona key={`con-${idParam('con') ?? 0}`} persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inScorta={inScorta} modalita="con" inizialeId={idParam('con')} />
        )}

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
                    <Link to={`/compendio/persona/${i.id}`} className="chip touch no-underline">{i.nome}</Link>
                    {idx < r.ingredienti.length - 1 && <span className="text-text-muted">+</span>}
                  </span>
                ))}
                <span className="text-text-muted mx-1">→</span>
                <Link to={`/compendio/persona/${r.risultato.id}`} className="chip chip--attivo touch no-underline">{r.risultato.nome}</Link>
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
