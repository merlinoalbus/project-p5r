/** Identificazione pura: condivisa da lettura e migrazioni, senza aprire un database globale. */
export function palazzoDiIngresso(spillo: { mappa_chiave: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; seed_identita_json?: string | null }, destinazione: string | null, palazzi: ReadonlyMap<string, string>): string | null {
  let seed: string | null = null;
  if (spillo.seed_identita_json) {
    try {
      const i = JSON.parse(spillo.seed_identita_json) as { riferimento?: { tipo?: string; chiave?: string } | null };
      if (i.riferimento?.tipo === 'mappa') seed = i.riferimento.chiave ?? null;
    } catch { /* Identità illeggibile: non si indovina una destinazione. */ }
  }
  const verso = spillo.riferimento_tipo === 'mappa' && spillo.riferimento_chiave ? spillo.riferimento_chiave : destinazione ?? seed;
  const dungeon = verso ? palazzi.get(verso) : undefined;
  return !dungeon || spillo.mappa_chiave && palazzi.get(spillo.mappa_chiave) === dungeon ? null : dungeon;
}
