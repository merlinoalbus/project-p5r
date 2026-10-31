// ============================================================
// MomentoPescaForm — giorno, fascia e ordine della visita alla pesca
// ============================================================
//
// L13 (O7-5, censimento del 25/10): il giorno è `SelettoreData`, il selettore unico delle date di gioco (prima due selettori propri di
// mese e giorno, che lasciavano un «04-» a metà); il valore resta 'MM-GG', o '' finché non è scelto, e lo controlla `momentoPescaValido`.
// ============================================================

import type { MomentoPescaInCompilazione } from '../../utils/pesca';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { Campo } from '../shared/Campo';
import { NumeroOsservatoPesca } from './CampiPesca';

export function MomentoPescaForm({ valore: v, onCambia, disabilitato = false }: {
  valore: MomentoPescaInCompilazione; onCambia: (v: MomentoPescaInCompilazione) => void; disabilitato?: boolean;
}) {
  return <div className="griglia-campi">
    <Campo etichetta="Giorno della visita" senzaGruppo>
      <SelettoreData etichetta="Giorno della visita" valore={v.giorno} disabilitato={disabilitato} onCambia={giorno => onCambia({ ...v, giorno })} />
    </Campo>
    <Selettore etichetta="Fascia della visita" valore={v.fascia} vuoto="Scegli la fascia" disabilitato={disabilitato}
      opzioni={[{ chiave: 'giorno', nome: 'Giorno' }, { chiave: 'sera', nome: 'Sera' }]}
      onCambia={f => onCambia({ ...v, fascia: f as MomentoPescaInCompilazione['fascia'] })} />
    <NumeroOsservatoPesca etichetta="Ordine delle visite nella stessa fascia, da 1" valore={v.ordineVisita === null ? null : v.ordineVisita + 1}
      minimo={1} massimo={1_000_001} disabilitato={disabilitato} onCambia={n => onCambia({ ...v, ordineVisita: n === null ? null : n - 1 })} />
  </div>;
}
