// ============================================================
// IconaAzione / IconaScheda / IconaSegno — icona di un'azione, di una scheda o di un dato: asset `ui/azione-<chiave>` / `ui/scheda-<chiave>` / `ui/segno-<chiave>` (prompt §17 / §16 / §27), riserva SVG in codice
// ============================================================
//
// Le chiavi sono il censimento degli asset richiesti a Codex: aggiungere una chiave qui significa aggiungere una riga ai prompt.
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { IconAdatta, IconAlbero, IconAllarme, IconAltro, IconAnnullaCerchio, IconAppunti, IconApri, IconBersaglio, IconCarte, IconCerchio, IconCestino, IconCiclo, IconCompletati, IconDettagli, IconElenco, IconEvoca, IconFilm, IconFiltro, IconGioca, IconGioco, IconIndietro, IconLibro, IconLucchettoAperto, IconLucchettoChiuso, IconMappa, IconMaschera, IconMatita, IconMedaglia, IconMeno, IconMessaggio, IconNegozio, IconNuvola, IconOrologio, IconPersone, IconPianta, IconPiu, IconPodio, IconPosizione, IconRegalo, IconRicalcola, IconRicetta, IconRiepilogo, IconSpunta, IconStella, IconUscita, IconZoomMeno, IconZoomPiu } from './iconeGuida';

export type ChiaveAzione = 'negozio' | 'regalo' | 'uscita' | 'annulla-ultimo' | 'sbloccato' | 'bloccato' | 'note' | 'modifica' | 'sms' | 'esame-primo' | 'esame-top10' | 'fortuna' | 'libro' | 'evoca' | 'esegui' | 'allarme' | 'elimina' | 'ricalcola' | 'riapri' | 'albero' | 'ricetta' | 'piano' | 'scheda' | 'raggiunto' | 'annulla' | 'tutti' | 'aperti' | 'obiettivo' | 'carica-altri' | 'seleziona' | 'deseleziona' | 'riprova' | 'registra' | 'accettata' | 'esaurito' | 'calendario' | 'adatta' | 'riduci' | 'ingrandisci' | 'mappa' | 'attiva' | 'chiudi' | 'url' | 'carica' | 'indietro' | 'filtri' | 'copia' | 'incolla'
  // Aggiunte col rifacimento delle pagine: **nessun pulsante di solo testo**, quindi ogni gesto
  // nuovo porta qui la sua chiave, con la riserva SVG qui sotto e la riga nel censimento
  // (`docs/grafica/fabbisogno.md`, voce 7) perché Codex ne generi l'immagine.
  | 'piu' | 'meno' | 'completati' | 'dettagli' | 'pianta' | 'posizione';
export type ChiaveScheda = 'oggi' | 'doti' | 'confidenti' | 'letture' | 'scorta' | 'compendio' | 'obiettivi' | 'piani' | 'cicli' | 'storico' | 'riepilogo' | 'fusione-speciali' | 'fusione-forca' | 'fusione-cicli' | 'fusione-skill' | 'fusione-piani' | 'fusione-con' | 'fusione-ricette' | 'fusione-calcolatore'
  // Le schede di Trofei e finali, Sfide, Oggetti e Richieste: erano barre di sole parole, e con
  // l'immagine sopra l'etichetta (la forma che l'utente ha indicato) senza figura resterebbero
  // tessere vuote. Riserva SVG qui sotto, riga nel censimento §25 perché Codex generi l'immagine.
  | 'trofei' | 'finali' | 'dlc' | 'meteo' | 'nuova-partita' | 'tempo'
  | 'sfide-battaglia' | 'boss' | 'magnate' | 'tratti'
  | 'jose' | 'personalizzazione' | 'scambi'
  // «Denaro e squadra»: i yen del gruppo e i livelli dei dieci Ladri. Riserva SVG qui sotto, riga
  // nel censimento (§28) perché Codex ne generi la figura.
  | 'squadra';

/** I segni dei **dati**: non un gesto da fare né una scheda da aprire, ma il numero che si legge.
 *
 * Le tessere dei conteggi (`.kpi-tile` e i due `Numero` di Covo e Videogiochi), le tre pastiglie
 * della finestra di un Palazzo e il cartellino «Da verificare» erano le ultime schermate di sole
 * parole: un numero grande e un'etichetta minuscola tutta uguale alle altre. Il segno sta
 * **accanto all'etichetta**, mai al posto del numero, e a 14–16 px basta a distinguere una
 * tessera dall'altra prima di leggerla. */
