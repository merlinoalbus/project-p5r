// ============================================================
// oggetti — come si mostra un oggetto dell'archivio unico (nome, archivio, chiave composta)
// ============================================================

import type { OggettoSelezionabileDto } from '../types';

export const NOME_ARCHIVIO: Record<OggettoSelezionabileDto['fonte'], string> = {
  equipaggiamento: 'Equipaggiamento', guida: 'Guida', libri: 'Libri', film: 'Film e DVD', videogiochi: 'Videogiochi',
};

export const etichettaOggetto = (o: OggettoSelezionabileDto) => (o.nomeIt && o.nomeIt !== o.nome ? `${o.nomeIt} (${o.nome})` : o.nome);
export const chiaveOggetto = (o: Pick<OggettoSelezionabileDto, 'fonte' | 'chiave'>) => `${o.fonte}/${o.chiave}`;
