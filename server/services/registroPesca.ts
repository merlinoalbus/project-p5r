import { createHash, randomBytes } from 'node:crypto';
import { httpErrors } from '../utils/httpError.js';

export const uidPesca = (): string => randomBytes(16).toString('hex');
/** Fotografia non normalizzante: anche NULL, booleani e ordine degli array fanno parte del CAS. */
export function canonicoPesca(value: unknown): string {
  const visitati = new Set<object>();
  const ordina = (v: unknown): unknown => {
    if(v===null || typeof v==='string' || typeof v==='boolean')return v;
    if(typeof v==='number' && Number.isFinite(v))return v;
    if(!v || typeof v!=='object' || visitati.has(v))throw httpErrors.conflict('pesca-registro-illeggibile','La fotografia della pesca non è riconoscibile; nessun dato viene azzerato.');
    visitati.add(v);
    const r=Array.isArray(v)?v.map(ordina):Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,ordina(x)]));
    visitati.delete(v);return r;
  };
  return JSON.stringify(ordina(value));
}
export const firmaPesca = (v:unknown):string => createHash('sha256').update(canonicoPesca(v)).digest('hex');
export function jsonPesca(raw:string,contesto:string):unknown {
  try{return JSON.parse(raw) as unknown;}catch{throw httpErrors.conflict('pesca-registro-illeggibile',`Il dato «${contesto}» non è leggibile; viene conservato.`);}
}
