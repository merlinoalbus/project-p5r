// ============================================================
// indiceRicerca — l'indice in memoria della ricerca globale: una voce per oggetto, con nome, nomi altri, percorso, casa e immagine (L11, B3)
// ============================================================
//
// Un costruttore per ogni tipo di `TIPI_RICERCA` (`COSTRUTTORI: Record<TipoRicerca, …>`): un tipo aggiunto senza il suo costruttore, quindi
// senza voci e senza casa, non compila (R11-09/1). L'indice dipende solo dai dati di gioco (mai dallo stato di una partita): si costruisce
// alla prima ricerca e resta in memoria fino a un'invalidazione (registro comune delle cache di gioco e middleware delle scritture).
//
// Si importano in sola lettura le regole di L1-L5 (case dei posti, risolutore delle immagini, nomi tradotti): nessuna è riscritta qui.
// Le cose nascoste dall'utente (`nascosto = 1`) non entrano, come nelle viste che le mostrano; i luoghi chiusi sì (R11-10b/1).
// ============================================================

import { getDb, type AppDatabase } from '../../db/dbService.js';
import { registraCacheDiGioco } from '../cacheDiGioco.js';
import { datiGuidaCorretti } from '../datiGuida.js';
import { t } from '../traduzioniService.js';
import { casaDelPalazzo, casaDellArea, contestoAree, type ContestoAree, type RigaArea } from '../mappe/casaMappa.js';
import { entitaDellaRadice } from '../mappe/alberoMappe.js';
import { caricataDellaMappa, illustrazioneDaRiga, urlCaricata, type RigaPerIllustrazione } from '../mappe/immagineMappa.js';
import { casaDelLuogo } from '../luoghiService.js';
import { nomiAltriOggetto } from '../catalogoOggettiLetture.js';
import { espandiAbbreviazione, chiaveSinonimo, sinonimiRicerca, type SinonimiRicerca } from './sinonimiRicerca.js';
import { casaOggetto } from '../../../shared/catalogo.js';
import { dataLeggibile } from '../../../shared/condizioniSpillo.js';
import { giornoDellaSettimana } from '../../../shared/date.js';
import { versioneImmagine } from '../../../shared/miniature.js';
import { slug } from '../../../shared/slug.js';
import { normalizzaTesto } from '../../../shared/testo.js';
import { PARAMETRO_ELEMENTO, type TipoRicerca } from '../../../shared/ricerca.js';
import type { IllustrazioneDto } from '../../../shared/types.js';

/** Una riga dell'indice: tutto ciò che serve a trovare un oggetto e a mostrarlo, calcolato una volta. */
export interface VoceIndice {
  tipo: TipoRicerca;
  chiave: string;
  nome: string;
  /** `normalizzaTesto(nome)`; mai vuoto (le righe senza lettere latine non entrano). */
  nomeN: string;
  /** Nomi originali e sinonimi, col testo da mostrare in «trovato come» e la forma normalizzata (senza doppioni del nome). */
  altri: ReadonlyArray<{ testo: string; n: string }>;
  percorso: readonly string[];
  casa: string;
  immagine: IllustrazioneDto | null;
  /** Per lo stato con la partita: i luoghi e i negozi si valutano con la regola unica di L5. */
  presenza: { tipo: 'luogo' | 'negozio'; chiave: string } | null;
  /** Il segno fisso, indipendente dalla partita (area «da verificare»). */
  segno: 'da-verificare' | null;
}

/** Ciò che un costruttore dichiara di un oggetto: `crea` lo trasforma in una voce (normalizza, toglie i doppioni, pretende la casa). */
interface Bozza {
  tipo: TipoRicerca;
  chiave: string;
  nome: string;
  altri?: ReadonlyArray<string | null | undefined>;
  percorso?: readonly string[];
  casa: string | null;
  immagine?: IllustrazioneDto | null;
  presenza?: VoceIndice['presenza'];
  segno?: VoceIndice['segno'];
}

/** Le righe di `mappa` che servono all'illustrazione e ai tipi derivati dalle planimetrie. */
interface RigaMappa extends RigaPerIllustrazione { nome: string; tipo: string; area_chiave: string | null; versione_etichetta: string | null }

