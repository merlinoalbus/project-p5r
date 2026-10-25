// ============================================================
// SceltaDaCatalogo — l'unico modo di scegliere una cosa che esiste già: oggetto, Persona/Ombra, Confidente (L13, modelli comuni 3)
// ============================================================
//
// Prima un oggetto si sceglieva con `SceltaCatalogoOggetto`, una Persona con un `Selettore` scritto a mano in ogni modulo
// (`ModuloPersona`, la scheda dell'effetto di una voce) o con la scheda a ricerca della Fusione, un Confidente con un altro `Selettore`
// e il suo rango in una casella numerica libera. Qui sono tre varianti dello stesso componente, tutte costruite sul `Selettore`
// (ricerca per nome, voce con dettaglio in grigio, tastiera, tendina a foglio sul telefono) e con lo stesso aspetto dei campi:
//  - `tipo="oggetto"`: il catalogo degli oggetti (cerca anche negli altri nomi e nel nome originale); carica da sé l'elenco;
//  - `tipo="persona"`: una Persona/Ombra del compendio, valore = id; l'elenco lo passa chi chiama (di solito l'ha già caricato);
//  - `tipo="confidente"`: un Confidente e, se si passa `rango`, il suo rango (1..`rangoMassimo`) in un secondo selettore che compare
//    solo con un Confidente scelto; chi lo cambia azzera il rango. Il valore salvato resta quello di prima (chiave, numero o null).
// ============================================================

import { useMemo, type ComponentProps } from 'react';
import type { PersonaRiassuntoDto } from '../../types';
import { Selettore } from './Selettore';
import { SceltaCatalogoOggetto } from '../catalogo/SceltaCatalogoOggetto';

interface ComuniScelta {
  etichetta?: string;
  disabilitato?: boolean;
  /** La tendina si apre nel flusso (utile in cima a una finestra breve, dove sovrapposta resterebbe tagliata dal corpo che scorre). */
  inLinea?: boolean;
}

type PropsOggetto = ComuniScelta & { tipo: 'oggetto' } & Omit<ComponentProps<typeof SceltaCatalogoOggetto>, 'etichetta' | 'disabilitato'>;
type PropsPersona = ComuniScelta & {
  tipo: 'persona';
  /** L'id della Persona scelta, o '' per nessuna. */
  valore: string;
  persone: readonly PersonaRiassuntoDto[];
  onCambia: (id: string) => void;
  /** Testo della voce «nessuna scelta» (con chiave ''); senza, la scelta non si può togliere. */
  vuoto?: string;
};
type PropsConfidente = ComuniScelta & {
  tipo: 'confidente';
  /** La chiave del Confidente scelto, o '' per nessuno. */
  valore: string;
  confidenti: ReadonlyArray<{ chiave: string; nome: string; dettaglio?: string }>;
  /** Il rango scelto (null = nessuno). Se `undefined` la scelta è del solo Confidente, senza selettore del rango. */
  rango?: number | null;
  rangoMassimo?: number;
  onCambia: (chiave: string, rango: number | null) => void;
  vuoto?: string;
};
export type PropsSceltaDaCatalogo = PropsOggetto | PropsPersona | PropsConfidente;

/** Sceglie una cosa dal catalogo: vedi l'intestazione del file per le tre varianti. */
export function SceltaDaCatalogo(props: PropsSceltaDaCatalogo) {
  if (props.tipo === 'oggetto') {
    return <SceltaCatalogoOggetto etichetta={props.etichetta ?? 'Oggetto'} valore={props.valore} onScegli={props.onScegli} disabilitato={props.disabilitato}
      escludi={props.escludi} includi={props.includi} aggiornamento={props.aggiornamento} />;
  }
  if (props.tipo === 'persona') return <ScelteDellaPersona {...props} />;
  return <ScelteDelConfidente {...props} />;
}

/** La Persona/Ombra del compendio, per nome, con arcano e livello in grigio. */
function ScelteDellaPersona({ etichetta = 'Persona del compendio', valore, persone, onCambia, vuoto, disabilitato, inLinea }: PropsPersona) {
  const opzioni = useMemo(() => persone.map((p) => ({ chiave: String(p.id), nome: p.nomeIt, dettaglio: `${p.arcanaNome} · liv. ${p.livello}`, testoRicerca: p.nome })), [persone]);
  return <Selettore etichettaSopra className={inLinea ? 'selettore--in-linea' : undefined} etichetta={etichetta} valore={valore} vuoto={vuoto} ricerca="sempre" opzioni={opzioni} disabilitato={disabilitato} onCambia={onCambia} />;
}

/** Il Confidente per nome (con l'arcano in grigio) e, se richiesto, il suo rango. */
function ScelteDelConfidente({ etichetta = 'Confidente', valore, confidenti, rango, rangoMassimo = 10, onCambia, vuoto = '— nessuno —', disabilitato, inLinea }: PropsConfidente) {
  const conRango = rango !== undefined;
  const ranghi = useMemo(() => Array.from({ length: rangoMassimo }, (_, i) => ({ chiave: String(i + 1), nome: String(i + 1) })), [rangoMassimo]);
  const confidente = (
    <Selettore etichettaSopra className={inLinea ? 'selettore--in-linea' : undefined} etichetta={etichetta} valore={valore} vuoto={vuoto} opzioni={confidenti.map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.dettaglio }))}
      disabilitato={disabilitato} onCambia={(k) => onCambia(k, k ? rango ?? null : null)} />
  );
  if (!conRango || !valore) return confidente;
  // Confidente a sinistra (largo), rango a destra (stretto): sul telefono restano affiancati, il rango ha un elenco di dieci voci
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3">
      {confidente}
      <Selettore etichettaSopra etichetta="Rango" valore={rango ? String(rango) : ''} vuoto="nessuno" ricerca="mai" opzioni={ranghi} disabilitato={disabilitato} onCambia={(k) => onCambia(valore, k ? Number(k) : null)} />
    </div>
  );
}
