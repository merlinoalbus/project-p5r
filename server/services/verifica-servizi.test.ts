// ============================================================
// Test della verifica completa del codice (2026-10-03), lotto servizi e DB: C1 lucchetto comune, C2 file di un'altra versione,
// C3 scrittura atomica, C5 riapertura fallita, C6 transazioni, B3' livello di Joker, B4' giornali della verifica,
// B6' copie contate una volta.
// ============================================================
//
// Usa una cartella dati temporanea, come `impostazioniService.test.ts`: il servizio lavora su file reali.
// ============================================================

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { VERSIONE_PARTITE } from '../db/versioneSchema.js';
import { caricaPacchetto } from './pacchetto/pacchettoGioco.js';
import { copiaDatabase, installaDatabase, riapriIstanza, ripristinaIstanza, statoIstanza, tornaAllaCopiaDiSicurezza, verificaDatabase } from './impostazioniService.js';
import { elencaDungeon } from './dungeonService.js';
import { importaPacchetto } from './pacchettoGiocoService.js';
import { aggiornaConfidente, confidente, confidenti, creaPartita, aggiornaPartita, impostaRegaloFatto, ranghiConfidenti } from './partiteService.js';
import { impostaMembro, squadraPartita } from './squadraService.js';
import { impostaMeteo } from './meteoService.js';
import { creaObiettivo, eliminaObiettivo, obiettivi } from './obiettiviService.js';
import { aggiornaPianoSalvato, eliminaPianoSalvato } from './pianiSalvatiService.js';
import { aggiornaCiclo, eliminaCiclo } from './cicliSalvatiService.js';

let dataDir = '';

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-verifica-servizi-'));
  // i due database stanno in `edizioneDir` e `partiteDir`, che senza le loro variabili d'ambiente valgono quanto `DATA_DIR` all'avvio:
  // vanno portati nella cartella di prova insieme a `dataDir`, o la prova aprirebbe i file veri dell'istanza
  Object.assign(config, { dataDir, edizioneDir: dataDir, partiteDir: dataDir });
  caricaPacchetto(initDb());
});

