"""Urban spatial diagnostics; original images stay untouched."""
from scrittura import scrivi_json, scrivi_testo
import json,sys,math,struct,html
from pathlib import Path
from PIL import Image
from extract_maps import sha
from render_maps import unpack_tbl

FIELDS={'F001_003_00':'RMAP_001_3_0','F005_001_00':'RMAP_005_1_0','F009_002_00':'RMAP_009_2_0'}
TARGETS={'F003_010_00','F010_019_00','F010_005_00','F005_002_00','F005_003_00','F009_003_00'}

def main(out):
    out=Path(out);dest=out/'proiezione-urbana';dest.mkdir(exist_ok=True)
    names=['campi-completi/connessioni.json','campi-completi/grafo/inventario.json','mondo_metadati.json','mondo_texpack_evidenze.json','originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL']
    raw=[(out/n).read_bytes() for n in names];conn,graph,meta,tex=[json.loads(b) for b in raw[:4]];tbl=unpack_tbl(raw[4])
    fm={f['id']:f for f in meta['fields']};cf={f['field']:f for f in conn['fields']};maps={m['code']:m for m in meta['maps']}
    report={'status':'unverified-urban-projection','sources':{n:sha(b) for n,b in zip(names,raw)},'fields':[],'cases':[o for o in graph['occurrences'] if o['targetField'] in TARGETS],
      'formula':'xy=cursor+(X,Z)*factor/float8','factors':[1,1.5,2],'limits':['No operational pin generated.','All triggers and entrances retained including missing associations.','No interior map inferred from an exterior access.']}
    for key,code in FIELDS.items():
        f=cf[key];params=fm[key];records=[r for r in tex['records'] if not r['sentinel'] and r['group']==params['texpack'] and f"RMAP_{r['major']:03d}_{r['minor']}_0"==code]
        assert len(records)==1;rec=records[0];scale=next(v['value'] for v in rec['floats'] if v['offset']==8)
        assert scale and math.isfinite(scale) and scale>0
        assert tbl['texpack.bin'][rec['offset']:rec['offset']+72].hex()==rec['rawHex']
        rr=tbl['roadmap.bin'][params['offset']:params['offset']+16];major,minor,sub,x,y,pack,_,_=struct.unpack('<hBBhhHHI',rr)
        assert [x,y]==params['cursor'] and f'F{major:03d}_{minor:03d}_{sub:02d}'==key and pack==params['texpack']
        def project(xyz):return [{'factor':a,'xy':[x+xyz[0]*a/scale,y+xyz[2]*a/scale]} for a in report['factors']]
        src=f['sources']['fbn'];b=(out/src['file']).read_bytes();assert sha(b)==src['sha256'];report['sources'][src['file']]=sha(b)
        image=maps[code]['originalImage'];report['sources'][image]=sha((out/image).read_bytes());size=Image.open(out/image).size
        row={'field':key,'map':code,'image':image,'size':size,'roadmap':params,'roadmapRawHex':rr.hex(),'texpack':rec,'scale':scale,'procedures':f['procedures'],'triggers':[],'entrances':[],'unassociatedPositions':[]}
        for t in f['triggers']:
            pos=t['position'];p=next((p for p in f['procedures'] if p['index']==t['procedureIndex']),None)
            row['triggers'].append({'trigger':t,'procedure':p,'projections':project(pos['xyz']) if pos else [],'rawPositionHex':b[pos['offset']:pos['offset']+100].hex() if pos else None})
        if f['positionAssociation']!='indice-parallelo':row['unassociatedPositions']=[{'position':p,'projections':project(p['xyz'])} for p in f['triggerPositions']]
        for e in f['entrances']:row['entrances'].append({'entrance':e,'rawHex':b[e['offset']:e['offset']+36].hex(),'projections':project(e['xyz'])})
        marks=[]
        for t in row['triggers']:
            if not t['projections']:continue
            px,py=t['projections'][1]['xy'];label=str(t['trigger']['index']);tip=html.escape((t['procedure'] or {}).get('name',''))
            marks.append(f'<g><title>{label}: {tip}</title><circle cx="{px}" cy="{py}" r="4" fill="cyan"/><text x="{px+5}" y="{py-5}" fill="cyan" font-size="12" stroke="black" stroke-width=".3">T{label}</text></g>')
        for e in row['entrances']:
            px,py=e['projections'][1]['xy'];eid=e['entrance']['entranceId'];marks.append(f'<path d="M{px-4},{py-4}l8,8m-8,0l8,-8" stroke="orange" stroke-width="2"><title>Ingresso {eid}</title></path>')
        w,h=size;svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="#333"/><image href="../{image}" width="{w}" height="{h}"/>'+''.join(marks)+'</svg>'
        scrivi_testo(dest/(code+'.svg'), svg);report['fields'].append(row)
    scrivi_json(dest/'evidenze.json', report)
    print(json.dumps([{'field':r['field'],'triggers':len(r['triggers']),'entrances':len(r['entrances']),'unassociated':len(r['unassociatedPositions'])} for r in report['fields']]))

if __name__=='__main__':main(sys.argv[1])
