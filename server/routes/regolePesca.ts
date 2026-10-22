import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodySalvaRegolaPesca, paramsRegolaPesca } from '../schemas/pesca.js';
import { leggiRegolaPesca, salvaRegolaPesca } from '../services/regolePescaService.js';
const router=Router();
router.get('/regola/:chiave',validate({params:paramsRegolaPesca}),(req,res)=>res.set('Cache-Control','no-store').json(leggiRegolaPesca(String(req.params.chiave))));
router.put('/regola/:chiave',validate({params:paramsRegolaPesca,body:bodySalvaRegolaPesca}),(req,res)=>res.json(salvaRegolaPesca(String(req.params.chiave),req.body)));
export default router;
