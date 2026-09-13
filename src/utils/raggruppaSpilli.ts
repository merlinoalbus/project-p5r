// ============================================================
// raggruppaSpilli — chi si vede sulla mappa, e dove, perché ogni bersaglio abbia i suoi 44 px
// ============================================================
//
// Sta qui e non dentro il componente perché è **la** regola dei bersagli sulla mappa, ed è stata
// rifatta sei volte su altrettanti rilievi: come funzione pura si prova sui dati veri del
// pacchetto (`raggruppaSpilli.pacchetto.test.ts`) invece di riscriverla a mano a ogni verifica.
//
// L'invariante, uno solo: **due bersagli resi non distano mai meno di DISTANZA_MINIMA_SPILLI**,
// a ogni ingrandimento e a ogni larghezza. Tutto il resto discende da lì.

import type { SpilloDto } from '../types';

export interface Punto { x: number; y: number }
/** `scostato`: la pastiglia si sposta perché sul punto c'è il pin che si sta trascinando;
 *  `scosto` è di quanto, in pixel di schermo, calcolato a partire da dov'è quel pin. */
export type Gruppo = { chiave: string; x: number; y: number; spilli: SpilloDto[]; scostato?: boolean; scosto?: Punto };

/** Quanto devono distare, sullo schermo, i centri di due bersagli perché restino distinti: la
 *  pastiglia del gruppo misura 34 px e l'area del tocco la porta a 45; un pixel in più evita che
 *  l'arrotondamento sub-pixel ne mangi mezzo. */
export const DISTANZA_MINIMA_SPILLI = 46;
/** L'altezza della goccia di uno spillo singolo, che è ancorata alla punta. */
export const ALTEZZA_GOCCIA = 38;

export interface Inquadratura { pan: Punto; zoom: number; nat: { w: number; h: number }; dim: { w: number; h: number } }

/**
 * Divide gli spilli visibili in gocce singole e pastiglie «+n», e decide dove va ciascuna.
 *
 * `selezionato` è il pin aperto; `editor` dice se si sta modificando la mappa, dove quel pin esce
 * dalla nube per poter essere trascinato e tutto il resto gli fa posto.
 */
