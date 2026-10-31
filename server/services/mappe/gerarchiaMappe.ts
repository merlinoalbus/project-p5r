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
// Il ramo dei Memento (L11 B6) è una radice accanto a Tokyo: Memento › dedali › aree del dedalo (senza planimetrie). Ogni dedalo porta
// per casa il suo menù nella scheda dei Memento (`?area=`), ogni area del dedalo anche la zona (`&zona=`). Le mappe dei Memento che non
// hanno un'Area (l'entrata, `citta-mementos`, e ogni mappa figlia della radice `dungeon-mementos` senza Area) sono foglie del nodo Memento,
// con il visore per casa: per quelle mappe il visore è l'unica pagina. La regola è strutturale (genitore e Area), mai il nome: gli otto fogli
// delle strutture fisse («Memento - aree fisse — …») sono stati tolti il 2026-10-31 (O9-4, migrazione 322, «Planimetrie delle aree fisse dei
// Memento si possono rimuovere»). Iweleth (L8 B7) sta una volta sola, come dedalo; le Aree e le planimetrie del suo vecchio Palazzo sono
// l'«Archivio del Palazzo» dentro il suo dedalo, perché non perdano il posto.
//
// Le carte dei Palazzi, dei Dedali dei Memento e delle aree dei Dedali (O9-5, 2026-10-31: «l'area Memento riporta le voci senza immagini.
// Ma io ho generato delle immagini da inserire. vorrei poterle inserire e/o modificare», «anche per i palazzi») portano la miniatura caricata
// dall'utente nell'ambito `dungeon` (una lettura sola per tutti i nodi) e la chiave dove caricarla (`miniatura`).
//
// Modulo foglia: lo importa soltanto la rotta. Nessuna scrittura. `mappeDaCollocare` esclude le mappe dei Memento di proposito: hanno il loro posto qui.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { GRUPPI_CONTEGGIO_SPILLO, gruppoConteggioSpillo } from '../../../shared/spilli.js';
import type { ConteggiNodoDto, ConteggiPinDto, GerarchiaMappeDto, IllustrazioneDto, NodoGerarchiaDto } from '../../../shared/types.js';
import { verificaPartita } from '../verificaPartita.js';
import { statoDisponibilitaPartita } from '../disponibilitaService.js';
import { disponibilitaQuartiere } from '../cittaService.js';
import { casaDeiMemento, casaDelDedalo, casaDelPalazzo, casaDellArea, casaDellaMappa, conAree, contestoAree, type RigaArea } from './casaMappa.js';
import { illustrazioneDaRiga, immaginiCaricateDelleMappe, immaginiCaricateDi, urlCaricataDi, type RigaPerIllustrazione } from './immagineMappa.js';
import { AMBITO_MINIATURA_LUOGO } from '../../../shared/immagini.js';
import { chiaviPubblicheDelleMappe } from './percorsiMappe.js';
import { radiceDelPalazzo } from './alberoMappe.js';
import { infiltrazioniDelleAree, type InfiltrazioneDellArea } from './legamiInfiltrazioni.js';
import { mappeDaCollocare } from './areeService.js';

/**
 * Il filtro dei Palazzi, in un solo punto (è quello di `utils/palazzi.ts`, `soloPalazzi`): quando Iweleth diventa solo un dedalo
 * (L8 B7, migrazione 175) esce dai Palazzi: i dungeon che confluiscono in un dedalo (`dedalo_confluenza`) non sono Palazzi, e il loro posto è il
 * ramo dei Memento. Senza la tabella (schema precedente alla 175) vale il solo tipo.
 */
const tabellaConfluenza = (): boolean => !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dedalo_confluenza'").get();
const sqlPalazzi = (): string => {
  const confluenza = tabellaConfluenza();
  return confluenza ? "d.tipo = 'palazzo' AND d.chiave NOT IN (SELECT dungeon_chiave FROM dedalo_confluenza)" : "d.tipo = 'palazzo'";
};

const vuoti = (): ConteggiPinDto => ({ contenuto: 0, passaggi: 0, note: 0 });
const somma = (a: ConteggiPinDto, b: ConteggiPinDto): void => { for (const g of GRUPPI_CONTEGGIO_SPILLO) a[g] += b[g]; };

