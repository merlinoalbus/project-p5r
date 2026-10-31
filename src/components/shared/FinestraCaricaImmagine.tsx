// ============================================================
// FinestraCaricaImmagine — inserire, cambiare o togliere un'immagine caricata: file, Ctrl+V, «Incolla dagli appunti», anteprima (O9-5)
// ============================================================
//
// Richiesta dell'utente (2026-10-31): «nella pagina luoghi della guida... l'area Memento riporta le voci senza immagini. Ma io ho generato
// delle immagini da inserire. vorrei poterle inserire e/o modificare», «stessa funzione di caricamento/modifica immagini miniature anche
// per i palazzi...», «il caricamento e la modifica deve permettere di usare l'immagine con CTRL+V ovvero da clipboard...».
//
//   - Tre modi di scegliere l'immagine, tutti dentro la finestra: «Scegli un file» (`accept` come `ImmagineEntita`), Ctrl+V (l'evento
//     `paste` sul documento mentre la finestra è aperta: il primo elemento degli appunti di tipo image/*) e «Incolla dagli appunti»
//     (`navigator.clipboard.read()` dentro il gesto, il primo elemento con un tipo image/*). Se l'API manca, il contesto non è sicuro o il
//     permesso è negato, il messaggio dice di premere Ctrl+V nella finestra.
//   - Anteprima prima di salvare, nello stesso riquadro 16:9 senza ritagli della carta (`URL.createObjectURL`, revocato quando cambia la
//     scelta e alla chiusura). Formati e dimensione come le altre immagini (`shared/immagini.ts`): il rifiuto qui è solo un aiuto, il server
//     resta l'arbitro (controlla i byte).
//   - «Salva» (PUT della rotta unica delle immagini), «Rimuovi» solo se c'è già un'immagine (DELETE, con conferma), «Annulla». Dopo un
//     cambio la cache delle immagini del client si allinea (`segnaImmagineCambiata`) e chi ha aperto la finestra rilegge (`onCambiata`).
//   - È una finestra `Modal` (foglio dal basso sotto i 768 px, fuoco dentro, Esc chiude, scorre solo il suo corpo); gli esiti sono annunciati
//     in una regione `status`. Nel rilascio non esiste: costante di build nel modulo, il bundler toglie il ramo.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { caricaImmagine, eliminaImmagine, type AmbitoImmagine } from '../../services/api';
import { segnaImmagineCambiata } from './immaginiCache';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { Modal } from './Modal';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from './SoloPreparazione';
import { MAX_BYTE_IMMAGINE_CARICATA, MIME_IMMAGINE_AMMESSI } from '../../../shared/immagini';
import { srcsetMiniature, urlMiniatura } from '../../../shared/miniature';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  /** Il titolo della finestra («Miniatura di Kamoshida»). */
  titolo: string;
  ambito: AmbitoImmagine;
  chiave: string;
  /** L'URL dell'immagine caricata che c'è adesso (versionato), o null: con un'immagine compare «Rimuovi». */
  urlAttuale: string | null;
  /** Quanto è larga l'immagine dove si mostra (attributo `sizes` dell'immagine attuale nell'anteprima). */
  sizes?: string;
  onChiudi: () => void;
  /** Dopo un salvataggio o una rimozione riusciti, prima della chiusura (per esempio: rileggere la gerarchia). */
  onCambiata?: () => Promise<void> | void;
}

/** Il nome del file per un'immagine arrivata dagli appunti (che non ne ha uno). */
const ESTENSIONE: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
const MB = MAX_BYTE_IMMAGINE_CARICATA / 1024 / 1024;
/** Che cosa fare quando gli appunti non si possono leggere dal pulsante. */
const PREMI_CTRL_V = 'premi Ctrl+V in questa finestra (sul telefono scegli un file).';

/** L'immagine scelta (non ancora salvata) e il suo indirizzo locale per l'anteprima. */
interface Scelta { file: File; url: string; origine: 'file' | 'appunti' }

/** Il motivo per cui un file non va bene, o null se è un'immagine ammessa entro il limite. */
function motivoRifiuto(file: Blob): string | null {
  if (!(MIME_IMMAGINE_AMMESSI as readonly string[]).includes(file.type)) return 'Formato non ammesso: usa PNG, JPEG, WEBP, GIF o SVG.';
  if (file.size === 0) return 'L’immagine è vuota.';
  if (file.size > MAX_BYTE_IMMAGINE_CARICATA) return `L’immagine supera ${MB} MB.`;
  return null;
}

