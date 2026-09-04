// ============================================================
// API partite — partite multiple e tracking
// ============================================================

import type {
  CompendioPartitaDto, ConfidentePartitaDto, Difficolta, DoteSocialePartitaDto, ModificaConfidente, ModificaDote, PartitaDto, AnteprimaFusioneDto, CicloSalvatoDto, DomandeDto, EsitoForcaDto, EsitoFusioneScortaDto, EsitoIsolamentoDto, ObiettivoDto, PersonaPossedutaDto, ArticoloDto, AzionePercorsoDto, CruciverbaDto, FilmDto, LibroDto, PuntoInteresseDto, RichiestaDto, TipoLettura, StatoPunto, StatoRichiesta, TrofeoDto, PianoFusioneDto, PianoSalvatoDto, StatisticheDto, StatoObiettivo, StoricoDto, SuggerimentoIsolamentoDto,
} from '../../types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, queryString } from './_helpers';

/** Campi modificabili di una partita. */
export interface DatiPartita {
  nome?: string;
  note?: string;
  livelloProtagonista?: number;
  dataGioco?: string | null;
  difficolta?: Difficolta;
  nuovaPartitaPlus?: boolean;
  dlcPosseduti?: number[];
  allarmeAttivo?: boolean;
}

/** Dati di una Persona posseduta. */
export interface DatiPosseduta {
  livello?: number;
  /** Bonus per statistica (null = azzera). */
  bonus?: StatisticheDto | null;
  /** Evocazione dal Registro: i valori non indicati vengono dall'istantanea del compendio. */
  daRegistro?: boolean;
  trattoSkillId?: number | null;
  inSquadra?: boolean;
  note?: string;
  skillIds?: number[];
  carica?: boolean;
  /** Origine libera (es. «fusione», «cattura»), registrata nello storico. */
  origine?: string;
}

export const getPartite = (): Promise<PartitaDto[]> => apiGet('/partite');
export const getPartitaAttiva = (): Promise<PartitaDto | null> => apiGet('/partite/attiva');
export const creaPartita = (dati: DatiPartita & { nome: string; attiva?: boolean }): Promise<PartitaDto> => apiPost('/partite', dati);
export const aggiornaPartita = (id: number, dati: DatiPartita): Promise<PartitaDto> => apiPut(`/partite/${id}`, dati);
export const attivaPartita = (id: number): Promise<PartitaDto> => apiPost(`/partite/${id}/attiva`);
export const eliminaPartita = (id: number): Promise<void> => apiDelete(`/partite/${id}`);

export const getDoti = (id: number): Promise<DoteSocialePartitaDto[]> => apiGet(`/partite/${id}/doti`);
export const aggiornaDote = (id: number, chiave: string, mod: ModificaDote): Promise<DoteSocialePartitaDto> =>
  apiPatch(`/partite/${id}/doti/${encodeURIComponent(chiave)}`, mod);

export const getConfidentiPartita = (id: number): Promise<ConfidentePartitaDto[]> => apiGet(`/partite/${id}/confidenti`);
export const aggiornaConfidente = (id: number, chiave: string, dati: ModificaConfidente): Promise<ConfidentePartitaDto> =>
  apiPut(`/partite/${id}/confidenti/${encodeURIComponent(chiave)}`, dati);

/** Trofeo ottenuto (o tolto) nella partita. */
export const impostaTrofeo = (id: number, trofeo: string, ottenuto: boolean): Promise<TrofeoDto> => apiPut(`/partite/${id}/trofei`, { trofeo, ottenuto });
/** Azione del percorso fatta (o riaperta) nella partita. */
export const impostaAzionePercorso = (id: number, data: string, indice: number, fatta: boolean, noteRisposta?: 1 | 2 | 3): Promise<AzionePercorsoDto> => apiPut(`/partite/${id}/percorso`, { data, indice, fatta, ...(noteRisposta ? { noteRisposta } : {}) });
/** Giorno corrente della partita (calendario di gioco). */
export const impostaGiornoCorrente = (id: number, data: string): Promise<{ dataCorrente: string }> => apiPut(`/partite/${id}/giorno`, { data });

/** Articolo acquistato/ottenuto (o riaperto) nella partita. */
export const impostaAcquisto = (id: number, articolo: string, fatto: boolean): Promise<ArticoloDto> => apiPut(`/partite/${id}/acquisti`, { articolo, fatto });

