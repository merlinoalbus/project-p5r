// ============================================================
// ImmagineEntita — immagine di un'entità: riquadro leggibile, ingrandimento al tocco, gestione nella finestra
// ============================================================
//
// Catena: immagine caricata dall'utente per (ambito, chiave) → asset grafico predefinito
// (public/asset, se presente e se la preferenza è attiva) → riquadro con le iniziali.
// Confidenti: di default il ritratto «fedele» (`confidenti/<chiave>-fedele`); al passaggio del mouse (o con il
// pulsante nella finestra, per il tocco) si vede la versione stilizzata (`confidenti/<chiave>`), se presente.
// L'immagine non viene mai ritagliata (object-contain) e un tocco la apre a tutto schermo; in modalità
// modificabile i comandi (scegli file, importa da URL, rimuovi) stanno nella finestra, non nella card.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { caricaImmagine, eliminaImmagine, importaImmagineDaUrl,  type AmbitoImmagine } from '../../services/api';
import { chiaviPresenti, urlImmagineVersionata, registraImmagine, versioniImmagini as versioni } from './immaginiCache';
import { notifica } from '../../stores/notificationStore';
import { useAsset, useAssetStore } from '../../stores/assetStore';
import { altezzaPerForma, chiaviAssetPredefinito, type FormaImmagine, type FormaRiquadro } from '../../utils/assetPredefiniti';
import { Modal } from './Modal';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';

interface Props {
  ambito: AmbitoImmagine;
  chiave: string;
  etichetta: string;
  /** Larghezza del riquadro in px (l'altezza dipende dalla forma). */
  dimensione?: number;
  modificabile?: boolean;
  /** Forma del riquadro: quadrata (1:1), carta (1:2), orizzontale (4:3), tonda (1:1 con bordo circolare). */
  forma?: FormaRiquadro;
  /** Adattamento dell'immagine al riquadro: senza ritagli (predefinito) oppure a riempire. */
  adatta?: 'contieni' | 'copri';
  className?: string;
}