export type ChiaveSegno = 'iniziati' | 'completati' | 'sessioni' | 'visioni' | 'round' | 'medaglie' | 'catalogo' | 'sfide'
  | 'si-apre' | 'furto' | 'scade' | 'da-verificare';

const RISERVA_AZIONE: Record<ChiaveAzione, (dimensione: number) => ReactNode> = {
  'regalo': (d) => <IconRegalo size={d} />,
  'uscita': (d) => <IconUscita size={d} />,
  'annulla-ultimo': (d) => <IconIndietro size={d} />,
  'sbloccato': (d) => <IconLucchettoAperto size={d} />,
  'bloccato': (d) => <IconLucchettoChiuso size={d} />,
  'note': (d) => <IconMatita size={d} />,
  'modifica': (d) => <IconMatita size={d} />,
  'sms': (d) => <IconMessaggio size={d} />,
  'esame-primo': (d) => <IconMedaglia size={d} />,
  'esame-top10': (d) => <IconPodio size={d} />,
  'fortuna': (d) => <IconEvoca size={d} />,
  'libro': (d) => <IconLibro size={d} />,
  'evoca': (d) => <IconEvoca size={d} />,
  'esegui': (d) => <IconGioca size={d} />,
  'allarme': (d) => <IconAllarme size={d} />,
  'elimina': (d) => <IconCestino size={d} />,
  'ricalcola': (d) => <IconRicalcola size={d} />,
  'riapri': (d) => <IconRicalcola size={d} />,
  'albero': (d) => <IconAlbero size={d} />,
  'ricetta': (d) => <IconRicetta size={d} />,
  'piano': (d) => <IconAppunti size={d} />,
  'scheda': (d) => <IconApri size={d} />,
  'raggiunto': (d) => <IconSpunta size={d} />,
  'annulla': (d) => <IconAnnullaCerchio size={d} />,
  'tutti': (d) => <IconElenco size={d} />,
  'aperti': (d) => <IconCerchio size={d} />,
  'obiettivo': (d) => <IconBersaglio size={d} />,
  'carica-altri': (d) => <IconAltro size={d} />,
  'seleziona': (d) => <IconSpunta size={d} />,
  'deseleziona': (d) => <IconAnnullaCerchio size={d} />,
  'riprova': (d) => <IconRicalcola size={d} />,
  'registra': (d) => <IconLibro size={d} />,
  'negozio': (d) => <IconNegozio size={d} />,
  'filtri': (d) => <IconFiltro size={d} />,
  'copia': (d) => <IconCarte size={d} />,
  'incolla': (d) => <IconAppunti size={d} />,
  'accettata': (d) => <IconSpunta size={d} />,
  'esaurito': (d) => <IconAnnullaCerchio size={d} />,
  'calendario': (d) => <IconOrologio size={d} />,
  'adatta': (d) => <IconAdatta size={d} />,
  'riduci': (d) => <IconZoomMeno size={d} />,
  'ingrandisci': (d) => <IconZoomPiu size={d} />,
  'mappa': (d) => <IconMappa size={d} />,
  'attiva': (d) => <IconGioca size={d} />,
  'chiudi': (d) => <IconAnnullaCerchio size={d} />,
  'url': (d) => <IconApri size={d} />,
  'carica': (d) => <IconAltro size={d} />,
  'indietro': (d) => <IconIndietro size={d} />,
  'piu': (d) => <IconPiu size={d} />,
  'meno': (d) => <IconMeno size={d} />,
  'completati': (d) => <IconCompletati size={d} />,
  'dettagli': (d) => <IconDettagli size={d} />,
  'pianta': (d) => <IconPianta size={d} />,
  'posizione': (d) => <IconPosizione size={d} />,
};

