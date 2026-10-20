# L3 — UX sul rilascio d5eb9650 (Test UX, 2026-10-20, fino alle 10:24Z)

Collaudo FE 5473 / BE 3301, linea `newreview-l3` = d5eb9650, base copia di p5s 09:48Z.

**Solo letture.** Nessun salvataggio. Le finestre aperte («Infiltrazioni della voce») sono state chiuse con «Fatto» senza scegliere niente.
L'unica scrittura è la cache `immagine_miniatura`, che le letture `?l=` riempiono.

Preferenze del browser trovate e lasciate invariate:
`{"graficaPredefinita":true,"vistaPersona":"piastrelle","menuRidotto":true,"mappaHomeChiusa":false}`.

Le misure le ha prese Test layout. Qui si guarda l'esperienza: testi, tocchi, figure, una sola barra di scorrimento.
Le prove sono state fatte nel browser, a misura emulata e in un iframe della stessa origine.

## 1. Righe corrette nella ripresa
| Riga | Esito | Cosa si vede |
|---|---|---|
| UX3-7 | **verificato** | In `/guida/mappe` il titolo dell'elenco è «Elenco delle aree» per Madarame e Futaba, ed «Elenco dei quartieri e delle aree» per Tokyo. Ogni riga dice «N pin» o «N versioni · N pin»: il titolo dice quello che c'è sotto |
| UX3-8 | **verificato** | Nella griglia di Futaba ci sono 17 carte. Sette Aree con un nome vero e senza pin sono visibili, con «nessun pin»: Entrata della piramide, Camera del Rimorso 2P, Camera dei Sarcofagi 1P e 2P, Camera della Vacuità 2P, Passaggio sotterraneo 2F, Città nel deserto. Il solo gruppo chiuso è «Mostra i fogli dell'estrazione senza nome · 1», un nome che dice cosa contiene |
| E2 / E3 | **verificato** | Intestazione dell'indice: «307 mappe con 767 pin · più 747 passaggi e 228 note». Si legge come dettaglio e i numeri tornano con quelli di Test funzionali. Le carte dicono «Città · 159 pin · 23 quartieri · 23 aree» e «Palazzo · 179 pin · 8 aree · 17 planimetrie»: solo i pin di contenuto, come da modifiche.md |
| Residui di L2 | **verificato, con un'osservazione** | Il numero dei pin non copre più il disegno: il riquadro rosso è sotto la figura, nella riga del titolo (figura 302–471, riquadro 480–502 a 1280×689). La parola «pin» c'è in indice, carte, elenco, scheda e selettore delle versioni, anche al singolare («1 pin»). Osservazione, gravità bassa: nella stessa riga il numero si legge due volte, nel riquadro «7» e nel testo «7 pin» (`01-…`) |
| AP3-1 | **verificato** | Nella colonna «Da raccogliere» di Madarame c'è «Schede da sistemare (1)», chiusa di base e trovabile senza confondersi con le voci (`02-…`) |
| AP3-2 | **verificato** | Tocco sul pin «Punto di infiltrazione: Museo, 1P»: la scheda non ha «Su:» e mostra «Vai: Museo 1P». Il tocco porta a `/area/museo-1p?infiltrazione=madarame-nelle-profondita-del-museo&planimetria=…153-2-0`, cioè stessa infiltrazione e versione giusta (`03-…`) |
| NR3-4 | **verificato** | L'indirizzo salvato `/guida/mappe/nativo-rmap-151-6-0` apre il Tetto di Kamoshida su «Scala · 2 pin · si apre per prima · versione 1 di 5», la planimetria che apriva prima (`04-…`) |

## 2. Righe «da verificare» da prima
| Riga | Esito | Cosa si vede |
|---|---|---|
| UX3-2 | **verificato** | 16 maggio, voce «Palazzo di Madarame: infiltrazione iniziale.», finestra «Infiltrazioni della voce»: «In ordine, come le percorri: il collegamento «Palazzo di Madarame» apre la prima non completata…» e «Nessuna: il collegamento «Palazzo di Madarame» apre «Prima Infiltrazione al Museo», la prima della proposta.», cioè il testo adeguato a UX3-1. Caso nuovo, aperto come UX3-9: una voce **senza collegamento** dice «il collegamento della voce apre…» |
| UX3-3 | **verificato** | A 1024×690 la riga dell'area ha «Modifica», «Planimetria» e «Altro»; da 1280 icone con titolo ed «Elimina»; a 375 e 768 «Modifica» con il resto raccolto (`08-…`) |
| UX3-6 | **verificato** | L'illustrazione `dungeon-madarame` è una figura piena, mai sfondo. Opacità 1, `position: static`, nessuna maschera. Misure: 102×57 con lo stemma da 40 a 1280×689, 1366×657 e 1920×1080; 174×97 a 768; 148×82 a 375. A 1024×690 c'è solo lo stemma da 48. Osservazione: i segni da 14 px dei chip delle date («si apre», «furto», «scade») hanno opacità 0,80. Sono icone di testo, non figure, ma la regola «opacità al 100%» è stretta: decide il Manager |

## 3. Le 6 Aree con la predefinita senza pin
Sono: Futaba corridoio-principale, Shido sala-dingresso, sala-intrattenimento-2p e ponte-piscina, Maruki sala-dingresso e ripostiglio.

Ho provato Futaba › Corridoio principale (`05-…`, `06-…`, `07-…`). **Per chi gioca non è un problema: il passaggio è a un tocco e si capisce.**
- **Da 768 in giù**, sotto le versioni c'è la frase «Su questa planimetria non ci sono pin: quelli dell'area stanno su «planimetria completa».»
  e il pulsante «Passa a «planimetria completa»» da 44 px.
- **Da 1024 in su** il selettore dice «settore d'ingresso · nessun pin: stanno su «planimetria completa»», con accanto il pulsante «Passa»
  da 44 px (nome completo nel titolo). A 1366 il testo del selettore si tronca in «planimetria comple…», ma «Passa» basta.
- Si potrebbe far aprire per prima la versione con i pin. È una scelta sui dati (quale versione è la predefinita) e va all'utente o al
  Manager: non è un difetto di resa.

## 4. Difetto nuovo
- **UX3-9** (bassa, FE): una voce senza collegamento al Palazzo dice «il collegamento della voce apre…». Dettagli in difetti.md.

## 5. Una sola barra
- In `/guida/mappe` scorre solo `main` (621/1176 con Madarame aperto a 1280×689).
- Nella scheda del Palazzo, a 1366×657, la pagina non scorre: scorrono le due colonne, ognuna dentro un riquadro con il bordo visibile e
  `overscroll: contain`. È la forma «una schermata» di R3-41: due aree scorrevoli evidenti, che non scorrono insieme alla pagina.
