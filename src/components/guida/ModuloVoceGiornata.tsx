// ============================================================
// ModuloVoceGiornata — finestra per aggiungere una voce alla giornata o modificarne una, con il suo posto esatto nella fascia
// ============================================================
//
// Una finestra sola per le due situazioni, così i campi restano gli stessi ovunque:
//   nuova  dal pulsante «Aggiungi» di «Di giorno» / «Di sera»
//   voce   una voce che c'è già (della guida o aggiunta): dal 2026-09-30 sono la stessa cosa, canone della guida
// Ogni voce ha un genere (cosa da fare, evento, scadenza, promemoria: solo la prima si spunta), testo, note, fascia e il suo
// **posto** nella fascia (richiesta dell'utente: «devo fare un ordinamento esatto»): l'elenco della fascia con la voce al suo
// posto, che si sposta con ↑ / ↓. Una cosa da fare ha anche tipo, collegamento, rango atteso ed effetti della spunta.
// Ogni modifica vale per tutte le partite ed entra nel pacchetto di gioco che si esporta (non esiste più «solo in questa partita»).
// ============================================================

import { useRef, useState } from 'react';
import { Modal } from '../shared/Modal';
import { Segmenti } from '../shared/Segmenti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { aggiornaVoceGiornata, creaVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_GENERE } from '../../utils/percorso';
import { EditorAzioneStrutturata } from './EditorAzioneStrutturata';
import { STRUTTURA_VUOTA, campiCompleti, strutturaDi } from '../../utils/azioneStrutturata';
import type { AzionePercorsoDto, DatiVoceGiornata, FasciaGioco, GenereVoce } from '../../types';

export type SoggettoVoce =
  | { tipo: 'nuova'; fascia: FasciaGioco }
  | { tipo: 'voce'; voce: AzionePercorsoDto };

const GENERI: ReadonlyArray<{ chiave: GenereVoce; nome: string }> = (['azione', 'evento', 'scadenza', 'promemoria'] as const).map((g) => ({ chiave: g, nome: NOME_GENERE[g] }));
const FASCE: ReadonlyArray<{ chiave: FasciaGioco; nome: string }> = [{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }];

/** Le righe di un'area di testo perché il testo ci stia tutto anche sul telefono (~36 caratteri per riga nella finestra a 375 px):
 *  niente scorrimento dentro il campo oltre a quello della finestra, fino a un massimo. */
const righe = (testo: string, min: number, max: number) => Math.min(max, Math.max(min, testo.split('\n').reduce((n, r) => n + Math.max(1, Math.ceil(r.length / 36)), 0)));

interface Props {
  soggetto: SoggettoVoce;
  giorno: string;
  /** Tutte le voci del giorno, nel loro ordine: servono per mostrare e scegliere il posto. */
  voci: AzionePercorsoDto[];
  partitaId: number | null;
  onChiudi: () => void;
  /** Dopo un salvataggio riuscito: la giornata va ricaricata. */
  onSalvato: () => void | Promise<void>;
}

/**
 * La finestra della voce: genere, testo e note (aree di testo che crescono col contenuto), fascia (cambiandola il
 * posto riparte da quello di partenza in quella fascia), posto esatto fra le altre voci e, per una cosa da fare, la
 * classificazione con gli effetti. «Salva»/«Aggiungi» è attivo solo con un testo e, per un'azione, con i campi
 * strutturati completi.
 */
