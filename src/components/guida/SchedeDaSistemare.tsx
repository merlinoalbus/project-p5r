// ============================================================
// SchedeDaSistemare — le schede della guida senza mappa né voce, coi due gesti che le sistemano (L4 §2.3, §4.3)
// ============================================================
//
// Le schede di prima che non stanno su una planimetria e non hanno una voce (Kamoshida 1, 14, 15, 16; Madarame 28) si leggono qui,
// nella scheda del Palazzo, col loro testo e la loro infiltrazione, e si sistemano con «Crea la voce» (una voce nuova col loro nome e la
// loro descrizione, in fondo alla loro infiltrazione) o «Collega a una voce» (una voce del Palazzo che le assorbe). Mai «Elimina»: le
// righe restano (L11). Nessuno stato si trasferisce (R4-12). Ogni gesto chiede prima, in una finestra, e «Annulla» non tocca niente.
// ============================================================

import { useState } from 'react';
import { collegaSchedaAllaVoce, creaVoceDallaScheda } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_TIPO } from '../../utils/dungeon';
import { spilloPerPunto } from '../../../shared/spilli';
import { carattereDaTipo } from '../../../shared/caratteriVoce';
import type { AreaDungeonDto, PuntoInteresseDto, SchedaDaSistemareDto } from '../../types';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** I tipi che una voce di un Palazzo può avere (Trama è solo dei Memento, come dice il server). */
const TIPI_VOCE = (Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][]).filter((t) => t !== 'trama');

/** Il tipo di voce proposto per una scheda: il primo tipo di voce che il suo tipo di pin rappresenta (forziere → Forziere normale,
 *  seme della bramosia → Semi della bramosia…), altrimenti «Altro». */
function tipoVocePerScheda(tipoScheda: string): PuntoInteresseDto['tipo'] {
  return TIPI_VOCE.find((t) => t !== 'altro' && t !== 'storia' && spilloPerPunto(t) === tipoScheda) ?? 'altro';
}

interface Props {
  schede: ReadonlyArray<SchedaDaSistemareDto>;
  /** Le infiltrazioni del Palazzo con le loro voci: fra queste si sceglie la voce da collegare. */
  aree: ReadonlyArray<AreaDungeonDto>;
  /** Dopo un gesto riuscito: la pagina rilegge la scheda (la scheda sistemata esce dall'elenco, la voce entra nella guida). */
  onSistemata: () => Promise<void>;
  /** FUN4-1: il Palazzo è completato nella partita attiva (`DungeonDettaglioDto.completato`): una voce permanente nuova lo riporta a «Concluso». */
  completato?: boolean;
}

