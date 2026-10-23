// ============================================================
// maschere — dal nome di una maschera scritto dalla guida alla Persona del compendio (logica pura, senza database)
// ============================================================
//
// La guida scrive la maschera delle Ombre in italiano o in inglese («Bicorno», «Pixie», «Jack-o'-lantern»). Il compendio ha il nome canonico
// inglese e la resa italiana in `traduzione`. Questo file è l'unica regola di confronto per le scritture nuove (L8, R8-02): lo usano il
// servizio `server/services/maschere.ts` e le migrazioni di L8. Le tre copie storiche (`maschere.ts` prima di L8, migrazioni 101 e utente 019)
// restano com'erano, perché una migrazione applicata non si riscrive.
// ============================================================

/** Forma di confronto di un nome: minuscolo, senza accenti (decomposizione NFD e rimozione dei segni diacritici), ogni sequenza di caratteri
 *  che non è lettera o cifra ridotta a uno spazio, senza spazi ai bordi. */
export function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Varianti di nome usate dalla guida che non coincidono con il compendio (verificate sulle affinità). */
export const ALIAS_MASCHERE: Readonly<Record<string, string>> = { norna: 'Norn' };

/** La Persona del compendio come la vede l'indice: id, nome canonico e resa italiana. */
export interface PersonaDellIndice { id: number; nome: string; nomeIt: string }

/** L'indice nome (inglese e italiano, normalizzato) → Persona. */
export type IndicePersone = ReadonlyMap<string, PersonaDellIndice>;

/** Costruisce l'indice dalle Persona del compendio e dalle loro traduzioni (`nome canonico` → resa italiana). */
export function costruisciIndicePersone(persone: ReadonlyArray<{ id: number; nome: string }>, nomiIt: Readonly<Record<string, string>>): IndicePersone {
  const idx = new Map<string, PersonaDellIndice>();
  for (const p of persone) {
    const v = { id: p.id, nome: p.nome, nomeIt: nomiIt[p.nome] ?? p.nome };
    idx.set(normalizza(p.nome), v);
    if (nomiIt[p.nome]) idx.set(normalizza(nomiIt[p.nome]!), v);
  }
  return idx;
}

/** La Persona di un nome scritto dalla guida (anche con gli alias noti), o null se il compendio non la conosce. */
export function cercaPersonaPerNome(idx: IndicePersone, nome: unknown): PersonaDellIndice | null {
  if (typeof nome !== 'string' || !nome.trim()) return null;
  const chiave = normalizza(nome);
  const alias = ALIAS_MASCHERE[chiave];
  return idx.get(chiave) ?? (alias ? idx.get(normalizza(alias)) : undefined) ?? null;
}
