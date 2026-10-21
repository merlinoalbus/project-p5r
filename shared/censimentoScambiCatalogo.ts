import type { RequisitoSpillo } from './condizioniSpillo.js';
import type { CostoOggettoDto } from './types.js';

export type StatoSezioneScambi = 'assente' | 'null' | 'vuoto' | 'valido' | 'malformato' | 'non-supportato';
export interface IdentitaCatalogoScambio {
  chiave: string;
  stato: 'presente' | 'assente' | 'non-supportata';
  nome: string | null;
  categoria: string | null;
  casa: string | null;
  nascosto: boolean | null;
}
export interface RisultatoScambioCensimento {
  catalogo: IdentitaCatalogoScambio;
  quantita: number | null;
  nota: string | null;
  valido: boolean;
}
export interface PropostaScambioCensimento {
  rigaTipo: 'articolo' | 'ricompensa' | 'catalogo';
  rigaChiave: string;
  gruppo: string;
  catalogoChiave: string | null;
  catalogo: IdentitaCatalogoScambio | null;
  stato: 'da-approvare' | 'confermata' | 'scartata' | 'non-supportato';
  quantita: number | null;
  motivo: string | null;
  modificaStato: 'assente' | 'valida' | 'malformata' | 'non-supportata';
  azione: 'collega' | 'nascondi' | 'crea' | null;
  snapshot: 'coincidente' | 'non-coincidente' | 'non-supportato';
}
export type RuoloDestinazioneScambio = 'offerta-principale' | 'variante-non-equiparata' | 'riferimento-archivio';
export interface DestinazioneScambioCensimento {
  chiave: string;
  ruolo: RuoloDestinazioneScambio;
  /** Soltanto provenienza del rinvio: non certifica identità o contenuto attuale. */
  raccordoDocumentale: boolean;
  stato: 'presente' | 'nascosta' | 'assente' | 'negozio-diverso';
  negozio: string | null;
  negozioNome: string | null;
  casa: string | null;
  catalogo: IdentitaCatalogoScambio | null;
  prezzo: number | null;
  prezzoDaVerificare: boolean;
  costo: CostoOggettoDto | null;
  costoDaVerificare: boolean;
  condizioneLegacy: string | null;
  condizioni: { stato: 'valide' | 'null' | 'malformate' | 'non-supportate'; valore: RequisitoSpillo[] | null };
  risultati: RisultatoScambioCensimento[];
  proposte: PropostaScambioCensimento[];
}
export interface RaccordoScambioCensimento {
  statoFonte: 'coincidente' | 'cambiata-dopo-registrazione' | 'diversa-dal-manifest' | 'fuori-manifest' | 'registro-assente' | 'registro-non-supportato';
  disposizione: 'offerta' | 'archivio' | null;
  relazione: 'singola' | 'offerte-distinte' | 'archivio-con-rinvii' | null;
  rilievi: string[];
  fontiComplete: string[];
  destinazioni: DestinazioneScambioCensimento[];
}
export interface CampoScambioCensimento {
  stato: 'assente' | 'null' | 'valido' | 'non-supportato';
  valore: string | number | null;
}
export interface NodoScambioCensimento {
  percorso: string;
  uid: string | null;
  stato: 'valido' | 'non-supportato';
  campi: Record<string, CampoScambioCensimento>;
  raccordo: RaccordoScambioCensimento;
}
export interface SezioneScambiCensimento {
  percorso: string;
  stato: StatoSezioneScambi;
  motivo: string | null;
  righe: NodoScambioCensimento[];
}
export interface VenditoreScambiCensimento extends NodoScambioCensimento {
  offerte: SezioneScambiCensimento;
}
export interface CensimentoScambiCatalogoDto {
  versione: 1;
  completo: true;
  significatoCompletezza: 'nessun-taglio-delle-righe-proiettate';
  jose: SezioneScambiCensimento;
  guida: Omit<SezioneScambiCensimento, 'righe'> & { righe: VenditoreScambiCensimento[] };
  registroRaccordi: {
    stato: 'assente' | 'valido' | 'non-supportato';
    nodiAttesi: 97;
    nodiRegistrati: number;
    percorsiMancanti: string[];
  };
  /** Comprende tutti i percorsi attesi che non sono più enumerabili nella fonte corrente. */
  fontiMancanti: NodoScambioCensimento[];
}
