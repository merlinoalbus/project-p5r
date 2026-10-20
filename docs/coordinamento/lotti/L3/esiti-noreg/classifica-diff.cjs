// Sola lettura: classifica le differenze fra due istantanee API (api-istantanea.cjs) per endpoint e per nome di campo foglia.
const fs=require('fs');const [a,b]=process.argv.slice(2).map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const diff=(x,y,p,out)=>{if(JSON.stringify(x)===JSON.stringify(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'&&Array.isArray(x)===Array.isArray(y)){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))diff(x[k],y[k],p+'.'+k,out);return;}out.push([p,x,y]);};
for(const ep of Object.keys(b)){const out=[];diff(a[ep],b[ep],'',out);if(!out.length)continue;const cl={};for(const [p,x,y] of out){const f=p.replace(/\.\d+/g,'[]');const t=x===undefined?'+':y===undefined?'-':'~';const k=t+' '+f;(cl[k]=cl[k]||[]).push([p,x,y]);}
console.log('#',ep,out.length);for(const [k,v] of Object.entries(cl)){const vals=new Set(v.map(([,x,y])=>JSON.stringify(y)));console.log('  ',k,v.length, k.endsWith('casa')?'':'valori: '+[...vals].slice(0,4).join(' | '));}}
