from pathlib import Path
import hashlib, re
from PIL import Image, ImageDraw, ImageOps

root = Path(r"C:\Repository\project-p5r")
files = sorted((root / "public" / "asset" / "confidenti").glob("*-fedele.png"))
assert len(files) == 23, len(files)

for pass_no in range(1, 4):
    for path in files:
        image = Image.open(path)
        assert image.mode == "RGBA" and image.size == (768, 1024), path
        assert image.getchannel("A").getextrema() == (0, 255), path
        assert all(image.getpixel(p)[3] == 0 for p in ((0,0),(767,0),(0,1023),(767,1023))), path
        assert image.getchannel("A").getbbox() is not None, path
    print(f"varianti fedeli validazione {pass_no}: PASS")

tracker = (root / "docs" / "grafica" / "stato-generazione-asset.md").read_text(encoding="utf-8")
rows = re.findall(r"\| `([^`]+)` \| (?:RGBA|RGB) \| ([0-9a-f]{64}) \|", tracker)
assert len(rows) == 212, len(rows)
for rel, expected in rows:
    assert hashlib.sha256((root / rel).read_bytes()).hexdigest() == expected, rel
print("impronte pregresse: 212/212 PASS")

cell_w, cell_h = 250, 330
sheet = Image.new("RGB", (cell_w*5, cell_h*5), (16,28,44))
draw = ImageDraw.Draw(sheet)
for i, path in enumerate(files):
    image = Image.open(path).convert("RGBA")
    image = ImageOps.contain(image, (230, 290), Image.Resampling.LANCZOS)
    panel = Image.new("RGBA", (cell_w, 300), (16,28,44,255))
    panel.alpha_composite(image, ((cell_w-image.width)//2, (300-image.height)//2))
    x, y = (i%5)*cell_w, (i//5)*cell_h
    sheet.paste(panel.convert("RGB"), (x,y))
    draw.text((x+8,y+304), path.stem, fill="white")
sheet.save(root / ".codex-temp" / "confidenti-fedeli-preview.png")

for path in files:
    print(path.name, hashlib.sha256(path.read_bytes()).hexdigest())