/** I dati che più costruttori leggono: una lettura sola per costruzione dell'indice. */
export interface ContestoIndice {
  db: AppDatabase;
  /** `contestoAree(db)`: Aree, nomi dei quartieri e dei dungeon. */
  aree: ContestoAree;
  /** Immagini caricate dell'ambito «mappa» (chiave → data). */
  caricate: Map<string, string>;
  /** Le righe di `mappa` che servono all'illustrazione, per chiave. */
  mappe: Map<string, RigaMappa>;
  /** Dungeon → riga della sua mappa radice (lo stemma): l'immagine di Palazzo, infiltrazioni e dedali. */
  radiceDelDungeon: Map<string, RigaMappa>;
  /** Chiavi dell'ambito `confidenti` nella tabella `immagine` (per scegliere `-fedele`). */
  assetConfidenti: Set<string>;
  /** Chiavi dell'ambito `persona-gruppo` (le forme delle Persona del gruppo) e immagini caricate di `persona` (chiave → data). */
  assetPersonaGruppo: Set<string>;
  caricatePersona: Map<string, string>;
  /** Quartiere → chiave della mappa del quartiere: l'unico punto che legge `mappa.entita_*` per i quartieri (B9 lo aggiorna qui). */
  mappaDelQuartiere: Map<string, string>;
  /** Dungeon (Palazzi e Memento) per chiave. */
  dungeon: Map<string, { nome: string; tipo: string }>;
  /** `dungeon_area` (infiltrazioni dei Palazzi e dedali dei Memento) per chiave. */
  dungeonArea: Map<string, { dungeon: string; nome: string }>;
  /** I dungeon confluiti in un dedalo dei Memento (L8 B7, migrazione 175: oggi Iweleth): non sono Palazzi, e le loro infiltrazioni, Aree e planimetrie non si indicizzano (le mostra il dedalo). */
  confluiti: Set<string>;
  sinonimi: SinonimiRicerca;
}

type CostruttoreTipo = (ctx: ContestoIndice) => Bozza[];

const NOME_CITTA = 'Tokyo';
const NOME_MEMENTO_PERCORSO = 'Memento';

// ---- Piccoli aiuti condivisi dai costruttori ----

const q = <T>(ctx: ContestoIndice, sql: string): T[] => ctx.db.prepare(sql).all() as T[];

/** Il percorso di un contenitore di Aree: quartiere → ['Tokyo', quartiere]; città → ['Tokyo']; Palazzo → ['Tokyo'] (D9); Memento → ['Memento']. */
function percorsoDelContenitore(a: RigaArea, ctx: ContestoIndice): string[] {
  if (a.citta_chiave) return [NOME_CITTA];
  if (a.quartiere_chiave) return [NOME_CITTA, ctx.aree.nomiQuartieri.get(a.quartiere_chiave) ?? a.quartiere_chiave];
  return percorsoDelDungeon(a.dungeon_chiave ?? '', ctx);
}

/** Il posto di un Palazzo nella gerarchia (R11-11, «Città › Palazzi»): sotto Tokyo; il Memento non ha contenitore. */
function percorsoDelDungeon(dungeon: string, ctx: ContestoIndice): string[] {
  return ctx.dungeon.get(dungeon)?.tipo === 'mementos' ? [] : [NOME_CITTA];
}

/** Il posto di un'infiltrazione o di un dedalo, senza il nome stesso: ['Tokyo', Palazzo] oppure ['Memento']. */
function percorsoDellaAreaDungeon(dungeon: string, ctx: ContestoIndice): string[] {
  const d = ctx.dungeon.get(dungeon);
  return d?.tipo === 'mementos' ? [NOME_MEMENTO_PERCORSO] : [NOME_CITTA, d?.nome ?? dungeon];
}

/** L'illustrazione di una mappa con la regola unica di L1 (`illustrazioneDaRiga`, la parte pura di `illustrazioneDellaMappa`); null se non c'è nulla. */
function illustrazioneDi(chiaveDellaMappa: string | null | undefined, ctx: ContestoIndice): IllustrazioneDto | null {
  const r = chiaveDellaMappa ? ctx.mappe.get(chiaveDellaMappa) : undefined;
  if (!r) return null;
  const i = illustrazioneDaRiga(r, ctx.caricate);
  return i.immagineUrl || i.asset ? i : null;
}

