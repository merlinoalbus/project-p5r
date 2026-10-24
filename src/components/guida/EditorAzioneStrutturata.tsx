// ============================================================
// EditorAzioneStrutturata — tipo, «Quale» e «Spuntando succede» di una cosa da fare (finestra della voce, tavole approvate 2026-10-24)
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le azioni della guida, e quelle che aggiunge lui, si devono poter classificare e collegare come
// le altre, e i punti della spunta vengono dagli effetti dichiarati, non dal testo delle note. Dal 2026-10-24:
//   - il tipo (è l'icona della voce) si sceglie da una griglia di icone e decide a che cosa si collega la voce;
//   - «Quale» si sceglie guardando (ritratti, emblemi, icone) e porta con sé l'effetto della spunta, già compilato;
//   - l'effetto si legge come frase nel riquadro «Spuntando succede» e si regola solo il necessario (note ♪, sessioni, rango atteso).
// Il formato degli effetti non cambia (`EffettoVoce`): cambia come si sceglie. Le due parti stanno in due colonne della finestra
// (`ModuloVoceGiornata`), quindi sono due componenti.
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { SelettoreIcone } from '../shared/SelettoreIcone';
import { Selettore } from '../shared/Selettore';
import { AssetImg } from '../shared/AssetImg';
import { DialogoRango } from '../confidenti/DialogoRango';
import { useDettaglioConfidente } from '../partita/useDettaglioConfidente';
import { RigaEffettoVoceLegacy } from './RigaEffettoVoceLegacy';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { FilaScelta } from './FilaScelta';
import { SceltaQuale } from './SceltaQuale';
import { DotiProprieTurno } from './CampiEffettoVoce';
import { opzioniArticoli, opzioniDomande, opzioniStoria, type ElenchiVoce } from '../../utils/opzioniEffetti';
import { EffettiNonConvertibili } from './EditorEffettiVoce';
import { TIPI_AZIONE, type EffettoAzione, type TipoAzione } from '../../../shared/effettiAzione';
import { nomeDote } from '../../../shared/doti';
import type { EffettoVoce } from '../../../shared/effettiVoce';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import { cambiaCollegamento, contestoDa, fraseEffetto, impostaPrincipale, indicePrincipale, tipoQuale, type NomiEffetti } from '../../utils/effettoAutomatico';

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
}

const NOTE = [{ chiave: '1', nome: '♪' }, { chiave: '2', nome: '♪♪' }, { chiave: '3', nome: '♪♪♪' }];
const SESSIONI = [{ chiave: '', nome: 'Completato' }, ...Array.from({ length: 9 }, (_, i) => ({ chiave: String(i + 1), nome: String(i + 1) }))];
/** Il rango atteso: Nessuno, 1…9 e MAX (il rango 10), con le cifre del rango (`ui/rango-N`) quando ci sono. */
const RANGHI = [{ chiave: '', nome: 'Nessuno' }, ...Array.from({ length: 10 }, (_, i) => {
  const n = i + 1;
  return { chiave: String(n), nome: n === 10 ? 'Rango MAX' : `Rango ${n}`, contenuto: <AssetImg nome={n === 10 ? 'ui/rango-max' : `ui/rango-${n}`} alt="" decorativa className="h-7 w-7 object-contain" fallback={<span className="font-display text-[16px] leading-none">{n === 10 ? 'MAX' : n}</span>} /> };
})];

/** Anteprima, mentre si scrive la voce, delle risposte migliori dell'evento del rango atteso: le stesse compariranno fra le note della
 *  voce (progetto dei Confidenti approvato dall'utente, 2026-10-24). Sola lettura, dal dettaglio del Confidente (in cache). */
