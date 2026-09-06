// ============================================================
// I Palazzi: dove si entra, quando ci sono, e cosa resta leggibile
// ============================================================
//
// Tre cose che erano state affermate senza prova, e che qui diventano un test.
//
// **La prima**: che gli ingressi nascano dall'avvio normale. Per un pezzo esistevano soltanto
// dopo aver chiamato a mano `collegaPalazziAiLuoghi`, e il solo percorso che li creava era il
// reset distruttivo — che su una partita vera non si esegue. Qui il database e' nuovo e riceve
// `runMigrations` + `caricaSeed` e nient'altro: se i dieci ingressi non ci sono, il percorso
// ordinario non li fa.
//
// **La seconda**: che la finestra valga *tutto l'anno*, non nei tre giorni che si sceglierebbero
// per dimostrarla. Il controllo passa su ognuna delle date del calendario di gioco e pretende che
// il verdetto sia bloccato esattamente fuori dalla finestra: nessun giorno di scarto, in nessuno
// dei due versi.
//
// **La terza** e' una scelta, e va detta perche' e' il contrario di quel che si potrebbe
// pretendere: il Palazzo *sparisce dalla mappa* fuori dalla sua finestra, ma la sua **scheda
// resta leggibile ogni giorno**. Questa e' una guida, non il gioco: il pin va tolto perche'
// mandare qualcuno a cercare un Palazzo che non c'e' e' il danno peggiore, mentre impedire di
// *leggere* in aprile come si affronta il Palazzo di Shido non protegge nessuno — toglie soltanto
// la ragione per cui si consulta una guida. E' per questo che la presenza vive sugli spilli e non
// sulle mappe, e che la colonna `mappa.condizioni_json` e' stata tolta invece che riempita: qui
// sotto c'e' la prova che la scelta e' applicata, cosi' che se un giorno qualcuno la ribalta lo
// faccia apposta e non per distrazione.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { closeDb, initDb, getDb } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { migrations } from '../../db/migrations/index.js';
import { caricaSeed } from '../seed/caricaSeed.js';
import { ordineGioco, valutaRequisitiSpillo } from '../disponibilitaService.js';
import { dettaglioMappa } from './mappeService.js';

const DIR_SEED = path.join('data', 'seed');

interface Finestra {
  dungeon: string;
  dal: string | null;
  al: string | null;
  luogo?: { mappa?: string | null };
}

const finestre: Finestra[] = (JSON.parse(
  fs.readFileSync(path.join(DIR_SEED, 'finestre-dungeon.json'), 'utf8'),
) as { finestre: Finestra[] }).finestre;

const GIORNI_DEL_MESE: Record<number, number> = {
  4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31, 1: 31, 2: 28, 3: 31,
};

/** Ogni giorno del calendario di gioco, da aprile a marzo. */
function tutteLeDate(): string[] {
  const date: string[] = [];
  for (const mese of [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]) {
    for (let g = 1; g <= GIORNI_DEL_MESE[mese]; g += 1) {
      date.push(`${String(mese).padStart(2, '0')}-${String(g).padStart(2, '0')}`);
    }
  }
  return date;
}

const DATE = tutteLeDate();

function statoAl(data: string) {
  return {
    dataGioco: data, fasciaGioco: 'giorno', giornoSettimana: 'lunedi',
    sbloccoQuartieri: new Map(), articoliOttenuti: new Set<string>(), letture: new Set<string>(),
    // `data` — le finestre senza scadenza, Iweleth e Mementos — passa dal valutatore dei
    // semafori, che legge le conferme manuali: senza questo insieme il controllo esplode invece
    // di dare un verdetto, e il difetto sarebbe del test, non del codice.
    conferme: new Set<string>(),
  } as unknown as Parameters<typeof valutaRequisitiSpillo>[1];
}

interface Ingresso { mappa_chiave: string; riferimento_chiave: string; condizioni_json: string | null }

