// ============================================================
// EditorAzioneStrutturata — tipo, collegamento, rango atteso ed effetti della spunta di un'azione della giornata
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le azioni della guida, e quelle che aggiunge lui, si devono poter
// classificare e collegare come le altre («devo poter modificare al 100% gli eventi della guida»), e i
// punti della spunta vengono dagli effetti dichiarati, non dal testo delle note. Qui si sceglie tutto da
// elenchi chiusi (`Selettore`): il collegamento a un Confidente, un Palazzo, una richiesta, un libro, un
// film, un'attività, un negozio o una Dote; il rango atteso per i Confidenti; gli effetti — Dote con le
// note, lettura fino a un punto, turno di un lavoro con Doti proprie facoltative.
// ============================================================

import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from './RigaDote';
import { useCarica } from '../../hooks/useCarica';
import { getElenchiAzione } from '../../services/api';
import {
  CATEGORIE_LETTURA, TIPI_AZIONE, TIPI_EFFETTO_AZIONE, TIPI_RIFERIMENTO_AZIONE,
  type CategoriaLettura, type EffettoAzione, type TipoAzione, type TipoRiferimentoAzione,
} from '../../../shared/effettiAzione';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import type { ElenchiAzioneDto } from '../../types';

const RANGHI: OpzioneSelettore[] = Array.from({ length: 10 }, (_, i) => ({ chiave: String(i + 1), nome: `Rango ${i + 1}` }));
const FIN_DOVE: OpzioneSelettore[] = [
  { chiave: '', nome: 'Completato', dettaglio: 'al cinema: una visione' },
  ...Array.from({ length: 9 }, (_, i) => ({ chiave: String(i + 1), nome: `Almeno ${i + 1} ${i === 0 ? 'sessione' : 'sessioni'}`, dettaglio: 'o visioni, o serate' })),
];

/** Le voci fra cui scegliere l'elemento collegato, secondo il tipo di collegamento. */
function elencoRiferimento(tipo: TipoRiferimentoAzione, e: ElenchiAzioneDto): OpzioneSelettore[] {
  switch (tipo) {
    case 'confidente': return e.confidenti;
    case 'dungeon': return e.dungeon;
    case 'richiesta': return e.richieste;
    case 'libro': return e.libri;
    case 'film': return e.film;
    case 'attivita': return e.attivita;
    case 'negozio': return e.negozi;
    case 'dote': return e.doti;
  }
}

/** I titoli fra cui scegliere per un effetto di lettura: libri, film o videogiochi secondo la categoria. */
function elencoLettura(categoria: CategoriaLettura, e: ElenchiAzioneDto): OpzioneSelettore[] {
  return categoria === 'libro' ? e.libri : categoria === 'film' ? e.film : e.videogiochi;
}

/** L'effetto con cui nasce una riga nuova o cambia tipo: il più semplice e valido. */
function effettoNuovo(tipo: EffettoAzione['tipo']): EffettoAzione {
  if (tipo === 'lettura') return { tipo: 'lettura', categoria: 'libro', chiave: '', almeno: null };
  if (tipo === 'turno') return { tipo: 'turno', attivita: '' };
  return { tipo: 'dote', dote: 'fascino', note: 2 };
}

/**
 * Un effetto della spunta: tipo (cambiarlo riparte dall'effetto più semplice di quel tipo) e i suoi campi. Dote: dote
 * e note. Lettura: categoria (cambiarla azzera il titolo), titolo e fin dove (completato o almeno N sessioni). Turno:
 * attività fra quelle contate a turni e, se spuntato, Doti proprie del turno (da 1 a 5) al posto di quelle dell'attività.
 */
function RigaEffetto({ effetto, elenchi, onCambia, onTogli, numero }: { effetto: EffettoAzione; elenchi: ElenchiAzioneDto; onCambia: (e: EffettoAzione) => void; onTogli: () => void; numero: number }) {
  return (
    <li className="flex flex-col gap-2 rounded border border-border p-2">
      <div className="flex flex-wrap items-end gap-2">
        <Selettore className="min-w-[10rem] flex-1" etichetta={`Effetto ${numero}`} valore={effetto.tipo} opzioni={TIPI_EFFETTO_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome }))}
          onCambia={(v) => { if (v !== effetto.tipo) onCambia(effettoNuovo(v as EffettoAzione['tipo'])); }} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli l'effetto ${numero}`} onClick={onTogli} />
      </div>
      {effetto.tipo === 'dote' && <RigaDote etichetta="Dote" dote={{ dote: effetto.dote, note: effetto.note }} onCambia={(d) => onCambia({ tipo: 'dote', ...d })} />}
      {effetto.tipo === 'lettura' && (
        <div className="flex flex-wrap items-end gap-2">
          <Selettore className="min-w-[8rem]" etichetta="Che cosa" valore={effetto.categoria} opzioni={CATEGORIE_LETTURA.map((c) => ({ chiave: c.chiave, nome: c.nome }))}
            onCambia={(v) => { if (v !== effetto.categoria) onCambia({ ...effetto, categoria: v as CategoriaLettura, chiave: '' }); }} />
          <Selettore className="min-w-[12rem] flex-1" etichetta="Titolo" valore={effetto.chiave} opzioni={elencoLettura(effetto.categoria, elenchi)} onCambia={(v) => onCambia({ ...effetto, chiave: v })} />
          <Selettore className="min-w-[10rem]" etichetta="Fin dove" valore={effetto.almeno === null ? '' : String(effetto.almeno)} opzioni={FIN_DOVE} ricerca="mai"
            onCambia={(v) => onCambia({ ...effetto, almeno: v === '' ? null : Number(v) })} />
        </div>
      )}
      {effetto.tipo === 'turno' && (
        <div className="flex flex-col gap-2">
          <Selettore etichetta="Attività (contata per volte)" valore={effetto.attivita} opzioni={elenchi.attivita.filter((a) => a.turni)} onCambia={(v) => onCambia({ ...effetto, attivita: v })} />
          <label className="flex items-center gap-2 text-[13px] touch">
            <input type="checkbox" className="w-5 h-5" checked={effetto.doti !== undefined}
              onChange={(e) => onCambia(e.target.checked ? { ...effetto, doti: [{ dote: 'perizia', note: 2 }] } : { tipo: 'turno', attivita: effetto.attivita })} />
            Doti proprie di questo turno, al posto di quelle dell'attività
          </label>
          {effetto.doti?.map((d, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-0"><RigaDote etichetta={`Dote ${i + 1}`} dote={d} onCambia={(nuova) => onCambia({ ...effetto, doti: effetto.doti!.map((x, j) => (j === i ? nuova : x)) })} /></div>
              {effetto.doti!.length > 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la Dote ${i + 1} dell'effetto ${numero}`} onClick={() => onCambia({ ...effetto, doti: effetto.doti!.filter((_, j) => j !== i) })} />}
            </div>
          ))}
          {effetto.doti && effetto.doti.length < 5 && (
            <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote"
              onClick={() => onCambia({ ...effetto, doti: [...effetto.doti!, { dote: 'fascino', note: 2 }] })} />
          )}
        </div>
      )}
    </li>
  );
}

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
}