function AnteprimaRisposte({ chiave, rango }: { chiave: string; rango: number }) {
  const { dati, caricamento, errore } = useDettaglioConfidente(chiave);
  const [chiusi, setChiusi] = useState<Record<number, boolean>>({});
  const dialoghi = (dati?.dialoghi ?? []).filter((d) => d.rango === rango);
  return (
    <div className="risposte-voce" role="group" aria-label={`Anteprima delle risposte migliori del rango ${rango}`}>
      <span className="risposte-voce__titolo">Anteprima · risposte migliori del rango {rango}</span>
      <span className="text-[12px] text-text-muted">Compariranno fra le note della voce; spuntandola, la scelta delle note parte da qui.</span>
      {caricamento && <span className="text-[12px] text-text-muted" role="status">Carico le risposte…</span>}
      {errore && <span className="text-[12px] text-error" role="alert">Risposte non disponibili: {errore}</span>}
      {dati && dialoghi.length === 0 && <span className="text-[12px] text-text-muted">Nessun dialogo documentato per il rango {rango}.</span>}
      {dialoghi.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {dialoghi.map((d) => <DialogoRango key={d.id} d={d} aperto={!chiusi[d.id]} onToggle={() => setChiusi((c) => ({ ...c, [d.id]: !c[d.id] }))} />)}
        </ul>
      )}
    </div>
  );
}

/**
 * Colonna sinistra: la griglia dei 13 tipi (le icone delle voci, con il nome sotto) e «Quale» del tipo scelto. Cambiare tipo azzera
 * il collegamento e l'effetto che il vecchio tipo aveva dato (se nato in questa finestra); scegliere «Quale» compila l'effetto.
 */
export function SceltaTipoQuale({ valore, onCambia, elenchi }: Props) {
  const ctx = useMemo(() => contestoDa(elenchi.azione), [elenchi.azione]);
  const rif = valore.riferimento;
  const tq = tipoQuale(valore.tipo, rif);
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-text-secondary">Tipo — è l’icona della voce</span>
        <SelettoreIcone etichetta="Tipo della voce" compatto valore={valore.tipo} opzioni={TIPI_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome, categoria: t.chiave }))}
          onCambia={(t) => { if (t !== valore.tipo) onCambia(cambiaCollegamento(valore, t as TipoAzione, null, ctx)); }} />
      </div>
      {tq && (
        <SceltaQuale tipo={tq} elenchi={elenchi.azione} valore={rif?.chiave ?? ''} soloTurni={valore.tipo === 'lavoro'}
          onCambia={(chiave) => onCambia(cambiaCollegamento(valore, valore.tipo, chiave ? { tipo: tq, chiave } : null, ctx))} />
      )}
    </div>
  );
}

/** Il nome dell'elemento collegato, dagli elenchi. */
function nomeCollegato(valore: CampiStrutturati, elenchi: ElenchiVoce): string | null {
  const rif = valore.riferimento;
  if (!rif) return null;
  const a = elenchi.azione;
  const lista = rif.tipo === 'confidente' ? a.confidenti : rif.tipo === 'dungeon' ? a.dungeon : rif.tipo === 'richiesta' ? a.richieste : rif.tipo === 'libro' ? a.libri : rif.tipo === 'film' ? a.film : rif.tipo === 'attivita' ? a.attivita : rif.tipo === 'negozio' ? a.negozi : a.doti;
  return lista.find((v) => v.chiave === rif.chiave)?.nome ?? null;
}

/**
 * Colonna destra, in alto: «Spuntando succede». L'effetto principale è quello che tipo e «Quale» producono da soli, scritto come
 * frase e regolabile solo dove serve. Una voce di cui il formato originario degli effetti non si converte mostra l'avviso e il
 * testo originario; una senza elenco unico degli effetti (formato storico) conserva i vecchi controlli.
 */
