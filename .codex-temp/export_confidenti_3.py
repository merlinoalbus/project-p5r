from pathlib import Path
import hashlib
from PIL import Image

ROOT = Path(r"C:\Repository\project-p5r")
SRC = Path(r"C:\Users\rober\.codex\generated_images\01a06714-03f1-7730-85d6-8727247cf881")
items = {
    "hifumi": "exec-3d2bbcae-7543-4592-8538-f90c10abdced.png",
    "chihaya": "exec-008d943c-e94f-4b87-a740-cc4d8388985e.png",
    "iwai": "exec-93852958-8968-4fde-94b2-7f4abb3387b3.png",
    "shinya": "exec-e4396b97-2c5f-4902-94a9-7e0554e782e7.png",
    "gemelle": "exec-e7d3034c-55ba-414e-bb3c-4f2fd6dbadda.png",
    "sae": "exec-fbfc10b9-1a8d-46eb-893a-357b0947b059.png",
    "maruki": "exec-e53af0ed-3dcd-4574-9115-900254a21a66.png",
}

results = []
for name, source_name in items.items():
    source = Image.open(SRC / source_name).convert("RGBA")
    alpha = source.getchannel("A")
    if alpha.getextrema()[0] != 0:
        raise RuntimeError(f"{name}: sorgente priva di trasparenza reale")
    alpha = alpha.point(lambda value: 0 if value <= 8 else (255 if value >= 192 else round((value - 8) * 255 / 184)))
    source.putalpha(alpha)
    bbox = alpha.getbbox()
    content = source.crop(bbox)
    scale = min(691 / content.width, 922 / content.height)
    size = (round(content.width * scale), round(content.height * scale))
    content = content.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (768, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(content, ((768 - size[0]) // 2, (1024 - size[1]) // 2))
    output = ROOT / "public" / "asset" / "confidenti" / f"{name}.png"
    canvas.save(output)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    results.append((name, source_name, digest, canvas.getchannel("A").getbbox()))

for validation_pass in range(1, 4):
    for name, _, digest, _ in results:
        path = ROOT / "public" / "asset" / "confidenti" / f"{name}.png"
        image = Image.open(path)
        assert image.mode == "RGBA" and image.size == (768, 1024)
        assert image.getchannel("A").getextrema() == (0, 255)
        assert all(image.getpixel(point)[3] == 0 for point in ((0, 0), (767, 0), (0, 1023), (767, 1023)))
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
    print(f"validazione {validation_pass}: PASS")

for row in results:
    print("|".join(map(str, row)))
