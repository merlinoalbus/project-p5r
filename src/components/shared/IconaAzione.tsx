// ============================================================
// IconaAzione / IconaScheda — icona di un'azione o di una scheda: asset `ui/azione-<chiave>` / `ui/scheda-<chiave>` (prompt §17 / §16), riserva SVG in codice
// ============================================================
//
// Le chiavi sono il censimento degli asset richiesti a Codex: aggiungere una chiave qui significa aggiungere una riga ai prompt.
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { IconAlbero, IconAllarme, IconAltro, IconAnnullaCerchio, IconAppunti, IconApri, IconBersaglio, IconCarte, IconCerchio, IconCestino, IconCiclo, IconElenco, IconEvoca, IconGioca, IconIndietro, IconLibro, IconLucchettoAperto, IconLucchettoChiuso, IconMappa, IconMatita, IconMedaglia, IconMessaggio, IconNegozio, IconOrologio, IconPersone, IconPodio, IconRegalo, IconRicalcola, IconRicetta, IconRiepilogo, IconSpunta, IconStella, IconUscita, IconFiltro, IconAdatta, IconZoomMeno, IconZoomPiu } from './iconeGuida';

export type ChiaveAzione = 'negozio' | 'regalo' | 'uscita' | 'annulla-ultimo' | 'sbloccato' | 'bloccato' | 'note' | 'modifica' | 'sms' | 'esame-primo' | 'esame-top10' | 'fortuna' | 'libro' | 'evoca' | 'esegui' | 'allarme' | 'elimina' | 'ricalcola' | 'riapri' | 'albero' | 'ricetta' | 'piano' | 'scheda' | 'raggiunto' | 'annulla' | 'tutti' | 'aperti' | 'obiettivo' | 'carica-altri' | 'seleziona' | 'deseleziona' | 'riprova' | 'registra' | 'accettata' | 'esaurito' | 'calendario' | 'adatta' | 'riduci' | 'ingrandisci' | 'mappa' | 'attiva' | 'chiudi' | 'url' | 'carica' | 'indietro' | 'filtri' | 'copia' | 'incolla';
export type ChiaveScheda = 'oggi' | 'doti' | 'confidenti' | 'scorta' | 'compendio' | 'obiettivi' | 'piani' | 'cicli' | 'storico' | 'riepilogo' | 'fusione-speciali' | 'fusione-forca' | 'fusione-cicli' | 'fusione-skill' | 'fusione-piani' | 'fusione-con' | 'fusione-ricette' | 'fusione-calcolatore';

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
};

const RISERVA_SCHEDA: Record<ChiaveScheda, (dimensione: number) => ReactNode> = {
  oggi: (d) => <IconOrologio size={d} />,
  doti: (d) => <IconStella size={d} />,
  confidenti: (d) => <IconPersone size={d} />,
  scorta: (d) => <IconCarte size={d} />,
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
