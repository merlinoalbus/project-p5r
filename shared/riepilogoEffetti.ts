// ============================================================
// riepilogoEffetti — che cosa dà una voce, raggruppato per tipo (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// L'utente, sulla voce «Raccogli oggetti curativi dal distributore accanto al Bagno Pubblico», trovava illeggibile una frase unica con un
// acquisto dopo l'altro, ognuno con la sua nota sugli yen — «Non si capisce niente... non sarebbe possibile formattarlo in modo
// adeguato? per tutti gli acquisti?» — e poi ha chiesto di togliere dalle frasi la nota sugli yen. La frase unica diventa un DATO: gruppi
// con un'etichetta («Acquisti · Distributore del bagno pubblico», «Doti sociali», «Turni»…), una riga breve per elemento (nome e dettaglio
// separati) e il totale degli acquisti. Nel riepilogo restano solo i fatti: nessuna istruzione sugli yen. L13 (decisione 18): gli yen si muovono
// da soli spuntando la voce, e la nota del gruppo lo dice (si scalano dal saldo, mai sotto zero; la spunta resta possibile anche senza yen);
// per gli effetti nati prima che gli yen si muovessero da soli (`OpzioniRiepilogoEffetti.yenGiaNelSaldo`) dice invece che erano già nel saldo.
//
// È l'unico punto che costruisce il riepilogo: il server lo calcola per ogni voce (`AzionePercorsoDto.produceRiepilogo`, con i nomi del DB)
// e la pagina lo mostra così com'è (`RiepilogoEffettiVoce`). Le parole dei singoli effetti vengono dalle stesse fonti delle frasi
// (`partiEffettoAzione`, `contoArticoli`, i nomi di `NomiFraseEffetto`): nessuna chiave grezza, mai testo troncato.
// ============================================================

import { EVENTI_STORIA, dataLeggibile } from './condizioniSpillo.js';
import { nomeDote } from './doti.js';
import { partiEffettoAzione, type NomiEffettiAzione } from './effettiAzione.js';
import { contoArticoli, formatoYen, gruppiAlternativi, REGOLA_ALTERNATIVE, type EffettoVoce, type NomiFraseEffetto, type RigaContoArticoli } from './effettiVoce.js';

/** Una risposta giusta di una domanda del gioco: il testo e, se la riga ne raccoglie più d'una (gli esami), il quesito a cui risponde. */
export interface RispostaRiepilogoEffettiDto { testo: string; domanda?: string }
/**
 * Una riga del riepilogo: il nome dell'elemento e, se aggiunge qualcosa al titolo del gruppo, che cosa ne viene (copie e prezzo, note, paga).
 * 2026-10-26 («Per le domande/quiz/Esami devono essere visualizzate le domande ma anche le risposte»): la riga di una domanda in classe,
 * di un quiz in TV o di un esame ha per nome la domanda e in `risposte` le risposte giuste, nell'ordine (più passi per le domande a catena,
 * un quesito per risposta negli esami), lette dalla riga della domanda del gioco (`domanda.risposte_json`). 2026-10-27 («come già per le
 * domande in classe»): la riga di un cruciverba ha per nome l'indizio e in `risposte` la soluzione (`cruciverba.risposta`), con la stessa resa.
 * `contenuto` (L13, decisione 4): che cosa contiene un set, in una riga («Cerotto alla caffeina · Gocce per occhioni ×10»), se il catalogo lo dice.
 */
