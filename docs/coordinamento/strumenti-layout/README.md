# Strumenti di misura del layout (sessione «Test layout multi device»)

- `misura-layout.js` — misura completa di una pagina già caricata nella scheda (vedi l'intestazione del file).
- Misura in serie con un iframe della stessa origine (molte pagine × molte finestre, senza ridimensionare la scheda; le media query leggono la
  larghezza dell'iframe). Si definisce una volta per scheda e si lancia in background (javascript_tool ha un limite di 45 s; col pane nascosto
  ogni pagina impiega ~10 s):

```js
window.__misuraIn = async (url, w, h, attesa = 2500) => {
  const f = document.createElement('iframe'); f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;border:0;z-index:99999;background:#000`; document.body.appendChild(f);
  f.src = url; await new Promise(r => f.onload = r); await new Promise(r => setTimeout(r, attesa));
  const d = f.contentDocument, wv = f.contentWindow; d.getAnimations().forEach(a => { try { a.finish() } catch {} });
  await new Promise(r => setTimeout(r, 200));
  const m = d.querySelector('main'), hd = m && m.querySelector('header.card'), de = d.documentElement;
  const out = { url, vp: wv.innerWidth + 'x' + wv.innerHeight, orizz: de.scrollWidth > de.clientWidth ? 'SI' : 'no', main: m ? m.scrollHeight + '/' + m.clientHeight : '-', barra: m ? m.scrollHeight > m.clientHeight + 1 : null, intest: hd ? Math.round(hd.getBoundingClientRect().height) : '-' };
  f.remove(); return out;
};
window.__ris = []; window.__fine = false;
(async () => { for (const [w, h] of [[1366,657],[1280,689],[1024,690]]) for (const p of ['kamoshida' /* … */]) window.__ris.push(await window.__misuraIn('/guida/dungeon/' + p, w, h)); window.__fine = true; })();
// poi: ({ fine: window.__fine, ris: window.__ris })
```
Controllo del metodo: Maruki a 1280×689 nell'iframe dà `main` 638/621, come la misura diretta di FE.
Pulizia: le funzioni stanno in `window` (si perdono a ogni navigazione); niente scritto nel localStorage.