/** Un `File` da un blob degli appunti, con un nome e il tipo del blob. */
function fileDagliAppunti(blob: Blob, tipo: string): File {
  return new File([blob], `appunti.${ESTENSIONE[tipo] ?? 'img'}`, { type: tipo });
}

function FinestraCaricaImmagineReale({ titolo, ambito, chiave, urlAttuale, sizes = '(max-width: 767px) 100vw, 560px', onChiudi, onCambiata }: Props) {
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [messaggio, setMessaggio] = useState<{ tono: 'avviso' | 'esito'; testo: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  // l'indirizzo locale vivo, per revocarlo alla chiusura anche se la scelta non è nello stato più recente
  const urlVivo = useRef<string | null>(null);

  /** Prende un file scelto o incollato: se non va bene dice perché e tiene la scelta di prima; se va bene ne fa l'anteprima. */
  const prendi = useCallback((file: File, origine: Scelta['origine']) => {
    const motivo = motivoRifiuto(file);
    if (motivo) { setMessaggio({ tono: 'avviso', testo: motivo }); return; }
    if (urlVivo.current) URL.revokeObjectURL(urlVivo.current);
    const url = URL.createObjectURL(file);
    urlVivo.current = url;
    setScelta({ file, url, origine });
    setMessaggio({ tono: 'esito', testo: origine === 'appunti' ? 'Immagine presa dagli appunti: controlla l’anteprima e salva.' : `Scelto «${file.name}»: controlla l’anteprima e salva.` });
  }, []);

  // l'indirizzo dell'anteprima si revoca alla chiusura della finestra
  useEffect(() => () => { if (urlVivo.current) URL.revokeObjectURL(urlVivo.current); }, []);

  // Ctrl+V (o «Incolla» del menu del browser) mentre la finestra è aperta: il primo elemento degli appunti che è un'immagine
  useEffect(() => {
    const suIncolla = (e: ClipboardEvent) => {
      if (occupato) return;
      const elementi = [...(e.clipboardData?.items ?? [])];
      const immagine = elementi.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      const file = immagine?.getAsFile();
      if (!file) {
        setMessaggio({ tono: 'avviso', testo: 'Negli appunti non c’è un’immagine: copia l’immagine (non il suo file o il suo indirizzo) e riprova.' });
        return;
      }
      e.preventDefault();
      // un'immagine incollata ha spesso un nome generico («image.png») o nessuno: si tiene il tipo, il nome lo dà `fileDagliAppunti`
      prendi(fileDagliAppunti(file, file.type), 'appunti');
    };
    document.addEventListener('paste', suIncolla);
    return () => document.removeEventListener('paste', suIncolla);
  }, [occupato, prendi]);

  /** «Incolla dagli appunti»: `navigator.clipboard.read()` dentro il gesto; senza l'API o senza permesso, il messaggio che dice di premere Ctrl+V. */
  const incollaDalPulsante = async () => {
    if (!window.isSecureContext || typeof navigator.clipboard?.read !== 'function') {
      setMessaggio({ tono: 'avviso', testo: `Questo browser non lascia leggere le immagini degli appunti al pulsante: ${PREMI_CTRL_V}` });
      return;
    }
    try {
      const elementi = await navigator.clipboard.read();
      for (const el of elementi) {
        const tipo = el.types.find((t) => t.startsWith('image/'));
        if (!tipo) continue;
        prendi(fileDagliAppunti(await el.getType(tipo), tipo), 'appunti');
        return;
      }
      setMessaggio({ tono: 'avviso', testo: 'Negli appunti non c’è un’immagine: copia l’immagine (non il suo file o il suo indirizzo) e riprova.' });
    } catch (err) {
      const negato = err instanceof DOMException && err.name === 'NotAllowedError';
      setMessaggio({ tono: 'avviso', testo: negato ? `Lettura degli appunti non permessa: ${PREMI_CTRL_V}` : `Gli appunti non si sono potuti leggere: ${PREMI_CTRL_V}` });
    }
  };

  /** Salva l'immagine scelta: la cache del client si allinea, chi ha aperto rilegge, la finestra si chiude. */
  const salva = async () => {
    if (!scelta) return;
    setOccupato(true);
    try {
      const creata = await caricaImmagine(ambito, chiave, scelta.file);
      await segnaImmagineCambiata(ambito, chiave, creata.createdAt);
      await onCambiata?.();
      notifica('success', urlAttuale ? 'Immagine cambiata.' : 'Immagine inserita.');
      onChiudi();
    } catch (err) {
      setMessaggio({ tono: 'avviso', testo: err instanceof Error ? err.message : 'Salvataggio non riuscito.' });
      setOccupato(false);
    }
  };

  /** Toglie l'immagine caricata, dopo la conferma. */
  const rimuovi = async () => {
    if (!(await conferma({ titolo: 'Togliere l’immagine?', testo: 'L’immagine caricata si cancella dal database di gioco: la carta torna com’era senza.', etichetta: 'Rimuovi' }))) return;
    setOccupato(true);
    try {
      await eliminaImmagine(ambito, chiave);
      await segnaImmagineCambiata(ambito, chiave, null);
      await onCambiata?.();
      notifica('info', 'Immagine tolta.');
      onChiudi();
    } catch (err) {
      setMessaggio({ tono: 'avviso', testo: err instanceof Error ? err.message : 'Rimozione non riuscita.' });
      setOccupato(false);
    }
  };

  const chiudi = () => { if (!occupato) onChiudi(); };
  const srcSetAttuale = urlAttuale ? srcsetMiniature(urlAttuale) : '';

  return (
    <Modal titolo={titolo} aperta onChiudi={chiudi} azioni={<>
      {urlAttuale && <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Rimuovi" disabled={occupato} onClick={() => void rimuovi()} />}
      <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="annulla" dimensione={22} />} titolo="Annulla" disabled={occupato} onClick={chiudi} />
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="accettata" dimensione={22} />} titolo="Salva" disabled={occupato || !scelta} onClick={() => void salva()} />
    </>}>
      <div className="flex flex-col gap-3">
        {/* l'anteprima nello stesso riquadro della carta: 16:9, senza ritagli */}
        <figure className="m-0 flex flex-col gap-1">
          <span className="anteprima-mappa aspect-video w-full">
            {scelta
              ? <img src={scelta.url} alt="Anteprima dell’immagine scelta" draggable={false} />
              : urlAttuale
                ? <img src={urlMiniatura(urlAttuale, 640)} srcSet={srcSetAttuale || undefined} sizes={srcSetAttuale ? sizes : undefined} alt="Immagine attuale" draggable={false} />
                : <span className="testo-13 px-3 text-center text-text-secondary">Nessuna immagine: scegli un file o incollala con Ctrl+V.</span>}
          </span>
          <figcaption className="testo-12 text-text-secondary">{scelta ? 'Anteprima: non ancora salvata.' : urlAttuale ? 'Immagine attuale.' : `PNG, JPEG, WEBP, GIF o SVG, fino a ${MB} MB.`}</figcaption>
        </figure>
        <div className="flex flex-wrap gap-2">
          <input ref={inputFile} type="file" accept={MIME_IMMAGINE_AMMESSI.join(',')} className="hidden" tabIndex={-1} aria-hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) prendi(f, 'file'); e.target.value = ''; }} />
          <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="carica" dimensione={22} />} titolo="Scegli un file" disabled={occupato} onClick={() => inputFile.current?.click()} />
          <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="incolla" dimensione={22} />} titolo="Incolla dagli appunti" disabled={occupato} onClick={() => void incollaDalPulsante()} />
        </div>
        <p role="status" aria-live="polite" className={`m-0 min-h-[1.25rem] testo-13 text-pretty ${messaggio?.tono === 'avviso' ? 'text-warning' : 'text-text-secondary'}`}>
          {occupato ? 'Salvataggio in corso…' : messaggio?.testo ?? ''}
        </p>
      </div>
    </Modal>
  );
}

/** La finestra di caricamento di un'immagine (solo nella preparazione). Montarla vuol dire aprirla. */
export const FinestraCaricaImmagine: StrumentoDiModifica<typeof FinestraCaricaImmagineReale> = IN_RILASCIO ? NienteInRilascio : FinestraCaricaImmagineReale;
