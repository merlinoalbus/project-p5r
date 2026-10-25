// ============================================================
// Campo — l'unico campo dell'app: etichetta sopra, controllo da 44 px, aiuto ed errore sotto (L13, modelli comuni 1)
// ============================================================
//
// Prima c'erano quattro stili di etichetta (`.form-label` in maiuscoletto, `.editor-mappa__campo` a 12 px, `flex flex-col gap-1`
// con il testo ereditato, `CampoCorrezione` a 12 px bianco) e due altezze del campo (36 e 44 px, a seconda di quale regola vinceva
// per ordine nel file): il rilievo dell'utente sull'aspetto «inguardabile» dei moduli. Ora l'aspetto è uno solo e vive in
// `tailwind.css` (`.campo`, `.campo__etichetta`, `.campo__aiuto`, `.campo__errore`); questo componente ne dà la struttura e i
// collegamenti accessibili.
//
// Due forme, scelte da come si passano i figli:
//  - **funzione**: `<Campo etichetta="Nome">{(p) => <input className="form-input" {...p} />}</Campo>`. L'etichetta è una vera `<label for>`,
//    e `p` porta `id`, `aria-describedby` (aiuto ed errore), `aria-invalid` e `aria-required`: il lettore di schermo dice nome, aiuto ed
//    errore del campo, senza che l'aiuto entri nel nome.
//  - **nodo**: per i controlli composti che portano da sé il proprio nome (`Selettore`, `SelettoreData`, gli elenchi di tessere). Il
//    `Campo` è un gruppo (`role="group"`) il cui nome è l'etichetta; il `Selettore` ha già la sua etichetta sopra: per lui basta il
//    `Selettore` solo, il `Campo` serve a dargli aiuto ed errore.
// `CampoTesto` è il caso di tutti i giorni: testo, numero o testo lungo che si allunga con quello che contiene.
// ============================================================

