// ============================================================
// caricaSeed — carica il compendio Royal da data/seed nel DB (idempotente)
// ============================================================
//
// Eseguito al boot dopo le migrazioni. Legge i JSON del seed, calcola un
// hash del contenuto e lo confronta con `seed_meta`: se coincide non fa
// nulla; altrimenti, in UNA transazione, aggiorna tutte le tabelle dei
// dati di gioco.
//
// Regole di sicurezza per i dati utente (che referenziano persona/skill per id):
//   - persona, skill, oggetto, confidente, dote_sociale: UPSERT per chiave
//     naturale (nome/chiave) → gli id restano stabili fra un reseed e l'altro;
//     le righe non più presenti nel seed NON vengono cancellate (mai perdere
//     riferimenti dei dati utente);
//   - tabelle di relazione puramente di gioco (affinità, skill per Persona,
//     tabella arcana, ricette, tesori, matrice, DLC): svuotate e ricaricate;
//   - traduzione: le righe con fonte='utente' non vengono MAI sovrascritte.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AppDatabase } from '../../db/dbService.js';
import { nowIso } from '../../db/dbService.js';
import { config } from '../../config.js';
import type { BattagliaSeed, CalendarioSeed, ConfidenteDettaglioSeed, ConfidenteSeed, DomandeSeed, DungeonSeed, MementosSeed, DoteSeed, FusioneSeed, OggettoSeed, PersonaSeed, SkillSeed, TraduzioniSeed } from '../../../shared/seed.js';
import { invalidaCacheTraduzioni } from '../traduzioniService.js';
import { invalidaMotoreFusione } from '../fusione/motoreFusione.js';
import { invalidaEredita } from '../fusione/eredita.js';

/** File del seed letti dal caricatore (versione.json è solo informativo). */
const FILE_SEED = ['persona.json', 'skill.json', 'oggetti.json', 'fusione.json', 'traduzioni.json', 'confidenti.json', 'confidenti-dettaglio.json', 'domande.json', 'calendario.json', 'dungeon.json', 'mementos.json', 'battaglia.json', 'doti.json'] as const;

/** Esito del caricamento. */
export interface EsitoSeed {
  caricato: boolean;
  versione: number;
  hash: string;
  conteggi: { persona: number; skill: number; oggetti: number; confidenti: number; traduzioni: number };
}

interface SeedCompleto {
  versione: number;
  persone: PersonaSeed[];
  skill: SkillSeed[];
  oggetti: OggettoSeed[];
  fusione: FusioneSeed;
  traduzioni: TraduzioniSeed;
  confidenti: ConfidenteSeed[];
  confidentiDettaglio: ConfidenteDettaglioSeed[];
  domande: DomandeSeed;
  calendario: CalendarioSeed;
  dungeon: DungeonSeed[];
  mementos: MementosSeed;
  battaglia: BattagliaSeed;
  doti: DoteSeed[];
  hash: string;
}

function leggiSeed(seedDir: string): SeedCompleto {
  const contenuti: Record<string, string> = {};
  for (const nome of FILE_SEED) {
    const file = path.join(seedDir, nome);
    if (!fs.existsSync(file)) throw new Error(`file del seed mancante: ${file}`);
    contenuti[nome] = fs.readFileSync(file, 'utf-8');
  }
  const fileVersione = path.join(seedDir, 'versione.json');
  const versione = fs.existsSync(fileVersione) ? (JSON.parse(fs.readFileSync(fileVersione, 'utf-8')) as { versione?: number }).versione ?? 0 : 0;
  const hash = createHash('sha256');
  for (const nome of FILE_SEED) hash.update(nome).update('\0').update(contenuti[nome]).update('\0');
  return {
    versione,
    persone: JSON.parse(contenuti['persona.json']) as PersonaSeed[],
    skill: JSON.parse(contenuti['skill.json']) as SkillSeed[],
    oggetti: JSON.parse(contenuti['oggetti.json']) as OggettoSeed[],
    fusione: JSON.parse(contenuti['fusione.json']) as FusioneSeed,
    traduzioni: JSON.parse(contenuti['traduzioni.json']) as TraduzioniSeed,
    confidenti: JSON.parse(contenuti['confidenti.json']) as ConfidenteSeed[],
    confidentiDettaglio: JSON.parse(contenuti['confidenti-dettaglio.json']) as ConfidenteDettaglioSeed[],
    domande: JSON.parse(contenuti['domande.json']) as DomandeSeed,
    calendario: JSON.parse(contenuti['calendario.json']) as CalendarioSeed,
    dungeon: JSON.parse(contenuti['dungeon.json']) as DungeonSeed[],
    mementos: JSON.parse(contenuti['mementos.json']) as MementosSeed,
    battaglia: JSON.parse(contenuti['battaglia.json']) as BattagliaSeed,
    doti: JSON.parse(contenuti['doti.json']) as DoteSeed[],
    hash: `${versione}:${hash.digest('hex')}`,
  };
}