/** L'immagine di un'Area: la sua planimetria predefinita. */
const illustrazioneDellArea = (a: RigaArea, ctx: ContestoIndice) => illustrazioneDi(a.planimetria_predefinita, ctx);

/** La casa di un'infiltrazione o di un dedalo: la scheda del dungeon con l'elemento aperto (`?infiltrazione=` nei Palazzi, `?area=` nei Memento). */
function casaDellaAreaDungeon(dungeon: string, areaChiave: string, ctx: ContestoIndice): string {
  const parametro = ctx.dungeon.get(dungeon)?.tipo === 'mementos' ? 'area' : 'infiltrazione';
  return `${casaDelPalazzo(dungeon)}?${parametro}=${encodeURIComponent(areaChiave)}`;
}

/** Il segmento d'asset di una chiave per la grafica predefinita. */
const assetDi = (ambito: string, chiave: string): IllustrazioneDto => ({ immagineUrl: null, asset: `${ambito}/${slug(chiave)}` });

/** Dove sta un luogo nella gerarchia: Tokyo, il quartiere, l'Area se ce l'ha. */
function percorsoDelLuogo(l: { quartiere_chiave: string; area_chiave: string | null }, ctx: ContestoIndice): string[] {
  const p = [NOME_CITTA, ctx.aree.nomiQuartieri.get(l.quartiere_chiave) ?? l.quartiere_chiave];
  const area = l.area_chiave ? ctx.aree.aree.get(l.area_chiave) : undefined;
  return area ? [...p, area.nome] : p;
}

/** Le righe di luogo che servono ai tipi derivati: non nascoste, per chiave. */
interface LuogoIndicizzato { chiave: string; nome: string; quartiere_chiave: string; area_chiave: string | null }
function luoghiVisibili(ctx: ContestoIndice): Map<string, LuogoIndicizzato> {
  return new Map(q<LuogoIndicizzato>(ctx, 'SELECT chiave, nome, quartiere_chiave, area_chiave FROM luogo WHERE nascosto = 0 ORDER BY ordine').map((l) => [l.chiave, l]));
}

/** L'immagine (di un luogo) è la planimetria predefinita della sua Area; i luoghi senza Area non ne hanno. */
function illustrazioneDelLuogo(l: LuogoIndicizzato, ctx: ContestoIndice): IllustrazioneDto | null {
  const area = l.area_chiave ? ctx.aree.aree.get(l.area_chiave) : undefined;
  return area ? illustrazioneDellArea(area, ctx) : null;
}

/** Un'immagine caricata dall'utente per un ambito (`/api/immagini/<ambito>/<chiave>/file?v=…`, lo stesso formato di `urlCaricata` delle mappe). */
function urlImmagineCaricata(ambito: string, chiave: string, createdAt: string): string {
  return `/api/immagini/${ambito}/${encodeURIComponent(chiave)}/file?v=${encodeURIComponent(versioneImmagine(createdAt))}`;
}

// ---- I costruttori, uno per tipo ----

/** Un costruttore di tipo del catalogo degli oggetti: categorie dentro o fuori dal gruppo, nascosto escluso, con le tabelle proprie dei libri e dei film. */
function oggettiDelCatalogo(categorie: readonly string[], dentro: boolean, tipo: TipoRicerca, ctx: ContestoIndice): Bozza[] {
  const elenco = categorie.map((c) => `'${c}'`).join(',');
  const righe = q<{ chiave: string; nome: string; nomi_altri_json: string; nome_originale: string | null; altro1: string | null }>(ctx,
    `SELECT c.chiave, c.nome, c.nomi_altri_json, c.nome_originale,
       ${tipo === 'libro' ? 'l.nome' : tipo === 'film' ? 'f.nome' : 'NULL'} AS altro1
     FROM catalogo_oggetto c
     ${tipo === 'libro' ? 'LEFT JOIN libro l ON l.catalogo_chiave = c.chiave' : tipo === 'film' ? 'LEFT JOIN film f ON f.catalogo_chiave = c.chiave' : ''}
     WHERE c.nascosto = 0 AND c.categoria ${dentro ? 'IN' : 'NOT IN'} (${elenco})
       ${tipo === 'libro' ? 'AND (l.chiave IS NULL OR l.nascosto = 0)' : tipo === 'film' ? 'AND (f.chiave IS NULL OR f.nascosto = 0)' : ''}
     ORDER BY c.nome COLLATE NOCASE, c.chiave`);
  return righe.map((r) => ({
    tipo, chiave: r.chiave, nome: r.nome, casa: casaOggetto(r.chiave),
    altri: [...nomiAltriOggetto(r.nomi_altri_json), r.nome_originale, r.altro1, espandiAbbreviazione(r.nome, ctx.sinonimi.abbreviazioni)],
  }));
}

