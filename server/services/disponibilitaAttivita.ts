import { prepared } from '../db/dbService.js';
import { condizioneConTesto, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { descriviOrariDelLuogo, orariComeCondizioni, orariDelLuogo, type OrariDelLuogo } from '../../shared/orariNegozio.js';
import type { CondizioneSpilloDto, DisponibilitaDto } from '../../shared/types.js';
import { condizioniDiSblocco, invitiPerSblocco } from './sbloccoLuoghi.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { valutaInsieme } from './condizioni/valutatore.js';
import type { StatoDisponibilita } from './disponibilitaService.js';

interface SedeAttivita {
  chiave: string;
  nome: string;
  quartiere_chiave: string | null;
  condizioni_json: string | null;
  orari_json: string | null;
}
export interface SediAttivita {
  luoghi: Map<string, SedeAttivita>;
  inviti: ReturnType<typeof invitiPerSblocco>;
}

/** Lettura per richiesta: le attività condividono le sedi e gli inviti, senza passare da luoghiService. */
export function sediAttivita(): SediAttivita {
  const righe = prepared('SELECT chiave, nome, quartiere_chiave, condizioni_json, orari_json FROM luogo').all() as SedeAttivita[];
  return { luoghi: new Map(righe.map((r) => [r.chiave, r])), inviti: invitiPerSblocco() };
}

/** R5-02: presenza della sede reale AND condizioni e fascia proprie. Nessuna condizione viene copiata nel database.
 * Libri/DVD già ottenuti non passano da qui; un turno dichiarato non diventa un nuovo gesto soggetto a blocco. */
export function disponibilitaAttivita(
  r: { sede_chiave: string | null; condizioni_json: string | null; fascia: string | null },
  st: StatoDisponibilita | null,
  sedi: SediAttivita = sediAttivita(),
): { condizioni: CondizioneSpilloDto[] | null; disponibilita: DisponibilitaDto | null; orariSede: OrariDelLuogo | null; orariSedeTesto: string | null } {
  const nomi = nomiCondizioniMemo();
  const proprie: RequisitoSpillo[] = leggiCondizioniSalvate(r.condizioni_json);
  // La fascia è un campo strutturato: «entrambe» e NULL non aggiungono limiti.
  if (r.fascia === 'giorno' || r.fascia === 'sera') proprie.push({ tipo: 'fascia', fascia: r.fascia });
  const condizioni = proprie.map((c) => condizioneConTesto(c, nomi));
  const sede = r.sede_chiave ? sedi.luoghi.get(r.sede_chiave) : undefined;
  const orariSede = sede ? orariDelLuogo(sede.orari_json) : null;
  if (sede && orariSede) {
    const ereditate = [...condizioniDiSblocco(sede, sedi.inviti), ...orariComeCondizioni(orariSede)];
    condizioni.push(...ereditate.map((c) => {
      const dto = condizioneConTesto(c, nomi);
      return { ...dto, testo: `Sede ${sede.nome}: ${dto.testo}` };
    }));
  } else if (r.sede_chiave) {
    // Il valutatore rende grigio il riferimento non risolvibile. Non equivale a un'attività senza sede.
    const dto = condizioneConTesto({ tipo: 'luogo', luogo: r.sede_chiave }, nomi);
    condizioni.push({ ...dto, testo: `Sede non trovata: ${r.sede_chiave}` });
  }
  return {
    condizioni: condizioni.length ? condizioni : null,
    disponibilita: st && condizioni.length ? valutaInsieme(condizioni, st) : null,
    orariSede,
    orariSedeTesto: orariSede ? descriviOrariDelLuogo(orariSede) : null,
  };
}
