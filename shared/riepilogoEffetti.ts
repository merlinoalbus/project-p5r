// ============================================================
// riepilogoEffetti — che cosa dà una voce, raggruppato per tipo (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// L'utente, sulla voce «Raccogli oggetti curativi dal distributore accanto al Bagno Pubblico», trovava illeggibile una frase unica con un
// acquisto dopo l'altro, ognuno con la sua nota sugli yen — «Non si capisce niente... non sarebbe possibile formattarlo in modo
// adeguato? per tutti gli acquisti?» — e poi ha chiesto di togliere dalle frasi la nota sugli yen. La frase unica diventa un DATO: gruppi
// con un'etichetta («Acquisti · Distributore del bagno pubblico», «Doti sociali», «Turni»…), una riga breve per elemento (nome e dettaglio
// separati) e il totale degli acquisti. Nel riepilogo restano solo i fatti: nessuna istruzione sugli yen.
//
// È l'unico punto che costruisce il riepilogo: il server lo calcola per ogni voce (`AzionePercorsoDto.produceRiepilogo`, con i nomi del DB)
// e la pagina lo mostra così com'è (`RiepilogoEffettiVoce`). Le parole dei singoli effetti vengono dalle stesse fonti delle frasi
// (`partiEffettoAzione`, `contoArticoli`, i nomi di `NomiFraseEffetto`): nessuna chiave grezza, mai testo troncato.
// ============================================================

import { EVENTI_STORIA, dataLeggibile } from './condizioniSpillo.js';
import { nomeDote } from './doti.js';
import { partiEffettoAzione, type NomiEffettiAzione } from './effettiAzione.js';
import { contoArticoli, gruppiAlternativi, type EffettoVoce, type NomiFraseEffetto, type RigaContoArticoli } from './effettiVoce.js';

/** Una riga del riepilogo: il nome dell'elemento e, se aggiunge qualcosa al titolo del gruppo, che cosa ne viene (copie e prezzo, note, paga).
 *  `contenuto` (L13, decisione 4): che cosa contiene un set, in una riga («Cerotto alla caffeina · Gocce per occhioni ×10»), se il catalogo lo dice. */
export interface RigaRiepilogoEffettiDto { nome: string; dettaglio?: string; contenuto?: string }
/** Un gruppo del riepilogo: l'etichetta, le righe nell'ordine degli effetti, il totale (solo gli acquisti) e una nota che vale per tutto il gruppo. */
export interface GruppoRiepilogoEffettiDto {
  /** Identità stabile del gruppo nella voce («acquisti:distributore-bagno», «doti», «turni»). */
  chiave: string;
  titolo: string;
  righe: RigaRiepilogoEffettiDto[];
  /** «Totale ¥400»: solo negli acquisti con più di un articolo o più copie, e se almeno un articolo ha il prezzo. */
  totale?: string;
  nota?: string;
}

/** I nomi del riepilogo: quelli delle frasi (`NomiFraseEffetto`, `NomiEffettiAzione`), più il negozio di un articolo e la paga di un turno. */
export interface NomiRiepilogoEffetti {
  frase: NomiFraseEffetto;
  azione: NomiEffettiAzione;
  /** Il nome del negozio dalla sua chiave (la chiave di un articolo è «negozio/articolo»). */
  negozio: (chiave: string) => string | undefined;
  /** La paga dell'attività per un turno, se l'attività ne ha una (solo un'informazione: gli yen non si muovono da qui). */
  pagaTurno: (attivita: string) => { yen: number; massima: number | null } | undefined;
  /** L13 (decisione 4): gli articoli con cui un articolo non si compra insieme (le sue condizioni «non: articolo ottenuto»). Senza: nessuna alternativa. */
  incompatibili?: (articolo: string) => readonly string[] | undefined;
  /** L13 (decisione 4): che cosa contiene un articolo (un set delle televendite): gli oggetti con le copie. */
  contenuto?: (articolo: string) => ReadonlyArray<{ nome: string; quantita: number | null }> | undefined;
}

