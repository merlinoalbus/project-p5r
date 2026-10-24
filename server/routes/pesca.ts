import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import * as schemi from '../schemas/pesca.js';
import { anteprimaPesca, confermaPesca, leggiOperazionePesca, statoPesca } from '../services/pescaService.js';
import { leggiFattiPesca } from '../services/pescaLetture.js';
import { conCestinoPrivato } from '../services/cestinoService.js';
import type { AzioneOperazionePesca } from '../../shared/pesca.js';

const router=Router({mergeParams:true});
router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/',validate({params:schemi.paramsPesca}),(req,res)=>res.json(statoPesca(Number(req.params.id))));
router.get('/operazioni/:operazione',validate({params:schemi.paramsOperazionePesca}),(req,res)=>res.json(leggiOperazionePesca(Number(req.params.id),String(req.params.operazione))));
router.get('/fatti',validate({params:schemi.paramsPesca}),(req,res)=>res.json(leggiFattiPesca(Number(req.params.id))));

const gesti=[
  {azione:'registra-sessione',anteprima:'/anteprima',salva:'/',params:schemi.paramsPesca,preview:schemi.bodyAnteprimaSessionePesca,body:schemi.bodyRegistraSessionePesca},
  {azione:'salva-osservazione',anteprima:'/sessioni/:sessione/anteprima-osservazione',salva:'/sessioni/:sessione/osservazioni',params:schemi.paramsSessionePesca,preview:schemi.bodyAnteprimaOsservazionePesca,body:schemi.bodySalvaOsservazionePesca,bersaglio:'sessione'},
  {azione:'rimuovi-fonte',anteprima:'/provenienze/:fonte/anteprima-rimozione',salva:'/provenienze/:fonte/rimozione',params:schemi.paramsFontePesca,preview:schemi.bodyAnteprimaRimozionePesca,body:schemi.bodyRimozionePesca,bersaglio:'fonte',cestino:'fonte-pesca'},
  {azione:'rimuovi-sessione',anteprima:'/sessioni/:sessione/anteprima-rimozione',salva:'/sessioni/:sessione/rimozione',params:schemi.paramsSessionePesca,preview:schemi.bodyAnteprimaRimozionePesca,body:schemi.bodyRimozionePesca,bersaglio:'sessione',cestino:'sessione-pesca'},
  {azione:'registra-fatto',anteprima:'/fatti/:evento/anteprima',salva:'/fatti/:evento',params:schemi.paramsFattoPesca,preview:schemi.bodyAnteprimaFattoPesca,body:schemi.bodyRegistraFattoPesca,bersaglio:'evento'},
  {azione:'rimuovi-fatto',anteprima:'/fatti/fonti/:fonte/anteprima-rimozione',salva:'/fatti/fonti/:fonte/rimozione',params:schemi.paramsFontePesca,preview:schemi.bodyAnteprimaRimozionePesca,body:schemi.bodyRimozionePesca,bersaglio:'fonte',cestino:'osservazione-pesca',prefisso:'fatto:'},
  {azione:'acquista-esca',anteprima:'/acquisti-esca/anteprima',salva:'/acquisti-esca',params:schemi.paramsPesca,preview:schemi.bodyAnteprimaAcquistoEsca,body:schemi.bodyAcquistoEsca},
  {azione:'rimuovi-acquisto-esca',anteprima:'/acquisti-esca/:acquisto/anteprima-rimozione',salva:'/acquisti-esca/:acquisto/rimozione',params:schemi.paramsAcquistoEsca,preview:schemi.bodyAnteprimaRimozionePesca,body:schemi.bodyRimozionePesca,bersaglio:'acquisto',cestino:'osservazione-pesca',prefisso:'esca:'},
  {azione:'rettifica-punti',anteprima:'/punti/anteprima-rettifica',salva:'/punti/rettifica',params:schemi.paramsPesca,preview:schemi.bodyAnteprimaRettificaPuntiPesca,body:schemi.bodyRettificaPuntiPesca},
] as const;
for(const g of gesti){
  router.post(g.anteprima,validate({params:g.params,body:g.preview}),(req,res)=>res.json(anteprimaPesca(Number(req.params.id),g.azione as AzioneOperazionePesca,req.body,'bersaglio'in g?String(req.params[g.bersaglio]):null)));
  router.post(g.salva,validate({params:g.params,body:g.body}),(req,res)=>{
    const p=Number(req.params.id),bersaglio='bersaglio'in g?String(req.params[g.bersaglio]):null;
    const opera=()=>confermaPesca(p,g.azione as AzioneOperazionePesca,req.body,bersaglio);
    const result='cestino'in g?conCestinoPrivato({tipo:g.cestino,chiave:('prefisso'in g?g.prefisso:'')+bersaglio,nome:g.cestino==='fonte-pesca'?'Fonte della visita di pesca':g.cestino==='sessione-pesca'?'Visita di pesca':'Osservazione della pesca',partitaId:p},opera):opera();
    res.status(201).json(result);
  });
}
export default router;