/** Cruciverba risolto (o riaperto) nella partita. */
export const impostaCruciverba = (id: number, data: string, fatto: boolean): Promise<CruciverbaDto> => apiPut(`/partite/${id}/cruciverba`, { data, fatto });

/** Libro letto / film visto nella partita. */
export const impostaLettura = (id: number, tipo: TipoLettura, chiave: string, fatto: boolean): Promise<LibroDto | FilmDto> => apiPut(`/partite/${id}/letture`, { tipo, chiave, fatto });

/** Stato di una Richiesta dei Mementos nella partita (null = riaperta). */
export const impostaStatoRichiesta = (id: number, richiesta: string, stato: StatoRichiesta | null): Promise<RichiestaDto> => apiPut(`/partite/${id}/richieste`, { richiesta, stato });

/** Stato di un punto di interesse nella partita (null = riaperto). */
export const impostaStatoPunto = (id: number, punto: string, stato: StatoPunto | null): Promise<PuntoInteresseDto> => apiPut(`/partite/${id}/punti`, { punto, stato });

/** Domanda in classe segnata come fatta (con eventuale nota di Conoscenza). */
export const impostaDomandaFatta = (id: number, domandaId: number, fatta: boolean, conoscenza: boolean): Promise<DomandeDto> => apiPut(`/partite/${id}/domande/${domandaId}`, { fatta, conoscenza });

/** Regalo consegnato (o no) a un Confidente nella partita. */
export const impostaRegaloFatto = (id: number, chiave: string, regalo: string, fatto: boolean): Promise<ConfidentePartitaDto> =>
  apiPut(`/partite/${id}/confidenti/${encodeURIComponent(chiave)}/regali`, { regalo, fatto });

export const getCompendioPartita = (id: number): Promise<CompendioPartitaDto[]> => apiGet(`/partite/${id}/compendio`);
export const aggiornaCompendio = (id: number, personaId: number, dati: { registrata: boolean; livelloRegistrato?: number | null }): Promise<CompendioPartitaDto[]> =>
  apiPut(`/partite/${id}/compendio/${personaId}`, dati);

export const getPossedute = (id: number): Promise<PersonaPossedutaDto[]> => apiGet(`/partite/${id}/persona`);
export const aggiungiPosseduta = (id: number, personaId: number, dati: DatiPosseduta = {}): Promise<PersonaPossedutaDto> =>
  apiPost(`/partite/${id}/persona`, { personaId, ...dati });
export const aggiornaPosseduta = (id: number, possedutaId: number, dati: DatiPosseduta): Promise<PersonaPossedutaDto> =>
  apiPut(`/partite/${id}/persona/${possedutaId}`, dati);
export const rimuoviPosseduta = (id: number, possedutaId: number): Promise<void> => apiDelete(`/partite/${id}/persona/${possedutaId}`);
/** Registra nel compendio l'istantanea dell'esemplare (livello, bonus, skill, tratto, carica). */
export const registraPosseduta = (id: number, possedutaId: number): Promise<CompendioPartitaDto[]> => apiPost(`/partite/${id}/persona/${possedutaId}/registra`);

/** Dati di un obiettivo. */
export interface DatiObiettivo {
  skillIds?: number[];
  livelloMin?: number | null;
  priorita?: number;
  stato?: StatoObiettivo;
  note?: string;
}
export const getObiettivi = (id: number, stato?: StatoObiettivo): Promise<ObiettivoDto[]> => apiGet(`/partite/${id}/obiettivi${queryString({ stato })}`);
export const creaObiettivo = (id: number, personaId: number, dati: DatiObiettivo = {}): Promise<ObiettivoDto> => apiPost(`/partite/${id}/obiettivi`, { personaId, ...dati });
export const aggiornaObiettivo = (id: number, obiettivoId: number, dati: DatiObiettivo): Promise<ObiettivoDto> => apiPut(`/partite/${id}/obiettivi/${obiettivoId}`, dati);
export const eliminaObiettivo = (id: number, obiettivoId: number): Promise<void> => apiDelete(`/partite/${id}/obiettivi/${obiettivoId}`);

