"""Estrae evidenze delle destinazioni; non certifica percorsi pedonali."""
from pathlib import Path
from scrittura import scrivi_json
import argparse
import json
import math
import re
import struct
from extract_maps import Archive, GAME, sha
from world_metadata import title_table


def blocks(data):
    """Blocchi FBN/HTB con dimensioni comprensive dell'intestazione."""
    pos = 0
    result = []
    while pos < len(data):
        if len(data)-pos < 16:
            raise ValueError('Intestazione troncata')
        kind, version, size, offset = struct.unpack_from('>4I', data, pos)
        if size < 16 or pos+size > len(data) or offset not in (0,16):
            raise ValueError('Dimensione/offset blocco non valido')
        if offset:
            if size < 32:
                raise ValueError('Lista troncata')
            count, a, b, c = struct.unpack_from('>4I', data, pos+16)
            if a or b or c:
                raise ValueError('Intestazione lista sconosciuta')
            result.append((kind, pos+32, count, data[pos+32:pos+size]))
        pos += size
    return result


def positions(data, kind, stride):
    result = []
    for typ, offset, count, body in blocks(data):
        if typ != kind:
            continue
        if len(body) != count*stride:
            raise ValueError('Dimensione record FBN inattesa')
        for i in range(count):
            xyz = struct.unpack_from('>3f', body, i*stride+8)
            if not all(math.isfinite(x) for x in xyz):
                raise ValueError('Coordinate non finite')
            row = dict(index=i, offset=offset+i*stride, xyz=list(xyz))
            if kind == 4:
                row['entranceId'] = struct.unpack_from('>h',body,i*stride+32)[0]
            result.append(row)
    return result


def hits(data):
    result = []
    for kind, offset, count, body in blocks(data):
        if kind != 5:
            raise ValueError('HTB con tipo inatteso')
        # Alcuni archivi includono allineamento zero al termine della lista.
        if len(body) < count*60 or any(body[count*60:]):
            raise ValueError('Dimensione record HTB inattesa')
        for i in range(count):
            p = i*60
            flags = struct.unpack_from('<6I', body, p)
            name, proc, prompt = struct.unpack_from('<3H', body, p+26)
            result.append(dict(index=i,offset=offset+p,enableFlags=list(flags[:3]),
                disableFlags=list(flags[3:]),hitType=body[p+25],nameId=name,
                procedureIndex=proc,promptType=prompt))
    return result


def procedures(source):
    """Mantiene ogni corpo completo, incluse diramazioni e chiamate indirette."""
    starts = list(re.finditer(r'// Procedure Index: (\d+)\s+\w+\s+(\w+)\([^\n]*\)\s*\{', source))
    result = {}
    for i, m in enumerate(starts):
        end = starts[i+1].start() if i+1<len(starts) else len(source)
        body = source[m.end()-1:end].strip()
        # Rimuove commenti e stringhe soltanto per riconoscere chiamate reali.
        masked = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"',lambda x:' '*(len(x[0])),body)
        calls = []
        for call in re.finditer(r'\bCALL_FIELD\s*\(', masked):
            cursor=call.end(); depth=1
            while cursor<len(masked) and depth:
                depth += (masked[cursor]=='(')-(masked[cursor]==')')
                cursor += 1
            if depth:
                raise ValueError('Chiamata troncata')
            args=body[call.end():cursor-1].strip()
            literal = re.fullmatch(r'\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*',args)
            values=list(map(int,literal.groups())) if literal else None
            calls.append(dict(arguments=args,literalArguments=values,
                line=source[:m.end()-1+call.start()].count('\n')+1,
                status='destinazione-nel-codice' if values else 'argomenti-da-risolvere'))
        key=int(m[1])
        if key in result: raise ValueError('Indice procedura duplicato')
        result[key]=dict(index=key,name=m[2],line=source[:m.start()].count('\n')+1,body=body,calls=calls)
    return result


# Il corpus di partenza e' fisso: gli stessi CPK, gli stessi 227 script. Un'estrazione che
# scende sotto questi valori non ha trovato meno cose, ha guardato nel posto sbagliato — ed e'
# esattamente cosi' che l'artefatto e' stato una volta sostituito con uno formalmente valido ma
# vuoto di prove. Sono un pavimento, non un traguardo: se un giorno le fonti crescono, si alzano.
MINIMI = dict(campi=209, conScript=192, procedure=15734, chiamate=2514, triggerRisolti=4495)


def controlla_minimi(righe):
    """Rifiuta un'estrazione piu' povera di quella gia' misurata, prima di scrivere."""
    misurato = dict(
        campi=len(righe),
        conScript=sum(1 for r in righe if r['script']),
        procedure=sum(len(r['procedures']) for r in righe),
        # `calls` raccoglie gia' le sole CALL_FIELD: sono le destinazioni citate nel codice
        chiamate=sum(len(p['calls']) for r in righe for p in r['procedures']),
        triggerRisolti=sum(1 for r in righe for t in r['triggers'] if t['procedureStatus'] == 'risolta'))
    scarsi = {k: (v, MINIMI[k]) for k, v in misurato.items() if v < MINIMI[k]}
    if scarsi:
        raise ValueError(
            'estrazione piu’ povera del corpus noto, non viene scritta: '
            + ', '.join(f'{k} {v} invece di almeno {atteso}' for k, (v, atteso) in scarsi.items())
            + '. Di solito vuol dire che --scripts o --bf indicano una cartella sbagliata.')
    return misurato


