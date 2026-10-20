# 05 — server/services/mappe/areeService.ts (FUN2-9)

Calcolata sul `mappeDaCollocare` di 90137ce2 (righe 429-436: solo genitori città e quartiere, senza i Palazzi di L3).

## Modifica 1 di 1 — `mappeDaCollocare`: la chiave pubblica del genitore

TESTO VECCHIO
~~~~
  return (prepared(`SELECT m.chiave, m.nome, m.immagine_chiave, m.asset, g.nome AS genitore_nome, (SELECT COUNT(*) FROM spillo s WHERE s.mappa_chiave = m.chiave) AS spilli
      FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave AND g.tipo IN ('citta', 'quartiere') AND COALESCE(g.entita_chiave, '') <> 'mementos'
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL ORDER BY g.nome, m.ordine, m.chiave`).all() as
      Array<{ chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; genitore_nome: string | null; spilli: number }>)
    .map((m) => {
      const img = caricataDellaMappa(m, caricate);
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, genitoreNome: m.genitore_nome, numeroSpilli: m.spilli, immagineUrl: img ? urlCaricata(img) : null, asset: m.asset };
    });
~~~~

TESTO NUOVO
~~~~
  return (prepared(`SELECT m.chiave, m.nome, m.immagine_chiave, m.asset, m.genitore_chiave, g.nome AS genitore_nome, (SELECT COUNT(*) FROM spillo s WHERE s.mappa_chiave = m.chiave) AS spilli
      FROM mappa m JOIN mappa g ON g.chiave = m.genitore_chiave AND g.tipo IN ('citta', 'quartiere') AND COALESCE(g.entita_chiave, '') <> 'mementos'
      WHERE m.tipo IN ('luogo', 'area') AND m.area_chiave IS NULL ORDER BY g.nome, m.ordine, m.chiave`).all() as
      Array<{ chiave: string; nome: string; immagine_chiave: string | null; asset: string | null; genitore_chiave: string | null; genitore_nome: string | null; spilli: number }>)
    .map((m) => {
      const img = caricataDellaMappa(m, caricate);
      // FUN2-9 (L2): la chiave pubblica del genitore, perché «Colloca» proponga il quartiere giusto (`QuartiereRiassuntoDto.mappaChiave`)
      return { chiave: chiaveMappa(m.chiave), nome: m.nome, genitore: m.genitore_chiave ? chiaveMappa(m.genitore_chiave) : null, genitoreNome: m.genitore_nome, numeroSpilli: m.spilli, immagineUrl: img ? urlCaricata(img) : null, asset: m.asset };
    });
~~~~
