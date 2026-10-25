import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from './RigaDote';
import { CATEGORIE_LETTURA, TIPI_EFFETTO_AZIONE, type CategoriaLettura, type EffettoAzione } from '../../../shared/effettiAzione';
import type { ElenchiAzioneDto } from '../../types';

const FIN_DOVE: OpzioneSelettore[] = [
  { chiave: '', nome: 'Completato', dettaglio: 'al cinema: una visione' },
  ...Array.from({ length: 9 }, (_, i) => ({ chiave: String(i + 1), nome: `Almeno ${i + 1} ${i === 0 ? 'sessione' : 'sessioni'}`, dettaglio: 'o visioni, o serate' })),
];
function elencoLettura(categoria: CategoriaLettura, e: ElenchiAzioneDto): OpzioneSelettore[] { return categoria === 'libro' ? e.libri : categoria === 'film' ? e.film : e.videogiochi; }
function effettoNuovo(tipo: EffettoAzione['tipo']): EffettoAzione {
  return tipo === 'lettura' ? { tipo, categoria: 'libro', chiave: '', almeno: null } : tipo === 'turno' ? { tipo, attivita: '' } : { tipo: 'dote', dote: 'fascino', note: 2 };
}

/** I tre tipi storici conservano gli stessi controlli sia nella vecchia lista sia nella fonte con UID. */
export function RigaEffettoVoceLegacy({ effetto, elenchi, onCambia, onTogli, numero }: { effetto: EffettoAzione; elenchi: ElenchiAzioneDto; onCambia: (e: EffettoAzione) => void; onTogli: () => void; numero: number }) {
  return <li className="flex flex-col gap-2 rounded border border-border p-2">
    <div className="flex flex-wrap items-end gap-2">
      <Selettore className="min-w-[10rem] flex-1" etichetta={`Effetto ${numero}`} valore={effetto.tipo} opzioni={TIPI_EFFETTO_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome }))} onCambia={(v) => { if (v !== effetto.tipo) onCambia(effettoNuovo(v as EffettoAzione['tipo'])); }} />
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli l'effetto ${numero}`} onClick={onTogli} />
    </div>
    {effetto.tipo === 'dote' && <RigaDote etichetta="Dote" dote={{ dote: effetto.dote, note: effetto.note }} onCambia={(d) => onCambia({ tipo: 'dote', ...d })} />}
    {effetto.tipo === 'lettura' && <div className="flex flex-wrap items-end gap-2">
      <Selettore className="min-w-[8rem]" etichetta="Che cosa" valore={effetto.categoria} opzioni={CATEGORIE_LETTURA.map((c) => ({ chiave: c.chiave, nome: c.nome }))} onCambia={(v) => { if (v !== effetto.categoria) onCambia({ ...effetto, categoria: v as CategoriaLettura, chiave: '' }); }} />
      <Selettore className="min-w-[12rem] flex-1" etichetta="Titolo" valore={effetto.chiave} opzioni={elencoLettura(effetto.categoria, elenchi)} onCambia={(v) => onCambia({ ...effetto, chiave: v })} />
      <Selettore className="min-w-[10rem]" etichetta="Fin dove" valore={effetto.almeno === null ? '' : String(effetto.almeno)} opzioni={FIN_DOVE} ricerca="mai" onCambia={(v) => onCambia({ ...effetto, almeno: v === '' ? null : Number(v) })} />
    </div>}
    {effetto.tipo === 'turno' && <div className="flex flex-col gap-2">
      <Selettore etichetta="Attività (contata per volte)" valore={effetto.attivita} opzioni={elenchi.attivita.filter((a) => a.turni)} onCambia={(v) => onCambia({ ...effetto, attivita: v })} />
      <label className="flex items-center gap-2 testo-13 touch"><input type="checkbox" className="w-5 h-5" checked={effetto.doti !== undefined} onChange={(e) => onCambia(e.target.checked ? { ...effetto, doti: [{ dote: 'perizia', note: 2 }] } : { tipo: 'turno', attivita: effetto.attivita })} />Doti proprie di questo turno, al posto di quelle dell’attività</label>
      {effetto.doti?.map((d, i) => <div key={i} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-0"><RigaDote etichetta={`Dote ${i + 1}`} dote={d} onCambia={(nuova) => onCambia({ ...effetto, doti: effetto.doti!.map((x, j) => j === i ? nuova : x) })} /></div>
        {effetto.doti!.length > 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la Dote ${i + 1} dell’effetto ${numero}`} onClick={() => onCambia({ ...effetto, doti: effetto.doti!.filter((_, j) => j !== i) })} />}
      </div>)}
      {effetto.doti && effetto.doti.length < 5 && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote" onClick={() => onCambia({ ...effetto, doti: [...effetto.doti!, { dote: 'fascino', note: 2 }] })} />}
    </div>}
  </li>;
}
