// ============================================================
// skillPersonaLogica — le skill di una Persona come righe dell'editor e come testi del registro (L11 · R11-15/3)
// ============================================================
//
// Il registro dei ripristini (`persona`, campo `skill`) scrive le skill come testi «<nome canonico> @ <livello>» (livello 0 = innata) oppure
// «<nome> @ risveglio|rango|terza-forma». Qui la conversione nei due sensi e il controllo che il server rifarebbe (stesso senso, stesso italiano).
// ============================================================

export type Modo = 'livello' | 'iniziale' | 'risveglio' | 'rango' | 'terza-forma';
export interface RigaSkill { nome: string; modo: Modo; livello: number | null }

export const NOMI_MODO: Record<Modo, string> = { livello: 'A un livello', iniziale: 'Innata', risveglio: 'Risveglio', rango: 'Rango del Confidente', 'terza-forma': '3ª forma' };
export const MODI_SENZA_LIVELLO: Modo[] = ['risveglio', 'rango', 'terza-forma'];
export const RIGA_VUOTA: RigaSkill = { nome: '', modo: 'livello', livello: null };

/** «nome @ livello» → la riga dell'editor (il livello 0 è «Innata»). */
export function leggiSkill(testo: string): RigaSkill {
  const i = testo.lastIndexOf(' @ ');
  if (i < 0) return { nome: testo.trim(), modo: 'livello', livello: null };
  const nome = testo.slice(0, i).trim();
  const dopo = testo.slice(i + 3).trim();
  if ((MODI_SENZA_LIVELLO as string[]).includes(dopo)) return { nome, modo: dopo as Modo, livello: null };
  if (dopo === '') return { nome, modo: 'livello', livello: null };
  const n = Number(dopo);
  if (n === 0) return { nome, modo: 'iniziale', livello: null };
  return { nome, modo: 'livello', livello: Number.isFinite(n) ? n : null };
}

/** La riga dell'editor → «nome @ livello». */
export function scriviSkill(r: RigaSkill): string {
  if (r.modo === 'iniziale') return `${r.nome} @ 0`;
  if (r.modo === 'livello') return `${r.nome} @ ${r.livello ?? ''}`;
  return `${r.nome} @ ${r.modo}`;
}

/** Il primo problema dell'elenco di skill, in italiano (`null` se va bene). `nomeDi` rende il nome da mostrare (di default quello canonico). */
export function problemaSkill(voci: readonly string[], nomeDi: (nome: string) => string = (n) => n): string | null {
  const viste = new Set<string>();
  for (const testo of voci) {
    const r = leggiSkill(testo);
    if (r.nome === '') return 'Scegli la skill in ogni riga, oppure togli la riga vuota.';
    if (viste.has(r.nome)) return `La skill «${nomeDi(r.nome)}» compare due volte: ogni skill può stare una sola volta.`;
    viste.add(r.nome);
    if (r.modo === 'livello' && (r.livello === null || !Number.isInteger(r.livello) || r.livello < 1 || r.livello > 99)) {
      return `Il livello di «${nomeDi(r.nome)}» deve essere un numero intero da 1 a 99 (per una skill dall'inizio scegli «Innata»).`;
    }
  }
  return null;
}
