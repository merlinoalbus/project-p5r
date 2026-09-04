// ============================================================
// ConfidentiPartita — i 23 Confidenti come «poster»: ritratto a tutta altezza, badge del rango, anello di avanzamento,
// note della risposta → punti verso il rango successivo
// ============================================================
//
// Nel gioco ogni risposta mostra 1–3 note: valgono 5/10/15 punti base; un regalo gradito 50, un'uscita 10.
// Moltiplicatori cumulativi: Persona dello stesso arcano in scorta ×1,5 (rilevata dalla scorta della partita,
// modificabile per card), esami (1º ×1,5, top 10 ×1,2), invito accettato subito via SMS ×1,2.
// La conversione la fa il backend (`noteRisposta`, `regalo`, `uscita`, `bonusArcano`, `esame`, `invito`).
// ============================================================

import { useState } from 'react';
import { aggiornaConfidente, getConfidentiPartita } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { Modal } from '../shared/Modal';
import { AssetImg } from '../shared/AssetImg';
import { AnelloAvanzamento } from '../shared/AnelloAvanzamento';
import { slug } from '../../../shared/slug';
import type { BonusEsame, ConfidentePartitaDto, ModificaConfidente } from '../../types';
import { anteprimaPunti, formattaPunti } from '../../utils/punti';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconApri, IconIndietro, IconLucchettoAperto, IconLucchettoChiuso, IconMaschera, IconMatita, IconMedaglia, IconMessaggio, IconPodio, IconRegalo, IconUscita } from '../shared/iconeGuida';

interface Props {
  partitaId: number;
}

