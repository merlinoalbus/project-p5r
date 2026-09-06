"""Create named, readable area maps and honest per-place overview sheets."""
from scrittura import scrivi_json, scrivi_testo
from pathlib import Path
import collections
import csv
import html
import json
import re
import struct
import textwrap
import unicodedata
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def text(data):
    # Glyphs present in the Italian map title tables; retain unknown bytes explicitly.
    data = data.split(b'\0')[0]
    for raw, char in [(b'\x84\x95','à'),(b'\x84\xa7','ò'),(b'\x84\x9e','é')]:
        data = data.replace(raw, char.encode('utf8'))
    return data.decode('utf8',errors='backslashreplace').strip()


def safe(name):
    name = unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode()
    return re.sub(r'[^A-Za-z0-9 _.-]+','-',name).strip(' .-')[:95] or 'Area'


def unpack_tbl(b):
    n, = struct.unpack_from('>I', b)
    pos, files = 4, {}
    for _ in range(n):
        name = b[pos:pos+32].split(b'\0')[0].decode('ascii')
        size, = struct.unpack_from('>I', b, pos+32)
        pos += 36
        if pos+size>len(b):
            raise ValueError('Truncated TBL')
        files[name] = b[pos:pos+size]
        pos += size
    if pos != len(b):
        raise ValueError('TBL trailing bytes')
    return files


def read_names(out):
    tbl = unpack_tbl((out/'originali/IT/FIELD/PANEL/ROADMAP/ROADMAP.TBL').read_bytes())
    f = tbl['fld_texpack_title.ftd']
    count, = struct.unpack_from('>I',f,12)
    titles = []
    for i in range(count):
        off, = struct.unpack_from('>I',f,16+i*4)
        titles.append(text(f[off+16:]))
    names, groups = collections.defaultdict(list), collections.defaultdict(set)
    t = tbl['texpack.bin']
    if len(t)%72 or len(tbl['texelem.bin'])%16:
        raise ValueError('Unexpected naming table record size')
    pack_index=0
    for offset in range(0,len(t),72):
        row = t[offset:offset+72]
        major, minor, layers, _ = struct.unpack_from('<4H',row)
        if major == 65535:
            pack_index+=1
            continue
        if layers>10:
            raise ValueError('Unexpected texture layer count')
        for layer in range(layers):
            ix, = struct.unpack_from('<H',row,52+2*layer)
            elem = struct.unpack_from('<8H',tbl['texelem.bin'],ix*16)
            group, title = titles[elem[2]], titles[elem[3]]
            names[(major,minor,layer)].append(dict(group=group,title=title,
                texpack_offset=offset,texpack_group=pack_index,texelem_index=ix,group_title_index=elem[2],area_title_index=elem[3]))
            if elem[2]:
                groups[major].add(group)
    city = collections.defaultdict(list)
    f = (out/'originali/IT/FIELD/PANEL/FLDWHOLEMAPTABLE.FTD').read_bytes()
    count, = struct.unpack_from('>I',f,40)
    if 48+count*1124 > len(f):
        raise ValueError('Unexpected city table structure')
    for group in range(count):
        header = text(f[48+1124*group:48+1124*group+40])
        for row in range(20):
            offset = 48+group*1124+row*56
            entry = f[offset:offset+56]
            major,minor,spawn = struct.unpack_from('>3H',entry,40)
            name = text(entry[:40])
            if major and not spawn and name and name not in ('Dummy','NULL'):
                city[(major,minor)].append(dict(title=name,ftd_offset=offset,menu_heading=header))
    return names, groups, city


