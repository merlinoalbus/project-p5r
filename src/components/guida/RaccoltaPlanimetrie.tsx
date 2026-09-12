// ============================================================
// RaccoltaPlanimetrie — i collezionabili delle planimetrie di un Palazzo, con «Raccolto» in un tocco
// ============================================================
//
// La percentuale del Palazzo conta i collezionabili sulle planimetrie (forzieri, forzieri rari,
// semi, tesori): qui si vedono e si segnano senza aprire il visore. Ogni planimetria è una riga
// con la sua barra e il collegamento alla mappa; sotto, i suoi spilli con la spunta. I raccolti
// stanno nascosti finché non si chiede «Anche i raccolti».
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaSpilloRaccolto } from '../../services/api/mappe';
import { notifica } from '../../stores/notificationStore';
import type { SpilloRaccoltaDto } from '../../types';

export interface PlanimetriaRaccolta { chiave: string; nome: string; n: number; presi: number | null; spilli: SpilloRaccoltaDto[] }

interface Props {
  planimetrie: PlanimetriaRaccolta[];
  partitaId: number | null;
  /** Chiamato con lo spillo aggiornato: la pagina aggiorna i suoi conteggi. */
  onRaccolto: (spilloId: number, raccolto: boolean) => void;
  etichetta?: string;
  /** Una riga sotto il titolo (perché si vede tutto il Palazzo e non l'area). */
  nota?: string;
  /** Che cosa dire quando non c'è niente da raccogliere (dipende da che cosa si sta guardando). */
  vuoto?: string;
}

/** Il nome della mappa senza il prefisso del Palazzo («Palazzo di Kamoshida › Torre» → «Torre»). */
const nomeBreve = (nome: string) => nome.split(' › ').slice(1).join(' › ') || nome;

export function RaccoltaPlanimetrie({ planimetrie, partitaId, onRaccolto, etichetta = 'Da raccogliere', nota, vuoto = 'Niente da raccogliere sulle planimetrie di quest’area.' }: Props) {
  const [mostraRaccolti, setMostraRaccolti] = useState(false);
  const [occupati, setOccupati] = useState<Record<number, boolean>>({});
  const totale = planimetrie.reduce((s, p) => s + p.n, 0);
  const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
  const conCollezionabili = planimetrie.filter((p) => p.n > 0);
  const cambia = async (s: SpilloRaccoltaDto, raccolto: boolean) => {
    if (!partitaId) return;
    setOccupati((o) => ({ ...o, [s.id]: true }));
    try { await impostaSpilloRaccolto(partitaId, s.id, raccolto); onRaccolto(s.id, raccolto); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
    finally { setOccupati((o) => ({ ...o, [s.id]: false })); }
  };
  if (conCollezionabili.length === 0) return <p className="m-0 text-[12px] text-text-muted" role="status">{vuoto}</p>;
  return (
    <div className="flex flex-col gap-2" aria-label={etichetta}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">{etichetta} · {partitaId ? Math.max(0, totale - presi) : totale}</h3>
        {partitaId && presi > 0 && <button type="button" className={`chip touch text-[11px] ${mostraRaccolti ? 'chip--attivo' : ''}`} aria-pressed={mostraRaccolti} onClick={() => setMostraRaccolti((v) => !v)}>Anche i raccolti ({presi})</button>}
      </div>
      {nota && <p className="m-0 text-[11px] text-text-muted">{nota}</p>}
      {partitaId && totale > 0 && <div className="flex items-center gap-2">
        <span className="visore-mappa__progresso h-1.5 flex-1" role="progressbar" aria-label={`${etichetta}: raccolti`} aria-valuemin={0} aria-valuemax={totale} aria-valuenow={presi}>
          <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((presi / totale) * 100)}%` }} />
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-text-muted">{presi}/{totale}</span>
      </div>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {conCollezionabili.map((p) => {
          const visibili = p.spilli.filter((s) => mostraRaccolti || !s.raccolto);
          return (
            <li key={p.chiave} className="flex flex-col gap-1 rounded-md bg-white/[0.04] px-2 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <Link to={`/guida/mappe/${encodeURIComponent(p.chiave)}`} className="touch inline-flex items-center font-semibold">{nomeBreve(p.nome)}</Link>
                <span className="text-[11px] tabular-nums text-text-muted">{p.presi !== null ? `${p.presi}/${p.n}` : p.n}</span>
              </div>
              {visibili.length > 0 && (
                <ul className="m-0 flex list-none flex-col p-0">
                  {visibili.map((s) => { const omonimiTutti = p.spilli.filter((x) => x.nome === s.nome); const numero = omonimiTutti.indexOf(s) + 1; const omonimi = omonimiTutti.length > 1; return (
                    <li key={s.id} className="flex items-center gap-2 text-[12px]">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.colore }} aria-hidden="true" />
                      <span className={`min-w-0 flex-1 ${s.raccolto ? 'line-through text-text-muted' : ''}`}>{s.nome}{omonimi ? ` ${numero}` : ''}</span>
                      {partitaId
                        ? <label className="touch flex items-center gap-1.5 text-[11px]"><input type="checkbox" className="h-5 w-5" checked={s.raccolto === true} disabled={!!occupati[s.id]} onChange={(e) => void cambia(s, e.target.checked)} aria-label={`${s.nome} ${numero} di ${nomeBreve(p.nome)} raccolto`} />Raccolto</label>
                        : null}
                    </li>
                  ); })}
                </ul>
              )}
              {visibili.length === 0 && <span className="text-[11px] text-text-muted">Tutto raccolto.</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
