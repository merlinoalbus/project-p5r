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
import type { ConfidenteSeed, DoteSeed, FusioneSeed, OggettoSeed, PersonaSeed, SkillSeed, TraduzioniSeed } from '../../../shared/seed.js';
import { invalidaCacheTraduzioni } from '../traduzioniService.js';
import { invalidaMotoreFusione } from '../fusione/motoreFusione.js';

/** File del seed letti dal caricatore (versione.json è solo informativo). */
const FILE_SEED = ['persona.json', 'skill.json', 'oggetti.json', 'fusione.json', 'traduzioni.json', 'confidenti.json', 'doti.json'] as const;

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

  return { caricato: true, versione: seed.versione, hash: seed.hash, conteggi: conteggi() };
}