export function ModuloVoceGiornata({ soggetto, giorno, voci, partitaId, onChiudi, onSalvato }: Props) {
  const voce = soggetto.tipo === 'voce' ? soggetto.voce : null;
  /** Le altre voci di una fascia, nel loro ordine (senza quella che si modifica). */
  const altreDi = (f: FasciaGioco) => voci.filter((v) => v.fascia === f && v.uid !== voce?.uid);
  /** Il posto di partenza in una fascia: dov'è la voce, se è la sua; altrimenti in fondo. */
  const postoIniziale = (f: FasciaGioco) => {
    if (voce && voce.fascia === f) {
      const i = voci.filter((v) => v.fascia === f).findIndex((v) => v.uid === voce.uid);
      if (i >= 0) return i;
    }
    return altreDi(f).length;
  };
  const [campi, setCampi] = useState(() => {
    const fascia = voce?.fascia ?? (soggetto.tipo === 'nuova' ? soggetto.fascia : 'giorno');
    return {
      genere: (voce?.genere ?? 'azione') as GenereVoce, testo: voce?.azione ?? '', note: voce?.note ?? '', fascia,
      posizione: postoIniziale(fascia), struttura: voce && voce.genere === 'azione' ? strutturaDi(voce) : STRUTTURA_VUOTA,
    };
  });
  const [occupato, setOccupato] = useState(false);
  /** Unisce una modifica parziale ai campi del modulo. */
  const imposta = (p: Partial<typeof campi>) => setCampi((c) => ({ ...c, ...p }));
  const azione = campi.genere === 'azione';
  const altre = altreDi(campi.fascia);
  const posto = Math.min(campi.posizione, altre.length);

  /**
   * Compone i dati della voce (testo e note ripuliti, note vuote come assenti; tipo, collegamento, rango ed effetti
   * solo per un'azione), crea o aggiorna la voce, fa ricaricare la giornata, notifica e chiude. Senza testo non fa nulla.
   */
  const salva = async () => {
    const testo = campi.testo.trim();
    if (!testo) return;
    const note = campi.note.trim();
    const s = campi.struttura;
    // il posto si manda quando la voce è nuova, cambia fascia o si sposta; altrimenti resta dov'è
    const spostata = !voce || voce.fascia !== campi.fascia || posto !== postoIniziale(campi.fascia);
    const dati: DatiVoceGiornata = {
      genere: campi.genere, azione: testo, note: note || null, fascia: campi.fascia,
      ...(spostata ? { posizione: posto } : {}),
      ...(azione ? { tipo: s.tipo, riferimento: s.riferimento, rangoAtteso: s.rangoAtteso, produce: s.produce } : {}),
    };
    setOccupato(true);
    try {
      if (voce) await aggiornaVoceGiornata(voce.uid, dati, partitaId ?? undefined);
      else await creaVoceGiornata(giorno, dati, partitaId ?? undefined);
      await onSalvato();
      notifica('success', voce ? 'Voce modificata nella guida, per tutte le partite.' : 'Voce aggiunta alla guida, per tutte le partite.');
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal
      aperta
      larga={azione}
      titolo={voce ? 'Modifica la voce della giornata' : 'Aggiungi alla giornata'}
      onChiudi={onChiudi}
      azioni={(
        <div className="flex flex-wrap justify-end gap-1.5 w-full">
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
          <PulsanteVisivo type="submit" form="modulo-voce-giornata" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={voce ? 'Salva' : 'Aggiungi'}
            disabled={occupato || !campi.testo.trim() || (azione && !campiCompleti(campi.struttura))} />
        </div>
      )}
    >
      <form id="modulo-voce-giornata" className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        <Segmenti etichetta="Che cosa è" valore={campi.genere} opzioni={GENERI} onCambia={(g) => imposta({ genere: g })} />
        <label className="flex flex-col gap-1 text-[13px] text-text-secondary">{azione ? 'Che cosa fare' : 'Che cosa succede'}
          <textarea className="form-input" rows={righe(campi.testo, 3, 24)} maxLength={2000} value={campi.testo} autoFocus onChange={(e) => imposta({ testo: e.target.value })}
            placeholder={azione ? 'es. Comprare il Set per retrogaming' : 'es. Quiz televisivo al Leblanc'} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-text-secondary">{azione ? 'Note' : 'Dettagli'}
          <textarea className="form-input" rows={righe(campi.note, 2, 8)} maxLength={2000} value={campi.note} onChange={(e) => imposta({ note: e.target.value })} />
        </label>
        <Segmenti etichetta="Momento della giornata" valore={campi.fascia} opzioni={FASCE} onCambia={(f) => imposta({ fascia: f, posizione: postoIniziale(f) })} />
        <Posto altre={altre} posto={posto} testo={campi.testo.trim() || (voce ? voce.azione : 'La voce nuova')} fascia={campi.fascia} disabled={occupato}
          onSposta={(verso) => imposta({ posizione: Math.max(0, Math.min(altre.length, posto + verso)) })} />
        {azione && <EditorAzioneStrutturata valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} />}
        <p className="m-0 text-[12px] text-text-muted">
          La modifica cambia la guida per tutte le partite ed entra nel pacchetto di gioco che esporti.
          {voce?.fatta ? ' Questa voce è già spuntata: gli effetti nuovi valgono dalla prossima spunta; le Doti le segni tu, e restano come sono.' : ''}
        </p>
      </form>
    </Modal>
  );
}

