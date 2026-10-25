// ============================================================
// ElencoElementi — scegliere gli elementi (debolezze, resistenze, affinità) toccando le loro icone (L13, modelli comuni 4)
// ============================================================
//
// Al posto delle caselle di testo «una per riga» con i nomi digitati («Fuoco», «Tuono (respinge)»): una tessera per elemento, con
// l'icona e il colore che l'elemento ha in tutta l'app (`ElementoChip`), che si accende e si spegne. È un interruttore da 44 px, quindi
// vale col dito come col mouse; `aria-pressed` dice lo stato.
//
// **Il formato salvato non cambia**: resta un elenco di testi. Una tessera accesa è una voce del solo nome dell'elemento («Fuoco»,
// «Armi da fuoco»: lo riconosce `chiaveElementoDaTesto`); accenderla aggiunge il nome canonico (`NOME_ELEMENTO`), spegnerla toglie le voci che
// ne portano il solo nome. Le voci che NON sono un elemento puro — «Fuoco (Sig.ra Takase)», «Ghiaccio (annulla)», «Quasi tutti gli elementi
// tranne Sacro» — restano in una riga a parte, ognuna con il suo campo e «Togli», e il loro testo non si tocca da sé: la guida le ha scritte
// con una nota che l'elemento da solo perderebbe (la conversione in dato strutturato è un'altra ondata, con i suoi controlli).
// ============================================================

import { ELEMENTI_AFFINITA, NOME_ELEMENTO, chiaveElementoDaTesto, type ChiaveElemento } from '../../../shared/elementi';
import { coloreElemento } from '../../utils/elementi';
import { AssetImg } from './AssetImg';
import { IconaAzione } from './IconaAzione';
import { PulsanteVisivo } from './PulsanteVisivo';

interface Props {
  etichetta: string;
  /** Le voci come sono salvate (testi). */
  valore: string[];
  onCambia: (voci: string[]) => void;
  disabilitato?: boolean;
  /** Lunghezza massima di una voce a testo libero. */
  massimo?: number;
  /** Quante voci al massimo (default 30, come il tetto del server). */
  maxVoci?: number;
}

/** L'elemento che una voce nomina da solo (senza note fra parentesi), o null. «Divino» non ha tessera (nessuna affinità lo ha): la sua voce resta fra quelle a testo. */
function elementoPuro(voce: string): ChiaveElemento | null {
  if (/\(/.test(voce)) return null;
  const chiave = chiaveElementoDaTesto(voce);
  return chiave === 'almighty' ? null : chiave;
}

/** Una tessera per ogni elemento (icona e colore), acceso se una voce lo nomina da solo; sotto, le voci che non sono un elemento puro. */
export function ElencoElementi({ etichetta, valore, onCambia, disabilitato, massimo = 300, maxVoci = 30 }: Props) {
  /** Le voci che non sono un elemento puro, con la loro posizione nell'elenco intero. */
  const altre = valore.map((v, i) => ({ v, i })).filter((x) => elementoPuro(x.v) === null);
  const acceso = (chiave: ChiaveElemento) => valore.some((v) => elementoPuro(v) === chiave);
  /** Accende (aggiunge il nome canonico) o spegne (toglie le voci del solo nome) un elemento. */
  const alterna = (chiave: ChiaveElemento) => {
    if (acceso(chiave)) onCambia(valore.filter((v) => elementoPuro(v) !== chiave));
    else if (valore.length < maxVoci) onCambia([...valore, NOME_ELEMENTO[chiave]]);
  };
  /** Cambia il testo della voce in posizione `i` o la toglie. */
  const cambiaAltra = (i: number, testo: string) => onCambia(valore.map((v, j) => (j === i ? testo : v)));
  return (
    <fieldset className="campo campo--largo m-0 min-w-0 border-0 p-0">
      <legend className="campo__etichetta p-0">{etichetta}</legend>
      <div className="flex flex-wrap gap-2">
        {ELEMENTI_AFFINITA.map((e) => {
          const colore = coloreElemento(e.chiave);
          const on = acceso(e.chiave);
          return (
            <button key={e.chiave} type="button" aria-pressed={on} disabled={disabilitato} onClick={() => alterna(e.chiave)}
              className="touch inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 testo-13 font-semibold disabled:cursor-default disabled:opacity-60"
              style={on ? { borderColor: colore, color: colore, background: `color-mix(in srgb, ${colore} 22%, transparent)` } : { borderColor: 'var(--color-border-input)', color: 'var(--color-text-muted)', background: 'transparent' }}>
              <AssetImg nome={`elementi/${e.chiave}`} alt="" decorativa className="h-6 w-6 object-contain" fallback={<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colore }} aria-hidden="true" />} />
              {e.nome}
            </button>
          );
        })}
      </div>
      {altre.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="campo__aiuto">Voci con una nota, scritte dalla guida: restano come sono.</span>
          {altre.map(({ v, i }) => (
            <div key={i} className="flex items-start gap-2">
              <input className="form-input min-w-0 flex-1" type="text" maxLength={massimo} value={v} disabled={disabilitato} aria-label={`${etichetta}: voce con nota ${i + 1}`} onChange={(e) => cambiaAltra(i, e.target.value)} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={disabilitato} onClick={() => onCambia(valore.filter((_, j) => j !== i))} aria-label={`Togli «${v}» da ${etichetta}`} />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
