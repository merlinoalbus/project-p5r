from pathlib import Path
import shutil,json,hashlib,datetime
root=Path.cwd();dest=root/'outputs/documenti-mondo';dest.mkdir(exist_ok=True)
items=[('work/parallel-cleanup/connessioni-globali.md','collegamenti-globali.md'),('work/parallel-cleanup/connessioni-globali.json','collegamenti-globali.json'),('outputs/mappe-p5r/mondo_metadati.json','coordinate-pin-native.json'),('outputs/mappe-p5r/campi-completi/connessioni.json','chiamate-cambio-campo.json'),('outputs/mappe-p5r/app-integration/pin-luoghi-verificati.json','cinque-pin-applicati.json'),('work/backend-organization/organization-backlog.md','organizzazione-da-completare.md'),('work/backend-organization/organization-backlog-evidence.json','censimento-organizzazione.json'),('work/backend-organization/urban-visual-associations.md','confronto-scuola-sottopasso.md'),('work/backend-organization/urban-visual-matrix.json','confronto-immagini-misure.json'),('work/parallel-cleanup/luoghi-senza-planimetria.md','destinazioni-senza-planimetria.md'),('work/parallel-cleanup/luoghi-senza-planimetria.json','destinazioni-senza-planimetria.json'),('work/parallel-cleanup/nomi-residui-approfondimento.md','nomi-residui.md'),('work/parallel-cleanup/omonimi-presentazione-ui.md','proposta-raggruppamenti.md')]
manifest=[]
for source,name in items:
 src=root/source;assert src.is_file(),src;shutil.copy2(src,dest/name);manifest.append({'documento':name,'fonte':str(src),'bytes':src.stat().st_size,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
(dest/'manifest-documenti.json').write_text(json.dumps({'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':manifest},ensure_ascii=False,indent=2),encoding='utf8')
def link(name,title):return '['+title+']('+str(dest/name).replace('\\','/')+')'
text='''# Mondo unificato P5R — documenti raccolti e stato reale

Questa cartella raccoglie copie fedeli dei rapporti già prodotti. Non è una dichiarazione di completamento: l'integrazione del mondo navigabile è ancora incompleta. Le copie sono una fotografia; il manifest riporta percorso e hash di ogni fonte originale.

## Pin: dove posizionarli

'''+link('coordinate-pin-native.json','Coordinate e icone native per planimetria')+'''

Il campo maps contiene le risorse estratte; ogni elemento pins conserva nativeType, x, y, offset, flag ed effect. Coordinate nei pixel dell'immagine originale DDS, origine in alto a sinistra, x verso destra e y verso il basso. Per l'app percentuale: x_app=100*x/larghezza_originale; y_app=100*y/altezza_originale. Questa conversione si applica solo quando pin e immagine condividono la fonte e il riferimento verificati, senza ritaglio o ridimensionamento distruttivo. L'inquadratura del visore non modifica le coordinate salvate.

**Limite:** questi dati non costituiscono una lista completa di negozi, confidenti e attività già identificati. I tipi numerici e i flag devono essere interpretati; una posizione nota non prova la disponibilità dell'attività.

'''+link('cinque-pin-applicati.json','I cinque pin effettivamente applicati, con prima/dopo ed evidenze')+'''

## Collegamenti: origine, destinazione e condizioni

'''+link('collegamenti-globali.md','Rapporto leggibile sui collegamenti globali')+' — '+link('collegamenti-globali.json','Dati analitici del rapporto')+' — '+link('chiamate-cambio-campo.json','Inventario completo delle chiamate di cambio campo')+'''

Censite 2546 occorrenze, conservati 2109 archi letterali. 263 occorrenze hanno campo/ingresso risolti, una sola immagine candidata ai due estremi e un percorso locale da trigger. **Non sono 263 passaggi operativi certificati o importati.** Le chiamate condivise delle safe room non possono diventare indiscriminatamente collegamenti sulla mappa.

Il collegamento finale deve riportare mappa e posizione di origine, tipo di pin, mappa e punto di arrivo, eventuale contesto/variante, requisiti effettivamente verificati e fonte. Non dedurre il collegamento inverso: va provato separatamente. Presenza del campo, omonimia o somiglianza grafica non bastano. In app il supporto a destinazione mappa/x/y/zoom esiste; nell'ultimo controllo del runtime risultano zero destinazioni configurate.

## Decisioni richieste dall'utente

- Un solo mondo: Mappe, Città, Palazzi e Dedali, negozi e inventario restano sezioni distinte con accesso diretto ai medesimi luoghi.
- Prima completare organizzazione, nomi e raggruppamenti; poi tutti i tipi di pin; poi collegamenti e disponibilità narrativa globale.
- Passaggio per spostamenti; Stazione per la metropolitana; Attività per eventi narrativi, eventualmente con arrivo sulla mappa dell'evento. Conservare anche rampino, scorciatoie e gli altri tipi pertinenti.
- Disponibilità secondo giorno, momento della giornata, meteo e stato del salvataggio: confidenti, ranghi, Persona o altri livelli soltanto quando sono davvero requisiti del gioco.
- Tokyo mostra le destinazioni secondo gli sblocchi; non inventare planimetrie per luoghi che non ne hanno. Non rappresentare i Memento procedurali come una pianta fissa universale.
- Lavoro sul pacchetto base; import/export conservati per future integrazioni. Non eliminare le sezioni di negozi, beni o guide.
- Conservare coordinate, immagini, personalizzazioni, ID e vecchi collegamenti durante la riorganizzazione.

## Nomi, doppioni e luoghi senza planimetria

'''+link('organizzazione-da-completare.md','Elenco dei problemi di organizzazione ancora aperti')+' — '+link('censimento-organizzazione.json','Censimento per nodo')+'\n\n'+link('confronto-scuola-sottopasso.md','Confronto diretto delle immagini della scuola e del Sottopasso')+' — '+link('confronto-immagini-misure.json','Misure del confronto')+'\n\n'+link('destinazioni-senza-planimetria.md','Verifica delle sedici destinazioni indicate dall’utente')+'\n\n'+link('nomi-residui.md','Nomi ricostruiti e nomi ancora irrisolti')+'\n\n'+link('proposta-raggruppamenti.md','Proposta di presentazione delle immagini omonime')+'''

Le ultime proposte non sono tutte già applicate. Le 62 famiglie omonime del censimento non equivalgono a 62 duplicati eliminabili; occorre distinguere immagini alternative, porzioni diverse e copie identiche. Il raggruppamento visivo non dimostra una relazione geografica.

## Stato dell'app e ripresa

Repository attivo: C:/Repository/project-p5r-main, ramo codex/atlante-mondo. Runtime locale: frontend5275/backend3103, database work/runtime-atlante/project-p5r.db nella cartella di questo lavoro. Non usare per l'app il database privato delle prove.

Ultimo controllo: 344 nodi, 301 immagini native caricate e confrontate con gli originali, 116 sezioni guida conservate, 387 pin totali; soltanto5 pin su3 mappe native, zero destinazioni configurate. Ripristino dell'indice a schede verificato desktop/mobile e approvato. Nove nomi e quattro refusi verificati su copia con due reseed: applicazione al runtime ancora da completare al momento di questa fotografia. Raggruppamenti globali in lavorazione.

Il checkpoint operativo dettagliato è work/RIPRESA-ATLANTE.md. Gli originali, le fonti e il tool di estrazione sono in outputs/mappe-p5r; le analisi di lavoro in work/parallel-cleanup e work/backend-organization. Non rieseguire alla cieca gli script di applicazione: alcuni sono monouso e i rapporti distinguono copie di prova e runtime.

**Manca ancora un pacchetto completo e verificato di tutti i pin e collegamenti operativi del mondo. Questi documenti permettono di riprendere il lavoro, non sostituiscono quel risultato.**
'''
(dest/'LEGGIMI.md').write_text(text,encoding='utf8');print(str(dest/'LEGGIMI.md'));print(len(manifest),'fonti copiate e verificate')
