import { apiGet, apiPost, apiPut } from './_helpers';
export interface FattoGioco { chiave:string; nome:string; categoria:string; unita:string; valore?:number|null }
export interface ElenchiRegole { stati:FattoGioco[]; articoli:Array<{chiave:string;nome:string;gruppo:string}>; letture:Array<{chiave:string;nome:string;categoria:'libro'|'film'}>; arcani:Array<{chiave:string;nome:string}>; persone:Array<{chiave:string;nome:string}>; abilita:Array<{chiave:string;nome:string}> }
export const getElenchiRegole=():Promise<ElenchiRegole>=>apiGet('/condizioni/elenchi');
export const creaStato=(dati:{nome:string;categoria:string;unita:string}):Promise<FattoGioco>=>apiPost('/condizioni/stati',dati);
export const getStatiPartita=(id:number):Promise<FattoGioco[]>=>apiGet(`/condizioni/partite/${id}`);
export const salvaStatoPartita=(id:number,chiave:string,valore:number|null):Promise<unknown>=>apiPut(`/condizioni/partite/${id}/${encodeURIComponent(chiave)}`,{valore});
