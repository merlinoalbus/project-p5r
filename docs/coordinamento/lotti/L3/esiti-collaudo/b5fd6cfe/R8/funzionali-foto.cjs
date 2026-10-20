// Fotografia in sola lettura della parte di Okumura (e del diario) del DB del collaudo, su una copia presa con l'API di backup.
// Uso: node foto.cjs <nome>  → foto-<nome>.json ;  node foto.cjs confronta <a> <b>
const fs=require('fs');const path=require('path');
const DB=require('C:/Repository/project-p5r/.claude/worktrees/pensive-burnell-b50941/node_modules/better-sqlite3');
const SRC='C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2/data/gioco.db';
if(process.argv[2]==='confronta'){
 const a=JSON.parse(fs.readFileSync(path.join(__dirname,`foto-${process.argv[3]}.json`)));const b=JSON.parse(fs.readFileSync(path.join(__dirname,`foto-${process.argv[4]}.json`)));
 for(const t of Object.keys(a)){const A=new Set(a[t].map(r=>JSON.stringify(r)));const Bs=new Set(b[t].map(r=>JSON.stringify(r)));
  const solo_a=[...A].filter(x=>!Bs.has(x)),solo_b=[...Bs].filter(x=>!A.has(x));
  console.log(`${t}: ${a[t].length} → ${b[t].length} righe; ${solo_a.length||solo_b.length?'DIVERSE':'identiche'}`);
  for(const x of solo_a.slice(0,8))console.log('   - '+x.slice(0,300));for(const x of solo_b.slice(0,8))console.log('   + '+x.slice(0,300));}
 process.exit(0);}
(async()=>{const c=path.join(__dirname,'c.db');const s=new DB(SRC,{readonly:true,fileMustExist:true});await s.backup(c);s.close();const d=new DB(c,{readonly:true});
const q=(sql)=>d.prepare(sql).all();
const INF="(select chiave from dungeon_area where dungeon_chiave='okumura')";
const MAP="(select chiave from mappa where area_chiave like 'dungeon/okumura/%' or chiave like 'palazzo-di-okumura%' or genitore_chiave='dungeon-okumura' or chiave='dungeon-okumura')";
const f={
 area:q("select * from area where dungeon_chiave='okumura' order by slug"),
 dungeon_area:q("select * from dungeon_area where dungeon_chiave='okumura' order by chiave"),
 infiltrazione_area:q(`select * from infiltrazione_area where infiltrazione_chiave in ${INF} or area_chiave like 'dungeon/okumura/%' order by 1,2`),
 punto_interesse:q(`select * from punto_interesse where area_chiave in ${INF} order by chiave`),
 mappa:q(`select * from mappa where chiave in ${MAP} order by chiave`),
 spillo:q(`select * from spillo where mappa_chiave in ${MAP} or area_guida_chiave in ${INF} order by id`),
 spillo_voce:q(`select * from spillo_voce where spillo_id in (select id from spillo where mappa_chiave in ${MAP}) or voce_chiave in (select chiave from punto_interesse where area_chiave in ${INF}) order by 1,2`),
 mappa_entita:q(`select * from mappa_entita where mappa_chiave in ${MAP} order by 1,2,3`),
 voce_infiltrazione:q("select * from voce_infiltrazione order by 1,2"),
 cestino:q("select id,tipo,chiave,nome,contesto from cestino order by id"),
};
d.close();fs.unlinkSync(c);
fs.writeFileSync(path.join(__dirname,`foto-${process.argv[2]}.json`),JSON.stringify(f));
console.log(process.argv[2],Object.entries(f).map(([k,v])=>`${k} ${v.length}`).join(' · '));})();
