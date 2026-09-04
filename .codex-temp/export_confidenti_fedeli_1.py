from collections import deque
from pathlib import Path
import hashlib
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Repository\project-p5r")
SRC = Path(r"C:\Users\rober\.codex\generated_images\01a06714-03f1-7730-85d6-8727247cf881")
items = {
    "igor-fedele": "exec-7e811a50-b70f-43fe-9dec-466de9887497.png",
    "morgana-fedele": "exec-91d8a427-2c3f-4e70-a5e2-86de171d7d6c.png",
    "ryuji-fedele": "exec-000cff6f-94ae-4b9a-b760-244021171a66.png",
    "ann-fedele": "exec-a8dbd59a-11a5-400c-824e-6493f405480e.png",
    "yusuke-fedele": "exec-f5f45144-4707-4461-97de-e92e8465e7e1.png",
    "makoto-fedele": "exec-100e8574-c15c-4299-a1f8-5c20e0b8455b.png",
    "futaba-fedele": "exec-6cb1a411-1a88-4d24-9ff6-8318a18a1e62.png",
    "haru-fedele": "exec-db8539ec-c83b-4c9e-b9f2-12833ae7e98f.png",
    "akechi-fedele": "exec-d0a6029c-0e14-4581-8f9e-d70508332e97.png",
    "kasumi-fedele": "exec-0e3ca113-d480-448f-a599-d575911f4601.png",
    "sojiro-fedele": "exec-f33b20a8-1a6d-41d9-a470-fbab0b6e35f6.png",
    "takemi-fedele": "exec-af138176-ae4d-4b25-aa61-76a887c94d10.png",
    "kawakami-fedele": "exec-f78d8c18-c367-4fdc-ad5e-d37a74880263.png",
    "yoshida-fedele": "exec-7cb15095-e5f7-49f4-a139-0221bce99168.png",
    "mishima-fedele": "exec-8ab92e01-b12d-4dcf-b5f1-7f5db3679fbc.png",
    "ohya-fedele": "exec-ae77349c-d5de-4a37-967d-28459ff5129f.png",
    "hifumi-fedele": "exec-f9da3d78-b8a1-41a4-92f7-c79fdd86dd2d.png",
    "chihaya-fedele": "exec-7738ffb0-f6b9-4983-a482-dffa3697e6a0.png",
    "iwai-fedele": "exec-d6751cfb-b095-4685-a427-0052f8c323bd.png",
    "shinya-fedele": "exec-0d66190f-d7bb-45cf-8a16-c52eb1f3574a.png",
    "gemelle-fedele": "exec-c1aa21cd-29f8-4e83-96b2-9634fb0f3679.png",
    "sae-fedele": "exec-41417588-770a-4dd8-b08d-516e367c1936.png",
    "maruki-fedele": "exec-7c60b8c4-3fbe-4d06-bb4d-a39e64f47018.png",
}

def real_alpha(image):
    rgba = image.convert("RGBA")
    if image.mode == "RGBA" and rgba.getchannel("A").getextrema()[0] == 0:
        alpha = rgba.getchannel("A")
        alpha = alpha.point(lambda v: 0 if v <= 8 else (255 if v >= 192 else round((v - 8) * 255 / 184)))
        rgba.putalpha(alpha)
        return rgba
    rgb = np.asarray(image.convert("RGB"))
    low = rgb.min(axis=2)
    candidate = (low >= 170) & ((rgb.max(axis=2) - low) <= 18)
    h, w = candidate.shape
    outside = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= ny < h and 0 <= nx < w and candidate[ny,nx] and not outside[ny,nx]:
                outside[ny,nx] = True; q.append((ny,nx))
    raw = ~outside
    seen = np.zeros((h, w), dtype=bool)
    keep = np.zeros((h, w), dtype=bool)
    red = (rgb[:,:,0] > 120) & (rgb[:,:,0] - rgb[:,:,1] > 50) & (rgb[:,:,0] - rgb[:,:,2] > 50)
    minimum = max(1200, int(h * w * 0.003))
    for y0 in range(h):
        for x0 in range(w):
            if not raw[y0,x0] or seen[y0,x0]:
                continue
            component = []
            q = deque([(y0,x0)])
            seen[y0,x0] = True
            has_red = False
            while q:
                y,x = q.popleft(); component.append((y,x)); has_red |= bool(red[y,x])
                for ny,nx in ((y-1,x-1),(y-1,x),(y-1,x+1),(y,x-1),(y,x+1),(y+1,x-1),(y+1,x),(y+1,x+1)):
                    if 0 <= ny < h and 0 <= nx < w and raw[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx] = True; q.append((ny,nx))
            if len(component) >= minimum or has_red:
                yy,xx = zip(*component)
                keep[np.asarray(yy),np.asarray(xx)] = True
    return Image.fromarray(np.dstack((rgb, np.where(keep, 255, 0).astype(np.uint8))), "RGBA")

for name, source_name in items.items():
    source = real_alpha(Image.open(SRC / source_name))
    bbox = source.getchannel("A").getbbox()
    content = source.crop(bbox)
    scale = min(691 / content.width, 922 / content.height)
    size = (round(content.width * scale), round(content.height * scale))
    content = content.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (768, 1024), (0,0,0,0))
    canvas.alpha_composite(content, ((768-size[0])//2, (1024-size[1])//2))
    out = ROOT / "public" / "asset" / "confidenti" / f"{name}.png"
    canvas.save(out)
    print(name, source_name, hashlib.sha256(out.read_bytes()).hexdigest(), canvas.getchannel("A").getbbox())