interface RigaQuartiereG { chiave: string; nome: string; mappa_interna: string; mappa_presente: string | null; immagine_chiave: string | null; asset: string | null; ruolo_immagine: string | null }
interface RigaPalazzoG { chiave: string; nome: string }
interface RigaDedaloG { chiave: string; nome: string }
interface RigaAreaDedaloG { chiave: string; nome: string; dedalo_chiave: string }
interface RigaFoglioG extends RigaPerIllustrazione { nome: string; versione_etichetta: string | null; versione_ordine: number | null }
/** Il conteggio di qualcosa per chiave (di dedalo o di area del dedalo). */
interface RigaConteggioG { chiave: string; n: number }
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
  // le miniature delle carte dei Palazzi, dei Dedali e delle aree dei Dedali (O9-5), lette una volta sola per tutti i nodi
  const miniatureLuoghi = immaginiCaricateDi(AMBITO_MINIATURA_LUOGO);
  /** La miniatura caricata di un Palazzo, di un Dedalo o di un'area di un Dedalo come illustrazione (senza asset: senza caricata il Palazzo
   *  e il Dedalo restano con il loro emblema, l'area del Dedalo senza immagine), e dove caricarla. */
  const miniaturaDelLuogo = (chiave: string): { immagine: IllustrazioneDto | null; miniatura: { ambito: typeof AMBITO_MINIATURA_LUOGO; chiave: string } } => {
    const url = urlCaricataDi(AMBITO_MINIATURA_LUOGO, chiave, miniatureLuoghi);
    return { immagine: url ? { immagineUrl: url, asset: null } : null, miniatura: { ambito: AMBITO_MINIATURA_LUOGO, chiave } };
  };

  // ---- letture, una volta per richiesta ----
  const quartieri = (conAree() ? prepared(`SELECT q.chiave, q.nome, 'citta-' || q.chiave AS mappa_interna, m.chiave AS mappa_presente, m.immagine_chiave, m.asset, m.ruolo_immagine
      FROM quartiere q LEFT JOIN mappa m ON m.chiave = 'citta-' || q.chiave WHERE q.chiave <> 'mementos' ORDER BY q.ordine, q.chiave`).all() : []) as RigaQuartiereG[];
  const palazzi = (conAree() ? prepared(`SELECT d.chiave, d.nome FROM dungeon d WHERE ${sqlPalazzi()} ORDER BY d.ordine, d.chiave`).all() : []) as RigaPalazzoG[];
  // i Palazzi confluiti in un dedalo (Iweleth): la loro riga resta per le Aree e le planimetrie, che diventano l'archivio del dedalo
  const confluiti = (conAree() && tabellaConfluenza() ? prepared(`SELECT d.chiave, d.nome, c.dedalo_chiave FROM dedalo_confluenza c JOIN dungeon d ON d.chiave = c.dungeon_chiave
      ORDER BY d.ordine, d.chiave`).all() : []) as Array<RigaPalazzoG & { dedalo_chiave: string }>;
  const aree = (conAree() ? prepared('SELECT * FROM area ORDER BY ordine, slug').all() : []) as RigaArea[];
  const planimetrie = (conAree() ? prepared(`SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, area_chiave, versione_etichetta, versione_ordine
      FROM mappa WHERE area_chiave IS NOT NULL ORDER BY area_chiave, versione_ordine, chiave`).all() : []) as RigaPlanimetriaG[];
  const righeTokyo = prepared("SELECT chiave, immagine_chiave, asset, ruolo_immagine FROM mappa WHERE chiave = 'tokyo'").get() as RigaPerIllustrazione | undefined;
  const pin = prepared(`SELECT s.mappa_chiave, s.tipo, s.id, s.uid, s.riferimento_tipo, s.riferimento_chiave, v.voci
      FROM spillo s LEFT JOIN (SELECT spillo_id, group_concat(voce_chiave, '|') AS voci FROM spillo_voce GROUP BY spillo_id) v ON v.spillo_id = s.id
      WHERE s.mappa_chiave IS NOT NULL`).all() as RigaPinG[];
  const infiltrazioniDellArea = infiltrazioniDelleAree();
  const conInfiltrazioni = [...palazzi, ...confluiti];
  const infiltrazioniDeiPalazzi = (conInfiltrazioni.length === 0 ? [] : prepared(`SELECT chiave, nome, ordine, dungeon_chiave FROM dungeon_area
      WHERE dungeon_chiave IN (${conInfiltrazioni.map(() => '?').join(',')}) ORDER BY ordine, chiave`).all(...conInfiltrazioni.map((p) => p.chiave))) as Array<InfiltrazioneDellArea & { dungeon_chiave: string }>;
  // il ramo dei Memento: dedali, aree dei dedali, conteggi per chiave e le mappe senza Area (una lettura ciascuno, nessuna query per nodo)
  const memento = (conAree() ? prepared("SELECT chiave, nome FROM dungeon WHERE tipo = 'mementos' ORDER BY ordine, chiave LIMIT 1").get() : undefined) as RigaPalazzoG | undefined;
  const dedali = (memento ? prepared('SELECT chiave, nome FROM dungeon_area WHERE dungeon_chiave = ? ORDER BY ordine, chiave').all(memento.chiave) : []) as RigaDedaloG[];
  const areeDedali = (memento ? prepared(`SELECT ad.chiave, ad.nome, ad.dedalo_chiave FROM area_dedalo ad JOIN dungeon_area a ON a.chiave = ad.dedalo_chiave
      WHERE a.dungeon_chiave = ? ORDER BY a.ordine, a.chiave, ad.ordine, ad.chiave`).all(memento.chiave) : []) as RigaAreaDedaloG[];
  const perChiave = (sql: string): Map<string, number> => new Map((prepared(sql).all() as RigaConteggioG[]).map((r) => [r.chiave, r.n]));
  const personeDelDedalo = perChiave("SELECT area_chiave AS chiave, COUNT(DISTINCT chiave) AS n FROM punto_interesse WHERE tipo = 'persona' GROUP BY area_chiave");
  const trameDelDedalo = perChiave("SELECT area_chiave AS chiave, COUNT(*) AS n FROM punto_interesse WHERE tipo = 'trama' GROUP BY area_chiave");
  const richiesteDelDedalo = perChiave('SELECT area_chiave AS chiave, COUNT(*) AS n FROM richiesta GROUP BY area_chiave');
  const personeDellArea = perChiave('SELECT area_dedalo_chiave AS chiave, COUNT(DISTINCT voce_chiave) AS n FROM persona_area_dedalo GROUP BY area_dedalo_chiave');
  const trameDellArea = perChiave("SELECT area_dedalo_chiave AS chiave, COUNT(*) AS n FROM punto_interesse WHERE tipo = 'trama' AND area_dedalo_chiave IS NOT NULL GROUP BY area_dedalo_chiave");
  const richiesteDellArea = perChiave('SELECT area_dedalo_chiave AS chiave, COUNT(*) AS n FROM richiesta WHERE area_dedalo_chiave IS NOT NULL GROUP BY area_dedalo_chiave');
  const fogli = (memento ? prepared(`SELECT chiave, nome, immagine_chiave, asset, ruolo_immagine, versione_etichetta, versione_ordine FROM mappa
      WHERE (genitore_chiave = 'dungeon-mementos' AND area_chiave IS NULL) OR chiave = 'citta-mementos' ORDER BY (chiave = 'citta-mementos') DESC, versione_ordine, chiave`).all() : []) as RigaFoglioG[];
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
  /** Il nodo di un Palazzo con le sue Aree e infiltrazioni; `nome` diverso per l'archivio di un Palazzo confluito in un dedalo, che non ha una mappa da collocare. */
  const nodoPalazzo = (d: RigaPalazzoG, nome: string = d.nome, collocabile = true): NodoGerarchiaDto => {
    const radice = radiceDelPalazzo(d.chiave);
    const figliArea = aree.filter((a) => a.dungeon_chiave === d.chiave).map((a) => nodoArea(a, null, null));
    const conInfiltrazione = new Set(figliArea.flatMap((a) => (a.accanto ?? []).map((i) => i.chiave)));
    const proprie = infiltrazioniDeiPalazzi.filter((i) => i.dungeon_chiave === d.chiave);
    const senzaArea = proprie.filter((i) => !conInfiltrazione.has(i.chiave)).map((i) => nodoInfiltrazione(i, d.chiave));
    const nodo: NodoGerarchiaDto = {
      tipo: 'palazzo', chiave: d.chiave, nome, casa: casaDelPalazzo(d.chiave),
      ...(collocabile && mappeEsistenti.has(radice) ? { mappa: chiaveMappa(radice) } : {}),
      ...miniaturaDelLuogo(d.chiave),
      conteggi: { ...conteggiContenitore(radice, figliArea), infiltrazioni: proprie.length },
      figli: figliArea,
    };
    if (senzaArea.length > 0) nodo.senzaArea = senzaArea;
    return nodo;
  };
  const nodiPalazzi: NodoGerarchiaDto[] = palazzi.map((d) => nodoPalazzo(d));

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

  // ---- Memento › dedali › aree del dedalo (L11 B6) ----
  // Un'area del dedalo non ha planimetrie: è una foglia, e la sua casa apre il dedalo con quella zona. Il dedalo confluito (Iweleth) porta in
  // più l'archivio del suo vecchio Palazzo. Le mappe senza Area (oggi l'entrata) sono foglie del Memento, col visore (l'unica pagina che le mostra).
  const nodoAreaDedalo = (a: RigaAreaDedaloG): NodoGerarchiaDto => ({
    tipo: 'area-dedalo', chiave: a.chiave, nome: a.nome, casa: casaDelDedalo(a.dedalo_chiave, a.chiave), ...miniaturaDelLuogo(a.chiave),
    conteggi: { persone: personeDellArea.get(a.chiave) ?? 0, trame: trameDellArea.get(a.chiave) ?? 0, richieste: richiesteDellArea.get(a.chiave) ?? 0, pin: vuoti() },
    figli: [],
  });
  const nodoDedalo = (d: RigaDedaloG): NodoGerarchiaDto => {
    const figliAree = areeDedali.filter((a) => a.dedalo_chiave === d.chiave).map(nodoAreaDedalo);
    const confluito = confluiti.find((c) => c.dedalo_chiave === d.chiave);
    const archivio = confluito ? nodoPalazzo(confluito, `Archivio del Palazzo di ${confluito.nome.replace(/^Dedalo di /, '')}`, false) : undefined;
    return {
      tipo: 'dedalo', chiave: d.chiave, nome: d.nome, casa: casaDelDedalo(d.chiave), ...miniaturaDelLuogo(d.chiave),
      conteggi: {
        aree: figliAree.length, persone: personeDelDedalo.get(d.chiave) ?? 0, trame: trameDelDedalo.get(d.chiave) ?? 0, richieste: richiesteDelDedalo.get(d.chiave) ?? 0,
        pin: { ...(archivio?.conteggi.pin ?? vuoti()) },
      },
      figli: archivio ? [...figliAree, archivio] : figliAree,
    };
  };
  // il nome della foglia: l'etichetta della versione se c'è, altrimenti il nome della mappa (nessuna regola sul nome: dal 2026-10-31,
  // O9-4, i fogli delle strutture fisse con il loro prefisso non ci sono più, migrazione 322)
  const nodoFoglio = (f: RigaFoglioG): NodoGerarchiaDto => ({
    tipo: 'planimetria', chiave: chiaveMappa(f.chiave), nome: f.versione_etichetta?.trim() || f.nome,
    casa: casaDellaMappa({ chiave: f.chiave, tipo: 'luogo', area_chiave: null }, ctx), immagine: illustrazioneDaRiga(f, caricate),
    conteggi: { pin: pinPropri(f.chiave) }, figli: [],
  });
  const nodoMemento: NodoGerarchiaDto | undefined = memento ? (() => {
    const figliDedali = dedali.map(nodoDedalo);
    const figliFogli = fogli.map(nodoFoglio);
    const pinMemento = pinPropri('dungeon-mementos');
    for (const f of [...figliDedali, ...figliFogli]) somma(pinMemento, f.conteggi.pin);
    return {
      tipo: 'memento', chiave: memento.chiave, nome: memento.nome, casa: casaDeiMemento(), immagine: null,
      conteggi: {
        dedali: figliDedali.length, aree: areeDedali.length, planimetrie: figliFogli.length, pin: pinMemento,
        persone: figliDedali.reduce((n, d) => n + (d.conteggi.persone ?? 0), 0), trame: figliDedali.reduce((n, d) => n + (d.conteggi.trame ?? 0), 0),
        richieste: figliDedali.reduce((n, d) => n + (d.conteggi.richieste ?? 0), 0),
      },
      figli: [...figliDedali, ...figliFogli],
    };
  })() : undefined;

  // ---- Da collocare: sempre presente, in fondo ----
  const nodoDaCollocare: NodoGerarchiaDto = {
    tipo: 'da-collocare', chiave: 'da-collocare', nome: 'Da collocare', casa: null, immagine: null,
    conteggi: { planimetrie: daCollocare.length, pin: vuoti() }, figli: [], daCollocare,
  };

  return {
    radici: [tokyo, ...(nodoMemento ? [nodoMemento] : []), nodoDaCollocare],
    totali: {
      ...(nodoMemento ? { dedali: nodoMemento.conteggi.dedali, areeDedali: nodoMemento.conteggi.aree } : {}),
      citta: 1, quartieri: nodiQuartieri.length, areeMondo: areeMondo.length, planimetrieMondo: conta(areeMondo),
      palazzi: nodiPalazzi.length, areePalazzi: areePalazzi.length, planimetriePalazzi: conta(areePalazzi),
      infiltrazioni: infiltrazioniTotali, daCollocare: daCollocare.length, pin: pinTokyo,
    },
  };
}