interface PropsPosto {
  /** Le altre voci della fascia, nel loro ordine. */
  altre: AzionePercorsoDto[];
  /** Il posto della voce fra le altre (0 = in cima, `altre.length` = in fondo). */
  posto: number;
  testo: string;
  fascia: FasciaGioco;
  disabled: boolean;
  onSposta: (verso: -1 | 1) => void;
}

/** Il posto della voce nella fascia: l'elenco numerato con la voce evidenziata, che sale e scende di un posto per volta. */
function Posto({ altre, posto, testo, fascia, disabled, onSposta }: PropsPosto) {
  const elenco = altre.map((v) => ({ uid: v.uid, testo: v.azione, questa: false }));
  elenco.splice(posto, 0, { uid: '', testo, questa: true });
  const nome = fascia === 'giorno' ? 'di giorno' : 'di sera';
  const gruppo = useRef<HTMLDivElement>(null);
  /** Un passo; arrivati al bordo il pulsante premuto si spegne: il fuoco passa all'altro, così la tastiera non lo perde. */
  const passo = (verso: -1 | 1) => {
    onSposta(verso);
    const alBordo = verso === -1 ? posto - 1 <= 0 : posto + 1 >= altre.length;
    if (alBordo) setTimeout(() => gruppo.current?.querySelector<HTMLButtonElement>(`button[aria-label="${verso === -1 ? 'Sposta giù di un posto' : 'Sposta su di un posto'}"]`)?.focus());
  };
  return (
    <div ref={gruppo} className="flex flex-col gap-1" role="group" aria-label={`Posto nella giornata, ${nome}`}>
      <span className="text-[13px] text-text-secondary">Posto nella giornata ({nome}): {posto + 1} di {elenco.length}</span>
      <ol className="m-0 p-0 list-none flex flex-col border border-border-light rounded-md overflow-hidden text-[13px]">
        {elenco.map((r, i) => r.questa ? (
          <li key="questa" className="flex items-center gap-2 px-2 py-1 bg-primary-bg font-semibold border-t border-border-light first:border-t-0" aria-current="true">
            <span className="w-6 shrink-0 text-right tabular-nums">{i + 1}.</span>
            <span className="flex-1 min-w-0 truncate">{r.testo}</span>
            <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" disabled={disabled || posto === 0} onClick={() => passo(-1)} aria-label="Sposta su di un posto" />
            <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" disabled={disabled || posto === altre.length} onClick={() => passo(1)} aria-label="Sposta giù di un posto" />
          </li>
        ) : (
          <li key={r.uid} className="flex items-center gap-2 px-2 py-1 text-text-muted border-t border-border-light first:border-t-0">
            <span className="w-6 shrink-0 text-right tabular-nums">{i + 1}.</span>
            <span className="flex-1 min-w-0 truncate">{r.testo}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