afterAll(() => {
  closeDb();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

/** Una copia del file delle partite con `user_version` cambiato, in un file della cartella di prova. */
async function partiteConVersione(versione: number): Promise<string> {
  const copia = await copiaDatabase('partite');
  const db = new Database(copia.percorso);
  db.pragma(`user_version = ${versione}`);
  db.close();
  const qui = path.join(dataDir, `partite-${versione}-${Date.now()}.db`);
  fs.copyFileSync(copia.percorso, qui);
  for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${copia.percorso}${coda}`, { force: true });
  return qui;
}

describe('verifica servizi e DB', () => {
  it('C1: un ripristino in corso respinge un secondo ripristino e un\'importazione del pacchetto (409)', async () => {
    const istantanea = await partiteConVersione(getDb().pragma('utente.user_version', { simple: true }) as number);
    const primo = ripristinaIstanza(istantanea);
    await expect(ripristinaIstanza(istantanea)).rejects.toMatchObject({ code: 'importazione-in-corso', status: 409 });
    await expect(importaPacchetto(istantanea)).rejects.toMatchObject({ code: 'importazione-in-corso', status: 409 });
    await primo;
    // finito il primo, il lucchetto è libero
    const secondo = await ripristinaIstanza(istantanea);
    expect(secondo.partite).toBe(true);
  });

  it('C2: un file delle partite di un\'altra versione, più nuova o più vecchia di quella che il codice legge, non si ripristina', async () => {
    for (const versione of [9999, VERSIONE_PARTITE - 1]) {
      const altro = await partiteConVersione(versione);
      await expect(ripristinaIstanza(altro)).rejects.toMatchObject({ code: 'database-di-altra-versione', status: 400 });
      expect(prepared('SELECT COUNT(*) AS n FROM persona').get()).toBeDefined(); // l'istanza è rimasta aperta
    }
  });

  describe('C3: il database vivo si sostituisce atomicamente (installaDatabase)', () => {
    /** Percorso del database «vivo» da sostituire, `atomico.db` nella cartella dati di prova. */
    const bersaglio = (): string => path.join(dataDir, 'atomico.db');
    /** Scrive il testo in un file sorgente dal nome casuale nella cartella dati e ne restituisce il percorso. */
    const sorgente = (testo: string): string => { const p = path.join(dataDir, `sorgente-${Math.random().toString(36).slice(2)}.db`); fs.writeFileSync(p, testo); return p; };
    /** File temporanei `atomico.db.nuovo…` rimasti nella cartella dati: le prove controllano che una sostituzione non ne lasci in giro. */
    const nuoviRimasti = (): string[] => fs.readdirSync(dataDir).filter((f) => f.startsWith('atomico.db.nuovo'));
    beforeEach(() => {
      fs.writeFileSync(bersaglio(), 'contenuto originale');
      for (const coda of ['-wal', '-shm']) fs.writeFileSync(`${bersaglio()}${coda}`, 'giornale vecchio');
    });

    it('copia: se la scrittura si interrompe (disco pieno) il file vivo resta intatto e non restano file a metà', async () => {
      const copia = vi.spyOn(fsp, 'copyFile').mockImplementation(async () => { throw new Error('ENOSPC: disco pieno'); });
      try {
        await expect(installaDatabase(sorgente('contenuto nuovo che non arriverà'), bersaglio(), 'copia')).rejects.toThrow('ENOSPC');
      } finally {
        copia.mockRestore();
      }
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('contenuto originale');
      expect(nuoviRimasti()).toEqual([]);
    });

    it('copia: se il rename finale fallisce il file vivo resta intatto e il file nuovo si toglie', async () => {
      const rinomina = vi.spyOn(fsp, 'rename').mockImplementation(async () => { throw new Error('EPERM: occupato'); });
      try {
        await expect(installaDatabase(sorgente('contenuto nuovo'), bersaglio(), 'copia')).rejects.toThrow('EPERM');
      } finally {
        rinomina.mockRestore();
      }
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('contenuto originale');
      expect(nuoviRimasti()).toEqual([]);
    });

    it('copia: a lavoro finito c\'è il contenuto nuovo, il sorgente resta e i giornali vecchi non ci sono più', async () => {
      const s = sorgente('contenuto nuovo');
      await installaDatabase(s, bersaglio(), 'copia');
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('contenuto nuovo');
      expect(fs.existsSync(s)).toBe(true);
      expect(fs.existsSync(`${bersaglio()}-wal`) || fs.existsSync(`${bersaglio()}-shm`)).toBe(false);
    });

    it('sposta: il file prende il posto di quello vivo senza copie; con dischi diversi (EXDEV) si ripiega sulla copia', async () => {
      const s = sorgente('spostato');
      await installaDatabase(s, bersaglio(), 'sposta');
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('spostato');
      expect(fs.existsSync(s)).toBe(false);
      const altro = sorgente('da un altro disco');
      const veraRinomina = fsp.rename;
      let primo = true;
      const rinomina = vi.spyOn(fsp, 'rename').mockImplementation(async (da, a) => {
        if (primo) { primo = false; throw Object.assign(new Error('EXDEV: cross-device link'), { code: 'EXDEV' }); }
        return veraRinomina(da, a);
      });
      try {
        await installaDatabase(altro, bersaglio(), 'sposta');
      } finally {
        rinomina.mockRestore();
      }
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('da un altro disco');
      expect(nuoviRimasti()).toEqual([]);
    });

    it('sposta: un errore che non è EXDEV non diventa una copia, e il file vivo resta intatto', async () => {
      const rinomina = vi.spyOn(fsp, 'rename').mockImplementation(async () => { throw Object.assign(new Error('EACCES: permesso negato'), { code: 'EACCES' }); });
      const copia = vi.spyOn(fsp, 'copyFile');
      try {
        await expect(installaDatabase(sorgente('mai'), bersaglio(), 'sposta')).rejects.toThrow('EACCES');
        expect(copia).not.toHaveBeenCalled();
      } finally {
        rinomina.mockRestore();
        copia.mockRestore();
      }
      expect(fs.readFileSync(bersaglio(), 'utf-8')).toBe('contenuto originale');
    });
  });

  it('C5: se dopo un errore anche la riapertura fallisce, l\'errore lo dice e indica la copia di sicurezza', async () => {
    const vera = config.dataDir;
    const rotta = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-riapertura-'));
    fs.mkdirSync(path.join(rotta, config.dbFileName)); // al posto del file c'è una cartella: SQLite non la apre
    Object.assign(config, { dataDir: rotta, edizioneDir: rotta, partiteDir: rotta });
    let errore: unknown;
    try {
      await tornaAllaCopiaDiSicurezza(path.join(rotta, 'copia-inesistente'), new Error('scrittura fallita'), 'ripristino-fallito', 'Ripristino');
    } catch (err) {
      errore = err;
    } finally {
      Object.assign(config, { dataDir: vera, edizioneDir: vera, partiteDir: vera });
      fs.rmSync(rotta, { recursive: true, force: true });
      initDb();
    }
    expect(errore).toMatchObject({ code: 'internal-error', status: 500 });
    expect((errore as Error).message).toMatch(/riavvia il server/);
    expect((errore as Error).message).toMatch(/copia-inesistente/);
    // nessun dettaglio interno nella risposta (F02): né il messaggio di SQLite né il percorso della cartella dati
    expect((errore as Error).message).not.toMatch(/SQLITE|unable to open|directory|p5r-riapertura/i);
  });

  it('C6: meteo ed eliminazione di un obiettivo cambiano insieme alla data della partita, o per niente', () => {
    const id = creaPartita({ nome: 'Transazioni C6' }).id;
    const ob = creaObiettivo(id, prepared('SELECT id FROM persona LIMIT 1').pluck().get() as number, {});
    getDb().exec("CREATE TEMP TRIGGER blocca_c6 BEFORE UPDATE OF updated_at ON utente.partita BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect(() => impostaMeteo(id, '04-12', { giorno: 'pioggia' })).toThrow();
      expect(() => eliminaObiettivo(id, ob.id)).toThrow();
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_c6');
    }
    expect(prepared('SELECT COUNT(*) AS n FROM meteo_partita WHERE partita_id = ?').get(id)).toEqual({ n: 0 });
    expect(obiettivi(id).map((o) => o.id)).toContain(ob.id);
  });

  it('C6: piani e cicli salvati — modifica ed eliminazione cambiano insieme alla data della partita, o per niente', () => {
    const id = creaPartita({ nome: 'Transazioni C6 piani e cicli' }).id;
    const persona = prepared('SELECT id FROM persona LIMIT 1').pluck().get() as number;
    const piano = Number(prepared("INSERT INTO piano_salvato (partita_id, persona_id, nome, piano_json, created_at, updated_at) VALUES (?, ?, 'Prima', '{}', 'x', 'x')").run(id, persona).lastInsertRowid);
    const ciclo = Number(prepared("INSERT INTO ciclo_salvato (partita_id, persona_id, nome, anelli_json, created_at, updated_at) VALUES (?, ?, 'Prima', '[]', 'x', 'x')").run(id, persona).lastInsertRowid);
    getDb().exec("CREATE TEMP TRIGGER blocca_c6b BEFORE UPDATE OF updated_at ON utente.partita BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect(() => aggiornaPianoSalvato(id, piano, { nome: 'Dopo' })).toThrow();
      expect(() => eliminaPianoSalvato(id, piano)).toThrow();
      expect(() => aggiornaCiclo(id, ciclo, { nome: 'Dopo' })).toThrow();
      expect(() => eliminaCiclo(id, ciclo)).toThrow();
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_c6b');
    }
    expect(prepared('SELECT nome FROM piano_salvato WHERE id = ?').pluck().get(piano)).toBe('Prima');
    expect(prepared('SELECT nome FROM ciclo_salvato WHERE id = ?').pluck().get(ciclo)).toBe('Prima');
  });

  it('prepared: un `.pluck()` di un chiamante non cambia il modo dello statement condiviso per gli altri', () => {
    const sql = "SELECT chiave, nome FROM dungeon WHERE chiave = 'kamoshida'";
    expect(prepared(sql).pluck().get()).toBe('kamoshida');
    expect(prepared(sql).get()).toEqual({ chiave: 'kamoshida', nome: expect.any(String) });
    expect(prepared(sql).raw().get()).toEqual(['kamoshida', expect.any(String)]);
    expect(prepared(sql).get()).toEqual({ chiave: 'kamoshida', nome: expect.any(String) });
  });

  it('B1\': riaprire l\'istanza (dopo un\'importazione o un ripristino) svuota le cache dei dati di gioco', () => {
    const prima = elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra; // riempie la cache delle finestre
    const riga = prepared("SELECT json FROM dati_guida WHERE chiave = 'finestre-dungeon'").pluck().get() as string;
    const dati = JSON.parse(riga) as { finestre: Array<{ dungeon: string; dal?: string }> };
    prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(JSON.stringify({ ...dati, finestre: dati.finestre.map((f) => (f.dungeon === 'kamoshida' ? { ...f, dal: '04-21' } : f)) }));
    try {
      expect(elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra).toEqual(prima); // ancora la copia in memoria
      riapriIstanza();
      expect(elencaDungeon().find((d) => d.chiave === 'kamoshida')!.finestra?.dal).toBe('04-21');
    } finally {
      prepared("UPDATE dati_guida SET json = ? WHERE chiave = 'finestre-dungeon'").run(riga);
      riapriIstanza();
    }
  });

  it('F21/P1\': un Confidente solo è lo stesso DTO dell\'elenco (semafori, regali, blocco), e uno che non c\'è è un 404', () => {
    const id = creaPartita({ nome: 'Un Confidente' }).id;
    aggiornaConfidente(id, 'ryuji', { rango: 2, forza: true });
    impostaRegaloFatto(id, 'ann', 'Rossetto', true);
    impostaRegaloFatto(id, 'ann', 'Collana', true);
    for (const chiave of ['ryuji', 'ann', 'morgana', 'igor']) {
      expect(confidente(id, chiave)).toEqual(confidenti(id).find((c) => c.chiave === chiave));
    }
    expect(confidente(id, 'ann').regaliFatti).toEqual(['Rossetto', 'Collana']);
    expect(() => confidente(id, 'mai-esistito')).toThrowError(expect.objectContaining({ code: 'confidente-non-trovato', status: 404 }));
    expect(() => confidente(999999, 'ryuji')).toThrowError(expect.objectContaining({ code: 'partita-non-trovata', status: 404 }));
    // i ranghi della disponibilità sono quelli dell'elenco
    expect([...ranghiConfidenti(id)]).toEqual(confidenti(id).map((c) => [c.chiave, c.rango]));
  });

  it('B3\': il livello di Joker è uno solo, da qualunque scheda lo si cambi', () => {
    const id = creaPartita({ nome: 'Joker' }).id;
    impostaMembro(id, 'joker', { livello: 12 });
    expect(squadraPartita(id).membri.find((m) => m.chiave === 'joker')!.livello).toBe(12);
    aggiornaPartita(id, { livelloProtagonista: 30 });
    expect(squadraPartita(id).membri.find((m) => m.chiave === 'joker')!.livello).toBe(30);
    // la riga di Joker in squadra non segue il livello: la fonte è solo la partita
    expect(prepared("SELECT livello FROM membro_squadra_partita WHERE partita_id = ? AND personaggio_chiave = 'joker'").get(id)).toEqual({ livello: 12 });
    impostaMembro(id, 'joker', { deltaLivello: 1 });
    expect(prepared('SELECT livello_protagonista FROM partita WHERE id = ?').get(id)).toEqual({ livello_protagonista: 31 });
  });

  it('B4\': la verifica di un file non lascia giornali, né accanto al file né in data/tmp', async () => {
    const copia = await copiaDatabase('gioco');
    for (const coda of ['-wal', '-shm']) fs.rmSync(`${copia.percorso}${coda}`, { force: true });
    const primaInTmp = fs.readdirSync(path.join(dataDir, 'tmp')).sort();
    expect(verificaDatabase(copia.percorso)).toBe('gioco');
    expect(fs.existsSync(`${copia.percorso}-wal`) || fs.existsSync(`${copia.percorso}-shm`)).toBe(false);
    expect(fs.readdirSync(path.join(dataDir, 'tmp')).sort()).toEqual(primaInTmp);
    fs.rmSync(copia.percorso, { force: true });
  });

  it('B6\': una copia sciolta in `backups` (gioco + partite) si conta una volta', () => {
    const backups = path.join(dataDir, 'backups');
    fs.mkdirSync(backups, { recursive: true });
    const prima = statoIstanza().copieDiSicurezza;
    fs.writeFileSync(path.join(backups, 'project-p5r-2026-10-03T00-00-00-000Z.db'), 'x');
    fs.writeFileSync(path.join(backups, 'project-p5r-2026-10-03T00-00-00-000Z.partite.db'), 'x');
    expect(statoIstanza().copieDiSicurezza).toBe(prima + 1);
  });
});
