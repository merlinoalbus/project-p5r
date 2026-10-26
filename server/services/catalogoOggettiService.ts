// L7: scheda aggregata. L'identità è il catalogo; disponibilità e avanzamento restano ai servizi esistenti.
import { getDb, prepared } from '../db/dbService.js';
import { casaOggetto } from '../../shared/catalogo.js';
import type { OggettoDettaglioDto, OffertaOggettoDto, RicompensaOggettoDto } from '../../shared/types.js';
import { costoOggetto, dtoOggetto, rigaOggetto, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { verificaPartita } from './verificaPartita.js';
import { acquistiDellaPartita, dettaglioNegozio } from './negoziService.js';
import { statoDisponibilitaPartita } from './disponibilitaService.js';
import { filmDvdTutti, libriTutti, videogiochiTutti } from './attivitaService.js';
import { modelloAvanzamento, pinFattoPerLaVoce, statiDellaPartita } from './mappe/statiGuida.js';
import { statoPalazzi } from './palazziService.js';
import { letturePlanimetrieDelleVoci, planimetriaDellaVoce } from './mappe/planimetriaDellaVoce.js';
import { casaDellArea, casaDelPalazzo, contestoAree } from './mappe/casaMappa.js';
import { lettureListiniCondivisi } from './listiniCondivisi.js';
import { regaliDellaPartita } from './regaliPartita.js';
import { fontiRicompenseOggetti } from './fontiRicompenseOggetti.js';
import { trasformazioniDiJose } from './trasformazioniOggetti.js';
import { noteStoricheDi } from './noteStoricheService.js';

export { elencaCatalogoOggetti } from './catalogoOggettiLetture.js';

/** Il prezzo e il costo sono quelli della riga venduta, mai le copie della guida o dei regali. */
export function offerteDellOggetto(chiave: string, partita?: number): OffertaOggettoDto[] {
  const listini = lettureListiniCondivisi();
  const righe = prepared(`SELECT a.chiave,a.negozio_chiave,a.prezzo,a.costo_json,a.nota FROM articolo a
    JOIN negozio n ON n.chiave = a.negozio_chiave
    WHERE a.catalogo_chiave = ? AND a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.ordine,a.ordine`).all(chiave) as Array<{
    chiave: string; negozio_chiave: string; prezzo: number | null; costo_json: string | null; nota: string | null;
  }>;
  const contesto = { listini, ...(partita === undefined ? {} : { st: statoDisponibilitaPartita(partita), acquistati: acquistiDellaPartita(partita) }) };
  const negozi = new Map([...new Set(righe.map((r) => r.negozio_chiave))]
    .map((k) => [k, dettaglioNegozio(k, partita, contesto)]));
  return righe.filter((r) => !listini.articoli.has(r.chiave)).flatMap((r) => {
    const principale = negozi.get(r.negozio_chiave)!;
    const sedi = [...new Set([principale.sedeChiave ?? null, ...listini.sedi.filter((s) => s.negozio === principale.chiave).map((s) => s.luogo)])];
    return sedi.map((sede) => {
      const n = sede === principale.sedeChiave || sede === null ? principale : dettaglioNegozio(principale.chiave, partita, contesto, sede);
      const a = n.articoliElenco.find((a) => a.chiave === r.chiave)!;
      const disponibilita = a.disponibilita ?? null;
      const costo = costoOggetto(r.costo_json);
      return { articolo: r.chiave, negozio: n.chiave, negozioNome: n.nome, sedeCasa: n.sedeCasa ?? null, sedeChiave: n.sedeChiave ?? null, sedeNome: n.sedeNome ?? null,
        // Ondata 5 (lotto E): il prezzo di una fascia, letto dall'offerta come il prezzo (decisione 5: la sera delle sfide della Big Bang Burger)
        prezzo: r.prezzo, prezzoPerFascia: a.prezzoPerFascia ?? null, costo, costoDaVerificare: r.costo_json !== null && costo === null, condizioni: a.condizioni ?? [],
        presenza: n.disponibilita ?? null, disponibilita, disponibileOggi: partita === undefined ? null : disponibilita?.stato === 'disponibile',
        acquistato: a.acquistato, acquistiRegistrati: a.acquistiRegistrati ?? [], acquisti: a.acquisti, nota: r.nota, noteStoriche: a.noteStoriche,
        // Ondata 5 (decisione 21): la regola di rifornimento e, con la partita, la scorta dell'offerta
        rifornimento: a.rifornimento ?? null, ...(a.scorta !== undefined ? { scorta: a.scorta } : {}) };
    });
  });
}

function forzieriDellOggetto(chiave: string, partita?: number): OggettoDettaglioDto['forzieri'] {
  const righe = prepared(`SELECT p.chiave AS voce,p.nome AS voce_nome,p.area_chiave AS infiltrazione,
    a.nome AS infiltrazione_nome,a.dungeon_chiave AS palazzo,d.nome AS palazzo_nome,v.quantita
    FROM voce_oggetto v JOIN punto_interesse p ON p.chiave = v.voce_chiave
    JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
    WHERE v.catalogo_chiave = ? ORDER BY d.ordine,a.ordine,p.ordine`).all(chiave) as Array<{
      voce: string; voce_nome: string; infiltrazione: string; infiltrazione_nome: string; palazzo: string; palazzo_nome: string; quantita: number;
    }>;
  if (!righe.length) return [];
  const planimetrie = letturePlanimetrieDelleVoci(getDb());
  const aree = contestoAree();
  const areaPerMappa = new Map((prepared('SELECT chiave,area_chiave FROM mappa WHERE area_chiave IS NOT NULL').all() as Array<{ chiave: string; area_chiave: string }>).map((r) => [r.chiave, r.area_chiave]));
  const modello = partita === undefined ? null : modelloAvanzamento(getDb());
  const stati = partita === undefined || !modello ? null : statiDellaPartita(getDb(), modello, partita);
  const palazzi = partita === undefined || !modello ? null : statoPalazzi(partita, modello);
  const seme = rigaOggetto(chiave).sottocategoria === 'seme';
  const forzieri = new Set((prepared(seme ? "SELECT id FROM spillo WHERE tipo = 'seme-bramosia'" : "SELECT id FROM spillo WHERE tipo IN ('forziere','forziere-raro')").all() as Array<{ id: number }>).map((r) => r.id));
  return righe.map((r) => {
    const planimetria = planimetriaDellaVoce(planimetrie, r.voce);
    const areaChiave = planimetria ? areaPerMappa.get(planimetria.chiave) : undefined;
    const area = areaChiave ? aree.aree.get(areaChiave) : undefined;
    const base = (area ? casaDellArea(area, planimetria?.chiave) : null) ?? casaDelPalazzo(r.palazzo);
    // R7-11b: i rampini e i passaggi non decidono se il contenuto del forziere sia stato preso.
    const pin = (modello?.pinDellaVoce.get(r.voce) ?? []).filter((p) => forzieri.has(p.id));
    const preso = !!stati && !!modello && pin.some((p) => pinFattoPerLaVoce(modello, stati, p, r.infiltrazione));
    const stato = partita === undefined ? null : !pin.length ? 'da-verificare' : preso ? 'preso'
      : palazzi?.get(r.palazzo)?.concluso ? seme ? 'da-jose' : 'non-piu-ottenibile' : 'da-prendere';
    return { voce: r.voce, voceNome: r.voce_nome, palazzo: r.palazzo, palazzoNome: r.palazzo_nome,
      infiltrazione: r.infiltrazione, infiltrazioneNome: r.infiltrazione_nome, area: area?.chiave ?? null, areaNome: area?.nome ?? null, quantita: r.quantita,
      casa: `${base}${base.includes('?') ? '&' : '?'}infiltrazione=${encodeURIComponent(r.infiltrazione)}`,
      stato, jose: stato === 'da-jose' ? { casa: '/guida/negozi/jose', nota: 'Seme mancante acquistabile da Jose secondo la fonte secondaria; prezzo e data non confermati.' } : null };
  });
}

function ricompenseDellOggetto(chiave: string): OggettoDettaglioDto['ricompense'] {
  const righe = prepared(`SELECT r.fonte_tipo,r.fonte_chiave,c.chiave,c.nome,r.quantita,r.nota
    FROM ricompensa_oggetto r JOIN catalogo_oggetto c ON c.chiave = r.catalogo_chiave
    WHERE r.catalogo_chiave = ? ORDER BY r.fonte_tipo,r.fonte_chiave,r.ordine`).all(chiave) as Array<RicompensaOggettoDto & {
      fonte_tipo: string; fonte_chiave: string;
    }>;
  const fonti = fontiRicompenseOggetti(righe.map((r) => r.fonte_tipo));
  return righe.map((r) => {
    const fonte = fonti.get(`${r.fonte_tipo}\0${r.fonte_chiave}`);
    return { chiave: r.chiave, nome: r.nome, quantita: r.quantita, nota: r.nota, casa: casaOggetto(r.chiave),
      fonteTipo: r.fonte_tipo, fonteChiave: r.fonte_chiave, fonteNome: fonte?.nome ?? 'Fonte non più disponibile', fonteCasa: fonte?.casa ?? null,
      ...(fonte?.costo !== undefined ? { costo: fonte.costo, costoDaVerificare: fonte.costoDaVerificare, prezzo: fonte.prezzo } : {}) };
  });
}

export function dettaglioOggetto(chiave: string, partita?: number): OggettoDettaglioDto {
  if (partita !== undefined) verificaPartita(partita);
  const riga = rigaOggetto(chiave); const oggetto = dtoOggetto(riga);
  const inVendita = offerteDellOggetto(chiave, partita);
  const regalati = new Set(partita === undefined ? [] : regaliDellaPartita(partita).filter((r) => r.catalogo === chiave).map((r) => r.confidente));
  const regalo = (prepared(`SELECT g.confidente_chiave,c.nome,g.effetto,g.sconsigliato FROM confidente_regalo g JOIN confidente c ON c.chiave = g.confidente_chiave
    WHERE g.catalogo_chiave = ? ORDER BY c.ordine,g.sconsigliato,g.ordine`).all(chiave) as Array<{ confidente_chiave: string; nome: string; effetto: string | null; sconsigliato: number }>)
    .filter((r, i, tutti) => tutti.findIndex((a) => a.confidente_chiave === r.confidente_chiave && a.sconsigliato === r.sconsigliato) === i)
    .map((r) => ({ confidente: r.confidente_chiave, nome: r.nome, gradimento: r.effetto, casa: `/confidenti/${encodeURIComponent(r.confidente_chiave)}`, regalato: regalati.has(r.confidente_chiave), sconsigliato: r.sconsigliato === 1 }));
  const prodottiRicette = ricompensePerFonte('ricetta');
  const ricette = (prepared('SELECT ricetta,quantita FROM ricetta_materiale WHERE catalogo_chiave = ? ORDER BY ricetta').all(chiave) as Array<{ ricetta: string; quantita: number }>)
    .map((r) => {
      const prodotti = prodottiRicette.get(r.ricetta) ?? [];
      return { chiave: r.ricetta, nome: prodotti.length ? prodotti.map((p) => p.nome).join(' / ') : 'Prodotto non collegato',
        nomeStorico: r.ricetta, prodotti, quantita: r.quantita, casa: '/guida/oggetti?scheda=fabbricazione' };
    });
  let lettura: OggettoDettaglioDto['lettura'] = null;
  const libro = prepared('SELECT chiave FROM libro WHERE catalogo_chiave = ?').get(chiave) as { chiave: string } | undefined;
  const film = prepared('SELECT chiave FROM film WHERE catalogo_chiave = ?').get(chiave) as { chiave: string } | undefined;
  const videogioco = prepared("SELECT chiave FROM attivita WHERE tipo = 'videogioco' AND catalogo_chiave = ?").get(chiave) as { chiave: string } | undefined;
  if (libro) {
    const libri = libriTutti(partita);
    const voce = libri.libri.find((v) => v.chiave === libro.chiave);
    if (voce) lettura = { tipo: 'libro', voce, letturaRapida: libri.letturaRapida };
  } else if (film) {
    const voce = filmDvdTutti(partita).film.find((v) => v.chiave === film.chiave);
    if (voce) lettura = { tipo: 'film', voce };
  } else if (videogioco) {
    const voce = videogiochiTutti(partita).videogiochi.find((v) => v.chiave === videogioco.chiave);
    if (voce) lettura = { tipo: 'videogioco', voce };
  }
  // F6: la nota storica della fonte è un dato (migrazione 139), legato all'oggetto del catalogo
  return { ...oggetto, noteStoriche: noteStoricheDi('catalogo', riga.chiave), inVendita, regalo, forzieri: forzieriDellOggetto(chiave, partita), ricompense: ricompenseDellOggetto(chiave),
    trasformazioni: trasformazioniDiJose(partita === undefined ? undefined : statoDisponibilitaPartita(partita), chiave),
    scambi: inVendita.filter((o) => o.costo !== null || o.costoDaVerificare), ricette, lettura,
    partita: partita === undefined ? null : { acquistato: inVendita.some((o) => o.acquistato), regalato: regalati.size > 0, letto: lettura?.voce.fatto ?? false } };
}