/** Piani di fusione salvati (avanzamento ricalcolato sulla scorta). */
export const getPianiSalvati = (id: number, obiettivo?: number): Promise<PianoSalvatoDto[]> => apiGet(`/partite/${id}/piani${queryString({ obiettivo })}`);
export const salvaPiano = (id: number, dati: { personaId: number; piano: PianoFusioneDto; opzioni: object; skillIds?: number[]; obiettivoId?: number | null; nome?: string; note?: string }): Promise<PianoSalvatoDto> =>
  apiPost(`/partite/${id}/piani`, dati);
export const aggiornaPianoSalvato = (id: number, pianoId: number, dati: { nome?: string; note?: string; obiettivoId?: number | null }): Promise<PianoSalvatoDto> => apiPut(`/partite/${id}/piani/${pianoId}`, dati);
export const eliminaPianoSalvato = (id: number, pianoId: number): Promise<void> => apiDelete(`/partite/${id}/piani/${pianoId}`);

/** Cicli di fusione salvati (Fase 5.5). */
export const getCicliSalvati = (id: number): Promise<CicloSalvatoDto[]> => apiGet(`/partite/${id}/cicli`);
export const salvaCiclo = (id: number, dati: { personaId: number; anelli: Array<{ ingredienteId: number; partnerId: number; risultatoId: number }>; nome?: string; note?: string }): Promise<CicloSalvatoDto> => apiPost(`/partite/${id}/cicli`, dati);
export const aggiornaCiclo = (id: number, cicloId: number, dati: { nome?: string; note?: string; anelloCorrente?: number; iterazioni?: number }): Promise<CicloSalvatoDto> => apiPut(`/partite/${id}/cicli/${cicloId}`, dati);
export const avanzaCiclo = (id: number, cicloId: number): Promise<CicloSalvatoDto> => apiPost(`/partite/${id}/cicli/${cicloId}/avanza`);
export const eliminaCiclo = (id: number, cicloId: number): Promise<void> => apiDelete(`/partite/${id}/cicli/${cicloId}`);

/** Operazioni della Stanza di Velluto eseguite dalla scorta (Fase 5.4). */
export const getAnteprimaFusione = (id: number, dati: { possedutaIds: number[]; risultatoId?: number }): Promise<AnteprimaFusioneDto> => apiPost(`/partite/${id}/velluto/fusione/anteprima`, dati);
export const eseguiFusioneScorta = (id: number, dati: { possedutaIds: number[]; risultatoId?: number; skillIds?: number[]; trattoSkillId?: number | null; livello?: number; statistiche?: StatisticheDto | null; note?: string }): Promise<EsitoFusioneScortaDto> =>
  apiPost(`/partite/${id}/velluto/fusione`, dati);
export const eseguiForca = (id: number, dati: { riceventeId: number; sacrificioId: number; nuovoLivello?: number; skillTrasferiteIds?: number[]; skillRimosseIds?: number[]; incidente?: boolean; puntiStatistica?: Partial<StatisticheDto> }): Promise<EsitoForcaDto> =>
  apiPost(`/partite/${id}/velluto/forca`, dati);
export const eseguiIsolamento = (id: number, dati: { possedutaId: number; incenso?: string; giorni: number; statistiche?: string[]; skillResistenzaId?: number | null; skillRimossaId?: number | null }): Promise<EsitoIsolamentoDto> =>
  apiPost(`/partite/${id}/velluto/isolamento`, dati);
export const getSuggerimentoIsolamento = (id: number, possedutaId: number): Promise<SuggerimentoIsolamentoDto> => apiGet(`/partite/${id}/velluto/isolamento/${possedutaId}`);

/** Storico della partita dal più recente; `prima` è il cursore restituito come `prossimo`. */
export const getStorico = (id: number, opz: { limite?: number; prima?: number; tipi?: string[]; persona?: number } = {}): Promise<StoricoDto> =>
  apiGet(`/partite/${id}/storico${queryString({ limite: opz.limite, prima: opz.prima, tipi: opz.tipi?.join(','), persona: opz.persona })}`);
export const eliminaEvento = (id: number, eventoId: number): Promise<void> => apiDelete(`/partite/${id}/storico/${eventoId}`);
/** Elimina più voci dello storico in una volta. */
export const eliminaEventi = (id: number, ids: number[]): Promise<{ eliminati: number }> => apiPost(`/partite/${id}/storico/elimina`, { ids });
