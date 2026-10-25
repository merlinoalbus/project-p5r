// ============================================================
// FinestraModificaArea — nome e versioni di un'Area: rinomina, predefinita, etichette, ordine, elimina una versione (L2, R2-25)
// ============================================================
//
// Rinominare non cambia l'indirizzo (lo slug è fissato alla creazione). Le versioni si ordinano con ↑/↓ da 44 px; l'ultima versione
// non si elimina da sola (si elimina l'Area), e quella che l'ingresso del quartiere usa chiede conferma: lo decide il server (409),
// qui si mostra la sua frase e si chiede.
//
// L3 (R3-24, §4.3): nei Palazzi la stessa finestra ha anche le **infiltrazioni** che toccano l'area (caselle, nell'ordine del Palazzo):
// cambiarle riscrive i legami e non sposta voci né pin. Sostituisce la «Gestisci» delle planimetrie di prima.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { aggiornaAreaMondo, aggiornaPlanimetrieArea, collocaPlanimetria, eliminaMappa, impostaInfiltrazioniArea, isApiError } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { nomeVersione } from '../../utils/aree';
import type { AreaDettaglioDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  area: AreaDettaglioDto;
  aperta: boolean;
  onChiudi: () => void;
  /** Dopo ogni salvataggio: la pagina rilegge l'Area. */
  onSalvata: () => Promise<void> | void;
  /** Nei Palazzi (L3): le infiltrazioni del Palazzo, fra cui scegliere quelle che toccano l'area. */
  infiltrazioniPalazzo?: Array<{ chiave: string; nome: string; ordine: number }>;
  /** Nei Palazzi (L3, §4.3): le altre aree del Palazzo, dove spostare una versione («Sposta la versione in un'altra area»). */
  altreAree?: Array<{ slug: string; nome: string }>;
  /** Una versione spostata: l'area d'arrivo (la pagina la apre se quella di partenza è rimasta vuota, o se lo vuole). */
  onVersioneSpostata?: (arrivo: AreaDettaglioDto) => void;
}

/** «Un'area a sé»: la versione diventa un'area nuova del Palazzo (col nome scelto). */
const AREA_NUOVA = '__nuova';

/** La finestra: nome, planimetria predefinita, tabella delle versioni (etichetta, ↑/↓, «Apri nell'editor», elimina, nei Palazzi
 *  «Sposta…») e, nei Palazzi, le infiltrazioni. */
