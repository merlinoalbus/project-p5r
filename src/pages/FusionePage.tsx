// ============================================================
// FusionePage — tabella degli Arcani e regole (il calcolatore arriva con la Fase 1)
// ============================================================

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiornaPartita, getPersone, getPossedute, getRegoleFusione, getVelluto } from '../services/api';
import { useGlossarioStore } from '../stores/glossarioStore';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { Calcolatore } from '../components/fusione/Calcolatore';
import { RicettePersona } from '../components/fusione/RicettePersona';
import { PianiFusione } from '../components/fusione/PianiFusione';
import { CercaSkill } from '../components/fusione/CercaSkill';
import { PannelloVelluto } from '../components/fusione/PannelloVelluto';
import { ForcaIsolamento } from '../components/fusione/ForcaIsolamento';
import { CicliFusione } from '../components/fusione/CicliFusione';
import { notifica } from '../stores/notificationStore';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PersonaChip } from '../components/fusione/PersonaChip';
import { OperatoreRicetta } from '../components/fusione/RicettaRiga';
import { IconaScheda, type ChiaveScheda } from '../components/shared/IconaAzione';

type Vista = 'calcolatore' | 'ricette' | 'con' | 'piani' | 'skill' | 'cicli' | 'forca' | 'coppia' | 'matrice' | 'speciali' | 'tesori';
const VISTE: Array<[Vista, string, ChiaveScheda]> = [
  ['calcolatore', 'Calcolatore A + B', 'fusione-calcolatore'], ['ricette', 'Come ottenere', 'fusione-ricette'], ['con', 'Fusioni con…', 'fusione-con'], ['piani', 'Piano di fusione', 'fusione-piani'],
  ['skill', 'Cerca per skill', 'fusione-skill'], ['cicli', 'Cicli di fusione', 'fusione-cicli'], ['forca', 'Forca e Isolamento', 'fusione-forca'], ['speciali', 'Ricette speciali', 'fusione-speciali'],
];
/** Viste di calcolo interne (tabelle degli arcani e dei Demoni del Tesoro): non per l'utente finale, raggiungibili con `?strumenti=1`. */
const VISTE_STRUMENTI: Array<[Vista, string, ChiaveScheda]> = [['coppia', 'Due arcani', 'fusione-calcolatore'], ['matrice', 'Matrice completa', 'fusione-calcolatore'], ['tesori', 'Demoni del Tesoro', 'fusione-speciali']];

