// ============================================================
// RiepilogoEffettiVoce — «Il gioco dà», raggruppato per tipo (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// L'utente trovava illeggibile la frase unica con un acquisto dopo l'altro — «Non si capisce niente... non sarebbe possibile formattarlo
// in modo adeguato? per tutti gli acquisti?» — e ha chiesto di togliere dalle frasi la nota sugli yen. Al posto della frase unica, i gruppi
// che il server costruisce (`AzionePercorsoDto.produceRiepilogo`, `shared/riepilogoEffetti.ts`): l'etichetta del gruppo, un elenco con una
// riga per elemento (nome a sinistra, copie, prezzo o note a destra; su un telefono il dettaglio va a capo sotto il nome, mai troncato) e
// il totale degli acquisti. Solo lettura: nessun comando.
//
// 2026-10-25 («a che prò quel ottenuto messo lì come testo semplice e distanziato? Impaginazione non top»; «le etichette di testo devono
// essere visibili solo se hanno senso»): il dettaglio sta subito dopo il nome, non spinto al bordo opposto della colonna. Le righe di un
// gruppo sono una griglia a due colonne larghe quanto il contenuto (sottogriglia per riga, così l'elemento resta un `<li>`): i prezzi
// si allineano in colonna accanto al nome più lungo, senza il vuoto in mezzo; fino a 640 px (telefono) il dettaglio va sotto il nome
// invece di stringere due colonne, e il testo va a capo, mai troncato. Il titolo del gruppo si mostra solo se dice qualcosa che la riga non dice già (non «Aojiru» sopra «Aojiru»,
// non «Effetti» sopra le frasi di una voce di prima); il titolo del riquadro si può tenere solo per i lettori di schermo dove il
// contenitore lo dice già («Tutti gli effetti della voce»).
// ============================================================

import { useId } from 'react';
import type { GruppoRiepilogoEffettiDto, RispostaRiepilogoEffettiDto } from '../../../shared/riepilogoEffetti';
import { normaNome } from '../../utils/percorso';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  gruppi: readonly GruppoRiepilogoEffettiDto[];
  /** Il titolo del riquadro (per chi legge con un lettore di schermo è anche il nome della regione). */
  titolo?: string;
  /** Falso quando il contenitore dice già che cosa contiene il riquadro: il titolo resta solo per i lettori di schermo. */
  titoloVisibile?: boolean;
}

/**
 * Le risposte giuste di una domanda in classe, di un quiz in TV o di un esame, sotto la domanda (2026-10-26: «devono essere visualizzate
 * le domande ma anche le risposte»). La risposta si distingue non solo per il colore: la spunta accanto, il grassetto e il filo a sinistra
 * del blocco; per un lettore di schermo ogni risposta comincia con «Risposta giusta». Negli esami ogni risposta ha sopra il suo quesito;
 * una domanda a catena (più risposte senza quesito) è un elenco numerato, nell'ordine in cui si danno. Testi lunghi a capo, mai troncati.
 */
function RisposteGiuste({ risposte }: { risposte: readonly RispostaRiepilogoEffettiDto[] }) {
  const catena = risposte.length > 1 && risposte.every((x) => !x.domanda);
  const Elenco = risposte.length > 1 ? 'ol' : 'ul';
  return (
    <Elenco className="m-0 mt-0.5 flex min-w-0 list-none flex-col gap-1 border-l-2 border-primary p-0 pl-2 min-[641px]:col-span-2">
      {risposte.map((x, i) => (
        <li key={`${i}:${x.testo}`} className="flex min-w-0 flex-col">
          {x.domanda && <span className="min-w-0 break-words text-pretty text-text-secondary">{x.domanda}</span>}
          <span className="flex min-w-0 items-start gap-1.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-primary-testo"><IconaAzione chiave="raggiunto" dimensione={14} /></span>
            <span className="min-w-0 break-words font-semibold text-primary-testo">
              <span className="sr-only">Risposta giusta{catena ? ` ${i + 1}` : ''}: </span>
              {catena && <span aria-hidden="true" className="tabular-nums">{i + 1}. </span>}
              {x.testo}
            </span>
          </span>
        </li>
      ))}
    </Elenco>
  );
}

/** Un gruppo: etichetta (se aggiunge qualcosa), elenco delle righe, totale e nota. `riquadro` è il nome del riquadro, che fa da nome
 *  dell'elenco quando il gruppo non ne ha uno suo (il gruppo di ripiego delle voci di prima). */
function Gruppo({ g, riquadro }: { g: GruppoRiepilogoEffettiDto; riquadro: string }) {
  const id = useId();
  // il titolo che ripete l'unica riga («Aojiru» sopra «Aojiru · Conoscenza») o che manca non si scrive; l'elenco tiene comunque un nome
  // per i lettori di schermo: il titolo del gruppo (uguale alla riga) o, senza, quello del riquadro
  const titoloUtile = !!g.titolo && !(g.righe.length === 1 && normaNome(g.righe[0].nome) === normaNome(g.titolo));
  // Impaginazione: fino a 640 px (telefono) il dettaglio va sotto il nome, perché due colonne strette andrebbero a capo entrambe;
  // da 641 px le righe sono una griglia a due colonne larghe quanto il contenuto (sottogriglia per riga, così l'elemento resta un `<li>`)
  return (
    <div className="flex w-fit min-w-0 max-w-full flex-col gap-0.5">
      {titoloUtile && <span id={id} className="testo-12 font-semibold text-text-secondary break-words">{g.titolo}</span>}
      <ul aria-labelledby={titoloUtile ? id : undefined} aria-label={titoloUtile ? undefined : g.titolo || riquadro}
        className="m-0 flex list-none flex-col gap-1 p-0 min-[641px]:grid min-[641px]:grid-cols-[minmax(0,max-content)_minmax(0,max-content)] min-[641px]:gap-x-3 min-[641px]:gap-y-0">
        {g.righe.map((r, i) => (
          <li key={`${i}:${r.nome}`} className="flex min-w-0 flex-col testo-13 min-[641px]:col-span-2 min-[641px]:grid min-[641px]:grid-cols-subgrid min-[641px]:items-baseline">
            <span className={`min-w-0 break-words ${r.risposte ? 'text-pretty' : ''} ${r.dettaglio ? '' : 'min-[641px]:col-span-2'}`}>{r.nome}</span>
            {r.dettaglio && <span className="min-w-0 break-words text-text-secondary tabular-nums">{r.dettaglio}</span>}
            {r.risposte && <RisposteGiuste risposte={r.risposte} />}
          </li>
        ))}
      </ul>
      {g.totale && <p className="m-0 border-t border-border pt-0.5 testo-13 font-semibold tabular-nums break-words">{g.totale}</p>}
      {g.nota && <p className="m-0 testo-12 text-text-muted break-words text-pretty">{g.nota}</p>}
    </div>
  );
}

/** Il riepilogo della voce: niente se non ci sono gruppi. */
export function RiepilogoEffettiVoce({ gruppi, titolo = 'Il gioco dà', titoloVisibile = true }: Props) {
  const id = useId();
  if (gruppi.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-bg-tertiary p-2">
      <span id={id} className={titoloVisibile ? 'testo-12 text-text-muted' : 'sr-only'}>{titolo}</span>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-x-4 gap-y-2">
        {gruppi.map((g) => <Gruppo key={g.chiave} g={g} riquadro={titolo} />)}
      </div>
    </section>
  );
}
