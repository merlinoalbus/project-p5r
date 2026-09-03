// ============================================================
// ImmagineEntita — immagine di un'entità con caricamento/import/rimozione
// ============================================================
//
// Catena: immagine caricata dall'utente per (ambito, chiave) → asset grafico predefinito
// (public/asset, se presente e se la preferenza è attiva) → riquadro con le iniziali.
// In modalità modificabile offre: scegli file, importa da URL, rimuovi.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { caricaImmagine, eliminaImmagine, getImmagini, importaImmagineDaUrl, urlImmagine, type AmbitoImmagine } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useAsset, useAssetStore } from '../../stores/assetStore';
import { chiaviAssetPredefinito } from '../../utils/assetPredefiniti';
import { Modal } from './Modal';

interface Props {
  ambito: AmbitoImmagine;
  chiave: string;
  etichetta: string;
  /** Dimensione del riquadro in px. */
  dimensione?: number;
  modificabile?: boolean;
  /** Forma della cornice. */
  forma?: 'quadrata' | 'carta' | 'tonda';
}

/** Cache locale di esistenza per ambito (una sola richiesta di elenco per ambito, invalidata a ogni scrittura). */
const elenchi = new Map<string, Promise<Set<string>>>();
/** Versione per (ambito/chiave): cambia a ogni sostituzione così l'URL del file è sempre nuovo, anche fra montaggi. */
const versioni = new Map<string, number>();

function chiaviPresenti(ambito: AmbitoImmagine): Promise<Set<string>> {
  let p = elenchi.get(ambito);
  if (!p) {
    p = getImmagini(ambito).then((lista) => new Set(lista.map((i) => i.chiave))).catch(() => new Set<string>());
    elenchi.set(ambito, p);
  }
  return p;
}

/** Riquadro immagine con gestione del caricamento (file o URL). */
export function ImmagineEntita({ ambito, chiave, etichetta, dimensione = 96, modificabile, forma = 'quadrata' }: Props) {
  const idImmagine = `${ambito}/${chiave}`;
  const [versione, setVersione] = useState(() => versioni.get(idImmagine) ?? 0);
  const [presente, setPresente] = useState<boolean | null>(null);
  const [apertaUrl, setApertaUrl] = useState(false);
  const [url, setUrl] = useState('');
  const [occupato, setOccupato] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const [primaria, riserva] = chiaviAssetPredefinito(ambito, chiave, forma, dimensione);
  const urlPrimario = useAsset(primaria);
  const urlRiserva = useAsset(riserva);
  const urlPredefinito = urlPrimario ?? urlRiserva;
  const nomePredefinito = urlPrimario ? primaria : urlRiserva ? riserva : null;
  const segnaMancante = useAssetStore((s) => s.segnaMancante);

  useEffect(() => {
    let annullato = false;
    void chiaviPresenti(ambito).then((set) => {
      if (!annullato) setPresente(set.has(chiave));
    });
    return () => {
      annullato = true;
    };
  }, [ambito, chiave]);

  const dopoCambio = async (esiste: boolean) => {
    const set = await chiaviPresenti(ambito);
    if (esiste) set.add(chiave);
    else set.delete(chiave);
    setPresente(esiste);
    const nuova = (versioni.get(idImmagine) ?? 0) + 1;
    versioni.set(idImmagine, nuova);
    setVersione(nuova);
  };

  const suFile = async (file: File | undefined) => {
    if (!file) return;
    setOccupato(true);
    try {
      await caricaImmagine(ambito, chiave, file);
      await dopoCambio(true);
      notifica('success', 'Immagine caricata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.');
    } finally {
      setOccupato(false);
      if (inputFile.current) inputFile.current.value = '';
    }
  };

  const suImporta = async () => {
    if (!url.trim()) return;
    setOccupato(true);
    try {
      await importaImmagineDaUrl(ambito, chiave, url.trim());
      await dopoCambio(true);
      setApertaUrl(false);
      setUrl('');
      notifica('success', 'Immagine importata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Importazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const suRimuovi = async () => {
    setOccupato(true);
    try {
      await eliminaImmagine(ambito, chiave);
      await dopoCambio(false);
      notifica('info', 'Immagine rimossa.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const raggio = forma === 'tonda' ? '9999px' : 'var(--radius-lg)';
  const altezza = forma === 'carta' ? Math.round(dimensione * 1.75) : dimensione;
  const iniziali = etichetta.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="bg-bg-tertiary border border-border overflow-hidden flex items-center justify-center text-text-muted font-bold select-none shrink-0"
        style={{ width: dimensione, height: altezza, borderRadius: raggio, fontSize: Math.max(14, dimensione / 3) }}
        aria-label={`Immagine di ${etichetta}`}
      >
        {presente ? (
          <img src={`${urlImmagine(ambito, chiave)}?v=${versione}`} alt={etichetta} className="w-full h-full object-cover" onError={() => void dopoCambio(false)} />
        ) : urlPredefinito ? (
          <img src={urlPredefinito} alt={etichetta} className="w-full h-full object-cover" draggable={false} onError={() => { if (nomePredefinito) segnaMancante(nomePredefinito); }} />
        ) : (
          <span>{iniziali}</span>
        )}
      </div>
      {modificabile && (
        <div className="flex flex-wrap gap-1 justify-center">
          <input ref={inputFile} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => void suFile(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={occupato} onClick={() => inputFile.current?.click()}>
            Carica
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={occupato} onClick={() => setApertaUrl(true)}>
            Da URL
          </button>
          {presente && (
            <button type="button" className="btn btn-danger btn-sm" disabled={occupato} onClick={() => void suRimuovi()}>
              Rimuovi
            </button>
          )}
        </div>
      )}
      <Modal
        titolo={`Importa immagine — ${etichetta}`}
        aperta={apertaUrl}
        onChiudi={() => setApertaUrl(false)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setApertaUrl(false)}>Annulla</button>
            <button type="button" className="btn btn-primary" disabled={occupato || !url.trim()} onClick={() => void suImporta()}>Importa</button>
          </>
        }
      >
        <div>
          <label className="form-label" htmlFor="url-immagine">Indirizzo dell'immagine (http/https)</label>
          <input id="url-immagine" className="form-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus />
          <p className="form-hint">Il file viene scaricato dal server e salvato fra le risorse dell'app (PNG, JPEG, WEBP, GIF o SVG, massimo 8 MB).</p>
        </div>
      </Modal>
    </div>
  );
}
