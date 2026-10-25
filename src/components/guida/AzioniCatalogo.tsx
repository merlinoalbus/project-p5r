// ============================================================
// AzioniCatalogo — «aggiungi» e «correggi» dovunque ci sia un catalogo (Fase 16.1)
// ============================================================
//
// Il motore del catalogo accetta cinque famiglie — negozi, articoli, libri, film, attività — ma
// i pulsanti per usarlo esistevano **solo nei Negozi**: su Libri, Film, Videogiochi e Attività si
// poteva leggere e non correggere, e la stessa app che invita a sistemare i dati mentre si gioca
// non offriva il gesto. Rilievo dell'utente: «non vedo ancora le funzioni di aggiunta nuovo film
// ed elemento in generale».
//
// Qui c'è la metà che si ripete: il pulsante, il modulo che si apre, il caricamento dell'elemento
// da correggere. Le pagine ci mettono solo il tipo e che cosa fare dopo il salvataggio. Copiarlo
// quattro volte avrebbe voluto dire quattro posti in cui la prossima famiglia si dimentica.
//
// Quello che si aggiunge o si corregge resta dopo un aggiornamento dei dati della guida: la riga
// è marcata come dell'utente, e il seed non la tocca più.
// ============================================================

import { useState } from 'react';
import { getElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { ModuloCatalogo } from './ModuloCatalogo';
import { tipoCatalogoDi, type TipoModulo } from '../../utils/catalogo';
import type { ElementoCatalogoDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Il pulsante «aggiungi» di una pagina di catalogo, col suo modulo. */
// L12 (passo 8): nel rilascio (sola lettura) «aggiungi» e «correggi» non esistono; la condizione è costante di build e le versioni reali escono dal bundle
export const AggiungiAlCatalogo: StrumentoDiModifica<typeof AggiungiAlCatalogoReale> = IN_RILASCIO ? NienteInRilascio : AggiungiAlCatalogoReale;
export const CorreggiElemento: StrumentoDiModifica<typeof CorreggiElementoReale> = IN_RILASCIO ? NienteInRilascio : CorreggiElementoReale;

function AggiungiAlCatalogoReale({ tipo, titolo, dettaglio = 'resta dopo gli aggiornamenti', onSalvato, className = '' }: {
  tipo: TipoModulo;
  titolo: string;
  dettaglio?: string;
  onSalvato: () => void;
  className?: string;
}) {
  const [aperto, setAperto] = useState(false);
  return <>
    <PulsanteVisivo tono="secondario" compatto className={className}
      icona={<IconaAzione chiave="carica-altri" dimensione={20} />}
      titolo={titolo} dettaglio={dettaglio} onClick={() => setAperto(true)} />
    {aperto && <ModuloCatalogo tipo={tipo} onChiudi={() => setAperto(false)}
      onSalvato={() => { setAperto(false); onSalvato(); }} />}
  </>;
}

/** Il pulsante «correggi» di una riga, col caricamento dell'elemento e il suo modulo.
 *
 * L'elemento si chiede all'API **al momento del clic**: la scheda della pagina ha i campi che
 * servono a mostrarla, non quelli che servono a modificarla (l'originale del seed, l'origine, le
 * condizioni), e chiederli per ogni riga di un elenco di quarantasei sarebbe quarantasei
 * richieste per un modulo che forse non si apre. */
function CorreggiElementoReale({ tipo, chiave, titolo = 'Correggi', compatto = true, onSalvato }: {
  tipo: TipoModulo;
  chiave: string;
  titolo?: string;
  compatto?: boolean;
  onSalvato: () => void;
}) {
  const [elemento, setElemento] = useState<ElementoCatalogoDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  /** Carica l'elemento completo dall'API (pulsante disabilitato nel frattempo) e, arrivato, apre il modulo; l'errore va in notifica. */
  const apri = () => {
    setOccupato(true);
    void getElementoCatalogo(tipoCatalogoDi(tipo), chiave)
      .then(setElemento)
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.'))
      .finally(() => setOccupato(false));
  };
  return <>
    <PulsanteVisivo tono="fantasma" compatto={compatto} icona={<IconaAzione chiave="modifica" dimensione={20} />}
      titolo={titolo} disabled={occupato} onClick={apri} />
    {elemento && <ModuloCatalogo tipo={tipo} elemento={elemento} onChiudi={() => setElemento(null)}
      onSalvato={() => { setElemento(null); onSalvato(); }} />}
  </>;
}