export interface RigaRiepilogoEffettiDto { nome: string; dettaglio?: string; risposte?: RispostaRiepilogoEffettiDto[]; contenuto?: string }
/** Una domanda del gioco come la legge il riepilogo: il testo, il tipo (classe, esame, quiz in TV) e le risposte giuste in ordine. */
export interface QuesitoRiepilogoEffetti { domanda: string; tipo: string; risposte: RispostaRiepilogoEffettiDto[] }
/** Un cruciverba del gioco come lo legge il riepilogo: l'indizio e la soluzione (la riga della tabella `cruciverba`, la sola fonte). */
export interface CruciverbaRiepilogoEffetti { indizio: string; risposta: string }
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
  /** La paga dell'attività per un turno, se l'attività ne ha una (decisione 18: la paga base entra da sola nel saldo con il turno). */
  pagaTurno: (attivita: string) => { yen: number; massima: number | null } | undefined;
  /** La domanda del gioco dal suo id, con il tipo e le risposte giuste (la riga della tabella `domanda`, la sola fonte). */
  quesito: (id: number) => QuesitoRiepilogoEffetti | undefined;
  /** Il cruciverba del gioco dalla sua data «MM-GG», con l'indizio e la soluzione (2026-10-27, «Aggiungere la visualizzazione della
   *  risposta anche per i cruciverba»). */
  cruciverba: (data: string) => CruciverbaRiepilogoEffetti | undefined;
  /** L13 (decisione 4): gli articoli con cui un articolo non si compra insieme (le sue condizioni «non: articolo ottenuto»). Senza: nessuna alternativa. */
  incompatibili?: (articolo: string) => readonly string[] | undefined;
  /** L13 (decisione 4): che cosa contiene un articolo (un set delle televendite): gli oggetti con le copie. */
  contenuto?: (articolo: string) => ReadonlyArray<{ nome: string; quantita: number | null }> | undefined;
}

/** Il gruppo di una domanda secondo il suo tipo: le domande in classe, i quiz del game show in TV, gli esami (di metà semestre e finali). */
const gruppoDellaDomanda = (tipo: string | undefined): string =>
  tipo === 'tv' ? 'domande:tv' : tipo === 'esame-medio' || tipo === 'esame-finale' ? 'domande:esame' : tipo === 'altro' ? 'domande:altro' : 'domande';

/** «¥1.680»: lo stesso formato delle frasi, dell'editor e della scelta alla spunta (`formatoYen`). */
const yen = formatoYen;
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

/** Le etichette e le note fisse dei gruppi che non dipendono da un elemento (la parte che non riguarda gli yen: quella è in `NOTE_YEN`). */
// 2026-10-25 («le etichette di testo devono essere visibili solo se hanno senso»): una nota resta solo se dice un'eccezione. Che la spunta
// segni letture e turni è il caso normale di ogni voce (via «Le segna la spunta.» e «Li segna la spunta.», uguali in ogni voce). 2026-10-27
// (l'utente, sulla voce del cruciverba del 18 aprile: «questo non è più valido... "Le Doti le segni tu nella scheda Doti." da togliere nelle
// voci del diario»): via anche la nota delle Doti. Non era più vera: spuntando la voce le Doti entrano nelle ricevute della spunta e si
// applicano dal pulsante «Applica» sulla voce (`DaApplicare`, proposte `utente.da_applicare`); togliendo la spunta l'applicato torna con la
// proposta inversa. È il caso normale di ogni voce, che il pulsante dice da solo. La nota dell'Aojiru ripeteva la sua riga («variante da
// dichiarare»): il quando sta ora nella riga stessa, e solo se la variante non è ancora nota.
const GRUPPI: Record<string, { titolo: string; nota?: string }> = {
  aojiru: { titolo: 'Aojiru' },
  doti: { titolo: 'Doti sociali' },
  letture: { titolo: 'Letture e visioni' },
  turni: { titolo: 'Turni' },
  yen: { titolo: 'Yen' },
  oggetti: { titolo: 'Oggetti ricevuti' },
  richieste: { titolo: 'Richieste completate' },
  sblocchi: { titolo: 'Sblocchi' },
  storia: { titolo: 'Eventi di storia' },
  domande: { titolo: 'Domande in classe' },
  'domande:tv': { titolo: 'Quiz in TV' },
  'domande:esame': { titolo: 'Esame' },
  'domande:altro': { titolo: 'Domande' },
  cruciverba: { titolo: 'Cruciverba' },
  inviti: { titolo: 'Inviti' },
  persone: { titolo: 'Compendio' },
  trofei: { titolo: 'Trofei' },
  pesca: { titolo: 'Pesca' },
  fortuna: { titolo: 'Fortuna di Chihaya' },
};
/** Decisione 18: che cosa succede agli yen del gruppo spuntando la voce, detto una volta per gruppo (i turni la compongono dai loro dati). */
const NOTE_YEN: Record<string, string> = {
  acquisti: 'Spuntando la voce il prezzo si scala da solo dal saldo, mai sotto zero; togliendo la spunta torna. Un articolo già segnato come comprato fuori dal Diario non si paga due volte.',
  aojiru: 'Il prezzo di una consumazione nuova si scala da solo dal saldo, mai sotto zero.',
  letture: 'Il biglietto di un film al cinema si scala da solo dal saldo, mai sotto zero.',
  // L13 (decisione 4 con la 18): fra gli articoli in alternativa si paga solo quello scelto alla spunta; nessuno, niente da pagare
  scelta: 'Spuntando la voce il prezzo di quello che scegli si scala da solo dal saldo, mai sotto zero; con «Nessuno» non si paga niente.',
  yen: 'Spuntando la voce entrano nel saldo o se ne scalano da soli, mai sotto zero; togliendo la spunta tornano.',
  richieste: 'La ricompensa in yen di una Richiesta entra da sola nel saldo quando la Richiesta risulta completata.',
  pesca: 'La quota di una visita nuova si scala da sola dal saldo, mai sotto zero.',
};
/** Decisione 18: gli effetti del gruppo nati prima che gli yen si muovessero da soli, tutti (il loro denaro era già nel saldo). */
const YEN_GIA_NEL_SALDO = 'I loro yen erano già nel saldo da prima che si muovessero da soli: la spunta non li muove.';
const YEN_DELLA_VOCE_GIA_NEL_SALDO = 'Erano già nel saldo da prima che gli yen si muovessero da soli: la spunta non li muove.';

