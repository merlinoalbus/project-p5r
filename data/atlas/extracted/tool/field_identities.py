"""Native identity references for every collected field, without guessed floors."""
import collections,json,struct,sys
from pathlib import Path
from extract_maps import sha
from native_labels import Decoder,strings
from world_metadata import ftd_blocks

def main(out):
    out=Path(out);root=out/'campi-completi'
    paths={'places':'metadati_originali/BASE/FIELD/FTD/FLDPLACENO.FTD','titles':'metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD','charset':'tool/P5R_EFIGS.tsv','manifest':'campi-completi/manifest.json','roadmap':'mondo_metadati.json'}
    raw={k:(out/p).read_bytes() for k,p in paths.items()}
    titles=strings(raw['titles'],Decoder(out/paths['charset']));mode,blocks=ftd_blocks(raw['places']);assert mode==0
    places={}
    for major,(off,b) in enumerate(blocks):
        zero,size,count,flag=struct.unpack_from('>4I',b);assert not zero and not flag and size==count*8 and size+16<=len(b)
        for minor in range(count):
            at=16+minor*8;ids=list(struct.unpack_from('>4H',b,at))
            refs=[{'index':i,'status':'indice-invalido','text':None} if i>=len(titles) else titles[i] for i in ids]
            places[major,minor]={'offset':off+at,'rawHex':b[at:at+8].hex(),'indices':ids,'group':refs[0],'variants':refs[1:]}
    manifest=json.loads(raw['manifest']);meta=json.loads(raw['roadmap']);fm={f['id']:f for f in meta['fields']};rows=[]
    for f in manifest['fields']:
        key=f['field'];major,minor,sub=map(int,key[1:].split('_'));p=places.get((major,minor));r=fm.get(key)
        candidate=p['variants'][sub] if p and sub<3 else None
        rows.append({'field':key,'placeRecordStatus':'presente' if p else 'voce-assente','placeRecord':p,
          'variantCandidate':candidate,'variantCandidateStatus':candidate['status'] if candidate else 'voce-assente' if not p else 'variante-fuori-intervallo',
          'variantSemantics':'sub-index-candidate-not-confirmed-floor','canonicalName':None,
          'roadmap':r,'mapCandidates':[m['code'] for m in meta['maps'] if key in m['fields']],
          'mappingStatus':'roadmap-resource-association' if r else 'no-roadmap-association'})
    report={'schemaVersion':1,'sources':{k:{'file':p,'sha256':sha(raw[k])} for k,p in paths.items()},'fields':rows,
      'placeRecords':len(places),'titleEntries':len(titles),'limits':['Native variants are retained, not asserted as floors.','No canonical name or missing planimetry generated.']}
    report['summary']={'fields':len(rows),'withPlaceRecord':sum(r['placeRecord'] is not None for r in rows),'candidateStatuses':dict(collections.Counter(r['variantCandidateStatus'] for r in rows)),
      'withRoadmap':sum(r['roadmap'] is not None for r in rows),'validCandidateWithoutRoadmap':sum(r['roadmap'] is None and r['variantCandidateStatus']=='valido' for r in rows)}
    (root/'identita.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report['summary']))

if __name__=='__main__':main(sys.argv[1])
