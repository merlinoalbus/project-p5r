// Script di misura del layout (sessione «Test layout multi device»). Si incolla in javascript_tool (Browser pane) e restituisce un oggetto.
// Uso: navigate → resize_window → screenshot (forza il fotogramma) → questo script. Facoltativo: window.__solo = ['main','fuori',...].
// Misura: scorrimento orizzontale del documento, main scrollHeight/clientHeight (barra di pagina), elementi oltre il bordo non ritagliati,
// bersagli < 44 px dentro main, testi a una lettera per riga (esclusi i contenitori 1×1 per lettori di schermo), immagini rotte/deformate/velate,
// contenitori scorrevoli (overscroll e bordo), riquadri .illustrazione-segno (spazio, riquadro, taglio, segno), intestazione.
(async () => {
  document.getAnimations().forEach(a => { try { a.finish(); } catch {} });
  await Promise.race([new Promise(r => requestAnimationFrame(r)), new Promise(r => setTimeout(r, 300))]);
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const ritagliato = e => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') { const r = n.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) return true; if (c.overflowX !== 'visible') return true; } } return false; };
  const de = document.documentElement, main = document.querySelector('main'), vw = innerWidth, vh = innerHeight;
  const R = e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height) + '@' + Math.round(r.left) + ',' + Math.round(r.top); };
  const zona = main || document.body;
  const fuori = [...document.querySelectorAll('body *')].filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; })
    .filter(e => !ritagliato(e)).slice(0, 8).map(e => e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40) + ' ' + R(e));
  const piccoli = [...zona.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],summary')].filter(vis)
    .filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
    .filter(e => !e.closest('.visore-mappa__tela, .spillo-mappa'))
    .slice(0, 15).map(e => e.tagName.toLowerCase() + ' «' + (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '» ' + R(e));
  const unaLettera = [...zona.querySelectorAll('h1,h2,h3,h4,p,span,a,button,li,dt,dd,td,th,div,strong,small,label')].filter(vis).filter(e => !ritagliato(e)).filter(e => {
    const t = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (t.length < 6) return false;
    const fs = parseFloat(getComputedStyle(e).fontSize); const r = e.getBoundingClientRect(); return r.width < fs * 4 && r.height > fs * 3.2;
  }).slice(0, 6).map(e => e.tagName.toLowerCase() + ' «' + e.innerText.trim().slice(0, 25) + '» ' + R(e));
  const imgs = [...zona.querySelectorAll('img')].filter(vis);
  const rotte = imgs.filter(i => i.complete && !i.naturalWidth).map(i => decodeURIComponent(i.src).slice(-50));
  const deformate = imgs.filter(i => { if (getComputedStyle(i).objectFit !== 'fill' || !i.naturalWidth) return false; const r = i.getBoundingClientRect(); const q = i.naturalWidth / i.naturalHeight; return Math.abs(q - r.width / r.height) / q > 0.05; }).map(i => decodeURIComponent(i.src).slice(-50) + ' ' + R(i));
  const velate = imgs.map(i => { let op = 1; for (let n = i; n && n !== document.body; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity); return [i, op]; }).filter(([, op]) => op < 0.99)
    .slice(0, 8).map(([i, op]) => decodeURIComponent(i.currentSrc || i.src).replace(location.origin, '').slice(0, 55) + ' op=' + op.toFixed(2) + (i.closest('.illustrazione-segno__riquadro--spento, .illustrazione-segno--spenta') ? ' (spenta)' : ''));
  const scroller = [...document.querySelectorAll('body *')].filter(vis).filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY + s.overflowX) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1); })
    .map(e => { const s = getComputedStyle(e); return e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 36) + ' ' + e.clientWidth + '×' + e.clientHeight + ' contenuto ' + e.scrollWidth + '×' + e.scrollHeight + ' overscroll=' + s.overscrollBehaviorY + '/' + s.overscrollBehaviorX + ' bordo=' + s.borderTopWidth + (s.boxShadow !== 'none' ? ' ombra' : ''); });
  const illus = [...document.querySelectorAll('.illustrazione-segno')].filter(vis).slice(0, 4).map(e => { const rq = e.querySelector('.illustrazione-segno__riquadro'); const im = e.querySelector('img.illustrazione-segno__immagine'); const sg = e.querySelector('.illustrazione-segno__segno');
    let taglio = '-'; if (im && im.naturalWidth) { const ir = im.getBoundingClientRect(); const q = im.naturalWidth / im.naturalHeight, qb = ir.width / ir.height; taglio = getComputedStyle(im).objectFit === 'cover' ? Math.round(Math.max(0, 1 - Math.min(q, qb) / Math.max(q, qb)) * 100) + '%' : getComputedStyle(im).objectFit; }
    return 'spazio ' + R(e) + (rq ? ' riquadro ' + R(rq) : '') + ' taglio ' + taglio + (sg ? ' segno ' + R(sg) : ''); });
  const h = main && (main.querySelector('header.card') || main.querySelector('header')); const h1 = document.querySelector('main h1');
  return { url: location.pathname + location.search, vp: vw + '×' + vh, vis: document.visibilityState,
    orizz: de.scrollWidth > de.clientWidth ? 'SI ' + de.scrollWidth : 'no', main: main ? main.scrollHeight + '/' + main.clientHeight + (main.scrollHeight > main.clientHeight + 1 ? ' BARRA' : ' una schermata') : '-',
    intestazione: h ? R(h) : (h1 ? 'h1 ' + R(h1) : '-'), illus, fuori, piccoli, unaLettera, rotte, deformate, velate, scroller };
})()
