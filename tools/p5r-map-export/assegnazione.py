"""Assegnazione di costo minimo fra due insiemi, uno a uno.

Serve per accoppiare i pin di una planimetria ai punti del campo: due pin distinti sono due cose
distinte, e non possono corrispondere allo stesso trigger. Prendere per ciascun pin il punto più
vicino, indipendentemente dagli altri, non garantisce nulla di tutto ciò — lo stesso punto finisce
sotto più pin, e l'accoppiamento smette di essere una corrispondenza.

Qui c'è l'algoritmo ungherese nella forma a cammini aumentanti (Jonker-Volgenant), per matrici
rettangolari con almeno tante colonne quante righe: costo O(n²m), che sulle dimensioni in gioco
(qualche decina di pin, qualche centinaio di punti) è immediato. Non dipende da scipy.
"""
import numpy


def assegna(costi):
    """Per ogni riga la colonna assegnata, minimizzando il costo totale, senza ripetere colonne.

    `costi` è una matrice righe×colonne con righe ≤ colonne. Torna un array lungo quanto le righe
    con l'indice di colonna assegnato a ciascuna.
    """
    costi = numpy.asarray(costi, dtype=float)
    n, m = costi.shape
    if n == 0:
        return numpy.zeros(0, dtype=int)
    assert n <= m, 'servono almeno tante colonne quante righe'

    # potenziali sulle righe e sulle colonne, e assegnazione corrente delle colonne
    u = numpy.zeros(n + 1)
    v = numpy.zeros(m + 1)
    colonna_di_riga = numpy.full(m + 1, -1, dtype=int)  # per ogni colonna, la riga che la occupa

    for riga in range(n):
        # cammino aumentante dalla riga corrente, con la colonna fittizia m come punto di partenza
        colonna_di_riga[m] = riga
        libera = m
        distanze = numpy.full(m + 1, numpy.inf)
        precedente = numpy.full(m + 1, -1, dtype=int)
        visitata = numpy.zeros(m + 1, dtype=bool)
        while True:
            visitata[libera] = True
            r = colonna_di_riga[libera]
            candidate = ~visitata[:m]
            nuove = costi[r][candidate] - u[r] - v[:m][candidate]
            migliori = distanze[:m][candidate] > nuove
            indici = numpy.nonzero(candidate)[0]
            aggiornate = indici[migliori]
            distanze[aggiornate] = nuove[migliori]
            precedente[aggiornate] = libera
            resto = numpy.nonzero(~visitata[:m])[0]
            if not len(resto):
                break
            prossima = resto[numpy.argmin(distanze[resto])]
            delta = distanze[prossima]
            # si aggiornano i potenziali, così i costi ridotti restano non negativi
            viste = numpy.nonzero(visitata)[0]
            for c in viste:
                r2 = colonna_di_riga[c]
                if r2 >= 0:
                    u[r2] += delta
                v[c] -= delta
            non_viste = numpy.nonzero(~visitata[:m])[0]
            distanze[non_viste] -= delta
            libera = prossima
            if colonna_di_riga[libera] < 0:
                break
        # si ripercorre il cammino, spostando le assegnazioni di una posizione
        while libera != m:
            indietro = precedente[libera]
            colonna_di_riga[libera] = colonna_di_riga[indietro]
            libera = indietro

    esito = numpy.full(n, -1, dtype=int)
    for c in range(m):
        if colonna_di_riga[c] >= 0:
            esito[colonna_di_riga[c]] = c
    assert (esito >= 0).all(), 'assegnazione incompleta'
    return esito
