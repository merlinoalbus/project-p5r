// ============================================================
// I segni dei posti: sagome dei quartieri, stemmi dei Palazzi, il Covo — un solo posto da cui si prendono (L1, 2026-10-20)
// ============================================================
//
// Non sono l'immagine di una mappa (quella è `useImmagineMappa`: l'immagine caricata vince ovunque): sono i **segni** con cui un
// posto si riconosce — gli sprite `_lm` di `P5_MAPDATA.SPD` per i quartieri (il 105 di Shibuya, il Kabukichō di Shinjuku), lo
// stemma per i Palazzi (`EmblemaDungeon`). Decisione dell'utente (2026-10-20, «Illustrazione anche nelle schede»): sulla metro
// (`MappaTokyo`) restano i segni; nelle schede de La città e nelle intestazioni del quartiere e del Palazzo si vede
// l'illustrazione della mappa del posto, la stessa di visore e indice, e il segno ci sta sopra in un angolo
// (`IllustrazioneConSegno`); senza illustrazione resta il solo segno. Stanno nella grafica predefinita del database (famiglie
// `mappe` e `palazzi`) e si prendono dal manifesto (`useSegno`, `useRisolviSegno`), **senza guardare la preferenza «usa grafica
// predefinita»**: sono il modo in cui la metro e le schede dicono quale posto è quale, e con la preferenza spenta la metro restava
// fatta di sole linee e nodi (rilievo UX-2 e F7 del validatore; decisione del PM, 2026-10-21: «sagome e stemmi tornano visibili a
// prescindere dalla preferenza, come prima»). La preferenza decide solo il ripiego sull'asset dell'illustrazione e delle mappe
// (`useImmagineMappa`). Prima di L1 erano indirizzi fissi che ignoravano anche il manifesto; ora un segno che il manifesto non ha,
// o un file risultato rotto, non si chiede.
//
// Lo stemma nelle intestazioni dei Palazzi (`EmblemaDungeon`) segue invece la preferenza com'era prima di L1, col suo ripiego
// testuale (l'icona dell'arcano o l'iniziale).
//
// La chiave del file **è** la chiave del quartiere nel seed (`shujin-academy` compresa), quindi non serve una tabella di
// corrispondenza: serve che a chiederli sia una funzione sola. Il ripiego è **niente**: se il segno manca, l'immagine non c'è e
// resta il nome (la targa); una figura estranea al suo posto sarebbe peggio di uno spazio vuoto.
// ============================================================

import { useCallback, type SyntheticEvent } from 'react';
import { useAssetStore } from '../../stores/assetStore';

/** L'URL del segno `nome` dal manifesto, a prescindere dalla preferenza della grafica predefinita; null se il manifesto non lo ha
 *  o il file è risultato mancante. */
export function useSegno(nome: string | null | undefined): string | null {
  const url = useAssetStore((s) => (nome ? s.manifest?.file[nome] ?? null : null));
  const mancante = useAssetStore((s) => (nome ? s.mancanti[nome] === true : false));
  return url && !mancante ? url : null;
}

/** La stessa regola di `useSegno` per i segni scelti mentre si disegna (in un ciclo, dove un hook per segno non si può chiamare). */
export function useRisolviSegno(): (nome: string | null | undefined) => string | null {
  const file = useAssetStore((s) => s.manifest?.file);
  const mancanti = useAssetStore((s) => s.mancanti);
  return useCallback((nome: string | null | undefined) => (nome && file?.[nome] && !mancanti[nome] ? file[nome] : null), [file, mancanti]);
}

/** La sagoma originale di un quartiere sulla mappa di viaggio (chiave del manifesto). */
export const segnoQuartiere = (chiave: string): string => `mappe/lmap/tokyo/${chiave}`;

/** Lo stemma di un Palazzo (o dei Memento): i Palazzi non stanno nel foglio della mappa di viaggio e tengono il loro. */
export const segnoPalazzo = (chiave: string): string => `palazzi/${chiave}`;

/** Il Covo dei Ladri, la soffitta del Leblanc: nel gioco è una schermata del menu di Royal, non una fermata, e nel foglio degli
 *  sprite non c'è (voce 4 di `docs/grafica/fabbisogno.md`). Finché non arriva il manifesto non lo ha, e resta la targa. */
export const SEGNO_COVO = 'mappe/lmap/tokyo/covo-dei-ladri';

/** Ripiego neutro se un file risulta rotto: l'immagine sparisce **dal flusso** (`display: none`), non ne compare un'altra. */
export function nascondiSegnoAssente(e: SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.display = 'none';
}
