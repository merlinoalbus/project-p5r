# 06 — shared/types.ts (R1, FUN2-9)

## Modifica 1 di 2 — `AreaRifDto.daVerificare` (R1)

TESTO VECCHIO (righe 1416-1419)
~~~~
  /** La casa dell'Area, con la versione se non è la predefinita. */
  casa: string;
}
/** Una planimetria (versione) di un'Area. */
~~~~

TESTO NUOVO
~~~~
  /** La casa dell'Area, con la versione se non è la predefinita. */
  casa: string;
  /** L'Area è in attesa della scelta dell'utente (lo staff di Tokyo): il segno «Da verificare» anche nell'indice delle mappe (L2, R1).
   *  Il server lo manda sempre: è facoltativo solo per i dati di prova scritti prima. */
  daVerificare?: boolean;
}
/** Una planimetria (versione) di un'Area. */
~~~~

## Modifica 2 di 2 — `MappaDaCollocareDto.genitore` (FUN2-9)

TESTO VECCHIO (riga 1460)
~~~~
export interface MappaDaCollocareDto { chiave: string; nome: string; genitoreNome: string | null; numeroSpilli: number; immagineUrl: string | null; asset: string | null }
~~~~

TESTO NUOVO
~~~~
export interface MappaDaCollocareDto { chiave: string; nome: string;
  /** La chiave pubblica del genitore (FUN2-9 di L2): «Colloca» propone il quartiere con `mappaChiave` uguale. */
  genitore: string | null;
  genitoreNome: string | null; numeroSpilli: number; immagineUrl: string | null; asset: string | null }
~~~~

Nota: `genitore` è obbligatorio nel tipo. Su 90137ce2 con queste modifiche il typecheck completo (`tsc -b tsconfig.full.json`) è pulito
(provato da BE sulla copia); le modifiche FE del giro 2 (b0ebdad0, test con una lista non vuota) lo usano.
