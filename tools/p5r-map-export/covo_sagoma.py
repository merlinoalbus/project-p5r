# ============================================================
# covo_sagoma — la sagoma del Covo dei Ladri per la mappa di viaggio, ritagliata dall'originale
# ============================================================
#
# Non genera niente: **ritaglia**. La sagoma del Covo esiste già nel gioco come
# `BASE/FIELD/PANEL/ROADMAP/RMAP_022_1_0.png` — il Covo è il Luogo 022 — ed è disegnata nello
# stesso linguaggio delle sagome dei quartieri: nero pieno, dettagli ricavati in negativo bianco,
# alfa reale. Sul foglio sta in un angolo di una tela 1024×1024 quasi tutta vuota, quindi va
# portata al proprio riquadro; è l'unica operazione che questo script fa.
#
# **Perché esiste questo file.** Avevo scritto un prompt per farla *disegnare* (voce 4 di
# `docs/grafica/fabbisogno.md`), avendo cercato solo dentro `P5_MAPDATA.SPD` — il foglio della
# mappa di viaggio — dove il Covo non c'è e non ci può essere. Codex ha cercato in tutto
# `data/atlas/extracted` e l'ha trovato. È la terza volta che la regola «prima si guarda fra gli
# originali» salva un pezzo di mappa dall'essere disegnato al posto di quello vero: le prime due
# sono le voci 2 e 3, i pezzi dei Memento.
#
# Uso:  python tools/p5r-map-export/covo_sagoma.py
# ============================================================

from pathlib import Path

from PIL import Image

RADICE = Path(__file__).resolve().parents[2]
ORIGINALE = RADICE / 'data/atlas/extracted/png/BASE/FIELD/PANEL/ROADMAP/RMAP_022_1_0.png'
DESTINAZIONE = RADICE / 'public/asset/mappe/lmap/tokyo/covo-dei-ladri.png'
# Tetto, non bersaglio: si rimpicciolisce se l'originale è più grande delle sagome dei quartieri
# (600-800 px di lato), **non** si ingrandisce se è più piccolo. Ingrandire un originale lo
# sgrana, e il Covo esce dal ritaglio a 339×383: sulla mappa un cartellino è largo il 5% della
# tela — Shibuya, che è 726 px, viene resa a 74 — quindi di pixel ce ne sono in abbondanza.
LATO_MASSIMO = 760


def ritaglia() -> None:
    im = Image.open(ORIGINALE).convert('RGBA')
    riquadro = im.getchannel('A').getbbox()
    if riquadro is None:
        raise SystemExit('l’originale è interamente trasparente: non è il file giusto')
    sagoma = im.crop(riquadro)
    if max(sagoma.size) > LATO_MASSIMO:
        fattore = LATO_MASSIMO / max(sagoma.size)
        sagoma = sagoma.resize((round(sagoma.width * fattore), round(sagoma.height * fattore)), Image.LANCZOS)
    DESTINAZIONE.parent.mkdir(parents=True, exist_ok=True)
    sagoma.save(DESTINAZIONE)

    # Le stesse tre misure con cui si verificano le altre sagome, stampate perché finiscano nel
    # verbale invece di essere dichiarate a memoria.
    alfa = sagoma.getchannel('A')
    trasparenti = sum(1 for v in alfa.getdata() if v == 0)
    totale = sagoma.width * sagoma.height
    print(f'originale   {im.size[0]}x{im.size[1]}')
    print(f'riquadro    {riquadro}')
    print(f'sagoma      {sagoma.width}x{sagoma.height}')
    print(f'alfa minima {alfa.getextrema()[0]} (0 = ritaglio reale)')
    print(f'trasparenti {trasparenti * 100 / totale:.1f}%  (gli originali dei quartieri stanno al 44-48%)')
    print(f'angolo      {sagoma.getpixel((0, 0))}')
    print(f'scritta in  {DESTINAZIONE.relative_to(RADICE)}')


if __name__ == '__main__':
    ritaglia()