import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Le proprietà che il `Campo` consegna al controllo quando i figli sono una funzione. */
export interface ProprietaControllo {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

interface PropsCampo {
  etichetta: string;
  /** Una riga di spiegazione sotto il controllo (grigia). */
  aiuto?: string;
  /** Il motivo per cui il valore non va (rosso, sotto il controllo); rende il controllo `aria-invalid`. */
  errore?: string;
  /** Il campo va compilato: asterisco accanto all'etichetta e `aria-required` sul controllo. */
  obbligatorio?: boolean;
  /** Occupa tutta la riga della griglia a due colonne (`.griglia-campi`, `SezioneCampi`). */
  largo?: boolean;
  className?: string;
  /** Solo per la forma a nodo: il controllo composto è già un gruppo con lo stesso nome (`SelettoreData`); il `Campo` non ne apre un
   *  secondo, per non far annunciare due volte lo stesso gruppo. L'etichetta resta visibile e l'aiuto resta sotto. */
  senzaGruppo?: boolean;
  children: ReactNode | ((p: ProprietaControllo) => ReactNode);
}

/** Un campo con la sua etichetta, l'aiuto e l'errore; vedi l'intestazione del file per le due forme dei figli. */
export function Campo({ etichetta, aiuto, errore, obbligatorio, largo, className, senzaGruppo, children }: PropsCampo) {
  const id = useId();
  const idAiuto = `${id}-aiuto`;
  const idErrore = `${id}-errore`;
  const descrizione = [aiuto ? idAiuto : '', errore ? idErrore : ''].filter(Boolean).join(' ');
  const classe = `campo ${largo ? 'campo--largo' : ''} ${className ?? ''}`;
  const asterisco = obbligatorio ? <span className="campo__obbligatorio" aria-hidden="true">*</span> : null;
  const note = (
    <>
      {aiuto && <span id={idAiuto} className="campo__aiuto">{aiuto}</span>}
      {errore && <span id={idErrore} className="campo__errore" role="alert">{errore}</span>}
    </>
  );
  if (typeof children === 'function') {
    const proprieta: ProprietaControllo = { id: `${id}-controllo` };
    if (descrizione) proprieta['aria-describedby'] = descrizione;
    if (errore) proprieta['aria-invalid'] = true;
    if (obbligatorio) proprieta['aria-required'] = true;
    return (
      <div className={classe}>
        <label htmlFor={proprieta.id} className="campo__etichetta">{etichetta}{asterisco}</label>
        {children(proprieta)}
        {note}
      </div>
    );
  }
  return (
    <div className={classe} {...(senzaGruppo ? {} : { role: 'group', 'aria-labelledby': `${id}-etichetta`, 'aria-describedby': descrizione || undefined })}>
      <span id={`${id}-etichetta`} className="campo__etichetta">{etichetta}{asterisco}</span>
      {children}
      {note}
    </div>
  );
}

interface PropsCampoTesto {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  /** `lungo` = più righe, si allunga con il testo; `numero` = numerico (tastiera numerica sul telefono, senza frecce). */
  tipo?: 'testo' | 'numero' | 'lungo';
  aiuto?: string;
  errore?: string;
  obbligatorio?: boolean;
  disabilitato?: boolean;
  largo?: boolean;
  massimo?: number;
  segnaposto?: string;
  /** Righe minime del testo lungo (default 2). */
  righe?: number;
  className?: string;
}

/** Un campo di testo, numero o testo lungo con la sua etichetta: il caso più comune del `Campo`. Il testo lungo non ha barra: cresce. */
export function CampoTesto({ etichetta, valore, onCambia, tipo = 'testo', aiuto, errore, obbligatorio, disabilitato, largo, massimo, segnaposto, righe = 2, className }: PropsCampoTesto) {
  return (
    <Campo etichetta={etichetta} aiuto={aiuto} errore={errore} obbligatorio={obbligatorio} largo={largo || tipo === 'lungo'} className={className}>
      {(p) => tipo === 'lungo'
        ? <TestoCheCresce {...p} valore={valore} onCambia={onCambia} righe={righe} massimo={massimo ?? 2000} disabilitato={disabilitato} segnaposto={segnaposto} />
        : <input {...p} className="form-input" type={tipo === 'numero' ? 'number' : 'text'} min={tipo === 'numero' ? 0 : undefined} inputMode={tipo === 'numero' ? 'numeric' : undefined} maxLength={massimo ?? 400} value={valore}
          disabled={disabilitato} placeholder={segnaposto} onChange={(e) => onCambia(e.target.value)} />}
    </Campo>
  );
}

/** Area di testo che si allunga con quello che contiene (nessun riquadro che scorre dentro la finestra) e non ha la maniglia di ridimensionamento. */
function TestoCheCresce({ valore, onCambia, righe, massimo, disabilitato, segnaposto, ...p }: ProprietaControllo & {
  valore: string; onCambia: (v: string) => void; righe: number; massimo: number; disabilitato?: boolean; segnaposto?: string;
}) {
  const el = useRef<HTMLTextAreaElement | null>(null);
  // a ogni cambio del testo l'altezza torna a «auto» e poi alla misura del contenuto; le righe minime le fissa `rows`
  useEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [valore]);
  return <textarea {...p} ref={el} className="form-input campo__lungo" rows={righe} maxLength={massimo} value={valore} disabled={disabilitato} placeholder={segnaposto} onChange={(e) => onCambia(e.target.value)} />;
}

/** Il titolo di una sezione di campi in una finestra: stessa tipografia ovunque (`legend` di un `fieldset`, a una colonna sul telefono, due da 768 px). */
export function SezioneCampi({ titolo, children, className }: { titolo: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`finestra-sezione ${className ?? ''}`}>
      <legend className="finestra-sezione__titolo">{titolo}</legend>
      <div className="finestra-sezione__campi">{children}</div>
    </fieldset>
  );
}