/** Le opzioni del riepilogo. `comprati`: a voce spuntata, gli articoli che la spunta ha segnato (fra quelli in alternativa resta solo quello
 *  scelto, o «nessuno»); assente prima della spunta, quando le alternative si mostrano tutte. */
export interface OpzioniRiepilogoEffetti { comprati?: ReadonlySet<string> }

const yen = (n: number): string => `¥${Math.abs(n).toLocaleString('it-IT')}`;
/** Il negozio di un articolo: la parte della chiave prima della barra. */
const negozioDellArticolo = (chiave: string): string => (chiave.includes('/') ? chiave.slice(0, chiave.indexOf('/')) : chiave);

/** L13 (decisione 4): che cosa contiene un set, in una riga: «Cerotto alla caffeina · Gocce per occhioni ×10» (le copie da due in su). null
 *  se il catalogo non lo dice. È l'unica scrittura: la usano il riepilogo, la scelta alla spunta e l'editor della voce. */
export function testoContenuto(contenuto: ReadonlyArray<{ nome: string; quantita: number | null }> | null | undefined): string | null {
  return contenuto?.length ? contenuto.map((o) => `${o.nome}${o.quantita && o.quantita > 1 ? ` ×${o.quantita}` : ''}`).join(' · ') : null;
}

/** La riga di un articolo: il nome, le copie (da due in su: «×1» non dice niente) con il prezzo, e il contenuto del set se c'è. */
function rigaArticolo(r: RigaContoArticoli, n: NomiRiepilogoEffetti): RigaRiepilogoEffettiDto {
  const prezzo = r.prezzo === null ? 'senza prezzo' : r.copie > 1 && r.prezzoUnitario !== null ? `${yen(r.prezzo)} (${yen(r.prezzoUnitario)} l’uno)` : yen(r.prezzo);
  const contenuto = testoContenuto(n.contenuto?.(r.chiave));
  return { nome: r.nome, dettaglio: r.copie > 1 ? `×${r.copie} · ${prezzo}` : prezzo, ...(contenuto ? { contenuto } : {}) };
}

/** Le etichette e le note fisse dei gruppi che non dipendono da un elemento. */
// 2026-10-25 («le etichette di testo devono essere visibili solo se hanno senso»): una nota resta solo se dice un'eccezione. Che la spunta
// segni letture e turni è il caso normale di ogni voce (via «Le segna la spunta.» e «Li segna la spunta.», uguali in ogni voce); restano le
// Doti, che si segnano a mano, e gli yen, che aspettano «Applica». La nota dell'Aojiru ripeteva la sua riga («variante da dichiarare»): il
// quando sta ora nella riga stessa, e solo se la variante non è ancora nota.
const GRUPPI: Record<string, { titolo: string; nota?: string }> = {
  aojiru: { titolo: 'Aojiru' },
  doti: { titolo: 'Doti sociali', nota: 'Le Doti le segni tu nella scheda Doti.' },
  letture: { titolo: 'Letture e visioni' },
  turni: { titolo: 'Turni' },
  yen: { titolo: 'Yen', nota: 'Si applicano con «Applica» sulla voce.' },
  oggetti: { titolo: 'Oggetti ricevuti' },
  richieste: { titolo: 'Richieste completate' },
  sblocchi: { titolo: 'Sblocchi' },
  storia: { titolo: 'Eventi di storia' },
  domande: { titolo: 'Domande in classe' },
  cruciverba: { titolo: 'Cruciverba' },
  inviti: { titolo: 'Inviti' },
  persone: { titolo: 'Compendio' },
  trofei: { titolo: 'Trofei' },
  pesca: { titolo: 'Pesca' },
  fortuna: { titolo: 'Fortuna di Chihaya' },
};