const CATEGORIE_CON_PAGINA_PROPRIA = ['libro', 'film', 'videogioco'] as const;

/** Un costruttore per tipo: aggiungere un tipo a `TIPI_RICERCA` senza il suo costruttore non compila (R11-09/1). */
const COSTRUTTORI: Record<TipoRicerca, CostruttoreTipo> = {
  confidente: (ctx) => q<{ chiave: string; nome: string }>(ctx, 'SELECT chiave, nome FROM confidente ORDER BY ordine').map((c) => ({
    tipo: 'confidente', chiave: c.chiave, nome: c.nome, casa: `/confidenti/${encodeURIComponent(c.chiave)}`,
    altri: ctx.sinonimi.sinonimi.get(chiaveSinonimo('confidente', c.chiave)),
    immagine: { immagineUrl: null, asset: ctx.assetConfidenti.has(`${c.chiave}-fedele`) ? `confidenti/${c.chiave}-fedele` : `confidenti/${c.chiave}` },
  })),

  persona: (ctx) => q<{ id: number; nome: string; chiave_forma: string | null }>(ctx, 'SELECT id, nome, chiave_forma FROM persona ORDER BY id').map((p) => {
    const caricata = ctx.caricatePersona.get(p.nome);
    const gruppo = p.chiave_forma !== null && ctx.assetPersonaGruppo.has(slug(p.nome));
    return {
      tipo: 'persona', chiave: String(p.id), nome: t('persona', p.nome), casa: `/compendio/persona/${p.id}`,
      altri: [p.nome, ...(ctx.sinonimi.sinonimi.get(chiaveSinonimo('persona', p.nome)) ?? [])],
      immagine: caricata !== undefined ? { immagineUrl: urlImmagineCaricata('persona', p.nome, caricata), asset: null } : assetDi(gruppo ? 'persona-gruppo' : 'persona', p.nome),
    };
  }),

  skill: (ctx) => q<{ id: number; nome: string; elemento: string }>(ctx, 'SELECT id, nome, elemento FROM skill ORDER BY id').map((s) => ({
    tipo: 'skill', chiave: String(s.id), nome: t('skill', s.nome), casa: `/skill/${s.id}`,
    altri: [s.nome, ...(ctx.sinonimi.sinonimi.get(chiaveSinonimo('skill', s.nome)) ?? [])],
    immagine: s.elemento ? { immagineUrl: null, asset: `elementi/${s.elemento}` } : null,
  })),

  oggetto: (ctx) => oggettiDelCatalogo(CATEGORIE_CON_PAGINA_PROPRIA, false, 'oggetto', ctx),
  libro: (ctx) => oggettiDelCatalogo(['libro'], true, 'libro', ctx),
  film: (ctx) => oggettiDelCatalogo(['film'], true, 'film', ctx),
  videogioco: (ctx) => oggettiDelCatalogo(['videogioco'], true, 'videogioco', ctx),

  luogo: (ctx) => [...luoghiVisibili(ctx).values()].map((l) => ({
    tipo: 'luogo', chiave: l.chiave, nome: l.nome, casa: casaDelLuogo(l.chiave), percorso: percorsoDelLuogo(l, ctx),
    immagine: illustrazioneDelLuogo(l, ctx), presenza: { tipo: 'luogo', chiave: l.chiave },
  })),

  negozio: (ctx) => {
    const luoghi = luoghiVisibili(ctx);
    const out: Bozza[] = [];
    for (const n of q<{ chiave: string; nome: string; sede_chiave: string | null }>(ctx, 'SELECT chiave, nome, sede_chiave FROM negozio WHERE nascosto = 0 ORDER BY ordine')) {
      const sede = n.sede_chiave ? luoghi.get(n.sede_chiave) : undefined;
      // con una sede, la sede nascosta (o che non c'è più) nasconde anche il negozio: come nelle letture del catalogo
      if (n.sede_chiave && !sede) continue;
      out.push({
        tipo: 'negozio', chiave: n.chiave, nome: n.nome, casa: `/guida/negozi/${encodeURIComponent(n.chiave)}`,
        percorso: sede ? [...percorsoDelLuogo(sede, ctx), sede.nome] : [],
        immagine: sede ? illustrazioneDelLuogo(sede, ctx) : null,
        presenza: sede ? { tipo: 'negozio', chiave: n.chiave } : null,
      });
    }
    return out;
  },

  // i videogiochi sono già nel loro tipo (dal catalogo): le attività con lo stesso nome non si indicizzano due volte
  attivita: (ctx) => {
    const luoghi = luoghiVisibili(ctx);
    return q<{ chiave: string; nome: string; sede_chiave: string | null; luogo_chiave: string | null }>(ctx,
      "SELECT chiave, nome, sede_chiave, luogo_chiave FROM attivita WHERE nascosto = 0 AND tipo <> 'videogioco' ORDER BY ordine").map((a) => {
      const sede = a.sede_chiave ? luoghi.get(a.sede_chiave) : undefined;
      const quartiere = a.luogo_chiave ? ctx.aree.nomiQuartieri.get(a.luogo_chiave) : undefined;
      return {
        tipo: 'attivita', chiave: a.chiave, nome: a.nome, casa: `/guida/attivita?elemento=${encodeURIComponent(a.chiave)}`,
        percorso: sede ? [...percorsoDelLuogo(sede, ctx), sede.nome] : quartiere ? [NOME_CITTA, quartiere] : [],
        immagine: { immagineUrl: null, asset: `attivita/${a.chiave}` },
      };
    });
  },

  quartiere: (ctx) => q<{ chiave: string; nome: string }>(ctx, 'SELECT chiave, nome FROM quartiere ORDER BY ordine').map((r) => ({
    tipo: 'quartiere', chiave: r.chiave, nome: r.nome, casa: `/guida/citta/${encodeURIComponent(r.chiave)}`, percorso: [NOME_CITTA],
    immagine: illustrazioneDi(ctx.mappaDelQuartiere.get(r.chiave), ctx),
  })),

  citta: (ctx) => {
    const m = ctx.mappe.get('tokyo');
    return [{ tipo: 'citta', chiave: 'tokyo', nome: m?.nome ?? NOME_CITTA, casa: '/guida/citta', percorso: [], immagine: illustrazioneDi('tokyo', ctx) }];
  },

  area: (ctx) => [...ctx.aree.aree.values()].filter((a) => !(a.dungeon_chiave && ctx.confluiti.has(a.dungeon_chiave))).sort((a, b) => a.ordine - b.ordine).map((a) => ({
    tipo: 'area', chiave: a.chiave, nome: a.nome, casa: casaDellArea(a), percorso: percorsoDelContenitore(a, ctx),
    altri: ctx.sinonimi.sinonimi.get(chiaveSinonimo('area', a.chiave)), immagine: illustrazioneDellArea(a, ctx),
    segno: a.da_verificare === 1 ? 'da-verificare' : null,
  })),

  // le planimetrie con un'Area e non predefinite; le 8 senza Area si aprirebbero nel visore (la vista che R11-12 toglie): non sono indicizzate (D10)
  planimetria: (ctx) => {
    const out: Bozza[] = [];
    for (const m of ctx.mappe.values()) {
      const a = m.area_chiave ? ctx.aree.aree.get(m.area_chiave) : undefined;
      if (!a || a.planimetria_predefinita === m.chiave || (a.dungeon_chiave && ctx.confluiti.has(a.dungeon_chiave))) continue;
      const nome = m.versione_etichetta ? `${a.nome} — ${m.versione_etichetta}` : m.nome;
      out.push({
        tipo: 'planimetria', chiave: m.chiave, nome, altri: [m.nome], casa: casaDellArea(a, m.chiave),
        percorso: [...percorsoDelContenitore(a, ctx), a.nome], immagine: illustrazioneDi(m.chiave, ctx),
      });
    }
    return out;
  },

  palazzo: (ctx) => q<{ chiave: string; nome: string }>(ctx, 'SELECT chiave, nome FROM dungeon ORDER BY ordine').filter((d) => !ctx.confluiti.has(d.chiave)).map((d) => ({
    tipo: 'palazzo', chiave: d.chiave, nome: d.nome, casa: casaDelPalazzo(d.chiave), percorso: percorsoDelDungeon(d.chiave, ctx),
    altri: ctx.sinonimi.sinonimi.get(chiaveSinonimo('palazzo', d.chiave)), immagine: immagineDelDungeon(d.chiave, ctx),
  })),

  infiltrazione: (ctx) => [...ctx.dungeonArea.entries()].filter(([, a]) => ctx.dungeon.get(a.dungeon)?.tipo === 'palazzo' && !ctx.confluiti.has(a.dungeon)).map(([chiave, a]) => ({
    tipo: 'infiltrazione', chiave, nome: a.nome, casa: casaDellaAreaDungeon(a.dungeon, chiave, ctx),
    percorso: percorsoDellaAreaDungeon(a.dungeon, ctx), immagine: immagineDelDungeon(a.dungeon, ctx),
  })),

  dedalo: (ctx) => [...ctx.dungeonArea.entries()].filter(([, a]) => ctx.dungeon.get(a.dungeon)?.tipo === 'mementos').map(([chiave, a]) => ({
    tipo: 'dedalo', chiave, nome: a.nome, casa: casaDellaAreaDungeon(a.dungeon, chiave, ctx),
    percorso: percorsoDellaAreaDungeon(a.dungeon, ctx), immagine: immagineDelDungeon(a.dungeon, ctx),
  })),

  'area-dedalo': (ctx) => q<{ chiave: string; dedalo_chiave: string; nome: string }>(ctx, 'SELECT chiave, dedalo_chiave, nome FROM area_dedalo ORDER BY dedalo_chiave, ordine').flatMap((r) => {
    const dedalo = ctx.dungeonArea.get(r.dedalo_chiave);
    if (!dedalo) return [];
    return [{
      tipo: 'area-dedalo' as const, chiave: r.chiave, nome: r.nome, casa: casaDellaAreaDungeon(dedalo.dungeon, r.dedalo_chiave, ctx),
      percorso: [...percorsoDellaAreaDungeon(dedalo.dungeon, ctx), dedalo.nome], immagine: immagineDelDungeon(dedalo.dungeon, ctx),
    }];
  }),

  // una voce non ha pagina propria: la sua casa è l'infiltrazione (o il dedalo) a cui appartiene (960/960 puntano a una `dungeon_area`)
  voce: (ctx) => q<{ chiave: string; nome: string; area_chiave: string }>(ctx, 'SELECT chiave, nome, area_chiave FROM punto_interesse ORDER BY area_chiave, ordine').map((v) => {
    const a = ctx.dungeonArea.get(v.area_chiave);
    return {
      tipo: 'voce', chiave: v.chiave, nome: v.nome, casa: a ? casaDellaAreaDungeon(a.dungeon, v.area_chiave, ctx) : null,
      percorso: a ? [...percorsoDellaAreaDungeon(a.dungeon, ctx), a.nome] : [],
    };
  }),

  richiesta: (ctx) => q<{ chiave: string; nome: string; area_chiave: string | null }>(ctx, 'SELECT chiave, nome, area_chiave FROM richiesta ORDER BY ordine').map((r) => {
    const dedalo = r.area_chiave ? ctx.dungeonArea.get(r.area_chiave) : undefined;
    return {
      tipo: 'richiesta', chiave: r.chiave, nome: r.nome, casa: `/guida/richieste?elemento=${encodeURIComponent(r.chiave)}`,
      percorso: dedalo ? [...percorsoDellaAreaDungeon(dedalo.dungeon, ctx), dedalo.nome] : [],
    };
  }),

  giorno: (ctx) => q<{ data: string }>(ctx, 'SELECT data FROM giorno ORDER BY ordine').map((g) => {
    const nome = dataLeggibile(g.data);
    const settimana = giornoDellaSettimana(g.data);
    const [mese, giorno] = g.data.split('-');
    return {
      tipo: 'giorno', chiave: g.data, nome, casa: `/guida/percorso/${encodeURIComponent(g.data)}`,
      altri: [settimana ? `${settimana} ${nome}` : null, g.data, `${Number(giorno)}/${Number(mese)}`],
    };
  }),

  trofeo: (ctx) => q<{ chiave: string; nome: string; nome_en: string | null }>(ctx, 'SELECT chiave, nome, nome_en FROM trofeo ORDER BY ordine').map((r) => ({
    tipo: 'trofeo', chiave: r.chiave, nome: r.nome, altri: [r.nome_en], casa: `/guida/completamento?elemento=${encodeURIComponent(r.chiave)}`,
  })),

  // solo le dieci sfide con una chiave stabile (7 battaglie e 3 boss): i tratti, le sfide del Magnate e quelle del Covo non ne hanno una (D3)
  sfida: () => {
    const g = datiGuidaCorretti<{ battaglieSfida?: { elenco?: ReadonlyArray<{ chiave: string; nome: string; nomeIt?: string | null }> }; bossSegreti?: ReadonlyArray<{ chiave: string; nome: string }> }>('sfide');
    const battaglie: Bozza[] = (g?.battaglieSfida?.elenco ?? []).map((b) => ({
      tipo: 'sfida', chiave: b.chiave, nome: b.nome, altri: [b.nomeIt], casa: `/guida/sfide?scheda=battaglie&${PARAMETRO_ELEMENTO}=${encodeURIComponent(b.chiave)}`,
    }));
    const boss: Bozza[] = (g?.bossSegreti ?? []).map((b) => ({
      tipo: 'sfida', chiave: b.chiave, nome: b.nome, casa: `/guida/sfide?scheda=boss&${PARAMETRO_ELEMENTO}=${encodeURIComponent(b.chiave)}`,
      immagine: assetDi('personaggi', b.chiave),
    }));
    return [...battaglie, ...boss];
  },
};

