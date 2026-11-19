// ============================================================
// opzioniCatalogo — gli oggetti del catalogo come voci di un selettore, raggruppati come nel catalogo
// ============================================================
//
// Un solo criterio per ogni selettore di oggetti (offerte, regali, effetti «oggetto ricevuto» e «oggetto uscito» della voce, oggetti di una
// Richiesta): le voci stanno a gruppi contigui nell'ordine di `GRUPPI_OGGETTO` (Equipaggiamento, Consumabili, …, Decorazioni, Altro), poi per
// nome; l'intestazione è il nome del gruppo e il dettaglio quello della categoria. Una categoria che il codice non conosce va in «Altro» con
// la sua chiave come dettaglio, invece di diventare un'intestazione propria.
// ============================================================

import { CATEGORIA_OGGETTO, GRUPPI_OGGETTO, eCategoriaOggetto, type GruppoOggetto } from '../../shared/catalogo';
import type { OpzioneSelettore } from '../components/shared/Selettore';

/** L'ordine dei gruppi nell'elenco: quello di `GRUPPI_OGGETTO`. */
const ORDINE_GRUPPI = Object.keys(GRUPPI_OGGETTO) as GruppoOggetto[];

/** Un oggetto come lo conosce chi lo offre in scelta: chiave, nome, categoria e, se ci sono, i nomi con cui si cerca. */
export interface OggettoDaScegliere { chiave: string; nome: string; categoria: string; testoRicerca?: string }

/** Le voci del selettore, a gruppi contigui nell'ordine del catalogo e per nome dentro il gruppo. */
export function opzioniOggettiDelCatalogo(oggetti: readonly OggettoDaScegliere[]): OpzioneSelettore[] {
  return oggetti
    .map((o) => ({ o, g: eCategoriaOggetto(o.categoria) ? CATEGORIA_OGGETTO[o.categoria].gruppo : 'altro' as const }))
    .sort((a, b) => ORDINE_GRUPPI.indexOf(a.g) - ORDINE_GRUPPI.indexOf(b.g) || a.o.nome.localeCompare(b.o.nome, 'it'))
    .map(({ o, g }) => ({
      chiave: o.chiave, nome: o.nome, gruppo: GRUPPI_OGGETTO[g],
      dettaglio: eCategoriaOggetto(o.categoria) ? CATEGORIA_OGGETTO[o.categoria].nome : o.categoria,
      ...(o.testoRicerca ? { testoRicerca: o.testoRicerca } : {}),
    }));
}
