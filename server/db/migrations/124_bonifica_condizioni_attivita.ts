import type { Migration } from '../migrationRunner.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';

type Riga = Record<string, unknown>;
type Tabella = 'negozio' | 'articolo' | 'attivita';
interface Rettifica {
  tabella: Tabella;
  chiave: string;
  campo: 'condizioni_json' | 'sblocco_json';
  identita: Riga;
  prima: unknown[];
  dopo: RequisitoSpillo[];
  dipendenza?: 'tanaka' | 'nagiuri' | 'videogioco' | 'sede-attivita';
  titolo?: string;
}
const data = (dal: string): RequisitoSpillo => ({ tipo: 'data', dal });
const lettura = (chiave: string): RequisitoSpillo => ({ tipo: 'lettura', categoria: 'libro', chiave });
const evento = (chiave: string): RequisitoSpillo => ({ tipo: 'evento', evento: chiave });
const articolo = (chiave: string): RequisitoSpillo => ({ tipo: 'articolo', articolo: chiave });
const confidente = (chiave: string, rango: number): RequisitoSpillo => ({ tipo: 'confidente', confidente: chiave, rango });
const tutte = (condizioni: RequisitoSpillo[]): RequisitoSpillo => ({ tipo: 'gruppo', modo: 'tutte', condizioni });
const primaTanaka = [data('10-01'), articolo('yumenoshima/laptop-rotto'), articolo('akiba/set-di-strumenti-da-pc')];
const sbloccoTanaka = [evento('laptop-riparato')];
const primaNagiuri = [data('09-01'), lettura('pagine-ammuffite')];
const sbloccoNagiuri: RequisitoSpillo[] = [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [confidente('hifumi', 4), lettura('pagine-ammuffite')] }];
const libriPrecedenti = ['spadaccino-provetto', 'chiamami-capo', 'casanova-spregiudicato', 'rivelazioni-eroiche', 'come-fare-karakuri'];
const TITOLI = [
  { slug: 'star-forneus', negozio: 'yumenoshima', dal: '06-05', frase: 'Incluso nel Set per retrogaming (Negozio usati Yumenoshima, Yongen-Jaya, dal 5 giugno)' },
  { slug: 'gambla-goemon', negozio: 'yumenoshima', dal: '07-26', frase: 'Dal 26 luglio' },
  ...['punch-ouch', 'train-of-life', 'power-intuition', 'golfer-sarutahiko', 'featherman-seeker']
    .map((slug) => ({ slug, negozio: 'super-baron', dal: '09-01', frase: 'Dal 1 settembre' })),
];
const OFFERTE_TANAKA = [
  { rango: null, slugs: ['black-stone', 'condenser-lens', 'five-inch-nail', 'gemme-elementali', 'inspired-hand-mirror', 'nirvana-ring'] },
  { rango: 'nero', slugs: ['black-robe', 'hercules-anklet', 'heros-eyepatch'] },
  { rango: 'oscuro', slugs: ['atom-match', 'black-kogatana', 'holy-cloth', 'magic-rosary', 'ouija-board', 'retribution-mirror'] },
  { rango: 'caos', slugs: ['crown-of-salvation', 'dispel-ring', 'homunculus', 'model-gun', 'roland-medal'] },
] as const;
const orariStandard = { giorni: [], fasce: [], chiusoConPioggia: false, nota: null };
const copieSede: Array<{ chiave: string; tipo: string; sede: string; quartiere: string; frase: string;
  prima: RequisitoSpillo[]; sbloccoSede: RequisitoSpillo[]; sbloccoQuartiere: RequisitoSpillo[]; orari: unknown }> = [
  { chiave: 'pesca-ichigaya', tipo: 'mini-gioco', sede: 'ichigaya/laghetto-ichigaya', quartiere: 'ichigaya',
    frase: "6 luglio (evento con Ryuji), oppure leggendo il libro 'Vedetta lacustre'",
    prima: [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [data('07-06'), lettura('vedetta-lacustre')] }],
    sbloccoSede: [lettura('vedetta-lacustre')], sbloccoQuartiere: [lettura('vedetta-lacustre')], orari: orariStandard },
  { chiave: 'allenamento-palestra-protein-lovers', tipo: 'allenamento', sede: 'shibuya/protein-lovers', quartiere: 'shibuya',
    frase: 'Rango 5 di Ryuji oppure Rango 8 di Ann',
    prima: [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [confidente('ryuji', 5), confidente('ann', 8)] }],
    sbloccoSede: [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [confidente('ryuji', 5), confidente('ann', 8)] }],
    sbloccoQuartiere: [{ tipo: 'da-subito' }], orari: null },
  { chiave: 'jazz-club-kichijoji', tipo: 'altro', sede: 'kichijoji/jazz-jin', quartiere: 'kichijoji',
    frase: 'Rango Confidente 4 con Akechi; disponibile dal 26 giugno', prima: [confidente('akechi', 4), data('06-26')],
    sbloccoSede: [confidente('akechi', 4)],
    sbloccoQuartiere: [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [data('06-05'), { tipo: 'luogo', luogo: 'kichijoji/jazz-jin' }] }],
    orari: { ...orariStandard, fasce: ['sera'] } },
];

