#!/usr/bin/env python
# ============================================================
# font-italiano — aggiunge a un font i caratteri che l'italiano usa e lui non ha
# ============================================================
#
# I tre font dell'interfaccia (display, menu, decor) sono file caricati dall'utente e presi dallo
# stile del gioco: sono nati per l'inglese e il giapponese, e le **lettere accentate non ci sono**.
# Il browser allora, per quelle sole lettere, ripiega su un altro carattere: «CITTÀ» esce con la À
# di un'altra famiglia, più sottile e con un'altra forma, in mezzo a lettere pesanti. Si vede in
# ogni titolo dell'app — «La città», «Attività e Doti sociali», «Perché», «Più» — ed è il rilievo
# dell'utente: «gli accentati del font standard si vedono male».
#
# Qui le lettere mancanti vengono **costruite dal font stesso**: si prende il contorno della
# lettera base (A, E, I, O, U, a, e, i, o, u) e ci si disegna sopra l'accento, con lo spessore e la
# proporzione del font. Non è una sostituzione di famiglia: è la stessa lettera con il segno che
# le mancava, quindi la parola resta di un carattere solo.
#
# Insieme alle lettere si aggiungono i segni che la nostra interfaccia usa e che spesso mancano:
# le virgolette a caporale « », il trattone —, i puntini di sospensione …, l'apostrofo tipografico
# ’ e il grado °. Anche questi sono costruiti, non copiati da altri font.
#
# **Perché Python.** Un file di font non si modifica a mano: serve una libreria che sappia leggere
# e riscrivere le tabelle (`glyf`/`CFF`, `cmap`, `hmtx`). In questo repository non c'è un
# equivalente in TypeScript installato; fontTools sì. Il file di partenza non viene toccato: lo
# script scrive una copia.
#
# Uso:
#   python scripts/font-italiano.py <font-di-partenza> <font-da-scrivere>
# ============================================================

import sys
import unicodedata

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

# Le lettere accentate dell'italiano, con la loro base e il tipo di accento.
LETTERE = {
    "À": ("A", "grave"), "È": ("E", "grave"), "É": ("E", "acuto"),
    "Ì": ("I", "grave"), "Ò": ("O", "grave"), "Ù": ("U", "grave"),
    "à": ("a", "grave"), "è": ("e", "grave"), "é": ("e", "acuto"),
    "ì": ("i", "grave"), "ò": ("o", "grave"), "ù": ("u", "grave"),
}
# I segni di interpunzione che l'interfaccia usa davvero.
SEGNI = ["«", "»", "—", "…", "’", "“", "”", "°", "•"]


def cmap_unicode(font):
    """Tutte le sottotabelle cmap che parlano Unicode (0/3,1/3,10)."""
    tabelle = []
    for t in font["cmap"].tables:
        if t.platformID == 0 or (t.platformID == 3 and t.platEncID in (1, 10)):
            tabelle.append(t)
    return tabelle


def copertura(font, glyphSet):
    """Codepoint **davvero disegnati**.
    Due trappole, tutte e due incontrate su questi font:
    1. `getBestCmap` può scegliere una sottotabella Mac Roman, dove 0xC0 non è «À»: leggendo quella
       si conclude che la lettera c'è mentre il browser la sta ripiegando su un altro carattere.
    2. Un codepoint può essere mappato su un glifo **vuoto**: nel font «display» `Agrave`,
       `Egrave`, `Eacute`, `Ugrave` e le minuscole corrispondenti esistono nella cmap e non hanno
       nessun contorno. Contarle come presenti lascerebbe il difetto esattamente dov'era."""
    coperti = set()
    for t in cmap_unicode(font):
        for codice, nome in t.cmap.items():
            penna = RecordingPen()
            try:
                glyphSet[nome].draw(penna)
            except KeyError:
                continue
            if penna.value:
                coperti.add(codice)
    return coperti


def nome_glifo(carattere):
    """Nome del glifo nuovo: quello standard di Adobe, così ogni strumento lo riconosce."""
    speciali = {"«": "guillemotleft", "»": "guillemotright", "—": "emdash",
                "…": "ellipsis", "’": "quoteright", "“": "quotedblleft",
                "”": "quotedblright", "°": "degree", "•": "bullet"}
    if carattere in speciali:
        return speciali[carattere]
    return unicodedata.name(carattere).lower().replace(" ", "").replace("latin", "").replace("letter", "")


def contorni(glyphSet, nome):
    """Il disegno di un glifo esistente, registrato per essere ridisegnato altrove."""
    penna = RecordingPen()
    glyphSet[nome].draw(penna)
    return penna.value


def riquadro(valore):
    """Riquadro dei contorni registrati: (xMin, yMin, xMax, yMax), o None se il glifo è vuoto."""
    punti = []
    for operatore, argomenti in valore:
        for p in argomenti:
            if isinstance(p, tuple):
                punti.append(p)
    if not punti:
        return None
    xs = [p[0] for p in punti]
    ys = [p[1] for p in punti]
    return (min(xs), min(ys), max(xs), max(ys))


