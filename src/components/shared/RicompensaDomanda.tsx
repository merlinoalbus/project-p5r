// ============================================================
// RicompensaDomanda — che cosa dà una domanda in classe, un quiz o un esame (L13, ondata 7, O7-2)
// ============================================================
//
// Decisione 9 dell'utente: la Dote di una domanda la applica la voce del Diario che la segna. La ricompensa che la pagina mostra si genera
// quindi dagli effetti delle voci (`DomandaDto.premioVoce`, dal server; le parole in `utils/ricompensaDomanda.ts`): le Doti («Conoscenza ♪»),
// per una riga d'esame senza Doti «conta per il piazzamento», e se una voce chiede alla spunta il piazzamento di un esame lo dice. Il testo
// della guida (`ricompensa`) resta solo dove dice altro da quel che le voci danno (da decidere: decisione 10) o dove nessuna voce segna la
// domanda; accanto alle Doti delle voci si mostra come «Per la guida: …», l'unica etichetta che serve (avvisa di una differenza). Una sola
// resa per DomandePage e ScuolaOggi.
// ============================================================

import type { DomandaDto } from '../../types';
import { partiRicompensaDallaVoce } from '../../utils/ricompensaDomanda';
import { TestoNote } from './TestoNote';

/** La ricompensa di una domanda, o niente se non c'è niente da dire. */
export function RicompensaDomanda({ d, className = 'testo-12 text-text-secondary' }: { d: Pick<DomandaDto, 'tipo' | 'ricompensa' | 'premioVoce'>; className?: string }) {
  const parti = partiRicompensaDallaVoce(d);
  if (!parti.length && !d.ricompensa) return null;
  return (
    <span className={className}>
      {parti.length > 0 && <TestoNote testo={parti.join(' · ')} />}
      {d.ricompensa && (parti.length > 0
        ? <span className="text-text-muted"> · Per la guida: <TestoNote testo={d.ricompensa} daParole="guida" /></span>
        : <TestoNote testo={d.ricompensa} daParole="guida" />)}
    </span>
  );
}
