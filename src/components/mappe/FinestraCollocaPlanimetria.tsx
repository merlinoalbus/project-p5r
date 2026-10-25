// ============================================================
// FinestraCollocaPlanimetria — «Colloca»: il quartiere o il Palazzo, poi un'area esistente o una nuova, e l'etichetta (L2, L11 B5)
// ============================================================
//
// Una finestra sola per le planimetrie rimaste senza Area, usata da La città (solo quartieri) e dall'albero dei luoghi (quartieri e
// Palazzi: l'elenco «Da collocare» include anche le planimetrie dei Palazzi, e prima la finestra sapeva scegliere solo un quartiere).
// Si propone il contenitore a cui la planimetria è appesa (la mappa del quartiere o del Palazzo è il suo genitore); solo se il genitore
// non è nessuno dei due (Tokyo) il primo dell'elenco. Le aree dei contenitori arrivano dal chiamante (l'albero le ha già); se mancano,
// quelle di un quartiere si leggono dalla sua scheda, come prima.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { collocaPlanimetria, getQuartiere } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import type { MappaDaCollocareDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Dove si può collocare una planimetria: un quartiere o un Palazzo, con la chiave pubblica della sua mappa e, se già note, le sue aree. */
export interface ContenitoreColloca {
  tipo: 'quartiere' | 'dungeon';
  chiave: string;
  nome: string;
  /** La chiave pubblica della mappa del contenitore: il contenitore proposto è quello con `mappa` uguale al genitore della planimetria. */
  mappa?: string;
  aree?: Array<{ slug: string; nome: string }>;
}

const NUOVA = '__nuova__';
const idContenitore = (c: Pick<ContenitoreColloca, 'tipo' | 'chiave'>): string => `${c.tipo}:${c.chiave}`;

/** La finestra «Colloca» di una planimetria senza Area. */
export function FinestraCollocaPlanimetria({ mappa, contenitori, onChiudi, onCollocata }: {
  mappa: MappaDaCollocareDto; contenitori: ContenitoreColloca[]; onChiudi: () => void; onCollocata: () => Promise<void>;
}) {
  const [scelto, setScelto] = useState(() => {
    const proposto = contenitori.find((c) => c.mappa !== undefined && c.mappa === mappa.genitore) ?? contenitori[0];
    return proposto ? idContenitore(proposto) : '';
  });
  const [area, setArea] = useState('');
  const [nuova, setNuova] = useState('');
  const [etichetta, setEtichetta] = useState('');
  const [occupato, setOccupato] = useState(false);
  const contenitore = contenitori.find((c) => idContenitore(c) === scelto);
  const soloQuartieri = contenitori.every((c) => c.tipo === 'quartiere');
  // le aree note dal chiamante; altrimenti, per un quartiere, dalla sua scheda
  const aree = useCarica(async () => {
    if (!contenitore) return null;
    if (contenitore.aree) return contenitore.aree;
    if (contenitore.tipo === 'quartiere') return (await getQuartiere(contenitore.chiave)).aree.map((a) => ({ slug: a.slug, nome: a.nome }));
    return [];
  }, [scelto]);
  const pronto = !!contenitore && (area === NUOVA ? !!nuova.trim() : !!area) && !occupato;
  const salva = async () => {
    if (!pronto || !contenitore) return;
    setOccupato(true);
    try {
      const dove = contenitore.tipo === 'quartiere' ? { quartiere: contenitore.chiave } : { dungeon: contenitore.chiave };
      await collocaPlanimetria({ mappa: mappa.chiave, ...dove, ...(area === NUOVA ? { nuova: { nome: nuova.trim() } } : { area }), etichetta: etichetta.trim() || undefined });
      notifica('success', `${mappa.nome} collocata.`);
      await onCollocata();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Planimetria non collocata.');
    } finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`Colloca ${mappa.nome}`} aperta onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="pianta" dimensione={22} />} titolo="Colloca" disabled={!pronto} onClick={() => void salva()} />
      </>}>
      <div className="flex flex-col gap-3">
        <Selettore etichetta={soloQuartieri ? 'Quartiere' : 'Quartiere o Palazzo'} valore={scelto}
          opzioni={contenitori.map((c) => ({ chiave: idContenitore(c), nome: c.nome, ...(soloQuartieri ? {} : { gruppo: c.tipo === 'quartiere' ? 'Quartieri' : 'Palazzi' }) }))}
          onCambia={(k) => { setScelto(k); setArea(''); }} />
        <Selettore etichetta="Area" valore={area} segnaposto="Scegli un’area" disabilitato={!aree.dati}
          opzioni={[...(aree.dati ?? []).map((a) => ({ chiave: a.slug, nome: a.nome })), { chiave: NUOVA, nome: 'Un’area nuova…' }]} onCambia={setArea} />
        {area === NUOVA && <label className="flex flex-col gap-1 testo-13 font-semibold">Nome dell’area nuova
          <input className="form-input touch" value={nuova} maxLength={80} onChange={(e) => setNuova(e.target.value)} />
        </label>}
        <label className="flex flex-col gap-1 testo-13 font-semibold">Etichetta della planimetria (facoltativa)
          <input className="form-input touch" value={etichetta} maxLength={80} onChange={(e) => setEtichetta(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
