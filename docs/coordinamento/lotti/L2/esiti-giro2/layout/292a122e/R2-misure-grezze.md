# R2, parte layout — misure grezze (collaudo 292a122e, base p5s-0533Z, 2026-10-20)

Metodo: iframe della stessa origine grande quanto la finestra, animazioni finite, immagini lazy forzate a eager.
- `main`: scrollHeight/clientHeight.
- `int`: primo `header` del `main`.
- `fuori`: elementi oltre il bordo destro della finestra, senza controllo del contenitore che li taglia.
- `tronchi` e `piccoliInt`: testi troncati e bersagli sotto i 44 px nell'intestazione.
- `minia`: immagini con `?l=`.
- `tagliVis`: immagini con `object-fit: cover` ritagliate ≥ 3% nel riquadro.
- `miniRit`: miniature `?l=` con proporzioni diverse dall'originale ≥ 2% (ritaglio di UX2-13 sul server).

Preferenza `p5r-preferenze` presente e non toccata: `{"graficaPredefinita":true,"vistaPersona":"piastrelle","menuRidotto":true,"mappaHomeChiusa":false}`.
Copiato dall'uscita della serie: le variabili della pagina si sono perse alla navigazione per le schermate.
Le immagini `?l=` lette scrivono la cache `immagine_miniatura` (GET che scrivono, dalla 108).

```
/guida/citta | 1366x657 | main 853/589 | orizz no | int 1252x112 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta | 1280x689 | main 895/621 | orizz no | int 1166x112 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta | 1024x690 | main 2858/622 | orizz no | int 910x112 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta | 1280x800 | main 970/732 | orizz no | int 1166x112 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta | 768x1024 | main 3336/964 | orizz no | int 726x112 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta | 375x812 | main 5715/752 | orizz no | int 333x107 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 24 | tagliVis 0 | miniRit 1
/guida/citta/shibuya | 1366x657 | main 7103/589 | orizz no | int 1252x169 | fuori 0 | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/shibuya | 1280x689 | main 7179/621 | orizz no | int 1166x168 | fuori 0 | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/shibuya | 1024x690 | main 4986/622 | orizz no | int 910x162 | fuori 0 | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/shibuya | 1280x800 | main 7179/732 | orizz no | int 1166x168 | fuori 0 | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/shibuya | 768x1024 | main 5603/964 | orizz no | int 726x180 | fuori visore-mappa__livello,visore-mappa__immagine,spillo-mappa__etichetta | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/shibuya | 375x812 | main 9115/752 | orizz no | int 333x449 | fuori visore-mappa__livello,visore-mappa__immagine,spillo-mappa,spillo-mappa__goccia,spillo-mappa__disegno | tronchi 0 | piccoliInt 0 | img 103 rotte 0 minia 7 | tagliVis 0 | miniRit 6
/guida/citta/odaiba | 1366x657 | main 753/589 | orizz no | int 1252x175 | fuori 0 | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/odaiba | 1280x689 | main 773/621 | orizz no | int 1166x174 | fuori 0 | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/odaiba | 1024x690 | main 1216/622 | orizz no | int 910x168 | fuori 0 | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/odaiba | 1280x800 | main 844/732 | orizz no | int 1166x174 | fuori 0 | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/odaiba | 768x1024 | main 1518/964 | orizz no | int 726x166 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/odaiba | 375x812 | main 1371/752 | orizz no | int 333x385 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 17 rotte 0 minia 2 | tagliVis 0 | miniRit 1
/guida/citta/yongen-jaya | 1366x657 | main 4035/589 | orizz no | int 1252x150 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/citta/yongen-jaya | 1280x689 | main 4119/621 | orizz no | int 1166x149 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/citta/yongen-jaya | 1024x690 | main 3564/622 | orizz no | int 910x162 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/citta/yongen-jaya | 1280x800 | main 4119/732 | orizz no | int 1166x149 | fuori 0 | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/citta/yongen-jaya | 768x1024 | main 4114/964 | orizz no | int 726x160 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/citta/yongen-jaya | 375x812 | main 5908/752 | orizz no | int 333x410 | fuori visore-mappa__livello,visore-mappa__immagine,spillo-mappa,spillo-mappa__goccia,spillo-mappa__disegno | tronchi 0 | piccoliInt 0 | img 63 rotte 0 minia 4 | tagliVis 0 | miniRit 2
/guida/dungeon/kamoshida | 1366x657 | main 589/589 | orizz no | int 1262x170 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 27 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/kamoshida | 1280x689 | main 621/621 | orizz no | int 1176x170 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 27 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/kamoshida | 1024x690 | main 622/622 | orizz no | int 920x170 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 26 rotte 0 minia 0 | tagliVis 0 | miniRit 0
/guida/dungeon/kamoshida | 1280x800 | main 732/732 | orizz no | int 1176x170 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 27 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/kamoshida | 768x1024 | main 2442/964 | orizz no | int 726x297 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 27 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/kamoshida | 375x812 | main 2739/752 | orizz no | int 333x643 | fuori visore-mappa__livello,visore-mappa__immagine,spillo-mappa,spillo-mappa__goccia,spillo-mappa__disegno | tronchi 0 | piccoliInt 0 | img 27 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 1366x657 | main 589/589 | orizz no | int 1262x194 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 25 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 1280x689 | main 621/621 | orizz no | int 1176x194 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 25 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 1024x690 | main 622/622 | orizz no | int 920x194 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 24 rotte 0 minia 0 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 1280x800 | main 732/732 | orizz no | int 1176x194 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 25 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 768x1024 | main 2665/964 | orizz no | int 726x316 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 25 rotte 0 minia 1 | tagliVis 0 | miniRit 0
/guida/dungeon/madarame | 375x812 | main 2984/752 | orizz no | int 333x682 | fuori visore-mappa__livello,visore-mappa__immagine | tronchi 0 | piccoliInt 0 | img 25 rotte 0 minia 1 | tagliVis 0 | miniRit 0
```

## Miniature ritagliate dal server (UX2-13), tutte con `object-fit: contain` nel riquadro 94×70
```
/guida/citta          native/nativo-rmap-150-3-0  ?l=160  servita 96x68  su 2048x2048  scarto 29%
/guida/citta/shibuya  native/nativo-rmap-001-1-0  ?l=160  servita 96x82  su 2048x1024  scarto 41%
/guida/citta/shibuya  native/nativo-rmap-001-2-0  ?l=160  servita 96x67  su 2048x1024  scarto 28%
/guida/citta/shibuya  native/nativo-rmap-001-3-0  ?l=160  servita 96x183 su 512x1024   scarto 5%
/guida/citta/shibuya  native/nativo-rmap-001-4-0  ?l=160  servita 96x84  su 2048x1024  scarto 43%
/guida/citta/shibuya  native/nativo-rmap-001-5-0  ?l=160  servita 96x60  su 1024x512   scarto 20%
/guida/citta/shibuya  native/nativo-rmap-001-12-0 ?l=160  servita 96x19  su 2048x1024  scarto 60%
/guida/citta/odaiba   native/nativo-rmap-012-29-0 ?l=160  servita 59x51  su 256x256    scarto 14%
/guida/citta/yongen-jaya native/nativo-rmap-009-2-0 ?l=160 servita 96x81 su 1024x1024  scarto 16%
/guida/citta/yongen-jaya native/nativo-rmap-022-1-0 ?l=160 servita 96x108 su 1024x1024 scarto 11%
```
