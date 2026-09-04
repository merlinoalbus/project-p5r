// ============================================================
// IconaAzione / IconaScheda — icona di un'azione o di una scheda: asset `ui/azione-<chiave>` / `ui/scheda-<chiave>` (prompt §17 / §16), riserva SVG in codice
// ============================================================
//
// Le chiavi sono il censimento degli asset richiesti a Codex: aggiungere una chiave qui significa aggiungere una riga ai prompt.
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { IconAlbero, IconAllarme, IconAltro, IconAnnullaCerchio, IconAppunti, IconApri, IconBersaglio, IconCarte, IconCerchio, IconCestino, IconCiclo, IconElenco, IconEvoca, IconGioca, IconIndietro, IconLibro, IconLucchettoAperto, IconLucchettoChiuso, IconMatita, IconMedaglia, IconMessaggio, IconOrologio, IconPersone, IconPodio, IconRegalo, IconRicalcola, IconRicetta, IconRiepilogo, IconSpunta, IconStella, IconUscita } from './iconeGuida';

export type ChiaveAzione = 'regalo' | 'uscita' | 'annulla-ultimo' | 'sbloccato' | 'bloccato' | 'note' | 'modifica' | 'sms' | 'esame-primo' | 'esame-top10' | 'fortuna' | 'libro' | 'evoca' | 'esegui' | 'allarme' | 'elimina' | 'ricalcola' | 'riapri' | 'albero' | 'ricetta' | 'piano' | 'scheda' | 'raggiunto' | 'annulla' | 'tutti' | 'aperti' | 'obiettivo' | 'carica-altri' | 'seleziona' | 'deseleziona' | 'riprova';
export type ChiaveScheda = 'doti' | 'confidenti' | 'scorta' | 'compendio' | 'obiettivi' | 'piani' | 'cicli' | 'storico' | 'riepilogo';

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
};

const RISERVA_SCHEDA: Record<ChiaveScheda, (dimensione: number) => ReactNode> = {
  doti: (d) => <IconStella size={d} />,
  confidenti: (d) => <IconPersone size={d} />,
  scorta: (d) => <IconCarte size={d} />,
  compendio: (d) => <IconLibro size={d} />,
  obiettivi: (d) => <IconBersaglio size={d} />,
  piani: (d) => <IconAppunti size={d} />,
  cicli: (d) => <IconCiclo size={d} />,
  storico: (d) => <IconOrologio size={d} />,
  riepilogo: (d) => <IconRiepilogo size={d} />,
};

interface Props<C extends string> {
  chiave: C;
  /** Lato in px (default 24). */
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
