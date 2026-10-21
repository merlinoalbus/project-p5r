// L5: creazione esplicita di un luogo usando un pin personale già presente.
import type { OrariNegozio } from './orariNegozio.js';
import type { TipoLuogo } from './tipiLuogo.js';
import { categoriaSpillo, RIFERIMENTI_PER_CATEGORIA, TIPI_SPILLO, type TipoSpillo } from './spilli.js';

export interface LuogoNuovoDaPin {
  nome: string;
  tipo: TipoLuogo;
  cosaOffre: string;
  /** null dichiara che gli orari non sono indicati: vale la regola dell'app. */
  orari: OrariNegozio | null;
}

export interface RichiestaAnteprimaLuogoDaPin { nuovo: LuogoNuovoDaPin }
export interface RichiestaCreaLuogoDaPin extends RichiestaAnteprimaLuogoDaPin { revisioneRaccordoAttesa: string }

export interface AnteprimaLuogoDaPinDto {
  nuovo: LuogoNuovoDaPin;
  spillo: { id: number; uid: string; nome: string; tipo: TipoSpillo; mappa: { chiave: string; nome: string } };
  quartiere: { chiave: string; nome: string };
  area: { chiave: string; slug: string; nome: string };
  luogoPrevisto: LuogoNuovoDaPin & { chiave: string };
  luoghiEsistenti: Array<{ chiave: string; nome: string; tipo: string; nascosto: boolean; area: { chiave: string; nome: string } | null; casa: string | null }>;
  /** Fotografia opaca, transitoria: non salvare né registrare nei log. */
  revisioneRaccordoAttesa: string;
}

/** Ricevuta costruita nella transazione: le successive riletture della vista sono operazioni distinte. */
export interface LuogoCreatoDaPinDto {
  esito: 'creato-collegato';
  luogo: { chiave: string; nome: string };
  spillo: { id: number; uid: string; mappaChiave: string };
}

/** Guardia comune alla UI e al BE. Area, condizioni RAW e relazioni restano autoritative sul server. */
export function pinCompatibileConNuovoLuogo(pin: {
  origine: string; tipo: string; collezionabile: boolean; riferimento: unknown | null;
  destinazione?: unknown | null; destinazioneNonDisponibile?: boolean;
}): boolean {
  return pin.origine === 'utente' && !pin.collezionabile && pin.riferimento === null
    && !pin.destinazione && !pin.destinazioneNonDisponibile
    && (TIPI_SPILLO as readonly string[]).includes(pin.tipo)
    && RIFERIMENTI_PER_CATEGORIA[categoriaSpillo(pin.tipo)].includes('luogo');
}
