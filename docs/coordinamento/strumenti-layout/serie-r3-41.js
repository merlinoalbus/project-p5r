// Serie per la variante R3-41 di L3 («il visore deve cominciare entro metà altezza»). Si usa dopo aver definito window.__misuraIn
// (strumenti-layout/README.md) nella stessa scheda. Lancio: incollare tutto in javascript_tool; poi leggere sessionStorage.__risR341.
// Per ogni pagina e finestra: top del visore nella vista, metà altezza, scarto (negativo = entro metà), altezza e quota visibile del visore,
// intestazione, barra di pagina. Ogni risultato registra anche la preferenza della grafica.
(() => {
  const misuraR341 = async (url, w, h) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;z-index:99999;background:#000';
    document.body.appendChild(f); f.src = url;
    await new Promise(r => f.onload = r); await new Promise(r => setTimeout(r, 3000));
    const d = f.contentDocument, wv = f.contentWindow;
    if (!d) { f.remove(); return url + ' ' + w + 'x' + h + ' ERRORE iframe'; }
    d.getAnimations().forEach(a => { try { a.finish() } catch {} }); await new Promise(r => setTimeout(r, 300));
    const avvio = /Impossibile avviare/.test(d.body.innerText);
    const m = d.querySelector('main'); const hd = m && m.querySelector('header.card');
    const v = m && [...m.querySelectorAll('.visore-mappa')].find(e => e.getBoundingClientRect().width > 0);
    const fila = m && [...m.querySelectorAll('.versioni-area__fila')].find(e => e.getBoundingClientRect().width > 0);
    const grafica = wv.localStorage.getItem('p5r-preferenze') || 'predefinita';
    let riga = url.replace('/guida/dungeon/', '') + ' ' + wv.innerWidth + 'x' + wv.innerHeight + (grafica !== 'predefinita' ? ' SPENTA' : '') + (avvio ? ' ERRORE-AVVIO' : '');
    if (m) riga += ' · main ' + m.scrollHeight + '/' + m.clientHeight + (m.scrollHeight > m.clientHeight + 1 ? ' BARRA' : '');
    if (hd) riga += ' · int ' + Math.round(hd.getBoundingClientRect().height);
    if (v) {
      const r = v.getBoundingClientRect(); const meta = Math.round(wv.innerHeight / 2);
      const vis = Math.max(0, Math.min(r.bottom, wv.innerHeight) - Math.max(r.top, 0));
      riga += ' · visore top ' + Math.round(r.top) + ' / metà ' + meta + ' (scarto ' + (Math.round(r.top) - meta) + (r.top <= meta ? ', ENTRO' : ', OLTRE') + ')' +
        ' alto ' + Math.round(r.height) + ' visibile ' + Math.round(vis / r.height * 100) + '%';
    } else riga += ' · visore non trovato';
    if (fila) { const r = fila.getBoundingClientRect(); riga += ' · versioni top ' + Math.round(r.top) + ' alte ' + Math.round(r.height); }
    f.remove(); return riga;
  };
  const P = ['kamoshida', 'madarame', 'kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki', 'iweleth', 'kamoshida/area/prigione-sotterranea-tutorial'];
  const S = [[1366, 657], [1280, 689], [1024, 690], [1440, 789], [1536, 789], [1920, 969]];
  const coda = []; for (const [w, h] of S) for (const p of P) coda.push(['/guida/dungeon/' + p, w, h]);
  sessionStorage.__codaR341 = JSON.stringify(coda); sessionStorage.__risR341 = '[]';
  (async () => {
    while (true) {
      const c = JSON.parse(sessionStorage.__codaR341 || '[]'); if (!c.length) break;
      const [u, w, h] = c[0]; let r; try { r = await misuraR341(u, w, h); } catch (e) { r = u + ' ' + w + 'x' + h + ' ERRORE ' + e; }
      const ris = JSON.parse(sessionStorage.__risR341); ris.push(r); sessionStorage.__risR341 = JSON.stringify(ris);
      const c2 = JSON.parse(sessionStorage.__codaR341); c2.shift(); sessionStorage.__codaR341 = JSON.stringify(c2);
    }
  })();
  return 'serie R3-41 avviata: ' + coda.length + ' misure';
})()
