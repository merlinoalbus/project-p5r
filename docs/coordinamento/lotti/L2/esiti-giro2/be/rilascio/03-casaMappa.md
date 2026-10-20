# 03 — server/services/mappe/casaMappa.ts (R1)

## Modifica 1 di 1 — `areaRifDellaMappa`: `daVerificare`

TESTO VECCHIO
~~~~
    casa: casaDellArea(a, r.chiave) ?? `/guida/mappe/${encodeURIComponent(chiaveMappa(r.chiave))}`,
  };
}
~~~~

TESTO NUOVO
~~~~
    casa: casaDellArea(a, r.chiave) ?? `/guida/mappe/${encodeURIComponent(chiaveMappa(r.chiave))}`,
    // L2, R1 del giro 1: l'indice `/guida/mappe` mostra «Da verificare» come la pagina dell'Area
    daVerificare: a.da_verificare === 1,
  };
}
~~~~