/** L'immagine di un dungeon (lo stemma, più la caricata): quella delle sue infiltrazioni e dei suoi dedali. */
function immagineDelDungeon(dungeon: string, ctx: ContestoIndice): IllustrazioneDto | null {
  const radice = ctx.radiceDelDungeon.get(dungeon);
  if (!radice) return { immagineUrl: null, asset: `palazzi/${dungeon}` };
  const caricata = caricataDellaMappa(radice, ctx.caricate);
  return { immagineUrl: caricata ? urlCaricata(caricata) : null, asset: radice.asset ?? `palazzi/${dungeon}` };
}

// ---- La costruzione ----

/** Una bozza → una voce: nome normalizzato, nomi altri senza doppioni (del nome e fra loro), sinonimi in coda. Null se il nome non ha lettere latine. */
function crea(b: Bozza): VoceIndice | null {
  const nomeN = normalizzaTesto(b.nome);
  if (nomeN === '') return null;
  if (!b.casa) throw new Error(`Indice di ricerca: l'oggetto «${b.nome}» (${b.tipo}, ${b.chiave}) non ha una pagina a cui portare.`);
  const visti = new Set<string>([nomeN]);
  const altri: Array<{ testo: string; n: string }> = [];
  for (const a of b.altri ?? []) {
    const testo = a?.trim();
    const n = testo ? normalizzaTesto(testo) : '';
    if (!testo || n === '' || visti.has(n)) continue;
    visti.add(n);
    altri.push({ testo, n });
  }
  return {
    tipo: b.tipo, chiave: b.chiave, nome: b.nome, nomeN, altri, percorso: b.percorso ?? [], casa: b.casa,
    immagine: b.immagine ?? null, presenza: b.presenza ?? null, segno: b.segno ?? null,
  };
}

