import { REGOLA_PESCA, type RegolaPescaDto, type RichiestaSalvaRegolaPesca } from '../../shared/pesca.js';
import { bodySalvaRegolaPesca, schemaDefinizioneRegolaPesca } from '../schemas/pesca.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { canonicoPesca, firmaPesca, jsonPesca } from './registroPesca.js';

export function rigaRegolaPesca(chiave:string=REGOLA_PESCA):Record<string,unknown>|null {
  return (prepared('SELECT * FROM main.regola_pesca WHERE chiave=?').get(chiave) as Record<string,unknown>|undefined)??null;
}
export function leggiRegolaPesca(chiave:string=REGOLA_PESCA):RegolaPescaDto {
  const r=rigaRegolaPesca(chiave), revisione=firmaPesca(r);
  const base:Omit<RegolaPescaDto,'stato'|'motivi'>={chiave,nome:typeof r?.nome==='string'?r.nome:'Pesca a Ichigaya',versione:1,origine:r?.origine==='seed'||r?.origine==='utente'?r.origine:null,fonti:[],dati:null,revisione};
  if(!r)return {...base,stato:'non-collegata',motivi:['La regola della guida non è presente; non viene ricreata dal lettore.']};
  try{
    const dati=schemaDefinizioneRegolaPesca.safeParse(jsonPesca(String(r.dati_json),'regola della pesca'));
    if(!dati.success || r.versione!==1 || base.origine===null || canonicoPesca(jsonPesca(String(r.fonti_json),'fonti della pesca'))!==canonicoPesca(dati.data.fonti))return {...base,stato:'illeggibile',motivi:['Schema, versione o fonti della regola non sono coerenti.']};
    return {...base,dati:dati.data,fonti:dati.data.fonti,stato:'collegata',motivi:[]};
  }catch{return {...base,stato:'illeggibile',motivi:['La regola o le sue fonti non sono leggibili; il contenuto è conservato.']};}
}
export function salvaRegolaPesca(chiave:string,input:RichiestaSalvaRegolaPesca):RegolaPescaDto {
  const parsed=bodySalvaRegolaPesca.safeParse(input);
  if(!parsed.success)throw httpErrors.badRequest('pesca-regola-non-valida','La regola deve contenere tutti i campi riconosciuti, senza campi estranei.');
  return getDb().transaction(()=>{
    const prima=rigaRegolaPesca(chiave);
    if(!prima)throw httpErrors.notFound('pesca-regola-assente','La regola non esiste; non viene ricreata per nome.');
    if(firmaPesca(prima)!==input.revisioneAttesa)throw httpErrors.conflict('pesca-regola-cambiata','La regola è cambiata: rileggi i dati prima di salvarla.');
    const baseline=prima.seed_json??canonicoPesca(prima);
    prepared('UPDATE main.regola_pesca SET nome=?,dati_json=?,fonti_json=?,origine=\'utente\',seed_json=?,updated_at=? WHERE chiave=?').run(parsed.data.nome,canonicoPesca(parsed.data.dati),canonicoPesca(parsed.data.dati.fonti),baseline,nowIso(),chiave);
    return leggiRegolaPesca(chiave);
  }).immediate();
}
