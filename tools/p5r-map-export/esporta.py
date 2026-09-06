"""Esporta e verifica le mappe di Persona 5 Royal dalla propria installazione."""
import argparse
from pathlib import Path
import sys
import extract_maps
import render_maps
import verify_export


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cpk',type=Path,default=extract_maps.GAME,help='Cartella CPK contenente BASE.CPK e IT.CPK')
    parser.add_argument('--out',type=Path,default=Path(__file__).resolve().parent.parent,help='Cartella di esportazione (predefinita: cartella che contiene tool)')
    group=parser.add_mutually_exclusive_group()
    group.add_argument('--solo-verifica',action='store_true',help='Verifica in tre passate un export esistente')
    group.add_argument('--rigenera-galleria',action='store_true',help='Rigenera nomi, PNG consultabili e tavole, poi verifica tutto')
    a=parser.parse_args()
    out=a.out.resolve();game=a.cpk.resolve()
    if out==game or game in out.parents:
        parser.error('La cartella di esportazione deve essere esterna alla cartella CPK del gioco')
    if not a.solo_verifica:
        if not a.rigenera_galleria:
            extract_maps.main(game,out)
        render_maps.main(out)
    verify_export.main(out,game)
    print(f'Completato. Galleria: {out / "index.html"}',flush=True)


if __name__=='__main__':
    try:
        main()
    except Exception as error:
        print(f'ESPORTAZIONE NON COMPLETATA: {error}',file=sys.stderr)
        raise SystemExit(1)
