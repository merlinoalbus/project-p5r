import { Selettore } from '../shared/Selettore';
import { METEO_PARTITA, type MeteoPartita } from '../../../shared/meteoPartita';

/** L'assenza di osservazione resta distinta da una risposta negativa. */
export function SceltaOsservata({ etichetta, valore, onCambia, disabilitato = false, si = 'Sì', no = 'No' }: {
  etichetta: string; valore: boolean | null; onCambia: (v: boolean | null) => void;
  disabilitato?: boolean; si?: string; no?: string;
}) {
  return <Selettore etichetta={etichetta} valore={valore === null ? 'ignoto' : valore ? 'si' : 'no'} disabilitato={disabilitato}
    opzioni={[{ chiave: 'ignoto', nome: 'Non lo so' }, { chiave: 'si', nome: si }, { chiave: 'no', nome: no }]}
    onCambia={v => onCambia(v === 'ignoto' ? null : v === 'si')} />;
}

/** Nessun rango attuale viene usato per ricostruire una visita passata. */
export function RangoPeriziaOsservato({ valore, onCambia, disabilitato = false }: {
  valore: number | null; onCambia: (v: 1 | 2 | 3 | 4 | 5 | null) => void; disabilitato?: boolean;
}) {
  return <Selettore etichetta="Rango Perizia durante la visita" valore={valore === null ? '' : String(valore)} vuoto="Non lo so" disabilitato={disabilitato}
    opzioni={[1, 2, 3, 4, 5].map(n => ({ chiave: String(n), nome: n === 5 ? '5 · Massimo' : String(n) }))}
    onCambia={v => onCambia(v === '' ? null : Number(v) as 1 | 2 | 3 | 4 | 5)} />;
}

export function MeteoOsservatoPesca({ valore, onCambia, disabilitato = false }: {
  valore: MeteoPartita | null; onCambia: (v: MeteoPartita | null) => void; disabilitato?: boolean;
}) {
  return <Selettore etichetta="Meteo osservato durante la visita" valore={valore ?? ''} vuoto="Non lo so" disabilitato={disabilitato}
    opzioni={METEO_PARTITA.map(m => ({ chiave: m.chiave, nome: m.nome }))}
    onCambia={v => onCambia(v === '' ? null : v as MeteoPartita)} />;
}

/** Vuoto significa ignoto; non diventa zero né il conteggio delle visite. */
export function NumeroOsservatoPesca({ etichetta, valore, onCambia, minimo = 0, massimo = 1_000_000, disabilitato = false }: {
  etichetta: string; valore: number | null; onCambia: (v: number | null) => void;
  minimo?: number; massimo?: number; disabilitato?: boolean;
}) {
  return <label className="flex min-w-0 flex-col gap-1 text-[13px]">
    <span>{etichetta}</span>
    <input className="form-input min-h-11 w-full" type="number" inputMode="numeric" min={minimo} max={massimo} step={1}
      value={valore ?? ''} disabled={disabilitato} aria-description="Lascia vuoto se il valore non è noto."
      onChange={e => {
        if (e.target.value === '') { onCambia(null); return; }
        const n = Number(e.target.value);
        if (Number.isSafeInteger(n) && n >= minimo && n <= massimo) onCambia(n);
      }} />
  </label>;
}

/** Intervalli restituiti dal backend: il browser non ricalcola premi o inverse. */
export function IntervalloPesca({ minimo, massimo, unita }: { minimo: number; massimo: number | null; unita: string }) {
  const n = (v: number) => v.toLocaleString('it-IT');
  return <span>{massimo === minimo ? `${n(minimo)} ${unita}` : massimo === null ? `Almeno ${n(minimo)} ${unita}; limite superiore non noto` : `${n(minimo)}–${n(massimo)} ${unita}`}</span>;
}
