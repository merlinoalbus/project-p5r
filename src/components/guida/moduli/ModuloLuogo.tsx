// ============================================================
// ModuloLuogo — un luogo della città: nome, tipo a tessere (l'icona dello spillo), quartiere, che cosa offre, quando, note, orari
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getConfidenti, getQuartiere, getQuartieri } from '../../../services/api';
import type { PiattoLuogo } from './definizioni';
import { Selettore } from '../../shared/Selettore';
import { IconaSpillo } from '../../mappe/IconaSpillo';
import { SelettoreIcone, type OpzioneIcone } from '../../shared/SelettoreIcone';
import { TIPI_LUOGO } from '../../../../shared/tipiLuogo';
import { testoDi, type PropsModulo } from './base';
import { OrariEditor } from '../OrariEditor';
import { ORARI_SEMPRE, type OrariNegozio } from '../../../../shared/orariNegozio';
import { Blocco, Campo, Griglia } from './campi';

const OPZIONI_TIPO: OpzioneIcone[] = TIPI_LUOGO.map((t) => ({ chiave: t.chiave, nome: t.nome, icona: <IconaSpillo tipo={t.icona} dimensione={28} /> }));
const OPZIONI_QUANDO = [{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }, { chiave: 'entrambe', nome: 'Giorno e sera' }];

/**
 * I campi di un luogo: nome, tipo a tessere, quartiere (dai quartieri caricati; un valore salvato sconosciuto resta
 * in testa all'elenco, con «Riprova» se il caricamento fallisce), quando, che cosa offre e note; i giorni sono nel blocco degli orari.
 */
export function ModuloLuogo({ dati, imposta, disabilitato }: PropsModulo) {
  const quartieri = useCarica(() => getQuartieri(), []);
  const attuale = testoDi(dati.quartiere_chiave);
  const opzioniQuartiere = [...(attuale && !quartieri.dati?.some((q) => q.chiave === attuale) ? [{ chiave: attuale, nome: attuale }] : []), ...(quartieri.dati ?? []).map((q) => ({ chiave: q.chiave, nome: q.nome }))];
  return (
    <Griglia>
      <Campo nome="nome" etichetta="Nome del luogo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
      <Blocco largo>
        <SelettoreIcone compatto etichetta="Tipo" valore={testoDi(dati.tipo) || 'altro'} opzioni={OPZIONI_TIPO} disabilitato={disabilitato} onCambia={(tipo) => imposta({ tipo })} />
      </Blocco>
      <Blocco>
        <Selettore etichetta="Quartiere" valore={attuale} vuoto="Scegli il quartiere…" disabilitato={disabilitato || quartieri.caricamento} opzioni={opzioniQuartiere} onCambia={(k) => imposta({ quartiere_chiave: k })} />
        {quartieri.errore && <span role="alert" className="text-[11px] text-error">Impossibile caricare i quartieri. <button type="button" className="btn btn-sm touch" onClick={() => void quartieri.ricarica()}>Riprova</button></span>}
      </Blocco>
      <Blocco>
        <Selettore etichetta="Quando" valore={testoDi(dati.quando)} vuoto="Non indicato" ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_QUANDO} onCambia={(k) => imposta({ quando: k || null })} />
      </Blocco>
      <Campo nome="cosa_offre" etichetta="Che cosa offre" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} />
      <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      {/* ---- L5 (R5-07): un modulo solo per tutto il luogo: orari, area, sblocco, Confidenti, piatti ---- */}
      <Blocco largo><CampiLuogoL5 dati={dati} imposta={imposta} disabilitato={disabilitato} /></Blocco>
    </Griglia>
  );
}