/**
 * Il riepilogo per gruppi di che cosa dà la voce: i gruppi nell'ordine in cui compare il loro primo effetto, le righe nell'ordine degli
 * effetti. Gli articoli si raggruppano per negozio, con le copie dello stesso articolo sommate (`contoArticoli`) e il totale. Lista vuota
 * senza effetti.
 */
export function riepilogoEffettiVoce(effetti: readonly EffettoVoce[], n: NomiRiepilogoEffetti, opz: OpzioniRiepilogoEffetti = {}): GruppoRiepilogoEffettiDto[] {
  const gruppi = new Map<string, GruppoRiepilogoEffettiDto>();
  /** I negozi già contati (al loro primo articolo): gli articoli di un negozio stanno tutti nei gruppi di quel momento. */
  const negoziContati = new Set<string>();
  /** Il gruppo `chiave`, creato al primo effetto che lo usa. */
  const gruppo = (chiave: string, titolo?: string): GruppoRiepilogoEffettiDto => {
    let g = gruppi.get(chiave);
    if (!g) {
      const fisso = GRUPPI[chiave];
      g = { chiave, titolo: titolo ?? fisso?.titolo ?? chiave, righe: [], ...(fisso?.nota ? { nota: fisso.nota } : {}) };
      gruppi.set(chiave, g);
    }
    return g;
  };
  const riga = (chiave: string, nome: string, dettaglio?: string) => { gruppo(chiave).righe.push(dettaglio ? { nome, dettaglio } : { nome }); };

  for (const e of effetti) {
    switch (e.tipo) {
      case 'articolo': {
        // gli articoli di un negozio si contano insieme, una volta sola per negozio (al primo articolo): le righe e il totale vengono da `contoArticoli`
        const neg = negozioDellArticolo(e.articolo), chiave = `acquisti:${neg}`;
        if (negoziContati.has(neg)) break;
        negoziContati.add(neg);
        const nome = n.negozio(neg);
        const delNegozio = effetti.filter((x) => x.tipo === 'articolo' && negozioDellArticolo(x.articolo) === neg);
        // L13 (decisione 4): gli articoli in alternativa (Set A o Set B) si comprano uno solo, o nessuno. Prima della spunta stanno a parte,
        // tutti, senza totale («Uno a scelta»): un totale di due set alternativi sarebbe una somma che il gioco non permette; a voce spuntata
        // quello comprato torna fra gli acquisti (con il totale) e gli altri escono
        const alternative = n.incompatibili ? gruppiAlternativi(delNegozio.flatMap((x) => (x.tipo === 'articolo' ? [x.articolo] : [])), n.incompatibili) : [];
        const fuori = new Set(alternative.flat().filter((k) => !opz.comprati?.has(k)));
        const conto = contoArticoli(delNegozio, n.frase.articolo, fuori);
        if (conto) {
          const g = gruppo(chiave, nome ? `Acquisti · ${nome}` : 'Acquisti');
          for (const r of conto.righe) g.righe.push(rigaArticolo(r, n));
          const copie = conto.righe.reduce((s, r) => s + r.copie, 0);
          if (conto.totale !== null && (conto.righe.length > 1 || copie > 1)) g.totale = `Totale ${yen(conto.totale)}${conto.senzaPrezzo ? ` (più ${conto.senzaPrezzo} senza prezzo)` : ''}`;
        }
        alternative.forEach((membri, k) => {
          if (opz.comprati && membri.some((m) => opz.comprati!.has(m))) return;
          const g = gruppo(`scelta:${neg}:${k}`, nome ? `Uno a scelta · ${nome}` : 'Uno a scelta');
          // spuntata senza comprarne nessuno: lo dice una riga sola (i set non comprati non sono un fatto della partita)
          if (opz.comprati) { g.righe.push({ nome: membri.length === 2 ? 'Nessuno dei due comprato' : 'Nessuno comprato' }); return; }
          const righe = contoArticoli(delNegozio.filter((x) => x.tipo === 'articolo' && membri.includes(x.articolo)), n.frase.articolo)?.righe ?? [];
          for (const r of righe) g.righe.push(rigaArticolo(r, n));
          g.nota = 'Alla spunta ne scegli uno, o nessuno.';
        });
        break;
      }
      case 'acquisto': riga('aojiru', n.frase.articolo(e.articolo)?.nome ?? 'Aojiru', e.variante ? nomeDote(e.variante) : 'variante da osservare alla spunta'); break;
      case 'dote': { const p = partiEffettoAzione(e, n.azione); riga('doti', p.nome, p.dettaglio); break; }
      case 'lettura': { const p = partiEffettoAzione(e, n.azione); riga('letture', p.nome, p.dettaglio); break; }
      case 'turno': {
        const p = partiEffettoAzione(e, n.azione);
        const paga = n.pagaTurno(e.attivita);
        const testoPaga = paga ? `paga ${yen(paga.yen)}${paga.massima && paga.massima > paga.yen ? ` (fino a ${yen(paga.massima)})` : ''}` : '';
        riga('turni', p.nome, [p.dettaglio, testoPaga].filter(Boolean).join(' · ') || undefined);
        break;
      }
      case 'yen': riga('yen', e.importo > 0 ? 'Ricevuti' : 'Spesi', yen(e.importo)); break;
      case 'oggetto': riga('oggetti', n.frase.oggetto?.(e.oggetto) ?? 'Oggetto del catalogo', e.quantita > 1 ? `×${e.quantita}` : undefined); break;
      case 'richiesta': riga('richieste', n.frase.richiesta(e.richiesta) ?? 'Richiesta'); break;
      // 2026-10-25 («a che prò quel ottenuto messo lì come testo semplice e distanziato?»; «le etichette di testo devono essere visibili
      // solo se hanno senso»): una riga porta un dettaglio solo se aggiunge qualcosa al titolo del gruppo. «Trofei · ottenuto», «Domande in
      // classe · risposta», «Cruciverba · risolto», «Compendio · registrata nel compendio» ripetevano il titolo: restano il nome e basta.
      // Lo sblocco dice ancora se è una richiesta o un'attività (il gruppo «Sblocchi» le tiene insieme), la pesca e la Fortuna come valgono.
      // Senza il nome, la riga di ripiego si chiama già «Richiesta» o «Attività»: il dettaglio lo ripeterebbe («Richiesta richiesta»).
      case 'sblocco': {
        const richiesta = e.bersaglio === 'richiesta';
        const nome = richiesta ? n.frase.richiesta(e.chiave) : n.frase.attivita?.(e.chiave);
        riga('sblocchi', nome ?? (richiesta ? 'Richiesta' : 'Attività'), nome ? (richiesta ? 'richiesta' : 'attività') : undefined);
        break;
      }
      case 'storia': riga('storia', EVENTI_STORIA.find((s) => s.chiave === e.evento)?.nome ?? e.evento); break;
      case 'domanda': riga('domande', n.frase.domanda(e.domanda) ?? 'Domanda'); break;
      case 'cruciverba': riga('cruciverba', `Del ${dataLeggibile(e.data)}`); break;
      case 'invito': { const i = n.frase.invito(e.invito); riga('inviti', i ? `${i.confidenteNome}${i.data ? `, ${dataLeggibile(i.data)}` : ''}` : 'Invito', 'i punti dell’incontro valgono ×1,2'); break; }
      case 'persona': riga('persone', n.frase.persona(e.persona) ?? 'Persona'); break;
      case 'trofeo': riga('trofei', n.frase.trofeo?.(e.trofeo) ?? 'Trofeo'); break;
      case 'pesca': riga('pesca', 'Sessione a Ichigaya', 'da osservare alla spunta'); break;
      case 'fortuna': riga('fortuna', nomeDote(e.dote), 'per il resto del giorno'); break;
    }
  }
  return [...gruppi.values()].filter((g) => g.righe.length > 0);
}
