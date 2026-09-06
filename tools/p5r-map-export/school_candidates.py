"""Resolve four school transitions without claiming narrative availability."""
from scrittura import scrivi_json
import hashlib,json,re,struct,sys
from pathlib import Path
from PIL import Image

def sha(b):return hashlib.sha256(b).hexdigest()
def calls(body):
    masked=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"',' ',body)
    return set(re.findall(r'\b([A-Za-z_]\w*)\s*\(',masked))-{'if','while','for','switch'}

def main(out):
    out=Path(out);target=out/'proiezione-scuola';target.mkdir(exist_ok=True)
    graph=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'))
    projection=json.loads((target/'evidenze.json').read_text(encoding='utf-8'))
    fields={f['field']:f for f in graph['fields']}
    projected={f['field']:f for f in projection['fields']}
    sources={name:sha((out/name).read_bytes()) for name in ['mondo_connessioni_evidenze.json','proiezione-scuola/evidenze.json']}
    def signature(variant_arg,entrance_arg):
        stats={'literalCalls':0,'fieldPresent':0,'uniqueEntranceId':0,'missingEntranceId':0,'duplicateEntranceId':0}
        for f in fields.values():
            for p in f['procedures']:
                for c in p['calls']:
                    a=c['literalArguments']
                    if a is None:continue
                    stats['literalCalls']+=1
                    dest=fields.get(f'F{a[0]:03d}_{a[1]:03d}_{a[variant_arg]:02d}')
                    if not dest:continue
                    stats['fieldPresent']+=1
                    matches=[e for e in dest['entrances'] if e['entranceId']==a[entrance_arg]]
                    stats['uniqueEntranceId' if len(matches)==1 else 'duplicateEntranceId' if matches else 'missingEntranceId']+=1
        return stats
    result={'status':'candidates-not-importable','signature':{'candidateOrder':['major','minor','entranceId','variant'],
      'evidence':'Comparison across extracted CALL_FIELD literals and FBN IDs; parameter names in external decompiler library are generic.',
      'variantFourth':signature(3,2),'variantThirdAlternative':signature(2,3)},'sources':sources,'candidates':[]}
    for key,index in [('F002_002_01',0),('F002_002_02',0),('F002_002_01',4),('F002_002_01',5)]:
        f=fields[key];trigger=next(t for t in f['triggers'] if t['index']==index)
        proc=next(p for p in f['procedures'] if p['index']==trigger['procedureIndex'])
        assert len(proc['calls'])==1 and proc['calls'][0]['literalArguments'] is not None
        a=proc['calls'][0]['literalArguments'];destkey=f'F{a[0]:03d}_{a[1]:03d}_{a[3]:02d}';dest=fields[destkey]
        entries=[e for e in dest['entrances'] if e['entranceId']==a[2]]
        assert len(entries)==1,(destkey,a[2],len(entries))
        entry=entries[0];b=(out/dest['sources']['fbn']['file']).read_bytes();off=entry['offset']
        assert struct.unpack_from('>h',b,off+32)[0]==a[2]
        assert list(struct.unpack_from('>3f',b,off+8))==entry['xyz']
        for sf in [f,dest]:
            for source in [*sf['sources'].values(),sf.get('script')]:
                if not source:continue
                data=(out/source['file']).read_bytes();assert sha(data)==source['sha256'];sources[source['file']]=sha(data)
        definitions={p['name']:p for p in f['procedures']};queue=[proc['name']];visited={};external=set()
        while queue:
            name=queue.pop()
            if name in visited:continue
            p=definitions[name];visited[name]=p
            for callee in calls(p['body']):
                if callee in definitions and callee not in visited:queue.append(callee)
                elif callee not in definitions:external.add(callee)
        sourcepoint=next(t for t in projected[key]['triggers'] if t['index']==index)['projections'][1]['xy']
        arrival={'entranceId':a[2],'recordIndex':entry['index'],'offset':off,'xyz':entry['xyz'],'rawHex':b[off:off+36].hex(),
          'map':None,'xy':None,'status':'local-transform-unresolved'}
        if destkey in projected:
            pf=projected[destkey];px=pf['origin'][0]+entry['xyz'][0]*1.5/projection['scale'];py=pf['origin'][1]+entry['xyz'][2]*1.5/projection['scale']
            layer=pf['layer'];imagepath=f'png/BASE/FIELD/PANEL/ROADMAP/RMAP_002_0_{layer}.png';image=Image.open(out/imagepath).convert('RGBA')
            pixel=image.getpixel((round(px),round(py)))
            arrival.update(map=f'RMAP_002_0_{layer}',xy=[px,py],status='spatial-candidate-review-required',nativePixel=list(pixel),
              corridorAltitude=layer*360,altitudeResidual=entry['xyz'][1]-layer*360)
        mask=re.sub(r'//[^\n]*','',proc['body'])
        guard96='BIT_CHK((0 + 96)) == 1';assert guard96 in mask
        if a[1]==3:assert 'BIT_CHK((0 + 102)) == 1' in mask
        result['candidates'].append({'sourceField':key,'triggerIndex':index,'label':trigger['label'],'trigger':trigger,
          'sourceMap':f'RMAP_002_0_{projected[key]["layer"]}','sourceXY':sourcepoint,'rootProcedure':proc['name'],
          'call':proc['calls'][0],'destinationField':destkey,'arrival':arrival,
          'ordinaryBranchConditions':['BIT_CHK(96) != 1']+(['BIT_CHK(102) != 1'] if a[1]==3 else []),
          'conditionsStatus':'native-only-not-mapped-to-app','procedures':list(visited.values()),
          'externalFunctions':sorted(external),'unresolvedNarrativeEventCalls':True,
          'appImportable':False})
    (target/'candidati-collegamenti.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    for c in result['candidates']:
        if c['arrival']['xy'] is None:continue
        sx,sy=c['sourceXY'];ax,ay=c['arrival']['xy'];name=c['sourceMap']
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="900" height="500" viewBox="350 400 180 100"><rect x="350" y="400" width="180" height="100" fill="#333"/><image xlink:href="../png/BASE/FIELD/PANEL/ROADMAP/{name}.png" width="1024" height="1024"/><path d="M{sx},{sy}L{ax},{ay}" stroke="#00ffff" stroke-width="0.5" stroke-dasharray="2 1"/><circle cx="{sx}" cy="{sy}" r="1.5" fill="#00ffff"/><circle cx="{ax}" cy="{ay}" r="1.5" fill="#ff8800"/><text x="355" y="412" fill="white" font-size="3">Candidato: ciano uscita, arancio ingresso FBN</text><text x="355" y="418" fill="white" font-size="3">Condizioni narrative non ancora applicate</text></svg>'
        (target/f'candidato-{name}.svg').write_text(svg,encoding='utf-8')
    print(json.dumps({'signature':result['signature'],'candidates':[{'source':c['sourceField'],'trigger':c['triggerIndex'],'destination':c['destinationField'],'arrival':c['arrival']} for c in result['candidates']]}))

if __name__=='__main__':main(sys.argv[1])
