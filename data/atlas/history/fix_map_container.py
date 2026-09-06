from pathlib import Path
r=Path('C:/Repository/project-p5r-main')
(r/'src/utils/haPlanimetria.ts').write_text("import type { MappaDto } from '../types';\n/** Gli asset illustrativi senza dimensioni verificate non sono planimetrie. */\nexport function haPlanimetria(mappa: MappaDto): boolean {\n  return Boolean(mappa.immagineUrl || (mappa.assetOriginale && (mappa.larghezza ?? 0) > 0 && (mappa.altezza ?? 0) > 0));\n}\n",encoding='utf8')
p=r/'src/pages/MappaPage.tsx';s=p.read_text(encoding='utf8')
s=s.replace("import { useAsset } from '../stores/assetStore';","import { haPlanimetria } from '../utils/haPlanimetria';")
s=s.replace('  const [params, setParams] = useSearchParams();','  const [params, setParams] = useSearchParams();')
s=s.replace('  const asset = useAsset(mappa?.asset);\n  const originale = useAsset(mappa?.assetOriginale);\n','')
selector=s[s.index('        <SelettoreContestoMappa mappa={mappa}'):s.index('\n        {!(mappa.immagineUrl')]
s=s.replace(selector,'')
s=s.replace('{!(mappa.immagineUrl || asset || originale) ?', '{!haPlanimetria(mappa) ?')
navstart=s.index(' : <>{mappa.gruppoImmagini ?')
navend=s.index('<VisoreMappa',navstart)
navigation=s[navstart+len(' : <>'):navend]
s=s[:navstart]+' : <>'+s[navend:]
guide='<ContenutiGuidaMappa mappa={mappa.chiave} area={params.get(\'area\')} dungeon={mappa.entita?.tipo === \'dungeon\' ? mappa.entita.chiave : undefined} />'
s=s.replace('          mappa={presentata!}', '          contenutiPannello={<>'+selector.strip()+navigation+guide+'</>}\n          mappa={presentata!}')
s=s.replace('        '+guide, '        {!haPlanimetria(mappa) && '+guide+'}')
p.write_text(s,encoding='utf8')
p=r/'src/components/mappe/VisoreMappa.tsx';s=p.read_text(encoding='utf8')
s=s.replace('  pannello?: ReactNode;', '  pannello?: ReactNode;\n  /** Controlli e contenuti accessibili anche nel visore a schermo intero. */\n  contenutiPannello?: ReactNode;')
s=s.replace('editor, pannello, intestazione,', 'editor, pannello, contenutiPannello, intestazione,')
s=s.replace('          {pannello ?? <>', '          {pannello ?? <>\n          {contenutiPannello}')
p.write_text(s,encoding='utf8')
p=r/'src/components/mappe/MappaIncorporata.tsx';s=p.read_text(encoding='utf8')
s="import { haPlanimetria } from '../../utils/haPlanimetria';\n"+s
marker='  return (\n    <div className={className}'
insert='''  if (!haPlanimetria(mappa)) return <section className={`card ${className ?? ''}`}>
    <h3>{mappa.nome}</h3>
    <Link to={urlMappa(mappa.chiave)}>Apri il luogo e i contenuti della guida</Link>
    {!!mappa.figli.length && <ul>{mappa.figli.map(f => <li key={f.chiave}><Link to={urlMappa(f.chiave)}>{f.nome}</Link></li>)}</ul>}
  </section>;
'''
assert marker in s;s=s.replace(marker,insert+marker)
p.write_text(s,encoding='utf8')
p=r/'src/components/mappe/ContenutiGuidaMappa.tsx';s=p.read_text(encoding='utf8')
marker='        {!!a.mappe.length'
insert='''        {!!a.collegamenti?.length && <details><summary>Dettagli della sezione</summary>{a.collegamenti.map(c => <div key={c.id}>
          <button type="button" onClick={() => seleziona(c.id)}>{c.nome}</button>
          {selezionato === c.id && <SchedaContenutoGuida key={`${c.id}:${attiva?.id ?? 'nessuna'}`} spillo={c} partitaId={attiva?.id ?? null} onChiudi={() => seleziona(null)} onCambiato={contenuti.ricarica} />}
        </div>)}</details>}
'''
s=s.replace(marker,insert+marker);p.write_text(s,encoding='utf8')
print('Criterio planimetria condiviso e contenuti raggiungibili')