/** Manifest pubblico: formule intere, non rimozione ricorsiva di foglie né riconoscimento per nome. */
const RETTIFICHE: Rettifica[] = [
  // Il negozio precede le offerte: queste perdono le copie solo dopo aver installato la fonte unica.
  { tabella: 'negozio', chiave: 'tanaka-affari-loschi', campo: 'sblocco_json',
    identita: { tipo: 'online', sede_chiave: null, luogo_chiave: null }, prima: [null, []], dopo: sbloccoTanaka },
  { tabella: 'attivita', chiave: 'studio-biblioteca-scuola', campo: 'condizioni_json',
    identita: { tipo: 'studio', sede_chiave: 'shujin-academy/biblioteca-shujin',
      sblocco: 'Disponibile fino al 20 maggio secondo allgamestaff.it (poi sostituito da altre attivita in biblioteca)' },
    prima: [[{ tipo: 'intervallo', dal: '04-09', al: '05-20' }]], dopo: [data('04-09')] },
  { tabella: 'attivita', chiave: 'sala-giochi-gun-about-akihabara', campo: 'condizioni_json',
    identita: { tipo: 'mini-gioco', sede_chiave: 'akihabara/sala-giochi-akihabara',
      sblocco: "Legato al Confidente della Torre (Shinya Oda); avviabile dal 4 settembre tramite la richiesta Mementos 'I baro non vincono mai'" },
    prima: [[confidente('shinya', 1), data('09-04'), { tipo: 'richiesta', richiesta: 'i-vincenti-non-imbrogliano' }]],
    dopo: [confidente('shinya', 1), data('09-04')] },
  ...TITOLI.map((t): Rettifica => ({
    tabella: 'attivita', chiave: `videogioco-${t.slug}`, campo: 'condizioni_json', dipendenza: 'videogioco', titolo: t.slug,
    identita: { tipo: 'videogioco', sede_chiave: 'yongen-jaya/leblanc', catalogo_chiave: `videogioco/${t.slug}`, sblocco: t.frase },
    prima: [[data(t.dal)]],
    dopo: [data(t.dal), evento('mansarda-pulita'), articolo('yumenoshima/famidrive'), evento('sistema-videogiochi-installato'),
      ...(t.slug === 'star-forneus' ? [] : [articolo(`${t.negozio}/${t.slug}`)])],
  })),
  ...OFFERTE_TANAKA.flatMap((g) => g.slugs.map((slug): Rettifica => {
    const rango: RequisitoSpillo[] = g.rango ? [{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: g.rango }] : [];
    return { tabella: 'articolo', chiave: `tanaka-affari-loschi/${slug}`, campo: 'condizioni_json', dipendenza: 'tanaka',
      identita: { negozio_chiave: 'tanaka-affari-loschi' }, prima: [[...primaTanaka, ...rango]], dopo: rango };
  })),
  ...[...libriPrecedenti, 'comprendere-il-cuore'].map((slug): Rettifica => {
    const progressione = slug === 'spadaccino-provetto' ? [] : slug === 'comprendere-il-cuore'
      ? [tutte(libriPrecedenti.map(lettura))] : [lettura('spadaccino-provetto')];
    return { tabella: 'articolo', chiave: `libreria-nagiuri/${slug}`, campo: 'condizioni_json', dipendenza: 'nagiuri',
      identita: { negozio_chiave: 'libreria-nagiuri', catalogo_chiave: `libro/${slug}` },
      // La 123 deve precedere questa bonifica: non si incorpora qui la sua correzione dell'autocondizione.
      prima: [[...primaNagiuri, ...progressione]], dopo: progressione };
  }),
  { tabella: 'articolo', chiave: 'hinokuniya/segreti-di-gioco', campo: 'condizioni_json',
    identita: { negozio_chiave: 'hinokuniya', catalogo_chiave: 'libro/segreti-di-gioco', condizione: 'dopo il completamento di un videogioco' },
    prima: [[{ tipo: 'quartiere', quartiere: 'shinjuku' }, { tipo: 'contatore', cosa: 'videogiochi-completati', almeno: 1 }]],
    dopo: [{ tipo: 'quartiere', quartiere: 'shinjuku' }, { tipo: 'contatore', cosa: 'videogiochi-giocati', almeno: 1 }] },
  ...copieSede.map((c): Rettifica => ({ tabella: 'attivita', chiave: c.chiave, campo: 'condizioni_json', dipendenza: 'sede-attivita',
    identita: { tipo: c.tipo, sede_chiave: c.sede, sblocco: c.frase }, prima: [c.prima], dopo: [] })),
];