/** Calcolatore di fusione (A + B, ricette per ottenere una Persona, fusioni con una Persona) e regole degli Arcani. */
export function FusionePage() {
  useDocumentTitle('Fusione');
  const glossario = useGlossarioStore((s) => s.glossario);
  const attiva = usePartitaStore((s) => s.attiva);
  const aggiornaLocale = usePartitaStore((s) => s.aggiornaLocale);
  const [params, setParams] = useSearchParams();
  const { dati, caricamento, errore, ricarica } = useCarica(() => getRegoleFusione(), []);
  const persone = useCarica(() => getPersone(), []);
  const scorta = useCarica(() => (attiva ? getPossedute(attiva.id) : Promise.resolve([])), [attiva?.id]);
  const inScorta = useMemo(() => new Set((scorta.dati ?? []).map((p) => p.personaId)), [scorta.dati]);
  const perId = useMemo(() => new Map((persone.dati ?? []).map((p) => [p.id, p])), [persone.dati]);
  const completa = (x: { id: number; nome: string; nomeIt: string }) => perId.get(x.id) ?? x;
  const velluto = useCarica(() => (attiva ? getVelluto(attiva.id) : Promise.resolve(null)), [attiva?.id, attiva?.allarmeAttivo, attiva?.updatedAt]);
  const cambiaAllarme = async (allarmeAttivo: boolean) => {
    if (!attiva) return;
    try {
      aggiornaLocale(await aggiornaPartita(attiva.id, { allarmeAttivo }));
      notifica('info', allarmeAttivo ? 'Allarme delle fusioni segnato come attivo.' : 'Allarme delle fusioni spento.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const vistaParam = params.get('vista');
  const strumenti = params.get('strumenti') === '1';
  const visteMostrate = strumenti ? [...VISTE, ...VISTE_STRUMENTI] : VISTE;
  const vista: Vista = visteMostrate.some(([k]) => k === vistaParam) ? (vistaParam as Vista) : params.has('ricette') ? 'ricette' : params.has('con') ? 'con' : params.has('piani') ? 'piani' : 'calcolatore';
  const setVista = (v: Vista) => setParams((p) => { const n = new URLSearchParams(p); n.set('vista', v); return n; });
  const skillParam = (params.get('skill') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const idParam = (k: string) => { const v = Number(params.get(k)); return Number.isInteger(v) && v > 0 ? v : undefined; };

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
      <IntestazionePagina titolo="Fusione" sottotitolo={<>Fondi due Persona, scopri come ottenerne una o cosa produce con le altre; i contenuti scaricabili considerati sono quelli della partita attiva{attiva ? ` («${attiva.nome}», protagonista al livello ${attiva.livelloProtagonista})` : ' (nessuna: solo contenuti base)'}. Le Persona nella scorta sono evidenziate.</>} />
      <PannelloVelluto velluto={velluto.dati ?? null} onCambiaAllarme={(v) => void cambiaAllarme(v)} />
      <div className="flex gap-1.5 flex-wrap">
        {visteMostrate.map(([k, l, icona]) => (
          <button key={k} type="button" className={`chip chip--icona touch ${vista === k ? 'chip--attivo' : ''}`} onClick={() => setVista(k)} aria-pressed={vista === k}><IconaScheda chiave={icona} dimensione={16} />{l}</button>
        ))}
      </div>

      <PageState isLoading={caricamento || persone.caricamento} error={errore ?? persone.errore} onRetry={() => { void ricarica(); void persone.ricarica(); }}>
        {persone.dati && vista === 'calcolatore' && (
          <Calcolatore persone={persone.dati} partitaId={attiva?.id ?? null} inScorta={inScorta} inizialeA={idParam('a')} inizialeB={idParam('b')} scorta={scorta.dati ?? undefined} onScortaCambiata={() => void scorta.ricarica()} />
        )}
        {persone.dati && vista === 'ricette' && (
          <RicettePersona key={`per-${idParam('ricette') ?? 0}`} persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inScorta={inScorta} modalita="per" inizialeId={idParam('ricette')} />
        )}
        {persone.dati && vista === 'piani' && (
          <PianiFusione key={`piani-${idParam('piani') ?? 0}-${params.get('skill') ?? ''}`} persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inizialeId={idParam('piani')} skillInizialiIds={skillParam} obiettivoId={idParam('obiettivo')} />
        )}
        {persone.dati && vista === 'skill' && (
          <CercaSkill persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inScorta={inScorta} />
        )}
        {persone.dati && vista === 'cicli' && (
          <CicliFusione key={`cicli-${idParam('cicli') ?? 0}`} persone={persone.dati} partitaId={attiva?.id ?? null} livelloProtagonista={attiva?.livelloProtagonista ?? null} inScorta={inScorta} inizialeId={idParam('cicli')} />
        )}
        {persone.dati && vista === 'forca' && (
          <ForcaIsolamento persone={persone.dati} partitaId={attiva?.id ?? null} velluto={velluto.dati ?? null} />
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
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13px] text-text-secondary">{dati.speciali.length} ricette speciali: fusioni a più ingredienti prescritte dal gioco, in ordine di livello del risultato.</p>
            <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 xl:grid-cols-2" aria-label="Ricette speciali">
              {[...dati.speciali].sort((x, y) => (perId.get(x.risultato.id)?.livello ?? 0) - (perId.get(y.risultato.id)?.livello ?? 0) || x.risultato.nomeIt.localeCompare(y.risultato.nomeIt)).map((r) => (
                <li key={r.risultato.id} className="card flex flex-col gap-2 text-[13px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PersonaChip p={completa(r.risultato)} evidenza inScorta={inScorta.has(r.risultato.id)} />
                    <span className="text-[12px] text-text-muted">{r.ingredienti.length} ingredienti{r.ingredienti.every((i) => inScorta.has(i.id)) ? ' · tutti in scorta' : ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l-2 border-border">
                    {r.ingredienti.map((i, idx) => (
                      <span key={i.id} className="flex items-center gap-1.5">
                        <PersonaChip p={completa(i)} inScorta={inScorta.has(i.id)} />
                        {idx < r.ingredienti.length - 1 && <OperatoreRicetta tipo="piu" />}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dati && vista === 'tesori' && (
          <div className="card overflow-x-auto p-0">
            <p className="m-0 px-3 pt-3 text-[12px] text-text-secondary">Fondendo un Demone del Tesoro con una Persona, il risultato è la Persona dello stesso arcano spostata di tanti ranghi quanti indicati (+ verso l'alto, − verso il basso).</p>
            <table className="tabella text-[12px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-bg z-10">Arcano</th>
                  {dati.tesori.nomi.map((n, i) => <th key={n} title={n}>{dati.tesori.nomiIt[i] ?? n}</th>)}
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
