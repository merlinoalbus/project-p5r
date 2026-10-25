// ============================================================
// riepilogoEffetti — che cosa dà una voce, raggruppato per tipo (richiesta dell'utente del 2026-10-25)
// ============================================================
//
// L'utente, sulla voce «Raccogli oggetti curativi dal distributore accanto al Bagno Pubblico», trovava illeggibile una frase unica con un
// acquisto dopo l'altro, ognuno con la sua nota sugli yen — «Non si capisce niente... non sarebbe possibile formattarlo in modo
// adeguato? per tutti gli acquisti?» — e poi ha chiesto di togliere dalle frasi la nota sugli yen. La frase unica diventa un DATO: gruppi
// con un'etichetta («Acquisti · Distributore del bagno pubblico», «Doti sociali», «Turni»…), una riga breve per elemento (nome e dettaglio
// separati) e il totale degli acquisti. Nel riepilogo restano solo i fatti: nessuna istruzione sugli yen. L13 (decisione 18): gli yen si muovono
// da soli spuntando la voce, e la nota del gruppo lo dice (si scalano dal saldo, mai sotto zero; la spunta resta possibile anche senza yen).
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

/** Decisione 18: che cosa succede agli yen spuntando la voce, detto una volta per gruppo. */
const SCALA = 'Spuntando la voce si scalano da soli dal saldo, mai sotto zero (la spunta resta possibile anche senza yen); togliendo la spunta tornano.';
/** Le etichette e le note fisse dei gruppi che non dipendono da un elemento. */
const GRUPPI: Record<string, { titolo: string; nota?: string }> = {
  aojiru: { titolo: 'Aojiru', nota: 'La variante si osserva alla spunta. Il prezzo di una consumazione nuova si scala da solo dal saldo, mai sotto zero.' },
  doti: { titolo: 'Doti sociali', nota: 'Le Doti le segni tu nella scheda Doti.' },
  letture: { titolo: 'Letture e visioni', nota: 'Le segna la spunta.' },
  turni: { titolo: 'Turni', nota: 'Li segna la spunta.' },
  yen: { titolo: 'Yen', nota: 'Spuntando la voce entrano nel saldo o se ne scalano da soli, mai sotto zero; togliendo la spunta tornano.' },
  oggetti: { titolo: 'Oggetti ricevuti' },
  richieste: { titolo: 'Richieste completate', nota: 'La ricompensa in yen di una Richiesta entra da sola nel saldo quando la Richiesta risulta completata.' },
  sblocchi: { titolo: 'Sblocchi' },
  storia: { titolo: 'Eventi di storia' },
  domande: { titolo: 'Domande in classe' },
  cruciverba: { titolo: 'Cruciverba' },
  inviti: { titolo: 'Inviti' },
  persone: { titolo: 'Compendio' },
  trofei: { titolo: 'Trofei' },
  pesca: { titolo: 'Pesca', nota: 'La quota di una visita nuova si scala da sola dal saldo, mai sotto zero.' },
  fortuna: { titolo: 'Fortuna di Chihaya' },
};

/**
 * Il riepilogo per gruppi di che cosa dà la voce: i gruppi nell'ordine in cui compare il loro primo effetto, le righe nell'ordine degli
 * effetti. Gli articoli si raggruppano per negozio, con le copie dello stesso articolo sommate (`contoArticoli`) e il totale. Lista vuota
 * senza effetti.
 */
export function riepilogoEffettiVoce(effetti: readonly EffettoVoce[], n: NomiRiepilogoEffetti): GruppoRiepilogoEffettiDto[] {
  const gruppi = new Map<string, GruppoRiepilogoEffettiDto>();
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
        if (gruppi.has(chiave)) break;
        const nome = n.negozio(neg);
        const g = gruppo(chiave, nome ? `Acquisti · ${nome}` : 'Acquisti');
        // decisione 18: il prezzo degli articoli si scala da solo spuntando la voce (detto una volta per gruppo, mai un'istruzione «a mano»)
        g.nota = SCALA;
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
      case 'acquisto': riga('aojiru', n.frase.articolo(e.articolo)?.nome ?? 'Aojiru', e.variante ? nomeDote(e.variante) : 'variante da dichiarare'); break;
      case 'dote': { const p = partiEffettoAzione(e, n.azione); riga('doti', p.nome, p.dettaglio); break; }
      case 'lettura': {
        const p = partiEffettoAzione(e, n.azione); riga('letture', p.nome, p.dettaglio);
        // decisione 18: un film al cinema ha il suo biglietto, che la spunta scala da sola
        if (e.categoria === 'film') gruppo('letture').nota = 'Le segna la spunta. Il biglietto di un film al cinema si scala da solo dal saldo, mai sotto zero.';
        break;
      }
      case 'turno': {
        const p = partiEffettoAzione(e, n.azione);
        const paga = n.pagaTurno(e.attivita);
        const testoPaga = paga ? `paga ${yen(paga.yen)}${paga.massima && paga.massima > paga.yen ? ` (fino a ${yen(paga.massima)})` : ''}` : '';
        riga('turni', p.nome, [p.dettaglio, testoPaga].filter(Boolean).join(' · ') || undefined);
        // decisione 18: la paga base entra da sola con il turno; il costo di un'attività a pagamento (o della sfida scelta) si scala, mai sotto zero
        gruppo('turni').nota = paga
          ? 'Li segna la spunta: la paga base entra da sola nel saldo.'
          : 'Li segna la spunta: se l’attività o la sfida scelta costa, il prezzo si scala da solo dal saldo, mai sotto zero.';
        break;
      }
      case 'yen': riga('yen', e.importo > 0 ? 'Ricevuti' : 'Spesi', yen(e.importo)); break;
      case 'oggetto': riga('oggetti', n.frase.oggetto?.(e.oggetto) ?? 'Oggetto del catalogo', e.quantita > 1 ? `×${e.quantita}` : undefined); break;
      case 'richiesta': riga('richieste', n.frase.richiesta(e.richiesta) ?? 'Richiesta'); break;
      case 'sblocco': riga('sblocchi', (e.bersaglio === 'richiesta' ? n.frase.richiesta(e.chiave) : n.frase.attivita?.(e.chiave)) ?? (e.bersaglio === 'richiesta' ? 'Richiesta' : 'Attività'), e.bersaglio === 'richiesta' ? 'Richiesta' : 'attività'); break;
      case 'storia': riga('storia', EVENTI_STORIA.find((s) => s.chiave === e.evento)?.nome ?? e.evento); break;
      case 'domanda': riga('domande', n.frase.domanda(e.domanda) ?? 'Domanda', 'risposta'); break;
      case 'cruciverba': riga('cruciverba', `Del ${dataLeggibile(e.data)}`, 'risolto'); break;
      case 'invito': { const i = n.frase.invito(e.invito); riga('inviti', i ? `${i.confidenteNome}${i.data ? `, ${dataLeggibile(i.data)}` : ''}` : 'Invito', 'i punti dell’incontro valgono ×1,2'); break; }
      case 'persona': riga('persone', n.frase.persona(e.persona) ?? 'Persona', 'registrata nel compendio'); break;
      case 'trofeo': riga('trofei', n.frase.trofeo?.(e.trofeo) ?? 'Trofeo', 'ottenuto'); break;
      case 'pesca': riga('pesca', 'Sessione a Ichigaya', 'da osservare alla spunta'); break;
      case 'fortuna': riga('fortuna', nomeDote(e.dote), 'per il resto del giorno'); break;
    }
  }
  return [...gruppi.values()].filter((g) => g.righe.length > 0);
}
