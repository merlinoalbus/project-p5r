// ============================================================
// gerarchiaMappe — l'albero dei luoghi: Città › Quartieri › Aree › Planimetrie e Città › Palazzi › Aree › Planimetrie (L11 B5)
// ============================================================
//
// Una lettura sola, in blocco (niente query per nodo), che costruisce per intero l'indice `/guida/mappe`: ogni nodo porta la sua
// casa (l'unica pagina che lo mostra, `casaMappa.ts`), la sua miniatura (il risolutore unico di L1) e i conteggi che il server
// calcola una volta sola: il client non somma niente (E1, E2). Dentro un'Area i pin contano per **oggetto** e non per versione
// (E6): due pin dello stesso gruppo sono lo stesso oggetto se hanno lo stesso riferimento; senza riferimento, se collegano lo
// stesso insieme di voci; altrimenti sono distinti. Non si usa il nome (i nomi generici «Nemico», «Salita» gonfierebbero la
// deduplicazione) né la posizione (le versioni sono ritagli diversi: stessa cosa, posizioni diverse).
//
// Modulo foglia: lo importa soltanto la rotta. Nessuna scrittura. I Memento non ci sono (B6): i loro fogli non hanno un posto
// finché non c'è il loro ramo, e `mappeDaCollocare` li esclude di proposito.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { GRUPPI_CONTEGGIO_SPILLO, gruppoConteggioSpillo } from '../../../shared/spilli.js';
import type { ConteggiNodoDto, ConteggiPinDto, GerarchiaMappeDto, NodoGerarchiaDto } from '../../../shared/types.js';
import { verificaPartita } from '../verificaPartita.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { disponibilitaQuartiere } from '../cittaService.js';
import { casaDelPalazzo, casaDellArea, casaDellaMappa, conAree, contestoAree, type RigaArea } from './casaMappa.js';
import { illustrazioneDaRiga, immaginiCaricateDelleMappe, type RigaPerIllustrazione } from './immagineMappa.js';
import { chiaviPubblicheDelleMappe } from './percorsiMappe.js';
import { radiceDelPalazzo } from './alberoMappe.js';
import { infiltrazioniDelleAree, type InfiltrazioneDellArea } from './legamiInfiltrazioni.js';
import { mappeDaCollocare } from './areeService.js';

/**
 * Il filtro dei Palazzi, in un solo punto (è quello di `utils/palazzi.ts`, `soloPalazzi`): quando Iweleth diventa solo un dedalo
 * (L8 B7, migrazione 175) esce dai Palazzi: i dungeon che confluiscono in un dedalo (`dedalo_confluenza`) non sono Palazzi, e il loro posto è il
 * ramo dei Memento. Senza la tabella (schema precedente alla 175) vale il solo tipo.
 */
const sqlPalazzi = (): string => {
  const confluenza = !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dedalo_confluenza'").get();
  return confluenza ? "d.tipo = 'palazzo' AND d.chiave NOT IN (SELECT dungeon_chiave FROM dedalo_confluenza)" : "d.tipo = 'palazzo'";
};

const vuoti = (): ConteggiPinDto => ({ contenuto: 0, passaggi: 0, note: 0 });
const somma = (a: ConteggiPinDto, b: ConteggiPinDto): void => { for (const g of GRUPPI_CONTEGGIO_SPILLO) a[g] += b[g]; };

interface RigaQuartiereG { chiave: string; nome: string; mappa_interna: string; mappa_presente: string | null; immagine_chiave: string | null; asset: string | null; ruolo_immagine: string | null }
interface RigaPalazzoG { chiave: string; nome: string; regola_boss: string | null }
interface RigaPlanimetriaG extends RigaPerIllustrazione {
  nome: string; area_chiave: string; versione_etichetta: string | null; versione_ordine: number;
}
interface RigaPinG { mappa_chiave: string; tipo: string; id: number; uid: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; voci: string | null }

