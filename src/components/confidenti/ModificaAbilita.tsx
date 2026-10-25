// ============================================================
// ModificaAbilita — le abilità di un Confidente rango per rango, con «Modifica» e «Ripristina» (R9-07/2, R11-15/2)
// ============================================================
//
// La matita sta nella testata di «Abilità per rango»; apre una finestra con i ranghi da 1 a 10 e, per quello scelto, l'elenco delle abilità
// (nome e descrizione, nell'ordine in cui si leggono) da cambiare, aggiungere, togliere o spostare. Si salva un rango alla volta (la rotta sostituisce
// l'elenco del rango); un rango cambiato è segnato e «Ripristina» rimette l'elenco della guida. Vale per tutte le partite.
// Rotte: GET `/api/compendio/confidenti/:chiave/abilita`, PUT `…/abilita/:rango`, POST `…/abilita/:rango/ripristina`.
// ============================================================

import { useState } from 'react';
import { getAbilitaConfidente, ripristinaAbilitaConfidente, salvaAbilitaConfidente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { conferma, CHIUDI_SENZA_SALVARE } from '../../stores/confermaStore';

type Voce = { nome: string; descrizione: string };
const RANGHI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const etichettaRango = (r: number): string => (r === 10 ? 'MAX' : String(r));
const uguali = (a: Voce[], b: Voce[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/** La matita «Modifica» delle abilità del Confidente; alla chiusura con qualcosa di cambiato la scheda si rilegge (`onSalvato`). */
export function ModificaAbilita({ chiave, nome, onSalvato }: { chiave: string; nome: string; onSalvato: () => void | Promise<void> }) {
  const [aperta, setAperta] = useState(false);
  return <>
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica le abilità di ${nome}`} onClick={() => setAperta(true)} />
    {aperta && <EditorAbilita chiave={chiave} nome={nome} onChiudi={() => setAperta(false)} onSalvato={onSalvato} />}
  </>;
}

function EditorAbilita({ chiave, nome, onChiudi, onSalvato }: { chiave: string; nome: string; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const dati = useCarica(() => getAbilitaConfidente(chiave), [chiave]);
  const [rango, setRango] = useState<number>(1);
  /** L'elenco in modifica per il rango scelto; null = nessuna modifica ancora (si mostra quello salvato). */
  const [bozza, setBozza] = useState<Voce[] | null>(null);
  const [occupato, setOccupato] = useState(false);
  const delRango = dati.dati?.find((a) => a.rango === rango);
  const salvate: Voce[] = delRango?.abilita ?? [];
  const elenco = bozza ?? salvate;
  const sporca = bozza !== null && !uguali(bozza, salvate);
  const valida = elenco.length <= 20 && elenco.every((v) => v.nome.trim() !== '' && v.nome.length <= 200 && v.descrizione.length <= 2000);
  useBozzaSporca(`abilita:${chiave}`, `le abilità di ${nome}`, sporca);

  const scegliRango = async (r: number) => {
    if (r === rango || occupato) return;
    if (sporca && !(await conferma({ titolo: 'Cambiare rango senza salvare?', testo: `Ci sono modifiche non salvate al rango ${etichettaRango(rango)}: cambiando rango si perdono.`, etichetta: 'Cambia senza salvare', icona: 'chiudi' }))) return;
    setRango(r); setBozza(null);
  };
  const chiudi = async () => {
    if (occupato) return;
    if (sporca && !(await conferma(CHIUDI_SENZA_SALVARE))) return;
    onChiudi();
  };
  const cambia = (f: (v: Voce[]) => Voce[]) => setBozza(f(elenco));
  const esegui = async (azione: () => Promise<unknown>, esito: string) => {
    setOccupato(true);
    try { await azione(); setBozza(null); notifica('success', esito); await Promise.all([dati.ricarica(), onSalvato()]); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const sposta = (i: number, verso: -1 | 1) => cambia((v) => { const n = [...v]; const j = i + verso; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });

  return (
    <Modal titolo={`Abilità di ${nome}`} aperta larga onChiudi={chiudi} azioni={(
      <div className="flex w-full flex-wrap justify-end gap-2">
        {delRango?.modificato && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaAbilitaConfidente(chiave, rango), `Abilità del rango ${etichettaRango(rango)} ripristinate come nella guida.`)} />}
        <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" disabled={occupato} onClick={chiudi} />
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={<>Salva il rango {etichettaRango(rango)}</>} disabled={occupato || !sporca || !valida} onClick={() => void esegui(() => salvaAbilitaConfidente(chiave, rango, elenco.map((v) => ({ nome: v.nome.trim(), descrizione: v.descrizione.trim() }))), `Abilità del rango ${etichettaRango(rango)} salvate: valgono per tutte le partite.`)} />
      </div>
    )}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-muted">Scegli il rango, cambia l’elenco e salva: si salva un rango alla volta. «Ripristina» rimette l’elenco della guida.</p>
        {dati.errore && <p role="alert" className="m-0 text-error">{dati.errore}</p>}
        {!dati.dati && !dati.errore && <p role="status" className="m-0">Un attimo…</p>}
        {dati.dati && <>
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0"><legend className="p-0 text-text-secondary">Rango (• = cambiato rispetto alla guida)</legend>
            <div className="flex flex-wrap gap-1.5">{RANGHI.map((r) => {
              const mod = dati.dati?.find((a) => a.rango === r)?.modificato === true;
              return <button key={r} type="button" aria-pressed={r === rango} aria-label={`Rango ${etichettaRango(r)}${mod ? ', cambiato rispetto alla guida' : ''}`} disabled={occupato} className={`chip touch ${r === rango ? 'chip--attivo' : ''}`} onClick={() => scegliRango(r)}>{etichettaRango(r)}{mod ? ' •' : ''}</button>;
            })}</div>
          </fieldset>
          {elenco.length === 0 && <p className="m-0 text-text-muted">Nessuna abilità a questo rango.</p>}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{elenco.map((v, i) => (
            <li key={i} className="flex flex-col gap-2 rounded border border-border p-2">
              <label className="flex flex-col gap-1">Nome dell’abilità
                <input className="form-input" value={v.nome} maxLength={200} disabled={occupato} aria-invalid={v.nome.trim() === ''} onChange={(e) => cambia((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
              </label>
              <label className="flex flex-col gap-1">Descrizione
                <textarea className="form-input" rows={2} value={v.descrizione} maxLength={2000} disabled={occupato} onChange={(e) => cambia((l) => l.map((x, j) => (j === i ? { ...x, descrizione: e.target.value } : x)))} />
              </label>
              <div className="flex flex-wrap gap-2">
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" disabled={occupato || i === 0} onClick={() => sposta(i, -1)} aria-label={`Sposta su l’abilità ${i + 1}`} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" disabled={occupato || i === elenco.length - 1} onClick={() => sposta(i, 1)} aria-label={`Sposta giù l’abilità ${i + 1}`} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => cambia((l) => l.filter((_, j) => j !== i))} aria-label={`Togli l’abilità ${i + 1}`} />
              </div>
            </li>))}</ul>
          <div><PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un’abilità" disabled={occupato || elenco.length >= 20} onClick={() => cambia((l) => [...l, { nome: '', descrizione: '' }])} /></div>
        </>}
      </div>
    </Modal>
  );
}
