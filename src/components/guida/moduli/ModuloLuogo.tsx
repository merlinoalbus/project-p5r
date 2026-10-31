// ============================================================
// ModuloLuogo — un luogo della città: nome, tipo a tessere (l'icona dello spillo), che cosa offre, orari, note; quartiere e area;
// Confidenti; piatti
// ============================================================
//
// L13 (O7-5, censimento del 25/10: «tre moduli diversi per creare un luogo»): i campi del luogo nuovo — nome, tipo, che cosa offre,
// orari — sono UNO, `CampiLuogo` (file suo), e li usano tutti e tre i punti d'ingresso: questo modulo (Aggiungi un luogo dal quartiere,
// Correggi il luogo), «Aggiungi luogo» della planimetria e «Crea un luogo da questo pin». Il modulo è a sezioni come le altre finestre
// di modifica.
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getConfidenti, getQuartiere, getQuartieri } from '../../../services/api';
import type { PiattoLuogo } from './definizioni';
import { Selettore } from '../../shared/Selettore';
import { testoDi, type PropsModulo } from './base';
import type { OrariNegozio } from '../../../../shared/orariNegozio';
import { Blocco, Campo } from './campi';
import { CampiLuogo, type ValoriLuogo } from './CampiLuogo';
import { CampoTesto, SezioneCampi } from '../../shared/Campo';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';

/**
 * I campi di un luogo: quelli comuni (`CampiLuogo`) e le note; quartiere (dai quartieri caricati; un valore salvato sconosciuto resta
 * in testa all'elenco, con «Riprova» se il caricamento fallisce) e area; i Confidenti che si incontrano qui; i piatti.
 */
export function ModuloLuogo({ dati, imposta, disabilitato }: PropsModulo) {
  const quartieri = useCarica(() => getQuartieri(), []);
  const attuale = testoDi(dati.quartiere_chiave);
  const opzioniQuartiere = [...(attuale && !quartieri.dati?.some((q) => q.chiave === attuale) ? [{ chiave: attuale, nome: attuale }] : []), ...(quartieri.dati ?? []).map((q) => ({ chiave: q.chiave, nome: q.nome }))];
  const valori: ValoriLuogo = { nome: testoDi(dati.nome), tipo: testoDi(dati.tipo) || 'altro', cosaOffre: testoDi(dati.cosa_offre), orari: (dati.orari_json as OrariNegozio | null) ?? null };
  /** I campi comuni scrivono le colonne del luogo con i loro nomi (`cosa_offre`, `orari_json`). */
  const cambiaComuni = (p: Partial<ValoriLuogo>) => imposta({
    ...(p.nome !== undefined ? { nome: p.nome } : {}), ...(p.tipo !== undefined ? { tipo: p.tipo } : {}),
    ...(p.cosaOffre !== undefined ? { cosa_offre: p.cosaOffre } : {}), ...(p.orari !== undefined ? { orari_json: p.orari } : {}),
  });
  return (
    <div className="flex flex-col gap-5">
      <SezioneCampi titolo="Luogo">
        <CampiLuogo valore={valori} onCambia={cambiaComuni} disabilitato={disabilitato} />
        <Campo nome="note" etichetta="Note" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </SezioneCampi>
      <SezioneCampi titolo="Dove">
        <Blocco>
          <Selettore etichetta="Quartiere" valore={attuale} vuoto="Scegli il quartiere…" disabilitato={disabilitato || quartieri.caricamento} opzioni={opzioniQuartiere} onCambia={(k) => imposta({ quartiere_chiave: k })} />
          {quartieri.errore && <span role="alert" className="testo-12 text-error-testo">Impossibile caricare i quartieri. <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void quartieri.ricarica()} /></span>}
        </Blocco>
        <AreaDelLuogo dati={dati} imposta={imposta} disabilitato={disabilitato} />
      </SezioneCampi>
      <ConfidentiEPiatti dati={dati} imposta={imposta} disabilitato={disabilitato} />
    </div>
  );
}