/** Gli orari del luogo (o la regola dell'app), l'area del quartiere, lo sblocco come lo dice la guida, i Confidenti e i piatti. */
function CampiLuogoL5({ dati, imposta, disabilitato }: Pick<PropsModulo, 'dati' | 'imposta' | 'disabilitato'>) {
  const quartiere = testoDi(dati.quartiere_chiave);
  const q = useCarica(() => (quartiere ? getQuartiere(quartiere) : Promise.resolve(null)), [quartiere]);
  const confidenti = useCarica(() => getConfidenti(), []);
  const orari = (dati.orari_json as OrariNegozio | null) ?? null;
  const scelti = Array.isArray(dati.confidenti_json) ? (dati.confidenti_json as string[]) : [];
  const piatti = (dati.piatti_json as PiattoLuogo[] | null) ?? [];
  /** Cambia un piatto (o lo toglie con `null`). */
  const piatto = (i: number, p: PiattoLuogo | null) => {
    const n = p ? piatti.map((x, j) => (j === i ? p : x)) : piatti.filter((_, j) => j !== i);
    imposta({ piatti_json: n.length > 0 ? n : null });
  };
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Orari del luogo</legend>
        <label className="flex items-center gap-2 text-[13px] touch">
          <input type="checkbox" className="h-5 w-5" checked={orari === null} disabled={disabilitato} onChange={(e) => imposta({ orari_json: e.target.checked ? null : { ...ORARI_SEMPRE } })} />
          La guida non indica orari: vale la regola dell’app (giorno e sera)
        </label>
        {orari && <OrariEditor valore={orari} onCambia={(o) => imposta({ orari_json: o })} disabilitato={disabilitato} />}
      </fieldset>
      <Griglia>
        <Blocco>
          <Selettore etichetta="Area" valore={testoDi(dati.area_chiave)} vuoto="Da collocare" disabilitato={disabilitato || q.caricamento || !quartiere}
            opzioni={(q.dati?.aree ?? []).map((a) => ({ chiave: a.chiave, nome: a.nome }))} onCambia={(k) => imposta({ area_chiave: k || null })} />
        </Blocco>
        <Campo nome="sblocco" etichetta="Sblocco (come lo dice la guida)" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} aiuto="Resta come nota: la condizione che l’app valuta sono le condizioni qui sotto" />
      </Griglia>
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Confidenti che si incontrano qui</legend>
        {scelti.length > 0 && <div className="flex flex-wrap gap-1.5">
          {scelti.map((c) => <button key={c} type="button" className="chip chip--attivo touch" disabled={disabilitato} aria-label={`Togli ${confidenti.dati?.find((x) => x.chiave === c)?.nome ?? c}`}
            onClick={() => imposta({ confidenti_json: scelti.filter((x) => x !== c) })}>{confidenti.dati?.find((x) => x.chiave === c)?.nome ?? c} ×</button>)}
        </div>}
        <Selettore etichetta="Aggiungi un Confidente" valore="" vuoto="— scegli —" disabilitato={disabilitato || confidenti.caricamento}
          opzioni={(confidenti.dati ?? []).filter((c) => !scelti.includes(c.chiave)).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))}
          onCambia={(k) => { if (k) imposta({ confidenti_json: [...scelti, k] }); }} />
      </fieldset>
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Piatti</legend>
        {piatti.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2" role="group" aria-label={`Piatto ${i + 1}`}>
            <label className="editor-mappa__campo min-w-[160px] flex-1">Nome<input className="form-input" maxLength={160} value={p.nome} disabled={disabilitato} onChange={(e) => piatto(i, { ...p, nome: e.target.value })} /></label>
            <label className="editor-mappa__campo w-[110px]">Prezzo (¥)<input className="form-input" type="number" min={0} value={p.prezzo ?? ''} disabled={disabilitato} onChange={(e) => piatto(i, { ...p, prezzo: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })} /></label>
            <label className="editor-mappa__campo min-w-[180px] flex-[2]">Effetto<input className="form-input" maxLength={400} value={p.effetto} disabled={disabilitato} onChange={(e) => piatto(i, { ...p, effetto: e.target.value })} /></label>
            <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato} aria-label={`Togli il piatto ${p.nome || i + 1}`} onClick={() => piatto(i, null)}>Togli</button>
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm touch self-start" disabled={disabilitato} onClick={() => imposta({ piatti_json: [...piatti, { nome: '', prezzo: null, effetto: '' }] })}>Aggiungi un piatto</button>
      </fieldset>
    </div>
  );
}