function leggiMeta(db: AppDatabase, chiave: string): string | null {
  const riga = db.prepare('SELECT valore FROM seed_meta WHERE chiave = ?').get(chiave) as { valore: string } | undefined;
  return riga?.valore ?? null;
}

/**
 * Carica (o aggiorna) il compendio nel DB. Restituisce l'esito; con `forza`
 * ricarica anche se l'hash coincide.
 */
export function caricaSeed(db: AppDatabase, seedDir: string = config.seedDir, forza = false): EsitoSeed {
  const seed = leggiSeed(seedDir);
  const conteggi = () => ({
    persona: (db.prepare('SELECT COUNT(*) AS n FROM persona').get() as { n: number }).n,
    skill: (db.prepare('SELECT COUNT(*) AS n FROM skill').get() as { n: number }).n,
    oggetti: (db.prepare('SELECT COUNT(*) AS n FROM oggetto').get() as { n: number }).n,
    confidenti: (db.prepare('SELECT COUNT(*) AS n FROM confidente').get() as { n: number }).n,
    traduzioni: (db.prepare('SELECT COUNT(*) AS n FROM traduzione').get() as { n: number }).n,
  });
  if (!forza && leggiMeta(db, 'hash') === seed.hash) {
    return { caricato: false, versione: seed.versione, hash: seed.hash, conteggi: conteggi() };
  }

  db.transaction(() => {
    const adesso = nowIso();

    // ---- Arcani ----
    const insArcana = db.prepare('INSERT INTO arcana (chiave, ordine, numero) VALUES (?, ?, ?) ON CONFLICT(chiave) DO UPDATE SET ordine = excluded.ordine, numero = excluded.numero');
    seed.traduzioni.arcani.forEach((a, i) => insArcana.run(a.chiave, i, a.numero));
    const ordineArcana = new Map(seed.traduzioni.arcani.map((a, i) => [a.chiave, i]));

    // ---- Skill (upsert per nome, id stabili) ----
    const insSkill = db.prepare(`INSERT INTO skill (nome, elemento, costo_tipo, costo_valore, effetto, fonte_carta, negoziazione, unica)
      VALUES (@nome, @elemento, @costo_tipo, @costo_valore, @effetto, @fonte_carta, @negoziazione, @unica)
      ON CONFLICT(nome) DO UPDATE SET elemento = excluded.elemento, costo_tipo = excluded.costo_tipo, costo_valore = excluded.costo_valore,
        effetto = excluded.effetto, fonte_carta = excluded.fonte_carta, negoziazione = excluded.negoziazione, unica = excluded.unica`);
    for (const s of seed.skill) {
      insSkill.run({ nome: s.nome, elemento: s.elemento, costo_tipo: s.costo.tipo, costo_valore: s.costo.valore, effetto: s.effetto, fonte_carta: s.fonteCarta, negoziazione: s.negoziazione, unica: s.unica });
    }
    const idSkill = new Map<string, number>();
    for (const r of db.prepare('SELECT id, nome FROM skill').all() as Array<{ id: number; nome: string }>) idSkill.set(r.nome, r.id);

    // ---- Persona (upsert per nome, id stabili) ----
    const insPersona = db.prepare(`INSERT INTO persona (nome, arcana, livello, eredita, speciale, rara, dlc, richiede_confidente_max, nota, oggetto, oggetto_allarme,
        oggetto_e_carta, tratto, forza, magia, resistenza, agilita, fortuna, aree_mementos_json, piani_mementos)
      VALUES (@nome, @arcana, @livello, @eredita, @speciale, @rara, @dlc, @richiede_confidente_max, @nota, @oggetto, @oggetto_allarme,
        @oggetto_e_carta, @tratto, @forza, @magia, @resistenza, @agilita, @fortuna, @aree_mementos_json, @piani_mementos)
      ON CONFLICT(nome) DO UPDATE SET arcana = excluded.arcana, livello = excluded.livello, eredita = excluded.eredita, speciale = excluded.speciale,
        rara = excluded.rara, dlc = excluded.dlc, richiede_confidente_max = excluded.richiede_confidente_max, nota = excluded.nota,
        oggetto = excluded.oggetto, oggetto_allarme = excluded.oggetto_allarme, oggetto_e_carta = excluded.oggetto_e_carta, tratto = excluded.tratto,
        forza = excluded.forza, magia = excluded.magia, resistenza = excluded.resistenza, agilita = excluded.agilita, fortuna = excluded.fortuna,
        aree_mementos_json = excluded.aree_mementos_json, piani_mementos = excluded.piani_mementos`);
    for (const p of seed.persone) {
      insPersona.run({
        nome: p.nome, arcana: p.arcana, livello: p.livello, eredita: p.eredita, speciale: p.speciale ? 1 : 0, rara: p.rara ? 1 : 0, dlc: p.dlc ? 1 : 0,
        richiede_confidente_max: p.richiedeConfidenteMax ? 1 : 0, nota: p.nota, oggetto: p.oggetto, oggetto_allarme: p.oggettoAllarme,
        oggetto_e_carta: p.oggettoECarta ? 1 : 0, tratto: p.tratto, forza: p.statistiche.forza, magia: p.statistiche.magia,
        resistenza: p.statistiche.resistenza, agilita: p.statistiche.agilita, fortuna: p.statistiche.fortuna,
        aree_mementos_json: JSON.stringify(p.areeMementos), piani_mementos: p.pianiMementos,
      });
    }
    const idPersona = new Map<string, number>();
    for (const r of db.prepare('SELECT id, nome FROM persona').all() as Array<{ id: number; nome: string }>) idPersona.set(r.nome, r.id);
    const idDi = (nome: string): number => {
      const id = idPersona.get(nome);
      if (id === undefined) throw new Error(`seed: Persona sconosciuta '${nome}'`);
      return id;
    };
    const idSkillDi = (nome: string): number => {
      const id = idSkill.get(nome);
      if (id === undefined) throw new Error(`seed: skill sconosciuta '${nome}'`);
      return id;
    };

    // ---- Relazioni di gioco delle Persona: svuota e ricarica ----
    const elementiAffinita = seed.traduzioni.elementiAffinita.map((e) => e.chiave);
    const delAff = db.prepare('DELETE FROM persona_affinita WHERE persona_id = ?');
    const insAff = db.prepare('INSERT INTO persona_affinita (persona_id, elemento, codice) VALUES (?, ?, ?)');
    const delPS = db.prepare('DELETE FROM persona_skill WHERE persona_id = ?');
    const insPS = db.prepare('INSERT INTO persona_skill (persona_id, skill_id, livello) VALUES (?, ?, ?)');
    for (const p of seed.persone) {
      const pid = idDi(p.nome);
      delAff.run(pid);
      p.affinita.forEach((codice, i) => insAff.run(pid, elementiAffinita[i], codice));
      delPS.run(pid);
      for (const s of p.skill) insPS.run(pid, idSkillDi(s.nome), s.livello);
    }
    db.prepare('DELETE FROM skill_fonte_esecuzione').run();
    const insFonte = db.prepare('INSERT INTO skill_fonte_esecuzione (skill_id, persona_id) VALUES (?, ?)');
    for (const s of seed.skill) for (const f of s.fontiEsecuzione) insFonte.run(idSkillDi(s.nome), idDi(f));

    // ---- Oggetti ----
    const insOggetto = db.prepare(`INSERT INTO oggetto (nome, categoria, vincolo, descrizione) VALUES (?, ?, ?, ?)
      ON CONFLICT(nome) DO UPDATE SET categoria = excluded.categoria, vincolo = excluded.vincolo, descrizione = excluded.descrizione`);
    for (const o of seed.oggetti) insOggetto.run(o.nome, o.categoria, o.vincolo, o.descrizione);

    // ---- Fusione: tabella arcana (coppia normalizzata per ordine) ----
    db.prepare('DELETE FROM fusione_arcana').run();
    const insFA = db.prepare('INSERT INTO fusione_arcana (a, b, risultato) VALUES (?, ?, ?)');
    for (const r of seed.fusione.tabella) {
      const [a, b] = (ordineArcana.get(r.a) ?? 0) <= (ordineArcana.get(r.b) ?? 0) ? [r.a, r.b] : [r.b, r.a];
      insFA.run(a, b, r.risultato);
    }

    // ---- Fusione: ricette speciali ----
    db.prepare('DELETE FROM fusione_speciale_ingrediente').run();
    db.prepare('DELETE FROM fusione_speciale').run();
    const insFS = db.prepare('INSERT INTO fusione_speciale (risultato_id) VALUES (?)');
    const insFSI = db.prepare('INSERT INTO fusione_speciale_ingrediente (risultato_id, ingrediente_id, ordine) VALUES (?, ?, ?)');
    for (const r of seed.fusione.speciali) {
      const rid = idDi(r.risultato);
      insFS.run(rid);
      r.ingredienti.forEach((ing, i) => insFSI.run(rid, idDi(ing), i));
    }

    // ---- Demoni del Tesoro ----
    db.prepare('DELETE FROM tesoro_modificatore').run();
    db.prepare('DELETE FROM tesoro').run();
    const insT = db.prepare('INSERT INTO tesoro (persona_id, ordine) VALUES (?, ?)');
    const insTM = db.prepare('INSERT INTO tesoro_modificatore (arcana, tesoro_id, modificatore) VALUES (?, ?, ?)');
    const idTesori = seed.fusione.tesori.nomi.map((n, i) => {
      const id = idDi(n);
      insT.run(id, i);
      return id;
    });
    for (const [arcana, mods] of Object.entries(seed.fusione.tesori.modificatori)) {
      mods.forEach((m, i) => insTM.run(arcana, idTesori[i], m));
    }

    // ---- Matrice di eredità ----
    db.prepare('DELETE FROM eredita_matrice').run();
    const insEM = db.prepare('INSERT INTO eredita_matrice (tipo, elemento, ammesso) VALUES (?, ?, ?)');
    for (const [tipo, riga] of Object.entries(seed.fusione.eredita.matrice)) {
      riga.forEach((ammesso, i) => insEM.run(tipo, seed.fusione.eredita.colonne[i], ammesso ? 1 : 0));
    }

    // ---- DLC ----
    db.prepare('DELETE FROM dlc_set_persona').run();
    db.prepare('DELETE FROM dlc_set').run();
    const insDlc = db.prepare('INSERT INTO dlc_set (id, ordine) VALUES (?, ?)');
    const insDlcP = db.prepare('INSERT INTO dlc_set_persona (set_id, persona_id) VALUES (?, ?)');
    seed.fusione.dlc.forEach((set, i) => {
      insDlc.run(i + 1, i);
      for (const n of set) insDlcP.run(i + 1, idDi(n));
    });

    // ---- Confidenti e Doti sociali ----
    const insConf = db.prepare('INSERT INTO confidente (chiave, nome, arcana, ordine) VALUES (?, ?, ?, ?) ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, arcana = excluded.arcana, ordine = excluded.ordine');
    seed.confidenti.forEach((c, i) => insConf.run(c.chiave, c.nome, c.arcana, i));
    const insDote = db.prepare('INSERT INTO dote_sociale (chiave, nome, ordine) VALUES (?, ?, ?) ON CONFLICT(chiave) DO UPDATE SET nome = excluded.nome, ordine = excluded.ordine');
    seed.doti.forEach((d, i) => insDote.run(d.chiave, d.nome, i));
    db.prepare('DELETE FROM dote_sociale_rango').run();
    const insDoteRango = db.prepare('INSERT INTO dote_sociale_rango (dote_chiave, rango, nome, soglia) VALUES (?, ?, ?, ?)');
    for (const d of seed.doti) for (const r of d.ranghi) insDoteRango.run(d.chiave, r.rango, r.nome, r.soglia);
    // Punti per rango dei Confidenti: presenti solo se il seed li documenta.
    db.prepare('DELETE FROM confidente_rango').run();
    const insConfRango = db.prepare('INSERT INTO confidente_rango (confidente_chiave, rango, punti_necessari) VALUES (?, ?, ?)');
    for (const c of seed.confidenti) {
      (c.puntiPerRango ?? []).forEach((punti, i) => {
        if (punti !== null) insConfRango.run(c.chiave, i + 1, punti);
      });
    }

    // ---- Dettaglio dei Confidenti (Fase 6.1): sostituito integralmente a ogni ricarica del seed ----
    db.prepare('DELETE FROM confidente_abilita').run();
    db.prepare('DELETE FROM confidente_dialogo').run();
    db.prepare('DELETE FROM confidente_regalo').run();
    db.prepare('DELETE FROM confidente_disponibilita').run();
    const insAb = db.prepare('INSERT INTO confidente_abilita (confidente_chiave, rango, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)');
    const insDi = db.prepare('INSERT INTO confidente_dialogo (confidente_chiave, ordine, rango, etichetta, note, scelte_json) VALUES (?, ?, ?, ?, ?, ?)');
    const insRe = db.prepare('INSERT INTO confidente_regalo (confidente_chiave, ordine, nome, dove, costo, effetto, sconsigliato) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insDisp = db.prepare('INSERT INTO confidente_disponibilita (confidente_chiave, giorni_json, fasce_json, luogo, sblocco_data, sblocco_requisiti, note, note_generali, fonti_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const chiaviConfidenti = new Set(seed.confidenti.map((c) => c.chiave));
    for (const d of seed.confidentiDettaglio) {
      if (!chiaviConfidenti.has(d.chiave)) throw new Error(`Seed confidenti-dettaglio: Confidente sconosciuto «${d.chiave}»`);
      d.abilita.forEach((a, i) => insAb.run(d.chiave, a.rango, i, a.nome, a.descrizione ?? ''));
      d.dialoghi.forEach((x, i) => insDi.run(d.chiave, i, x.rango, x.etichetta, x.note ?? '', JSON.stringify(x.scelte)));
      let ordine = 0;
      for (const g of d.regali) insRe.run(d.chiave, ordine++, g.nome, g.dove, g.costo, g.effetto, 0);
      for (const g of d.regaliSconsigliati) insRe.run(d.chiave, ordine++, g, null, null, null, 1);
      insDisp.run(d.chiave, JSON.stringify(d.disponibilita.giorni), JSON.stringify(d.disponibilita.fasce), d.disponibilita.luogo, d.disponibilita.sbloccoData, d.disponibilita.sbloccoRequisiti, d.disponibilita.note, d.noteGenerali, JSON.stringify(d.fonti));
    }

    // ---- Domande in classe ed esami (Fase 6.2): id stabili per (data, ordine) tramite upsert, tracking preservato ----
    const insDom = db.prepare(`INSERT INTO domanda (ordine, data, tipo, chi, domanda, risposte_json, ricompensa, note, fonte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const updDom = db.prepare(`UPDATE domanda SET data = ?, tipo = ?, chi = ?, domanda = ?, risposte_json = ?, ricompensa = ?, note = ?, fonte = ? WHERE ordine = ?`);
    const esistenti = new Set((db.prepare('SELECT ordine FROM domanda').all() as Array<{ ordine: number }>).map((r) => r.ordine));
    seed.domande.domande.forEach((d, i) => {
      if (esistenti.has(i)) updDom.run(d.data, d.tipo, d.chi, d.domanda, JSON.stringify(d.risposte), d.ricompensa, d.note, d.fonte, i);
      else insDom.run(i, d.data, d.tipo, d.chi, d.domanda, JSON.stringify(d.risposte), d.ricompensa, d.note, d.fonte);
    });
    db.prepare('DELETE FROM domanda WHERE ordine >= ?').run(seed.domande.domande.length);
    db.prepare('DELETE FROM esame').run();
    const insEs = db.prepare('INSERT INTO esame (chiave, ordine, nome, date_json, data_risultati, domande_json, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
    seed.domande.esami.forEach((e, i) => insEs.run(e.chiave, i, e.nome, JSON.stringify(e.date), e.dataRisultati, JSON.stringify(e.domande), e.note));
    db.prepare("INSERT INTO esame_premi (chiave, json) VALUES ('premi', ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json").run(JSON.stringify(seed.domande.premi));

    // ---- Calendario di gioco (Fase 6.3): sostituito integralmente ----
    db.prepare('DELETE FROM evento_calendario').run();
    db.prepare('DELETE FROM giorno_calendario').run();
    db.prepare('DELETE FROM settimana_guida').run();
    const insSett = db.prepare('INSERT INTO settimana_guida (numero, titolo, periodo, url, riassunto, incertezze) VALUES (?, ?, ?, ?, ?, ?)');
    for (const w of seed.calendario.settimane) insSett.run(w.numero, w.titolo, w.periodo, w.url, w.riassunto, w.incertezze);
    // Settimana della guida per ogni giorno: dal periodo «GG/MM - GG/MM» (anno scolastico aprile→marzo).
    const idxData = (mmgg: string) => { const [m, g] = mmgg.split('-').map(Number); return ((m - 4 + 12) % 12) * 31 + g; };
    const intervalli = seed.calendario.settimane.map((w) => {
      const m = /^(\d{2})\/(\d{2})\s*-\s*(\d{2})\/(\d{2})$/.exec(w.periodo.trim());
      return m ? { numero: w.numero, da: idxData(`${m[2]}-${m[1]}`), a: idxData(`${m[4]}-${m[3]}`) } : null;
    }).filter((x): x is { numero: number; da: number; a: number } => x !== null);
    const insGiorno = db.prepare('INSERT INTO giorno_calendario (data, ordine, giorno_settimana, meteo, tempo_libero_json, settimana) VALUES (?, ?, ?, ?, ?, ?)');
    const insEvento = db.prepare('INSERT INTO evento_calendario (data, ordine, tipo, titolo, dettaglio, fonte) VALUES (?, ?, ?, ?, ?, ?)');
    seed.calendario.giorni.forEach((g, i) => {
      const idx = idxData(g.data);
      const sett = intervalli.find((x) => idx >= x.da && idx <= x.a)?.numero ?? null;
      insGiorno.run(g.data, i, g.giornoSettimana, g.meteo, g.tempoLibero ? JSON.stringify(g.tempoLibero) : null, sett);
      g.eventi.forEach((e, j) => insEvento.run(g.data, j, e.tipo, e.titolo, e.dettaglio ?? '', e.fonte ?? ''));
    });

    // ---- Dungeon (Fase 7.1): upsert per chiave stabile, così marcatori e stati per partita sopravvivono al reseed ----
    const insDun = db.prepare(`INSERT INTO dungeon (chiave, tipo, ordine, nome, sovrano, arcana_sovrano, data_sblocco, data_scadenza, furto_consigliato, livello_consigliato, note, fonti_json)
      VALUES (@chiave, @tipo, @ordine, @nome, @sovrano, @arcana_sovrano, @data_sblocco, @data_scadenza, @furto_consigliato, @livello_consigliato, @note, @fonti_json)
      ON CONFLICT(chiave) DO UPDATE SET tipo = excluded.tipo, ordine = excluded.ordine, nome = excluded.nome, sovrano = excluded.sovrano, arcana_sovrano = excluded.arcana_sovrano,
        data_sblocco = excluded.data_sblocco, data_scadenza = excluded.data_scadenza, furto_consigliato = excluded.furto_consigliato, livello_consigliato = excluded.livello_consigliato, note = excluded.note, fonti_json = excluded.fonti_json`);
    const insArea = db.prepare(`INSERT INTO dungeon_area (chiave, dungeon_chiave, ordine, nome, descrizione) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(chiave) DO UPDATE SET dungeon_chiave = excluded.dungeon_chiave, ordine = excluded.ordine, nome = excluded.nome, descrizione = excluded.descrizione`);
    const insPunto = db.prepare(`INSERT INTO punto_interesse (chiave, area_chiave, ordine, tipo, nome, descrizione, esauribile, dettagli_json, fonte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chiave) DO UPDATE SET area_chiave = excluded.area_chiave, ordine = excluded.ordine, tipo = excluded.tipo, nome = excluded.nome, descrizione = excluded.descrizione, esauribile = excluded.esauribile, dettagli_json = excluded.dettagli_json, fonte = excluded.fonte`);
    const chiaviDungeon = new Set<string>();
    const chiaviAree = new Set<string>();
    const chiaviPunti = new Set<string>();
    for (const d of seed.dungeon) {
      chiaviDungeon.add(d.chiave);
      insDun.run({ chiave: d.chiave, tipo: d.tipo, ordine: d.ordine, nome: d.nome, sovrano: d.sovrano, arcana_sovrano: d.arcanaSovrano, data_sblocco: d.date.sblocco, data_scadenza: d.date.scadenza, furto_consigliato: d.date.furtoConsigliato, livello_consigliato: d.livelloConsigliato, note: d.note, fonti_json: JSON.stringify(d.fonti) });
      for (const a of d.aree) {
        chiaviAree.add(a.chiave);
        insArea.run(a.chiave, d.chiave, a.ordine, a.nome, a.descrizione);
        for (const p of a.punti) {
          const chiavePunto = `${a.chiave}/${p.ordine}`;
          chiaviPunti.add(chiavePunto);
          insPunto.run(chiavePunto, a.chiave, p.ordine, p.tipo, p.nome, p.descrizione, p.esauribile ? 1 : 0, JSON.stringify(p.dettagli ?? {}), p.fonte);
        }
      }
    }
    for (const r of db.prepare('SELECT chiave FROM punto_interesse').all() as Array<{ chiave: string }>) if (!chiaviPunti.has(r.chiave)) db.prepare('DELETE FROM punto_interesse WHERE chiave = ?').run(r.chiave);
    for (const r of db.prepare('SELECT chiave FROM dungeon_area').all() as Array<{ chiave: string }>) if (!chiaviAree.has(r.chiave)) db.prepare('DELETE FROM dungeon_area WHERE chiave = ?').run(r.chiave);
    for (const r of db.prepare('SELECT chiave FROM dungeon').all() as Array<{ chiave: string }>) if (!chiaviDungeon.has(r.chiave)) db.prepare('DELETE FROM dungeon WHERE chiave = ?').run(r.chiave);

    // ---- Richieste dei Mementos e Jose (Fase 7.2): upsert per chiave, rimozione degli orfani ----
    const insRic = db.prepare(`INSERT INTO richiesta (chiave, ordine, nome, committente, disponibile_dal, scadenza, area, area_chiave, piano, bersaglio_json, ricompense_json, confidente_chiave, confidente_rango, note, fonte)
      VALUES (@chiave, @ordine, @nome, @committente, @disponibile_dal, @scadenza, @area, @area_chiave, @piano, @bersaglio_json, @ricompense_json, @confidente_chiave, @confidente_rango, @note, @fonte)
      ON CONFLICT(chiave) DO UPDATE SET ordine = excluded.ordine, nome = excluded.nome, committente = excluded.committente, disponibile_dal = excluded.disponibile_dal, scadenza = excluded.scadenza, area = excluded.area,
        area_chiave = excluded.area_chiave, piano = excluded.piano, bersaglio_json = excluded.bersaglio_json, ricompense_json = excluded.ricompense_json, confidente_chiave = excluded.confidente_chiave, confidente_rango = excluded.confidente_rango, note = excluded.note, fonte = excluded.fonte`);
    const chiaviRichieste = new Set<string>();
    seed.mementos.richieste.forEach((r, i) => {
      chiaviRichieste.add(r.chiave);
      const conf = r.confidente && chiaviConfidenti.has(r.confidente.chiave) ? r.confidente : null;
      insRic.run({ chiave: r.chiave, ordine: i, nome: r.nome, committente: r.committente, disponibile_dal: r.disponibileDal, scadenza: r.scadenza, area: r.area, area_chiave: r.areaChiave && chiaviAree.has(r.areaChiave) ? r.areaChiave : null, piano: r.piano,
        bersaglio_json: JSON.stringify(r.bersaglio), ricompense_json: JSON.stringify(r.ricompense), confidente_chiave: conf?.chiave ?? null, confidente_rango: conf?.rango ?? null, note: r.note, fonte: r.fonte });
    });
    for (const r of db.prepare('SELECT chiave FROM richiesta').all() as Array<{ chiave: string }>) if (!chiaviRichieste.has(r.chiave)) db.prepare('DELETE FROM richiesta WHERE chiave = ?').run(r.chiave);
    db.prepare("INSERT INTO dati_guida (chiave, json) VALUES ('jose', ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json").run(JSON.stringify(seed.mementos.jose));

    // ---- Aiuto in battaglia (Fase 7.3): sezioni della guida e indice delle Ombre (le chiavi dei dungeon devono esistere) ----
    for (const o of seed.battaglia.ombre) if (!chiaviDungeon.has(o.dungeonChiave)) throw new Error(`Seed battaglia: dungeon sconosciuto '${o.dungeonChiave}' per l'Ombra '${o.ombra ?? o.persona ?? ''}'.`);
    db.prepare("INSERT INTO dati_guida (chiave, json) VALUES ('battaglia', ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json").run(JSON.stringify(seed.battaglia));

    // ---- Traduzioni (mai sovrascrivere fonte='utente') ----
    const insTr = db.prepare(`INSERT INTO traduzione (ambito, chiave, testo, extra_json, fonte, updated_at) VALUES (?, ?, ?, ?, 'seed', ?)
      ON CONFLICT(ambito, chiave) DO UPDATE SET testo = excluded.testo, extra_json = excluded.extra_json, updated_at = excluded.updated_at
      WHERE traduzione.fonte = 'seed'`);
    const tr = (ambito: string, chiave: string, testo: string, extra?: Record<string, unknown>) =>
      insTr.run(ambito, chiave, testo, extra ? JSON.stringify(extra) : null, adesso);
    const t = seed.traduzioni;
    for (const a of t.arcani) tr('arcana', a.chiave, a.nome, { numero: a.numero });
    for (const [k, v] of Object.entries(t.elementiSkill)) tr('elementoSkill', k, v);
    for (const e of t.elementiAffinita) tr('elementoAffinita', e.chiave, e.nome, { sigla: e.sigla });
    for (const [k, v] of Object.entries(t.affinita)) tr('affinita', k, v.nome, { sigla: v.sigla });
    for (const [k, v] of Object.entries(t.tipiEredita)) tr('tipoEredita', k, v);
    for (const c of t.colonneEredita) tr('colonnaEredita', c.chiave, c.nome);
    for (const s of t.statistiche) tr('statistica', s.chiave, s.nome, { sigla: s.sigla });
    for (const [k, v] of Object.entries(t.tipiOggetto)) tr('tipoOggetto', k, v);
    for (const [k, v] of Object.entries(t.vincoliOggetto)) tr('vincoloOggetto', k, v);
    for (const [k, v] of Object.entries(t.areeMementos)) tr('areaMementos', k, v);
    for (const d of seed.doti) {
      tr('doteSociale', d.chiave, d.nome);
      for (const r of d.ranghi) tr('rangoDote', `${d.chiave}/${r.rango}`, r.nome);
    }
    for (const [k, v] of Object.entries(t.notePersona)) tr('notaPersona', k, v);
    for (const [k, v] of Object.entries(t.fontiEsclusive)) tr('fonteEsclusiva', k, v);
    for (const [k, v] of Object.entries(t.effettiSkill)) tr('effettoSkill', k, v);
    for (const [k, v] of Object.entries(t.descrizioniOggetti)) tr('descrizioneOggetto', k, v);
    for (const [k, v] of Object.entries(t.negoziazioni)) tr('negoziazione', k, v);
    for (const [k, v] of Object.entries(t.fontiCarta)) tr('fonteCarta', k, v);
    for (const [k, v] of Object.entries(t.skill ?? {})) tr('skill', k, v);
    for (const [k, v] of Object.entries(t.persone ?? {})) tr('persona', k, v);
    for (const tm of t.termini ?? []) tr('termine', tm.chiave, tm.nome, { categoria: tm.categoria, definizione: tm.definizione ?? null, fonte: tm.fonte ?? null });

    // ---- Meta ----
    const insMeta = db.prepare('INSERT INTO seed_meta (chiave, valore) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore');
    insMeta.run('hash', seed.hash);
    insMeta.run('versione', String(seed.versione));
    insMeta.run('caricatoIl', adesso);
  })();
  invalidaCacheTraduzioni();
  invalidaMotoreFusione();
  invalidaEredita();

  return { caricato: true, versione: seed.versione, hash: seed.hash, conteggi: conteggi() };
}
