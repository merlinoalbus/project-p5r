"""Tre controlli indipendenti sulle evidenze, non sulla navigabilita."""
from scrittura import scrivi_json
from pathlib import Path
import ast
import hashlib
import json
import math
import struct
import sys
import world_connections as wc
from world_connections import blocks, hits, procedures, main


def verify(out, scripts, bf=None):
    out=Path(out)
    ast.parse(Path(__file__).with_name('world_connections.py').read_text(encoding='utf8'))
    data=json.loads((out/'mondo_connessioni_evidenze.json').read_text(encoding='utf8'))
    expected=json.loads((out/'mondo_metadati.json').read_text(encoding='utf8'))
    assert [r['field'] for r in data['fields']]==[r['id'] for r in expected['fields']]
    assert len({r['field'] for r in data['fields']})==209
    for r in data['fields']:
        for s in [*r['sources'].values(),r['script']]:
            if s: assert hashlib.sha256((out/s['file']).read_bytes()).hexdigest()==s['sha256']
        procs={p['index'] for p in r['procedures']}
        for h in r['triggers']:
            assert h['procedureIndex'] in procs or h['procedureIndex']==65535
            if r['positionAssociation']!='indice-parallelo': assert h['position'] is None
    # Rilegge ogni record direttamente dall'offset, senza il parser produttivo.
    for r in data['fields']:
        if r['sources']['htb']:
            b=(out/r['sources']['htb']['file']).read_bytes()
            for h in r['triggers']:
                p=h['offset']
                assert int.from_bytes(b[p+28:p+30],'little')==h['procedureIndex']
                assert int.from_bytes(b[p+26:p+28],'little')==h['nameId']
                assert int.from_bytes(b[p+30:p+32],'little')==h['promptType']
                assert [int.from_bytes(b[p+i:p+i+4],'little') for i in range(0,24,4)]==h['enableFlags']+h['disableFlags']
        if r['sources']['fbn']:
            b=(out/r['sources']['fbn']['file']).read_bytes()
            for p in r['triggerPositions']+r['entrances']:
                assert list(struct.unpack_from('>3f',b,p['offset']+8))==p['xyz']
                assert all(math.isfinite(v) for v in p['xyz'])
    # Casi con diramazioni, argomenti dinamici, commenti e sentinelle.
    p=procedures('// Procedure Index: 0\nvoid TEST()\n{ if (X()) { CALL_FIELD(2,3,4,1); } else { CALL_FIELD(major, f(2),3,0); } // CALL_FIELD(9,9,9,9);\n}')
    assert len(p[0]['calls'])==2 and p[0]['calls'][1]['literalArguments'] is None
    assert p[0]['calls'][0]['literalArguments']==[2,3,4,1]
    for b in (b'abc',struct.pack('>4I',5,0,999,16),struct.pack('>4I',5,0,16,16)):
        try: blocks(b)
        except ValueError: pass
        else: raise AssertionError('Input malformato accettato')
    # Determinismo, ma **fuori** dalla cartella ufficiale. Prima si rigenerava dentro `out` e si
    # confrontava dopo: se il comando riceveva una cartella sbagliata, l'artefatto completo era
    # gia' stato sostituito con uno formalmente valido e privo di prove, e l'assert scattava sulle
    # macerie. E' successo davvero, e sono andate perse 148.576 righe di evidenze. Ora si rigenera
    # in una cartella temporanea e l'originale non viene toccato nemmeno quando il controllo cade.
    import shutil
    import tempfile
    before=(out/'mondo_connessioni_evidenze.json').read_bytes()
    with tempfile.TemporaryDirectory(prefix='verifica-connessioni-') as tmp:
        prova=Path(tmp)
        shutil.copy2(out/'mondo_metadati.json',prova/'mondo_metadati.json')
        ftd='metadati_originali/IT/FIELD/FTD/FLDPLACENAME.FTD'
        (prova/ftd).parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(out/ftd,prova/ftd)
        main(prova,scripts,bf)
        rifatto=(prova/'mondo_connessioni_evidenze.json').read_bytes()
    assert before==rifatto, \
        ('la rigenerazione non riproduce l’artefatto versionato: o le cartelle indicate non sono '
         'quelle con cui e’ stato prodotto, o qualcosa e’ cambiato senza passare di qui')
    assert (out/'mondo_connessioni_evidenze.json').read_bytes()==before, \
        'la verifica ha toccato l’artefatto ufficiale: non deve mai succedere'
    # Il rapporto deve **attestare** la copertura, non solo averla controllata di sfuggita: se
    # domani le procedure crollassero a zero, il file versionato lo direbbe da solo, invece di
    # continuare a dichiarare PASS mentre l'artefatto accanto e' vuoto — che e' quel che e'
    # successo.
    report=dict(status='PASS',fields=len(data['fields']),scripts=sum(bool(r['script']) for r in data['fields']),
        triggers=sum(len(r['triggers']) for r in data['fields']),
        procedures=sum(len(r['procedures']) for r in data['fields']),
        triggerResolved=sum(1 for r in data['fields'] for t in r['triggers'] if t['procedureStatus']=='risolta'),
        minimiPretesi=dict(wc.MINIMI),
        calls=sum(len(p['calls']) for r in data['fields'] for p in r['procedures']),
        passes=['Copertura, sintassi, hash e riferimenti','Rilettura indipendente record binari','Diramazioni, input malformati e determinismo'],
        scope='Evidenze grezze; nessuna certificazione di navigabilita o associazione semantica dei POI')
    scrivi_json(out/'verifica_connessioni_evidenze.json', report)
    print(json.dumps(report))


if __name__=='__main__': verify(*sys.argv[1:4])
