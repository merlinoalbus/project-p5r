"""Global field/entrance graph with explicit unresolved image and script semantics."""
import collections,csv,hashlib,json,math,re,sys
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def local_calls(body,known):
    masked=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"',' ',body)
    return set(re.findall(r'\b([A-Za-z_]\w*)\s*\(',masked))&known

def main(out,connection_file='mondo_connessioni_evidenze.json',target_dir='mondo-globale'):
    out=Path(out);target=out/target_dir;target.mkdir(parents=True,exist_ok=True)
    filenames=['mondo_metadati.json',connection_file,'mondo_texpack_evidenze.json']
    meta,conn,tex=[json.loads((out/f).read_text(encoding='utf-8')) for f in filenames]
    fields={f['field']:f for f in conn['fields']};fm={f['id']:f for f in meta['fields']}
    byfield=collections.defaultdict(list)
    for m in meta['maps']:
        for f in m['fields']:byfield[f].append(m['code'])
    records={}
    for r in tex['records']:
        if not r['sentinel']:
            for layer in range(r['layerCount']):records.setdefault((r['group'],f"RMAP_{r['major']:03d}_{r['minor']}_{layer}"),[]).append(r)
    report={'schemaVersion':1,'status':'global-audit-not-operational-navigation',
      'sources':{f:sha((out/f).read_bytes()) for f in filenames},'fields':[],'maps':meta['maps'],'occurrences':[],'edges':[],
      'limits':['CALL_FIELD argument order is an evidence-backed interpretation, not execution proof.',
        'All candidate textures are retained; field sub is not assumed to be texture layer.',
        'Trigger reachability means a path exists in the local procedure call graph, not that its conditions hold.',
        'No missing entrance ID is silently replaced with index, default or nearest point.',
        'Factor1.5 projections are diagnostic hypotheses; no global spatial certification or app pins.']}
    def position_candidates(key,xyz):
        result=[]
        if key not in fm or xyz is None:return result
        params=fm[key]
        for code in byfield[key]:
            for r in records.get((params['texpack'],code),[]):
                scale=next(v['value'] for v in r['floats'] if v['offset']==8)
                valid=isinstance(scale,(float,int)) and math.isfinite(scale) and scale>0
                result.append({'map':code,'texpackOffset':r['offset'],'scale':scale,'origin':params['cursor'],
                  'xyHypothesis':[params['cursor'][0]+xyz[0]*1.5/scale,params['cursor'][1]+xyz[2]*1.5/scale] if valid else None,
                  'status':'unverified-projection' if valid else 'invalid-scale'})
        return result
    for key,f in fields.items():
        definitions={p['name']:p for p in f['procedures']};known=set(definitions)
        adjacency={n:local_calls(p['body'],known) for n,p in definitions.items()}
        roots=collections.defaultdict(set)
        for t in f['triggers']:
            root=next((p['name'] for p in f['procedures'] if p['index']==t['procedureIndex']),None)
            if not root:continue
            stack=[root];seen=set()
            while stack:
                name=stack.pop()
                if name in seen:continue
                seen.add(name);roots[name].add(t['index']);stack.extend(sorted(adjacency[name]-seen))
        report['fields'].append({'id':key,'metadata':fm.get(key),'mapCandidates':byfield[key],
          'positionAssociation':f.get('positionAssociation'),'sources':f['sources'],'script':f.get('script'),
          'triggerCount':len(f['triggers']),'entranceCount':len(f['entrances']),
          'procedureCount':len(f['procedures']),'triggerRootsByProcedure':{k:sorted(roots[k]) for k in sorted(roots)}})
        for p in f['procedures']:
            for ci,call in enumerate(p['calls']):
                a=call['literalArguments'];destkey=f'F{a[0]:03d}_{a[1]:03d}_{a[3]:02d}' if a is not None else None
                dest=fields.get(destkey);matches=[e for e in dest['entrances'] if e['entranceId']==a[2]] if dest else []
                if a is None:status='dynamic-arguments'
                elif dest is None:status='target-field-absent'
                elif not dest['sources'].get('fbn'):status='target-fbn-missing'
                elif dest.get('components',{}).get('entrances',{}).get('status')=='parse-failed':status='target-fbn-parse-failed'
                elif not matches:status='entrance-id-missing'
                elif len(matches)>1:status='entrance-id-duplicate'
                else:status='field-and-entrance-resolved'
                ts=[t for t in f['triggers'] if t['index'] in roots[p['name']]]
                report['occurrences'].append({'id':f'{key}:{p["index"]}:{ci}','sourceField':key,'procedureIndex':p['index'],'procedureName':p['name'],
                  'call':call,'scriptSource':f.get('script'),'triggerRoots':ts,'triggerReachability':'local-path-present' if ts else 'execution-unproven',
                  'sourceMapCandidates':byfield[key],'targetField':destkey,'targetMapCandidates':byfield[destkey] if destkey else [],
                  'status':status,'requestedEntranceId':a[2] if a is not None else None,'matchedEntrances':matches,
                  'arrivalProjectionCandidates':position_candidates(destkey,matches[0]['xyz']) if len(matches)==1 else [],
                  'sourceProjectionCandidates':[{'triggerIndex':t['index'],'candidates':position_candidates(key,t['position']['xyz'])} for t in ts if t.get('position')],
                  'conditionsStatus':'original-procedures-and-HTB-preserved-not-evaluated','appImportable':False})
    grouped=collections.defaultdict(list)
    for o in report['occurrences']:
        if o['targetField'] is not None:grouped[(o['sourceField'],o['targetField'],o['requestedEntranceId'])].append(o['id'])
    report['edges']=[{'sourceField':s,'targetField':t,'entranceId':e,'occurrenceIds':ids} for (s,t,e),ids in sorted(grouped.items())]
    regions={}
    for key in fields:
        params=fm.get(key,{});major=int(key[1:4])
        region=str(major);r=regions.setdefault(region,{'major':major,'names':set(),'fields':[],'outgoingOccurrences':0,'statuses':collections.Counter()})
        r['fields'].append(key)
        if params.get('group'):r['names'].add(params['group'])
    for o in report['occurrences']:
        r=regions[str(int(o['sourceField'][1:4]))];r['outgoingOccurrences']+=1;r['statuses'][o['status']]+=1
    report['regions']=[{**r,'names':sorted(r['names'])} for r in regions.values()]
    report['summary']={'fields':len(fields),'maps':len(meta['maps']),'occurrences':len(report['occurrences']),'deduplicatedLiteralEdges':len(report['edges']),
      'statuses':dict(collections.Counter(o['status'] for o in report['occurrences'])),
      'occurrencesWithTriggerPath':sum(bool(o['triggerRoots']) for o in report['occurrences']),
      'fieldsWithSingleMapCandidate':sum(len(byfield[k])==1 for k in fields),
      'fieldsWithMultipleMapCandidates':sum(len(byfield[k])>1 for k in fields),
      'fieldsWithoutMapCandidate':sum(not byfield[k] for k in fields),
      'mapImagesWithoutField':sum(not m['fields'] for m in meta['maps']),'operationalPinsGenerated':0}
    if connection_file!='mondo_connessioni_evidenze.json':
        previous=json.loads((out/'mondo-globale/inventario.json').read_text(encoding='utf-8'))
        now={o['id']:o for o in report['occurrences']};changes=[]
        for old in previous['occurrences']:
            new=now.get(old['id'])
            if new is None:raise ValueError('Lost previous occurrence: '+old['id'])
            assert old['call']==new['call'] and old['sourceField']==new['sourceField']
            if old['status']!=new['status']:changes.append({'id':old['id'],'targetField':new['targetField'],'previous':old['status'],'current':new['status']})
        report['previousComparison']={'occurrencesPreserved':len(previous['occurrences']),'newOccurrences':len(now)-len(previous['occurrences']),'statusChanges':changes}
    (target/'inventario.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    with (target/'collegamenti.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        w=csv.writer(stream);w.writerow(['campo_partenza','procedura','riga','campo_arrivo','id_ingresso','esito','trigger_origine','mappe_partenza_candidate','mappe_arrivo_candidate'])
        for o in report['occurrences']:w.writerow([o['sourceField'],o['procedureName'],o['call']['line'],o['targetField'],o['requestedEntranceId'],o['status'],','.join(str(t['index']) for t in o['triggerRoots']),';'.join(o['sourceMapCandidates']),';'.join(o['targetMapCandidates'])])
    print(json.dumps(report['summary']))

if __name__=='__main__':main(*sys.argv[1:])