/**
 * Classificazione ed effetti di un'azione della giornata: carica gli elenchi chiusi dal BE e mostra tipo, collegamento
 * (cambiandone il tipo si azzera l'elemento scelto e il rango atteso resta solo per i Confidenti), elemento collegato,
 * rango atteso per i Confidenti e l'elenco degli effetti (fino a 20). Ogni cambio produce subito i campi nuovi.
 */
export function EditorAzioneStrutturata({ valore, onCambia }: Props) {
  const { dati: elenchi, errore } = useCarica(getElenchiAzione, []);
  /** Applica una modifica parziale ai campi strutturati e la passa al genitore. */
  const imposta = (p: Partial<CampiStrutturati>) => onCambia({ ...valore, ...p });
  if (errore) return <p className="m-0 text-[12px] text-error">Elenchi non disponibili: {errore}</p>;
  if (!elenchi) return <p className="m-0 text-[12px] text-text-muted">Carico gli elenchi…</p>;
  const rif = valore.riferimento;
  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
      <legend className="text-[13px] font-semibold mb-1">Classificazione ed effetti</legend>
      <Selettore etichetta="Tipo" valore={valore.tipo} opzioni={TIPI_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome }))} onCambia={(v) => imposta({ tipo: v as TipoAzione })} />
      <div className="flex flex-wrap items-end gap-2">
        <Selettore className="min-w-[10rem]" etichetta="Collegata a" valore={rif?.tipo ?? ''} vuoto="Nessun collegamento" opzioni={TIPI_RIFERIMENTO_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome }))} ricerca="mai"
          onCambia={(v) => { if (v !== (rif?.tipo ?? '')) imposta({ riferimento: v ? { tipo: v as TipoRiferimentoAzione, chiave: '' } : null, rangoAtteso: v === 'confidente' ? valore.rangoAtteso : null }); }} />
        {rif && <Selettore className="min-w-[12rem] flex-1" etichetta="Quale" valore={rif.chiave} opzioni={elencoRiferimento(rif.tipo, elenchi)} onCambia={(v) => imposta({ riferimento: { ...rif, chiave: v } })} />}
        {rif?.tipo === 'confidente' && (
          <Selettore className="min-w-[8rem]" etichetta="Rango atteso" valore={valore.rangoAtteso === null ? '' : String(valore.rangoAtteso)} vuoto="Nessuno" opzioni={RANGHI} ricerca="mai"
            onCambia={(v) => imposta({ rangoAtteso: v ? Number(v) : null })} />
        )}
      </div>
      <div className="flex flex-col gap-2">
        {/* le Doti sono ciò che il gioco dà, da segnare a mano; letture e turni li segna la spunta (scelta dell'utente, 2026-09-30) */}
        <span className="text-[13px] text-text-secondary">Il gioco dà</span>
        {valore.produce.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessun effetto: la spunta segna solo che l'hai fatto.</p>}
        {valore.produce.length > 0 && <p className="m-0 text-[12px] text-text-muted">Le Doti te le ricorda e le segni tu nella scheda Doti; letture e turni li segna la spunta.</p>}
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          {valore.produce.map((e, i) => (
            <RigaEffetto key={i} numero={i + 1} effetto={e} elenchi={elenchi}
              onCambia={(nuovo) => imposta({ produce: valore.produce.map((x, j) => (j === i ? nuovo : x)) })}
              onTogli={() => imposta({ produce: valore.produce.filter((_, j) => j !== i) })} />
          ))}
        </ul>
        {valore.produce.length < 20 && (
          <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" onClick={() => imposta({ produce: [...valore.produce, effettoNuovo('dote')] })} />
        )}
        <p className="m-0 text-[12px] text-text-muted">
          Le note sono solo testo: che cosa ricorda la spunta viene da qui. Una lettura porta avanti il libro o il film, e l'avviso ricorda le Doti
          del libro o del film, una volta sola; un turno conta un turno dell'attività e ne ricorda le Doti. Le Doti le segni tu nella scheda Doti.
        </p>
      </div>
    </fieldset>
  );
}
