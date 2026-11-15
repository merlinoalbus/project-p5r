// ============================================================
// nomiPlanimetrie — come si chiama una planimetria di un'Area
// ============================================================
//
// Una planimetria ha un nome di mappa (da cui nasce il suo indirizzo, e che resta quello dell'estrazione) e, dentro la sua Area,
// un'etichetta di versione scritta dall'utente in «Modifica area». Il nome con cui la planimetria si presenta è uno solo, per tutte
// le viste: «Area · etichetta». Regola pura, letta dal server e dall'interfaccia.
// ============================================================

/** «Area · etichetta» per una planimetria con un'Area e un'etichetta (la sola Area se l'etichetta ripete il suo nome); null se manca
 *  l'una o l'altra: lì chi chiama usa il nome che aveva. */
export function nomeCompletoPlanimetria(area: string | null | undefined, etichetta: string | null | undefined): string | null {
  const a = area?.trim();
  const e = etichetta?.trim();
  if (!a || !e) return null;
  return a.toLowerCase() === e.toLowerCase() ? a : `${a} · ${e}`;
}

/** Il nome con cui si presenta la planimetria che si sta guardando: «Area · etichetta», altrimenti il nome che la mappa aveva. */
export function nomeVisibilePlanimetria(mappa: { nome: string; area?: { nome: string; versioneEtichetta?: string | null } | null }): string {
  return nomeCompletoPlanimetria(mappa.area?.nome, mappa.area?.versioneEtichetta) ?? mappa.nome;
}

/** Il nome del posto in cui porta un gesto di navigazione: «Area · etichetta», la sola Area se la planimetria non ha un'etichetta
 *  (com'era), il nome della mappa se non sta in un'Area. */
export function nomeDelPostoDellaMappa(mappa: { nome: string; area?: { nome: string; versioneEtichetta?: string | null } | null }): string {
  return nomeCompletoPlanimetria(mappa.area?.nome, mappa.area?.versioneEtichetta) ?? mappa.area?.nome ?? mappa.nome;
}
