// ============================================================
// useFiltriIndirizzo — i filtri di una pagina nell'indirizzo (L10-04: Skill, Glossario, Domande, Cruciverba)
// ============================================================
//
// Ogni filtro è un parametro dell'indirizzo (`?q=…&elemento=…`), come nel Compendio: tornando alla pagina da una scheda il filtro
// c'è ancora, e l'indirizzo si condivide con il filtro. Un valore uguale al predefinito toglie il parametro; un valore che la pagina non
// ammette (scritto a mano, o superato) vale come il predefinito. Il testo della ricerca sostituisce la voce della cronologia a ogni
// battuta (Indietro non ripercorre le lettere); un filtro scelto con un tocco (`storia`) aggiunge una voce, così Indietro torna al
// filtro di prima. Più filtri cambiati insieme passano in un solo aggiornamento: `setSearchParams` legge i parametri del giro in
// corso, e due chiamate di fila si cancellerebbero a vicenda.
// ============================================================

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** I filtri della pagina letti dall'indirizzo (con i loro predefiniti) e la funzione che ne cambia uno o più in un solo aggiornamento. */
export function useFiltriIndirizzo<C extends Record<string, string>>(
  predefiniti: C,
  ammessi: { readonly [K in keyof C]?: readonly string[] } = {},
): { valori: C; imposta: (cambi: Partial<C>, opzioni?: { storia?: boolean }) => void } {
  const [params, setParams] = useSearchParams();
  // le chiavi e i valori come testo: i due oggetti della pagina sono nuovi a ogni giro, il loro contenuto no
  const firma = JSON.stringify([predefiniti, ammessi]);
  const valori = useMemo(() => {
    const [p, a] = JSON.parse(firma) as [C, Record<string, readonly string[] | undefined>];
    const out: Record<string, string> = {};
    for (const k of Object.keys(p)) {
      const v = params.get(k);
      out[k] = v !== null && v !== '' && (!a[k] || a[k]!.includes(v)) ? v : p[k];
    }
    return out as C;
  }, [params, firma]);
  const imposta = useCallback((cambi: Partial<C>, opzioni: { storia?: boolean } = {}) => {
    const p = JSON.parse(firma)[0] as C;
    setParams((prec) => {
      const n = new URLSearchParams(prec);
      for (const [k, v] of Object.entries(cambi)) {
        if (v === undefined) continue;
        if (v === '' || v === p[k]) n.delete(k); else n.set(k, v);
      }
      return n;
    }, { replace: !opzioni.storia });
  }, [setParams, firma]);
  return { valori, imposta };
}
