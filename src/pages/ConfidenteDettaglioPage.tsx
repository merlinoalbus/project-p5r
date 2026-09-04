// ============================================================
// ConfidenteDettaglioPage — scheda completa di un Confidente: abilità per rango, risposte migliori, regali, disponibilità (Fase 6.1)
// ============================================================

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getConfidenteDettaglio, getConfidentiPartita, impostaRegaloFatto, confermaRequisitoConfidente } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { SemaforiRango } from '../components/partita/SemaforiRango';
import { IconChevronLeft } from '../components/shared/icons';
import type { DialogoConfidenteDto } from '../types';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';

/** Un dialogo di rango: scelte in ordine, con le migliori evidenziate (punti massimi), le romantiche e gli avvisi. */
export function DialogoRango({ d, aperto, onToggle }: { d: DialogoConfidenteDto; aperto: boolean; onToggle: () => void }) {
  const max = Math.max(0, ...d.scelte.map((s) => s.punti ?? 0));
  return (
    <li className="border border-border-light rounded-lg">
      <button type="button" className="w-full text-left px-3 py-2 flex items-center gap-2 touch" onClick={onToggle} aria-expanded={aperto}>
        <span className="font-semibold">Rango {d.etichetta}</span>
        <span className="text-[12px] text-text-muted">{d.note}</span>
        <span className="ml-auto text-[12px] text-text-muted">{d.scelte.length} {d.scelte.length === 1 ? 'scelta' : 'scelte'}</span>
      </button>
      {aperto && (
        <ol className="m-0 px-3 pb-3 list-none flex flex-col gap-1 text-[13px]" aria-label={`Scelte del rango ${d.etichetta}`}>
          {d.scelte.map((s) => (
            <li key={s.ordine} className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1 ${s.punti !== null && s.punti === max && max > 0 ? 'bg-primary-bg' : ''}`}>
              <span className="text-text-muted w-5">{s.ordine}.</span>
              <span className={s.romantica ? 'text-primary font-semibold' : ''}>{s.testo}</span>
              {s.puntiTesto && <span className="chip" title="Punti secondo la guida">{s.puntiTesto}</span>}
              {s.romantica && <span className="chip chip--attivo" title="Scelta che avvia o riguarda la relazione romantica">romantica</span>}
              {s.avviso && <span className="text-[12px] text-warning">{s.avviso}</span>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

export function ConfidenteDettaglioPage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const { dati: c, caricamento, errore, ricarica } = useCarica(() => getConfidenteDettaglio(chiave), [chiave]);
  const stato = useCarica(() => (attiva ? getConfidentiPartita(attiva.id) : Promise.resolve(null)), [attiva?.id, chiave]);
  useDocumentTitle(c ? c.nome : 'Confidente');
  const [aperti, setAperti] = useState<Record<number, true>>({});
  const mio = useMemo(() => (stato.dati ?? []).find((x) => x.chiave === chiave) ?? null, [stato.dati, chiave]);
  const regaliFatti = useMemo(() => new Set(mio?.regaliFatti ?? []), [mio]);
  const prossimo = mio ? mio.rango + 1 : null;

  const [confermaInCorso, setConfermaInCorso] = useState(false);
  const conferma = async (rango: number, indice: number, confermato: boolean) => {
    if (!attiva) return;
    setConfermaInCorso(true);
    try {
      await confermaRequisitoConfidente(attiva.id, chiave, rango, indice, confermato);
      await stato.ricarica();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setConfermaInCorso(false);
    }
  };

  const segnaRegalo = async (nome: string, fatto: boolean) => {
    if (!attiva) return;
    try {
      await impostaRegaloFatto(attiva.id, chiave, nome, fatto);
      await stato.ricarica();
      notifica('info', fatto ? `Regalo «${nome}» segnato come consegnato.` : `Regalo «${nome}» segnato come non consegnato.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      {c && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>
          <div className="card flex flex-col sm:flex-row gap-4">
            <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={160} forma="carta" modificabile />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="titolo-display m-0">{c.nome}</h1>
                <span className="chip chip--attivo">{c.arcanaNome}</span>
                {mio && <span className="chip">Rango {mio.rango === 10 ? 'MAX' : mio.rango} nella partita</span>}
                {mio && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Aggiorna il rango" to="/partita?scheda=confidenti" />}
              </div>
              <div className="text-[13px] text-text-secondary flex flex-col gap-1">
                <span><strong className="text-text">Dove:</strong> {c.disponibilita.luogo || '—'}</span>
                <span><strong className="text-text">Quando:</strong> {c.disponibilita.giorni.join(', ') || '—'}{c.disponibilita.fasce.length ? ` · ${c.disponibilita.fasce.join(', ')}` : ''}</span>
                <span><strong className="text-text">Sblocco:</strong> {c.disponibilita.sbloccoData || '—'}{c.disponibilita.sbloccoRequisiti ? ` · ${c.disponibilita.sbloccoRequisiti}` : ''}</span>
                {c.disponibilita.note && <span>{c.disponibilita.note}</span>}
              </div>
              {c.noteGenerali && <p className="m-0 text-[13px] text-text-secondary whitespace-pre-wrap">{c.noteGenerali}</p>}
            </div>
          </div>

          {prossimo !== null && prossimo <= 10 && c.dialoghi.some((d) => d.rango !== null && d.rango > (mio?.rango ?? 0) && d.rango <= prossimo) && (
            <section className="card flex flex-col gap-2 border-primary">
              <h2 className="m-0 text-[15px] font-semibold">Prossimo passo: rango {prossimo}</h2>
              {mio && mio.semafori.length > 0 && mio.semafori[0].rango <= prossimo && (
                <SemaforiRango semafori={mio.semafori[0]} occupato={confermaInCorso} onConferma={(rango, r, confermato) => void conferma(rango, r.indice, confermato)} />
              )}
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {c.dialoghi.filter((d) => d.rango !== null && d.rango > (mio?.rango ?? 0) && d.rango <= prossimo).map((d) => (
                  <DialogoRango key={d.id} d={d} aperto onToggle={() => undefined} />
                ))}
              </ul>
            </section>
          )}

          {mio && mio.semafori.length > 1 && (
            <section className="card flex flex-col gap-3">
              <h2 className="m-0 text-[15px] font-semibold">Requisiti dei ranghi successivi</h2>
              {mio.semafori.slice(1).map((sr) => <SemaforiRango key={sr.rango} semafori={sr} compatto occupato={confermaInCorso} onConferma={(rango, r, confermato) => void conferma(rango, r.indice, confermato)} />)}
            </section>
          )}
          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Abilità per rango</h2>
            {c.abilita.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessuna abilità documentata.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
                {c.abilita.map((a, i) => (
                  <li key={i} className={`py-1.5 flex gap-3 text-[13px] ${mio && a.rango <= mio.rango ? '' : 'text-text-secondary'}`}>
                    <span className={`chip shrink-0 ${mio && a.rango <= mio.rango ? 'chip--attivo' : ''}`}>{a.rango === 10 ? 'MAX' : a.rango}</span>
                    <div><strong className="text-text">{a.nome}</strong>{a.descrizione && <span> — {a.descrizione}</span>}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Risposte migliori per rango</h2>
            <p className="m-0 text-[12px] text-text-muted">Le scelte evidenziate danno il massimo dei punti secondo la guida; quelle in rosso avviano la relazione romantica. Registra poi le note ottenute nella scheda Confidenti della partita.</p>
            {c.dialoghi.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessun dialogo documentato.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {c.dialoghi.map((d) => <DialogoRango key={d.id} d={d} aperto={aperti[d.id] === true} onToggle={() => setAperti((a) => { const n = { ...a }; if (n[d.id]) delete n[d.id]; else n[d.id] = true; return n; })} />)}
              </ul>
            )}
          </section>

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Regali graditi</h2>
            {c.regali.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Questo Confidente non accetta regali.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Regali">
                {c.regali.map((g, i) => (
                  <li key={i} className="py-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                    {attiva && (
                      <label className="flex items-center gap-1.5 touch">
                        <input type="checkbox" className="w-5 h-5" checked={regaliFatti.has(g.nome)} onChange={(e) => void segnaRegalo(g.nome, e.target.checked)} aria-label={`Regalo ${g.nome} consegnato`} />
                      </label>
                    )}
                    <strong className={regaliFatti.has(g.nome) ? 'line-through text-text-muted' : ''}>{g.nome}</strong>
                    {g.effetto && <span className="chip">{g.effetto}</span>}
                    <span className="text-text-secondary">{[g.dove, g.costo].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
            {c.regaliSconsigliati.length > 0 && <p className="m-0 text-[12px] text-text-muted">Sconsigliati: {c.regaliSconsigliati.join(', ')}.</p>}
          </section>

          {c.fonti.length > 0 && (
            <p className="m-0 text-[11px] text-text-muted">Fonti: {c.fonti.map((f, i) => <a key={i} href={f} target="_blank" rel="noreferrer" className="credito">{new URL(f).hostname}{i < c.fonti.length - 1 ? ', ' : ''}</a>)}</p>
          )}
        </div>
      )}
    </PageState>
  );
}
