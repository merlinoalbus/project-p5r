// ============================================================
// Elementi, affinità e statistiche — colori e ordinamenti per l'interfaccia
// ============================================================

/** Chiave elemento → nome del token colore in tailwind.css (`--color-el-*`). */
const TOKEN_ELEMENTO: Record<string, string> = {
  phys: 'fisico',
  gun: 'arma',
  fire: 'fuoco',
  ice: 'ghiaccio',
  electric: 'elettricita',
  wind: 'vento',
  psy: 'psichico',
  nuclear: 'nucleare',
  bless: 'sacro',
  curse: 'oscurita',
  almighty: 'quasidivino',
  healing: 'cura',
  ailment: 'alterazione',
  support: 'supporto',
  passive: 'passiva',
  trait: 'tratto',
};

/** Colore CSS di un elemento (variabile del tema). */
export function coloreElemento(elemento: string): string {
  const token = TOKEN_ELEMENTO[elemento] ?? 'passiva';
  return `var(--color-el-${token})`;
}

/** Ordine di presentazione degli elementi delle skill. */
export const ORDINE_ELEMENTI_SKILL = [
  'phys', 'gun', 'fire', 'ice', 'electric', 'wind', 'psy', 'nuclear', 'bless', 'curse', 'almighty', 'ailment', 'healing', 'support', 'passive', 'trait',
];

/** Stile visivo dei codici di affinità. */
export const STILE_AFFINITA: Record<string, { classe: string; titolo: string }> = {
  '-': { classe: 'bg-bg-tertiary text-text-muted', titolo: 'Normale' },
  wk: { classe: 'bg-error/25 text-error font-bold', titolo: 'Debole' },
  rs: { classe: 'bg-info/20 text-info', titolo: 'Resiste' },
  nu: { classe: 'bg-text-secondary/20 text-text', titolo: 'Annulla' },
  rp: { classe: 'bg-warning/25 text-warning font-bold', titolo: 'Riflette' },
  ab: { classe: 'bg-success/25 text-success font-bold', titolo: 'Assorbe' },
};

/** Chiavi delle statistiche nell'ordine di gioco. */
export const ORDINE_STATISTICHE = ['forza', 'magia', 'resistenza', 'agilita', 'fortuna'] as const;

/** Sigla mostrata quando il glossario non è disponibile. */
export const SIGLA_STATISTICA: Record<(typeof ORDINE_STATISTICHE)[number], string> = {
  forza: 'FR',
  magia: 'MA',
  resistenza: 'RS',
  agilita: 'AG',
  fortuna: 'FO',
};
