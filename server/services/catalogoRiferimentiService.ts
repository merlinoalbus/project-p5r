// ============================================================
// catalogoRiferimentiService — catalogo di LINK alle immagini di riferimento, importabili nella propria istanza
// ============================================================
//
// `data/riferimenti/immagini.json` contiene solo URL (nessun file protetto nel repo): le immagini
// ufficiali di Arcani, Confidenti e Persona ospitate dal Megami Tensei Wiki. L'utente, dalle
// Impostazioni, può importarle nella PROPRIA istanza (DATA_DIR/immagini) per uso personale.
// Le immagini caricate dall'utente non vengono mai sovrascritte, salvo richiesta esplicita.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { AMBITI_IMMAGINE, importaImmagineDaUrl, leggiImmagine, type AmbitoImmagine } from './immaginiService.js';
import type { EsitoImportazioneCatalogoDto, VoceCatalogoDto } from '../../shared/types.js';

interface VoceFile {
  ambito: string;
  chiave: string;
  url: string;
  fonte?: string;
  nota?: string;
}

interface CatalogoFile {
  versione: number;
  nota?: string;
  voci: VoceFile[];
}

let cache: { percorso: string; voci: VoceFile[] } | null = null;

function percorsoCatalogo(): string {
  return path.join(config.riferimentiDir, 'immagini.json');
}

/** Legge (una volta) il catalogo dal disco; catalogo assente o malformato → vuoto con avviso nel log. */
function voci(): VoceFile[] {
  const percorso = percorsoCatalogo();
  if (cache && cache.percorso === percorso) return cache.voci;
  let lista: VoceFile[] = [];
  try {
    if (fs.existsSync(percorso)) {
      const dati = JSON.parse(fs.readFileSync(percorso, 'utf-8')) as Partial<CatalogoFile>;
      lista = Array.isArray(dati.voci)
        ? dati.voci.filter((v): v is VoceFile => !!v && typeof v.chiave === 'string' && typeof v.url === 'string' && (AMBITI_IMMAGINE as readonly string[]).includes(v.ambito))
        : [];
    }
  } catch (err) {
    logger.warn({ err, percorso }, 'catalogo dei riferimenti non leggibile: ignorato');
    lista = [];
  }
  cache = { percorso, voci: lista };
  return lista;
}

/** Svuota la cache (test e ricarichi). */
export function invalidaCatalogo(): void {
  cache = null;
}

/** Voci del catalogo (per ambito), con il flag `presente` = esiste già un'immagine per l'entità. */
export function elencaCatalogo(ambito?: AmbitoImmagine): VoceCatalogoDto[] {
  return voci()
    .filter((v) => !ambito || v.ambito === ambito)
    .map((v) => ({ ambito: v.ambito as AmbitoImmagine, chiave: v.chiave, url: v.url, fonte: v.fonte ?? null, nota: v.nota ?? null, presente: leggiImmagine(v.ambito, v.chiave) !== null }));
}

/** Numero massimo di voci per singola richiesta di importazione (il client procede a lotti). */
export const MAX_VOCI_PER_LOTTO = 20;

/**
 * Importa nella propria istanza le voci indicate (stesso ambito). Le entità con un'immagine già presente
 * vengono saltate salvo `sovrascrivi`; i fallimenti non interrompono il lotto e vengono riportati uno per uno.
 */
export async function importaDaCatalogo(ambito: AmbitoImmagine, chiavi: string[], sovrascrivi = false): Promise<EsitoImportazioneCatalogoDto> {
  const perChiave = new Map(voci().filter((v) => v.ambito === ambito).map((v) => [v.chiave, v]));
  const esito: EsitoImportazioneCatalogoDto = { importate: [], saltate: [], fallite: [] };
  for (const chiave of chiavi) {
    const voce = perChiave.get(chiave);
    if (!voce) {
      esito.fallite.push({ chiave, motivo: 'Voce non presente nel catalogo.' });
      continue;
    }
    if (!sovrascrivi && leggiImmagine(ambito, chiave)) {
      esito.saltate.push(chiave);
      continue;
    }
    try {
      await importaImmagineDaUrl(ambito, chiave, voce.url);
      esito.importate.push(chiave);
    } catch (err) {
      esito.fallite.push({ chiave, motivo: err instanceof Error ? err.message : String(err) });
    }
  }
  return esito;
}