function ingressi(): Ingresso[] {
  return getDb().prepare(`SELECT mappa_chiave, riferimento_chiave, condizioni_json FROM spillo
    WHERE riferimento_tipo = 'mappa' AND riferimento_chiave LIKE 'dungeon-%'`).all() as Ingresso[];
}

describe('le finestre dei Palazzi, dal percorso di avvio ordinario', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    // Nient'altro: niente `sincronizzaMappe` a mano, niente `collegaPalazziAiLuoghi`, niente
    // reset. Questo e' esattamente cio' che fa `server/index.ts` all'avvio.
    caricaSeed(db, DIR_SEED);
  });
  afterAll(() => closeDb());

  it('l’avvio ordinario crea un ingresso per ciascuno dei Palazzi dichiarati', () => {
    const trovati = ingressi();
    expect(trovati).toHaveLength(finestre.length);
    expect(new Set(trovati.map((i) => i.riferimento_chiave)))
      .toEqual(new Set(finestre.map((f) => `dungeon-${f.dungeon}`)));
  });

  it('ogni ingresso sta sulla mappa del luogo dichiarato', () => {
    const dove = new Map(ingressi().map((i) => [i.riferimento_chiave, i.mappa_chiave]));
    for (const f of finestre) {
      expect(dove.get(`dungeon-${f.dungeon}`)).toBe(f.luogo?.mappa);
    }
  });

  it('la finestra vale su tutte le date dell’anno di gioco, senza un giorno di scarto', () => {
    const condizioni = new Map(ingressi().map((i) => [
      i.riferimento_chiave, JSON.parse(i.condizioni_json ?? '[]') as Array<Record<string, unknown>>]));
    for (const f of finestre) {
      const elenco = condizioni.get(`dungeon-${f.dungeon}`) ?? [];
      const requisiti = elenco.map((c) => ({ ...c, testo: '' })) as unknown as
        Parameters<typeof valutaRequisitiSpillo>[0];
      const sbagliate: string[] = [];
      for (const data of DATE) {
        const dentro = f.dal
          ? ordineGioco(data) >= ordineGioco(f.dal)
            && (!f.al || ordineGioco(data) <= ordineGioco(f.al))
          : true;
        const bloccato = valutaRequisitiSpillo(requisiti, statoAl(data)).stato === 'bloccato';
        if (bloccato === dentro) sbagliate.push(data);
      }
      expect({ dungeon: f.dungeon, sbagliate }).toEqual({ dungeon: f.dungeon, sbagliate: [] });
    }
  });

  it('la scheda di ogni Palazzo resta leggibile anche fuori dalla sua finestra', () => {
    // Shido esiste dal 24 novembre: l'11 aprile il suo pin non si vede, ma la pagina si apre.
    // E' la differenza fra una guida e il gioco, ed e' voluta. La chiave pubblica non e' quella
    // interna — `dungeon-shido` diventa `palazzo-di-shido` — e la scheda si raggiunge da
    // entrambe: e' il resolver a farlo, e serve che continui a farlo.
    for (const f of finestre) {
      const scheda = dettaglioMappa(`dungeon-${f.dungeon}`);
      expect(scheda.nome, `scheda di ${f.dungeon}`).toBeTruthy();
      expect(dettaglioMappa(scheda.chiave).chiave).toBe(scheda.chiave);
    }
  });

  it('la presenza vive sugli spilli: `mappa` non ha una colonna di condizioni', () => {
    const colonne = (getDb().prepare("SELECT name FROM pragma_table_info('mappa')")
      .all() as Array<{ name: string }>).map((c) => c.name);
    expect(colonne).not.toContain('condizioni_json');
  });

  it('il registro delle migrazioni e’ applicato per intero, senza buchi in coda', () => {
    // La 047 era scritta ma non registrata: su un database esistente non sarebbe mai partita, e
    // il test verde non se ne accorgeva. Qui l'ultima registrata e la `user_version` devono
    // coincidere, e gli id devono essere una sequenza senza salti.
    const ids = migrations.map((m) => m.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: ids.length }, (_, i) => i + 1));
    const versione = (getDb().prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    expect(versione).toBe(ids[ids.length - 1]);
  });
});