const RISERVA_SCHEDA: Record<ChiaveScheda, (dimensione: number) => ReactNode> = {
  oggi: (d) => <IconOrologio size={d} />,
  doti: (d) => <IconStella size={d} />,
  confidenti: (d) => <IconPersone size={d} />,
  scorta: (d) => <IconCarte size={d} />,
  // «Letture e giochi»: il libro e' il segno piu' riconoscibile dei tre insiemi.
  letture: (d) => <IconLibro size={d} />,
  compendio: (d) => <IconLibro size={d} />,
  obiettivi: (d) => <IconBersaglio size={d} />,
  piani: (d) => <IconAppunti size={d} />,
  cicli: (d) => <IconCiclo size={d} />,
  storico: (d) => <IconOrologio size={d} />,
  riepilogo: (d) => <IconRiepilogo size={d} />,
  'fusione-speciali': (d) => <IconRegalo size={d} />,
  'fusione-forca': (d) => <IconMedaglia size={d} />,
  'fusione-cicli': (d) => <IconCiclo size={d} />,
  'fusione-skill': (d) => <IconStella size={d} />,
  'fusione-piani': (d) => <IconAppunti size={d} />,
  'fusione-con': (d) => <IconAlbero size={d} />,
  'fusione-ricette': (d) => <IconRicetta size={d} />,
  'fusione-calcolatore': (d) => <IconEvoca size={d} />,
  // ---- schede aggiunte con le tessere (§25): riserve in attesa delle figure ----
  trofei: (d) => <IconMedaglia size={d} />,
  finali: (d) => <IconMaschera size={d} />,
  dlc: (d) => <IconRegalo size={d} />,
  meteo: (d) => <IconNuvola size={d} />,
  'nuova-partita': (d) => <IconRicalcola size={d} />,
  tempo: (d) => <IconOrologio size={d} />,
  'sfide-battaglia': (d) => <IconBersaglio size={d} />,
  boss: (d) => <IconAllarme size={d} />,
  magnate: (d) => <IconPodio size={d} />,
  tratti: (d) => <IconStella size={d} />,
  jose: (d) => <IconGioca size={d} />,
  personalizzazione: (d) => <IconMatita size={d} />,
  scambi: (d) => <IconCiclo size={d} />,
  // Le persone: la scheda parla dei dieci Ladri prima che dei loro yen.
  squadra: (d) => <IconPersone size={d} />,
};

const RISERVA_SEGNO: Record<ChiaveSegno, (dimensione: number) => ReactNode> = {
  // «Titoli iniziati», «Giochi», «Accettate»: qualcosa di aperto e non finito.
  iniziati: (d) => <IconLibro size={d} />,
  completati: (d) => <IconCompletati size={d} />,
  sessioni: (d) => <IconOrologio size={d} />,
  visioni: (d) => <IconFilm size={d} />,
  round: (d) => <IconGioco size={d} />,
  medaglie: (d) => <IconMedaglia size={d} />,
  catalogo: (d) => <IconElenco size={d} />,
  sfide: (d) => <IconBersaglio size={d} />,
  'si-apre': (d) => <IconLucchettoAperto size={d} />,
  // Il biglietto del furto è la carta da visita dei Ladri: la stessa figura del mazzo.
  furto: (d) => <IconCarte size={d} />,
  scade: (d) => <IconAllarme size={d} />,
  // Documento con la lente: è esattamente ciò che il cartellino dice, «va controllato».
  'da-verificare': (d) => <IconDettagli size={d} />,
};

interface Props<C extends string> {
  chiave: C;
  /** Lato in px (default 24). Dentro un PulsanteVisivo/CollegamentoVisivo è ininfluente: il riquadro del pulsante impone la dimensione via CSS (40/32/48 px). */
  dimensione?: number;
  className?: string;
}

/** Icona decorativa di un'azione (il nome accessibile lo dà il pulsante che la contiene). */
export function IconaAzione({ chiave, dimensione = 24, className }: Props<ChiaveAzione>) {
  return <AssetImg nome={`ui/azione-${chiave}`} alt="" decorativa className={`object-contain ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} fallback={RISERVA_AZIONE[chiave](dimensione)} />;
}

/** Icona decorativa di una scheda della Partita. */
export function IconaScheda({ chiave, dimensione = 16, className }: Props<ChiaveScheda>) {
  return <AssetImg nome={`ui/scheda-${chiave}`} alt="" decorativa className={`object-contain ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} fallback={RISERVA_SCHEDA[chiave](dimensione)} />;
}

/** Segno decorativo accanto all'etichetta di un dato: il testo resta e dice tutto, questo aiuta a
 *  ritrovarlo. Dimensione piccola per scelta — è un contorno, non un'illustrazione. */
export function IconaSegno({ chiave, dimensione = 15, className }: Props<ChiaveSegno>) {
  return <AssetImg nome={`ui/segno-${chiave}`} alt="" decorativa className={`shrink-0 object-contain ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} fallback={RISERVA_SEGNO[chiave](dimensione)} />;
}