def font(size):
    for p in [Path('C:/Windows/Fonts/segoeui.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]:
        if p.is_file():
            return ImageFont.truetype(str(p),size)
    return ImageFont.load_default(size=size)


def panel(im):
    bbox=im.getchannel('A').getbbox()
    if bbox:
        im=im.crop(bbox)
    result=Image.new('RGBA',(im.width+48,im.height+48),(35,38,46,255))
    result.alpha_composite(im,(24,24))
    return result.convert('RGB'),bbox


def main(out):
    out=Path(out)
    manifest=json.loads((out/'manifest.json').read_text(encoding='utf8'))
    names,groups,city=read_names(out)
    maps,excluded=[],[]
    for x in manifest['images']:
        if '/LMAP/MAP_L_' in x['source']:
            code=Path(x['source']).stem
            cities={'AKIBA':'Akihabara','AOYAMA':'Aoyama-Itchome','KANDA':'Kanda','KICHIJOJI':'Kichijoji','SHIBUYA':'Shibuya','SHINJUKU':'Shinjuku','YONCHA':'Yongen-Jaya'}
            group=cities[code.removeprefix('MAP_L_')]
            im=Image.open(out/x['file']).convert('RGBA')
            view,bbox=panel(im)
            relative=Path('mappe_luoghi')/safe(group)/(safe(group)+' - Mappa generale illustrata - '+code+'.png')
            (out/relative).parent.mkdir(parents=True,exist_ok=True)
            view.save(out/relative)
            maps.append(dict(group=group,title='Mappa generale illustrata del quartiere',original_title=code,code=code,
                file=relative.as_posix(),original=x['file'],image_id=x['id'],major=-1,minor=0,layer=0,
                alpha_bbox=bbox,width=view.width,height=view.height,kind='Vista illustrata; non planimetria delle strade',
                naming='Codice quartiere nel nome archivio; nome italiano della stazione',naming_evidence=[],city_evidence=[]))
            continue
        if '/ROADMAP/' not in x['source']:
            continue
        code=Path(x['source']).stem
        major,minor,layer=map(int,code.split('_')[1:])
        im=Image.open(out/x['file']).convert('RGBA')
        pixels=np.asarray(im);vis=pixels[pixels[:,:,3]>0]
        colors=len(np.unique(vis,axis=0)) if len(vis) else 0
        box=x['alpha_bbox']
        if not box or colors<=4:
            excluded.append(dict(code=code,source=x['file'],reason='Risorsa uniforme, vuota o simbolo isolato; non presentata come planimetria',visible_colors=colors))
            continue
        evidence=names.get((major,minor,layer),[])
        real=[e for e in evidence if e['group']!='???']
        gs={e['group'] for e in real}
        if not gs:
            gs=groups.get(major,set())
        group=next(iter(gs)) if len(gs)==1 else f'Luogo {major:03d}'
        possible={e['title'] for e in real if e['title'] not in ('???','NULL')}
        title=next(iter(possible)) if len(possible)==1 else f'Area {minor:03d}'
        certainty='tabella ROADMAP' if len(possible)==1 else 'codice conservato; nome area assente o ambiguo'
        city_evidence=city.get((major,minor),[]) if major<100 else []
        if city_evidence:
            station_entries=[e for e in city_evidence if e['menu_heading'].startswith('Stazione ')]
            preferred=station_entries or [e for e in city_evidence if e['menu_heading'] not in ('Dummy','NULL')] or city_evidence
            specific={e['title'] for e in preferred}
            title=next(iter(specific)) if len(specific)==1 else f'Area {minor:03d}'
            station=[e['menu_heading'] for e in city_evidence if e['menu_heading'].startswith('Stazione ')]
            group=(station[0].replace('Stazione di ','').replace('Stazione ','') if station else title)
            certainty=('tabella italiana dei luoghi, campo major/minor e spawn 0' if len(specific)==1 else 'nome area ambiguo nella tabella italiana; codice conservato')
        if major<100 and group.startswith('Luogo '):
            stations=[e['menu_heading'] for key,entries in city.items() if key[0]==major for e in entries if e['menu_heading'].startswith('Stazione ')]
            if stations:
                group=stations[0].replace('Stazione di ','').replace('Stazione ','')
        if major in (190,192,195):
            group='Memento - aree fisse'
        displaytitle=title.replace('??? ', '')
        filename=f'{safe(group)} - {safe(displaytitle)} - {code}.png'
        relative=Path('mappe_luoghi')/safe(group)/filename
        (out/relative).parent.mkdir(parents=True,exist_ok=True)
        view,bbox=panel(im)
        view.save(out/relative)
        maps.append(dict(group=group,title=displaytitle,original_title=title,code=code,
            file=relative.as_posix(),original=x['file'],image_id=x['id'],
            major=major,minor=minor,layer=layer,alpha_bbox=bbox,width=view.width,height=view.height,
            kind='Planimetria di area o piano',naming=certainty,naming_evidence=evidence,city_evidence=city_evidence))
    maps.sort(key=lambda x:(x['group'],x['major'],x['minor'],x['layer']))
    overviews=[]
    bygroup=collections.defaultdict(list)
    for x in maps:
        bygroup[x['group']].append(x)
    for group,items in bygroup.items():
        for page in range((len(items)+11)//12):
            batch=items[page*12:(page+1)*12]
            sheet=Image.new('RGB',(1800,150+((len(batch)+2)//3)*500),(25,28,36))
            d=ImageDraw.Draw(sheet)
            d.text((30,20),group,fill='white',font=font(40))
            d.text((30,78),'Aree e piani affiancati: la posizione nella tavola non indica collegamenti nel gioco.',fill='#c0c7d5',font=font(23))
            for i,x in enumerate(batch):
                im=Image.open(out/x['file']);im.thumbnail((570,380),Image.Resampling.LANCZOS)
                px=15+(i%3)*600;py=150+(i//3)*500
                sheet.paste(im,(px+(570-im.width)//2,py+(380-im.height)//2))
                for j,line in enumerate(textwrap.wrap(x['title'],38)[:2]):
                    d.text((px+8,py+389+j*28),line,fill='white',font=font(23))
                d.text((px+8,py+453),x['code'],fill='#a8b1c2',font=font(19))
            rel=Path('panoramiche')/(safe(group)+f' - tavola {page+1:02d}.jpg')
            (out/rel).parent.mkdir(exist_ok=True)
            sheet.save(out/rel,quality=94)
            overviews.append(dict(group=group,file=rel.as_posix(),maps=[x['code'] for x in batch]))
    report=dict(maps=maps,excluded=excluded,overviews=overviews,
        rendering='Native ROADMAP area/floor canvases; alpha-only margin crop, 24px border, dark background. No artificial geometric joins.',
        naming_source='IT.CPK/FIELD/PANEL/ROADMAP/ROADMAP.TBL and FLDWHOLEMAPTABLE.FTD',
        limits=['Le mappe rappresentano le texture delle aree e le varianti presenti negli archivi, non uno stato di partita.',
          'Le tavole dei Palazzi affiancano aree e piani; non ricostruiscono collegamenti spaziali.',
          'I piani procedurali dei Memento non hanno una planimetria universale estraibile. Sono incluse le aree fisse disponibili e le Profondita.',
          'Icone dinamiche, oggetti, nemici e nebbia di esplorazione non vengono sovrapposti.',
          'Alcuni nomi sono oscurati nel gioco o ambigui: il codice area e sempre mantenuto.'])
    scrivi_json(out/'mappe_indice.json', report)
    with (out/'mappe_indice.csv').open('w',encoding='utf-8-sig',newline='') as f:
        fields=['group','title','code','file','naming']
        writer=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(maps)
    write_gallery(out,report,manifest)
    print('MAPPE',len(maps),'RISORSE TECNICHE',len(excluded),'PANORAMICHE',len(overviews),flush=True)
    return report


def write_gallery(out,report,manifest):
    groups=sorted({x['group'] for x in report['maps']})
    cards=[]
    for x in report['maps']:
        esc=html.escape
        cards.append(f'<article data-group="{esc(x["group"],quote=True)}" data-search="{esc((x["group"]+" "+x["title"]+" "+x["code"]).lower(),quote=True)}"><a href="{esc(x["file"],quote=True)}"><img loading="lazy" src="{esc(x["file"],quote=True)}" alt="{esc(x["title"],quote=True)}"></a><div><small>{esc(x["group"])}</small><h2>{esc(x["title"])}</h2><p>{esc(x["code"])}</p><a href="{esc(x["file"],quote=True)}" download>Scarica PNG</a> · <a href="{esc(x["original"],quote=True)}">Originale trasparente</a></div></article>')
    options=''.join(f'<option>{html.escape(g)}</option>' for g in groups)
    sheets=''.join(f'<li><a href="{html.escape(x["file"],quote=True)}">{html.escape(x["group"])} — tavola {Path(x["file"]).stem[-2:]}</a></li>' for x in report['overviews'])
    limits=''.join(f'<li>{html.escape(s)}</li>' for s in report['limits'])
    page='''<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P5R — Mappe dei luoghi</title>
<style>body{background:#141720;color:#edf1f8;font:16px system-ui;margin:0}header,main{max-width:1440px;margin:auto;padding:28px}h1{font-size:38px;margin-bottom:8px}p,small{color:#b6c1d4}a{color:#b8d6ff}input,select{padding:12px;margin:8px 12px 8px 0;border-radius:6px;border:1px solid #65728b;background:#242a36;color:white;font:inherit}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:20px}article{background:#222733;border:1px solid #3d4658;border-radius:10px;overflow:hidden}article img{width:100%;height:250px;object-fit:contain;background:#23262e}article div{padding:16px}h2{font-size:20px;margin:7px 0}details{background:#202633;padding:16px;margin:20px 0}li{margin:8px 0}[hidden]{display:none!important}</style>
<header><h1>Persona 5 Royal · Mappe dei luoghi</h1><p>Planimetrie delle aree, piani e varianti estratte dalla tua installazione, con nomi ricavati dai dati italiani.</p><p id="count"></p><details><summary>Panoramiche complete per luogo e Palazzo</summary><p>Aree affiancate, non unite artificialmente. Apri una tavola per ingrandirla.</p><ul>__SHEETS__</ul></details><details><summary>Copertura e limiti</summary><ul>__LIMITS__</ul><p><a href="mappe_indice.csv">Indice CSV</a> · <a href="mappe_indice.json">Provenienza e associazioni</a> · <a href="componenti.html">Componenti e immagini originali</a> · <a href="tool/LEGGIMI.md">Tool di esportazione</a></p></details><label>Cerca luogo, piano o codice<br><input id="search" type="search" placeholder="Cerca nelle mappe..."></label><label>Luogo <select id="group"><option value="">Tutti i luoghi</option>__OPTIONS__</select></label></header><main><section id="grid">__CARDS__</section></main>
<script>const cards=[...document.querySelectorAll('article')],s=document.querySelector('#search'),g=document.querySelector('#group');function filter(){let n=0;for(const c of cards){const show=(!g.value||c.dataset.group===g.value)&&c.dataset.search.includes(s.value.toLowerCase());c.hidden=!show;if(show)n++}document.querySelector('#count').textContent=n+' mappe visualizzate su '+cards.length;}s.addEventListener('input',filter);g.addEventListener('change',filter);filter();</script></html>'''
    for key,value in [('__SHEETS__',sheets),('__LIMITS__',limits),('__OPTIONS__',options),('__CARDS__',''.join(cards))]:
        page=page.replace(key,value)
    scrivi_testo(out/'index.html', page)
    parts=['<!doctype html><html lang="it"><meta charset="utf-8"><title>P5R - Componenti originali</title><style>body{background:#23262e;color:white;font:16px system-ui}a{color:lightblue}.grid{display:flex;flex-wrap:wrap}figure{width:280px}img{width:280px;height:190px;object-fit:contain}figcaption{overflow-wrap:anywhere}</style><h1>Componenti originali</h1><p>Questa sezione contiene anche tasselli, simboli, nomi e atlanti: non sono mappe complete.</p><a href="index.html">Torna alle mappe dei luoghi</a><div class="grid">']
    for x in manifest['images']:
        parts.append(f'<figure><a href="{html.escape(x["file"],quote=True)}"><img loading="lazy" src="{x["preview"]}" alt=""></a><figcaption>{html.escape(x["category"])}<br>{html.escape(x["source"])} [{x["texture_index"]}]</figcaption></figure>')
    parts.append('</div></html>')
    scrivi_testo(out/'componenti.html', ''.join(parts))


if __name__=='__main__':
    import sys
    main(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[2]/'outputs/mappe-p5r')
