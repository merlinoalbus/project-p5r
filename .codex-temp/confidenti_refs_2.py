from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

src = Path(r"C:\Users\rober\AppData\Local\Temp\browser-use\assets\a059aa4c-0331-4124-99e3-def1e22a9bec")
out = Path(r"C:\Repository\project-p5r\.codex-temp\confidenti-riferimenti-realistici.png")
items = [
    ("Igor", "be489f2a5fb8bb87"), ("Morgana", "e56a888417aa6f49"),
    ("Makoto", "3859c7c89d31cf9b"), ("Haru", "c451c0955abb7a86"),
    ("Yusuke", "bb301cdb05d18ce5"), ("Sojiro", "83fdc73c10ca2dc0"),
    ("Ann", "6dcceaabc0abcf0f"), ("Ryuji", "cbb457c96702c9cf"),
    ("Akechi", "8f5b308c37261fe7"), ("Futaba", "b355d08d05ec7e8f"),
    ("Chihaya", "b4eaaeb3baf41792"), ("Gemelle", "9626d4f83fb080ce"),
    ("Iwai", "e28eaebd5ce88f35"), ("Takemi", "e20b6703d0cc0a59"),
    ("Kawakami", "482d1db2c2b08ac1"), ("Ohya", "0d13e87de0f44f59"),
    ("Shinya", "b6ffda77dabb47f2"), ("Hifumi", "afadd70064cfef45"),
    ("Mishima", "efdaa175a6b54965"), ("Yoshida", "de8438711a9f964c"),
    ("Sae", "0314e04871661cec"), ("Kasumi", "da9804332080bcb2"),
    ("Maruki", "720bd420bde1eb3f"),
]
cell_w, cell_h = 320, 220
sheet = Image.new("RGB", (cell_w * 4, cell_h * 6), "#111111")
draw = ImageDraw.Draw(sheet)
for i, (name, file_name) in enumerate(items):
    image = Image.open(src / file_name).convert("RGB")
    image = ImageOps.contain(image, (300, 180), Image.Resampling.LANCZOS)
    x = (i % 4) * cell_w + (cell_w - image.width) // 2
    y = (i // 4) * cell_h + 4
    sheet.paste(image, (x, y))
    draw.text(((i % 4) * cell_w + 8, (i // 4) * cell_h + 192), f"{i+1}. {name}", fill="white")
sheet.save(out)
print(out)
