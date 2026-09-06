from pathlib import Path
import shutil
root=Path('C:/Repository/project-p5r-main');work=Path(__file__).parent
def edit(path,changes):
    p=root/path;s=p.read_text(encoding='utf-8-sig')
    for old,new in changes:
        assert old in s,(path,old[:100]);s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')
for name,dest in [('navigazioneMappa.ts','src/utils'),('NavigazioneSpillo.tsx','src/components/mappe'),('DestinazioneSpilloEditor.tsx','src/components/mappe')]:shutil.copyfile(work/name,root/dest/name)
edit('src/services/api/mappe.ts',[("import type { EsportazioneMappeDto,", "import type { DestinazioneSpillo, EsportazioneMappeDto,"),('export interface DatiSpilloApi {','export interface DatiSpilloApi { destinazione?: DestinazioneSpillo | null;')])
p=root/'src/components/mappe/VisoreMappa.tsx';s=p.read_text(encoding='utf8')
s="import { NavigazioneSpillo } from './NavigazioneSpillo';\nimport type { NavigaMappa } from '../../utils/navigazioneMappa';\n"+s
s=s.replace('onNaviga: (chiave: string) => void;','onNaviga: NavigaMappa;')
lines=s.splitlines()
replacements=0
for i,line in enumerate(lines):
    if "{selezionato.dettaglio?.tipo === 'mappa' && selezionato.dettaglio.mappa && <PulsanteVisivo" in line:
        lines[i]='                  <NavigazioneSpillo spillo={selezionato} partitaId={partitaId} onNaviga={onNaviga}/>';replacements+=1
    elif "{d?.tipo === 'mappa' && d.mappa && <PulsanteVisivo" in line:
        lines[i]='      <NavigazioneSpillo spillo={s} partitaId={partitaId} onNaviga={onNaviga}/>';replacements+=1
assert replacements==2
p.write_text('\n'.join(lines)+'\n',encoding='utf8')
edit('src/pages/MappaPage.tsx',[("import { useMemo }", "import { urlMappa } from '../utils/navigazioneMappa';\nimport { useMemo }"),
 ("key={`${mappa.chiave}-${spilloIniziale ?? ''}`}","key={`${mappa.chiave}-${spilloIniziale ?? ''}-${params.get('x') ?? ''}-${params.get('y') ?? ''}-${params.get('zoom') ?? ''}`}") ,
 ("onNaviga={(k) => navigate(`/guida/mappe/${encodeURIComponent(k)}`)}", "onNaviga={(k, arrivo) => navigate(urlMappa(k, arrivo))}")])
edit('src/components/mappe/MappaIncorporata.tsx',[("import { useEffect,", "import { urlMappa, type NavigaMappa } from '../../utils/navigazioneMappa';\nimport { useEffect,"),('onNaviga?: (chiave:string)=>void;', 'onNaviga?: NavigaMappa;'),("onNaviga={onNaviga ?? ((k) => navigate(`/guida/mappe/${encodeURIComponent(k)}`))}","onNaviga={onNaviga ?? ((k, arrivo) => navigate(urlMappa(k, arrivo)))}")])
edit('src/pages/CittaPage.tsx',[("import ","import ")])
p=root/'src/pages/CittaPage.tsx';s=p.read_text(encoding='utf8');s="import { urlMappa } from '../utils/navigazioneMappa';\n"+s
old='onNaviga={k=>{const quartiere='
assert old in s
s=s.replace(old,"onNaviga={(k,arrivo)=>{if(arrivo){navigate(urlMappa(k,arrivo));return;}const quartiere=")
p.write_text(s,encoding='utf8')
edit('src/pages/EditorMappaPage.tsx',[
 ("import { CondizioniEditor }", "import { DestinazioneSpilloEditor } from '../components/mappe/DestinazioneSpilloEditor';\nimport type { DestinazioneSpillo } from '../types';\nimport { CondizioniEditor }"),
 ('export interface AppuntiSpillo {','export interface AppuntiSpillo { destinazione?: DestinazioneSpillo | null;'),
 ('  const [tipoRicerca, setTipoRicerca]', "  const [destinazione, setDestinazione] = useState<DestinazioneSpillo|null|undefined>(s.destinazione ?? undefined);\n  const [arrivoPronto, setArrivoPronto] = useState(true);\n  const [tipoRicerca, setTipoRicerca]"),
 ('  const modificato = nome !== s.nome', '  const modificato = JSON.stringify(destinazione) !== JSON.stringify(s.destinazione ?? undefined) || nome !== s.nome'),
 ("    if (!condizioni.every", "    if (!arrivoPronto) { notifica('error', 'Scegli il punto di arrivo prima di salvare.'); return; }\n    if (!condizioni.every"),
 ('collezionabile, riferimento: riferimento ? { tipo: riferimento.tipo, chiave: riferimento.chiave } : null, condizioni })','collezionabile, riferimento: riferimento ? { tipo: riferimento.tipo, chiave: riferimento.chiave } : null, condizioni, destinazione })'),
 ('        <CondizioniEditor condizioni={condizioni}', '        <DestinazioneSpilloEditor valore={destinazione} invalidata={s.destinazioneNonDisponibile??false} disabilitato={occupato} onCambia={setDestinazione} onPronto={setArrivoPronto}/>\n        <CondizioniEditor condizioni={condizioni}'),
 ('disabled={occupato || !modificato}', 'disabled={occupato || !modificato || !arrivoPronto}'),
 ('dettaglio="per incollarlo altrove" disabled={occupato}', 'dettaglio="per incollarlo altrove" disabled={occupato || !arrivoPronto || (s.destinazioneNonDisponibile && destinazione === undefined)}')])