/** Legge dal database tutto ciò che più costruttori condividono, una volta. */
function contestoDi(db: AppDatabase): ContestoIndice {
  const mappe = new Map((db.prepare('SELECT chiave, nome, tipo, immagine_chiave, asset, ruolo_immagine, area_chiave, versione_etichetta FROM mappa ORDER BY ordine, chiave').all() as RigaMappa[]).map((m) => [m.chiave, m] as const));
  const mappaDelQuartiere = new Map<string, string>();
  const radiceDelDungeon = new Map<string, RigaMappa>();
  for (const m of mappe.values()) {
    const radice = entitaDellaRadice(m);
    if (radice?.tipo === 'quartiere') mappaDelQuartiere.set(radice.chiave, m.chiave);
    if (radice?.tipo === 'dungeon' && !radiceDelDungeon.has(radice.chiave)) radiceDelDungeon.set(radice.chiave, m);
  }
  const chiaviImmagini = (ambito: string) => new Set((db.prepare('SELECT chiave FROM immagine WHERE ambito = ?').all(ambito) as Array<{ chiave: string }>).map((r) => r.chiave));
  const sinonimi = sinonimiRicerca();
  return {
    db, aree: contestoAree(db),
    caricate: new Map((db.prepare("SELECT chiave, created_at FROM immagine WHERE ambito = 'mappa'").all() as Array<{ chiave: string; created_at: string }>).map((i) => [i.chiave, i.created_at])),
    mappe, mappaDelQuartiere, radiceDelDungeon,
    assetConfidenti: chiaviImmagini('confidenti'), assetPersonaGruppo: chiaviImmagini('persona-gruppo'),
    caricatePersona: new Map((db.prepare("SELECT chiave, created_at FROM immagine WHERE ambito = 'persona'").all() as Array<{ chiave: string; created_at: string }>).map((i) => [i.chiave, i.created_at])),
    dungeon: new Map((db.prepare('SELECT chiave, nome, tipo FROM dungeon').all() as Array<{ chiave: string; nome: string; tipo: string }>).map((d) => [d.chiave, { nome: d.nome, tipo: d.tipo }])),
    dungeonArea: new Map((db.prepare('SELECT chiave, dungeon_chiave, nome FROM dungeon_area ORDER BY dungeon_chiave, ordine').all() as Array<{ chiave: string; dungeon_chiave: string; nome: string }>).map((a) => [a.chiave, { dungeon: a.dungeon_chiave, nome: a.nome }])),
    confluiti: new Set(db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dedalo_confluenza'").get()
      ? (db.prepare('SELECT dungeon_chiave FROM dedalo_confluenza').all() as Array<{ dungeon_chiave: string }>).map((r) => r.dungeon_chiave) : []),
    sinonimi,
  };
}

