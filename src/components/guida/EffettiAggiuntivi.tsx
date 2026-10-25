// ============================================================
// EffettiAggiuntivi — gli effetti della spunta oltre a quello principale: ripiegati in fondo, un menu a icone, una scheda per effetto
// ============================================================
//
// Tavola approvata (2026-10-24): ogni effetto è una scheda con la frase, «Modifica» e «Togli»; niente UID visibili, niente frecce
// Su/Giù (l'ordine degli effetti non conta per l'utente). «Aggiungi» apre un menu a icone: Fortuna di Chihaya, Invito avvenuto, Persona
// registrata, Cruciverba, Dote / Lettura / Turno in più; sotto «Avanzate» Aojiru e Pesca, con le regole di sempre, e gli effetti che
// di norma nascono da tipo e «Quale» (evento di storia, domanda, Richiesta, articolo) per chi li vuole su una voce di altro tipo.
// ============================================================

import { useState } from 'react';
import { ARTICOLO_AOJIRU } from '../../../shared/acquisti';
import type { EffettoVoce } from '../../../shared/effettiVoce';
import { ATTIVITA_PESCA, REGOLA_PESCA } from '../../../shared/pesca';
import { PulsanteVisivo, FrecciaApertura } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaCategoria } from './IconaCategoria';
import { CampiEffettoVoce } from './CampiEffettoVoce';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { effettoCompleto, type CampiStrutturati } from '../../utils/azioneStrutturata';
import { NOME_FAMIGLIA_EFFETTO, fraseEffetto, indicePrincipale, type NomiEffetti, type RigaEffetto } from '../../utils/effettoAutomatico';

type Tipo = EffettoVoce['tipo'];

/** Un effetto appena aggiunto: il più semplice, con l'oggetto da scegliere (chiave vuota, o 0 per i numeri). */
function effettoNuovo(t: Tipo): EffettoVoce {
  switch (t) {
    case 'dote': return { tipo: 'dote', dote: 'fascino', note: 2 };
    case 'lettura': return { tipo: 'lettura', categoria: 'libro', chiave: '', almeno: null };
    case 'turno': return { tipo: 'turno', attivita: '' };
    case 'acquisto': return { tipo: 'acquisto', articolo: ARTICOLO_AOJIRU, variante: null, sostituisceDoti: [] };
    case 'pesca': return { tipo: 'pesca', regola: REGOLA_PESCA, attivita: ATTIVITA_PESCA, sostituisceTurni: [], sostituisceDoti: [] };
    case 'fortuna': return { tipo: 'fortuna', dote: 'coraggio' };
    case 'storia': return { tipo: 'storia', evento: '' };
    case 'domanda': return { tipo: 'domanda', domanda: 0 };
    case 'cruciverba': return { tipo: 'cruciverba', data: '' };
    case 'richiesta': return { tipo: 'richiesta', richiesta: '' };
    case 'articolo': return { tipo: 'articolo', articolo: '' };
    case 'invito': return { tipo: 'invito', invito: '' };
    case 'persona': return { tipo: 'persona', persona: 0 };
  }
}

const MENU: ReadonlyArray<{ tipo: Tipo; nome: string; categoria: string }> = [
  { tipo: 'fortuna', nome: 'Fortuna di Chihaya', categoria: 'dote' }, { tipo: 'invito', nome: 'Invito avvenuto', categoria: 'confidente' }, { tipo: 'persona', nome: 'Persona registrata', categoria: 'velluto' },
  { tipo: 'cruciverba', nome: 'Cruciverba', categoria: 'esame' }, { tipo: 'dote', nome: 'Dote in più', categoria: 'dote' }, { tipo: 'lettura', nome: 'Lettura in più', categoria: 'libro' },
  { tipo: 'turno', nome: 'Turno in più', categoria: 'lavoro' },
];
const AVANZATE: ReadonlyArray<{ tipo: Tipo; nome: string; categoria: string }> = [
  { tipo: 'acquisto', nome: 'Aojiru', categoria: 'acquisto' }, { tipo: 'pesca', nome: 'Pesca a Ichigaya', categoria: 'attivita' },
  { tipo: 'storia', nome: 'Evento di storia', categoria: 'trama' }, { tipo: 'domanda', nome: 'Domanda risposta', categoria: 'esame' },
  { tipo: 'richiesta', nome: 'Richiesta completata', categoria: 'richiesta' }, { tipo: 'articolo', nome: 'Articolo comprato', categoria: 'acquisto' },
];
const CATEGORIA_DI: Record<Tipo, string> = Object.fromEntries([...MENU, ...AVANZATE].map((m) => [m.tipo, m.categoria])) as Record<Tipo, string>;

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
  nomi: NomiEffetti;
}