// L12 (passo 8): nel rilascio (sola lettura) la finestra non esiste; la condizione è costante di build, `FinestraModificaAreaReale` esce dal bundle
export const FinestraModificaArea: StrumentoDiModifica<typeof FinestraModificaAreaReale> = IN_RILASCIO ? NienteInRilascio : FinestraModificaAreaReale;
function FinestraModificaAreaReale({ area, aperta, onChiudi, onSalvata, infiltrazioniPalazzo, altreAree, onVersioneSpostata }: Props) {
  // «Sposta la versione in un'altra area» / «Rendila un'area a sé» (L3): la versione, la destinazione, il nome dell'area nuova e, se la
  // versione è l'unica dell'area, la frase del server da confermare (409 `area-si-svuota`: l'area va nel cestino con i suoi legami)
  const [spostamento, setSpostamento] = useState<{ chiave: string; verso: string; nome: string; svuota: string | null } | null>(null);
  const [nome, setNome] = useState(area.nome);
  const iniziali = (area.infiltrazioni ?? []).map((x) => x.chiave);
  const [infiltrazioni, setInfiltrazioni] = useState<string[]>(iniziali);
  const [predefinita, setPredefinita] = useState(area.predefinita ?? '');
  // la finestra si monta quando si apre (la pagina la rende solo aperta), quindi riparte sempre dai valori dell'Area
  const [etichette, setEtichette] = useState<Record<string, string>>(() => Object.fromEntries(area.planimetrie.map((p) => [p.chiave, p.etichetta ?? ''])));
  const [ordine, setOrdine] = useState<string[]>(() => area.planimetrie.map((p) => p.chiave));
  const [occupato, setOccupato] = useState(false);
  const [daConfermare, setDaConfermare] = useState<{ chiave: string; messaggio: string } | null>(null);
  const perChiave = new Map(area.planimetrie.map((p) => [p.chiave, p]));
  // una versione eliminata da qui sparisce anche dall'ordine (l'Area riletta non la ha più)
  const ordineVivo = ordine.filter((k) => perChiave.has(k));
  const sposta = (i: number, verso: -1 | 1) => { const n = [...ordineVivo]; [n[i], n[i + verso]] = [n[i + verso], n[i]]; setOrdine(n); };

  const salva = async () => {
    const nomeNuovo = nome.trim();
    if (!nomeNuovo) return;
    setOccupato(true);
    try {
      const cambiaArea: { nome?: string; predefinita?: string } = {};
      if (nomeNuovo !== area.nome) cambiaArea.nome = nomeNuovo;
      if (predefinita && predefinita !== area.predefinita) cambiaArea.predefinita = predefinita;
      if (Object.keys(cambiaArea).length) await aggiornaAreaMondo(area.contenitore, area.slug, cambiaArea);
      const etichetteCambiate = Object.fromEntries(area.planimetrie
        .filter((p) => (etichette[p.chiave] ?? '').trim() !== (p.etichetta ?? ''))
        .map((p) => [p.chiave, (etichette[p.chiave] ?? '').trim() || null]));
      const ordineCambiato = ordineVivo.some((k, i) => k !== area.planimetrie[i]?.chiave);
      if (Object.keys(etichetteCambiate).length || ordineCambiato) {
        await aggiornaPlanimetrieArea(area.contenitore, area.slug, { ...(ordineCambiato ? { ordine: ordineVivo } : {}), ...(Object.keys(etichetteCambiate).length ? { etichette: etichetteCambiate } : {}) });
      }
      // le infiltrazioni nell'ordine del Palazzo; si mandano solo se l'insieme è cambiato
      if (infiltrazioniPalazzo) {
        const scelte = infiltrazioniPalazzo.filter((x) => infiltrazioni.includes(x.chiave)).map((x) => x.chiave);
        const cambiate = scelte.length !== iniziali.length || scelte.some((k) => !iniziali.includes(k));
        if (cambiate) await impostaInfiltrazioniArea(area.contenitore, area.slug, scelte);
      }
      notifica('success', `${nomeNuovo} salvata.`);
      await onSalvata();
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Area non salvata.');
    } finally {
      setOccupato(false);
    }
  };

  /** Sposta la versione scelta nell'area di destinazione (o in un'area nuova), con la conferma se l'area resta vuota. */
  const spostaVersione = async (conferma = false) => {
    if (!spostamento || !spostamento.verso) return;
    const { chiave, verso, nome: nomeNuova } = spostamento;
    if (verso === AREA_NUOVA && !nomeNuova.trim()) return;
    setOccupato(true);
    try {
      const arrivo = await collocaPlanimetria({ mappa: chiave, dungeon: area.contenitore.chiave, ...(verso === AREA_NUOVA ? { nuova: { nome: nomeNuova.trim() } } : { area: verso }) }, { conferma });
      notifica('success', `Versione spostata in ${arrivo.nome}.`);
      setSpostamento(null);
      await onSalvata();
      onVersioneSpostata?.(arrivo);
      onChiudi();
    } catch (err) {
      if (isApiError(err, 'area-si-svuota')) setSpostamento((s) => (s ? { ...s, svuota: err.message } : s));
      else notifica('error', err instanceof Error ? err.message : 'Versione non spostata.');
    } finally {
      setOccupato(false);
    }
  };

  const elimina = async (chiave: string, conferma = false) => {
    setOccupato(true);
    try {
      await eliminaMappa(chiave, { conferma });
      notifica('success', 'Planimetria eliminata: finisce nel cestino (Impostazioni → Cestino).');
      setDaConfermare(null);
      await onSalvata();
    } catch (err) {
      if (isApiError(err, 'planimetria-d-ingresso')) setDaConfermare({ chiave, messaggio: err.message });
      else notifica('error', err instanceof Error ? err.message : 'Planimetria non eliminata.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal titolo={`Modifica ${area.nome}`} aperta={aperta} onChiudi={onChiudi} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || !nome.trim()} onClick={() => void salva()} />
      </>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 testo-13 font-semibold">Nome
          <input className="form-input touch" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          <span className="testo-12 font-normal text-text-muted">L’indirizzo della pagina non cambia.</span>
        </label>
        {area.planimetrie.length > 1 && <Selettore etichetta="Planimetria che si apre per prima" valore={predefinita}
          opzioni={area.planimetrie.map((p, i) => ({ chiave: p.chiave, nome: nomeVersione(p, i), dettaglio: `${p.numeroSpilli} pin` }))} onCambia={setPredefinita} />}
        <section className="flex flex-col gap-2" aria-label="Planimetrie dell’area">
          <h3 className="m-0 testo-14">Planimetrie</h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {ordineVivo.map((k, i) => {
              const p = perChiave.get(k);
              if (!p) return null;
              return (
                <li key={k} className="card flex flex-wrap items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 basis-48">
                    <input className="form-input touch w-full" aria-label={`Etichetta di ${nomeVersione(p, i)}`} value={etichette[k] ?? ''} maxLength={80}
                      placeholder={`Planimetria ${i + 1}`} onChange={(e) => setEtichette((x) => ({ ...x, [k]: e.target.value }))} />
                    <span className="testo-12 text-text-muted">{p.numeroSpilli} pin{p.chiave === area.predefinita ? ' · si apre per prima' : ''}</span>
                  </span>
                  {/* i comandi vanno a capo interi, mai a metà parola («ELIMI/NA» nel foglio stretto, UX2-9 c) */}
                  <span className="flex flex-wrap items-center gap-1">
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su ${nomeVersione(p, i)}`} disabled={i === 0} onClick={() => sposta(i, -1)} />
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù ${nomeVersione(p, i)}`} disabled={i === ordineVivo.length - 1} onClick={() => sposta(i, 1)} />
                    <CollegamentoVisivo tono="fantasma" icona={<IconaAzione chiave="scheda" dimensione={22} />} titolo="Apri nell’editor" className="whitespace-nowrap" to={`/guida/mappe/${encodeURIComponent(k)}/modifica`} />
                    {area.planimetrie.length > 1 && <PulsanteVisivo tono="pericolo" compatto className="shrink-0 whitespace-nowrap" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina"
                      aria-label={`Elimina ${nomeVersione(p, i)}`} disabled={occupato} onClick={() => void elimina(k)} />}
                    {altreAree && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="incolla" dimensione={22} />} titolo="Sposta…" className="whitespace-nowrap" aria-expanded={spostamento?.chiave === k} aria-label={`Sposta ${nomeVersione(p, i)} in un’altra area`} disabled={occupato} onClick={() => setSpostamento(spostamento?.chiave === k ? null : { chiave: k, verso: '', nome: '', svuota: null })} />}
                  </span>
                  {/* «Sposta la versione in un'altra area» (L3, §4.3): un'area esistente del Palazzo, o un'area a sé (solo se l'area ne ha altre).
                      L'unica versione di un'area si sposta solo confermando che l'area, rimasta vuota, va nel cestino con i suoi legami. */}
                  {altreAree && spostamento?.chiave === k && (
                    <div className="flex basis-full flex-col gap-2 rounded-md bg-white/[0.04] p-2" role="group" aria-label={`Sposta ${nomeVersione(p, i)}`}>
                      <Selettore etichetta="Sposta in" valore={spostamento.verso} vuoto="— scegli —"
                        opzioni={[...altreAree.map((a) => ({ chiave: a.slug, nome: a.nome })), ...(area.planimetrie.length > 1 ? [{ chiave: AREA_NUOVA, nome: 'Un’area a sé (nuova)' }] : [])]}
                        onCambia={(v) => setSpostamento((s) => (s ? { ...s, verso: v, svuota: null } : s))} />
                      {spostamento.verso === AREA_NUOVA && (
                        <label className="flex flex-col gap-1 testo-13 font-semibold">Nome dell’area nuova
                          <input className="form-input touch" value={spostamento.nome} maxLength={80} onChange={(e) => setSpostamento((s) => (s ? { ...s, nome: e.target.value } : s))} />
                        </label>
                      )}
                      {spostamento.svuota && <p className="m-0 testo-13 text-warning" role="alert">{spostamento.svuota}</p>}
                      <span className="flex flex-wrap justify-end gap-2">
                        <PulsanteVisivo compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setSpostamento(null)} />
                        {spostamento.svuota
                          ? <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={<>Sposta e metti {area.nome} nel cestino</>} disabled={occupato} onClick={() => void spostaVersione(true)} />
                          : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta" disabled={occupato || !spostamento.verso || (spostamento.verso === AREA_NUOVA && !spostamento.nome.trim())} onClick={() => void spostaVersione()} />}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {infiltrazioniPalazzo && <fieldset className="m-0 mt-2 flex flex-col gap-1 border-0 p-0">
            <legend className="mb-1 testo-14 font-semibold">Infiltrazioni in quest’area</legend>
            {infiltrazioniPalazzo.map((x) => (
              <label key={x.chiave} className="touch flex items-center gap-2 testo-13">
                <input type="checkbox" className="h-5 w-5 shrink-0" checked={infiltrazioni.includes(x.chiave)}
                  onChange={(e) => setInfiltrazioni((s) => (e.target.checked ? [...s, x.chiave] : s.filter((k) => k !== x.chiave)))} />
                <span>{x.ordine + 1}. {x.nome}</span>
              </label>
            ))}
            <span className="testo-12 text-text-muted">Voci della guida e pin restano dove sono.</span>
          </fieldset>}
          {daConfermare && <div className="card flex flex-col gap-2 border-error" role="alert">
            <p className="m-0 testo-13">{daConfermare.messaggio}</p>
            <span className="flex gap-2">
              <PulsanteVisivo icona={<IconaAzione chiave="annulla" dimensione={22} />} titolo="Annulla" onClick={() => setDaConfermare(null)} />
              <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Elimina lo stesso" disabled={occupato} onClick={() => void elimina(daConfermare.chiave, true)} />
            </span>
          </div>}
        </section>
      </div>
    </Modal>
  );
}
