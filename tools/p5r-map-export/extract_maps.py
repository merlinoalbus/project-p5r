"""Read-only P5R asset extraction. Outputs are lossless; failures are fatal.

P5R transform reference: Sewer56/CriFsV2Lib, Encryption/Game/P5RCrypto.cs.
UTF table parsing recovered from the previous local extraction attempt.
"""
from scrittura import scrivi_json
import collections
import hashlib
import io
import json
from pathlib import Path
import struct
from PIL import Image
from legacy_utf import Utf

ROOT = Path(__file__).resolve().parents[2]
GAME = Path(r'C:\Program Files (x86)\Steam\steamapps\common\P5R\CPK')
OUT = ROOT / 'outputs/mappe-p5r'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def decrypt(data, attr):
    if attr == 'CRI_CFATTR:ENCRYPT' and len(data) > 0x820:
        b = bytearray(data)
        for i in range(0x20, 0x420):
            b[i] ^= b[i + 0x400]
        return bytes(b)
    return data


def decompress(src, expected):
    if src[:8] != b'CRILAYLA':
        if len(src) != expected:
            raise ValueError('Uncompressed size mismatch')
        return src
    if len(src) < 272:
        raise ValueError('Truncated CRILAYLA header')
    usize, csize = struct.unpack_from('<II', src, 8)
    if usize + 256 != expected or 16 + csize + 256 != len(src):
        raise ValueError('CRILAYLA size mismatch')
    pos, pool, left = 15 + csize, 0, 0

    def bits(n):
        nonlocal pos, pool, left
        value = 0
        while n:
            if not left:
                if pos < 16:
                    raise ValueError('CRILAYLA bitstream underflow')
                pool, left = src[pos], 8
                pos -= 1
            take = min(n, left)
            value = (value << take) | ((pool >> (left - take)) & ((1 << take) - 1))
            left -= take
            n -= take
        return value

    out = bytearray(expected)
    out[:256] = src[16 + csize:]
    w = expected - 1
    while w >= 256:
        if not bits(1):
            out[w] = bits(8)
            w -= 1
            continue
        offset = bits(13) + 3
        count = 3
        for level in (2, 3, 5, 8):
            value = bits(level)
            count += value
            if value != (1 << level) - 1:
                break
        else:
            while value == 255:
                value = bits(8)
                count += value
        if w + offset >= expected or count > w - 255:
            raise ValueError('CRILAYLA invalid back-reference')
        # Align repeated source bytes to the right for backwards overlapping LZ.
        pattern = bytes(out[w+1:w+offset+1])
        out[w-count+1:w+1] = (pattern*((count+offset-1)//offset))[-count:]
        w -= count
    return bytes(out)


class Archive:
    def __init__(self, path):
        self.path = path
        self.f = path.open('rb')
        self.stat = path.stat()
        self.header = self.table(0, b'CPK ').rows[0]
        toc = self.header['TocOffset']
        base = min(toc, self.header['ContentOffset'])
        rows = self.table(toc, b'TOC ').rows
        if len(rows) != self.header['Files']:
            raise ValueError('TOC count mismatch')
        self.entries = []
        for r in rows:
            name = '/'.join(filter(None, [r['DirName'], r['FileName']]))
            if any(p in ('..', '.') for p in name.split('/')) or ':' in name or '\\' in name or name.startswith('/'):
                raise ValueError('Unsafe archive path')
            e = dict(path=name, offset=base+r['FileOffset'], size=r['FileSize'],
                     extracted_size=r['ExtractSize'], attr=r.get('UserString', ''))
            if not 0 <= e['offset'] <= self.stat.st_size - e['size']:
                raise ValueError('TOC file outside archive')
            self.entries.append(e)
        if len({e['path'].casefold() for e in self.entries}) != len(rows):
            raise ValueError('Duplicate archive path')

    def table(self, off, magic):
        self.f.seek(off)
        h = self.f.read(16)
        if len(h) != 16 or h[:4] != magic:
            raise ValueError('Invalid CPK section')
        size, = struct.unpack_from('<Q', h, 8)
        if size > self.stat.st_size - off - 16:
            raise ValueError('Table outside archive')
        return Utf(self.f.read(size))

    def raw(self, e):
        self.f.seek(e['offset'])
        raw = self.f.read(e['size'])
        if len(raw) != e['size']:
            raise ValueError('Short archive read')
        return raw

    def read(self, e):
        raw = self.raw(e)
        return decompress(decrypt(raw, e['attr']), e['extracted_size'])


FOLDERS = {'FIELD/MAP', 'FIELD/PANEL/MAP', 'FIELD/PANEL/LMAP',
           'FIELD/PANEL/ROADMAP', 'FIELD/PANEL/MIDDLE_MAP',
           'FIELD/PANEL/MEMENTOS', 'FIELD/PANEL/SEARCH_OBJ', 'FIELD/PANEL/PLACE_PICT'}


def selected(path):
    folder, _, name = path.rpartition('/')
    return folder in FOLDERS or (folder == 'FIELD/FTD' and name.startswith(('FLDATDNG','FLDDNG'))) or (folder == 'FIELD/PANEL' and
           any(word in name for word in ('MAP', 'MEMENTOS', 'SEARCH_OBJ')))


def dds_length(data, off):
    if off + 128 > len(data) or data[off:off+4] != b'DDS ':
        raise ValueError('Truncated DDS')
    h = data[off:off+128]
    size, = struct.unpack_from('<I', h, 4)
    height, width = struct.unpack_from('<II', h, 12)
    pfsize, = struct.unpack_from('<I', h, 76)
    mipmaps, = struct.unpack_from('<I', h, 28)
    if size != 124 or pfsize != 32 or not (0 < width <= 32768 and 0 < height <= 32768) or mipmaps > 16:
        raise ValueError('Invalid DDS dimensions/header')
    cc = h[84:88]
    length = 128
    if cc == b'DX10':
        raise ValueError('Unexpected DX10 texture: explicit decoder required')
    if cc not in (b'DXT1', b'DXT3', b'DXT5', b'\0\0\0\0'):
        raise ValueError(f'Unsupported DDS format {cc!r}')
    bpp, = struct.unpack_from('<I', h, 88)
    for level in range(max(1, mipmaps)):
        w, ht = max(1, width >> level), max(1, height >> level)
        if cc.startswith(b'DXT'):
            length += ((w+3)//4)*((ht+3)//4)*(8 if cc == b'DXT1' else 16)
        else:
            if bpp not in (8, 16, 24, 32):
                raise ValueError('Unsupported DDS RGB depth')
            length += ((w*bpp+7)//8)*ht
    if off + length > len(data):
        raise ValueError('DDS pixels truncated')
    return length


def category(path):
    folder = path.rsplit('/', 1)[0]
    if folder == 'FIELD/PANEL/ROADMAP':
        return 'Planimetrie dei luoghi'
    if folder == 'FIELD/PANEL/MAP' and path.endswith('.DDS'):
        return 'Tessere delle minimappe'
    if 'PLACE_PICT' in path:
        return 'Nomi dei luoghi in italiano'
    if 'LMAP/MAP_L_' in path:
        return 'Illustrazioni dei quartieri'
    if 'MIDDLE_MAP' in path:
        return 'Mappe intermedie e test'
    if 'MEMENTOS' in path:
        return 'Mementos - elementi grafici'
    return 'Atlanti e simboli delle mappe'


def main(game=GAME, out=OUT):
    global OUT
    OUT = Path(out).resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'anteprime').mkdir(exist_ok=True)
    images, sources, inventories, errors = [], [], [], []
    archives = sorted(Path(game).glob('*.CPK'))
    if not archives or not (Path(game)/'BASE.CPK').is_file() or not (Path(game)/'IT.CPK').is_file():
        raise ValueError('BASE.CPK and IT.CPK are required in the selected CPK folder')
    for file in archives:
        a = Archive(file)
        chosen = [e for e in a.entries if selected(e['path'])]
        inventories.append(dict(archive=file.name, size=a.stat.st_size,
            mtime_ns=a.stat.st_mtime_ns, total_entries=len(a.entries), selected=len(chosen),
            candidates=[e['path'] for e in a.entries if 'MAP' in e['path'] or 'MEMENTOS' in e['path']],
            selection_rule='Exact map folders plus FIELD/PANEL names containing MAP, MEMENTOS or SEARCH_OBJ'))
        print(file.name, 'entries',len(a.entries),'selected',len(chosen),flush=True)
        # Audit all indexes; audiovisual archives contain no selected assets.
        for i, e in enumerate(chosen):
            try:
                data = a.read(e)
                original = Path('originali') / file.stem / e['path']
                target = OUT / original
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                record = dict(archive=file.name, **e, sha256=sha(data), file=original.as_posix(), textures=0)
                pos, index = 0, 0
                while True:
                    off = data.find(b'DDS ', pos)
                    if off < 0:
                        break
                    length = dds_length(data, off)
                    dds = data[off:off+length]
                    if e['path'].endswith('.DDS') and (off != 0 or length != len(data)):
                        raise ValueError('Standalone DDS length mismatch')
                    im = Image.open(io.BytesIO(dds)).convert('RGBA')
                    im.load()
                    stem = e['path'][:-4] if e['path'].endswith('.DDS') else e['path']+f'__tex_{index:03d}'
                    relative = Path('png') / file.stem / (stem + '.png')
                    dest = OUT / relative
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    im.save(dest)
                    bbox = im.getchannel('A').getbbox()
                    thumb = im.crop(bbox) if bbox else im.copy()
                    thumb.thumbnail((480, 300), Image.Resampling.LANCZOS)
                    bg = Image.new('RGBA', thumb.size, (42, 44, 52, 255))
                    bg.alpha_composite(thumb)
                    preview = f'anteprime/{len(images):04d}.jpg'
                    bg.convert('RGB').save(OUT / preview, quality=90)
                    images.append(dict(id=len(images), archive=file.name, source=e['path'],
                        source_file=original.as_posix(), dds_offset=off, dds_length=length,
                        dds_sha256=sha(dds), pixel_sha256=sha(im.tobytes()),
                        file=relative.as_posix(), preview=preview, category=category(e['path']),
                        width=im.width, height=im.height, alpha_bbox=bbox,
                        alpha_range=im.getchannel('A').getextrema(), format=dds[84:88].decode('ascii'),
                        texture_index=index))
                    index += 1
                    pos = off + length
                record['textures'] = index
                sources.append(record)
            except Exception as ex:
                errors.append(dict(archive=file.name, source=e['path'], error=str(ex)))
                print('ERROR',errors[-1],flush=True)
            if (i+1)%50 == 0:
                print(file.name,i+1,'/',len(chosen),'textures',len(images),flush=True)
        a.f.close()
    manifest = dict(images=images, sources=sources, inventories=inventories, errors=errors,
        extraction='P5R attribute-driven XOR, strict CRILAYLA, original DDS decoded by Pillow; no block swapping',
        previews='Cropped to nonzero alpha and reduced on dark background; PNG originals retain full canvas and alpha')
    scrivi_json(OUT/'manifest.json', manifest)
    print('RESULT',len(images),'images',len(sources),'sources',len(errors),'errors',flush=True)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
