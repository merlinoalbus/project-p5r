// ============================================================
// ConfidentiPartita — i 23 Confidenti: immagini, rango, note della risposta → punti verso il rango successivo
// ============================================================
//
// Nel gioco ogni risposta mostra 1–3 note: valgono 5/10/15 punti base; un regalo gradito 50, un'uscita 10.
// Moltiplicatori cumulativi: Persona dello stesso arcano in scorta ×1,5 (rilevata dalla scorta della partita,
// modificabile per card), esami (1º ×1,5, top 10 ×1,2), invito accettato subito via SMS ×1,2.
// La conversione la fa il backend (`noteRisposta`, `regalo`, `uscita`, `bonusArcano`, `esame`, `invito`).
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaConfidente, getConfidentiPartita } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { Modal } from '../shared/Modal';
import { AssetImg } from '../shared/AssetImg';
import type { BonusEsame, ConfidentePartitaDto, ModificaConfidente } from '../../types';
import { anteprimaPunti, formattaPunti } from '../../utils/punti';

interface Props {
  partitaId: number;
}

/** Griglia dei Confidenti: rango con +/−, note della risposta con moltiplicatori, barra verso il rango successivo, sblocco, note, immagini. */
export function ConfidentiPartita({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getConfidentiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [modifica, setModifica] = useState<ConfidentePartitaDto | null>(null);
  const [note, setNote] = useState('');
  // Moltiplicatori globali (valgono per tutte le card finché l'utente non li cambia).
  const [esame, setEsame] = useState<BonusEsame | null>(null);
  const [invito, setInvito] = useState(false);
  // Bonus arcano per card: predefinito dalla scorta, modificabile a mano (chiave → valore forzato).
  const [bonusForzato, setBonusForzato] = useState<Record<string, boolean>>({});
  // Ultimo incremento per card, per il pulsante "Annulla ultimo".
  const [ultimo, setUltimo] = useState<Record<string, number>>({});

  const bonusArcanoDi = (c: ConfidentePartitaDto) => bonusForzato[c.chiave] ?? c.personaArcanoInScorta;

  const salva = async (chiave: string, cambio: ModificaConfidente): Promise<ConfidentePartitaDto | null> => {
    if (!dati) return null;
    setOccupato(chiave);
    try {
      const prima = dati.find((c) => c.chiave === chiave);
      const agg = await aggiornaConfidente(partitaId, chiave, cambio);
      imposta(dati.map((c) => (c.chiave === chiave ? agg : c)));
      if (prima && cambio.rango === undefined && cambio.punti === undefined) {
        const delta = Math.round((agg.punti - prima.punti) * 100) / 100;
        if (delta > 0) setUltimo((u) => ({ ...u, [chiave]: delta }));
        else if (delta < 0) setUltimo((u) => ({ ...u, [chiave]: 0 }));
      }
      if (prima && agg.rango !== prima.rango) setUltimo((u) => ({ ...u, [chiave]: 0 }));
      if (prima && agg.puntiNecessari !== null && agg.puntiNecessari > 0 && agg.mancanti === 0 && (prima.mancanti ?? 1) > 0) {
        notifica('success', `${agg.nome}: punti sufficienti per il rango ${agg.rango + 1}! Passa del tempo insieme per salire di rango.`);
      }
      return agg;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      return null;
    } finally {
      setOccupato(null);
    }
  };

  const salvaNote = async () => {
    if (!modifica) return;
    const esito = await salva(modifica.chiave, { note });
    if (esito) setModifica(null);
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-[13px]">
        <span className="text-text-muted">Moltiplicatori attivi:</span>
        <button type="button" className={`chip touch ${esame === 'top10' ? 'chip--attivo' : ''}`} onClick={() => setEsame((e) => (e === 'top10' ? null : 'top10'))} aria-pressed={esame === 'top10'} title="Fra i primi dieci agli ultimi esami: punti ×1,2 fino all'esame successivo">Esami top 10 ×1,2</button>
        <button type="button" className={`chip touch ${esame === 'primo' ? 'chip--attivo' : ''}`} onClick={() => setEsame((e) => (e === 'primo' ? null : 'primo'))} aria-pressed={esame === 'primo'} title="Primo del corso agli ultimi esami: punti ×1,5 fino all'esame successivo">Esami 1º ×1,5</button>
        <button type="button" className={`chip touch ${invito ? 'chip--attivo' : ''}`} onClick={() => setInvito((v) => !v)} aria-pressed={invito} title="Invito accettato subito via SMS la sera prima: tutti i punti guadagnati durante quell'uscita ×1,2">Invito SMS ×1,2</button>
      </div>
      <p className="m-0 mb-3 text-[12px] text-text-muted">
        Le note mostrate in gioco valgono 5, 10 o 15 punti; il bonus della Persona dello stesso arcano (×1,5) viene proposto in base alla scorta della partita e si può forzare su ogni Confidente.
        Gli esami valgono solo per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi.
      </p>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {dati?.map((c) => {
          const bonus = bonusArcanoDi(c);
          const occ = occupato === c.chiave;
          const aPunti = c.rango < 10 && c.puntiNecessari !== null && c.puntiNecessari > 0;
          return (
            <li key={c.chiave} className={`card flex flex-col gap-3 ${c.sbloccato ? '' : 'opacity-75'}`}>
              <div className="flex gap-3 items-start">
                <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={96} modificabile />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="font-semibold text-[16px] leading-tight">{c.nome}</span>
                  <span className="chip self-start">{c.arcanaNome}</span>
                  {c.regaliFatti.length > 0 && <span className="text-[12px] text-text-muted">{c.regaliFatti.length} {c.regaliFatti.length === 1 ? 'regalo consegnato' : 'regali consegnati'}</span>}
                </div>
                <ImmagineEntita ambito="arcana" chiave={c.arcana} etichetta={c.arcanaNome} dimensione={56} forma="carta" />
              </div>
              <Link to={`/confidenti/${c.chiave}`} className="btn btn-secondary btn-sm self-start no-underline">Scheda: risposte migliori, abilità, regali →</Link>
              <div className="flex items-center gap-2">
                <span className="text-[12px] uppercase tracking-wide text-text-muted flex-1">Rango</span>
                <button type="button" className="btn btn-secondary w-14" disabled={occ || c.rango === 0} onClick={() => void salva(c.chiave, { rango: c.rango - 1 })} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
                <span className="w-14 flex items-center justify-center">
                  <AssetImg
                    nome={c.rango === 0 ? null : c.rango === 10 ? 'ui/rango-max' : `ui/rango-${c.rango}`}
                    alt={c.rango === 10 ? 'Rango MAX' : `Rango ${c.rango}`}
                    className="h-11 w-11 object-contain"
                    fallback={<span className={`text-2xl font-black tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>}
                  />
                </span>
                <button type="button" className="btn btn-primary w-14" disabled={occ || c.rango === 10} onClick={() => void salva(c.chiave, { rango: c.rango + 1 })} aria-label={`Rango di ${c.nome} più uno`}>+</button>
              </div>

              {c.rango === 0 && (
                <p className="m-0 text-[13px] text-text-muted">Confidente non ancora sbloccato: porta il rango a 1 quando lo incontri in gioco; le note e i punti mancanti compaiono dal primo rango che li richiede.</p>
              )}
              {c.rango > 0 && c.rango < 10 && c.puntiNecessari === 0 && (
                <p className="m-0 text-[13px] text-text-muted">Il passaggio al rango {c.rango + 1} non dipende dai punti (storia, richiesta o dote sociale): nessuna nota da contare.</p>
              )}
              {c.rango > 0 && c.rango < 10 && c.puntiNecessari === null && (
                <p className="m-0 text-[13px] text-text-muted">Progressione senza punti (storia, richieste di Mementos o fusioni): nessuna nota da contare per questo Confidente.</p>
              )}
              {c.rango === 10 && <p className="m-0 text-[13px] text-text-muted">Rango massimo raggiunto.</p>}
              {aPunti && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[13px] flex-wrap">
                    <span className="text-text-muted">Punti verso il rango {c.rango + 1}:</span>
                    <strong className="tabular-nums">{formattaPunti(c.punti)}</strong>
                    <span className="text-text-secondary">/ {c.puntiNecessari} — {c.mancanti === 0 ? <strong className="text-primary">soglia raggiunta</strong> : <>mancano <strong className="text-text">{formattaPunti(c.mancanti ?? 0)}</strong></>}</span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={c.puntiNecessari ?? 0} aria-valuenow={Math.min(c.punti, c.puntiNecessari ?? 0)} aria-label={`Progresso di ${c.nome} verso il rango ${c.rango + 1}`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((c.punti / (c.puntiNecessari ?? 1)) * 100))}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      className={`chip touch ${bonus ? 'chip--attivo' : ''}`}
                      onClick={() => setBonusForzato((b) => ({ ...b, [c.chiave]: !bonus }))}
                      aria-pressed={bonus}
                      title={c.personaArcanoInScorta ? `Nella scorta c'è una Persona ${c.arcanaNome}: bonus ×1,5 attivo` : `Nessuna Persona ${c.arcanaNome} in scorta: attiva il bonus a mano se la possiedi`}
                    >
                      ×1,5 Persona {c.arcanaNome}{c.personaArcanoInScorta ? ' (in scorta)' : ''}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([1, 2, 3] as const).map((n) => {
                      const valore = anteprimaPunti(n * 5, bonus, esame, invito);
                      return (
                        <button key={n} type="button" className="btn btn-primary btn-sm flex-1 min-w-[72px]" disabled={occ} onClick={() => void salva(c.chiave, { noteRisposta: n, bonusArcano: bonus, esame: esame ?? undefined, invito })} aria-label={`${c.nome}: risposta da ${n} ${n === 1 ? 'nota' : 'note'} (${formattaPunti(valore)} punti)`}>
                          <span aria-hidden="true">{'♪'.repeat(n)}</span> <span className="text-[12px] opacity-90">+{formattaPunti(valore)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="btn btn-secondary btn-sm flex-1 min-w-[96px]" disabled={occ} onClick={() => void salva(c.chiave, { regalo: true, bonusArcano: bonus, esame: esame ?? undefined, invito })} aria-label={`${c.nome}: regalo gradito (${formattaPunti(anteprimaPunti(50, bonus, esame, invito))} punti)`}>
                      Regalo +{formattaPunti(anteprimaPunti(50, bonus, esame, invito))}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm flex-1 min-w-[96px]" disabled={occ} onClick={() => void salva(c.chiave, { uscita: true, bonusArcano: bonus, esame: esame ?? undefined, invito })} aria-label={`${c.nome}: uscita insieme (${formattaPunti(anteprimaPunti(10, bonus, esame, invito))} punti)`}>
                      Uscita +{formattaPunti(anteprimaPunti(10, bonus, esame, invito))}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={occ || !(ultimo[c.chiave] > 0)} onClick={() => void salva(c.chiave, { deltaPunti: -(ultimo[c.chiave] ?? 0) })} aria-label={`${c.nome}: annulla l'ultimo incremento`}>
                      Annulla ultimo{ultimo[c.chiave] > 0 ? ` (−${formattaPunti(ultimo[c.chiave])})` : ''}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-[13px] text-text-secondary touch">
                  <input type="checkbox" className="w-5 h-5" checked={c.sbloccato} disabled={occ || c.rango > 0} onChange={(e) => void salva(c.chiave, { sbloccato: e.target.checked })} />
                  Sbloccato
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setModifica(c); setNote(c.note); }}>
                  {c.note ? 'Note ✎' : 'Aggiungi note'}
                </button>
              </div>
              {c.note && <p className="m-0 text-[12px] text-text-secondary whitespace-pre-wrap line-clamp-2">{c.note}</p>}
            </li>
          );
        })}
      </ul>
      <Modal
        titolo={modifica ? `Note — ${modifica.nome}` : 'Note'}
        aperta={modifica !== null}
        onChiudi={() => setModifica(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
            <button type="button" className="btn btn-primary" disabled={occupato !== null} onClick={() => void salvaNote()}>Salva</button>
          </>
        }
      >
        <textarea className="form-input min-h-[140px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promemoria: prossimi eventi, regali graditi, risposte migliori…" />
      </Modal>
    </PageState>
  );
}
