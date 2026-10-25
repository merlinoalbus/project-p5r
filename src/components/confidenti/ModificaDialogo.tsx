// ============================================================
// ModificaDialogo — le note e le scelte di un dialogo di rango, con i punti: «Modifica» e «Ripristina» (R9-07/4, R11-15/2)
// ============================================================
//
// La matita sta accanto al dialogo (Risposte migliori per rango). La finestra mostra le note e le scelte, ciascuna con testo, punti (nessuno, o un
// numero da 0 a 100), testo dei punti come lo scrive la guida («♪♪»), «romantica» e avviso; le scelte si possono aggiungere, togliere e spostare (il
// server le rinumera da 1). Si inviano solo i campi cambiati: un dialogo non toccato non perde la sua fotografia. «Ripristina» rimette note e scelte
// della guida; la scheda non dice se il dialogo è già stato cambiato, quindi un dialogo mai modificato risponde 409 e lo si dice con parole.
// Rotte: PUT `/api/compendio/confidenti/:chiave/dialoghi/:id`, POST `…/dialoghi/:id/ripristina`.
// ============================================================

import { useState } from 'react';
import { isApiError, ripristinaDialogoConfidente, salvaDialogoConfidente } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { DialogoConfidenteDto } from '../../types';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { conferma, CHIUDI_SENZA_SALVARE, RIPRISTINA_CON_MODIFICHE } from '../../stores/confermaStore';

/** Una scelta in modifica: i punti restano testo finché si scrive («» = nessuno). */
interface SceltaBozza { testo: string; punti: string; puntiTesto: string; romantica: boolean; avviso: string }

const daDto = (s: DialogoConfidenteDto['scelte'][number]): SceltaBozza => ({ testo: s.testo, punti: s.punti === null ? '' : String(s.punti), puntiTesto: s.puntiTesto ?? '', romantica: s.romantica, avviso: s.avviso ?? '' });
const puntiValidi = (p: string): boolean => p.trim() === '' || (Number.isFinite(Number(p)) && Number(p) >= 0 && Number(p) <= 100);
const perServer = (s: SceltaBozza) => ({ testo: s.testo.trim(), punti: s.punti.trim() === '' ? null : Number(s.punti), puntiTesto: s.puntiTesto.trim() === '' ? null : s.puntiTesto, romantica: s.romantica, avviso: s.avviso.trim() === '' ? null : s.avviso });

