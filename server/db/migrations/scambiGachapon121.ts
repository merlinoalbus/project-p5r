// Dati di conversione congelati: capsule casuali e baratti dell'Uomo avido non sono lo stesso articolo.
const CAPSULE = ['Minidominazione', 'Die-soujou', 'Decarabia addobbato', 'Strumento Girimehkala', 'Kin-Ki kink', 'Mothman muschiato'] as const;
export const FONTE_GACHAPON_121 = 'https://www.allgamestaff.it/persona-5-royal/scambi-oggetti-curiosi-venditori-nascosti/';

export function scambiGachapon121(offerte: unknown): Array<{
  capsula: string; nomeFonte: string; originale: string; risultati: Array<{ nome: string; categoria: string; nota: string | null }>;
}> {
  if (!Array.isArray(offerte)) throw new Error('Baratti Gachapon non leggibili: la fonte non viene scartata.');
  const viste = new Set<string>();
  return offerte.map((v: unknown) => {
    const r = v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
    const capsula = CAPSULE.find((c) => r.dai === `Capsula ${c}` || r.dai === c);
    if (!capsula || viste.has(capsula) || typeof r.ricevi !== 'string' || !r.ricevi.trim()) {
      throw new Error('Capsula o risultato Gachapon non riconosciuto: nessun baratto viene inventato.');
    }
    viste.add(capsula);
    const mothman = capsula === 'Mothman muschiato';
    if (mothman && r.ricevi !== "Replica d'arma (poi Balsamo vitale dal 5° scambio)") {
      throw new Error('La fonte di Mothman è cambiata: verificare la regola prima di convertirla.');
    }
    const nomi = mothman ? ["Replica d'arma", 'Balsamo vitale'] : r.ricevi.split(' + ').map((n) => n.trim());
    if (nomi.some((n) => !n || n.length > 300 || /[()]/.test(n))) throw new Error('Risultato Gachapon non nominativo: verificare la fonte.');
    return { capsula, nomeFonte: String(r.dai), originale: `Ricevi: ${r.ricevi} · Dai: ${String(r.dai)}${typeof r.note === 'string' ? ` · ${r.note}` : ''}`,
      risultati: nomi.map((nome, i) => ({ nome, categoria: nome === "Replica d'arma" ? 'materiale' : 'consumabile',
        nota: mothman ? i === 0 ? 'Alternativa: nei primi cinque scambi di Mothman. Non insieme al Balsamo vitale.'
          : 'Alternativa: dopo cinque Repliche d’arma ottenute da Mothman. Non insieme alla Replica d’arma.' : null })) };
  });
}