/** Costruisce l'indice leggendo il database (di default quello dell'app, o una copia già aperta per i controlli di sola lettura). */
export function costruisciIndice(db: AppDatabase = getDb()): VoceIndice[] {
  const ctx = contestoDi(db);
  return (Object.values(COSTRUTTORI) as CostruttoreTipo[]).flatMap((costruisci) => costruisci(ctx).flatMap((b) => crea(b) ?? []));
}

/** Le chiavi dei sinonimi del blocco che non trovano l'oggetto (nell'indice o nel database): righe «in attesa», per la procedura di controllo. */
export function sinonimiInAttesa(indice: readonly VoceIndice[], sinonimi: SinonimiRicerca = sinonimiRicerca()): string[] {
  const presenti = new Set(indice.map((v) => chiaveSinonimo(v.tipo, v.chiave)));
  // per Persona e Skill la chiave del blocco è il nome originale, non l'id dell'indice: si cerca fra i nomi altri
  const originali = new Set(indice.filter((v) => v.tipo === 'persona' || v.tipo === 'skill').flatMap((v) => v.altri.map((a) => chiaveSinonimo(v.tipo, a.testo))));
  return [...sinonimi.sinonimi.keys()].filter((k) => !presenti.has(k) && !originali.has(k));
}

let memoria: VoceIndice[] | null = null;

/** L'indice in memoria, costruito alla prima richiesta e tenuto fino all'invalidazione. */
export function indiceRicerca(): readonly VoceIndice[] {
  return memoria ??= costruisciIndice();
}

/** Svuota l'indice: lo chiamano `invalidaCacheDiGioco` (registro comune) e il middleware delle scritture. */
export const invalidaIndiceRicerca = registraCacheDiGioco(() => { memoria = null; });
