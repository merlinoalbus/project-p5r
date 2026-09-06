"""Verifica copertura, provenienza, byte delle etichette e riproducibilita."""
from pathlib import Path
import ast
import collections
import json
import sys
from extract_maps import sha
from native_labels import Decoder, main, strings


def verify(out):
    out=Path(out);code=Path(__file__).with_name('native_labels.py');charset=code.with_name('P5R_EFIGS.tsv')
    ast.parse(code.read_text(encoding='utf8'))
    d=json.loads((out/'mondo_etichette.json').read_text(encoding='utf8'))
    base=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf8'))
    originals={(f['field'],t['index']):t for f in base['fields'] for t in f['triggers']}
    assert len(originals)==len(d['interactions'])==4525
    assert {(r['field'],r['trigger']) for r in d['interactions']}==set(originals)
    assert sha(charset.read_bytes())==d['charset']['sha256']
    for s in d['sources'].values():assert sha((out/s['file']).read_bytes())==s['sha256']
    # Rilegge indipendentemente offset e dimensioni FTD e ogni payload di stringa.
    for name,rows in d['tables'].items():
        b=(out/d['sources'][name]['file']).read_bytes()
        if name=='FLDSAVEDATAPLACE':
            for row in rows:
                p=row['offset'];assert b[p:p+4].hex()==row['identifiersRawHex'];assert b[p+4:p+52].hex()==row['rawTextHex']
            continue
        assert int.from_bytes(b[14:16],'big')==len(rows)
        for row in rows:
            p=int.from_bytes(b[16+row['index']*4:20+row['index']*4],'big')
            assert p+4==row['offset'];n=b[p]
            assert b[p+4:p+4+n].hex()==row['rawHex']
    for r in d['interactions']:
        original=originals[r['field'],r['trigger']]
        assert r['nameId']==original['nameId'] and r['promptType']==original['promptType']
        if r['promptType']==14:assert r['status']=='tipo-non-risolto' and r['label'] is None
        if r['label']:assert r['label']==d['tables'][r['table']][r['nameId']]
        if r['promptType']==11 and original['label'] is not None:
            assert r['label']['text']==original['label'],(r['field'],original['label'],r['label']['text'])
    decoder=Decoder(charset)
    assert decoder.decode(bytes.fromhex('63616666849d'))==('caffè',[])
    assert decoder.decode(bytes.fromhex('8495849e84a7'))==('àéò',[])
    assert decoder.decode(b'\x84')[1]==[0] and decoder.decode(b'\x84\x01')[1]==[0]
    for b in (b'',b'badFTD'):
        try:strings(b,decoder)
        except ValueError:pass
        else:raise AssertionError('FTD malformata accettata')
    before=(out/'mondo_etichette.json').read_bytes();main(out,charset)
    assert before==(out/'mondo_etichette.json').read_bytes()
    report=dict(status='PASS',interactions=4525,statuses=dict(collections.Counter(r['status'] for r in d['interactions'])),
        passes=['Sintassi, copertura, riferimenti e hash','Rilettura indipendente offset e payload, regressione GO','Codifica, input malformati e determinismo'],
        scope='Etichette native; nessuna nuova associazione navigabile certificata')
    (out/'verifica_etichette.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))


if __name__=='__main__':verify(sys.argv[1])
