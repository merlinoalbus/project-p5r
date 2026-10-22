import type { DefinizioneRegolaPesca, EsitoProfiloPescaDto, MomentoPesca, OsservazionePesca, PuntoValutazionePesca } from '../../shared/pesca.js';
import { valutaProfiliPesca } from '../../shared/profiliPesca.js';
import { condizioneConTesto } from '../../shared/condizioniSpillo.js';
import type { StatoPartitaSemafori } from './semaforiService.js';
import { valutaCondizione } from './condizioni/valutatore.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';

/** L’aggregatore delle vie delega le condizioni ordinarie al valutatore unico. */
export function profiliPesca(_p:number,regola:DefinizioneRegolaPesca|null,m:MomentoPesca,o:OsservazionePesca,guardianoPrecedente:boolean|null,punto:PuntoValutazionePesca={tipo:'pianificazione'}):EsitoProfiloPescaDto[] {
  // Queste vie hanno un vocabolario chiuso: non si caricano i progressi odierni
  // per riempire le osservazioni storiche mancanti.
  const st:StatoPartitaSemafori={doti:new Map(),arcaniInScorta:new Set(),personeConAbilita:new Set(),palazziConclusi:new Map(),richiesteCompletate:new Set(),ranghiConfidenti:new Map(),membriSquadra:new Set(),membriFuoriSquadra:new Set(),dataGioco:m.giorno,fasciaGioco:m.fascia,meteoOra:null,eventi:new Set()};
  st.dataGioco=m.giorno;st.fasciaGioco=m.fascia;
  st.meteoOra=o.meteo===null?null:{meteo:o.meteo,origine:'partita'};
  st.doti=o.rangoPeriziaOsservato===null?new Map():new Map([['perizia',o.rangoPeriziaOsservato]]);
  st.fattiPesca=new Map([['terzo-semestre-avviato',o.faseTerzoSemestre===null?'ignoto':o.faseTerzoSemestre?'avvenuto':'non-avvenuto'],['guardiano-ichigaya-catturato',guardianoPrecedente===null?'ignoto':guardianoPrecedente?'avvenuto':'non-avvenuto']]);
  st.contestoPesca={...o,tentativiConsumati:punto.tipo==='prossimo-tentativo'?punto.consumati:o.tentativiConsumati};
  const nomi=nomiCondizioniMemo();
  return valutaProfiliPesca(regola,m,o,guardianoPrecedente,punto,r=>r.tipo==='dote'&&o.rangoPeriziaOsservato===null?'grigio':valutaCondizione(condizioneConTesto(r,nomi),0,st,{nomi}).stato);
}
