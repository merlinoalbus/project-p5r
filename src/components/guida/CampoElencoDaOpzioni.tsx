// ============================================================
// CampoElencoDaOpzioni — un elenco di voci scelte per NOME da un elenco chiuso con ricerca (L11 · R11-17/1, gruppo «Luoghi e note»)
// ============================================================
//
// Per i campi `elenco` della finestra di correzione (`ModificaGuida`) le cui voci sono nomi di cose che esistono già: le sedi di un listino, le offerte e gli
// oggetti a cui si riferisce una nota storica. Le voci scelte stanno in righe, ognuna con «Togli» (bersaglio da 44 px); per aggiungerne si apre l'elenco di
// ciò che manca e si cerca scrivendo un pezzo del nome (il valore è sempre una voce dell'elenco, mai quello che hai digitato). Le opzioni vengono dal server
// con la scheda (`opzioni` del campo); il server ricontrolla ogni voce.
// ============================================================

import type { CampoCorrezioneDto, ValoreCampoCorrezione } from '../../types';
import { Selettore } from '../shared/Selettore';

interface Props {
  campo: CampoCorrezioneDto;
  valore: ValoreCampoCorrezione | undefined;
  imposta: (voci: string[]) => void;
  occupato: boolean;
}

/** Le voci scelte con «Togli», e sotto il selettore con ricerca per aggiungerne altre. */
export function CampoElencoDaOpzioni({ campo, valore, imposta, occupato }: Props) {
  const voci = Array.isArray(valore) ? valore : [];
  const disponibili = (campo.opzioni ?? []).filter((o) => !voci.includes(o.chiave));
  return (
    <fieldset className="regole-editor flex min-w-0 flex-col gap-2 sm:col-span-2">
      <legend>{campo.etichetta}</legend>
      {voci.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna voce.</p>}
      {voci.map((v) => (
        <div key={v} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 break-words text-[13px]">{v}</span>
          <button type="button" className="btn btn-ghost btn-sm touch shrink-0" disabled={occupato} onClick={() => imposta(voci.filter((x) => x !== v))} aria-label={`Togli «${v}» da ${campo.etichetta}`}>Togli</button>
        </div>
      ))}
      <Selettore etichetta="Aggiungi" valore="" ricerca="sempre" segnaposto="Cerca per nome…" disabilitato={occupato}
        opzioni={disponibili.map((o) => ({ chiave: o.chiave, nome: o.nome }))} onCambia={(k) => { if (k !== '') imposta([...voci, k]); }} />
    </fieldset>
  );
}