def main(out, scripts, bf=None, cpk=GAME):
    """Le fonti sono tre e vanno dette tutte e tre.

    `out` porta i metadati e riceve l'artefatto; `scripts` e' la cartella dei `.flow`
    decompilati; `bf` quella dei `FHIT_<campo>.BF` originali, che serve a provare che ogni
    `.flow` viene proprio dai byte estratti dal CPK. Prima le ultime due erano lo stesso
    argomento, e siccome i `.BF` non stavano nella cartella degli script il confronto non
    avveniva mai: l'estrazione riusciva lo stesso e produceva un file senza prove.
    """
    out, scripts=Path(out),Path(scripts)
    bf_dir=Path(bf) if bf else scripts
    metadata=json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    titles=title_table((out/'metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD').read_bytes())
    sources={}; resources={}
    wanted=set()
    for f in metadata['fields']:
        key=f'{f["major"]:03d}_{f["minor"]:03d}_{f["sub"]:02d}'
        wanted.update((f'FIELD/DATA/F{key}.FBN',f'FIELD/HIT/F{key}.HTB',f'FIELD/HIT/FHIT_{key}.BF'))
    for archive in ('BASE','IT'):
        a=Archive(Path(cpk)/(archive+'.CPK'))
        try:
            for e in a.entries:
                if e['path'] not in wanted: continue
                b=a.read(e); dest=out/'connessioni_originali'/archive/e['path']
                dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
                resources[e['path']]=b
                sources[e['path']]=dict(archive=archive,path=e['path'],file=dest.relative_to(out).as_posix(),sha256=sha(b))
        finally: a.f.close()
    rows=[]
    for f in metadata['fields']:
        key=f'{f["major"]:03d}_{f["minor"]:03d}_{f["sub"]:02d}'
        paths=dict(fbn=f'FIELD/DATA/F{key}.FBN',htb=f'FIELD/HIT/F{key}.HTB',bf=f'FIELD/HIT/FHIT_{key}.BF')
        row=dict(field=f['id'],sources={k:sources.get(v) for k,v in paths.items()},triggers=[],entrances=[],procedures=[])
        fb=resources.get(paths['fbn']);hb=resources.get(paths['htb']);bf=resources.get(paths['bf'])
        pos=positions(fb,1,100) if fb else []
        row['triggerPositions']=pos
        row['entrances']=positions(fb,4,36) if fb else []
        flow=scripts/(key+'.flow');procs={}
        if bf and flow.exists():
            gemello=bf_dir/f'FHIT_{key}.BF'
            if not gemello.is_file():
                raise ValueError(
                    f'lo script {key} e’ decompilato ma manca il suo {gemello.name} in {bf_dir}: '
                    'senza l’originale non si puo’ provare che il .flow venga da questi byte')
            if gemello.read_bytes()!=bf:
                raise ValueError('Script decodificato da sorgente diversa: '+key)
            raw=flow.read_bytes();procs=procedures(raw.decode('utf-8-sig'))
            dest=out/'connessioni_script'/(key+'.flow');dest.parent.mkdir(exist_ok=True);dest.write_bytes(raw)
            row['script']=dict(file=dest.relative_to(out).as_posix(),sha256=sha(raw))
        else: row['script']=None
        hit_rows=hits(hb) if hb else []
        row['positionAssociation']='indice-parallelo' if len(pos)==len(hit_rows) else 'conteggi-diversi-da-verificare'
        for h in hit_rows:
            h['position']=pos[h['index']] if len(pos)==len(hit_rows) else None
            h['label']=titles[h['nameId']]['title'] if h['promptType']==11 and h['nameId']<len(titles) else None
            h['procedureResolved']=h['procedureIndex'] in procs
            h['procedureStatus']='sentinella-65535' if h['procedureIndex']==65535 else ('risolta' if h['procedureResolved'] else 'mancante')
            row['triggers'].append(h)
        row['procedures']=list(procs.values())
        row['triggerCountFbn']=len(pos)
        rows.append(row)
    result=dict(schemaVersion=1,fields=rows,limits=[
        'Le chiamate sono evidenze nel codice, non collegamenti navigabili certificati.',
        'I corpi delle procedure conservano condizioni e chiamate indirette ancora da interpretare.',
        'Le coordinate XYZ non sono coordinate della planimetria.',
        'Le etichette prompt diverse da GO restano identificate dalla tabella e dall indice nativi.'])
    misurato=controlla_minimi(rows)
    scrivi_json(out/'mondo_connessioni_evidenze.json', result)
    print('CAMPI',len(rows),'HTB',sum(bool(r['sources']['htb']) for r in rows),'SCRIPT',sum(bool(r['script']) for r in rows),
        'CHIAMATE',sum(len(p['calls']) for r in rows for p in r['procedures']),
        'CALL_FIELD',misurato['chiamate'],'TRIGGER_RISOLTI',misurato['triggerRisolti'])
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('out')
    p.add_argument('--scripts',required=True,help='cartella dei .flow decompilati')
    p.add_argument('--bf',required=True,help='cartella dei FHIT_<campo>.BF originali')
    p.add_argument('--cpk',default=str(GAME))
    a=p.parse_args();main(a.out,a.scripts,a.bf,a.cpk)
