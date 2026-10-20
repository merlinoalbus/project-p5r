// ============================================================
// FinestraModificaArea — nome e versioni di un'Area: rinomina, predefinita, etichette, ordine, elimina una versione (L2, R2-25)
// ============================================================
//
// Rinominare non cambia l'indirizzo (lo slug è fissato alla creazione). Le versioni si ordinano con ↑/↓ da 44 px; l'ultima versione
// non si elimina da sola (si elimina l'Area), e quella che l'ingresso del quartiere usa chiede conferma: lo decide il server (409),
// qui si mostra la sua frase e si chiede.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { aggiornaAreaMondo, aggiornaPlanimetrieArea, eliminaMappa, isApiError } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { nomeVersione } from '../../utils/aree';
import type { AreaDettaglioDto } from '../../types';

interface Props {
  area: AreaDettaglioDto;
  aperta: boolean;
  onChiudi: () => void;
  /** Dopo ogni salvataggio: la pagina rilegge l'Area. */
  onSalvata: () => Promise<void> | void;
}

/** La finestra: nome, planimetria predefinita e tabella delle versioni (etichetta, ↑/↓, «Apri nell'editor», elimina). */
export function FinestraModificaArea({ area, aperta, onChiudi, onSalvata }: Props) {
  const [nome, setNome] = useState(area.nome);
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
      if (Object.keys(cambiaArea).length) await aggiornaAreaMondo(area.contenitore.chiave, area.slug, cambiaArea);
      const etichetteCambiate = Object.fromEntries(area.planimetrie
        .filter((p) => (etichette[p.chiave] ?? '').trim() !== (p.etichetta ?? ''))
        .map((p) => [p.chiave, (etichette[p.chiave] ?? '').trim() || null]));
      const ordineCambiato = ordineVivo.some((k, i) => k !== area.planimetrie[i]?.chiave);
      if (Object.keys(etichetteCambiate).length || ordineCambiato) {
        await aggiornaPlanimetrieArea(area.contenitore.chiave, area.slug, { ...(ordineCambiato ? { ordine: ordineVivo } : {}), ...(Object.keys(etichetteCambiate).length ? { etichette: etichetteCambiate } : {}) });
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
        <button type="button" className="btn btn-primary touch" disabled={occupato || !nome.trim()} onClick={() => void salva()}>Salva</button>
      </>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Nome
          <input className="form-input touch" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
          <span className="text-[12px] font-normal text-text-muted">L’indirizzo della pagina non cambia.</span>
        </label>
        {area.planimetrie.length > 1 && <Selettore etichetta="Planimetria che si apre per prima" valore={predefinita}
          opzioni={area.planimetrie.map((p, i) => ({ chiave: p.chiave, nome: nomeVersione(p, i), dettaglio: `${p.numeroSpilli} pin` }))} onCambia={setPredefinita} />}
        <section className="flex flex-col gap-2" aria-label="Planimetrie dell’area">
          <h3 className="m-0 text-[14px]">Planimetrie</h3>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {ordineVivo.map((k, i) => {
              const p = perChiave.get(k);
              if (!p) return null;
              return (
                <li key={k} className="card flex flex-wrap items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 basis-48">
                    <input className="form-input touch w-full" aria-label={`Etichetta di ${nomeVersione(p, i)}`} value={etichette[k] ?? ''} maxLength={80}
                      placeholder={`Planimetria ${i + 1}`} onChange={(e) => setEtichette((x) => ({ ...x, [k]: e.target.value }))} />
                    <span className="text-[12px] text-text-muted">{p.numeroSpilli} pin{p.chiave === area.predefinita ? ' · si apre per prima' : ''}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" className="btn btn-ghost touch" aria-label={`Sposta su ${nomeVersione(p, i)}`} disabled={i === 0} onClick={() => sposta(i, -1)}>↑</button>
                    <button type="button" className="btn btn-ghost touch" aria-label={`Sposta giù ${nomeVersione(p, i)}`} disabled={i === ordineVivo.length - 1} onClick={() => sposta(i, 1)}>↓</button>
                    <Link className="btn btn-ghost touch" to={`/guida/mappe/${encodeURIComponent(k)}/modifica`}>Apri nell’editor</Link>
                    {area.planimetrie.length > 1 && <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina"
                      aria-label={`Elimina ${nomeVersione(p, i)}`} disabled={occupato} onClick={() => void elimina(k)} />}
                  </span>
                </li>
              );
            })}
          </ol>
          {daConfermare && <div className="card flex flex-col gap-2 border-error" role="alert">
            <p className="m-0 text-[13px]">{daConfermare.messaggio}</p>
            <span className="flex gap-2">
              <button type="button" className="btn btn-secondary touch" onClick={() => setDaConfermare(null)}>Annulla</button>
              <button type="button" className="btn btn-danger touch" disabled={occupato} onClick={() => void elimina(daConfermare.chiave, true)}>Elimina lo stesso</button>
            </span>
          </div>}
        </section>
      </div>
    </Modal>
  );
}