/** Griglia «poster» dei Confidenti: rango con +/−, note della risposta con moltiplicatori, anello verso il rango successivo, sblocco, note, immagini. */
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
      <div className="flex flex-col gap-1.5 mb-3" role="group" aria-label="Moltiplicatori dei punti">
        <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-muted">Moltiplicatori · valgono per tutti i punti registrati</span>
        <div className="flex flex-wrap gap-2">
          <PulsanteVisivo attivo={esame === 'top10'} icona={<IconPodio size={24} />} titolo="Esami top 10" dettaglio="×1,2 con i compagni di scuola" onClick={() => setEsame((e) => (e === 'top10' ? null : 'top10'))} aria-label="Esami top 10 ×1,2" title="Fra i primi dieci agli ultimi esami: punti ×1,2 con i compagni di scuola fino all'esame successivo" />
          <PulsanteVisivo attivo={esame === 'primo'} icona={<IconMedaglia size={24} />} titolo="Esami 1º" dettaglio="×1,5 con i compagni di scuola" onClick={() => setEsame((e) => (e === 'primo' ? null : 'primo'))} aria-label="Esami 1º ×1,5" title="Primo del corso agli ultimi esami: punti ×1,5 con i compagni di scuola fino all'esame successivo" />
          <PulsanteVisivo attivo={invito} icona={<IconMessaggio size={24} />} titolo="Invito SMS" dettaglio="×1,2 su tutta l'uscita" onClick={() => setInvito((v) => !v)} aria-label="Invito SMS ×1,2" title="Invito accettato subito via SMS la sera prima: tutti i punti guadagnati durante l'uscita valgono ×1,2" />
        </div>
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
          const quota = aPunti ? Math.min(1, c.punti / (c.puntiNecessari ?? 1)) : c.rango === 10 ? 1 : 0;
          return (
            <li key={c.chiave} className={`card poster relative overflow-hidden flex gap-3 ${c.sbloccato ? '' : 'opacity-75'}`}>
              <AssetImg nome={`arcani/${slug(c.arcana)}-senza-testo`} alt="" decorativa className="poster__filigrana" fallback={null} />
              <div className="relative shrink-0 self-start">
                <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={128} forma="carta" adatta="copri" modificabile />
                <div className="poster__rango">
                  <AnelloAvanzamento quota={quota} dimensione={62} spessore={4} etichetta={aPunti ? `Progresso di ${c.nome} verso il rango ${c.rango + 1}` : undefined}>
                    <AssetImg
                      nome={c.rango === 0 ? null : c.rango === 10 ? 'ui/rango-max' : `ui/rango-${c.rango}`}
                      alt={c.rango === 10 ? 'Rango MAX' : `Rango ${c.rango}`}
                      className="h-11 w-11 object-contain"
                      fallback={<span className={`font-display text-[26px] leading-none tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>}
                    />
                  </AnelloAvanzamento>
                </div>
              </div>
              <div className="relative flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 font-display uppercase text-[22px] leading-none tracking-wide truncate" title={c.nome}>{c.nome}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="chip">{c.arcanaNome}</span>
                      {c.regaliFatti.length > 0 && <span className="text-[12px] text-text-muted">{c.regaliFatti.length} {c.regaliFatti.length === 1 ? 'regalo consegnato' : 'regali consegnati'}</span>}
                    </div>
                  </div>
                  <CollegamentoVisivo to={`/confidenti/${c.chiave}`} tono="fantasma" compatto className="shrink-0" icona={<IconApri size={20} />} titolo="Scheda" aria-label={`Scheda di ${c.nome}: risposte migliori, abilità, regali`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] uppercase tracking-wide text-text-muted flex-1">Rango {c.rango === 10 ? 'MAX' : c.rango}</span>
                  <button type="button" className="btn btn-secondary btn-sm w-12" disabled={occ || c.rango === 0} onClick={() => void salva(c.chiave, { rango: c.rango - 1 })} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
                  <button type="button" className="btn btn-primary btn-sm w-12" disabled={occ || c.rango === 10} onClick={() => void salva(c.chiave, { rango: c.rango + 1 })} aria-label={`Rango di ${c.nome} più uno`}>+</button>
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
                      <strong className="tabular-nums font-display text-[18px] leading-none">{formattaPunti(c.punti)}</strong>
                      <span className="text-text-secondary">/ {c.puntiNecessari} — {c.mancanti === 0 ? <strong className="text-primary">soglia raggiunta</strong> : <>mancano <strong className="text-text">{formattaPunti(c.mancanti ?? 0)}</strong></>}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PulsanteVisivo
                        attivo={bonus}
                        compatto
                        icona={<AssetImg nome={`arcani/icona/${slug(c.arcana)}`} alt="" decorativa className="h-6 w-6 object-contain" fallback={<IconMaschera size={20} />} />}
                        titolo={`Persona ${c.arcanaNome}`}
                        dettaglio={c.personaArcanoInScorta ? '×1,5 · in scorta' : '×1,5 · attiva a mano'}
                        onClick={() => setBonusForzato((b) => ({ ...b, [c.chiave]: !bonus }))}
                        title={c.personaArcanoInScorta ? `Nella scorta c'è una Persona ${c.arcanaNome}: bonus ×1,5 attivo` : `Nessuna Persona ${c.arcanaNome} in scorta: attiva il bonus a mano se la possiedi`}
                      />
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
                      <PulsanteVisivo className="flex-1 min-w-[120px]" icona={<IconRegalo size={24} />} titolo="Regalo" dettaglio={`+${formattaPunti(anteprimaPunti(50, bonus, esame, invito))} punti`} disabled={occ} onClick={() => void salva(c.chiave, { regalo: true, bonusArcano: bonus, esame: esame ?? undefined, invito })} aria-label={`${c.nome}: regalo gradito (${formattaPunti(anteprimaPunti(50, bonus, esame, invito))} punti)`} />
                      <PulsanteVisivo className="flex-1 min-w-[120px]" icona={<IconUscita size={24} />} titolo="Uscita" dettaglio={`+${formattaPunti(anteprimaPunti(10, bonus, esame, invito))} punti`} disabled={occ} onClick={() => void salva(c.chiave, { uscita: true, bonusArcano: bonus, esame: esame ?? undefined, invito })} aria-label={`${c.nome}: uscita insieme (${formattaPunti(anteprimaPunti(10, bonus, esame, invito))} punti)`} />
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconIndietro size={20} />} titolo={`Annulla ultimo${ultimo[c.chiave] > 0 ? ` (−${formattaPunti(ultimo[c.chiave])})` : ''}`} disabled={occ || !(ultimo[c.chiave] > 0)} onClick={() => void salva(c.chiave, { deltaPunti: -(ultimo[c.chiave] ?? 0) })} aria-label={`${c.nome}: annulla l'ultimo incremento`} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-auto">
                  <PulsanteVisivo attivo={c.sbloccato} compatto icona={c.sbloccato ? <IconLucchettoAperto size={20} /> : <IconLucchettoChiuso size={20} />} titolo={c.sbloccato ? 'Sbloccato' : 'Bloccato'} dettaglio={c.rango > 0 ? 'dal rango 1' : undefined} disabled={occ || c.rango > 0} onClick={() => void salva(c.chiave, { sbloccato: !c.sbloccato })} aria-label={`${c.nome}: ${c.sbloccato ? 'sbloccato' : 'bloccato'}`} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconMatita size={20} />} titolo={c.note ? 'Note' : 'Aggiungi note'} onClick={() => { setModifica(c); setNote(c.note); }} />
                </div>
                {c.note && <p className="m-0 text-[12px] text-text-secondary whitespace-pre-wrap line-clamp-2">{c.note}</p>}
              </div>
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