export function SpuntandoSuccede({ valore, onCambia, elenchi, nomi }: Props & { nomi: NomiEffetti }) {
  const righe = valore.effettiVoce;
  const rif = valore.riferimento;
  const nome = nomeCollegato(valore, elenchi);
  const i = righe ? indicePrincipale(righe, valore.tipo, rif) : -1;
  const eff: EffettoVoce | null = righe && i >= 0 ? righe[i].effetto : null;
  const frase = (t: string) => <p className="m-0 text-[13px] break-words">{t}</p>;
  const scrivi = (e: EffettoVoce | null) => onCambia(impostaPrincipale(valore, e));
  const mancaQuale = (cosa: string) => frase(`Scegli ${cosa}: l’effetto della spunta si compila da solo.`);
  /** Voce con effetti salvati ma nessuno principale: la frase «registra solo che l’hai fatta» sarebbe falsa. */
  const soloAggiuntivi = 'Nessun effetto automatico dal collegamento: gli effetti salvati su questa voce sono quelli elencati negli effetti aggiuntivi qui sotto.';

  let corpo: ReactNode;
  if (righe === undefined && valore.fonteEffetti) {
    corpo = <EffettiNonConvertibili valore={valore} onRicostruisci={() => onCambia({ ...valore, effettiVoce: [] })} />;
  } else if (righe === undefined) {
    corpo = <EffettiStorici valore={valore} onCambia={onCambia} elenchi={elenchi} />;
  } else {
    switch (valore.tipo) {
      case 'confidente': {
        const rango = valore.rangoAtteso;
        corpo = (
          <>
            {nome ? frase(`Incontro con ${nome} (la Dote dell’incontro, se c’è) e le note della risposta che scegli alla spunta.`) : mancaQuale('il Confidente')}
            {rif && (
              <>
                <span className="text-[13px] text-text-secondary">Rango atteso</span>
                <FilaScelta etichetta="Rango atteso" valore={rango === null ? '' : String(rango)} opzioni={RANGHI} onCambia={(v) => onCambia({ ...valore, rangoAtteso: v ? Number(v) : null })} />
                {rango !== null && nome && frase(rango === 10 ? `Con il rango atteso MAX la spunta porta ${nome} al rango massimo.` : `Con il rango atteso ${rango} la spunta porta ${nome} al rango ${rango}.`)}
                {rango !== null && <AnteprimaRisposte chiave={rif.chiave} rango={rango} />}
              </>
            )}
          </>
        );
        break;
      }
      case 'dote':
        corpo = eff?.tipo === 'dote' ? (
          <>
            {frase(`${nomeDote(eff.dote)} +${'♪'.repeat(eff.note)}: la Dote che dà il gioco, da segnare nelle Doti.`)}
            <span className="text-[13px] text-text-secondary">Note che dà il gioco</span>
            <FilaScelta etichetta="Note della Dote" valore={String(eff.note)} opzioni={NOTE} onCambia={(v) => scrivi({ ...eff, note: Number(v) as 1 | 2 | 3 })} />
          </>
        ) : mancaQuale('la Dote');
        break;
      case 'libro': case 'dvd': case 'attivita': {
        const cosa = valore.tipo === 'libro' ? 'il libro' : valore.tipo === 'dvd' ? 'il film' : 'l’attività';
        corpo = eff?.tipo === 'lettura' ? (
          <>
            {frase(fraseEffetto(eff, nomi))}
            <span className="text-[13px] text-text-secondary">{valore.tipo === 'dvd' ? 'Visioni o serate' : 'Sessioni'}: almeno</span>
            <FilaScelta etichetta="Fin dove arriva" valore={eff.almeno === null ? '' : String(eff.almeno)} opzioni={SESSIONI} onCambia={(v) => scrivi({ ...eff, almeno: v === '' ? null : Number(v) })} />
          </>
        ) : rif ? frase(righe.length === 0 ? 'Questa attività non ha un avanzamento da segnare: la spunta registra solo che l’hai fatta.' : soloAggiuntivi) : mancaQuale(cosa);
        break;
      }
      case 'lavoro':
        corpo = eff?.tipo === 'turno' ? (
          <>
            {frase(fraseEffetto(eff, nomi))}
            <DotiProprieTurno effetto={eff} onCambia={scrivi} />
          </>
        ) : rif ? frase(righe.length === 0 ? 'Questa attività non si conta per turni: la spunta registra solo che l’hai fatta.' : soloAggiuntivi) : mancaQuale('il lavoro');
        break;
      case 'richiesta':
        corpo = eff?.tipo === 'richiesta' ? frase(`${fraseEffetto(eff, nomi)}. La spunta la segna; togliendola torna com’era.`) : mancaQuale('la Richiesta');
        break;
      case 'acquisto':
        corpo = rif ? (
          <>
            {frase(eff?.tipo === 'articolo' ? fraseEffetto(eff, nomi) : `Acquisto${nome ? ` da ${nome}` : ''}: scegli l’articolo per segnarlo come comprato, oppure lascia solo il promemoria.`)}
            <Selettore etichetta="Articolo comprato" vuoto="Nessun articolo" valore={eff?.tipo === 'articolo' ? eff.articolo : ''} opzioni={opzioniArticoli(elenchi.effetti, rif.chiave)}
              onCambia={(v) => scrivi(v ? { tipo: 'articolo', articolo: v } : null)} />
            <span className="text-[12px] text-text-muted">Gli yen del prezzo restano un promemoria da cambiare a mano.</span>
          </>
        ) : mancaQuale('il negozio');
        break;
      case 'esame':
        corpo = (
          <>
            {frase(eff?.tipo === 'domanda' ? fraseEffetto(eff, nomi) : 'Scegli la domanda del giorno: la spunta la segna come risposta.')}
            <Selettore etichetta="Domanda" vuoto="Nessuna domanda" valore={eff?.tipo === 'domanda' ? String(eff.domanda) : ''} opzioni={opzioniDomande(elenchi, eff?.tipo === 'domanda' ? eff.domanda : null)}
              onCambia={(v) => scrivi(v ? { tipo: 'domanda', domanda: Number(v) } : null)} />
          </>
        );
        break;
      case 'trama':
        corpo = (
          <>
            {frase(eff?.tipo === 'storia' ? fraseEffetto(eff, nomi) : 'Scegli l’evento di storia: la spunta lo segna avvenuto.')}
            <Selettore etichetta="Evento di storia" vuoto="Nessun evento" valore={eff?.tipo === 'storia' ? eff.evento : ''} opzioni={opzioniStoria(eff?.tipo === 'storia' ? eff.evento : '')}
              onCambia={(v) => scrivi(v ? { tipo: 'storia', evento: v } : null)} />
          </>
        );
        break;
      case 'palazzo':
        corpo = frase('Nessun effetto della spunta: le infiltrazioni si scelgono sulla voce, come prima.');
        break;
      default:
        corpo = frase('Nessun effetto automatico. Se serve, aggiungilo dagli effetti aggiuntivi qui sotto.');
    }
  }
  return (
    <section className="effetto-riquadro" aria-label="Spuntando succede">
      <h3 className="effetto-riquadro__titolo m-0">Spuntando succede</h3>
      {corpo}
    </section>
  );
}

