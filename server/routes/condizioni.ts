import { Router } from 'express';
import { z } from 'zod';
import { prepared, nowIso } from '../db/dbService.js';
import { validate } from '../middleware/validate.js';
import { httpErrors } from '../utils/httpError.js';
import { slug } from '../../shared/slug.js';
const router=Router();
const idPartita=z.coerce.number().int().positive();
const verificaPartita=(id:number)=>{if(!prepared('SELECT 1 FROM partita WHERE id=?').get(id))throw httpErrors.notFound('partita-non-trovata','Partita non trovata.');};
router.get('/elenchi',(_req,res)=>{
  res.json({
    stati:prepared('SELECT chiave,nome,categoria,unita FROM fatto_gioco ORDER BY nome').all(),
    articoli:prepared('SELECT a.chiave,a.nome,n.nome AS gruppo FROM articolo a JOIN negozio n ON n.chiave=a.negozio_chiave WHERE a.nascosto=0 AND n.nascosto=0 ORDER BY n.nome,a.nome').all(),
    letture:prepared("SELECT chiave,COALESCE(nome_it,nome) AS nome,'libro' AS categoria FROM libro UNION ALL SELECT chiave,COALESCE(nome_it,nome),'film' FROM film ORDER BY nome").all(),
    arcani:prepared('SELECT DISTINCT arcana AS chiave,arcana AS nome FROM persona ORDER BY arcana').all(),
    persone:prepared('SELECT nome AS chiave,nome FROM persona ORDER BY nome').all(),
    abilita:prepared('SELECT nome AS chiave,nome FROM skill ORDER BY nome').all(),
  });
});
router.post('/stati',validate({body:z.object({nome:z.string().trim().min(1).max(160),categoria:z.enum(['evento','attivita','oggetto','grado','contatore','quartiere']),unita:z.string().trim().max(40).default('')})}),(req,res)=>{
  const b=req.body as {nome:string;categoria:string;unita:string};const base=slug(b.nome).slice(0,110)||'stato';let chiave=base;
  for(let i=2;prepared('SELECT 1 FROM fatto_gioco WHERE chiave=?').get(chiave);i++)chiave=base+'-'+i;
  prepared('INSERT INTO fatto_gioco(chiave,nome,categoria,unita,updated_at) VALUES(?,?,?,?,?)').run(chiave,b.nome,b.categoria,b.unita,nowIso());res.status(201).json({chiave,...b});
});
router.get('/partite/:partita',validate({params:z.object({partita:idPartita})}),(req,res)=>{
  const id=Number(req.params.partita);verificaPartita(id);
  res.json(prepared('SELECT f.chiave,f.nome,f.categoria,f.unita,p.valore FROM fatto_gioco f LEFT JOIN fatto_partita p ON p.fatto_chiave=f.chiave AND p.partita_id=? ORDER BY f.nome').all(id));
});
router.put('/partite/:partita/:chiave',validate({params:z.object({partita:idPartita,chiave:z.string().max(120)}),body:z.object({valore:z.number().int().min(0).max(9999999).nullable()})}),(req,res)=>{
  const id=Number(req.params.partita),chiave=String(req.params.chiave);verificaPartita(id);
  if(!prepared('SELECT 1 FROM fatto_gioco WHERE chiave=?').get(chiave))throw httpErrors.notFound('stato-non-trovato','Stato non trovato.');
  const {valore}=req.body as {valore:number|null};
  if(valore===null)prepared('DELETE FROM fatto_partita WHERE partita_id=? AND fatto_chiave=?').run(id,chiave);
  else prepared('INSERT INTO fatto_partita(partita_id,fatto_chiave,valore,updated_at) VALUES(?,?,?,?) ON CONFLICT(partita_id,fatto_chiave) DO UPDATE SET valore=excluded.valore,updated_at=excluded.updated_at').run(id,chiave,valore,nowIso());
  prepared('UPDATE partita SET updated_at=? WHERE id=?').run(nowIso(),id);
  res.json({chiave,valore});
});
export default router;
