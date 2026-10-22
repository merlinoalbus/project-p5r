import type {
  AnteprimaOperazionePescaDto, AzioneOperazionePesca, EventoPesca, FattoPescaDto,
  InputOperazionePesca, NuovaSessionePesca, NuovaOsservazionePesca, NuovoFattoPesca,
  NuovoAcquistoEscaPesca, NuovaRettificaPuntiPesca, RichiestaAnteprimaRimozionePesca,
  RicevutaOperazionePescaDto, SessionePescaDto, StatoPescaDto,
  RegolaPescaDto, RichiestaSalvaRegolaPesca,
} from '../../../shared/pesca';
import { apiGet, apiPost, apiPut } from './_helpers';

type Operazione<A extends AzioneOperazionePesca, R extends InputOperazionePesca, B extends string | null> = {
  azione: A; richiesta: R; bersaglio: B;
};
export type AnteprimaClientPesca =
  | Operazione<'registra-sessione', NuovaSessionePesca, null>
  | Operazione<'salva-osservazione', NuovaOsservazionePesca, string>
  | Operazione<'registra-fatto', NuovoFattoPesca, EventoPesca>
  | Operazione<'acquista-esca', NuovoAcquistoEscaPesca, null>
  | Operazione<'rettifica-punti', NuovaRettificaPuntiPesca, null>
  | Operazione<'rimuovi-fonte' | 'rimuovi-sessione' | 'rimuovi-fatto' | 'rimuovi-acquisto-esca', RichiestaAnteprimaRimozionePesca, string>;
export type OperazioneClientPesca = AnteprimaClientPesca & { revisionePescaAttesa: string };
const base = (id: number) => `/partite/${id}/pesca`;
const uid = (v: string | null): string => {
  if (v === null || !/^[0-9a-f]{32}$/.test(v)) throw new Error('Identità della pesca non valida: nessuna richiesta inviata.');
  return v;
};

/** Rotte determinate dal tipo del gesto; il server rifiuta i corpi incompatibili. */
function percorso(id: number, o: AnteprimaClientPesca, anteprima: boolean): string {
  const p = base(id);
  switch (o.azione) {
    case 'registra-sessione': return anteprima ? `${p}/anteprima` : p;
    case 'salva-osservazione': return `${p}/sessioni/${uid(o.bersaglio)}/${anteprima ? 'anteprima-osservazione' : 'osservazioni'}`;
    case 'rimuovi-sessione': return `${p}/sessioni/${uid(o.bersaglio)}/${anteprima ? 'anteprima-rimozione' : 'rimozione'}`;
    case 'rimuovi-fonte': return `${p}/provenienze/${uid(o.bersaglio)}/${anteprima ? 'anteprima-rimozione' : 'rimozione'}`;
    case 'registra-fatto': return `${p}/fatti/${encodeURIComponent(o.bersaglio)}${anteprima ? '/anteprima' : ''}`;
    case 'rimuovi-fatto': return `${p}/fatti/fonti/${uid(o.bersaglio)}/${anteprima ? 'anteprima-rimozione' : 'rimozione'}`;
    case 'acquista-esca': return `${p}/acquisti-esca${anteprima ? '/anteprima' : ''}`;
    case 'rimuovi-acquisto-esca': return `${p}/acquisti-esca/${uid(o.bersaglio)}/${anteprima ? 'anteprima-rimozione' : 'rimozione'}`;
    case 'rettifica-punti': return `${p}/punti/${anteprima ? 'anteprima-rettifica' : 'rettifica'}`;
  }
}

export const leggiPesca = (id: number): Promise<StatoPescaDto> => apiGet(base(id), { maxRetries: 0 });
export const leggiSessionePesca = (id: number, sessione: string): Promise<SessionePescaDto> => apiGet(`${base(id)}/sessioni/${uid(sessione)}`, { maxRetries: 0 });
export const leggiFattiPesca = (id: number): Promise<FattoPescaDto[]> => apiGet(`${base(id)}/fatti`, { maxRetries: 0 });
export const leggiRicevutaPesca = (id: number, operazioneId: string): Promise<RicevutaOperazionePescaDto> => apiGet(`${base(id)}/operazioni/${uid(operazioneId)}`, { maxRetries: 0, silent: true });
export const anteprimaPesca = (id: number, o: AnteprimaClientPesca): Promise<AnteprimaOperazionePescaDto> => apiPost(percorso(id, o, true), o.richiesta, { maxRetries: 0 });
/** Il registro client conserva o e il CAS prima di chiamare questo writer. */
export const confermaPesca = (id: number, o: OperazioneClientPesca): Promise<RicevutaOperazionePescaDto> => apiPost(percorso(id, o, false), { ...o.richiesta, revisionePescaAttesa: o.revisionePescaAttesa }, { maxRetries: 0 });
export const leggiRegolaPesca = (chiave: string): Promise<RegolaPescaDto> => apiGet(`/pesca/regola/${encodeURIComponent(chiave)}`, { maxRetries: 0 });
export const salvaRegolaPesca = (chiave: string, richiesta: RichiestaSalvaRegolaPesca): Promise<RegolaPescaDto> => apiPut(`/pesca/regola/${encodeURIComponent(chiave)}`, richiesta, { maxRetries: 0 });