/** «A», «B» e «C» (senza ripetere un nome uguale); `virgolette: false` per gli importi («Ricevuti ¥1.000»). */
export function elencoNomi(nomi: readonly string[], virgolette = true): string {
  const u = [...new Set(nomi.filter(Boolean))].map((x) => (virgolette ? `«${x}»` : x));
  return u.length > 1 ? `${u.slice(0, -1).join(', ')} e ${u[u.length - 1]}` : u[0] ?? '';
}
/**
 * Decisione 18, solo una parte degli effetti con yen era già nel saldo da prima: la frase li NOMINA (revisione dei testi del 26/10: «quelli
 * segnati prima» non diceva quali), così si capisce quali yen la spunta non muove e quali sì. Vuota senza nomi.
 */
export function fraseYenInParteNelSaldo(nomi: readonly string[]): string {
  const elenco = elencoNomi(nomi);
  return elenco ? `Gli yen di ${elenco} erano già nel saldo da prima che si muovessero da soli: la spunta non li muove.` : '';
}
/** Come `fraseYenInParteNelSaldo`, per il gruppo «Yen», i cui nomi sono gli importi stessi («Ricevuti ¥1.000 erano già nel saldo…»). */
const fraseImportiInParteNelSaldo = (nomi: readonly string[]): string => {
  const elenco = elencoNomi(nomi, false);
  return elenco ? `${elenco} erano già nel saldo da prima che gli yen si muovessero da soli: la spunta non li muove.` : '';
};

/** Il riepilogo nella partita. */
export interface OpzioniRiepilogoEffetti {
  /** L13 (decisione 18): le posizioni (in `effetti`) degli effetti i cui yen erano già nel saldo da prima che si muovessero da soli: la nota del
   *  loro gruppo lo dice, invece di promettere un movimento che la spunta non farà. */
  yenGiaNelSaldo?: ReadonlySet<number>;
  /** L13 (decisione 4): a voce spuntata, gli articoli che la spunta ha segnato (fra quelli in alternativa resta solo quello scelto, o
   *  «nessuno»); assente prima della spunta, quando le alternative si mostrano tutte. */
  comprati?: ReadonlySet<string>;
  /** L13 (decisione 4): a voce spuntata, gli articoli in alternativa aggiunti alla voce DOPO la spunta (dal registro delle operazioni sugli
   *  effetti): la spunta non ha potuto chiedere quale si è comprato, quindi il riepilogo non dice «nessuno» (sarebbe falso) ma che resta da
   *  scegliere, togliendo e rimettendo la spunta. */
  daScegliere?: ReadonlySet<string>;
}

/**
 * Il nome con cui i testi degli yen già nel saldo citano un effetto con yen, lo stesso delle righe del riepilogo: l'articolo o la consumazione,
 * l'attività del turno, il film, la Richiesta, gli yen con il loro importo, la sessione di pesca. Vuoto per un effetto senza yen.
 */