def accento(tipo, cx, base_alta, upem):
    """Il segno sopra la lettera: un parallelogramma inclinato, del peso del font.
    Grave scende da sinistra a destra, acuto sale: sono i due che l'italiano usa.
    Sta **vicino** alla lettera: nei caratteri stretti e pesanti come questi lo spazio sopra le
    maiuscole è pochissimo (nel font display l'ascendente supera le maiuscole di 45 unità su 1024),
    e un accento staccato sembra un segno che vola per conto suo."""
    larghezza = upem * 0.22
    spessore = upem * 0.08
    altezza = upem * 0.085
    stacco = upem * 0.025
    y0 = base_alta + stacco
    y1 = y0 + altezza
    x0 = cx - larghezza / 2
    x1 = cx + larghezza / 2
    if tipo == "grave":
        # alto a sinistra, basso a destra
        return [(x0, y1), (x0 + spessore, y1), (x1, y0), (x1 - spessore, y0)]
    return [(x0, y0), (x0 + spessore, y0), (x1, y1), (x1 - spessore, y1)]


def rettangolo(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def cerchio(cx, cy, raggio, orario=True, lati=16):
    """Cerchio come poligono regolare.
    **Poligono e non curve**: un buco (il grado è un anello) si ottiene solo se il contorno interno
    gira al contrario di quello esterno, e invertire un poligono è invertire una lista di punti —
    con le curve bisognerebbe rovesciare anche i punti di controllo. A questa dimensione i sedici
    lati non si distinguono da un cerchio."""
    import math
    punti = [(cx + raggio * math.cos(2 * math.pi * i / lati), cy + raggio * math.sin(2 * math.pi * i / lati)) for i in range(lati)]
    if orario:
        punti.reverse()
    return poligono(punti)


def poligono(punti):
    passi = [("moveTo", (punti[0],))]
    passi += [("lineTo", (p,)) for p in punti[1:]]
    passi.append(("closePath", ()))
    return passi


def disegno_segno(carattere, upem, altezza_x, altezza_cap, glyphSet, per_nome):
    """Il disegno di un segno d'interpunzione, e la sua larghezza."""
    chevron = upem * 0.22
    if carattere in ("«", "»"):
        sp = upem * 0.075
        y0, y1 = altezza_x * 0.15, altezza_x * 0.72
        ym = (y0 + y1) / 2
        passi = []
        for i in (0, 1):
            dx = i * chevron * 0.85
            if carattere == "«":
                punta, coda = upem * 0.10 + dx, upem * 0.10 + chevron + dx
            else:
                punta, coda = upem * 0.10 + chevron + dx, upem * 0.10 + dx
            passi += poligono([(coda, y1), (coda + sp, y1), (punta + sp, ym), (coda + sp, y0), (coda, y0), (punta, ym)])
        return passi, upem * 0.45
    if carattere == "—":
        y = altezza_x * 0.42
        sp = upem * 0.07
        return poligono(rettangolo(upem * 0.02, y, upem * 0.98, y + sp)), upem
    if carattere == "•":
        return cerchio(upem * 0.25, altezza_x * 0.5, upem * 0.09), upem * 0.5
    if carattere == "°":
        raggio = upem * 0.12
        cy = altezza_cap - raggio
        # Anello: fuori in un verso, dentro nell'altro, altrimenti il buco si riempie.
        return cerchio(upem * 0.22, cy, raggio) + cerchio(upem * 0.22, cy, raggio * 0.5, orario=False), upem * 0.44
    if carattere in ("’", "“", "”"):
        # Apostrofo e virgolette alte: la stessa virgola, in alto, una o due volte.
        larghezza = upem * 0.09
        alto = altezza_cap
        basso = alto - upem * 0.16
        def virgola(x):
            return poligono([(x, alto), (x + larghezza, alto), (x + larghezza * 0.55, basso), (x, basso)])
        if carattere == "’":
            return virgola(upem * 0.10), upem * 0.28
        passi = virgola(upem * 0.08) + virgola(upem * 0.08 + larghezza * 1.7)
        return passi, upem * 0.48
    if carattere == "…":
        punto = per_nome.get("period")
        if punto:
            return None, None  # lo compone chi chiama, copiando il punto tre volte
        return None, None
    return None, None


def ridisegna(passi, penna):
    for operatore, argomenti in passi:
        getattr(penna, operatore)(*argomenti)


def arricchisci(sorgente, destinazione):
    font = TTFont(sorgente, fontNumber=0)
    upem = font["head"].unitsPerEm
    glyphSet = font.getGlyphSet()
    coperti = copertura(font, glyphSet)
    per_codice = {}
    for t in cmap_unicode(font):
        per_codice.update(t.cmap)
    cff = font["CFF "].cff.topDictIndex[0] if "CFF " in font else None
    altezza_cap = getattr(font["OS/2"], "sCapHeight", 0) or upem * 0.7
    altezza_x = getattr(font["OS/2"], "sxHeight", 0) or upem * 0.5

    aggiunti = []

    def scrivi(nome, passi, larghezza):
        if cff is not None:
            penna = T2CharStringPen(larghezza, glyphSet)
            ridisegna(passi, penna)
            charstring = penna.getCharString(private=cff.Private if hasattr(cff, "Private") else None)
            # Un glifo **nuovo** in un CFF non si aggiunge assegnando `CharStrings[nome]`: quel
            # percorso cerca l'indice del nome e su un nome che non c'è solleva KeyError. Si
            # appende al blocco dei charstring, si registra l'indice e si allunga il charset.
            indice = cff.CharStrings.charStringsIndex
            indice.append(charstring)
            cff.CharStrings.charStrings[nome] = len(indice) - 1
            if nome not in cff.charset:
                cff.charset.append(nome)
        else:
            penna = TTGlyphPen(glyphSet)
            ridisegna(passi, penna)
            font["glyf"][nome] = penna.glyph()
        font["hmtx"][nome] = (int(larghezza), 0)
        if nome not in font.getGlyphOrder():
            font.setGlyphOrder(font.getGlyphOrder() + [nome])
        for t in cmap_unicode(font):
            t.cmap[codice] = nome
        aggiunti.append(nome)

    for carattere, (base, tipo) in LETTERE.items():
        codice = ord(carattere)
        if codice in coperti:
            continue
        nome_base = per_codice.get(ord(base))
        if not nome_base:
            continue
        passi = list(contorni(glyphSet, nome_base))
        bb = riquadro(passi)
        if bb is None:
            continue
        cx = (bb[0] + bb[2]) / 2
        # Sopra la lettera, non sopra il rettangolo del font: la «i» ha il puntino, e l'accento
        # va sopra a quello. Il puntino resta: è così che si scrive «ì» in tipografia italiana?
        # No: sulla «i» accentata il puntino sparisce. Si taglia il contorno più alto e piccolo.
        if base in ("i",):
            contorni_i = separa_contorni(passi)
            if len(contorni_i) > 1:
                contorni_i.sort(key=lambda c: riquadro(c)[3])
                passi = [p for c in contorni_i[:-1] for p in c]
                bb = riquadro(passi)
                cx = (bb[0] + bb[2]) / 2
        alta = max(bb[3], altezza_cap if base.isupper() else altezza_x)
        passi = passi + poligono(accento(tipo, cx, alta, upem))
        larghezza = font["hmtx"][nome_base][0]
        scrivi(nome_glifo(carattere), passi, larghezza)

    for carattere in SEGNI:
        codice = ord(carattere)
        if codice in coperti:
            continue
        if carattere == "…":
            nome_punto = per_codice.get(ord("."))
            if not nome_punto:
                continue
            passi_punto = list(contorni(glyphSet, nome_punto))
            bb = riquadro(passi_punto)
            if bb is None:
                continue
            larghezza_punto = font["hmtx"][nome_punto][0]
            passi = []
            for i in range(3):
                passi += trasla(passi_punto, larghezza_punto * i * 1.05, 0)
            scrivi("ellipsis", passi, larghezza_punto * 3.2)
            continue
        passi, larghezza = disegno_segno(carattere, upem, altezza_x, altezza_cap, glyphSet, per_codice)
        if passi is None:
            continue
        scrivi(nome_glifo(carattere), passi, larghezza)

    # **Spazio in alto per gli accenti.** Un font nato senza lettere accentate dichiara di salire
    # quanto le sue maiuscole e poco più: nel display, 731 unità contro 686 di maiuscola. L'accento
    # sfonda quel tetto, e chi disegna (browser compresi, su Windows) può tagliarlo. Si alzano
    # allora le tre misure verticali fino a contenerlo — non si abbassa nulla, quindi il testo non
    # si sposta dove l'accento non c'è.
    if aggiunti:
        cima = 0
        for nome in aggiunti:
            penna = RecordingPen()
            font.getGlyphSet()[nome].draw(penna)
            bb = riquadro(penna.value)
            if bb:
                cima = max(cima, bb[3])
        margine = int(cima + upem * 0.01)
        font["hhea"].ascent = max(font["hhea"].ascent, margine)
        font["OS/2"].usWinAscent = max(font["OS/2"].usWinAscent, margine)
        font["OS/2"].sTypoAscender = max(font["OS/2"].sTypoAscender, margine)

    font.save(destinazione)
    return aggiunti


def separa_contorni(passi):
    """Spezza una registrazione in contorni chiusi separati."""
    fuori = []
    corrente = []
    for passo in passi:
        corrente.append(passo)
        if passo[0] == "closePath" or passo[0] == "endPath":
            fuori.append(corrente)
            corrente = []
    if corrente:
        fuori.append(corrente)
    return fuori


def trasla(passi, dx, dy):
    fuori = []
    for operatore, argomenti in passi:
        nuovi = tuple(tuple((p[0] + dx, p[1] + dy) for p in [a])[0] if isinstance(a, tuple) else a for a in argomenti)
        fuori.append((operatore, nuovi))
    return fuori


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    nuovi = arricchisci(sys.argv[1], sys.argv[2])
    print(f"{sys.argv[2]}: aggiunti {len(nuovi)} glifi -> {', '.join(nuovi) or 'nessuno'}")
