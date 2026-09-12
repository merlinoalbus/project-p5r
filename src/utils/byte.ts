/** Dimensione leggibile di un file (l'istanza sta nell'ordine dei MB). */
export function byteTesto(byte: number): string {
  if (byte <= 0) return '—';
  if (byte < 1024) return `${byte} byte`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toLocaleString('it-IT', { maximumFractionDigits: 0 })} kB`;
  return `${(byte / (1024 * 1024)).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`;
}
