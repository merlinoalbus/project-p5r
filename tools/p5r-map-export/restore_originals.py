"""Ripristina gli originali estratti verificando ogni hash, senza sovrascrivere file diversi."""
from pathlib import Path
import hashlib,json,zipfile,tempfile,shutil
repo=Path(__file__).resolve().parents[2]
folder=repo/'data/atlas/original-archives';out=repo/'data/atlas/extracted'
m=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
with tempfile.TemporaryFile() as archive:
 digest=hashlib.sha256()
 for part in m['parts']:
  raw=(folder/part['file']).read_bytes()
  assert len(raw)==part['size'] and hashlib.sha256(raw).hexdigest()==part['sha256'],part['file']
  digest.update(raw);archive.write(raw)
 assert digest.hexdigest()==m['archiveSha256']
 archive.seek(0)
 with zipfile.ZipFile(archive) as z:
  assert set(z.namelist())=={f['path'] for f in m['files']}
  for entry in m['files']:
   target=(out/entry['path']).resolve()
   assert target.is_relative_to(out.resolve()),entry['path']
   raw=z.read(entry['path']);assert len(raw)==entry['size'] and hashlib.sha256(raw).hexdigest()==entry['sha256']
   if target.exists():assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256'],str(target)
   else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
print('Originali ripristinati e verificati:',len(m['files']))
