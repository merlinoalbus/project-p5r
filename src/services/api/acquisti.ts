import type {
  AnteprimaRegistrazioneAcquistoDto, AnteprimaRimozioneAcquistoDto, NuovaRegistrazioneAcquisto,
  RichiestaAnteprimaAnnullaProvenienza, RichiestaAnnullaProvenienza, RichiestaAnteprimaRimozioneLegacy,
  RichiestaRegistraAcquisto, RichiestaRimozioneLegacy, RicevutaOperazioneAcquistoDto, StatoAcquistiDto,
} from '../../../shared/acquisti';
import type {
  AnteprimaDecisioneProposteDto, PropostaPartitaDto, RichiestaAnteprimaDecisioneProposte,
  RichiestaDecisioneProposte, RicevutaDecisioneProposteDto,
} from '../../../shared/propostePartita';
import { apiGet, apiPost } from './_helpers';

const acquisti = (id: number) => `/partite/${id}/acquisti`;
const proposte = (id: number) => `/partite/${id}/da-applicare`;
const senzaRipetizione = { maxRetries: 0 } as const;

export const leggiAcquistiRegistrati = (id: number): Promise<StatoAcquistiDto> => apiGet(acquisti(id));
export const anteprimaRegistrazioneAcquisto = (id: number, dati: NuovaRegistrazioneAcquisto): Promise<AnteprimaRegistrazioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/anteprima`, dati, senzaRipetizione);
export const registraAcquisto = (id: number, dati: RichiestaRegistraAcquisto): Promise<RicevutaOperazioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/registrazioni`, dati, senzaRipetizione);
export const anteprimaAnnullaProvenienzaAcquisto = (id: number, dati: RichiestaAnteprimaAnnullaProvenienza): Promise<AnteprimaRimozioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/provenienze/annullo/anteprima`, dati, senzaRipetizione);
export const annullaProvenienzaAcquisto = (id: number, dati: RichiestaAnnullaProvenienza): Promise<RicevutaOperazioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/provenienze/annullo`, dati, senzaRipetizione);
export const anteprimaRimuoviPresenzaStoricaAcquisto = (id: number, dati: RichiestaAnteprimaRimozioneLegacy): Promise<AnteprimaRimozioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/legacy/rimozione/anteprima`, dati, senzaRipetizione);
export const rimuoviPresenzaStoricaAcquisto = (id: number, dati: RichiestaRimozioneLegacy): Promise<RicevutaOperazioneAcquistoDto> =>
  apiPost(`${acquisti(id)}/legacy/rimozione`, dati, senzaRipetizione);

export const getDaApplicare = (id: number): Promise<PropostaPartitaDto[]> => apiGet(`${proposte(id)}?ancheChiuse=1`);
export const anteprimaDecisioneProposte = (id: number, dati: RichiestaAnteprimaDecisioneProposte): Promise<AnteprimaDecisioneProposteDto> =>
  apiPost(`${proposte(id)}/anteprima`, dati, senzaRipetizione);
export const decidiProposte = (id: number, dati: RichiestaDecisioneProposte): Promise<RicevutaDecisioneProposteDto> =>
  apiPost(`${proposte(id)}/decisioni`, dati, senzaRipetizione);
