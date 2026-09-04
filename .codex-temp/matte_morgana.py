from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


SOURCE = Path(r"C:\Users\rober\.codex\generated_images\01a06714-03f1-7730-85d6-8727247cf881\exec-1693f61b-1d49-4aca-868c-2650b71bb30b.png")
TEMP = Path(r"C:\Repository\project-p5r\.codex-temp\morgana-alpha-source.png")
OUTPUT = Path(r"C:\Repository\project-p5r\.codex-temp\morgana-candidate.png")
PREVIEW = Path(r"C:\Repository\project-p5r\.codex-temp\morgana-alpha-preview.png")

rgb = np.asarray(Image.open(SOURCE).convert("RGB"))
low = rgb.min(axis=2)
chroma = rgb.max(axis=2) - low
candidate = (low >= 235) & (chroma <= 8)

h, w = candidate.shape
outside = np.zeros((h, w), dtype=bool)
queue = deque()
for x in range(w):
    if candidate[0, x]:
        outside[0, x] = True
        queue.append((0, x))
    if candidate[h - 1, x] and not outside[h - 1, x]:
        outside[h - 1, x] = True
        queue.append((h - 1, x))
for y in range(h):
    if candidate[y, 0] and not outside[y, 0]:
        outside[y, 0] = True
        queue.append((y, 0))
    if candidate[y, w - 1] and not outside[y, w - 1]:
        outside[y, w - 1] = True
        queue.append((y, w - 1))

while queue:
    y, x = queue.popleft()
    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True
            queue.append((ny, nx))

alpha = np.where(outside, 0, 255).astype(np.uint8)
rgba = np.dstack((rgb, alpha))
source = Image.fromarray(rgba, "RGBA")
source.save(TEMP)

bbox = source.getchannel("A").getbbox()
content = source.crop(bbox)
max_w, max_h = 691, 922
scale = min(max_w / content.width, max_h / content.height)
size = (round(content.width * scale), round(content.height * scale))
content = content.resize(size, Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (768, 1024), (0, 0, 0, 0))
canvas.alpha_composite(content, ((768 - size[0]) // 2, (1024 - size[1]) // 2))
canvas.save(OUTPUT)

preview = Image.new("RGB", (2304, 1024), "white")
colors = [(255, 255, 255), (17, 31, 48), (0, 190, 120)]
for index, color in enumerate(colors):
    panel = Image.new("RGBA", canvas.size, (*color, 255))
    panel.alpha_composite(canvas)
    preview.paste(panel.convert("RGB"), (index * 768, 0))
ImageDraw.Draw(preview).line((768, 0, 768, 1024), fill=(255, 0, 255), width=3)
ImageDraw.Draw(preview).line((1536, 0, 1536, 1024), fill=(255, 0, 255), width=3)
preview.save(PREVIEW)

print({"source_mode": source.mode, "source_size": source.size, "bbox": bbox,
       "output_mode": canvas.mode, "output_size": canvas.size,
       "alpha_extrema": canvas.getchannel("A").getextrema(),
       "corners": [canvas.getpixel(p) for p in [(0, 0), (767, 0), (0, 1023), (767, 1023)]]})