export function nomeEffettoConYen(e: EffettoVoce, n: NomiRiepilogoEffetti): string {
  switch (e.tipo) {
    case 'articolo': return n.frase.articolo(e.articolo)?.nome ?? 'Articolo';
    case 'acquisto': return n.frase.articolo(e.articolo)?.nome ?? 'Aojiru';
    case 'lettura': case 'turno': return partiEffettoAzione(e, n.azione).nome;
    case 'yen': return `${e.importo > 0 ? 'Ricevuti' : 'Spesi'} ${yen(e.importo)}`;
    case 'richiesta': return n.frase.richiesta(e.richiesta) ?? 'Richiesta';
    case 'pesca': return 'Sessione a Ichigaya';
    default: return '';
  }
}

/**
 * Il riepilogo per gruppi di che cosa dà la voce: i gruppi nell'ordine in cui compare il loro primo effetto, le righe nell'ordine degli
 * effetti. Gli articoli si raggruppano per negozio, con le copie dello stesso articolo sommate (`contoArticoli`) e il totale. Lista vuota
 * senza effetti. La nota di un gruppo con yen dice che cosa ne fa la spunta, guardando TUTTI i suoi effetti (non l'ultimo).
 */
export function riepilogoEffettiVoce(effetti: readonly EffettoVoce[], n: NomiRiepilogoEffetti, opz: OpzioniRiepilogoEffetti = {}): GruppoRiepilogoEffettiDto[] {
  const gruppi = new Map<string, GruppoRiepilogoEffettiDto>();
  /** I negozi già contati (al loro primo articolo): gli articoli di un negozio stanno tutti nei gruppi di quel momento. Per ogni negozio, il
   *  gruppo «Uno a scelta» di ogni articolo in alternativa che non sta fra gli acquisti (prima della spunta, o aggiunto dopo la spunta): i suoi
   *  yen vanno alla nota di quel gruppo, non degli acquisti (decisione 4 con la 18: si paga solo quello scelto); '' per uno non comprato di
   *  una voce spuntata, che non porta yen. Un articolo assente dalla mappa sta fra gli acquisti. */
  const negoziContati = new Map<string, Map<string, string>>();
  /** Per ogni gruppo con yen: quanti effetti ne portano e i nomi di quelli già nel saldo da prima. */
  const yenDelGruppo = new Map<string, { effetti: number; giaNelSaldo: string[] }>();
  const giaNelSaldo = (indice: number): boolean => opz.yenGiaNelSaldo?.has(indice) === true;
  const conYen = (chiave: string, indice: number): void => {
    const y = yenDelGruppo.get(chiave) ?? { effetti: 0, giaNelSaldo: [] };
    yenDelGruppo.set(chiave, { effetti: y.effetti + 1, giaNelSaldo: giaNelSaldo(indice) ? [...y.giaNelSaldo, nomeEffettoConYen(effetti[indice]!, n)] : y.giaNelSaldo });
  };
  /** I turni della voce i cui yen la spunta muove (non quelli già nel saldo da prima), per la loro nota: con paga (e se variabile), senza paga
   *  (costo dell'attività o della sfida). Un turno già nel saldo non entra qui: la nota non promette per lui un movimento che non ci sarà. */
  const turni = { conPaga: false, pagaVariabile: false, senzaPaga: false };
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

  for (const [i, e] of effetti.entries()) {
    switch (e.tipo) {
      case 'articolo': {
        // gli articoli di un negozio si contano insieme, una volta sola per negozio (al primo articolo): le righe e il totale vengono da `contoArticoli`
        const neg = negozioDellArticolo(e.articolo), chiave = `acquisti:${neg}`;
        let inScelta = negoziContati.get(neg);
        if (!inScelta) {
          inScelta = new Map<string, string>();
          negoziContati.set(neg, inScelta);
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
            // a voce spuntata con uno comprato: quello sta fra gli acquisti, gli altri escono (senza yen: non si sono pagati)
            if (opz.comprati && membri.some((m) => opz.comprati!.has(m))) {
              for (const m of membri) if (!opz.comprati.has(m)) inScelta!.set(m, '');
              return;
            }
            const chiaveScelta = `scelta:${neg}:${k}`;
            // la regola detta in un modo solo, come nell'editor e alla spunta (`REGOLA_ALTERNATIVE`, rilievo L3 della revisione UX)
            const g = gruppo(chiaveScelta, nome ? `${REGOLA_ALTERNATIVE} · ${nome}` : REGOLA_ALTERNATIVE);
            // a voce spuntata, articoli aggiunti alla voce DOPO la spunta: la spunta non ha chiesto quale si è comprato. Dire «nessuno» sarebbe
            // falso (rilievo della revisione): restano tutti, con che cosa fare per scegliere
            const aggiuntiDopo = opz.comprati !== undefined && membri.some((m) => opz.daScegliere?.has(m));
            // spuntata senza comprarne nessuno: lo dice una riga sola (i set non comprati non sono un fatto della partita)
            if (opz.comprati && !aggiuntiDopo) {
              g.righe.push({ nome: membri.length === 2 ? 'Nessuno dei due comprato' : 'Nessuno comprato' });
              for (const m of membri) inScelta!.set(m, '');
              return;
            }
            const righe = contoArticoli(delNegozio.filter((x) => x.tipo === 'articolo' && membri.includes(x.articolo)), n.frase.articolo)?.righe ?? [];
            for (const r of righe) g.righe.push(rigaArticolo(r, n));
            for (const m of membri) inScelta!.set(m, chiaveScelta);
            // «le etichette di testo devono essere visibili solo se hanno senso» (rilievo della revisione UX): prima della spunta il titolo dice
            // già «Uno a scelta» e la nota degli yen (`NOTE_YEN.scelta`) dice che con «Nessuno» non si paga; una terza frase sulla stessa regola
            // non aggiungeva niente. Resta solo l'eccezione degli articoli aggiunti dopo la spunta
            if (aggiuntiDopo) g.nota = 'Aggiunti alla voce dopo la spunta: per dire quale hai comprato, o nessuno, togli e rimetti la spunta.';
          });
        }
        // decisione 18: il prezzo degli articoli si scala da solo spuntando la voce (la nota del gruppo, alla fine, mai un'istruzione «a mano»).
        // Decisione 4: un articolo in alternativa ancora da scegliere porta i suoi yen alla nota del suo gruppo «Uno a scelta»; uno non comprato
        // di una voce spuntata non ne porta (non si è pagato)
        const sceltaDi = inScelta.get(e.articolo);
        if (sceltaDi === undefined) conYen(chiave, i);
        else if (sceltaDi) conYen(sceltaDi, i);
        break;
      }
      case 'acquisto': riga('aojiru', n.frase.articolo(e.articolo)?.nome ?? 'Aojiru', e.variante ? nomeDote(e.variante) : 'variante da osservare alla spunta'); conYen('aojiru', i); break;
      case 'dote': { const p = partiEffettoAzione(e, n.azione); riga('doti', p.nome, p.dettaglio); break; }
      case 'lettura': {
        const p = partiEffettoAzione(e, n.azione); riga('letture', p.nome, p.dettaglio);
        // decisione 18: un film al cinema ha il suo biglietto, che la spunta scala da sola
        if (e.categoria === 'film') conYen('letture', i);
        break;
      }
      case 'turno': {
        const p = partiEffettoAzione(e, n.azione);
        const paga = n.pagaTurno(e.attivita);
        const testoPaga = paga ? `paga ${yen(paga.yen)}${paga.massima && paga.massima > paga.yen ? ` (fino a ${yen(paga.massima)})` : ''}` : '';
        riga('turni', p.nome, [p.dettaglio, testoPaga].filter(Boolean).join(' · ') || undefined);
        // decisione 18: la paga base entra da sola con il turno; il costo di un'attività a pagamento (o della sfida scelta) si scala, mai sotto
        // zero. La nota guarda tutti i turni della voce i cui yen la spunta muove (un lavoro pagato e un'attività a pagamento nella stessa voce:
        // tutte e due le frasi); un turno già nel saldo da prima lo nomina la frase «in parte», mai la promessa della paga o del costo
        if (!giaNelSaldo(i)) {
          if (paga) { turni.conPaga = true; if (paga.massima && paga.massima > paga.yen) turni.pagaVariabile = true; } else turni.senzaPaga = true;
        }
        conYen('turni', i);
        break;
      }
      case 'yen': riga('yen', e.importo > 0 ? 'Ricevuti' : 'Spesi', yen(e.importo)); conYen('yen', i); break;
      case 'oggetto': riga('oggetti', n.frase.oggetto?.(e.oggetto) ?? 'Oggetto del catalogo', e.quantita > 1 ? `×${e.quantita}` : undefined); break;
      case 'richiesta': riga('richieste', n.frase.richiesta(e.richiesta) ?? 'Richiesta'); conYen('richieste', i); break;
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
      case 'domanda': {
        // la domanda e le sue risposte giuste (2026-10-26), nel gruppo del suo tipo; senza la riga del gioco, il solo nome come prima
        const q = n.quesito(e.domanda);
        const r: RigaRiepilogoEffettiDto = { nome: q?.domanda || n.frase.domanda(e.domanda) || 'Domanda' };
        const risposte = (q?.risposte ?? []).filter((x) => x.testo.trim() !== '');
        if (risposte.length) r.risposte = risposte;
        gruppo(gruppoDellaDomanda(q?.tipo)).righe.push(r);
        break;
      }
      case 'cruciverba': {
        // 2026-10-27 («Aggiungere la visualizzazione della risposta anche per i cruciverba»; «come già per le domande in classe»): la stessa
        // resa delle domande, l'indizio come nome e la soluzione nel blocco delle risposte giuste, dalla riga del cruciverba del gioco. Senza
        // la riga (o senza soluzione) resta il giorno del cruciverba, come prima
        const c = n.cruciverba(e.data);
        const indizio = c?.indizio.trim() ?? '';
        const soluzione = c?.risposta.trim() ?? '';
        gruppo('cruciverba').righe.push(indizio
          ? { nome: indizio, ...(soluzione ? { risposte: [{ testo: soluzione }] } : {}) }
          : { nome: `Del ${dataLeggibile(e.data)}` });
        break;
      }
      case 'invito': { const i = n.frase.invito(e.invito); riga('inviti', i ? `${i.confidenteNome}${i.data ? `, ${dataLeggibile(i.data)}` : ''}` : 'Invito', 'i punti dell’incontro valgono ×1,2'); break; }
      // il gruppo si chiama «Compendio»: la riga dice solo il nome; il dettaglio compare solo quando aggiunge qualcosa (anche nella scorta)
      case 'persona': riga('persone', n.frase.persona(e.persona) ?? 'Persona', e.scorta ? `anche nella scorta${e.livello ? `, livello ${e.livello}` : ''}` : undefined); break;
      case 'trofeo': riga('trofei', n.frase.trofeo?.(e.trofeo) ?? 'Trofeo'); break;
      case 'pesca': riga('pesca', 'Sessione a Ichigaya', 'da osservare alla spunta'); conYen('pesca', i); break;
      case 'fortuna': riga('fortuna', nomeDote(e.dote), 'per il resto del giorno'); break;
    }
  }
  // decisione 18: la nota degli yen di ogni gruppo, una volta sola e su tutti i suoi effetti; se erano già nel saldo da prima, lo dice al posto
  // della promessa di un movimento (in parte: la promessa per gli altri e l'eccezione, con i nomi degli effetti già nel saldo)
  const notaTurni = [
    ...(turni.conPaga ? [`La paga base di un lavoro entra da sola nel saldo.${turni.pagaVariabile ? ' Il di più che il gioco può dare, fino alla paga massima, non entra da solo.' : ''}`] : []),
    ...(turni.senzaPaga ? ['Se un’attività o la sfida scelta costa, il prezzo si scala da solo dal saldo, mai sotto zero.'] : []),
  ].join(' ');
  for (const [chiave, y] of yenDelGruppo) {
    const g = gruppi.get(chiave);
    if (!g) continue;
    const normale = chiave === 'turni' ? notaTurni : NOTE_YEN[chiave.startsWith('acquisti:') ? 'acquisti' : chiave.startsWith('scelta:') ? 'scelta' : chiave];
    const tutti = y.giaNelSaldo.length === y.effetti;
    const eccezione = chiave === 'yen' ? fraseImportiInParteNelSaldo(y.giaNelSaldo) : fraseYenInParteNelSaldo(y.giaNelSaldo);
    const notaYen = tutti ? (chiave === 'yen' ? YEN_DELLA_VOCE_GIA_NEL_SALDO : YEN_GIA_NEL_SALDO) : [normale, eccezione].filter(Boolean).join(' ');
    const nota = [g.nota, notaYen].filter(Boolean).join(' ');
    if (nota) g.nota = nota;
  }
  return [...gruppi.values()].filter((g) => g.righe.length > 0);
}
