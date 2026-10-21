/** Riferimenti diretti sulle righe originali della guida; il nome sorgente non viene rinominato. */
export interface NodoCatalogoGuida { fonte: string; nodo: Record<string, unknown> }
/** La 121 scrive puntatori operativi soltanto qui. Audit e snapshot sono fotografie immutabili. */
export const BLOCCHI_GUIDA_CATALOGO = ['oggetti-guida'] as const;
export const eBloccoGuidaCatalogo = (chiave: unknown): boolean => BLOCCHI_GUIDA_CATALOGO.some((k) => k === chiave);

export function fonteNodoGuida(sezione: string, nodo: { nome: string; catalogoFonte?: string }): string {
  return nodo.catalogoFonte ?? `${sezione}/${nodo.nome}`;
}

export function nodiCatalogoGuida(valore: unknown): NodoCatalogoGuida[] {
  if (!valore || typeof valore !== 'object' || Array.isArray(valore)) return [];
  const guida = valore as Record<string, unknown>;
  const abiti = guida.abiti && typeof guida.abiti === 'object' ? guida.abiti as Record<string, unknown> : {};
  const out: NodoCatalogoGuida[] = [];
  const viste = new Set<string>();
  for (const [sezione, righe] of [['consumabili', guida.consumabili], ['chiave-e-materiali', guida.chiaveEMateriali], ['abiti', abiti.elenco]] as const) {
    if (!Array.isArray(righe)) continue;
    for (const valoreRiga of righe as unknown[]) {
      if (!valoreRiga || typeof valoreRiga !== 'object' || Array.isArray(valoreRiga)) continue;
      const nodo = valoreRiga as Record<string, unknown>;
      if (typeof nodo.nome !== 'string' || !nodo.nome.trim()) continue;
      const fonte = typeof nodo.catalogoFonte === 'string' ? nodo.catalogoFonte : `${sezione}/${nodo.nome}`;
      if (viste.has(fonte)) throw new Error('La guida contiene due righe con la stessa identità sorgente: occorre distinguerle prima di convertirne i riferimenti.');
      viste.add(fonte); out.push({ fonte, nodo });
    }
  }
  return out;
}

/** Visita soltanto i puntatori dichiarati, anche annidati. Nessuna sostituzione nelle stringhe. */
export function cambiaRiferimentiCatalogoGuida(valore: unknown, da: string, a: string | null): number {
  if (!valore || typeof valore !== 'object') return 0;
  if (Array.isArray(valore)) return (valore as unknown[]).reduce<number>((n, v) => n + cambiaRiferimentiCatalogoGuida(v, da, a), 0);
  const r = valore as Record<string, unknown>;
  let cambiati = 0;
  if (r.catalogoChiave === da) { r.catalogoChiave = a; cambiati++; }
  for (const [k, v] of Object.entries(r)) if (k !== 'catalogoChiave') cambiati += cambiaRiferimentiCatalogoGuida(v, da, a);
  return cambiati;
}

/** Ripristina i soli puntatori modificati dall'operazione, conservando testo, ordine e correzioni successive. */
export function ripristinaPuntatoriGuida(prima: unknown, dopo: unknown, ora: unknown): { valore: unknown; conflitti: boolean } {
  const copia: unknown = structuredClone(ora);
  let conflitti = false;
  const visita = (p: unknown, d: unknown, o: unknown): void => {
    if (!p || !d || !o || typeof p !== 'object' || typeof d !== 'object' || typeof o !== 'object') {
      if (JSON.stringify(p)?.includes('"catalogoChiave"') && JSON.stringify(p) !== JSON.stringify(d)) conflitti = true;
      return;
    }
    if (Array.isArray(p) && Array.isArray(d) && Array.isArray(o)) {
      const identita = (v: unknown): string | null => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
        const r = v as Record<string, unknown>;
        for (const k of ['catalogoFonte', 'uid', 'chiave', 'nome', 'attrezzo']) if (typeof r[k] === 'string') return `${k}/${r[k]}`;
        return null;
      };
      for (const v of p as unknown[]) {
        const k = identita(v);
        if (!k) { if (JSON.stringify(v)?.includes('"catalogoChiave"')) conflitti = true; continue; }
        const ds = (d as unknown[]).filter((x) => identita(x) === k);
        const os = (o as unknown[]).filter((x) => identita(x) === k);
        if (ds.length !== 1 || os.length !== 1) { if (JSON.stringify(v).includes('"catalogoChiave"')) conflitti = true; continue; }
        visita(v, ds[0], os[0]);
      }
      return;
    }
    if (Array.isArray(p) || Array.isArray(d) || Array.isArray(o)) { conflitti = true; return; }
    const pp = p as Record<string, unknown>, dd = d as Record<string, unknown>, oo = o as Record<string, unknown>;
    if (pp.catalogoChiave !== dd.catalogoChiave) {
      if (oo.catalogoChiave === dd.catalogoChiave) {
        if ('catalogoChiave' in pp) oo.catalogoChiave = pp.catalogoChiave; else delete oo.catalogoChiave;
      } else if (oo.catalogoChiave !== pp.catalogoChiave) conflitti = true;
    }
    for (const k of Object.keys(pp)) if (k !== 'catalogoChiave') visita(pp[k], dd[k], oo[k]);
  };
  visita(prima, dopo, copia);
  return { valore: copia, conflitti };
}
