/** I campi autonomi devono essere rimossi soltanto con un gesto esplicito dell’editor. */
export function campiAutonomiAttivitaPesca(r:Record<string,unknown>):string[] {
  const pieni:string[]=[];
  if(r.tipo==='videogioco')pieni.push('tipo');
  for(const c of ['confidente_chiave','costo','sblocco','paga_yen','paga_massima'])if(r[c]!=null&&r[c]!=='')pieni.push(c);
  if(r.fascia!=null&&r.fascia!=='entrambe')pieni.push('fascia');
  if(r.sessioni!=null&&r.sessioni!==1)pieni.push('sessioni');
  for(const c of ['doti_json','effetti_json','condizioni_json']){
    const raw=r[c];if(raw===null||raw===undefined)continue;
    try{const v=typeof raw==='string'?JSON.parse(raw) as unknown:raw;if(!Array.isArray(v)||v.length!==0)pieni.push(c);}catch{pieni.push(c);}
  }
  if(r.quiz_json!=null&&r.quiz_json!=='')pieni.push('quiz_json');
  const atteso=r.pesca_ruolo==='visita'?'svolta':'nessuno';
  if(r.tracciamento!==undefined&&r.tracciamento!==atteso)pieni.push('tracciamento');
  return pieni;
}