/** Contratto delle fotografie parziali salvate da catalogoService: nessun JSON generico è una fotografia seed. */
const CAMPI_SNAPSHOT: Record<Tabella, ReadonlySet<string>> = {
  negozio: new Set(['nome', 'luogo', 'luogo_chiave', 'sede_chiave', 'tipo', 'gestore', 'confidente_chiave', 'orari_json',
    'eccezione_orari_json', 'sblocco_json', 'programma_punti_json', 'note']),
  articolo: new Set(['condizioni_json', 'negozio_chiave', 'nome', 'nome_it', 'categoria', 'per', 'prezzo', 'quantita', 'oggetto_fonte',
    'oggetto_chiave', 'catalogo_chiave', 'costo_json', 'effetto_json', 'effetto', 'statistiche', 'nota', 'verificato']),
  attivita: new Set(['condizioni_json', 'nome', 'tipo', 'luogo', 'luogo_chiave', 'sede_chiave', 'fascia', 'costo', 'sblocco', 'sessioni',
    'doti_json', 'altri_effetti', 'regole', 'premi', 'paga', 'paga_yen', 'paga_massima', 'dettagli', 'effetti_json', 'tracciamento', 'quiz_json', 'verificato']),
};
function oggetto(x: unknown): Riga | null { return x && typeof x === 'object' && !Array.isArray(x) ? x as Riga : null; }
function leggi(x: unknown): unknown {
  if (x === null) return null;
  if (typeof x !== 'string') return undefined;
  try { return JSON.parse(x) as unknown; } catch { return undefined; }
}
function canonico(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canonico);
  if (!x || typeof x !== 'object') return x;
  return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, canonico(v)]));
}
const uguale = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
const vuoto = (x: unknown) => x === null || uguale(x, []);
const corrisponde = (r: Riga, identita: Riga) => Object.entries(identita).every(([k, v]) => k in r && uguale(r[k], v));

