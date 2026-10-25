// ============================================================
// ModificaAffinita — correggere le 10 affinità di una Persona dalla sua scheda e rimetterle come le dà la guida (L8 · R8-10/1)
// ============================================================
//
// Stessa forma di «Modifica» + «Ripristina» degli altri oggetti della guida (`ModificaGuida`), ma la griglia delle affinità non è un campo di testo
// di un oggetto: sono 10 righe di un'altra tabella, che l'API salva in blocco (`PUT /api/compendio/persona/:id/affinita`). Un dato solo, letto
// ovunque (scheda, Ombra, Battaglia, dedali, Stanza di Velluto): salvando cambia dappertutto. «Ripristina» chiede conferma e mostra le affinità che
// si perdono. Niente cestino né «Da rivedere». La bozza non salvata si segnala con `useBozzaSporca`.
// ============================================================

import { useState } from 'react';
import { ESITI_AFFINITA } from '../../../shared/elementi';
import { ripristinaAffinitaPersona, salvaAffinitaPersona } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { AffinitaDto } from '../../types';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';

interface Props {
  personaId: number;
  /** Il nome per il nome accessibile e per i messaggi («Pixie»). */
  nome: string;
  /** Le affinità di adesso. */
  affinita: AffinitaDto[];
  /** Le affinità della guida, solo se l'utente ne ha corretta almeno una (`null` altrimenti: «Ripristina» non c'è). */
  affinitaGuida: AffinitaDto[] | null;
  /** Dopo un salvataggio o un ripristino: la pagina rilegge la Persona. */
  onCambiato: () => void;
}

const OPZIONI = ESITI_AFFINITA.map((e) => ({ chiave: e.codice, nome: e.nome }));
const nomeCodice = (codice: string) => ESITI_AFFINITA.find((e) => e.codice === codice)?.nome ?? codice;

export function ModificaAffinita({ personaId, nome, affinita, affinitaGuida, onCambiato }: Props) {
  const [aperta, setAperta] = useState(false);
  const [bozza, setBozza] = useState<Record<string, string>>({});
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);

  const cambiati = aperta ? affinita.filter((a) => (bozza[a.elemento] ?? a.codice) !== a.codice) : [];
  useBozzaSporca('modifica-affinita', `modifica delle affinità di ${nome}`, cambiati.length > 0);
  /** Le affinità che «Ripristina» cambierebbe: quelle di adesso diverse dalla guida. */
  const daPerdere = affinitaGuida ? affinita.filter((a) => affinitaGuida.find((g) => g.elemento === a.elemento)?.codice !== a.codice) : [];

  const apri = () => { setBozza(Object.fromEntries(affinita.map((a) => [a.elemento, a.codice]))); setErrore(null); setConferma(false); setAperta(true); };
  const chiudi = () => { setAperta(false); setConferma(false); setErrore(null); };

  const salva = async () => {
    if (cambiati.length === 0) return;
    setOccupato(true); setErrore(null);
    try {
      await salvaAffinitaPersona(personaId, { affinita: affinita.map((a) => ({ elemento: a.elemento, codice: (bozza[a.elemento] ?? a.codice) as (typeof ESITI_AFFINITA)[number]['codice'] })) });
      notifica('success', `Affinità di ${nome} salvate: valgono in tutta l’app.`);
      chiudi();
      onCambiato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Affinità non salvate.');
    } finally { setOccupato(false); }
  };

  const ripristina = async () => {
    setOccupato(true); setErrore(null);
    try {
      await ripristinaAffinitaPersona(personaId);
      notifica('success', `Affinità di ${nome} rimesse come nella guida.`);
      chiudi();
      onCambiato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Ripristino non riuscito.');
      setConferma(false);
    } finally { setOccupato(false); }
  };

  return <>
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica le affinità di ${nome}`} onClick={apri} />
    {aperta && (
      <Modal titolo={`Affinità di ${nome}`} aperta onChiudi={chiudi} larga
        azioni={<>
          <button type="button" className="btn btn-secondary" disabled={occupato} onClick={chiudi}>Annulla</button>
          {affinitaGuida && <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina i valori della guida" disabled={occupato} onClick={() => setConferma(true)} />}
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || cambiati.length === 0} onClick={() => void salva()} />
        </>}>
        <div className="flex flex-col gap-3">
          <p className="m-0 testo-12 text-text-muted">
            {affinitaGuida
              ? 'Hai corretto le affinità di questa Persona: «Ripristina i valori della guida» (o «Rimetti questo» sotto un elemento) rimette quello che diceva la guida.'
              : 'Salvando, la correzione vale in tutta l’app (scheda, Ombre, Battaglia, dedali, Stanza di Velluto) e resta anche dopo gli aggiornamenti; potrai rimettere i valori della guida.'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {affinita.map((a) => {
              const guida = affinitaGuida?.find((g) => g.elemento === a.elemento)?.codice;
              const attuale = bozza[a.elemento] ?? a.codice;
              return (
                <div key={a.elemento} className="flex flex-col gap-1">
                  <Selettore etichetta={a.elementoNome} valore={attuale} ricerca="mai" disabilitato={occupato} opzioni={OPZIONI} onCambia={(k) => setBozza((b) => ({ ...b, [a.elemento]: k }))} />
                  {guida !== undefined && guida !== attuale && (
                    <div className="flex flex-wrap items-center gap-2 testo-12 text-text-muted">
                      <span className="min-w-0 flex-1">Guida: {nomeCodice(guida)}</span>
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rimetti questo" disabled={occupato} onClick={() => setBozza((b) => ({ ...b, [a.elemento]: guida }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {conferma && (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-warning p-3 testo-13">
              <p className="m-0 font-semibold">Perdi la tua versione:</p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {daPerdere.map((a) => <li key={a.elemento}><span className="text-text-muted">{a.elementoNome}:</span> {a.codiceNome} → {nomeCodice(affinitaGuida?.find((g) => g.elemento === a.elemento)?.codice ?? a.codice)}</li>)}
              </ul>
              {cambiati.length > 0 && <p className="m-0 text-text-muted">Anche le modifiche di questa finestra non ancora salvate vanno perse.</p>}
              <div className="flex flex-wrap gap-2">
                <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rimetti la guida" disabled={occupato} onClick={() => void ripristina()} />
                <PulsanteVisivo icona={<IconaAzione chiave="annulla" dimensione={22} />} titolo="No" disabled={occupato} onClick={() => setConferma(false)} />
              </div>
            </div>
          )}
          {errore && <p role="alert" className="m-0 text-sm text-error-testo">{errore} La finestra resta aperta.</p>}
        </div>
      </Modal>
    )}
  </>;
}
