from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

src = Path(r"C:\Users\rober\AppData\Local\Temp\browser-use\assets\bc4c0552-d1da-4eda-a4aa-b7439ae64b84")
out = Path(r"C:\Repository\project-p5r\.codex-temp\confidenti-riferimenti-steam.png")
items = [
    ("Igor", "d60b0bd2e189e703"), ("Morgana", "18b11361b89cb4a3"),
    ("Sae", "8a1b5b84f1a8a4af"), ("Makoto", "e8ff728798fcaa6f"),
    ("Haru", "7f8b1cd92a3051c0"), ("Ryuji", "05d810eb45441881"),
    ("Futaba", "5968bda177dc04e5"), ("Ann", "688f1b48323eded4"),
    ("Yusuke", "61d07f194510a35e"), ("Takemi", "374a69b197c04a84"),
    ("Iwai", "fefe1242ae5c9e71"), ("Mishima", "c413e11f6dd85768"),
    ("Yoshida", "d55fa8d1b79cc6eb"), ("Maruki", "540c69d8c1af8a07"),
    ("Kawakami", "ca73c5d55b0050da"), ("Kasumi", "eaa0e31c9d1a0250"),
    ("Akechi", "f431d3a40db318d8"), ("Sojiro", "b6e47cde1845c6e6"),
    ("Ohya", "e7e14219a33e2e3d"), ("Shinya", "8d38898afa970130"),
    ("Hifumi", "469550a0f4bacf42"), ("Chihaya", "20d684122acd536e"),
    ("Gemelle", "a03c0f0672d7c00f"),
]
cell_w, cell_h = 260, 300
sheet = Image.new("RGB", (cell_w * 5, cell_h * 5), "#111111")
draw = ImageDraw.Draw(sheet)
for i, (name, file_name) in enumerate(items):
    image = Image.open(src / file_name).convert("RGB")
    image = ImageOps.contain(image, (240, 250), Image.Resampling.LANCZOS)
    x = (i % 5) * cell_w + (cell_w - image.width) // 2
    y = (i // 5) * cell_h + 8
    sheet.paste(image, (x, y))
    draw.text(((i % 5) * cell_w + 8, (i // 5) * cell_h + 268), f"{i+1}. {name}", fill="white")
sheet.save(out)
print(out)
