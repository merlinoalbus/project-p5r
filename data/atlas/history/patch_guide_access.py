from pathlib import Path
root=Path('C:/Repository/project-p5r-main')
p=root/'src/services/api/organizzazioneMappe.ts'
s=p.read_text(encoding='utf-8').replace("import { apiGet }", "import { apiGet, queryString }")
s=s.replace('getContenutiMappa = (chiave: string)', 'getContenutiMappa = (chiave: string, partita?: number)').replace('`/mappe/contenuti/${encodeURIComponent(chiave)}`','`/mappe/contenuti/${encodeURIComponent(chiave)}${queryString({ partita })}`')
p.write_text(s,encoding='utf-8')
p=root/'src/components/mappe/VisoreMappa.tsx'
s=p.read_text(encoding='utf-8')
s="import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';\n"+s
start=s.index('interface PropsAzioni {')
a,b=s[:start],s[start:]
b=b.replace('interface PropsAzioni {', 'interface PropsAzioni<T extends SpilloDto | SchedaContenutoGuidaDto> {').replace('interface PropsScheda {', 'interface PropsScheda<T extends SpilloDto | SchedaContenutoGuidaDto> {')
b=b.replace('spillo: SpilloDto', 'spillo: T')
b=b.replace('function AzioniStato(', 'function AzioniStato<T extends SpilloDto | SchedaContenutoGuidaDto>(').replace(': PropsAzioni)', ': PropsAzioni<T>)')
b=b.replace('function SchedaSpillo(', 'function SchedaSpillo<T extends SpilloDto | SchedaContenutoGuidaDto>(').replace(': PropsScheda)', ': PropsScheda<T>)')
s=a+b
start=s.index('interface PropsScheda<')
a,b=s[:start],s[start:]
b=b.replace('  onNaviga: NavigaMappa;', '  nonSpaziale?: boolean;\n  onNaviga?: NavigaMappa;',1).replace('  onCentra: () => void;', '  onCentra?: () => void;',1)
b=b.replace('onChiudi, onCentra }: PropsScheda<T>)', 'onChiudi, onCentra, nonSpaziale = false }: PropsScheda<T>)',1)
b=b.replace('<NavigazioneSpillo spillo={s} partitaId={partitaId} onNaviga={onNaviga}/>', '{!nonSpaziale && onNaviga && "mappaChiave" in s && <NavigazioneSpillo spillo={s} partitaId={partitaId} onNaviga={onNaviga}/>}')
b=b.replace('<PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Centra" onClick={onCentra} />','{!nonSpaziale && onCentra && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Centra" onClick={onCentra} />}')
p.write_text(a+b,encoding='utf-8')
p=root/'src/components/mappe/ContenutiGuidaMappa.tsx'
s=p.read_text(encoding='utf-8').replace("import { Link }", "import { useState } from 'react';\nimport { SchedaContenutoGuida } from './SchedaContenutoGuida';\nimport { usePartitaStore } from '../../stores/partitaStore';\nimport { Link }")
s=s.replace('  const contenuti = useCarica(() => getContenutiMappa(mappa), [mappa]);', "  const attiva = usePartitaStore(s => s.attiva);\n  const [selezionato, seleziona] = useState<number | null>(null);\n  const contenuti = useCarica(() => getContenutiMappa(mappa, attiva?.id), [mappa, attiva?.id, attiva?.dataGioco, attiva?.fasciaGioco]);")
s=s.replace('<strong>{p.nome}</strong>', '<strong>{p.scheda ? <button type="button" onClick={() => seleziona(p.scheda!.id)}>{p.nome}</button> : p.nome}</strong>')
s=s.replace('</p>}</li>)', '</p>}{p.scheda && selezionato === p.id && <SchedaContenutoGuida key={`${p.id}:${attiva?.id ?? \'nessuna\'}`} spillo={p.scheda} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}</li>)')
p.write_text(s,encoding='utf-8')
new=root/'src/components/mappe/SchedaContenutoGuida.tsx'
new.write_text(Path('work/SchedaContenutoGuida.tsx').read_text(encoding='utf-8'),encoding='utf-8')
print('Accesso ai contenuti guida aggiornato')
