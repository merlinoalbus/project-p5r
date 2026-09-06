from pathlib import Path
import shutil
root=Path('C:/Repository/project-p5r-main')
target=root/'src/components/mappe/VisoreMappa.tsx'
s=target.read_text(encoding='utf-8')
changes=[
("import { NavigazioneSpillo }", "import { areaImmagine, inquadraturaMappa, type AreaMappa } from '../../utils/inquadraturaMappa';\nimport { NavigazioneSpillo }"),
("useState<Dimensioni | null>(null)","useState<(Dimensioni & { src: string; area: AreaMappa | null }) | null>(null)"),
("const nat: Dimensioni = natCaricata ??", "const caricata = natCaricata?.src === src ? natCaricata : null;\n  const nat: Dimensioni = caricata ??"),
("const zoomMin = dim.w > 0 && dim.h > 0 ? Math.min(dim.w / nat.w, dim.h / nat.h) : 1;", "const fit = inquadraturaMappa(nat, dim, caricata?.area ?? null, mappa.spilli);\n  const zoomMin = fit.zoom;"),
("const pan: Punto = panEsplicito ?? { x: (dim.w - nat.w * zoom) / 2, y: (dim.h - nat.h * zoom) / 2 };", "const pan: Punto = panEsplicito ?? fit.pan;"),
("[selezioneIniziale, dim.w, dim.h, nat.w, nat.h, mappa.chiave]", "[selezioneIniziale, dim.w, dim.h, nat.w, nat.h, mappa.chiave, zoomMin]"),
("[puntoIniziale, selezioneIniziale,dim.w,dim.h,nat.w,nat.h]", "[puntoIniziale, selezioneIniziale,dim.w,dim.h,nat.w,nat.h,zoomMin]"),
("setNatCaricata({ w: img.naturalWidth, h: img.naturalHeight })", "setNatCaricata({ src: src!, w: img.naturalWidth, h: img.naturalHeight, area: areaImmagine(img) })")]
for old,new in changes:
    assert s.count(old)==1,(old,s.count(old))
    s=s.replace(old,new)
target.write_text(s,encoding='utf-8')
shutil.copyfile('work/inquadraturaMappa.ts',root/'src/utils/inquadraturaMappa.ts')
