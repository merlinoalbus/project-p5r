// ============================================================
// ModificaAffinita — correggere le 10 affinità di una Persona dalla sua scheda (L8 · R8-10/1)
// ============================================================
//
// Stessa forma di «Modifica» degli altri oggetti della guida (`ModificaGuida`), ma la griglia delle affinità non è un campo di testo
// di un oggetto: sono 10 righe di un'altra tabella, che l'API salva in blocco (`PUT /api/compendio/persona/:id/affinita`). Un dato solo, letto
// ovunque (scheda, Ombra, Battaglia, dedali, Stanza di Velluto): salvando cambia dappertutto. Sotto un elemento corretto la finestra dice il
// valore della guida («Guida: …»); non c'è un gesto per rimetterlo (decisione dell'utente del 10/11). Niente cestino né «Da rivedere».
// La bozza non salvata si segnala con `useBozzaSporca`.
// ============================================================

import { useState } from 'react';
import { ESITI_AFFINITA } from '../../../shared/elementi';
import { salvaAffinitaPersona } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { AffinitaDto } from '../../types';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  personaId: number;
  /** Il nome per il nome accessibile e per i messaggi («Pixie»). */
  nome: string;
  /** Le affinità di adesso. */
  affinita: AffinitaDto[];
  /** Le affinità della guida, solo se l'utente ne ha corretta almeno una (`null` altrimenti). */
  affinitaGuida: AffinitaDto[] | null;
  /** Dopo un salvataggio: la pagina rilegge la Persona. */
  onCambiato: () => void;
}

const OPZIONI = ESITI_AFFINITA.map((e) => ({ chiave: e.codice, nome: e.nome }));
const nomeCodice = (codice: string) => ESITI_AFFINITA.find((e) => e.codice === codice)?.nome ?? codice;

// L12 (passo 8): nel rilascio (sola lettura) la modifica non esiste; la condizione è costante di build, `ModificaAffinitaReale` esce dal bundle
export const ModificaAffinita: StrumentoDiModifica<typeof ModificaAffinitaReale> = IN_RILASCIO ? NienteInRilascio : ModificaAffinitaReale;
function ModificaAffinitaReale({ personaId, nome, affinita, affinitaGuida, onCambiato }: Props) {
  const [aperta, setAperta] = useState(false);
  const [bozza, setBozza] = useState<Record<string, string>>({});
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const cambiati = aperta ? affinita.filter((a) => (bozza[a.elemento] ?? a.codice) !== a.codice) : [];
  useBozzaSporca('modifica-affinita', `modifica delle affinità di ${nome}`, cambiati.length > 0);

  const apri = () => { setBozza(Object.fromEntries(affinita.map((a) => [a.elemento, a.codice]))); setErrore(null); setAperta(true); };
  const chiudi = () => { setAperta(false); setErrore(null); };

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

  return <>
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica le affinità di ${nome}`} onClick={apri} />
    {aperta && (
      <Modal titolo={`Affinità di ${nome}`} aperta onChiudi={chiudi} larga
        azioni={<>
          <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={chiudi}>Annulla</button>
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || cambiati.length === 0} onClick={() => void salva()} />
        </>}>
        <div className="flex flex-col gap-3">
          <p className="m-0 testo-12 text-text-muted">Salvando, la correzione vale in tutta l’app (scheda, Ombre, Battaglia, dedali, Stanza di Velluto) e resta anche dopo gli aggiornamenti.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {affinita.map((a) => {
              const guida = affinitaGuida?.find((g) => g.elemento === a.elemento)?.codice;
              const attuale = bozza[a.elemento] ?? a.codice;
              return (
                <div key={a.elemento} className="flex flex-col gap-1">
                  <Selettore etichetta={a.elementoNome} valore={attuale} ricerca="mai" disabilitato={occupato} opzioni={OPZIONI} onCambia={(k) => setBozza((b) => ({ ...b, [a.elemento]: k }))} />
                  {guida !== undefined && guida !== attuale && <span className="testo-12 text-text-muted">Guida: {nomeCodice(guida)}</span>}
                </div>
              );
            })}
          </div>
          {errore && <p role="alert" className="m-0 text-sm text-error-testo">{errore} La finestra resta aperta.</p>}
        </div>
      </Modal>
    )}
  </>;
}