/** Il blocco ripiegato degli effetti aggiuntivi. */
export function EffettiAggiuntivi({ valore, onCambia, elenchi, nomi }: Props) {
  const righe = valore.effettiVoce ?? [];
  const principale = indicePrincipale(righe, valore.tipo, valore.riferimento, valore.uidPrincipale);
  const aggiuntivi = righe.map((r, i) => ({ r, i })).filter(({ i }) => i !== principale);
  const [aperto, setAperto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [avanzate, setAvanzate] = useState(false);
  /** Indice (nella lista completa) della scheda aperta in modifica: una sola alla volta. */
  const [inModifica, setInModifica] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const imposta = (effettiVoce: RigaEffetto[]) => { setErrore(null); onCambia({ ...valore, effettiVoce }); };
  const cambia = (i: number, effetto: EffettoVoce) => imposta(righe.map((r, j) => (j === i ? { ...r, effetto } : r)));
  const togli = (i: number) => {
    const uid = righe[i]?.uid;
    if (uid && righe.some((r) => (r.effetto.tipo === 'acquisto' && r.effetto.sostituisceDoti.includes(uid)) || (r.effetto.tipo === 'pesca' && [...r.effetto.sostituisceTurni, ...r.effetto.sostituisceDoti].includes(uid)))) {
      setErrore('Questo effetto è indicato come sostituito da un acquisto Aojiru o da una sessione di pesca. Rivedi prima quel collegamento.');
      return;
    }
    setInModifica((m) => (m === null ? null : m === i ? null : m > i ? m - 1 : m));
    imposta(righe.filter((_, j) => j !== i));
  };
  const aggiungi = (t: Tipo) => {
    setMenu(false); setAvanzate(false); setAperto(true);
    setInModifica(righe.length);
    imposta([...righe, { uid: null, effetto: effettoNuovo(t) }]);
  };

  if (valore.effettiVoce === undefined) return null;
  const voceMenu = (m: { tipo: Tipo; nome: string; categoria: string }) => (
    <PulsanteVisivo key={m.tipo} tono="secondario" disposizione="colonna" icona={<IconaCategoria categoria={m.categoria} dimensione={48} />} titolo={m.nome} onClick={() => aggiungi(m.tipo)} />
  );
  return (
    <section className="flex flex-col gap-2" aria-label="Effetti aggiuntivi">
      <PulsanteVisivo className="self-start" icona={<IconaAzione chiave="dettagli" dimensione={22} />} aria-expanded={aperto} onClick={() => setAperto((a) => !a)}
        titolo={<>Effetti aggiuntivi{aggiuntivi.length ? ` (${aggiuntivi.length})` : ''}<FrecciaApertura aperto={aperto} /></>} dettaglio="Fortuna, invito, Persona, cruciverba…" />
      {aperto && (
        <div className="flex flex-col gap-2">
          {aggiuntivi.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessun effetto aggiuntivo.</p>}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {aggiuntivi.map(({ r, i }) => {
              const completo = effettoCompleto(r.effetto);
              const editing = inModifica === i || !completo;
              return (
                <li key={r.uid ?? `nuovo-${i}`} className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-bg-tertiary p-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <IconaCategoria categoria={CATEGORIA_DI[r.effetto.tipo]} dimensione={32} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display testo-13 uppercase tracking-wide text-primary-testo">{NOME_FAMIGLIA_EFFETTO[r.effetto.tipo]}</span>
                      <span className="testo-13 break-words">{completo ? fraseEffetto(r.effetto, nomi) : 'Da scegliere qui sotto.'}</span>
                    </div>
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={editing && completo ? 'Chiudi' : 'Modifica'}
                      aria-label={`${editing && completo ? 'Chiudi' : 'Modifica'}: ${NOME_FAMIGLIA_EFFETTO[r.effetto.tipo]}`} disabled={!completo} onClick={() => setInModifica(inModifica === i ? null : i)} />
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli: ${NOME_FAMIGLIA_EFFETTO[r.effetto.tipo]}`} onClick={() => togli(i)} />
                  </div>
                  {editing && <CampiEffettoVoce effetto={r.effetto} elenchi={elenchi} righe={righe} onCambia={(e) => cambia(i, e)} />}
                </li>
              );
            })}
          </ul>
          {errore && <p role="alert" className="m-0 text-error-testo testo-12">{errore}</p>}
          {righe.length < 100 && (
            <div className="flex flex-col gap-2">
              <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" attivo={menu} aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
              {menu && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">{MENU.map(voceMenu)}</div>
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="dettagli" dimensione={20} />} titolo={<>Avanzate<FrecciaApertura aperto={avanzate} /></>} className="self-start" aria-expanded={avanzate} onClick={() => setAvanzate((a) => !a)} />
                  {avanzate && <div className="flex flex-wrap gap-1.5">{AVANZATE.map(voceMenu)}</div>}
                </div>
              )}
            </div>
          )}
          <p className="m-0 testo-12 text-text-secondary">Su una voce già fatta, gli effetti aggiunti o modificati compaiono come pulsante «Applica» sulla voce. Le ricevute della spunta rimangono distinte dalla configurazione corrente.</p>
        </div>
      )}
    </section>
  );
}
