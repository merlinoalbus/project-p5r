// ============================================================
// CampiLuogo — i campi comuni di un luogo nuovo o da correggere: nome, tipo a tessere, che cosa offre, orari (L13, O7-5)
// ============================================================
//
// Censimento del 25/10: «tre moduli diversi per creare un luogo». Questi campi sono UNO e li usano tutti e tre i punti d'ingresso: il
// modulo del luogo (`ModuloLuogo`: Aggiungi un luogo dal quartiere, Correggi il luogo), «Aggiungi luogo» della planimetria
// (`FinestraAggiungiLuogo`, che poi chiede il punto) e «Crea un luogo da questo pin» (`FinestraLuogoDaPin`, che poi mostra l'anteprima).
// Ognuno manda il suo corpo di sempre alla sua rotta: cambia solo che campi, etichette, limiti e regola degli orari sono scritti una volta.
//
// Sta in un file suo, con la condizione costante di build nello stesso modulo (vedi `utils/modalita.ts`): le due finestre della mappa lo
// importano anche nel bundle di rilascio, dove non esistono, e così il bundler ne scarta il corpo invece di portarsi dietro il modulo del
// luogo (misurato: senza, il rilascio conteneva tutto `ModuloLuogo`).
// ============================================================

import { IconaSpillo } from '../../mappe/IconaSpillo';
import { SelettoreIcone, type OpzioneIcone } from '../../shared/SelettoreIcone';
import { TIPI_LUOGO } from '../../../../shared/tipiLuogo';
import { OrariEditor } from '../OrariEditor';
import { ORARI_SEMPRE, type OrariNegozio } from '../../../../shared/orariNegozio';
import { Blocco } from './campi';
import { CampoTesto } from '../../shared/Campo';
import { NienteInRilascio, type StrumentoDiModifica } from '../../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** I limiti dei campi del luogo, gli stessi dello schema dell'API (`datiLuogo`, `LuogoNuovoDaPin`). */
const LIMITI_LUOGO = { nome: 160, cosaOffre: 600 } as const;

/** I valori comuni di un luogo nuovo o da correggere. `tipo` null = non ancora scelto (il luogo da un pin lo chiede). */
export interface ValoriLuogo { nome: string; tipo: string | null; cosaOffre: string; orari: OrariNegozio | null }

/** Le tessere dei tipi, con l'icona dello spillo (costruite al primo uso: niente codice in cima al modulo). */
let opzioniTipo: OpzioneIcone[] | null = null;
const opzioniDelTipo = (): OpzioneIcone[] => (opzioniTipo ??= TIPI_LUOGO.map((t) => ({ chiave: t.chiave, nome: t.nome, icona: <IconaSpillo tipo={t.icona} dimensione={28} /> })));

interface Props { valore: ValoriLuogo; onCambia: (patch: Partial<ValoriLuogo>) => void; disabilitato?: boolean }

/**
 * I campi comuni del luogo, come elementi di una griglia (`.griglia-campi` o `SezioneCampi`): nome, tipo a tessere, che cosa offre e gli
 * orari (o la regola dell'app, «giorno e sera», quando la guida non li dà). `onCambia` riceve solo il campo cambiato.
 */
// L12 (passo 8): nel rilascio (sola lettura) i campi non esistono; la condizione è costante di build, `CampiLuogoReali` esce dal bundle
export const CampiLuogo: StrumentoDiModifica<typeof CampiLuogoReali> = IN_RILASCIO ? NienteInRilascio : CampiLuogoReali;
function CampiLuogoReali({ valore, onCambia, disabilitato }: Props) {
  return <>
    <CampoTesto etichetta="Nome del luogo" valore={valore.nome} massimo={LIMITI_LUOGO.nome} obbligatorio largo disabilitato={disabilitato} onCambia={(nome) => onCambia({ nome })} />
    <Blocco largo>
      <SelettoreIcone compatto etichetta="Tipo" valore={valore.tipo ?? ''} opzioni={opzioniDelTipo()} disabilitato={disabilitato} onCambia={(tipo) => onCambia({ tipo })} />
    </Blocco>
    <CampoTesto etichetta="Che cosa offre" tipo="lungo" valore={valore.cosaOffre} massimo={LIMITI_LUOGO.cosaOffre} disabilitato={disabilitato} onCambia={(cosaOffre) => onCambia({ cosaOffre })} />
    <fieldset className="regole-editor campo--largo flex min-w-0 flex-col gap-2">
      <legend>Orari del luogo</legend>
      <label className="flex items-start gap-2 testo-13 touch">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={valore.orari === null} disabled={disabilitato} onChange={(e) => onCambia({ orari: e.target.checked ? null : { ...ORARI_SEMPRE } })} />
        <span>La guida non indica orari: vale la regola dell’app (giorno e sera)</span>
      </label>
      {valore.orari && <OrariEditor valore={valore.orari} onCambia={(orari) => onCambia({ orari })} disabilitato={disabilitato} />}
    </fieldset>
  </>;
}
