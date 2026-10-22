import type { AppDatabase } from '../db/dbService.js';
import { campiAutonomiAttivitaPesca } from '../../shared/attivitaPesca.js';
import { httpErrors } from '../utils/httpError.js';
import { storiaGenericaAttivita } from './vincoliAttivitaConfidente.js';
import { verificaAllocazioniTurniPescaImportate } from './allocazioniTurniPesca.js';

export function verificaCampiAttivitaPesca(r:Record<string,unknown>):void {
  if(r.pesca_regola_chiave==null){if(r.pesca_ruolo!=null)throw httpErrors.conflict('pesca-ruolo-senza-regola','Il ruolo richiede una regola collegata.');return;}
  if(typeof r.pesca_regola_chiave!=='string'||!['visita','obiettivi'].includes(String(r.pesca_ruolo)))throw httpErrors.conflict('pesca-link-non-valido','Regola e ruolo devono essere espliciti.');
  const campi=campiAutonomiAttivitaPesca(r);
  if(campi.length)throw httpErrors.conflict('attivita-pesca-conflitto','Risolvi esplicitamente i campi autonomi prima di collegare la fonte pesca.',{campi});
}
export function verificaAttivitaPesca(db:AppDatabase,r:Record<string,unknown>,prima:Record<string,unknown>|null=null):void {
  verificaCampiAttivitaPesca(r);if(r.pesca_regola_chiave==null)return;
  if(!db.prepare('SELECT 1 FROM main.regola_pesca WHERE chiave=?').get(r.pesca_regola_chiave))throw httpErrors.conflict('pesca-regola-assente','La regola indicata non è presente nella guida.');
  if(r.pesca_regola_chiave!==prima?.pesca_regola_chiave||r.pesca_ruolo!==prima?.pesca_ruolo){
    const storia=storiaGenericaAttivita(db,String(r.chiave));
    if(!storia.leggibile||storia.presente)throw httpErrors.conflict('attivita-pesca-storia','Il nuovo collegamento non può reinterpretare una storia generica già presente o illeggibile. Le due righe canoniche sono rettificate soltanto dal manifest selettivo.',{storiaLeggibile:storia.leggibile,storiaPresente:storia.presente});
  }
}
export function verificaCollegamentiPescaImportati(db:AppDatabase,attuale?:AppDatabase):void {
  verificaAllocazioniTurniPescaImportate(db);
  if(attuale)verificaAllocazioniTurniPescaImportate(attuale);
  const cols=db.prepare("SELECT name FROM pragma_table_info('attivita','main')").all() as Array<{name:string}>;
  if(!cols.some(c=>c.name==='pesca_regola_chiave'))return;
  for(const r of db.prepare('SELECT * FROM main.attivita WHERE pesca_regola_chiave IS NOT NULL OR pesca_ruolo IS NOT NULL').iterate() as Iterable<Record<string,unknown>>){
    verificaAttivitaPesca(db,r,r);
    if(attuale){const prima=attuale.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(r.chiave) as Record<string,unknown>|undefined;
      if(prima?.pesca_regola_chiave!==r.pesca_regola_chiave||prima?.pesca_ruolo!==r.pesca_ruolo){const storia=storiaGenericaAttivita(attuale,String(r.chiave));if(!storia.leggibile||storia.presente)throw httpErrors.conflict('attivita-pesca-storia','Il file tenterebbe di collegare un’attività con storia nell’istanza corrente.');}
    }
  }
}
