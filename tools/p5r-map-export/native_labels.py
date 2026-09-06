"""Etichette native delle interazioni, con riferimenti ai byte originali."""
from scrittura import scrivi_json
from pathlib import Path
import json
import struct
from extract_maps import Archive, GAME, sha
from world_metadata import ftd_blocks

CHARSET_SOURCE='https://github.com/tge-was-taken/Atlus-Script-Tools/blob/master/Source/AtlusScriptLibrary/Common/Text/Encodings/AtlusEncoding.cs'
PROMPTS={**{i:'FLDCHECKNAME' for i in (*range(7),12)},**{i:'FLDACTIONNAME' for i in (7,8,9)},10:'FLDNPCNAME',11:'FLDPLACENAME',13:'FLDKFECHECKNAME'}


class Decoder:
    def __init__(self, path):
        self.table=[]
        for line in Path(path).read_text(encoding='utf-8-sig').splitlines():
            for c in line.split('\t'):
                self.table.append(chr(int(c[2:],16)) if c.startswith('\\u') else c)

    def decode(self, raw):
        raw=raw.split(b'\0',1)[0];pos=0;result=[];unknown=[]
        while pos<len(raw):
            begin=pos;first=raw[pos];pos+=1
            if first<128: index=first
            elif pos<len(raw):
                # Formula del decoder Atlus: tavole da128glifi e scarto0x60.
                index=(first&127)*128+raw[pos]-96 if raw[pos]>=128 else -1;pos+=1
            else: index=-1
            if index<0 or index>=len(self.table) or not self.table[index]:
                unknown.append(begin);result.append('['+raw[begin:pos].hex()+']')
            else: result.append(self.table[index])
        return ''.join(result).strip(),unknown


def strings(data, decoder):
    mode,blocks=ftd_blocks(data)
    if mode!=1: raise ValueError('FTD stringhe con modo inatteso')
    result=[]
    for off,b in blocks:
        size,flags=struct.unpack_from('<HH',b)
        n=size&255
        if flags or size>>8!=1 or n>len(b)-4: raise ValueError('Record stringa non valido')
        raw=b[4:4+n];label,unknown=decoder.decode(raw)
        status='codifica-irrisolta' if unknown else 'vuoto' if not label else 'null' if label=='NULL' else 'valido'
        result.append(dict(index=len(result),offset=off+4,rawHex=raw.hex(),text=label,status=status,unknownOffsets=unknown))
    return result


def main(out,charset,cpk=GAME):
    out=Path(out);charset=Path(charset);decoder=Decoder(charset)
    arc=Archive(Path(cpk)/'IT.CPK');tables={};sources={}
    try:
        for name in sorted(set(PROMPTS.values())|{'FLDDNGCHECKNAME','FLDSAVEDATAPLACE'}):
            path=f'FIELD/FTD/{name}.FTD';entry=next(e for e in arc.entries if e['path']==path)
            b=arc.read(entry);target=out/'etichette_originali/IT'/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
            sources[name]=dict(archive='IT',path=path,file=target.relative_to(out).as_posix(),sha256=sha(b))
            if name!='FLDSAVEDATAPLACE': tables[name]=strings(b,decoder)
            else:
                mode,parts=ftd_blocks(b)
                if mode!=0 or len(parts)!=1:raise ValueError('Tabella salvataggi inattesa')
                off,body=parts[0];zero,size,count,flag=struct.unpack_from('>4I',body)
                if zero or flag or size!=count*52 or size+16!=len(body):raise ValueError('Record salvataggi inattesi')
                rows=[]
                for i in range(count):
                    p=16+i*52;label,unknown=decoder.decode(body[p+4:p+52])
                    rows.append(dict(index=i,offset=off+p,identifiersRawHex=body[p:p+4].hex(),rawTextHex=body[p+4:p+52].hex(),text=label,unknownOffsets=unknown,encodingStatus='da-verificare' if unknown else 'compatibile'))
                tables[name]=rows
    finally:arc.f.close()
    evidence=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf8'))
    rows=[]
    for field in evidence['fields']:
        for hit in field['triggers']:
            table=PROMPTS.get(hit['promptType']);index=hit['nameId'];entry=None
            status='tipo-non-risolto' if table is None else 'indice-fuori-intervallo'
            if table is not None and index<len(tables[table]):entry=tables[table][index];status=entry['status']
            rows.append(dict(field=field['field'],trigger=hit['index'],triggerOffset=hit['offset'],
                promptType=hit['promptType'],nameId=index,table=table,status=status,
                label=entry,source=sources.get(table),hitSource=field['sources']['htb']))
    result=dict(schemaVersion=1,sources=sources,tables=tables,interactions=rows,
        charset=dict(file='tool/P5R_EFIGS.tsv',sha256=sha(charset.read_bytes()),algorithmSource=CHARSET_SOURCE),
        limits=['Prompt14 non associato a FLDDNGCHECKNAME senza prova specifica.',
            'I byte identificativi dei salvataggi sono evidenze autonome, non associazioni confermate.',
            'Nessuna coordinata o destinazione navigabile aggiunta.'])
    scrivi_json(out/'mondo_etichette.json', result)
    print('INTERAZIONI',len(rows),'ETICHETTATE',sum(r['status']=='valido' for r in rows))
    return result


if __name__=='__main__':
    import sys
    main(sys.argv[1],Path(__file__).with_name('P5R_EFIGS.tsv'))
