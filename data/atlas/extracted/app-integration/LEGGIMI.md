# Planimetrie native per l’app

Pacchetto di prova: 301 planimetrie con immagini incorporate e coordinate originali. Importare planimetrie-native.json con l’importatore delle mappe, in un ambiente isolato. Le radici già richieste sono elencate in evidenze.json.

Le cartelle Risorse native raccolgono materiali ancora da associare; non sono luoghi inventati del mondo. Le associazioni ai quartieri organizzano le mappe e non dimostrano passaggi fisici. Le sette viste urbane illustrate sono conservate separatamente in viste-urbane.json.

L’importazione non completa la navigazione continua: restano da certificare uscite, ingressi, posizioni e condizioni narrative dei pin. I flag originali sono conservati nelle evidenze.

Rigenerazione: `python app_package.py CARTELLA_EXPORT`. Verifica indipendente: `python verify_app_package.py CARTELLA_EXPORT`.
