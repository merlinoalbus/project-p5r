// ============================================================
// ModuloBossFinale — «Modifica › Boss finale» di un Palazzo (L4 §8.14): la voce «Boss» che lo conclude
// ============================================================

import { aggiornaDungeon, ripristinaDungeon } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { CorrezioneGuida } from './CorrezioneGuida';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { DungeonDettaglioDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** «Modifica › Boss finale» (L4 §8.14): la voce «Boss» del Palazzo che lo conclude, fra le voci «Boss» della sua guida (nell'ordine delle
 *  infiltrazioni), «nessuna» per toglierla e «Ripristina» se l'utente l'ha cambiata. Senza voce il Palazzo non risulta mai concluso.
 *  Si apre sotto l'intestazione, come la correzione della scheda. Nel rilascio non c'è (costante di build: il modulo esce dal bundle). */
export function ModuloBossFinale({ d, onChiudi, onSalvato }: { d: DungeonDettaglioDto; onChiudi: () => void; onSalvato: () => Promise<unknown> }) {
  if (IN_RILASCIO) return null;
  const vociBoss = d.aree.flatMap((a) => a.punti.filter((p) => p.tipo === 'boss').map((p) => ({ chiave: p.chiave, nome: p.nome, dettaglio: `${a.ordine + 1}. ${a.nome}` })));
  // la voce dichiarata oggi resta fra le scelte anche se non è più «Boss» (cambiata di tipo dopo): l'utente vede che cosa sta togliendo
  const attuale = d.voceBossFinale;
  const opzioni = attuale && !vociBoss.some((o) => o.chiave === attuale.chiave)
    ? [{ chiave: attuale.chiave, nome: attuale.nome, dettaglio: 'dichiarata, non è più una voce «Boss»' }, ...vociBoss]
    : vociBoss;
  const ripristina = async () => {
    try { await ripristinaDungeon(d.chiave); onChiudi(); notifica('success', 'Boss finale riportato a quello della guida.'); await onSalvato(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Boss finale non ripristinato.'); }
  };
  return (
    <CorrezioneGuida aperta onChiudi={onChiudi} cosa={`il boss finale del Palazzo «${d.nome}»`} etichetta="Boss finale"
      iniziale={() => ({ voce: d.voceBossFinale?.chiave ?? '' })}
      onSalva={async (b) => { await aggiornaDungeon(d.chiave, { voceBossFinale: b.voce || null }); await onSalvato(); }}>
      {(b, cambia) => <>
        {/* sempre il selettore: «nessuna» resta raggiungibile anche senza voci «Boss» da scegliere */}
        <span className="min-w-[220px] flex-1">
          <Selettore etichetta="Voce del boss finale" valore={b.voce} vuoto="— nessuna: il Palazzo non si conclude —" opzioni={opzioni} onCambia={(v) => cambia({ voce: v })} />
        </span>
        {vociBoss.length === 0 && <p className="m-0 basis-full testo-13 text-text-secondary">La guida del Palazzo non ha voci «Boss»: aggiungine una in un’infiltrazione per sceglierla qui.</p>}
        {d.bossFinaleCorretto && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina"
          aria-label={`Ripristina il boss finale della guida: il Palazzo «${d.nome}»`} onClick={() => void ripristina()} />}
      </>}
    </CorrezioneGuida>
  );
}
