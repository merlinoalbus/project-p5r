// G6 — script di intercettazione usato il 2026-10-20 nel browser (scheda su http://localhost:5473, istanza di collaudo e9fb4871),
// eseguito con lo strumento javascript_tool del Browser pane. Consegnato VERBATIM su richiesta del validatore (terzo giro, F5).
// Le funzioni __vis e __R erano già definite nella pagina da una chiamata precedente dello stesso giro: sono riportate qui sotto,
// verbatim, prima di __g6. Nient'altro dello script è stato cambiato.
//
// Cosa fa, esattamente:
// - SIMULATA, mai arrivata al BE: la POST /api/mappe/piante-citta/kichijoji/scarica. Risponde nel browser con 201 e un corpo inventato.
// - ARRIVATE AL BE 3301, con la risposta RISCRITTA nel browser: dopo la POST simulata, le GET /api/compendio/citta/kichijoji e
//   /api/mappe/kichijoji partono verso il BE vero, ma prima di passarle alla pagina lo script cambia il corpo della risposta:
//   per compendio/citta/kichijoji `illustrazione.immagineUrl` = '/api/immagini/mappa/citta-shibuya/file?v=G6-simulato' e `mappa` = true;
//   per mappe/kichijoji `immagineUrl` = lo stesso URL (e larghezza/altezza, se mancanti, 1920×1080).
//   Il BE vero, che non ha scaricato nulla, avrebbe risposto immagineUrl null e mappa=false.
// - ARRIVATE AL BE 3301 e NON toccate: le GET precedenti la POST simulata e tutte le altre richieste della pagina, compreso
//   il file dell'immagine /api/immagini/mappa/citta-shibuya/file?v=G6-simulato(&l=320), che il BE serve davvero (la caricata di Shibuya:
//   il parametro v non cambia il file servito).
// - DOM: dopo la navigazione interna (pushState) si leggono l'intestazione .illustrazione-segno e l'immagine del visore.

window.__vis=e=>{if(!e)return false;const v=e.ownerDocument.defaultView;const r=e.getBoundingClientRect();const c=v.getComputedStyle(e);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
window.__R=e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};

window.__g6=async(w,h)=>{const f=document.createElement('iframe');f.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;opacity:0;pointer-events:none;border:0`;f.src='/impostazioni';document.body.appendChild(f);await new Promise(r=>f.onload=r);await new Promise(r=>setTimeout(r,2500));
const win=f.contentWindow;const orig=win.fetch.bind(win);const NUOVA='/api/immagini/mappa/citta-shibuya/file?v=G6-simulato';let scaricata=false;const log=[];
win.fetch=async(input,init)=>{const u=typeof input==='string'?input:input.url;const m=(init&&init.method)||(typeof input!=='string'&&input.method)||'GET';
 if(/\/api\/mappe\/piante-citta\/kichijoji\/scarica/.test(u)&&m==='POST'){log.push('POST scarica (intercettato, nessuna scrittura)');await new Promise(r=>setTimeout(r,300));scaricata=true;return new win.Response(JSON.stringify({data:{quartiere:'kichijoji',mime:'image/png',byte:4242,fonte:'prova G6',url:'http://localhost/prova-g6.png'}}),{status:201,headers:{'content-type':'application/json'}})}
 const r=await orig(input,init);
 if(/\/api\/compendio\/citta\/kichijoji(\?|$)/.test(u)||/\/api\/mappe\/kichijoji(\?|$)/.test(u)){log.push(`${m} ${u.replace(/^https?:\/\/[^/]+/,'')} ${scaricata?'(dopo lo scarico: risposta come dal BE con la caricata)':'(prima)'}`);if(scaricata){const j=await r.clone().json();const d=j.data;if(d.illustrazione){d.illustrazione.immagineUrl=NUOVA;d.mappa=true}if('immagineUrl' in d&&d.chiave==='kichijoji'){d.immagineUrl=NUOVA;d.larghezza=d.larghezza||1920;d.altezza=d.altezza||1080}return new win.Response(JSON.stringify(j),{status:r.status,headers:{'content-type':'application/json'}})}}
 return r};
const leggi=()=>{const d=f.contentDocument;return {intestazione:[...d.querySelectorAll('.illustrazione-segno')].filter(__vis).map(e=>({src:e.querySelector('.illustrazione-segno__immagine')?.getAttribute('src'),rect:__R(e).slice(2).join('x')})),sagomaSola:[...d.querySelectorAll('main img')].filter(i=>__vis(i)&&/lmap%2Ftokyo/.test(i.getAttribute('src'))&&!i.closest('.illustrazione-segno')).length,visore:[...d.querySelectorAll('.visore-mappa__immagine')].filter(__vis).map(i=>i.getAttribute('src')),didascalia:(d.body.innerText.match(/scaricata nella tua istanza[^.]*/)||[''])[0]}};
const nav0=win.performance.getEntriesByType('navigation').length;
win.history.pushState({},'','/guida/citta/kichijoji');win.dispatchEvent(new win.PopStateEvent('popstate'));
await new Promise(r=>setTimeout(r,6000));const dopo=leggi();
const ricaricata=win.performance.getEntriesByType('navigation').length!==nav0;
f.remove();return {misura:`${w}x${h}`,ricaricataLaPagina:ricaricata,log,dopo,stessaImmagine:dopo.intestazione.length>0&&dopo.visore.length>0&&dopo.intestazione[0].src.split('&l=')[0]===dopo.visore[0]}};

// Chiamate eseguite (due chiamate dello strumento, nell'ordine):
// const a=await __g6(1280,689);const b=await __g6(375,812);[a,b]
// const a=await __g6(768,1024);const b=await __g6(1024,690);[a,b].map(x=>({misura:x.misura,ricaricata:x.ricaricataLaPagina,stessa:x.stessaImmagine,intestazione:x.dopo.intestazione,visore:x.dopo.visore,chiamate:x.log.length,ultima:x.log[x.log.length-2]}))
