"""Import and audit native maps in the explicitly isolated atlas runtime."""
import base64
import hashlib
import json
from pathlib import Path
import sqlite3
import urllib.request
from urllib.parse import quote

BASE = 'http://localhost:3103'
ROOT = Path(__file__).resolve().parent
DB = ROOT / 'runtime-atlante/project-p5r.db'
OUT = ROOT.parent / 'outputs/mappe-p5r/app-integration'


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as response:
        result = json.load(response)
    return result.get('data', result)


def main():
    package = json.loads((OUT/'planimetrie-native.json').read_text(encoding='utf-8'))
    evidence = json.loads((OUT/'evidenze.json').read_text(encoding='utf-8'))
    db = sqlite3.connect(DB.as_uri() + '?mode=ro', uri=True)
    existing = dict(db.execute('SELECT chiave,genitore_chiave FROM mappa'))
    assert not set(existing).intersection(m['chiave'] for m in package['mappe']), 'Already imported; do not overwrite'
    assert set(evidence['requiredParents']) <= set(existing), 'Missing required parent'
    backup_path = ROOT/'runtime-atlante/pre-native-staging-after-restart.db'
    if backup_path.exists():
        with sqlite3.connect(backup_path.as_uri() + '?mode=ro', uri=True) as backup:
            assert list(db.iterdump()) == list(backup.iterdump()), 'Database changed since backup; inspect before retry'
    else:
        with sqlite3.connect(backup_path) as backup:
            db.backup(backup)
    db.close()
    before = get('/api/mappe/albero')
    request = urllib.request.Request(BASE+'/api/mappe/importa',
        data=json.dumps({'pacchetto': package, 'sovrascrivi': False}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=180) as response:
        result = json.load(response)
    result = result.get('data', result)
    (OUT/'esito-importazione-isolata.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    assert result['mappe'] == len(package['mappe']) and result['immagini'] == 301
    assert result['saltate'] == [] and result['condizioniScartate'] == 0 and result['spilli'] == 0
    tree = get('/api/mappe/albero')
    by_key = {m['chiave']: m for m in tree}
    assert len(by_key) == len(tree) == len(before) + len(package['mappe'])
    for original in before:
        assert by_key[original['chiave']]['genitore'] == original['genitore']
        assert by_key[original['chiave']]['numeroSpilli'] == original['numeroSpilli']
    for m in tree:
        seen = set()
        while m:
            assert m['chiave'] not in seen
            seen.add(m['chiave'])
            assert m['genitore'] is None or m['genitore'] in by_key
            m = by_key.get(m['genitore'])
    verified = []
    for item in evidence['maps']:
        detail = get('/api/mappe/'+quote(item['key'], safe=''))
        assert (detail['larghezza'], detail['altezza']) == (item['width'], item['height'])
        assert detail['spilli'] == []
        url = detail['immagineUrl']
        assert url.startswith('/api/'), url
        with urllib.request.urlopen(BASE+url, timeout=60) as response:
            content = response.read()
        assert hashlib.sha256(content).hexdigest() == item['imageSha256']
        verified.append({'nativeKey': item['key'], 'publicKey': detail['chiave'], 'imageUrl': url})
    report = dict(result='PASS', imported=result, preservedExistingMaps=len(before),
                  allImagesRetrieved=len(verified), maps=verified)
    (OUT/'verifica-importazione-isolata.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k != 'maps'}))


if __name__ == '__main__':
    main()
