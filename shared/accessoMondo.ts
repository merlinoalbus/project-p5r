import type { DestinazioneGuidaDto } from './organizzazioneMappe.js';
/** Accessi al medesimo atlante dalle diverse sezioni della guida. */
export const TIPI_ACCESSO_MONDO = ['mappa', 'quartiere', 'dungeon', 'area', 'luogo', 'negozio', 'punto', 'confidente', 'articolo', 'attivita'] as const;
export type TipoAccessoMondo = (typeof TIPI_ACCESSO_MONDO)[number];

export interface DestinazioneMondoDto {
  mappa: string;
  nomeMappa: string;
  spillo: number | null;
  nomeSpillo: string | null;
  centro: { x: number; y: number; zoom: number } | null;
  provenienze: Array<{ tipo: TipoAccessoMondo; chiave: string; criterio: 'mappa-diretta' | 'entita-mappa' | 'riferimento-spillo' | 'ingresso-quartiere' | 'posto-dichiarato' }>;
}

export interface AccessoMondoDto {
  entita: { tipo: TipoAccessoMondo; chiave: string };
  esito: 'unica' | 'multipla' | 'assente';
  destinazioni: DestinazioneMondoDto[];
  guide?: DestinazioneGuidaDto[];
}

/** Un solo formato di URL per tutti gli accessi. Coordinate solo se registrate. */
export function urlDestinazioneMondo(d: DestinazioneMondoDto): string {
  const q = new URLSearchParams();
  if (d.spillo !== null) q.set('spillo', String(d.spillo));
  if (d.centro) {
    q.set('x', String(d.centro.x));
    q.set('y', String(d.centro.y));
    q.set('zoom', String(d.centro.zoom));
  }
  return `/guida/mappe/${encodeURIComponent(d.mappa)}${q.size ? '?' + q.toString() : ''}`;
}
