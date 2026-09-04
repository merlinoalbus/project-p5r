// ============================================================
// CaratteriEditor — font dell'utente per i tre ruoli tipografici (Impostazioni → Caratteri)
// ============================================================
//
// I file restano nell'istanza (mai nel repository); senza caricamenti l'app usa i font liberi predefiniti.
// Ogni ruolo mostra un'anteprima resa con il proprio token (`--font-display`, `--font-menu`, `--font-decor`),
// quindi il testo di prova cambia appena il caricamento è concluso.
// ============================================================

import { useRef, useState } from 'react';
import { caricaFont, eliminaFont } from '../../services/api/font';
import { useFontStore } from '../../stores/fontStore';
import { notifica } from '../../stores/notificationStore';
import type { FontDto, RuoloFont } from '../../types';

interface Ruolo {
  ruolo: RuoloFont;
  nome: string;
  descrizione: string;
  predefinito: string;
  anteprima: string;
  classe: string;
}

const RUOLI: Ruolo[] = [
  { ruolo: 'display', nome: 'Titoli, numeri e menu laterale', descrizione: 'Intestazioni delle pagine, nomi in evidenza, livelli e ranghi, voci del menu laterale (mai sotto i 17 px).', predefinito: 'Anton', anteprima: 'PALAZZO DI KAMOSHIDA · LIVELLO 42', classe: 'font-display text-[30px] leading-none' },
  { ruolo: 'menu', nome: 'Parole brevi in evidenza', descrizione: 'I tasselli rossi dei titoli (parole corte e grandi): adatto anche a caratteri a ritagli poco leggibili nei testi.', predefinito: 'Bebas Neue', anteprima: 'DI · E · PER · CON', classe: 'font-menu text-[32px] leading-none tracking-wide' },
  { ruolo: 'decor', nome: 'Titoli degli stati vuoti e dei messaggi', descrizione: 'Cartigli in stile ritaglio di giornale: «Nessun piano salvato», «Qualcosa è andato storto».', predefinito: 'Special Elite', anteprima: 'NESSUNA PERSONA', classe: 'font-decor text-[26px] leading-none' },
];

const formatoByte = (b: number): string => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function RigaRuolo({ def, stato }: { def: Ruolo; stato: FontDto | undefined }) {
  const aggiorna = useFontStore((s) => s.aggiorna);
  const [occupato, setOccupato] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const carica = async (file: File) => {
    setOccupato(true);
    try {
      aggiorna(await caricaFont(def.ruolo, file));
      notifica('success', `${def.nome}: font «${file.name}» caricato.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Caricamento del font fallito.');
    } finally {
      setOccupato(false);
      if (input.current) input.current.value = '';
    }
  };
  const rimuovi = async () => {
    setOccupato(true);
    try {
      await eliminaFont(def.ruolo);
      aggiorna({ ruolo: def.ruolo, presente: false, formato: null, byte: 0, aggiornato: null, url: null });
      notifica('success', `${def.nome}: si torna al font predefinito (${def.predefinito}).`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 border-t border-border-light pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-semibold text-[14px]">{def.nome}</span>
        <span className="text-[12px] text-text-muted">{def.descrizione}</span>
      </div>
      <div className={`${def.classe} text-text break-words`} aria-label={`Anteprima ${def.nome}`}>{def.anteprima}</div>
      <div className="flex items-center gap-2 flex-wrap text-[13px]">
        {stato?.presente ? (
          <span className="chip chip--attivo">File caricato · {stato.formato?.toUpperCase()} · {formatoByte(stato.byte)}</span>
        ) : (
          <span className="chip">Predefinito: {def.predefinito}</span>
        )}
        <input ref={input} type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" className="hidden" aria-label={`File del font per ${def.nome}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void carica(f); }} />
        <button type="button" className="btn btn-secondary btn-sm" disabled={occupato} onClick={() => input.current?.click()}>{stato?.presente ? 'Sostituisci' : 'Carica un file'}</button>
        {stato?.presente && <button type="button" className="btn btn-ghost btn-sm" disabled={occupato} onClick={() => void rimuovi()}>Rimuovi</button>}
      </div>
    </li>
  );
}

/** Sezione Impostazioni: un file per ruolo, anteprima immediata, licenze ricordate. */
export function CaratteriEditor() {
  const elenco = useFontStore((s) => s.elenco);
  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Caratteri</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Carica i tuoi font in stile Persona 5 (TTF, OTF, WOFF o WOFF2, fino a 4 MB): restano solo in questa istanza, non vengono mai pubblicati e li usi sotto la tua responsabilità secondo la loro licenza.
        Senza caricamenti l'app usa i font liberi inclusi (Anton, Bebas Neue, Special Elite, Inter). Le lettere che un font non contiene, per esempio le accentate, vengono prese dal font predefinito.
        Pulsanti, chip e testi restano sempre nel carattere di lettura: i font caricati compaiono solo dove sono grandi abbastanza da restare leggibili.
      </p>
      <ul className="m-0 p-0 list-none flex flex-col gap-3">
        {RUOLI.map((def) => <RigaRuolo key={def.ruolo} def={def} stato={elenco?.find((f) => f.ruolo === def.ruolo)} />)}
      </ul>
    </section>
  );
}
