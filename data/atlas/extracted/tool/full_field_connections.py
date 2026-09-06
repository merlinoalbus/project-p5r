"""Read complete field sources without inventing map associations."""
import collections,json,sys,struct,math
from pathlib import Path
from extract_maps import sha
from world_connections import positions,hits,procedures
from world_metadata import title_table

def fbn_blocks(data):
    result=[];offset=0
    while offset<len(data):
        if len(data)-offset<16:raise ValueError('Truncated block envelope')
        kind,version,size,start=struct.unpack_from('>4I',data,offset)
        if size<16 or offset+size>len(data) or start not in (0,16):raise ValueError('Invalid block envelope')
        if start and size<32:raise ValueError('Truncated block payload header')
        result.append({'offset':offset,'kind':kind,'version':version,'size':size,'payloadOffset':start,
          'headerHex':data[offset:offset+(32 if start else 16)].hex(),'decodedSpatialType':kind in (1,4)})
        offset+=size
    return result

def spatial_positions(data,kind,stride):
    result=[]
    for block in fbn_blocks(data):
        if block['kind']!=kind:continue
        offset=block['offset']
        if not block['payloadOffset']:raise ValueError('Requested spatial block has no list header')
        count,a,b,c=struct.unpack_from('>4I',data,offset+16)
        if a or b or c or block['size']!=32+count*stride:raise ValueError('Malformed requested spatial list')
        for i in range(count):
            at=offset+32+i*stride;xyz=list(struct.unpack_from('>3f',data,at+8))
            if not all(math.isfinite(v) for v in xyz):raise ValueError('Non-finite coordinates')
            row={'index':i,'offset':at,'xyz':xyz}
            if kind==4:row['entranceId']=struct.unpack_from('>h',data,at+32)[0]
            result.append(row)
    return result

def main(out):
    out=Path(out);root=out/'campi-completi';raw=(root/'manifest.json').read_bytes();m=json.loads(raw)
    titles=title_table((out/'metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD').read_bytes())
    decoded={r['field']:r for r in m['decompilations']};rows=[]
    for f in m['fields']:
        row={'field':f['field'],'sources':{k.lower():v for k,v in f['resources'].items()},'script':None,
          'triggers':[],'triggerPositions':[],'entrances':[],'procedures':[],'components':{},'inRoadmap':f['inRoadmap']}
        def parse(component,source,parser):
            if source is None:
                row['components'][component]={'status':'absent'};return []
            b=(out/source['file']).read_bytes()
            if sha(b)!=source['sha256']:raise ValueError('Source hash mismatch: '+source['file'])
            try:result=parser(b)
            except (ValueError,UnicodeError) as e:
                row['components'][component]={'status':'parse-failed','error':str(e)};return []
            row['components'][component]={'status':'valid' if result else 'valid-empty','count':len(result)}
            return result
        row['fbnBlocks']=parse('fbnBlocks',f['resources']['FBN'],fbn_blocks)
        row['triggerPositions']=parse('triggerPositions',f['resources']['FBN'],lambda b:spatial_positions(b,1,100))
        row['entrances']=parse('entrances',f['resources']['FBN'],lambda b:spatial_positions(b,4,36))
        hh=parse('hits',f['resources']['HTB'],hits)
        d=decoded.get(f['field'])
        if d and d['success']:
            assert d['sourceSha256']==f['resources']['BF']['sha256']
            bf=(out/f['resources']['BF']['file']).read_bytes();assert sha(bf)==d['sourceSha256']
            row['script']={'file':d['flow'],'sha256':d['flowSha256']}
            row['procedures']=parse('procedures',row['script'],lambda b:list(procedures(b.decode('utf-8-sig')).values()))
        else:row['components']['procedures']={'status':'decompilation-failed' if d else 'absent'}
        valid=all(row['components'][k]['status'] in ('valid','valid-empty') for k in ('triggerPositions','hits'))
        aligned=valid and len(hh)==len(row['triggerPositions'])
        row['positionAssociation']='indice-parallelo' if aligned else 'conteggi-diversi-da-verificare'
        for h in hh:
            h['position']=row['triggerPositions'][h['index']] if aligned else None
            h['label']=titles[h['nameId']]['title'] if h['promptType']==11 and h['nameId']<len(titles) else None
            h['procedureResolved']=any(p['index']==h['procedureIndex'] for p in row['procedures'])
            h['procedureStatus']='sentinella-65535' if h['procedureIndex']==65535 else ('risolta' if h['procedureResolved'] else 'mancante')
        row['triggers']=hh;row['triggerCountFbn']=len(row['triggerPositions']);rows.append(row)
    old=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf-8'));byid={r['field']:r for r in rows};diff=[]
    for f in old['fields']:
        for key in ('triggers','triggerPositions','entrances','procedures','triggerCountFbn'):
            if f[key]!=byid[f['field']][key]:diff.append({'field':f['field'],'component':key})
    result={'schemaVersion':1,'manifestSha256':sha(raw),'fields':rows,'previousComparison':{'fields':len(old['fields']),'differences':diff},
      'limits':['Source coordinates are not map coordinates.','Local procedure bodies preserve unevaluated conditions.','No operational map or pin associations generated.']}
    result['summary']={'fields':len(rows),'calls':sum(len(p['calls']) for r in rows for p in r['procedures']),
      'components':{k:dict(collections.Counter(r['components'][k]['status'] for r in rows)) for k in ('triggerPositions','entrances','hits','procedures')},'previousDifferences':len(diff)}
    (root/'connessioni.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result['summary']))

if __name__=='__main__':main(sys.argv[1])