export function raggruppaSpilli(visibili: SpilloDto[], inq: Inquadratura, opzioni: { selezionatoId: number | null; editor: boolean }): { singoli: SpilloDto[]; gruppi: Gruppo[] } {
  const { pan, zoom, nat, dim } = inq;
  const { selezionatoId, editor } = opzioni;
  const perSchermo = (s: SpilloDto) => ({ x: pan.x + (s.x / 100) * nat.w * zoom, y: pan.y + (s.y / 100) * nat.h * zoom });
  type Nube = { spilli: SpilloDto[] };
  // Dove cade davvero il bersaglio, che non è il punto ancorato: la goccia di un singolo ha la
  // punta *sul* punto (il bottone è traslato di -100% in verticale), quindi il suo centro sta
  // mezza goccia più in alto; la pastiglia del gruppo, invece, è centrata sul punto. Confrontando
  // i punti anziché i centri restavano due bersagli a 44,3 px pur avendone chiesti 46.
  const centro = (n: Nube) => {
    const p = n.spilli.map(perSchermo);
    const x = p.reduce((a, q) => a + q.x, 0) / p.length;
    const y = p.reduce((a, q) => a + q.y, 0) / p.length;
    return { x, y: p.length === 1 ? y - ALTEZZA_GOCCIA / 2 : y };
  };
  const nubi: Nube[] = visibili.map((s) => ({ spilli: [s] }));
  for (let fuso = true; fuso; ) {
    fuso = false;
    for (let i = 0; i < nubi.length && !fuso; i++) {
      for (let j = i + 1; j < nubi.length && !fuso; j++) {
        const a = centro(nubi[i]), b = centro(nubi[j]);
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 >= DISTANZA_MINIMA_SPILLI ** 2) continue;
        nubi[i] = { spilli: [...nubi[i].spilli, ...nubi[j].spilli] };
        nubi.splice(j, 1);
        fuso = true;
      }
    }
  }
  const singoli: SpilloDto[] = [];
  const gruppi: Gruppo[] = [];
  for (const nube of nubi) {
    // Una nube resta una nube anche quando uno dei suoi spilli è aperto. Prima si scorporava, e i
    // compagni tornavano gocce singole alla distanza che il raggruppamento aveva appena dichiarato
    // inammissibile: su spilli con le stesse coordinate — nel pacchetto ce ne sono a centinaia —
    // erano tre gocce sovrapposte, due delle quali senza un pixel di bersaglio (rilievo del
    // validatore, 2026-09-13). Il popup dello spillo aperto si mostra lo stesso, ancorato lì.
    //
    // **Nell'editor** una sola eccezione, e voluta (scelta dell'utente, 2026-09-13): il pin
    // *selezionato* esce dalla nube e si mostra da solo, perché lì il gesto è trascinare quel pin
    // e un gruppo lo renderebbe impossibile. I compagni restano raggruppati — non tornano gocce
    // sovrapposte — e lo si sceglie dall'elenco del gruppo, come nel visore.
    let membri = nube.spilli;
    let scorporato = false;
    if (editor && selezionatoId !== null && membri.length > 1 && membri.some((s) => s.id === selezionatoId)) {
      singoli.push(membri.find((s) => s.id === selezionatoId)!);
      membri = membri.filter((s) => s.id !== selezionatoId);
      scorporato = true;
    }
    // Il residuo resta una pastiglia anche quando è uno solo: se tornasse goccia si troverebbe a
    // meno di 46 px dal pin selezionato — e per le nove coppie a coordinate identiche del
    // pacchetto, esattamente sotto, senza un pixel raggiungibile e senza più il «+n» da cui
    // riaprirla (rilievo del validatore, 2026-09-13).
    if (membri.length === 1 && !scorporato) { singoli.push(...membri); continue; }
    const chiave = membri.map((s) => s.id).sort((a, b) => a - b).join('-');
    gruppi.push({ chiave, x: membri.reduce((a, s) => a + s.x, 0) / membri.length, y: membri.reduce((a, s) => a + s.y, 0) / membri.length, spilli: membri, scostato: scorporato });
  }

  // **Chi sta addosso al pin selezionato si sposta, e il pin no.** Il pin è l'unico bersaglio che
  // non si può muovere: è il punto vero, quello che si trascina. Tutto il resto gli fa posto.
  //
  // La prima versione spostava solo la pastiglia del residuo, e lasciava scoperto l'altro attore:
  // il pin, uscito dalla nube, poteva trovarsi a ridosso di una nube **diversa** — il raggruppamento
  // garantisce 46 px fra i centri delle nubi, non fra un singolo membro e la nube accanto. Sul
  // pacchetto erano 381 casi su 2.439 (15,6%), fino a 1,6 px di distanza (rilievo del validatore,
  // 2026-09-13). Ora si scosta **ogni** nube che gli sta troppo vicino; e se a stargli addosso è
  // un altro pin — che spostare non si può, perché indica un punto — quello diventa a sua volta
  // una pastiglia, cioè un bersaglio che si può scostare, come già fa il residuo.
  const selScorporato = editor && selezionatoId !== null ? singoli.find((s) => s.id === selezionatoId) : undefined;
  if (selScorporato) {
    const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
    const dentroTela = (p: Punto) => dim.w === 0 || (p.x >= 22 && p.x <= dim.w - 22 && p.y >= 22 && p.y <= dim.h - 22);
    const centroSpillo = (s: SpilloDto) => { const p = perSchermo(s); return { x: p.x, y: p.y - ALTEZZA_GOCCIA / 2 }; };
    const centroGruppo = (g: Gruppo) => perSchermo({ ...selScorporato, x: g.x, y: g.y });
    const centroPin = centroSpillo(selScorporato);

    for (let i = singoli.length - 1; i >= 0; i--) {
      const s = singoli[i];
      if (s.id === selezionatoId || dist(centroSpillo(s), centroPin) >= DISTANZA_MINIMA_SPILLI) continue;
      singoli.splice(i, 1);
      gruppi.push({ chiave: `solo-${s.id}`, x: s.x, y: s.y, spilli: [s], scostato: true });
    }

    // I fissi sono il pin e gli altri spilli singoli; le pastiglie si spostano una per volta, e
    // ciascuna tiene conto di dove sono finite quelle già sistemate.
    const fissi = [centroPin, ...singoli.filter((s) => s.id !== selezionatoId).map(centroSpillo)];
    const posizione = new Map<string, Punto>(gruppi.map((g) => [g.chiave, centroGruppo(g)]));
    const daSistemare = [...gruppi].sort((a, b) => dist(centroGruppo(a), centroPin) - dist(centroGruppo(b), centroPin));
    for (const g of daSistemare) {
      const base = centroGruppo(g);
      const altri = [...fissi, ...gruppi.filter((x) => x !== g).map((x) => posizione.get(x.chiave)!)];
      const libera = (p: Punto) => altri.every((a) => dist(p, a) >= DISTANZA_MINIMA_SPILLI) && dentroTela(p);
      if (libera(base)) continue;
      const lungo = (ang: number, ammessa: (p: Punto) => boolean) => {
        const u = { x: Math.cos(ang), y: Math.sin(ang) };
        for (let d = 0; d <= 96; d += 1) {
          const p = { x: base.x + u.x * d, y: base.y + u.y * d };
          if (ammessa(p)) return p;
        }
        return null;
      };
      // Si parte dalla semiretta che va dal pin alla nube — quella che se ne allontana — e si
      // ruota di quindici gradi per volta finché non si trova posto.
      //
      // Una nota, perché a lungo ho creduto il contrario e l'ho pure scritto: **mentre si trascina
      // un pin questo calcolo non viene rifatto**. Il raggruppamento legge le coordinate salvate
      // degli spilli, non quelle del gesto in corso (`trascinato` vive solo nel disegno della
      // goccia), e la posizione nuova arriva al rilascio. Le pastiglie stanno ferme durante il
      // trascinamento e si risistemano una volta sola, alla fine: qui non serve né isteresi né
      // continuità, e un test che simulasse un ricalcolo per pixel proverebbe una cosa che non
      // succede (rilievo del validatore, 2026-09-13, che ha corretto il proprio rilievo precedente).
      const verso = { x: base.x - centroPin.x, y: base.y - centroPin.y };
      const ang0 = Math.hypot(verso.x, verso.y) > 0.01 ? Math.atan2(verso.y, verso.x) : 0;
      let scelta: Punto | null = null;
      for (let giro = 0; giro <= 12 && !scelta; giro++) {
        for (const segno of giro === 0 ? [1] : [1, -1]) {
          const p = lungo(ang0 + (segno * giro * Math.PI) / 12, libera);
          if (p) { scelta = p; break; }
        }
      }
      // Se non c'è posto per tutti — non capita sul pacchetto, ma le mappe si modificano — si
      // tiene almeno il pin libero e ci si allontana il più possibile dagli altri.
      if (!scelta) {
        let voto = -Infinity;
        for (let giro = -12; giro <= 12; giro++) {
          const p = lungo(ang0 + (giro * Math.PI) / 12, (q) => dist(q, centroPin) >= DISTANZA_MINIMA_SPILLI);
          if (!p) continue;
          const punteggio = Math.min(...altri.map((a) => dist(p, a))) - (dentroTela(p) ? 0 : 1000) - Math.abs(giro) / 100;
          if (punteggio > voto) { voto = punteggio; scelta = p; }
        }
      }
      if (!scelta) continue;
      g.scosto = { x: scelta.x - base.x, y: scelta.y - base.y };
      posizione.set(g.chiave, scelta);
    }
  }
  return { singoli, gruppi };
}