/** Riquadro immagine con ingrandimento e gestione del caricamento (file o URL). */
export function ImmagineEntita({ ambito, chiave, etichetta, dimensione = 96, modificabile, forma = 'quadrata', adatta = 'contieni', className }: Props) {
  const idImmagine = `${ambito}/${chiave}`;
  const [versione, setVersione] = useState(() => versioni.get(idImmagine) ?? 0);
  const [presente, setPresente] = useState<boolean | null>(null);
  const [aperta, setAperta] = useState(false);
  const [modalitaUrl, setModalitaUrl] = useState(false);
  const [url, setUrl] = useState('');
  const [occupato, setOccupato] = useState(false);
  const [passaggio, setPassaggio] = useState(false);
  const [alternativaFissa, setAlternativaFissa] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const formaAsset: FormaImmagine = forma === 'orizzontale' ? 'quadrata' : forma;
  const [primaria, riserva] = chiaviAssetPredefinito(ambito, chiave, formaAsset, dimensione);
  const urlPrimario = useAsset(primaria);
  const urlRiserva = useAsset(riserva);
  const urlPredefinito = urlPrimario ?? urlRiserva;
  const nomePredefinito = urlPrimario ? primaria : urlRiserva ? riserva : null;
  // Versione alternativa (stilizzata) dei Confidenti: l'asset `confidenti/<chiave>`, mostrato al passaggio del mouse
  // sia sopra il ritratto fedele sia sopra l'immagine caricata dall'utente
  const urlAlternativa = ambito === 'confidente' && urlRiserva && (urlPrimario || presente) ? urlRiserva : null;
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
      const creata = await caricaImmagine(ambito, chiave, file);
      registraImmagine(ambito, chiave, creata.createdAt);
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
      const importata = await importaImmagineDaUrl(ambito, chiave, url.trim());
      registraImmagine(ambito, chiave, importata.createdAt);
      await dopoCambio(true);
      setModalitaUrl(false);
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

  const chiudi = () => {
    setAperta(false);
    setModalitaUrl(false);
    setUrl('');
  };

  const raggio = forma === 'tonda' ? '9999px' : 'var(--radius-lg)';
  const altezza = altezzaPerForma(forma, dimensione);
  const iniziali = etichetta.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  const srcUtente = presente ? `${urlImmagineVersionata(ambito, chiave)}&r=${versione}` : null;
  const mostraAlternativa = !!urlAlternativa && (passaggio || alternativaFissa);
  const src = mostraAlternativa ? urlAlternativa : (srcUtente ?? urlPredefinito);
  const origine = mostraAlternativa
    ? 'Grafica predefinita dell\'app: versione stilizzata'
    : srcUtente
      ? (urlAlternativa ? 'Immagine caricata da te (passa il mouse per la versione stilizzata)' : 'Immagine caricata da te')
      : urlPredefinito
        ? (urlAlternativa ? 'Grafica predefinita dell\'app: ritratto fedele (passa il mouse per la versione stilizzata)' : 'Grafica predefinita dell\'app')
        : 'Nessuna immagine: mostrate le iniziali';
  const classeAdatta = adatta === 'copri' ? 'object-cover' : 'object-contain';

  const immagine = (grande: boolean) =>
    src ? (
      <img
        src={src}
        alt={etichetta}
        className={grande ? 'max-w-full max-h-[70vh] object-contain' : `w-full h-full ${classeAdatta}`}
        loading={grande ? undefined : 'lazy'}
        draggable={false}
        onError={() => {
          if (srcUtente) void dopoCambio(false);
          else if (nomePredefinito) segnaMancante(nomePredefinito);
        }}
      />
    ) : (
      <span className="font-black text-text-muted select-none" style={{ fontSize: grande ? 96 : Math.max(14, dimensione / 3) }}>{iniziali}</span>
    );

  return (
    <>
      <button
        type="button"
        className={`bg-bg-tertiary border border-border overflow-hidden flex items-center justify-center shrink-0 p-0 cursor-zoom-in hover:border-primary transition-colors ${className ?? ''}`}
        style={{ width: dimensione, height: altezza, borderRadius: raggio }}
        aria-label={`Immagine di ${etichetta}${modificabile ? ' (tocca per ingrandire o cambiare)' : ' (tocca per ingrandire)'}`}
        onClick={() => setAperta(true)}
        onMouseEnter={() => setPassaggio(true)}
        onMouseLeave={() => setPassaggio(false)}
      >
        {immagine(false)}
      </button>
      <Modal
        titolo={etichetta}
        aperta={aperta}
        onChiudi={chiudi}
        larga
        azioni={
          <>
            {modificabile && !modalitaUrl && (
              <>
                <input ref={inputFile} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => void suFile(e.target.files?.[0])} />
                <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="carica" dimensione={22} />} titolo="Carica file" disabled={occupato} onClick={() => inputFile.current?.click()} />
                <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="url" dimensione={22} />} titolo="Da URL" disabled={occupato} onClick={() => setModalitaUrl(true)} />
                {presente && (
                  <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void suRimuovi()}>Rimuovi</button>
                )}
              </>
            )}
            {modificabile && modalitaUrl && (
              <>
                <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="indietro" dimensione={22} />} titolo="Indietro" disabled={occupato} onClick={() => { setModalitaUrl(false); setUrl(''); }} />
                <button type="button" className="btn btn-primary" disabled={occupato || !url.trim()} onClick={() => void suImporta()}>Importa</button>
              </>
            )}
            {urlAlternativa && <PulsanteVisivo attivo={alternativaFissa} icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo={alternativaFissa ? (srcUtente ? 'Immagine principale' : 'Ritratto fedele') : 'Versione stilizzata'} onClick={() => setAlternativaFissa((v) => !v)} />}
            <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" onClick={chiudi} />
          </>
        }
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-center bg-bg-tertiary rounded-lg p-2 min-h-[200px]">{immagine(true)}</div>
          <p className="m-0 text-[12px] text-text-muted">{origine}</p>
          {modificabile && modalitaUrl && (
            <div className="w-full">
              <label className="form-label" htmlFor={`url-immagine-${ambito}-${chiave}`}>Indirizzo dell'immagine (http/https)</label>
              <input id={`url-immagine-${ambito}-${chiave}`} className="form-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus />
              <p className="form-hint">Il file viene scaricato dal server e salvato fra le risorse dell'app (PNG, JPEG, WEBP, GIF o SVG, massimo 8 MB).</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