export const migration124: Migration = {
  id: 124,
  name: 'bonifica_condizioni_attivita',
  up(db) {
    const convertite: string[] = [];
    const giaCorrette: string[] = [];
    const escluse: Array<{ origine: string; motivo: string }> = [];
    const perChiave = new Map(RETTIFICHE.map((c) => [`${c.tabella}:${c.chiave}`, c]));
    const escludi = (origine: string, motivo: string) => { escluse.push({ origine, motivo }); };
    const riga = (tabella: Tabella | 'luogo', chiave: string) => db.prepare(`SELECT * FROM main.${tabella} WHERE chiave = ?`).get(chiave) as Riga | undefined;
    const dipendenza = (c: Rettifica): string | null => {
      if (c.dipendenza === 'sede-attivita') {
        const copia = copieSede.find((x) => x.chiave === c.chiave);
        if (!copia) return 'copia della sede non censita: condizioni preservate';
        const sede = riga('luogo', copia.sede);
        const quartiere = db.prepare('SELECT condizioni_json FROM main.quartiere WHERE chiave = ?').get(copia.quartiere) as Riga | undefined;
        if (sede?.origine !== 'seed' || sede.quartiere_chiave !== copia.quartiere
          || !uguale(leggi(sede.condizioni_json), copia.sbloccoSede) || !uguale(leggi(sede.orari_json), copia.orari)
          || !quartiere || !uguale(leggi(quartiere.condizioni_json), copia.sbloccoQuartiere)) {
          return 'sede, quartiere o orari diversi dal manifest: copia preservata';
        }
        if (c.chiave === 'pesca-ichigaya') {
          const invito = db.prepare('SELECT * FROM main.confidente_invito WHERE chiave = ?').get('ryuji/07-03') as Riga | undefined;
          if (invito?.origine !== 'seed' || invito.confidente_chiave !== 'ryuji' || invito.data !== '07-03'
            || invito.apre_tipo !== 'luogo' || invito.apre_chiave !== copia.sede
            || !uguale(leggi(invito.condizioni_json), [{ tipo: 'palazzo', dungeon: 'kaneshiro' }, confidente('kawakami', 1)])) {
            return 'invito che apre il laghetto non attestato: copia preservata';
          }
        }
        return null;
      }
      if (c.dipendenza === 'tanaka') {
        const n = riga('negozio', 'tanaka-affari-loschi');
        return n?.origine === 'seed' && n.tipo === 'online' && n.sede_chiave === null && n.luogo_chiave === null
          && uguale(leggi(n.sblocco_json), sbloccoTanaka) ? null : 'sblocco proprio di Tanaka non installato sulla fonte seed: copia preservata';
      }
      if (c.dipendenza === 'nagiuri') {
        const n = riga('negozio', 'libreria-nagiuri');
        const l = riga('luogo', 'kanda-jinbocho/nagiuri');
        return n?.origine === 'seed' && n.sede_chiave === 'kanda-jinbocho/nagiuri' && vuoto(leggi(n.sblocco_json))
          && l?.origine === 'seed' && l.quartiere_chiave === 'kanda-jinbocho' && uguale(leggi(l.condizioni_json), sbloccoNagiuri)
          ? null : 'sede o sblocco di Nagiuri diversi: copia preservata';
      }
      if (c.dipendenza === 'videogioco') {
        const t = TITOLI.find((titolo) => titolo.slug === c.titolo);
        const sistema = riga('articolo', 'yumenoshima/famidrive');
        const offerta = t ? riga('articolo', `${t.negozio}/${t.slug}`) : undefined;
        return sistema?.origine === 'seed' && sistema.negozio_chiave === 'yumenoshima' && sistema.catalogo_chiave === 'altro/famidrive'
          && offerta?.origine === 'seed' && offerta.negozio_chiave === t?.negozio && offerta.catalogo_chiave === `videogioco/${c.titolo}`
          && (c.titolo !== 'star-forneus' || offerta.prezzo === 0)
          ? null : 'identità della console o del titolo non attestata: condizioni preservate';
      }
      return null;
    };
    const rettifica = (r: Riga, c: Rettifica, origine: string): Riga => {
      if (r.chiave !== c.chiave || r.origine !== 'seed' || !corrisponde(r, c.identita)) {
        escludi(origine, 'identità, origine o collegamenti diversi: dati preservati'); return r;
      }
      const prima = leggi(r[c.campo]);
      if (uguale(prima, c.dopo)) { giaCorrette.push(origine); return r; }
      if (!c.prima.some((forma) => uguale(prima, forma))) {
        escludi(origine, 'formula intera diversa o illeggibile: dati preservati'); return r;
      }
      const motivo = dipendenza(c);
      if (motivo) { escludi(origine, motivo); return r; }
      convertite.push(origine);
      return { ...r, [c.campo]: JSON.stringify(c.dopo) };
    };
    const conSeed = (r: Riga, c: Rettifica, origine: string): Riga => {
      let dopo = rettifica(r, c, origine);
      if (typeof r.seed_json !== 'string') return dopo;
      const seed = oggetto(leggi(r.seed_json));
      if (!seed) { escludi(`${origine}/seed`, 'fotografia illeggibile: preservata'); return dopo; }
      let nuovoSeed = seed;
      if ('chiave' in seed || 'origine' in seed) {
        // Una fotografia completa deve recare entrambe le prove: niente integrazione permissiva di metadati mancanti.
        if (seed.chiave !== c.chiave || seed.origine !== 'seed') {
          escludi(`${origine}/seed`, 'identità o provenienza della fotografia non attestate'); return dopo;
        }
        nuovoSeed = rettifica(seed, c, `${origine}/seed`);
      } else {
        // La chiave del contenitore è pubblica e stabile; i campi fotografati prevalgono sulla riga eventualmente corretta.
        // Si modifica soltanto un campo già fotografato: gli snapshot anteriori alla colonna non vengono ampliati.
        if (r.chiave !== c.chiave || (r.origine !== 'seed' && r.origine !== 'utente') || !(c.campo in seed)
          || !Object.keys(seed).every((k) => CAMPI_SNAPSHOT[c.tabella].has(k))) {
          escludi(`${origine}/seed`, 'contratto della fotografia parziale non attestato'); return dopo;
        }
        const completa = { ...r, ...seed, origine: 'seed' };
        const convertita = rettifica(completa, c, `${origine}/seed`);
        if (convertita !== completa) nuovoSeed = { ...seed, [c.campo]: convertita[c.campo] };
      }
      if (nuovoSeed !== seed) dopo = { ...dopo, seed_json: JSON.stringify(nuovoSeed) };
      return dopo;
    };
    for (const c of RETTIFICHE) {
      const r = riga(c.tabella, c.chiave);
      if (!r) { escludi(`${c.tabella}:${c.chiave}`, 'riga assente: non ricreata'); continue; }
      const dopo = conSeed(r, c, `${c.tabella}:${c.chiave}`);
      if (dopo !== r) db.prepare(`UPDATE main.${c.tabella} SET ${c.campo} = ?, seed_json = ? WHERE chiave = ? AND ${c.campo} IS ? AND seed_json IS ?`)
        .run(dopo[c.campo], dopo.seed_json ?? null, c.chiave, r[c.campo], r.seed_json ?? null);
    }
    // Solo immagini delle tre tabelle operative nel registro del cestino di gioco. Nessun audit o dato delle partite.
    const haRegistro = (db.prepare('PRAGMA main.table_info(cestino)').all() as Array<{ name: string }>).some((c) => c.name === 'registro_json');
    if (haRegistro) for (const r of db.prepare('SELECT id, registro_json FROM main.cestino').all() as Array<{ id: number; registro_json: string }>) {
      const passi = leggi(r.registro_json);
      if (!Array.isArray(passi)) { escludi(`cestino:${r.id}`, 'registro illeggibile: preservato'); continue; }
      let cambiato = false;
      for (const [i, valore] of passi.entries()) {
        const passo = oggetto(valore);
        if (!passo || typeof passo.tabella !== 'string' || !['negozio', 'articolo', 'attivita'].includes(passo.tabella)) continue;
        for (const campo of ['prima', 'dopo'] as const) {
          const immagine = oggetto(passo[campo]);
          const c = immagine && typeof immagine.chiave === 'string' ? perChiave.get(`${passo.tabella}:${immagine.chiave}`) : undefined;
          if (!immagine || !c) continue;
          const dopo = conSeed(immagine, c, `cestino:${r.id}/passo:${i}/${campo}`);
          if (dopo !== immagine) { passo[campo] = dopo; cambiato = true; }
        }
      }
      if (cambiato) db.prepare('UPDATE main.cestino SET registro_json = ? WHERE id = ? AND registro_json = ?')
        .run(JSON.stringify(passi), r.id, r.registro_json);
    }
    db.prepare('INSERT INTO main.dati_guida(chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO NOTHING')
      .run('bonifica-condizioni-attivita-124', JSON.stringify({ convertite, giaCorrette, escluse }));
  },
};
