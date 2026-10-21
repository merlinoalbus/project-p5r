// Conversione congelata della fonte completa di Jose; nessun dato di apertura viene scritto nella partita.
const DEDALI = [
  ['Aiyatsbus', 'dedalo-aiyatsbus-aperto'], ['Chemdah', 'dedalo-chemdah-aperto'],
  ['Kaitul', 'dedalo-kaitul-aperto'], ['Akzeriyyuth', 'dedalo-akzeriyyuth-aperto'],
  ['Adyeshach', 'dedalo-adyeshach-aperto'], ['Sheriruth', 'dedalo-sheriruth-aperto'],
  ["Da'at", 'dedalo-daat-aperto'],
] as const;

interface ScambioJose {
  nome: string; effetto: string; fiori: number; requisito: string; categoria: 'consumabile' | 'materiale';
  condizioni: Array<{ tipo: 'evento'; evento: string }>;
}

/** La fonte è dati_guida.jose.scambi, non la copia incompleta da 24 righe né la prosa delle date. */
export function scambiJose121(valore: unknown): ScambioJose[] {
  if (!Array.isArray(valore)) throw new Error('Scambi di Jose non leggibili: la conversione non nasconde la fonte.');
  const nomi = new Set<string>();
  return valore.map((v: unknown) => {
    const r = v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
    const nome = typeof r.nome === 'string' ? r.nome.trim() : '';
    const requisito = typeof r.requisito === 'string' ? r.requisito.trim().replace(/’/g, "'") : '';
    const dedalo = DEDALI.find(([n]) => requisito === `Aver sbloccato il Dedalo di ${n}`);
    const fiori = typeof r.costo === 'number' ? r.costo : typeof r.costo === 'string' && /^\d+$/.test(r.costo) ? Number(r.costo) : NaN;
    const normalizzato = nome.replace(/’/g, "'").toLocaleLowerCase('it-IT');
    if (!nome || nomi.has(normalizzato) || !dedalo || !Number.isSafeInteger(fiori) || fiori <= 0 || fiori > 9_999_999
      || typeof r.effetto !== 'string') throw new Error('Nome, costo o requisito di Jose non convertibile: nessuna disponibilità viene inventata.');
    nomi.add(normalizzato);
    return { nome, effetto: r.effetto, fiori, requisito: String(r.requisito),
      categoria: ['carta bianca', 'kogatana nera', "replica d'arma", 'veste nera'].includes(normalizzato) ? 'materiale' : 'consumabile',
      condizioni: [{ tipo: 'evento', evento: dedalo[1] }] };
  });
}
