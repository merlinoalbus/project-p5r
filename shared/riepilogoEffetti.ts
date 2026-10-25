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
import { contoArticoli, type EffettoVoce, type NomiFraseEffetto } from './effettiVoce.js';

/** Una riga del riepilogo: il nome dell'elemento e, se c'è, che cosa ne viene (copie e prezzo, note, «completato»). */
export interface RigaRiepilogoEffettiDto { nome: string; dettaglio?: string }
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
}

const yen = (n: number): string => `¥${Math.abs(n).toLocaleString('it-IT')}`;
/** Il negozio di un articolo: la parte della chiave prima della barra. */
const negozioDellArticolo = (chiave: string): string => (chiave.includes('/') ? chiave.slice(0, chiave.indexOf('/')) : chiave);

/** Le etichette e le note fisse dei gruppi che non dipendono da un elemento (la parte che non riguarda gli yen). */
const GRUPPI: Record<string, { titolo: string; nota?: string }> = {
  aojiru: { titolo: 'Aojiru', nota: 'La variante si osserva alla spunta.' },
  doti: { titolo: 'Doti sociali', nota: 'Le Doti le segni tu nella scheda Doti.' },
  letture: { titolo: 'Letture e visioni', nota: 'Le segna la spunta.' },
  turni: { titolo: 'Turni', nota: 'Li segna la spunta.' },
  yen: { titolo: 'Yen' },
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
/** Decisione 18: che cosa succede agli yen del gruppo spuntando la voce, detto una volta per gruppo (i turni la compongono dai loro dati). */
const NOTE_YEN: Record<string, string> = {
  acquisti: 'Spuntando la voce il prezzo si scala da solo dal saldo, mai sotto zero; togliendo la spunta torna. Un articolo già segnato come comprato fuori dal Diario non si paga due volte.',
  aojiru: 'Il prezzo di una consumazione nuova si scala da solo dal saldo, mai sotto zero.',
  letture: 'Il biglietto di un film al cinema si scala da solo dal saldo, mai sotto zero.',
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
        // decisione 18: il prezzo degli articoli si scala da solo spuntando la voce (la nota del gruppo, alla fine, mai un'istruzione «a mano»)
        conYen(chiave, i);
        if (gruppi.has(chiave)) break;
        const nome = n.negozio(neg);
        const g = gruppo(chiave, nome ? `Acquisti · ${nome}` : 'Acquisti');
        const conto = contoArticoli(effetti.filter((x) => x.tipo === 'articolo' && negozioDellArticolo(x.articolo) === neg), n.frase.articolo);
        if (!conto) break;
        for (const r of conto.righe) {
          const prezzo = r.prezzo === null ? 'senza prezzo' : r.copie > 1 && r.prezzoUnitario !== null ? `${yen(r.prezzo)} (${yen(r.prezzoUnitario)} l’uno)` : yen(r.prezzo);
          g.righe.push({ nome: r.nome, dettaglio: `×${r.copie} · ${prezzo}` });
        }
        const copie = conto.righe.reduce((s, r) => s + r.copie, 0);
        if (conto.totale !== null && (conto.righe.length > 1 || copie > 1)) g.totale = `Totale ${yen(conto.totale)}${conto.senzaPrezzo ? ` (più ${conto.senzaPrezzo} senza prezzo)` : ''}`;
        break;
      }
      case 'acquisto': riga('aojiru', n.frase.articolo(e.articolo)?.nome ?? 'Aojiru', e.variante ? nomeDote(e.variante) : 'variante da dichiarare'); conYen('aojiru', i); break;
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
      case 'sblocco': riga('sblocchi', (e.bersaglio === 'richiesta' ? n.frase.richiesta(e.chiave) : n.frase.attivita?.(e.chiave)) ?? (e.bersaglio === 'richiesta' ? 'Richiesta' : 'Attività'), e.bersaglio === 'richiesta' ? 'Richiesta' : 'attività'); break;
      case 'storia': riga('storia', EVENTI_STORIA.find((s) => s.chiave === e.evento)?.nome ?? e.evento); break;
      case 'domanda': riga('domande', n.frase.domanda(e.domanda) ?? 'Domanda', 'risposta'); break;
      case 'cruciverba': riga('cruciverba', `Del ${dataLeggibile(e.data)}`, 'risolto'); break;
      case 'invito': { const i = n.frase.invito(e.invito); riga('inviti', i ? `${i.confidenteNome}${i.data ? `, ${dataLeggibile(i.data)}` : ''}` : 'Invito', 'i punti dell’incontro valgono ×1,2'); break; }
      case 'persona': riga('persone', n.frase.persona(e.persona) ?? 'Persona', 'registrata nel compendio'); break;
      case 'trofeo': riga('trofei', n.frase.trofeo?.(e.trofeo) ?? 'Trofeo', 'ottenuto'); break;
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
    const normale = chiave === 'turni' ? notaTurni : NOTE_YEN[chiave.startsWith('acquisti:') ? 'acquisti' : chiave];
    const tutti = y.giaNelSaldo.length === y.effetti;
    const eccezione = chiave === 'yen' ? fraseImportiInParteNelSaldo(y.giaNelSaldo) : fraseYenInParteNelSaldo(y.giaNelSaldo);
    const notaYen = tutti ? (chiave === 'yen' ? YEN_DELLA_VOCE_GIA_NEL_SALDO : YEN_GIA_NEL_SALDO) : [normale, eccezione].filter(Boolean).join(' ');
    const nota = [g.nota, notaYen].filter(Boolean).join(' ');
    if (nota) g.nota = nota;
  }
  return [...gruppi.values()].filter((g) => g.righe.length > 0);
}
