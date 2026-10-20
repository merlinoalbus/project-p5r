// Sola lettura: per ogni mappa dell'albero, verifica che la casa nuova (L3, casa unica) porti alla STESSA mappa della casa vecchia:
// radice di un Palazzo -> /guida/dungeon/<k>; planimetria -> /guida/dungeon/<k>/area/<slug> (+ ?planimetria=<chiave> se non è la predefinita
// dell'Area); Memento e mondo invariati. Uso: node <questo> <api prima.json> <api dopo.json>
const fs=require('fs');const [A,B]=process.argv.slice(2).map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const prima=new Map(A['/mappe/albero'].corpo.data.map(m=>[m.chiave,m]));const dopo=B['/mappe/albero'].corpo.data;
const pred=new Map();for(const ep of Object.keys(B))if(/^\/compendio\/dungeon\/[a-z]+\?partita=1$/.test(ep))for(const a of B[ep].corpo.data.areePalazzo||[])pred.set(a.chiave,a);
const radici=new Map();for(const ep of Object.keys(B))if(/^\/compendio\/dungeon\/[a-z]+\?partita=1$/.test(ep)){const d=B[ep].corpo.data;radici.set(d.chiave,d);}
const esiti={};const nota=(k,m)=>{(esiti[k]=esiti[k]||[]).push(m)};
for(const m of dopo){const p=prima.get(m.chiave);if(!p){nota('mappa nuova',m.chiave);continue;}
 const cont=m.area?.contenitore;const vecchia=p.casa,nuova=m.casa;
 if(cont?.tipo==='dungeon'&&cont.chiave!=='mementos'){const a=pred.get(m.area.chiave);
   const attesa=`/guida/dungeon/${cont.chiave}/area/${m.area.slug}`+(a&&a.predefinita===m.chiave?'':`?planimetria=${m.chiave}`);
   if(!a)nota('area non trovata nella scheda',m.chiave);
   nota(nuova===attesa?'planimetria → Area giusta':'planimetria → casa INATTESA',`${m.chiave}: ${vecchia} → ${nuova} (attesa ${attesa})`);
   if(vecchia!==`/guida/mappe/${m.chiave}`)nota('casa vecchia non era la mappa stessa',`${m.chiave}: ${vecchia}`);
   if(m.area.casa!==nuova&&!(a&&a.predefinita!==m.chiave))nota('area.casa diversa da casa',m.chiave);
 } else if(!m.area&&/^(palazzo|dedalo)-di-/.test(m.chiave)&&m.genitore==null){
   const k=[...radici.values()].find(d=>`/guida/dungeon/${d.chiave}`===nuova);nota(k?'radice → scheda del Palazzo':'radice → casa INATTESA',`${m.chiave}: ${vecchia} → ${nuova}`);
 } else nota(vecchia===nuova?'invariata (mondo/Memento/altro)':'CAMBIATA fuori dai Palazzi',`${m.chiave}: ${vecchia} → ${nuova}`);
 if(JSON.stringify({...p,casa:0,area:p.area&&{...p.area,casa:0,daVerificare:0}})!==JSON.stringify({...m,casa:0,area:m.area&&{...m.area,casa:0,daVerificare:0}}))nota('altro campo cambiato',m.chiave);}
for(const k of prima.keys())if(!dopo.find(m=>m.chiave===k))nota('mappa sparita',k);
for(const [k,v] of Object.entries(esiti)){console.log(`${k}: ${v.length}`);if(/INATTESA|CAMBIATA|sparita|nuova|non trovata|non era|diversa|altro campo/.test(k))v.slice(0,20).forEach(x=>console.log('   ',x));}
