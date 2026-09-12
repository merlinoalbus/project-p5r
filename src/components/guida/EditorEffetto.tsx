// ============================================================
// EditorEffetto — un effetto dichiarato invece che descritto: la famiglia a tessere, i suoi parametri, la frase scritta dall'app
// ============================================================
//
// Finché l'effetto era un campo di testo, nei dati c'erano 276 forme diverse su 575 righe. Qui si
// sceglie la famiglia (tessere con la figura) e si compilano i parametri; la frase la scrive
// `descriviEffetto`, così due articoli che fanno la stessa cosa la mostrano identica.
// `descrittivo` non è una scappatoia: i casi che non formano una famiglia («Abilita il Terzo
// Occhio nella pesca») si dichiarano tali, e si vede quanti sono.
// ============================================================

import type { ReactNode } from 'react';
import { Selettore } from '../shared/Selettore';
import { SelettoreIcone } from '../shared/SelettoreIcone';
import { NOME_DOTE } from '../../utils/citta';
import { BERSAGLI, FUNZIONI, GUADAGNI, MISURE, NOME_BERSAGLIO, NOME_FUNZIONE, NOME_GUADAGNO, NOME_RESA, NOME_RISORSA, NOME_STATISTICA, NOME_STATO, PROBABILITA, RESE, RISORSE, STATISTICHE_OGGETTO, STATI_ALTERATI, descriviEffetto, type EffettoOggetto, type StatoAlterato } from '../../../shared/effettiOggetto';
import { OPZIONI_FAMIGLIA, effettoPredefinito, type NomiPerEffetti } from '../../utils/effetti';

interface Props extends NomiPerEffetti {
  valore: EffettoOggetto | null;
  onCambia: (e: EffettoOggetto | null) => void;
  /** Con la voce «Nessuno» (l'articolo generico può non avere un effetto). */
  conNessuno?: boolean;
  /** Il nome del gruppo di tessere (più editor nella stessa pagina hanno nomi diversi). */
  etichetta?: string;
  disabilitato?: boolean;
}

