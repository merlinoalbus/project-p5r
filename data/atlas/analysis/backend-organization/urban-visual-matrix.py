from PIL import Image
import numpy as np,json,hashlib
from pathlib import Path
root=Path('work/base-map-assets');names=['002-0-0','002-0-1','002-0-2','002-6-0','002-8-0','001-2-0','001-2-1']; arr={};out={'images':{},'schoolComparisons':[]}
for n in names:
 p=root/f'nativo-rmap-{n}.png';im=Image.open(p).convert('RGBA');a=np.array(im);arr[n]=a;out['images'][n]={'size':im.size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'alphaRange':[int(a[:,:,3].min()),int(a[:,:,3].max())]}
for q in ['002-6-0','002-8-0']:
 for b in ['002-0-0','002-0-1','002-0-2']:
  a=arr[q];t=arr[b]; mask=(a[:,:,3]>0)&(np.min(a[:,:,:3],axis=2)<128);other=(t[:,:,3]>0)&(np.min(t[:,:,:3],axis=2)<128)
  out['schoolComparisons'].append({'query':q,'base':b,'sameCanvas':a.shape==t.shape,'queryForegroundPixels':int(mask.sum()),'foregroundWithinBaseRatio':float((mask&other).sum()/mask.sum()),'foregroundJaccard':float((mask&other).sum()/(mask|other).sum())})
Path('work/backend-organization/urban-visual-matrix.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