/** I pin propri di ogni mappa (per gruppo, senza deduplicazione) e quelli di ogni Area (un oggetto una volta, E6). */
function contaPin(pin: RigaPinG[], areaDellaMappa: Map<string, string>): { propri: Map<string, ConteggiPinDto>; perArea: Map<string, ConteggiPinDto> } {
  const propri = new Map<string, ConteggiPinDto>();
  const perArea = new Map<string, ConteggiPinDto>();
  const visti = new Map<string, Set<string>>();
  for (const p of pin) {
    const gruppo = gruppoConteggioSpillo(p.tipo);
    const c = propri.get(p.mappa_chiave) ?? vuoti();
    c[gruppo] += 1;
    propri.set(p.mappa_chiave, c);
    const area = areaDellaMappa.get(p.mappa_chiave);
    if (!area) continue;
    // le voci in ordine alfabetico: l'ordine di `group_concat` non è garantito da SQL
    const voci = p.voci ? p.voci.split('|').sort().join('|') : '';
    const oggetto = p.riferimento_tipo && p.riferimento_chiave ? `r:${p.riferimento_tipo}:${p.riferimento_chiave}` : voci ? `v:${voci}` : `u:${p.uid ?? `i${p.id}`}`;
    const chiave = `${gruppo}|${oggetto}`;
    const giaVisti = visti.get(area) ?? new Set<string>();
    visti.set(area, giaVisti);
    if (giaVisti.has(chiave)) continue;
    giaVisti.add(chiave);
    const a = perArea.get(area) ?? vuoti();
    a[gruppo] += 1;
    perArea.set(area, a);
  }
  return { propri, perArea };
}

