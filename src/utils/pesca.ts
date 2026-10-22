import { dataValida } from '../../shared/condizioniSpillo';
import type { MomentoPesca, OsservazionePesca } from '../../shared/pesca';

export interface MomentoPescaInCompilazione { giorno: string; fascia: 'giorno' | 'sera' | ''; ordineVisita: number | null }
export function momentoPescaCompleto(v: MomentoPescaInCompilazione): v is MomentoPesca {
  return dataValida(v.giorno) && (v.fascia === 'giorno' || v.fascia === 'sera')
    && v.ordineVisita !== null && Number.isSafeInteger(v.ordineVisita) && v.ordineVisita >= 0 && v.ordineVisita <= 1_000_000;
}
export const osservazionePescaIgnota = (giorno: string): OsservazionePesca => ({
  rangoPeriziaOsservato: null, provenienzaRango: 'ignoto', tentativiConsumati: null, catture: null,
  escaSpecialePosseduta: null, faseTerzoSemestre: null, meteo: null, allertaGelo: null,
  quota: { pagata: null }, finale: { tipo: 'ignoto', riscossioneUid: null, ripresaDopoRiscossione: null },
  perizia: { esito: 'ignota' }, fortuna: { giorno, attiva: null },
});
