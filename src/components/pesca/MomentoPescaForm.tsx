import { GIORNI_NEL_MESE, MESI_GIOCO } from '../../../shared/condizioniSpillo';
import type { MomentoPescaInCompilazione } from '../../utils/pesca';
import { Selettore } from '../shared/Selettore';
import { NumeroOsservatoPesca } from './CampiPesca';

export function MomentoPescaForm({ valore: v, onCambia, disabilitato = false }: {
  valore: MomentoPescaInCompilazione; onCambia: (v: MomentoPescaInCompilazione) => void; disabilitato?: boolean;
}) {
  const [mese = '', giorno = ''] = v.giorno.split('-');
  return <div className="grid min-w-0 gap-2 sm:grid-cols-2">
    <Selettore etichetta="Mese della visita" valore={mese} vuoto="Scegli il mese" disabilitato={disabilitato}
      opzioni={MESI_GIOCO.map(m => ({ chiave: m.numero, nome: m.nome }))}
      onCambia={m => onCambia({ ...v, giorno: `${m}-${Number(giorno) <= (GIORNI_NEL_MESE[m] ?? 0) ? giorno : ''}` })} />
    <Selettore etichetta="Giorno della visita" valore={giorno} vuoto="Scegli il giorno" disabilitato={disabilitato || !mese}
      opzioni={Array.from({ length: GIORNI_NEL_MESE[mese] ?? 0 }, (_, i) => ({ chiave: String(i + 1).padStart(2, '0'), nome: String(i + 1) }))}
      onCambia={g => onCambia({ ...v, giorno: `${mese}-${g}` })} />
    <Selettore etichetta="Fascia della visita" valore={v.fascia} vuoto="Scegli la fascia" disabilitato={disabilitato}
      opzioni={[{ chiave: 'giorno', nome: 'Giorno' }, { chiave: 'sera', nome: 'Sera' }]}
      onCambia={f => onCambia({ ...v, fascia: f as MomentoPescaInCompilazione['fascia'] })} />
    <NumeroOsservatoPesca etichetta="Ordine delle visite nella stessa fascia, da 1" valore={v.ordineVisita === null ? null : v.ordineVisita + 1}
      minimo={1} massimo={1_000_001} disabilitato={disabilitato} onCambia={n => onCambia({ ...v, ordineVisita: n === null ? null : n - 1 })} />
  </div>;
}