/** I parametri di una famiglia, con la frase che ne discende. */
export function EditorEffetto({ valore, onCambia, quartieri, attivita, confidenti, erroreNomi, riprovaNomi, conNessuno, etichetta = 'Effetto', disabilitato }: Props) {
  const nomiEffetto = {
    luoghi: Object.fromEntries((quartieri ?? []).map((q) => [q.chiave, q.nome])),
    attivita: Object.fromEntries((attivita ?? []).map((a) => [a.chiave, a.nome])),
  };
  const campo = (nome: string, dentro: ReactNode) => <label className="editor-mappa__campo">{nome}{dentro}</label>;
  const scelta = <C extends string>(nome: string, v: C, opzioni: readonly C[], nomi: Record<C, string>, set: (x: C) => void) => (
    <Selettore etichetta={nome} valore={v} disabilitato={disabilitato} opzioni={opzioni.map((o) => ({ chiave: o, nome: nomi[o] }))} onCambia={(k) => set(k as C)} />
  );
  const numero = (v: number | null, set: (n: number) => void, nome: string) => (
    <input className="form-input" type="number" min={0} max={9999} value={v ?? 0} disabled={disabilitato} aria-label={nome} onChange={(e) => set(Number(e.target.value))} />
  );
  const opzioni = conNessuno ? [{ chiave: '', nome: 'Nessuno', categoria: 'altro' }, ...OPZIONI_FAMIGLIA] : OPZIONI_FAMIGLIA;
  return (
    <div className="flex flex-col gap-2">
      <SelettoreIcone compatto etichetta={etichetta} valore={valore?.famiglia ?? ''} opzioni={opzioni} disabilitato={disabilitato}
        onCambia={(f) => onCambia(f ? effettoPredefinito(f as EffettoOggetto['famiglia']) : null)} />
      {valore?.famiglia === 'ripristina' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Che cosa ripristina', valore.risorsa, RISORSE, NOME_RISORSA, (risorsa) => onCambia({ ...valore, risorsa }))}
        {scelta('Quanto', valore.misura, MISURE, { assoluta: 'Una quantità', percentuale: 'Una percentuale', tutto: 'Tutto' }, (misura) => onCambia({ ...valore, misura }))}
        {valore.misura !== 'tutto' && campo(valore.misura === 'percentuale' ? 'Percentuale' : 'Quantità', numero(valore.valore, (v) => onCambia({ ...valore, valore: v }), valore.misura === 'percentuale' ? 'Percentuale' : 'Quantità'))}
        {scelta('A chi', valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio }))}
      </div>}
      {valore?.famiglia === 'rianima' && <div className="grid gap-2 sm:grid-cols-2">
        {campo('Con quanti HP (%)', numero(valore.percentuale, (v) => onCambia({ ...valore, percentuale: v }), 'Con quanti HP (%)'))}
        {scelta('A chi', valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio }))}
      </div>}
      {valore?.famiglia === 'cura-stato' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Quale stato', valore.stato as StatoAlterato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato }))}
        {scelta('A chi', valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio }))}
      </div>}
      {valore?.famiglia === 'infliggi-stato' && <div className="grid gap-2 sm:grid-cols-3">
        {scelta('Quale stato', valore.stato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato }))}
        {scelta('Quanto è probabile', valore.probabilita, PROBABILITA, { alta: 'Alta', media: 'Media', bassa: 'Bassa', 'non-detta': 'Non dichiarata' }, (probabilita) => onCambia({ ...valore, probabilita }))}
        {scelta('A chi', valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio }))}
      </div>}
      {(valore?.famiglia === 'resiste-stato' || valore?.famiglia === 'previene-stato') &&
        scelta('Quale stato', valore.stato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato }))}
      {valore?.famiglia === 'statistica' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Quale statistica', valore.statistica, STATISTICHE_OGGETTO, NOME_STATISTICA, (statistica) => onCambia({ ...valore, statistica }))}
        {campo('Di quanto', numero(valore.valore, (v) => onCambia({ ...valore, valore: v }), 'Di quanto'))}
      </div>}
      {valore?.famiglia === 'dote' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Quale Dote', valore.dote, Object.keys(NOME_DOTE) as string[], NOME_DOTE, (dote) => onCambia({ ...valore, dote }))}
        <Selettore etichetta="Quante note (♪)" valore={String(Math.min(4, Math.max(1, valore.note)))} disabilitato={disabilitato} ricerca="mai" opzioni={[{ chiave: '1', nome: '♪ (1)' }, { chiave: '2', nome: '♪♪ (2)' }, { chiave: '3', nome: '♪♪♪ (3)' }, { chiave: '4', nome: '♪♪♪♪ (4)' }]} onCambia={(k) => onCambia({ ...valore, note: Number(k) })} />
      </div>}
      {/* A chi è gradito: i Confidenti come interruttori (i nomi sono quelli che la frase mostra). Un
          nome salvato che non è più fra i Confidenti resta acceso e si può spegnere. */}
      {valore?.famiglia === 'regalo' && (
        <div role="group" aria-label="Gradito a" className="orari-editor__gruppo">
          {[...(confidenti ?? []).map((c) => c.nome), ...valore.graditoA.filter((g) => !(confidenti ?? []).some((c) => c.nome === g))].map((nome) => {
            const acceso = valore.graditoA.includes(nome);
            return (
              <button key={nome} type="button" className={`chip touch orari-editor__chip ${acceso ? 'chip--attivo' : ''}`} aria-pressed={acceso} disabled={disabilitato}
                onClick={() => onCambia({ ...valore, graditoA: acceso ? valore.graditoA.filter((g) => g !== nome) : [...valore.graditoA, nome] })}>{nome}</button>
            );
          })}
          {erroreNomi
            ? <span role="alert" className="text-[12px] text-error">Impossibile caricare i Confidenti. {riprovaNomi && <button type="button" className="btn btn-sm touch" onClick={riprovaNomi}>Riprova</button>}</span>
            : (confidenti ?? []).length === 0 && valore.graditoA.length === 0 && <span className="text-[12px] text-text-muted">Carico i Confidenti…</span>}
        </div>
      )}
      {valore?.famiglia === 'sblocca-luogo' &&
        <Selettore etichetta="Quale luogo" valore={valore.luogo} disabilitato={disabilitato} vuoto="Scegli il quartiere…" opzioni={(quartieri ?? []).map((q) => ({ chiave: q.chiave, nome: q.nome }))} onCambia={(luogo) => onCambia({ ...valore, luogo })} />}
      {valore?.famiglia === 'sblocca-funzione' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Che cosa apre', valore.funzione, FUNZIONI, NOME_FUNZIONE, (funzione) => onCambia({ ...valore, funzione }))}
        <Selettore etichetta="In quale attività" valore={valore.dove ?? ''} disabilitato={disabilitato} vuoto="Non è legata a una sola attività" opzioni={(attivita ?? []).map((a) => ({ chiave: a.chiave, nome: a.nome }))} onCambia={(k) => onCambia({ ...valore, dove: k || null })} />
      </div>}
      {valore?.famiglia === 'moltiplica' && <div className="grid gap-2 sm:grid-cols-2">
        {scelta('Che cosa moltiplica', valore.cosa, RESE, NOME_RESA, (cosa) => onCambia({ ...valore, cosa }))}
        {campo('Per quanto', numero(valore.fattore, (v) => onCambia({ ...valore, fattore: Math.max(1, v) }), 'Per quanto'))}
      </div>}
      {valore?.famiglia === 'aumenta-punti' &&
        scelta('Dove si guadagna di più', valore.dove, GUADAGNI, NOME_GUADAGNO, (dove) => onCambia({ ...valore, dove }))}
      {valore?.famiglia === 'descrittivo' &&
        campo('Descrizione', <textarea className="form-input" rows={2} maxLength={600} value={valore.testo} disabled={disabilitato} onChange={(e) => onCambia({ ...valore, testo: e.target.value })} />)}
      {valore && <p className="m-0 text-[12px] text-text-muted" role="status">Verrà mostrato così: <strong>{descriviEffetto(valore, nomiEffetto)}</strong></p>}
    </div>
  );
}