/** Sezione richiudibile «Schede da sistemare (N)»: per ogni scheda nome, infiltrazione, testo e i due gesti; niente se non ce ne sono. */
export function SchedeDaSistemare({ schede, aree, onSistemata, completato = false }: Props) {
  /** Il gesto in corso: la scheda, quale gesto e la scelta fatta nella finestra (il tipo della voce nuova o la voce da collegare). */
  const [gesto, setGesto] = useState<{ scheda: SchedaDaSistemareDto; cosa: 'crea' | 'collega'; valore: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  if (schede.length === 0) return null;

  const ordinate = [...aree].sort((a, b) => a.ordine - b.ordine);
  /** Le voci del Palazzo fra cui scegliere: prima quelle dell'infiltrazione della scheda, poi le altre nell'ordine delle infiltrazioni. */
  const vociPer = (s: SchedaDaSistemareDto) => [...ordinate.filter((a) => a.chiave === s.infiltrazione), ...ordinate.filter((a) => a.chiave !== s.infiltrazione)]
    .flatMap((a) => a.punti.map((p) => ({ chiave: p.chiave, nome: p.nome, dettaglio: NOME_TIPO[p.tipo], gruppo: `${a.ordine + 1}. ${a.nome}` })));

  /** Esegue il gesto della finestra: notifica, chiude e fa rileggere la pagina; un errore lascia la finestra aperta col messaggio. */
  const conferma = async () => {
    if (!gesto || !gesto.valore) return;
    setOccupato(true);
    try {
      const voce = gesto.cosa === 'crea' ? await creaVoceDallaScheda(gesto.scheda.id, gesto.valore as PuntoInteresseDto['tipo']) : await collegaSchedaAllaVoce(gesto.scheda.id, gesto.valore);
      notifica('success', gesto.cosa === 'crea' ? `Voce «${voce.nome}» creata in ${gesto.scheda.infiltrazioneNome}.` : `«${gesto.scheda.nome}» collegata a «${voce.nome}».`);
      setGesto(null);
      await onSistemata();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'La scheda non è stata sistemata.'); }
    finally { setOccupato(false); }
  };

  return (
    <details className="testo-12">
      <summary className="touch cursor-pointer font-semibold text-text-secondary">Schede da sistemare ({schede.length})</summary>
      <p className="m-0 pt-1 text-text-muted">Contenuti della guida che non stanno su una planimetria e non hanno una voce: creane la voce o collegali a una voce del Palazzo.</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1.5" aria-label="Schede da sistemare">
        {schede.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 rounded-md border border-border-light px-2 py-1">
            <span className="testo-13 font-semibold">{s.nome}</span>
            <span className="testo-12 text-text-muted">{s.infiltrazioneNome}</span>
            {s.descrizione && <p className="m-0 whitespace-pre-wrap testo-12 text-text-secondary">{s.descrizione}</p>}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Crea la voce" aria-label={`Crea la voce da «${s.nome}»`} onClick={() => setGesto({ scheda: s, cosa: 'crea', valore: tipoVocePerScheda(s.tipo) })} />
              <PulsanteVisivo compatto icona={<IconaAzione chiave="url" dimensione={20} />} titolo="Collega a una voce" aria-label={`Collega «${s.nome}» a una voce`} onClick={() => setGesto({ scheda: s, cosa: 'collega', valore: '' })} />
            </div>
          </li>
        ))}
      </ul>
      {gesto && (
        <Modal titolo={gesto.cosa === 'crea' ? `Crea la voce da «${gesto.scheda.nome}»` : `Collega «${gesto.scheda.nome}» a una voce`} aperta onChiudi={() => !occupato && setGesto(null)}
          azioni={<>
            <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setGesto(null)}>Annulla</button>
            <PulsanteVisivo tono="primario" icona={<IconaAzione chiave={gesto.cosa === 'crea' ? 'piu' : 'url'} dimensione={22} />} titolo={gesto.cosa === 'crea' ? 'Crea la voce' : 'Collega'} disabled={occupato || !gesto.valore} onClick={() => void conferma()} />
          </>}>
          <div className="flex flex-col gap-3">
            <p className="m-0 testo-14">
              {gesto.cosa === 'crea'
                ? `Una voce nuova in fondo a «${gesto.scheda.infiltrazioneNome}», col nome e la descrizione della scheda. Nessuno stato si trasferisce.`
                : 'La voce scelta prende il posto della scheda, che esce da quest’elenco. Nessuno stato si trasferisce.'}
            </p>
            {/* FUN4-1 (strada (a) del PM): una voce di tipo permanente conta fra gli oggetti permanenti — la voce non si segna da sola
                («1 B»), quindi lo si dice prima: nella partita che ha completato il Palazzo, questo torna a «Concluso» finché non la si segna */}
            {gesto.cosa === 'crea' && carattereDaTipo(gesto.valore, null) === 'permanente' && (
              <p className="m-0 rounded-md border border-warning/50 px-2 py-1.5 testo-13 text-warning" role="note">
                {completato
                  ? 'La voce nuova conta fra gli oggetti permanenti: in questa partita il Palazzo torna da «Completato» a «Concluso» finché non la segni.'
                  : 'La voce nuova conta fra gli oggetti permanenti del Palazzo: la percentuale si ricalcola con lei.'}
              </p>
            )}
            {gesto.cosa === 'crea'
              ? <Selettore className="selettore--in-linea" etichetta="Tipo" valore={gesto.valore} opzioni={TIPI_VOCE.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => setGesto({ ...gesto, valore: v })} />
              : <Selettore className="selettore--in-linea" etichetta="Voce" valore={gesto.valore} segnaposto="Scegli la voce…" ricerca="sempre" opzioni={vociPer(gesto.scheda)}
                onCambia={(v) => setGesto({ ...gesto, valore: v })} />}
          </div>
        </Modal>
      )}
    </details>
  );
}
