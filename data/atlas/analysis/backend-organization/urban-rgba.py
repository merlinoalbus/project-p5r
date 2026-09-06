from PIL import Image
import numpy as np,json
from pathlib import Path
p=Path('work/backend-organization/urban-visual-matrix.json');j=json.loads(p.read_text());out=[]
for a,b in [('002-6-0','002-0-1'),('002-8-0','002-0-2'),('001-2-1','001-2-0')]:
 x=np.array(Image.open(f'work/base-map-assets/nativo-rmap-{a}.png').convert('RGBA'));y=np.array(Image.open(f'work/base-map-assets/nativo-rmap-{b}.png').convert('RGBA'));ax=x[:,:,3]>0;ay=y[:,:,3]>0;union=ax|ay
 out.append({'a':a,'b':b,'visibleSupportJaccard':float((ax&ay).sum()/union.sum()),'visibleSupportXorPixels':int((ax^ay).sum()),'rgbaDifferentVisiblePixels':int((np.any(x!=y,axis=2)&union).sum()),'visibleUnionPixels':int(union.sum()),'alphaDifferentPixels':int((x[:,:,3]!=y[:,:,3]).sum())})
j['pairedRGBA']=out;p.write_text(json.dumps(j,indent=2));print(json.dumps(out,indent=2))
