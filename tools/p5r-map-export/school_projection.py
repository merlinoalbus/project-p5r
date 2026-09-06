"""Diagnostic only: field coordinates, native apertures and scale hypotheses."""
from scrittura import scrivi_json, scrivi_testo
import hashlib,json,math,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image
from render_maps import unpack_tbl

def digest(b):return hashlib.sha256(b).hexdigest()
def components(mask):
    seen=set();result=[]
    for y,x in zip(*np.where(mask)):
        if (int(x),int(y)) in seen:continue
        todo=[(int(x),int(y))];seen.add(todo[0]);pixels=[]
        while todo:
            px,py=todo.pop();pixels.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and (nx,ny) not in seen:
                    seen.add((nx,ny));todo.append((nx,ny))
        result.append(np.array(pixels))
    return result

def main(out):
    out=Path(out);target=out/'proiezione-scuola';target.mkdir(exist_ok=True)
    evidence=json.loads((out/'mondo_texpack_evidenze.json').read_text(encoding='utf-8'))
    record=next(r for r in evidence['records'] if r['offset']==26856)
    scale=next(v['value'] for v in record['floats'] if v['offset']==8)
    tblpath='originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL'
    tblraw=(out/tblpath).read_bytes();members=unpack_tbl(tblraw)
    assert members['texpack.bin'][26856:26928].hex()==record['rawHex']
    development={('F002_002_00',0),('F002_002_00',1),('F002_002_00',2),('F002_003_00',1)}
    result={'status':'diagnostic-not-certified','formula':'pixelX=cursorX+X*factor/scale; pixelY=cursorY+Z*factor/scale',
      'factorCandidates':[1,1.5,2],'scale':scale,'scaleSource':record,
      'criteria':{'colorMask':'R>200,G>180,B<80,A>128','centerDistanceScreeningPixels':12,
        'meaning':'Screening only. Corresponding opening and plane must be independently verified; nearest yellow pixel alone is insufficient.'},
      'sources':{},'maps':[],'fields':[],'limits':['No app mutations, edges or narrative conditions generated.',
      'The factor hypothesis was formulated from four first-floor doors; all other GO triggers are holdout observations.',
      'Apertures are connected yellow components, not semantic labels. Correspondence needs review.',
      'Floor from source sub-number is retained as hypothesis; stairs may have intermediate Y.']}
    for name in ['mondo_texpack_evidenze.json','mondo_metadati.json']:
        result['sources'][name]=digest((out/name).read_bytes())
    images={};parts={}
    result['sources'][tblpath]=digest(tblraw)
    for layer in range(3):
        path=f'png/BASE/FIELD/PANEL/ROADMAP/RMAP_002_0_{layer}.png';image=np.array(Image.open(out/path).convert('RGBA'))
        mask=(image[:,:,0]>200)&(image[:,:,1]>180)&(image[:,:,2]<80)&(image[:,:,3]>128)
        images[layer]=image;parts[layer]=components(mask)
        result['sources'][path]=digest((out/path).read_bytes())
        result['maps'].append({'layer':layer,'image':path,'size':[image.shape[1],image.shape[0]],'apertures':[
          {'id':i,'bounds':[int(a[:,0].min()),int(a[:,1].min()),int(a[:,0].max()),int(a[:,1].max())],'pixelCount':len(a)} for i,a in enumerate(parts[layer])]})
    for field in evidence['school']:
        layer=field['roadmap']['sub'];origin=field['roadmap']['cursor'];src=field['sources']['fbn'];raw=(out/src['file']).read_bytes()
        assert digest(raw)==src['sha256']
        result['sources'][src['file']]=digest(raw)
        def project(xyz,factor):return [origin[0]+xyz[0]*factor/scale,origin[1]+xyz[2]*factor/scale]
        row={'field':field['field'],'layer':layer,'origin':origin,'triggers':[],'entrances':[]}
        roff=field['roadmap']['offset'];rraw=members['roadmap.bin'][roff:roff+16]
        major,minor,sub,cx,cy,pack,unknown,mode=struct.unpack('<hBBhhHHI',rraw)
        assert (major,minor,sub)==(2,field['roadmap']['minor'],layer) and [cx,cy]==origin and pack==154
        row['roadmapSource']={'offset':roff,'rawHex':rraw.hex(),'unknownH10':unknown,'mode':mode}
        for trigger in field['triggers']:
            if not trigger['position']:continue
            xyz=trigger['position']['xyz'];offset=trigger['position']['offset']
            assert list(struct.unpack_from('>3f',raw,offset+8))==xyz
            proc=next((p for p in field['procedures'] if p['index']==trigger['procedureIndex']),None)
            item={'index':trigger['index'],'label':trigger['label'],'procedure':proc['name'] if proc else None,
              'promptType':trigger['promptType'],'xyz':xyz,'sourceOffset':offset,'rawHex':raw[offset:offset+100].hex(),
              'partition':'hypothesis-input' if (field['field'],trigger['index']) in development else 'holdout',
              'projections':[]}
            for factor in result['factorCandidates']:
                point=project(xyz,factor);distances=[float(np.sqrt(((a-np.array(point))**2).sum(axis=1)).min()) for a in parts[layer]]
                nearest=int(np.argmin(distances)) if distances else None
                item['projections'].append({'factor':factor,'xy':point,'nearestAperture':nearest,'distance':distances[nearest] if nearest is not None else None})
            row['triggers'].append(item)
        for entrance in field['entrances']:
            row['entrances'].append({**entrance,'xy':project(entrance['xyz'],1.5)})
        result['fields'].append(row)
    # SVG scientific overlays retain the original image untouched and mark source triggers separately from arrivals.
    for layer in range(3):
        marks=[]
        for row in result['fields']:
            if row['layer']!=layer:continue
            color='#00ffff' if '_002_' in row['field'] else '#ff55ff'
            for t in row['triggers']:
                p=t['projections'][1];x,y=p['xy'];name=f"{row['field'][5:8]}:{t['index']}"
                marks.append(f'<circle cx="{x}" cy="{y}" r="3" fill="{color}"/><text x="{x+4}" y="{y-4}" fill="{color}" font-size="8">{name}</text>')
            for e in row['entrances']:
                x,y=e['xy'];marks.append(f'<path d="M{x-3},{y-3}l6,6m-6,0l6,-6" stroke="#ff8800" stroke-width="1"/>')
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#333"/><image xlink:href="../png/BASE/FIELD/PANEL/ROADMAP/RMAP_002_0_{layer}.png" width="1024" height="1024"/>'+''.join(marks)+'</svg>'
        scrivi_testo(target/f'piano-{layer+1}.svg', svg)
    result['goComparison']=[]
    for row in result['fields']:
        for t in row['triggers']:
            if t['promptType']==11:result['goComparison'].append({'field':row['field'],'layer':row['layer'],'index':t['index'],'label':t['label'],'partition':t['partition'],'projections':t['projections']})
    result['exceptions']=[{'field':'F002_002_02','trigger':1,'reason':'Roof trigger Y=1078.219 lies about 358 above third-floor corridor Y=720. Nearest yellow aperture is unrelated. Landing/floor rendering remains unverified.'},
      {'fields':['F002_003_00','F002_003_01','F002_003_02'],'trigger':0,'reason':'Reverse door centers lie 10.26 to 10.57px right of yellow aperture across three floors. Retain discrepancy; no snapping or exact doorway-center claim.'}]
    result['statistics']=[{'factor':factor,'partition':partition,'count':len(rows),'within12Pixels':sum(t['projections'][i]['distance']<=12 for t in rows),'meanNearestDistance':sum(t['projections'][i]['distance'] for t in rows)/len(rows)}
      for i,factor in enumerate(result['factorCandidates']) for partition in ['hypothesis-input','holdout'] if (rows:=[t for t in result['goComparison'] if t['partition']==partition])]
    scrivi_json(target/'evidenze.json', result)
    print(json.dumps(result['goComparison'],ensure_ascii=True))

if __name__=='__main__':main(sys.argv[1])
