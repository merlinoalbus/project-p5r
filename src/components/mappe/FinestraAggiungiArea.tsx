// ============================================================
// FinestraAggiungiArea — un'Area nuova nel quartiere (L2, R2-23) o nel Palazzo (L3, R3-20): nome, prima planimetria, etichetta e,
// nel quartiere, il punto sull'illustrazione; nel Palazzo, le infiltrazioni da collegare
// ============================================================
//
// Un invio solo: il server crea in una transazione l'Area, la sua prima planimetria con l'immagine e il pin di passaggio
// sull'illustrazione del quartiere (o i legami con le infiltrazioni del Palazzo); un errore non lascia niente di scritto. Il punto è
// obbligatorio se il quartiere ha un'illustrazione da toccare; senza, si salta («potrai segnarla poi», con «Segna sull'illustrazione»).
// Nel Palazzo non c'è un'illustrazione con i passaggi: al suo posto le caselle delle infiltrazioni, con quella aperta già scelta (§4.3).
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { creaAreaMondo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { SceltaImmagine } from './SceltaImmagine';
import { erroreImmagine } from '../../utils/aree';
import { SceltaPunto } from './SceltaPunto';
import type { AreaDettaglioDto, QuartiereDettaglioDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Il Palazzo che riceve l'area (L3): le sue infiltrazioni e quella da preselezionare. */
export interface PalazzoNuovaArea { chiave: string; nome: string; infiltrazioni: Array<{ chiave: string; nome: string; ordine: number }>; preselezionata?: string | null }

type Props = {
  aperta: boolean;
  onChiudi: () => void;
  onCreata: (area: AreaDettaglioDto) => void;
} & ({ quartiere: QuartiereDettaglioDto; palazzo?: undefined } | { palazzo: PalazzoNuovaArea; quartiere?: undefined });

/** La finestra: nome e immagine obbligatori, etichetta facoltativa, punto sull'illustrazione (obbligatorio se c'è l'illustrazione) o
 *  infiltrazioni da collegare (Palazzo). */
export function FinestraAggiungiArea({ quartiere: q, palazzo, aperta, onChiudi, onCreata }: Props) {
  const [nome, setNome] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [etichetta, setEtichetta] = useState('');
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [infiltrazioni, setInfiltrazioni] = useState<string[]>(() => (palazzo?.preselezionata ? [palazzo.preselezionata] : []));
  const [occupato, setOccupato] = useState(false);
  const illustrazione = useImmagineMappa(q?.illustrazione ?? null);
  const nomeContenitore = q?.nome ?? palazzo!.nome;
  const pronto = !!nome.trim() && !!file && !erroreImmagine(file) && (!q || !illustrazione || !!punto) && !occupato;
  const salva = async () => {
    if (!file || !pronto) return;
    setOccupato(true);
    try {
      // nel Palazzo le infiltrazioni nell'ordine del Palazzo, non in quello in cui si sono spuntate
      const ordinate = palazzo ? palazzo.infiltrazioni.filter((x) => infiltrazioni.includes(x.chiave)).map((x) => x.chiave) : undefined;
      const area = q
        ? await creaAreaMondo(q.chiave, file, { nome: nome.trim(), etichetta: etichetta.trim() || undefined, ...(punto ?? {}) })
        : await creaAreaMondo({ tipo: 'dungeon', chiave: palazzo!.chiave }, file, { nome: nome.trim(), etichetta: etichetta.trim() || undefined, infiltrazioni: ordinate });
      notifica('success', `${area.nome} aggiunta a ${nomeContenitore}.`);
      onCreata(area);
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Area non aggiunta.');
    } finally {
      setOccupato(false);
    }
  };
  const cambiaInfiltrazione = (k: string, si: boolean) => setInfiltrazioni((x) => (si ? [...x, k] : x.filter((c) => c !== k)));
  return (
    <Modal titolo={`Aggiungi un’area a ${nomeContenitore}`} aperta={aperta} onChiudi={onChiudi} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo={occupato ? 'Salvataggio…' : 'Aggiungi area'} disabled={!pronto} onClick={() => void salva()} />
      </>}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 testo-13 font-semibold">Nome
          <input className="form-input touch" value={nome} maxLength={80} placeholder={q ? 'es. Central Street' : 'es. Sala del Tesoro'} onChange={(e) => setNome(e.target.value)} />
        </label>
        <SceltaImmagine file={file} onCambia={setFile} etichetta="Immagine della prima planimetria" />
        <label className="flex flex-col gap-1 testo-13 font-semibold">Etichetta della planimetria (facoltativa)
          <input className="form-input touch" value={etichetta} maxLength={80} placeholder={q ? 'es. porzione occidentale' : 'es. Livello 1'} onChange={(e) => setEtichetta(e.target.value)} />
        </label>
        {q && <div className="flex flex-col gap-1.5">
          <span className="testo-13 font-semibold">Dove sta in {q.nome}</span>
          {illustrazione
            ? <><SceltaPunto src={illustrazione} alt={`Illustrazione di ${q.nome}`} punto={punto} onPunto={setPunto} disabilitato={occupato} />
              <span className="testo-12 text-text-muted">{/* a parole, senza coordinate (UX2-9 a) */}{punto ? 'Punto scelto: il pin dell’area comparirà lì. Tocca un altro punto per spostarlo.' : 'Tocca l’illustrazione dove si entra nell’area: lì comparirà il suo pin.'}</span></>
            : <span className="testo-12 text-text-muted">{q.nome} non ha un’illustrazione da toccare: potrai segnarla poi.</span>}
        </div>}
        {palazzo && <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1 testo-13 font-semibold">Infiltrazioni da collegare</legend>
          {palazzo.infiltrazioni.length === 0 && <span className="testo-12 text-text-muted">{palazzo.nome} non ha ancora infiltrazioni: potrai collegarla poi.</span>}
          {palazzo.infiltrazioni.map((x) => (
            <label key={x.chiave} className="touch flex items-center gap-2 testo-13">
              <input type="checkbox" className="h-5 w-5 shrink-0" checked={infiltrazioni.includes(x.chiave)} onChange={(e) => cambiaInfiltrazione(x.chiave, e.target.checked)} />
              <span>{x.ordine + 1}. {x.nome}</span>
            </label>
          ))}
          <span className="testo-12 text-text-muted">Le voci della guida e i pin restano dove sono: il legame dice solo quali infiltrazioni passano di qui.</span>
        </fieldset>}
      </div>
    </Modal>
  );
}