/** L'area del quartiere in cui sta il luogo (le aree del quartiere scelto). */
function AreaDelLuogo({ dati, imposta, disabilitato }: Pick<PropsModulo, 'dati' | 'imposta' | 'disabilitato'>) {
  const quartiere = testoDi(dati.quartiere_chiave);
  const q = useCarica(() => (quartiere ? getQuartiere(quartiere) : Promise.resolve(null)), [quartiere]);
  return (
    <Blocco>
      <Selettore etichetta="Area" valore={testoDi(dati.area_chiave)} vuoto="Da collocare" disabilitato={disabilitato || q.caricamento || !quartiere}
        opzioni={(q.dati?.aree ?? []).map((a) => ({ chiave: a.chiave, nome: a.nome }))} onCambia={(k) => imposta({ area_chiave: k || null })} />
    </Blocco>
  );
}

/** I Confidenti che si incontrano nel luogo (scelti dall'elenco dei Confidenti) e i piatti del menu. */
function ConfidentiEPiatti({ dati, imposta, disabilitato }: Pick<PropsModulo, 'dati' | 'imposta' | 'disabilitato'>) {
  const confidenti = useCarica(() => getConfidenti(), []);
  const scelti = Array.isArray(dati.confidenti_json) ? (dati.confidenti_json as string[]) : [];
  const piatti = (dati.piatti_json as PiattoLuogo[] | null) ?? [];
  /** Cambia un piatto (o lo toglie con `null`). */
  const piatto = (i: number, p: PiattoLuogo | null) => {
    const n = p ? piatti.map((x, j) => (j === i ? p : x)) : piatti.filter((_, j) => j !== i);
    imposta({ piatti_json: n.length > 0 ? n : null });
  };
  return <>
    <SezioneCampi titolo="Confidenti che si incontrano qui">
      {scelti.length > 0 && <div className="campo--largo flex flex-wrap gap-1.5">
        {scelti.map((c) => <button key={c} type="button" className="chip chip--attivo touch" disabled={disabilitato} aria-label={`Togli ${confidenti.dati?.find((x) => x.chiave === c)?.nome ?? c}`}
          onClick={() => imposta({ confidenti_json: scelti.filter((x) => x !== c) })}>{confidenti.dati?.find((x) => x.chiave === c)?.nome ?? c} ×</button>)}
      </div>}
      <Blocco>
        <Selettore etichetta="Aggiungi un Confidente" valore="" vuoto="— scegli —" disabilitato={disabilitato || confidenti.caricamento}
          opzioni={(confidenti.dati ?? []).filter((c) => !scelti.includes(c.chiave)).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))}
          onCambia={(k) => { if (k) imposta({ confidenti_json: [...scelti, k] }); }} />
      </Blocco>
    </SezioneCampi>
    <SezioneCampi titolo="Piatti">
      {piatti.map((p, i) => (
        <fieldset key={i} className="regole-editor campo--largo flex min-w-0 flex-col gap-2">
          <legend>Piatto {i + 1}</legend>
          <div className="griglia-campi">
            <CampoTesto etichetta="Nome" valore={p.nome} massimo={160} obbligatorio disabilitato={disabilitato} onCambia={(nome) => piatto(i, { ...p, nome })} />
            <CampoTesto etichetta="Prezzo in yen" tipo="numero" valore={p.prezzo === null ? '' : String(p.prezzo)} disabilitato={disabilitato}
              onCambia={(v) => piatto(i, { ...p, prezzo: v === '' ? null : Math.max(0, Math.round(Number(v))) })} />
            <CampoTesto etichetta="Effetto" valore={p.effetto} massimo={400} largo disabilitato={disabilitato} onCambia={(effetto) => piatto(i, { ...p, effetto })} />
          </div>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" className="self-start" disabled={disabilitato} aria-label={`Togli il piatto ${p.nome || i + 1}`} onClick={() => piatto(i, null)} />
        </fieldset>
      ))}
      <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un piatto" className="campo--largo self-start justify-self-start" disabled={disabilitato} onClick={() => imposta({ piatti_json: [...piatti, { nome: '', prezzo: null, effetto: '' }] })} />
    </SezioneCampi>
  </>;
}
