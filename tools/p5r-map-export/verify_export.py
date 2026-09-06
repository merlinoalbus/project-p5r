"""Three full verification passes, including independent LZ and BC decoding."""
from scrittura import scrivi_json
from pathlib import Path
import ast
import collections
import hashlib
import json
import struct
import numpy as np
from PIL import Image
from extract_maps import Archive, selected, sha


def reference_unpack(raw,attr,expected):
    # Independent transform expression and forward history representation.
    if attr=='CRI_CFATTR:ENCRYPT' and len(raw)>2080:
        raw=raw[:32]+bytes(a^b for a,b in zip(raw[32:1056],raw[1056:2080]))+raw[1056:]
    if not raw.startswith(b'CRILAYLA'):
        if len(raw)!=expected:
            raise ValueError('Reference raw size mismatch')
        return raw
    body,compressed=struct.unpack_from('<II',raw,8)
    if body+256!=expected or compressed+272!=len(raw):
        raise ValueError('Reference CRILAYLA lengths mismatch')
    stream=''.join(format(x,'08b') for x in raw[16:16+compressed][::-1])
    cursor=0

    def read(n):
        nonlocal cursor
        if cursor+n>len(stream):
            raise ValueError('Reference underflow')
        r=int(stream[cursor:cursor+n],2)
        cursor+=n
        return r

    history=bytearray()
    while len(history)<body:
        if read(1)==0:
            history.append(read(8))
            continue
        distance=read(13)+3
        length=3
        levels=iter((2,3,5))
        for size in levels:
            value=read(size);length+=value
            if value<(1<<size)-1:
                break
        else:
            while True:
                value=read(8);length+=value
                if value<255:
                    break
        if distance>len(history) or len(history)+length>body:
            raise ValueError('Reference invalid match')
        cycle=history[-distance:]
        history.extend((cycle*((length+distance-1)//distance))[:length])
    return raw[16+compressed:]+history[::-1]


def bc_pixels(dds):
    h,w=struct.unpack_from('<II',dds,12)
    cc=dds[84:88]
    if cc not in (b'DXT1',b'DXT3',b'DXT5'):
        raise ValueError(f'Independent BC decoder missing format {cc!r}')
    bw,bh=(w+3)//4,(h+3)//4
    size=8 if cc==b'DXT1' else 16
    b=np.frombuffer(dds[128:128+bw*bh*size],dtype=np.uint8).reshape(-1,size).astype(np.uint64)
    color=b[:,0:8] if size==8 else b[:,8:16]
    c0=color[:,0]+256*color[:,1];c1=color[:,2]+256*color[:,3]
    palette=np.zeros((len(b),4,4),dtype=np.uint64)
    for i,c in enumerate((c0,c1)):
        # Expand RGB565 by bit replication, as used by the independent DDS spec.
        r=(c>>11)&31;g=(c>>5)&63;blue=c&31
        palette[:,i,0]=(r<<3)|(r>>2);palette[:,i,1]=(g<<2)|(g>>4);palette[:,i,2]=(blue<<3)|(blue>>2)
        palette[:,i,3]=255
    palette[:,2,:3]=(2*palette[:,0,:3]+palette[:,1,:3])//3
    palette[:,3,:3]=(palette[:,0,:3]+2*palette[:,1,:3])//3
    palette[:,2:,3]=255
    if cc==b'DXT1':
        short=c0<=c1
        palette[short,2,:3]=(palette[short,0,:3]+palette[short,1,:3])//2
        palette[short,3,:]=0
    indices=sum(color[:,4+i]<<(8*i) for i in range(4))
    idx=((indices[:,None]>>(2*np.arange(16,dtype=np.uint64)))&3).astype(np.int64)
    result=palette[np.arange(len(b))[:,None],idx]
    if cc==b'DXT5':
        ap=np.zeros((len(b),8),dtype=np.uint64);ap[:,:2]=b[:,:2]
        greater=b[:,0]>b[:,1]
        for k in range(2,8):
            ap[greater,k]=((8-k)*b[greater,0]+(k-1)*b[greater,1])//7
        for k in range(2,6):
            ap[~greater,k]=((6-k)*b[~greater,0]+(k-1)*b[~greater,1])//5
        ap[~greater,6]=0;ap[~greater,7]=255
        bits=sum(b[:,2+i]<<(8*i) for i in range(6))
        ai=((bits[:,None]>>(3*np.arange(16,dtype=np.uint64)))&7).astype(np.int64)
        result[:,:,3]=ap[np.arange(len(b))[:,None],ai]
    if cc==b'DXT3':
        bits=sum(b[:,i]<<(8*i) for i in range(8))
        result[:,:,3]=((bits[:,None]>>(4*np.arange(16,dtype=np.uint64)))&15)*17
    return result.reshape(bh,bw,4,4,4).transpose(0,2,1,3,4).reshape(bh*4,bw*4,4)[:h,:w].astype(np.uint8)


def main(out,game):
    out,game=Path(out),Path(game)
    m=json.loads((out/'manifest.json').read_text(encoding='utf8'))
    report={'passes':[]}
    for p in Path(__file__).parent.glob('*.py'):
        ast.parse(p.read_text(encoding='utf8'),filename=str(p))
    archives={x['archive']:Archive(game/x['archive']) for x in m['inventories']}
    expected={(name,e['path']) for name,a in archives.items() for e in a.entries if selected(e['path'])}
    actual={(x['archive'],x['path']) for x in m['sources']}
    assert expected==actual,(expected-actual,actual-expected)
    for x in m['sources']:
        data=(out/x['file']).read_bytes()
        assert len(data)==x['extracted_size'] and sha(data)==x['sha256'],x['path']
    for x in m['images']:
        im=Image.open(out/x['file']).convert('RGBA')
        assert im.size==(x['width'],x['height']) and sha(im.tobytes())==x['pixel_sha256'],x['file']
    assert not m['errors']
    report['passes'].append(dict(pass_number=1,status='PASS',source_count=len(actual),image_count=len(m['images']),checks='all archive indexes, exact selection coverage, file bounds, source hashes, PNG dimensions and pixel hashes, syntax'))
    print('PASS1',len(actual),'sources',len(m['images']),'images',flush=True)
    lookup={name:{e['path']:e for e in a.entries} for name,a in archives.items()}
    compared={};maxdiff=0;formats=collections.Counter()
    for i,x in enumerate(m['sources']):
        a=archives[x['archive']];e=lookup[x['archive']][x['path']]
        raw=a.raw(e);key=(sha(raw),e['attr'],e['extracted_size'])
        if key not in compared:
            ref=reference_unpack(raw,e['attr'],e['extracted_size'])
            compared[key]=sha(ref)
        assert compared[key]==x['sha256'],x['path']
        if (i+1)%200==0:
            print('Reference LZ',i+1,'/',len(m['sources']),flush=True)
    for i,x in enumerate(m['images']):
        source=(out/x['source_file']).read_bytes()
        data=source[x['dds_offset']:x['dds_offset']+x['dds_length']]
        ref=bc_pixels(data)
        observed=np.asarray(Image.open(out/x['file']).convert('RGBA'))
        diff=np.abs(ref.astype(np.int16)-observed.astype(np.int16))
        value=int(diff.max());maxdiff=max(maxdiff,value)
        # Different RGB565 endpoint expansion conventions may differ by 1 unit.
        assert value<=1,(x['file'],value)
        formats[x['format']]+=1
        if (i+1)%100==0:
            print('Reference BC',i+1,'/',len(m['images']),flush=True)
    report['passes'].append(dict(pass_number=2,status='PASS',independent_lz_unique=len(compared),independent_lz_sources=len(m['sources']),independent_bc_images=len(m['images']),maximum_channel_difference=maxdiff,formats=dict(formats)))
    r=json.loads((out/'mappe_indice.json').read_text(encoding='utf8'))
    all_roadmaps={Path(x['source']).stem for x in m['images'] if '/ROADMAP/' in x['source']}
    assert all_roadmaps=={x['code'] for x in r['maps'] if x['code'].startswith('RMAP_')}|{x['code'] for x in r['excluded']}
    assert {Path(x['source']).stem for x in m['images'] if '/LMAP/MAP_L_' in x['source']}=={x['code'] for x in r['maps'] if x['code'].startswith('MAP_L_')}
    for x in r['maps']:
        original=Image.open(out/x['original']).convert('RGBA')
        bbox=original.getchannel('A').getbbox()
        assert list(bbox)==x['alpha_bbox']
        original=original.crop(bbox)
        expected_image=Image.new('RGBA',(original.width+48,original.height+48),(35,38,46,255))
        expected_image.alpha_composite(original,(24,24))
        actual_image=Image.open(out/x['file']).convert('RGB')
        assert expected_image.convert('RGB').tobytes()==actual_image.tobytes(),x['code']
    shown=[code for sheet in r['overviews'] for code in sheet['maps']]
    assert collections.Counter(shown)==collections.Counter(x['code'] for x in r['maps'])
    for sheet in r['overviews']:
        Image.open(out/sheet['file']).verify()
    for a in archives.values():
        current=a.path.stat()
        assert (current.st_size,current.st_mtime_ns)==(a.stat.st_size,a.stat.st_mtime_ns)
        a.f.close()
    report['passes'].append(dict(pass_number=3,status='PASS',readable_maps=len(r['maps']),overview_sheets=len(r['overviews']),classified_technical_resources=len(r['excluded']),checks='all ROADMAP textures accounted for, exact original-to-readable pixel composition, all maps included once in overview sheets, overview decode, unchanged source archive metadata'))
    scrivi_json(out/'verifica.json', report)
    print('THREE PASSES COMPLETE',report,flush=True)
    return report


if __name__=='__main__':
    import sys
    from extract_maps import GAME,OUT
    main(Path(sys.argv[1]) if len(sys.argv)>1 else OUT,Path(sys.argv[2]) if len(sys.argv)>2 else GAME)
