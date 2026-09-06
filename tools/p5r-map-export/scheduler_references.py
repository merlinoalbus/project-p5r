"""Bank-aware flag/counter census; preserves complete procedure context."""
from scrittura import scrivi_json
import ast,hashlib,json,re,sys
from pathlib import Path

def integer(s):
    def read(n):
        if isinstance(n,ast.Constant) and type(n.value) is int:return n.value
        if isinstance(n,ast.BinOp) and isinstance(n.op,ast.Add):return read(n.left)+read(n.right)
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return -read(n.operand)
        raise ValueError()
    try:return read(ast.parse(s.strip(),mode='eval').body)
    except (SyntaxError,ValueError):return None

def main(out):
    out=Path(out);root=out/'scheduler';manifest=json.loads((root/'decompilazione.json').read_text(encoding='utf-8'))
    result={'scope':{'flags':[96,102,1087],'counter':16},'compiler':manifest['compiler'],'files':[],
      'limits':['Addresses preserve bank bits: 0x10000000+96 is not flag96.','Full procedure context is retained; caller presence does not prove execution.','No date is inferred from filename or procedure name.']}
    for entry in manifest['results']:
        if not entry['success']:continue
        raw=(out/entry['flow']).read_bytes();assert hashlib.sha256(raw).hexdigest()==entry['flowSha256']
        source=raw.decode('utf-8-sig').replace('\r\n','\n');starts=list(re.finditer(r'// Procedure Index: (\d+)\s+\w+\s+(\w+)\([^\n]*\)\s*\{',source))
        rows=[];references=[]
        for i,m in enumerate(starts):
            end=starts[i+1].start() if i+1<len(starts) else len(source);begin=m.end()-1;body=source[begin:end]
            masked=re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"',lambda v:' '*len(v[0]),body)
            names=sorted(set(re.findall(r'\b([A-Za-z_]\w*)\s*\(',masked))-{'if','for','while','switch'})
            occurrences=[]
            for call in re.finditer(r'\b(BIT_CHK|BIT_ON|BIT_OFF|GET_COUNT|SET_COUNT)\s*\(',masked):
                cursor=call.end();depth=1;split=cursor;args=[]
                while cursor<len(masked) and depth:
                    ch=masked[cursor]
                    if ch=='(':depth+=1
                    elif ch==')':depth-=1
                    elif ch==',' and depth==1:args.append(body[split:cursor].strip());split=cursor+1
                    if depth:cursor+=1
                assert depth==0
                args.append(body[split:cursor].strip());address=integer(args[0]);kind='flag' if call[1].startswith('BIT_') else 'counter'
                relevant=address in ([96,102,1087] if kind=='flag' else [16])
                if not relevant and address is not None:continue
                item={'function':call[1],'kind':kind,'access':'read' if call[1] in ['BIT_CHK','GET_COUNT'] else 'write',
                  'arguments':args,'address':address,'addressStatus':'literal' if address is not None else 'dynamic-unresolved',
                  'value':integer(args[1]) if len(args)>1 else None,'line':source[:begin+call.start()].count('\n')+1,
                  'procedure':m[2],'procedureIndex':int(m[1])}
                occurrences.append(item);references.append(item)
            rows.append({'name':m[2],'index':int(m[1]),'line':source[:m.start()].count('\n')+1,'calls':names,'body':body,'references':occurrences})
        definitions={r['name'] for r in rows}
        for row in rows:
            row['localCalls']=[c for c in row['calls'] if c in definitions]
            row['externalCalls']=[c for c in row['calls'] if c not in definitions]
            row['directCallers']=[r['name'] for r in rows if row['name'] in r['calls']]
        result['files'].append({'source':entry,'procedures':rows,'references':references})
    result['summary']={'files':len(result['files']),'reads':sum(r['access']=='read' for f in result['files'] for r in f['references']),
      'writes':sum(r['access']=='write' for f in result['files'] for r in f['references']),'dynamicAddresses':sum(r['address'] is None for f in result['files'] for r in f['references'])}
    scrivi_json(root/'riferimenti.json', result);print(json.dumps(result['summary']))

if __name__=='__main__':main(sys.argv[1])
