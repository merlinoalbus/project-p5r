# Distinguere le immagini omonime senza fondere le mappe

Il problema è confermato dal codice: le identità e gli URL sono distinti, ma albero e selettori ripetono soltanto il titolo. Il Covo è l’unica raccolta già dotata di miniature e ordinali. Le55 famiglie sono l’ambito fornito dal coordinatore; il loro censimento dati resta all’altro agente.

## Soluzione minima uniforme

Mostrare **«titolo — immagine i di n»** e un’anteprima quando lo spazio lo consente. La numerazione è della raccolta delle immagini figlie del genitore verificato, non di un piano e non di una famiglia geografica dedotta dal nome. Ogni chiave resta indipendente. Il Covo mantiene il gruppo esplicitamente approvato.

Calcolare gli ordinali sull’intera raccolta in ordine persistito, con chiave come spareggio. Ricerca, filtri e scelta del contesto non devono rinumerare. Riassunto e dettaglio devono ricevere la stessa informazione, preferibilmente metadata presentativi del DTO, così MappaIncorporata non inventa un numero dal singolo dettaglio.

Nel visore riusare la lista a miniature dentro il pannello, con immagine corrente evidenziata. Nei select HTML usare la stessa etichetta testuale univoca; non tentare di inserire miniature nelle option. Nell’albero lasciare accessibili tutti i membri sotto il padre, con raccolta espandibile; non eliminare nodi omonimi.

## Punti esatti da aggiornare dopo il gate

- `src/pages/MappaPage.tsx:67` — Selettore delle planimetrie: option identificata da chiave ma testo solo nomePresentazioneMappa; omonimi non distinguibili.
- `src/components/mappe/AlberoLuoghi.tsx:15` — Raggruppamento miniature solo per gruppoImmagini; altri link soltanto nome, quindi stessa etichetta per immagini distinte.
- `src/components/mappe/ImmaginiLuogo.tsx:4` — Modello già utile: miniature + Immagine i di n + aria-current. Ordinamento senza spareggio su chiave; ordinali ricalcolati dal sottoinsieme passato.
- `src/utils/presentazioneMappa.ts:31` — Nome contestuale/neutro corretto ma nessuna disambiguazione tra identità diverse.
- `src/pages/EditorMappaPage.tsx:323` — Lista figli via etichettaPlanimetria; parent selector516 stessa funzione; bottone329 usa solo nomePresentazioneMappa.
- `src/components/mappe/DestinazioneSpilloEditor.tsx:22` — Dropdown globale usa etichettaPlanimetria senza contesto famiglia.
- `src/components/mappe/IngressoQuartiere.tsx:20` — Ricerca e dropdown basati etichettaPlanimetria; filtrare prima di numerare renderebbe ordinale instabile.
- `src/components/mappe/MappaIncorporata.tsx:73` — Contenitore mostra nome grezzo e figli nome grezzo; visore presentaMappa non offre selezione sorelle né contesto in pannello.

## Copertura globale verificabile

- Tutte le chiavi immagine presenti nell’audit backend compaiono esattamente una volta per collezione e restano raggiungibili.
- Per ciascuna delle55 famiglie le etichette accessibili dei membri sono distinte; cardinalità e URL coincidono coi dati prima/dopo.
- Uguale chiave produce medesimo ordinale in albero, pagina, editor, ingressi e incorporata, anche dopo filtro e ordinamento UI.
- Titoli nulli restano neutri; titolo noto scelto solo per contesto esplicito. Cambio contesto conserva identificativo e ordinale.
- Covo5, immagini con nomi multipli19 e omonimi appartenenti a genitori diversi non vengono fusi.
- Anteprima assente non impedisce selezione: etichetta e collegamento restano sufficienti.
- Ricerca non elimina definitivamente membri; reset del filtro ripristina intera collezione.

Nessuna modifica al codice, nessun nuovo pin o passaggio. La navigazione fra le immagini del catalogo non certifica spostamenti nel mondo di gioco.

Aggiornamento del censimento parallelo: l’agente backend riporta62 famiglie su344 nodi,179 membri,169 senza gruppoImmagini. Fonte work/backend-organization/organization-backlog.md. Il criterio di copertura deve usare l’inventario corrente, non il numero55 iniziale. Non ho duplicato il conteggio.