/** La matita del dialogo e, dopo una modifica fatta da qui, il chip «Modificato». */
export function ModificaDialogo({ chiave, nome, dialogo, onSalvato }: { chiave: string; nome: string; dialogo: DialogoConfidenteDto; onSalvato: () => void | Promise<void> }) {
  const [aperta, setAperta] = useState(false);
  /** Vero dopo una modifica salvata da qui (il server lo dice nella risposta); falso = non lo so, non «non modificato». */
  const [modificato, setModificato] = useState(false);
  return <>
    {modificato && <span className="chip" title="Cambiato rispetto alla guida">Modificato</span>}
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica il dialogo del rango ${dialogo.etichetta} di ${nome}`} onClick={() => setAperta(true)} />
    {aperta && <EditorDialogo key={dialogo.id} chiave={chiave} nome={nome} dialogo={dialogo} onChiudi={() => setAperta(false)} onSalvato={onSalvato} onModificato={setModificato} />}
  </>;
}

function EditorDialogo({ chiave, nome, dialogo, onChiudi, onSalvato, onModificato }: {
  chiave: string; nome: string; dialogo: DialogoConfidenteDto; onChiudi: () => void; onSalvato: () => void | Promise<void>; onModificato: (m: boolean) => void;
}) {
  const [partenzaNote] = useState(dialogo.note);
  const [partenzaScelte] = useState<SceltaBozza[]>(() => dialogo.scelte.map(daDto));
  const [note, setNote] = useState(dialogo.note);
  const [scelte, setScelte] = useState<SceltaBozza[]>(partenzaScelte);
  const [occupato, setOccupato] = useState(false);
  const noteCambiate = note !== partenzaNote;
  const scelteCambiate = JSON.stringify(scelte) !== JSON.stringify(partenzaScelte);
  const sporca = noteCambiate || scelteCambiate;
  const valida = scelte.length <= 40 && scelte.every((s) => s.testo.trim() !== '' && puntiValidi(s.punti));
  useBozzaSporca(`dialogo:${dialogo.id}`, `il dialogo di ${nome}`, sporca);

  const chiudi = async () => {
    if (occupato) return;
    if (sporca && !(await conferma(CHIUDI_SENZA_SALVARE))) return;
    onChiudi();
  };
  const cambiaScelta = (i: number, parte: Partial<SceltaBozza>) => setScelte((l) => l.map((x, j) => (j === i ? { ...x, ...parte } : x)));
  const sposta = (i: number, verso: -1 | 1) => setScelte((l) => { const n = [...l]; const j = i + verso; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });

  const salva = async () => {
    setOccupato(true);
    try {
      const esito = await salvaDialogoConfidente(chiave, dialogo.id, { ...(noteCambiate ? { note } : {}), ...(scelteCambiate ? { scelte: scelte.map(perServer) } : {}) });
      onModificato(esito.modificato);
      notifica('success', 'Dialogo salvato: vale per tutte le partite.');
      await onSalvato(); onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  const ripristina = async () => {
    if (sporca && !(await conferma(RIPRISTINA_CON_MODIFICHE))) return;
    setOccupato(true);
    try {
      await ripristinaDialogoConfidente(chiave, dialogo.id);
      onModificato(false);
      notifica('success', 'Dialogo ripristinato come nella guida.');
      await onSalvato(); onChiudi();
    } catch (err) {
      if (isApiError(err, 'dialogo-della-guida')) notifica('info', 'Questo dialogo non è stato modificato: è già come nella guida.');
      else notifica('error', err instanceof Error ? err.message : 'Ripristino non riuscito.');
    } finally { setOccupato(false); }
  };

  return (
    <Modal titolo={`Dialogo del rango ${dialogo.etichetta}: ${nome}`} aperta larga onChiudi={chiudi} azioni={(
      <div className="flex w-full flex-wrap justify-end gap-2">
        <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void ripristina()} />
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={chiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || !sporca || !valida} onClick={() => void salva()} />
      </div>
    )}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-muted">Le modifiche valgono per tutte le partite. I punti sono un numero da 0 a 100; lasciali vuoti se la scelta non ne dà. «Ripristina» rimette note e scelte come nella guida.</p>
        <label className="flex flex-col gap-1">Note del dialogo
          <textarea className="form-input" rows={3} value={note} maxLength={4000} disabled={occupato} onChange={(e) => setNote(e.target.value)} />
        </label>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0"><legend className="p-0 text-text-secondary">Scelte</legend>
          {scelte.length === 0 && <span className="text-text-muted">Nessuna scelta.</span>}
          <ol className="m-0 flex list-none flex-col gap-2 p-0">{scelte.map((s, i) => (
            <li key={i} className="flex flex-col gap-2 rounded border border-border p-2" aria-label={`Scelta ${i + 1}`}>
              <label className="flex flex-col gap-1">Testo della scelta {i + 1}
                <input className="form-input" value={s.testo} maxLength={500} disabled={occupato} aria-invalid={s.testo.trim() === ''} onChange={(e) => cambiaScelta(i, { testo: e.target.value })} />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col gap-1">Punti
                  <input className="form-input w-24" type="number" inputMode="decimal" min={0} max={100} step="any" value={s.punti} disabled={occupato} aria-invalid={!puntiValidi(s.punti)} onChange={(e) => cambiaScelta(i, { punti: e.target.value })} />
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1">Punti come li scrive la guida
                  <input className="form-input" value={s.puntiTesto} maxLength={200} disabled={occupato} onChange={(e) => cambiaScelta(i, { puntiTesto: e.target.value })} />
                </label>
              </div>
              <label className="flex flex-col gap-1">Avviso (facoltativo)
                <input className="form-input" value={s.avviso} maxLength={500} disabled={occupato} onChange={(e) => cambiaScelta(i, { avviso: e.target.value })} />
              </label>
              <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={s.romantica} disabled={occupato} onChange={(e) => cambiaScelta(i, { romantica: e.target.checked })} /> Avvia o riguarda la relazione romantica</label>
              <div className="flex flex-wrap gap-2">
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" disabled={occupato || i === 0} onClick={() => sposta(i, -1)} aria-label={`Sposta su la scelta ${i + 1}`} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" disabled={occupato || i === scelte.length - 1} onClick={() => sposta(i, 1)} aria-label={`Sposta giù la scelta ${i + 1}`} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setScelte((l) => l.filter((_, j) => j !== i))} aria-label={`Togli la scelta ${i + 1}`} />
              </div>
            </li>))}</ol>
          <div><PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una scelta" disabled={occupato || scelte.length >= 40} onClick={() => setScelte((l) => [...l, { testo: '', punti: '', puntiTesto: '', romantica: false, avviso: '' }])} /></div>
        </fieldset>
      </div>
    </Modal>
  );
}
