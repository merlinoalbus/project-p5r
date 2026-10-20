# Selettore condiviso — prima e dopo db7d0423 (Test layout, 2026-10-20)

- **Prima**: anteprima 5474. Il suo server serve un `src/components/shared/Selettore.tsx` **senza** `valoreNelNome`: è il codice di prima,
  controllato su `/src/components/shared/Selettore.tsx`. Non ha preferenze nel browser, quindi vale il menu pieno predefinito.
- **Dopo**: collaudo 5473 su db7d0423, col menu pieno (`menuRidotto:false` solo nel blocco, poi la preferenza è stata rimessa identica).
- Nel codice, fra 48d7a958 e db7d0423 il componente cambia solo l'`aria-label` quando gli si passa `valoreNelNome`, e lo passa solo
  `DungeonDettaglioPage`. `tailwind.css` non cambia.
- Misura dal DOM in un iframe, coi font caricati. Per ogni `.selettore` visibile: pulsante (L×A), etichetta accessibile, valore, larghezza
  visibile/contenuto del valore, righe, `white-space`.
- La finestra «Nuova partita» (Impostazioni → «+ Nuova partita») è stata aperta e chiusa senza creare nulla.

**Esito: identico in 21 misure su 21.** Le righe di 5474 e di 5473 coincidono carattere per carattere:

```
/fusione 1366x657 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/fusione 768x1024 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/fusione 375x812 | pagina 125x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/compendio 1366x657 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 68x44 Ordinamento «Livello» 36/36 r1 nowrap | orizz false
/compendio 768x1024 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 68x44 Ordinamento «Livello» 36/36 r1 nowrap | orizz false
/compendio 375x812 | pagina 123x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 68x44 Ordinamento «Livello» 36/36 r1 nowrap | orizz false
/guida/percorso 1366x657 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 74x44 Mese «Giugno» 42/42 r1 nowrap ; pagina 113x44 Giorno «2 giugno (gio)» 81/81 r1 nowrap | orizz false
/guida/percorso 768x1024 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 74x44 Mese «Giugno» 42/42 r1 nowrap ; pagina 113x44 Giorno «2 giugno (gio)» 81/81 r1 nowrap | orizz false
/guida/percorso 375x812 | pagina 123x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap ; pagina 94x44 Mese «Giugno» 42/42 r1 nowrap ; pagina 133x44 Giorno «2 giugno (gio)» 81/81 r1 nowrap | orizz false
/guida/richieste 1366x657 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 108x44 Dedalo «Tutti i Dedali» 76/76 r1 nowrap | orizz false
/guida/richieste 768x1024 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 108x44 Dedalo «Tutti i Dedali» 76/76 r1 nowrap | orizz false
/guida/richieste 375x812 | pagina 125x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 333x44 Dedalo «Tutti i Dedali» 76/76 r1 nowrap | orizz false
/guida/mappe/tokyo/modifica 1366x657 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap | orizz false
/guida/mappe/tokyo/modifica 768x1024 | pagina 118x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap | orizz false
/guida/mappe/tokyo/modifica 375x812 | pagina 123x44 Partita attiva «Partita Roberto» 86/86 r1 nowrap | orizz false
/partita 1366x657 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/partita 768x1024 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/partita 375x812 | pagina 125x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap | orizz false
/impostazioni 1366x657 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 71x44 Ambito «Arcani» 39/39 r1 nowrap ; finestra 478x44 Difficoltà «Normale» 57/57 r1 normal | orizz false
/impostazioni 768x1024 | pagina 124x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 71x44 Ambito «Arcani» 39/39 r1 nowrap ; finestra 478x44 Difficoltà «Normale» 57/57 r1 normal | orizz false
/impostazioni 375x812 | pagina 125x44 Partita attiva «Partita Roberto» 92/92 r1 nowrap ; pagina 299x44 Ambito «Arcani» 39/39 r1 nowrap ; finestra 333x44 Difficoltà «Normale» 57/57 r1 normal | orizz false
```

- «Partita attiva» è il selettore della partita nella barra in alto (`PartitaSelettore`), presente in ogni pagina. Fra una pagina e
  l'altra è largo 118–125 px, uguale su tutte e due le istanze.
- Nell'editor delle mappe e in Fusione, a pagina appena aperta, c'è solo il selettore della partita. Gli altri selettori di quelle pagine
  compaiono dopo una scelta, e in sola lettura non li ho aperti.
- p5s non è stato usato come riferimento: questa sessione non ha il permesso di navigarlo.