/** La gerarchia dei luoghi; con una partita, quartieri e Aree del mondo dicono se sono già aperti (mai nascosti: si segna). */
export function gerarchiaMappe(partitaId?: number): GerarchiaMappeDto {
  if (partitaId !== undefined) verificaPartita(partitaId);
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const ctx = contestoAree();
  const caricate = immaginiCaricateDelleMappe();

  // ---- letture, una volta per richiesta ----
  const quartieri = (conAree() ? prepared(`SELECT q.chiave, q.nome, 'citta-' || q.chiave AS mappa_interna, m.chiave AS mappa_presente, m.immagine_chiave, m.asset, m.ruolo_immagine
      FROM quartiere q LEFT JOIN mappa m ON m.chiave = 'citta-' || q.chiave WHERE q.chiave <> 'mementos' ORDER BY q.ordine, q.chiave`).all() : []) as RigaQuartiereG[];
  const palazzi = (conAree() ? prepared(`SELECT d.chiave, d.nome, d.regola_boss FROM dungeon d WHERE ${sqlPalazzi()} ORDER BY d.ordine, d.chiave`).all() : []) as RigaPalazzoG[];
  const aree = (conAree() ? prepared('SELECT * FROM area ORDER BY ordine, slug').all() : []) as RigaArea[];
  const planimetrie = (conAree() ? prepared(`SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, area_chiave, versione_etichetta, versione_ordine
      FROM mappa WHERE area_chiave IS NOT NULL ORDER BY area_chiave, versione_ordine, chiave`).all() : []) as RigaPlanimetriaG[];
  const righeTokyo = prepared("SELECT chiave, immagine_chiave, asset, ruolo_immagine FROM mappa WHERE chiave = 'tokyo'").get() as RigaPerIllustrazione | undefined;
  const pin = prepared(`SELECT s.mappa_chiave, s.tipo, s.id, s.uid, s.riferimento_tipo, s.riferimento_chiave, v.voci
      FROM spillo s LEFT JOIN (SELECT spillo_id, group_concat(voce_chiave, '|') AS voci FROM spillo_voce GROUP BY spillo_id) v ON v.spillo_id = s.id
      WHERE s.mappa_chiave IS NOT NULL`).all() as RigaPinG[];
  const infiltrazioniDellArea = infiltrazioniDelleAree();
  const infiltrazioniDeiPalazzi = (palazzi.length === 0 ? [] : prepared(`SELECT chiave, nome, ordine, dungeon_chiave FROM dungeon_area
      WHERE dungeon_chiave IN (${palazzi.map(() => '?').join(',')}) ORDER BY ordine, chiave`).all(...palazzi.map((p) => p.chiave))) as Array<InfiltrazioneDellArea & { dungeon_chiave: string }>;
  const daCollocare = mappeDaCollocare();
  // i percorsi pubblici di tutte le mappe e l'elenco di quelle che esistono, in due letture: nessuna query per nodo
  const pubbliche = chiaviPubblicheDelleMappe();
  const chiaveMappa = (identita: string): string => pubbliche.get(identita) ?? identita;
  const mappeEsistenti = new Set((prepared('SELECT chiave FROM mappa').all() as Array<{ chiave: string }>).map((r) => r.chiave));

  const areaDellaMappa = new Map(planimetrie.map((p) => [p.chiave, p.area_chiave]));
  const { propri, perArea } = contaPin(pin, areaDellaMappa);
  const pinPropri = (mappa: string): ConteggiPinDto => ({ ...(propri.get(mappa) ?? vuoti()) });

  // ---- planimetrie sotto la loro Area ----
  const planimetrieDellArea = new Map<string, RigaPlanimetriaG[]>();
  for (const p of planimetrie) planimetrieDellArea.set(p.area_chiave, [...(planimetrieDellArea.get(p.area_chiave) ?? []), p]);

  const nodoPlanimetria = (a: RigaArea, p: RigaPlanimetriaG, indice: number): NodoGerarchiaDto => ({
    tipo: 'planimetria', chiave: chiaveMappa(p.chiave), nome: p.versione_etichetta?.trim() || `Planimetria ${indice + 1}`,
    casa: casaDellArea(a, p.chiave, chiaveMappa) ?? casaDellaMappa({ chiave: p.chiave, tipo: 'luogo', area_chiave: a.chiave }, ctx),
    immagine: illustrazioneDaRiga(p, caricate),
    conteggi: { pin: pinPropri(p.chiave) },
    versione: { etichetta: p.versione_etichetta, ordine: p.versione_ordine, predefinita: a.planimetria_predefinita === p.chiave },
    figli: [],
  });

  const nodoInfiltrazione = (i: InfiltrazioneDellArea, dungeon: string): NodoGerarchiaDto => ({
    tipo: 'infiltrazione', chiave: i.chiave, nome: i.nome, casa: `${casaDelPalazzo(dungeon)}?infiltrazione=${encodeURIComponent(i.chiave)}`,
    immagine: null, conteggi: { pin: vuoti() }, figli: [],
  });

  const nodoArea = (a: RigaArea, disponibile: boolean | null, bloccoMotivo: string | null): NodoGerarchiaDto => {
    const righe = planimetrieDellArea.get(a.chiave) ?? [];
    const principale = righe.find((p) => p.chiave === a.planimetria_predefinita) ?? righe[0];
    const nodo: NodoGerarchiaDto = {
      tipo: 'area', chiave: a.chiave, nome: a.nome, casa: casaDellArea(a), slug: a.slug,
      immagine: principale ? illustrazioneDaRiga(principale, caricate) : null,
      conteggi: { planimetrie: righe.length, pin: { ...(perArea.get(a.chiave) ?? vuoti()) } },
      figli: righe.map((p, i) => nodoPlanimetria(a, p, i)),
    };
    if (a.da_verificare === 1) nodo.daVerificare = true;
    nodo.disponibile = disponibile;
    if (bloccoMotivo) nodo.bloccoMotivo = bloccoMotivo;
    if (a.dungeon_chiave) nodo.accanto = (infiltrazioniDellArea.get(a.chiave) ?? []).map((i) => nodoInfiltrazione(i, a.dungeon_chiave as string));
    return nodo;
  };

  /** Somma i conteggi dei figli-Area di un contenitore e li unisce ai pin della sua mappa. */
  const conteggiContenitore = (mappaInterna: string, figliArea: NodoGerarchiaDto[]): ConteggiNodoDto => {
    const pinTotali = pinPropri(mappaInterna);
    let nPlanimetrie = 0;
    for (const f of figliArea) { somma(pinTotali, f.conteggi.pin); nPlanimetrie += f.conteggi.planimetrie ?? 0; }
    return { aree: figliArea.length, planimetrie: nPlanimetrie, pin: pinTotali };
  };

  // ---- quartieri ----
  const areeDelQuartiere = (q: string): RigaArea[] => aree.filter((a) => a.quartiere_chiave === q);
  const nodiQuartieri: NodoGerarchiaDto[] = quartieri.map((q) => {
    const disp = disponibilitaQuartiere(q.chiave, st);
    const stato = partitaId === undefined ? null : disp.disponibile;
    const figliArea = areeDelQuartiere(q.chiave).map((a) => nodoArea(a, stato, disp.disponibile ? null : disp.bloccoMotivo));
    // `mappa` solo se la mappa del quartiere esiste: «Colloca» non deve ricevere una chiave che non porta a nulla
    return {
      tipo: 'quartiere', chiave: q.chiave, nome: q.nome, casa: `/guida/citta/${encodeURIComponent(q.chiave)}`,
      ...(q.mappa_presente ? { mappa: chiaveMappa(q.mappa_interna) } : {}),
      immagine: illustrazioneDaRiga({ chiave: q.mappa_interna, immagine_chiave: q.immagine_chiave, asset: q.asset, ruolo_immagine: q.ruolo_immagine }, caricate),
      conteggi: conteggiContenitore(q.mappa_interna, figliArea),
      disponibile: stato, bloccoMotivo: partitaId === undefined ? null : disp.bloccoMotivo,
      figli: figliArea,
    };
  });

  // ---- aree della città (lo staff di Tokyo) ----
  // Le Aree della città e dei Palazzi non hanno una condizione di sblocco propria: `disponibile` resta «non valutata» (null), mai un `true` non calcolato.
  const nodiAreeCitta = aree.filter((a) => a.citta_chiave).map((a) => nodoArea(a, null, null));

  // ---- Palazzi ----
  const nodiPalazzi: NodoGerarchiaDto[] = palazzi.map((d) => {
    const radice = radiceDelPalazzo(d.chiave);
    const figliArea = aree.filter((a) => a.dungeon_chiave === d.chiave).map((a) => nodoArea(a, null, null));
    const conInfiltrazione = new Set(figliArea.flatMap((a) => (a.accanto ?? []).map((i) => i.chiave)));
    const proprie = infiltrazioniDeiPalazzi.filter((i) => i.dungeon_chiave === d.chiave);
    const senzaArea = proprie.filter((i) => !conInfiltrazione.has(i.chiave)).map((i) => nodoInfiltrazione(i, d.chiave));
    const nodo: NodoGerarchiaDto = {
      tipo: 'palazzo', chiave: d.chiave, nome: d.nome, casa: casaDelPalazzo(d.chiave),
      ...(mappeEsistenti.has(radice) ? { mappa: chiaveMappa(radice) } : {}),
      immagine: null,
      conteggi: { ...conteggiContenitore(radice, figliArea), infiltrazioni: proprie.length },
      figli: figliArea,
    };
    if (d.regola_boss === 'memento') nodo.dedalo = true;
    if (senzaArea.length > 0) nodo.senzaArea = senzaArea;
    return nodo;
  });

  // ---- Tokyo: quartieri, aree della città, Palazzi ----
  const pinTokyo = pinPropri('tokyo');
  for (const f of [...nodiQuartieri, ...nodiAreeCitta, ...nodiPalazzi]) somma(pinTokyo, f.conteggi.pin);
  const areeMondo = [...nodiQuartieri.flatMap((q) => q.figli), ...nodiAreeCitta];
  const areePalazzi = nodiPalazzi.flatMap((p) => p.figli);
  const conta = (nodi: NodoGerarchiaDto[]): number => nodi.reduce((n, a) => n + (a.conteggi.planimetrie ?? 0), 0);
  const infiltrazioniTotali = nodiPalazzi.reduce((n, p) => n + (p.conteggi.infiltrazioni ?? 0), 0);
  const tokyo: NodoGerarchiaDto = {
    tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo', casa: '/guida/citta',
    ...(mappeEsistenti.has('tokyo') ? { mappa: chiaveMappa('tokyo') } : {}),
    immagine: righeTokyo ? illustrazioneDaRiga(righeTokyo, caricate) : { immagineUrl: null, asset: null },
    conteggi: { quartieri: nodiQuartieri.length, palazzi: nodiPalazzi.length, aree: areeMondo.length + areePalazzi.length, planimetrie: conta(areeMondo) + conta(areePalazzi), infiltrazioni: infiltrazioniTotali, pin: pinTokyo },
    figli: [...nodiQuartieri, ...nodiAreeCitta, ...nodiPalazzi],
  };

  // ---- Da collocare: sempre presente, in fondo ----
  const nodoDaCollocare: NodoGerarchiaDto = {
    tipo: 'da-collocare', chiave: 'da-collocare', nome: 'Da collocare', casa: null, immagine: null,
    conteggi: { planimetrie: daCollocare.length, pin: vuoti() }, figli: [], daCollocare,
  };

  return {
    radici: [tokyo, nodoDaCollocare],
    totali: {
      citta: 1, quartieri: nodiQuartieri.length, areeMondo: areeMondo.length, planimetrieMondo: conta(areeMondo),
      palazzi: nodiPalazzi.length, areePalazzi: areePalazzi.length, planimetriePalazzi: conta(areePalazzi),
      infiltrazioni: infiltrazioniTotali, daCollocare: daCollocare.length, pin: pinTokyo,
    },
  };
}
