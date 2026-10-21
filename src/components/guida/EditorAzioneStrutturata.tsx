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
import { RigaEffettoVoceLegacy } from './RigaEffettoVoceLegacy';
import { useCarica } from '../../hooks/useCarica';
import { getElenchiAzione } from '../../services/api';
import {
  TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE,
  type EffettoAzione, type TipoAzione, type TipoRiferimentoAzione,
} from '../../../shared/effettiAzione';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import type { ElenchiAzioneDto } from '../../types';
import { EditorEffettiVoce } from './EditorEffettiVoce';

const RANGHI: OpzioneSelettore[] = Array.from({ length: 10 }, (_, i) => ({ chiave: String(i + 1), nome: `Rango ${i + 1}` }));

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

/** L'effetto con cui nasce una riga nuova o cambia tipo: il più semplice e valido. */
function effettoNuovo(tipo: EffettoAzione['tipo']): EffettoAzione {
  if (tipo === 'lettura') return { tipo: 'lettura', categoria: 'libro', chiave: '', almeno: null };
  if (tipo === 'turno') return { tipo: 'turno', attivita: '' };
  return { tipo: 'dote', dote: 'fascino', note: 2 };
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
      {(valore.effettiVoce !== undefined || valore.fonteEffetti) && <EditorEffettiVoce valore={valore} elenchi={elenchi} onCambia={onCambia} />}
      {valore.effettiVoce === undefined && !valore.fonteEffetti && <div className="flex flex-col gap-2">
        {/* le Doti sono ciò che il gioco dà, da segnare a mano; letture e turni li segna la spunta (scelta dell'utente, 2026-09-30) */}
        <span className="text-[13px] text-text-secondary">Il gioco dà</span>
        {valore.produce.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessun effetto: la spunta segna solo che l'hai fatto.</p>}
        {valore.produce.length > 0 && <p className="m-0 text-[12px] text-text-muted">Le Doti te le ricorda e le segni tu nella scheda Doti; letture e turni li segna la spunta.</p>}
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          {valore.produce.map((e, i) => (
            <RigaEffettoVoceLegacy key={i} numero={i + 1} effetto={e} elenchi={elenchi}
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
      </div>}
    </fieldset>
  );
}
