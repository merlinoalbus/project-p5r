from pathlib import Path
import hashlib
src=Path('work/base-map-assets');repo=Path(r'C:\Repository\project-p5r-main')
assets=repo/'public/asset/mappe/native';assets.mkdir(parents=True,exist_ok=True)
for file in src.glob('*.png'):
 dest=assets/file.name
 if dest.exists():assert dest.read_bytes()==file.read_bytes(),f'Asset esistente diverso: {dest}'
 else:dest.write_bytes(file.read_bytes())
dest=repo/'data/seed/mappe/atlante-base.json'
assert not dest.exists() or dest.read_bytes()==(src/'atlante-base.json').read_bytes(),'Pacchetto base esistente diverso'
dest.write_bytes((src/'atlante-base.json').read_bytes())
print('Installate 301 immagini originali e atlante-base.json nel pacchetto base del repository')
