// ============================================================
// oggetti — come si mostra un oggetto dell'archivio unico (nome, archivio, chiave composta)
// ============================================================

import type { OggettoSelezionabileDto } from '../types';

export const NOME_ARCHIVIO: Record<OggettoSelezionabileDto['fonte'], string> = {
  equipaggiamento: 'Equipaggiamento', guida: 'Guida', libri: 'Libri', film: 'Film e DVD', videogiochi: 'Videogiochi',
};

/** Nome da mostrare: quello italiano con l'originale fra parentesi quando sono diversi, altrimenti l'originale. */
export const etichettaOggetto = (o: OggettoSelezionabileDto) => (o.nomeIt && o.nomeIt !== o.nome ? `${o.nomeIt} (${o.nome})` : o.nome);
/** Chiave unica fra tutti gli archivi: `<fonte>/<chiave>`. */
export const chiaveOggetto = (o: Pick<OggettoSelezionabileDto, 'fonte' | 'chiave'>) => `${o.fonte}/${o.chiave}`;
