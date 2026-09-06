import { createHash } from 'node:crypto';
import type { MappaRiassuntoDto } from '../../../shared/types.js';
export interface ImmagineCandidataCollezione {
 chiave:string;genitore:string|null;nome:string;ordine:number;fisica:boolean;
 contesti?:MappaRiassuntoDto['contesti'];gruppoImmagini?:MappaRiassuntoDto['gruppoImmagini'];
}
/** Famiglie di etichette, non luoghi: nessuna unione di immagini o coordinate. */
export function calcolaCollezioniImmagini(righe:ImmagineCandidataCollezione[]):Map<string,NonNullable<MappaRiassuntoDto['immagineCollezione']>> {
 const famiglie=new Map<string,ImmagineCandidataCollezione[]>();
 for(const r of righe){
  if(!r.fisica||r.gruppoImmagini)continue;
  const nomi=r.contesti?.length?[...new Set(r.contesti.map(c=>c.nome))].sort((a,b)=>String(a).localeCompare(String(b))):null;
  const titolo=nomi?.includes(null)?['contesto-parziale']:nomi??[r.nome];
  const famiglia=JSON.stringify([r.genitore,titolo]);
  famiglie.set(famiglia,[...(famiglie.get(famiglia)??[]),r]);
 }
 const out=new Map<string,NonNullable<MappaRiassuntoDto['immagineCollezione']>>();
 for(const [famiglia,righe] of famiglie){
  if(righe.length<2)continue;
  const ordinate=[...righe].sort((a,b)=>a.ordine-b.ordine||(a.chiave<b.chiave?-1:a.chiave>b.chiave?1:0));
  const ambito='immagini-'+createHash('sha256').update(famiglia).digest('hex').slice(0,24);
  ordinate.forEach((r,i)=>out.set(r.chiave,{indice:i+1,totale:ordinate.length,ambito}));
 }
 return out;
}
