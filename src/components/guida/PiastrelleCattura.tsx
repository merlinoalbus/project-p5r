// ============================================================
// PiastrelleCattura — la piastrella con cui si cattura una Persona: la stessa nei Memento, nei Palazzi, in Battaglia e nella pagina Ombra (L8, R8-29)
// ============================================================
//
// Una Persona è catturata se è registrata nel compendio della partita (scelte dell'utente, 2026-10-12): un tocco sulla piastrella la registra
// (passando da `PUT /partite/:id/compendio/:personaId`, la strada unica), togliere la registrazione cancella livello, bonus e abilità che vi
// aveva registrati e per questo chiede conferma — la stessa frase ovunque (R8-14). Dal lotto L8 la griglia è adattiva a ogni larghezza (piastrelle
// da almeno 88 px, nessuno scorrimento orizzontale) e il segno «catturata» e il gesto sono uguali in ogni vista. Un'Ombra che non si cattura
// dall'incontro (Babau/Bugs, le non reclutabili) mostra la piastrella senza il gesto, e dice dove registrare la Persona.
// ============================================================

import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { AssetImg } from '../shared/AssetImg';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Una voce da catturare: la Persona del compendio, il nome da mostrare e, se viene da un'Ombra, la sua chiave e se l'incontro espone il gesto. */
export interface PiastrellaCatturabile {
  /** Identità stabile (chiave React): la voce della guida o l'Ombra. */
  chiave: string;
  persona: { id: number; nome: string; nomeIt: string } | null;
  /** Il nome da mostrare: quello dell'Ombra se c'è, altrimenti quello della Persona. */
  etichetta: string;
  /** L'Ombra dell'incontro: il server controlla che sia catturabile. */
  ombra?: string;
  /** Falso per un'Ombra che non si cattura dall'incontro (Babau/Bugs, non reclutabili). */
  catturabile?: boolean;
}

/** Il segno «catturata» nell'angolo della piastrella; la riserva è una spunta su un tondo verde. */
function SegnoCatturata() {
  return (
    <AssetImg nome="ui/persona-catturata" alt="" decorativa className="absolute right-0.5 top-0.5 size-5 object-contain"
      fallback={<span aria-hidden className="absolute right-0.5 top-0.5 rounded-full bg-success px-1 text-[11px] font-bold leading-[18px] text-white">✓</span>} />
  );
}

interface Props {
  voci: ReadonlyArray<PiastrellaCatturabile>;
  partitaId: number | null;
  /** Le Persona registrate nel compendio della partita (id); null senza partita o mentre si legge. */
  catturate: ReadonlySet<number> | null;
  /** La piastrella occupata dal gesto in corso (una alla volta). */
  occupata?: number | null;
  /** Il tocco: registra, o chiede di togliere (la conferma la mostra chi usa il componente). */
  onTocca: (v: PiastrellaCatturabile, catturata: boolean) => void;
  /** La chiave della piastrella con il riquadro «i» aperto, e il suo apri/chiudi; senza `onInfo` il segno «i» non c'è. */
  apertaChiave?: string | null;
  onInfo?: (chiave: string | null) => void;
  'aria-label': string;
}

/** La griglia delle piastrelle: da 88 px, adattiva, senza scorrimento orizzontale. */
export function PiastrelleCattura({ voci, partitaId, catturate, occupata = null, onTocca, apertaChiave = null, onInfo, 'aria-label': ariaLabel }: Props) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5 p-0" aria-label={ariaLabel}>
      {voci.map((v) => {
        const presa = !!v.persona && !!catturate?.has(v.persona.id);
        const nome = v.etichetta;
        const gesto = v.catturabile !== false;
        const disattiva = !partitaId || !v.persona || catturate === null || occupata === v.persona.id || (!gesto && !presa);
        const titolo = !partitaId ? 'Attiva una partita per segnare le catture'
          : !v.persona ? 'Scegli la Persona del compendio («Modifica la guida») per segnarla'
          : !gesto && !presa ? 'Non si cattura dall’incontro: la Persona si registra dal compendio o per fusione'
          : presa ? 'Nel compendio della partita: tocca per toglierla' : 'Tocca quando l’hai catturata: entra nel compendio della partita';
        return (
          <li key={v.chiave} className={`relative flex min-h-[88px] min-w-0 flex-col rounded-md border ${presa ? 'border-success bg-success/10' : 'border-border-light bg-white/[0.02]'} ${apertaChiave === v.chiave ? 'ring-2 ring-primary/60' : ''}`}>
            <button type="button" className="touch relative flex min-w-0 flex-col items-center gap-1 px-1 pt-1.5 pb-1 text-center disabled:cursor-default"
              aria-pressed={presa} disabled={disattiva}
              aria-label={`${nome}${v.persona && v.persona.nomeIt !== nome ? ` (${v.persona.nomeIt})` : ''}: ${presa ? 'catturata' : gesto ? 'da catturare' : 'non si cattura dall’incontro'}`}
              title={titolo}
              onClick={() => v.persona && onTocca(v, !presa)}>
              <AnteprimaPersona nome={v.persona?.nome ?? v.etichetta} etichetta={nome} dimensione={56} contieni className="rounded" />
              {presa && <SegnoCatturata />}
              <span className="w-full break-words text-[11px] font-semibold leading-tight">{nome}</span>
            </button>
            {onInfo && (
              <button type="button" className={`touch mt-auto inline-flex items-center justify-center border-t border-border-light text-[12px] font-bold italic ${apertaChiave === v.chiave ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                aria-expanded={apertaChiave === v.chiave} aria-label={`Dettagli di ${nome}`} title="Debolezze e scheda del compendio" onClick={() => onInfo(apertaChiave === v.chiave ? null : v.chiave)}>
                i
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * L'avviso, uguale in ogni vista (R8-14), prima di togliere una Persona dal compendio: esce da tutte le aree e da tutti i dedali, con il livello,
 * i bonus e le abilità che vi aveva registrati.
 */
export function AvvisoTogliPersona({ nome, occupato, onConferma, onAnnulla }: { nome: string; occupato: boolean; onConferma: () => void; onAnnulla: () => void }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 px-2.5 py-2 text-[12px]" aria-label="Conferma: togliere la Persona dal compendio">
      <span>{nome} esce dal compendio della partita, in tutte le aree e in tutti i dedali, con il livello, i bonus e le abilità che vi aveva registrati.</span>
      <div className="flex flex-wrap gap-1.5">
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli dal compendio" disabled={occupato} onClick={onConferma} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" disabled={occupato} onClick={onAnnulla} />
      </div>
    </section>
  );
}