/** Voci col solo formato storico (`produce`, senza elenco unico degli effetti): i controlli di sempre, finché la voce non si converte. */
function EffettiStorici({ valore, onCambia, elenchi }: Props) {
  const imposta = (p: Partial<CampiStrutturati>) => onCambia({ ...valore, ...p });
  const nuovo: EffettoAzione = { tipo: 'dote', dote: 'fascino', note: 2 };
  return (
    <div className="flex flex-col gap-2">
      {valore.produce.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessun effetto: la spunta segna solo che l’hai fatto.</p>}
      {valore.produce.length > 0 && <p className="m-0 text-[12px] text-text-muted">Le Doti te le ricorda e le segni tu nella scheda Doti; letture e turni li segna la spunta.</p>}
      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {valore.produce.map((e, i) => (
          <RigaEffettoVoceLegacy key={i} numero={i + 1} effetto={e} elenchi={elenchi.azione}
            onCambia={(n) => imposta({ produce: valore.produce.map((x, j) => (j === i ? n : x)) })}
            onTogli={() => imposta({ produce: valore.produce.filter((_, j) => j !== i) })} />
        ))}
      </ul>
      {valore.produce.length < 20 && (
        <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" onClick={() => imposta({ produce: [...valore.produce, nuovo] })} />
      )}
    </div>
  );
}
