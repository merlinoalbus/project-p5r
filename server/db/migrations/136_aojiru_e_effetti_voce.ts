import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';

const ARTICOLO = 'chiosco-kiyasuku/succo-aojiru';
const CATALOGO = 'consumabile/succo-aojiru';
const PRIMA = 'Aumenta di 1 punto una statistica sociale a rotazione: prima Fascino, poi Perizia, poi Coraggio, poi Gentilezza, poi Conoscenza';
const DOPO = 'Ogni consumazione dà 2 punti interni (1 nota) alla Dote del succo offerto. La rotazione è Fascino, Perizia, Coraggio, Gentilezza, Conoscenza e avanza solo dopo una consumazione; saltare una domenica non la fa avanzare.';
type Riga = Record<string, unknown>;
const uid = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

/** Conversione congelata dei soli tre tipi preesistenti. Il RAW intero resta nel registro. */
function converti(raw: string): unknown[] | null {
  let elenco: unknown; try { elenco = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(elenco)) return null;
  const doti = new Set(['conoscenza', 'fascino', 'coraggio', 'gentilezza', 'perizia']);
  const n = (v: unknown) => v === 1 || v === 2 || v === 3;
  const out: unknown[] = [];
  for (const v of elenco) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const e = v as Riga;
    const campi: Record<string, readonly string[]> = { dote: ['tipo','dote','note'], lettura: ['tipo','categoria','chiave','almeno'], turno: ['tipo','attivita','doti'] };
    if (typeof e.tipo!=='string'||!Object.hasOwn(campi,e.tipo)||Object.keys(e).some((k) => !campi[e.tipo as string]!.includes(k))) return null;
    if (e.tipo === 'dote' && typeof e.dote==='string'&&doti.has(e.dote) && n(e.note)) out.push({ tipo: 'dote', dote: e.dote, note: e.note });
    else if (e.tipo === 'lettura' && typeof e.categoria==='string'&&['libro', 'film', 'videogioco'].includes(e.categoria) && typeof e.chiave === 'string' && e.chiave.trim()
      && (e.almeno == null || (Number.isSafeInteger(e.almeno) && Number(e.almeno) >= 1))) out.push({ tipo: 'lettura', categoria: e.categoria, chiave: e.chiave.trim(), almeno: e.almeno ?? null });
    else if (e.tipo === 'turno' && typeof e.attivita === 'string' && e.attivita.trim()) {
      if (e.doti == null) out.push({ tipo: 'turno', attivita: e.attivita.trim() });
      else {
        if (!Array.isArray(e.doti) || !e.doti.length) return null;
        const ds: unknown[] = [];
        for (const x of e.doti) {
          if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
          const d = x as Riga; if (Object.keys(d).some((k) => k !== 'dote' && k !== 'note') || typeof d.dote!=='string'||!doti.has(d.dote) || !n(d.note)) return null;
          ds.push({ dote: d.dote, note: d.note });
        }
        out.push({ tipo: 'turno', attivita: e.attivita.trim(), doti: ds });
      }
    } else return null;
  }
  return out;
}

function estendiCestino(db: AppDatabase): void {
  const sql = (db.prepare("SELECT sql FROM main.sqlite_master WHERE name='cestino' AND type='table'").get() as { sql: string } | undefined)?.sql;
  if (!sql || sql.includes("'voce-diario'")) return;
  const attese = ['id', 'uid', 'tipo', 'chiave', 'nome', 'contesto', 'riepilogo_json', 'registro_json', 'con_partite', 'vicini_json', 'eliminato_il'];
  const cols = (db.prepare('PRAGMA main.table_info(cestino)').all() as Array<{ name: string }>).map((r) => r.name);
  if (JSON.stringify(cols) !== JSON.stringify(attese)) throw new Error('136: schema cestino inatteso, nessuna ricostruzione con perdita di colonne.');
  const ddlAtteso=`CREATE TABLE cestino (
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('area','voce','mappa','area-dedalo','area-fisica','luogo','negozio','richiesta','oggetto')),
    chiave TEXT NOT NULL, nome TEXT NOT NULL, contesto TEXT NOT NULL DEFAULT '',
    riepilogo_json TEXT NOT NULL DEFAULT '{}', registro_json TEXT NOT NULL,
    con_partite INTEGER NOT NULL DEFAULT 0 CHECK (con_partite IN (0,1)), vicini_json TEXT, eliminato_il TEXT NOT NULL
  )`;
  // Rimuove solo spazi esterni ai letterali; non rende equivalenti CHECK o valori diversi.
  const normalizzaDDL=(s:string):string=>{let out='',citazione=false;for(let i=0;i<s.length;i++){const c=s[i]!;if(c==="'"){out+=c;if(citazione&&s[i+1]==="'"){out+="'";i++;continue;}citazione=!citazione;}else if(citazione||!/[\s;]/.test(c))out+=c;}return out;};
  const dichiarazione=sql.replace(/^CREATE TABLE\s+"cestino"/,'CREATE TABLE cestino');
  if(normalizzaDDL(dichiarazione)!==normalizzaDDL(ddlAtteso))throw new Error('136: DDL cestino diverso dalla versione121 nota; vincoli aggiuntivi non eliminati.');
  if(db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='trigger' AND tbl_name='cestino' LIMIT 1").get())throw new Error('136: trigger aggiuntivo sul cestino; ricostruzione rifiutata.');
  const indici=db.prepare('PRAGMA main.index_list(cestino)').all() as Array<{name:string;unique:number;origin:string;partial:number}>;
  if(indici.length!==2)throw new Error('136: insieme indici cestino diverso da quello noto.');
  for(const indice of indici){const colonne=db.prepare('SELECT name FROM pragma_index_info(?, ?) ORDER BY seqno').all(indice.name,'main') as Array<{name:string}>;
    if(indice.origin==='u'&&indice.unique===1&&indice.partial===0&&JSON.stringify(colonne.map((c)=>c.name))==='["uid"]')continue;
    const ddl=(db.prepare("SELECT sql FROM main.sqlite_master WHERE type='index' AND name=?").get(indice.name) as {sql:string|null}|undefined)?.sql;
    if(indice.name!=='idx_cestino_eliminato'||indice.origin!=='c'||indice.unique!==0||indice.partial!==0||!ddl||normalizzaDDL(ddl)!==normalizzaDDL('CREATE INDEX idx_cestino_eliminato ON cestino(eliminato_il)'))throw new Error('136: indice aggiuntivo o diverso sul cestino, nessun DROP.');
  }
  const firmaRighe=():string=>{const h=createHash('sha256');for(const r of db.prepare(`SELECT ${attese.join(',')} FROM main.cestino ORDER BY id`).iterate())h.update(JSON.stringify(r)+'\n');return h.digest('hex');};
  const prima=firmaRighe();
  const seq = (db.prepare("SELECT seq FROM main.sqlite_sequence WHERE name='cestino'").get() as { seq: number } | undefined)?.seq ?? 0;
  const massimoPrima=(db.prepare('SELECT COALESCE(MAX(id),0) AS n FROM main.cestino').get() as {n:number}).n;
  if(!Number.isSafeInteger(seq)||seq<0||seq<massimoPrima)throw new Error('136: sequenza cestino incoerente, nessuna normalizzazione o sostituzione.');
  db.exec(`CREATE TABLE main.cestino_136 (
    id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK(tipo IN ('area','voce','mappa','area-dedalo','area-fisica','luogo','negozio','richiesta','oggetto','voce-diario')),
    chiave TEXT NOT NULL,nome TEXT NOT NULL,contesto TEXT NOT NULL DEFAULT '',riepilogo_json TEXT NOT NULL DEFAULT '{}',
    registro_json TEXT NOT NULL,con_partite INTEGER NOT NULL DEFAULT 0 CHECK(con_partite IN (0,1)),vicini_json TEXT,eliminato_il TEXT NOT NULL);
    INSERT INTO main.cestino_136 SELECT id,uid,tipo,chiave,nome,contesto,riepilogo_json,registro_json,con_partite,vicini_json,eliminato_il FROM main.cestino;
    DROP TABLE main.cestino; ALTER TABLE main.cestino_136 RENAME TO cestino;
    CREATE INDEX main.idx_cestino_eliminato ON cestino(eliminato_il);`);
  const massimo = (db.prepare('SELECT COALESCE(MAX(id),0) AS n FROM main.cestino').get() as { n: number }).n;
  db.prepare("DELETE FROM main.sqlite_sequence WHERE name='cestino'").run();
  db.prepare("INSERT INTO main.sqlite_sequence(name,seq) VALUES('cestino',?)").run(Math.max(seq, massimo));
  if(firmaRighe()!==prima||(db.prepare("SELECT seq FROM main.sqlite_sequence WHERE name='cestino'").get() as {seq:number}).seq!==Math.max(seq,massimo))throw new Error('136: righe o sequenza del cestino non conservate integralmente, transazione annullata.');
}

function bonifica(db: AppDatabase, adesso: string): void {
  if (db.prepare('SELECT 1 FROM main.audit_aojiru_136 WHERE id=1').get()) return;
  const a = db.prepare('SELECT * FROM main.articolo WHERE chiave=?').get(ARTICOLO) as Riga | undefined;
  const c = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave=?').get(CATALOGO) as Riga | undefined;
  let esito = 'esclusa', motivo = 'Firma pubblica non coincidente: valori correnti conservati.';
  const uguale = (r: Riga, campi: Riga) => Object.entries(campi).every(([k, v]) => r[k] === v);
  const firmaA = a && uguale(a, { chiave: ARTICOLO, negozio_chiave: 'chiosco-kiyasuku', nome: 'Succo Aojiru', nome_it: null, categoria: 'consumabile', per: 'Joker', prezzo: 5000,
    statistiche: null, effetto_json: null, origine: 'seed', nascosto: 0, seed_json: null, condizioni_json: '[{"tipo":"giorno-settimana","giorni":["domenica"]}]',
    oggetto_fonte: null, oggetto_chiave: null, catalogo_chiave: CATALOGO, costo_json: null, articolo_condiviso: null });
  const firmaC = c && uguale(c, { chiave: CATALOGO, categoria: 'consumabile', sottocategoria: null, nome: 'Succo Aojiru', nomi_altri_json: '[]', nome_originale: null,
    descrizione: '', statistiche_json: '{"per":"Joker","testo":null}', fonte_tipo: 'listino', fonte_chiave: ARTICOLO, origine: 'seed', seed_json: null, nascosto: 0 });
  let foto = false;
  const contiene = (raw: unknown): boolean => {
    if (typeof raw !== 'string') return true;
    let x: unknown; try { x = JSON.parse(raw); } catch { return true; }
    if(!Array.isArray(x))return true;
    const sequenze=new Set<number>();
    for(const p of x){
      if(!p||typeof p!=='object'||Array.isArray(p))return true;
      const passo=p as Riga;
      if(!Number.isSafeInteger(passo.seq)||Number(passo.seq)<0||sequenze.has(Number(passo.seq))||typeof passo.tabella!=='string'||typeof passo.op!=='string'||!['D','U','I'].includes(passo.op))return true;
      sequenze.add(Number(passo.seq));
      const cols=db.prepare('SELECT name,pk FROM pragma_table_info(?, ?) ORDER BY pk').all(passo.tabella,'main') as Array<{name:string;pk:number}>;
      if(!cols.length)return true;
      const pk=cols.filter((c)=>c.pk>0).map((c)=>c.name),identita=pk.length?pk:['rowid'];
      for(const lato of passo.op==='D'?['prima']:passo.op==='I'?['dopo']:['prima','dopo']){
        const r=passo[lato];if(!r||typeof r!=='object'||Array.isArray(r)||identita.some((k)=>!Object.hasOwn(r,k)||(typeof (r as Riga)[k]!=='string'&&!Number.isSafeInteger((r as Riga)[k]))))return true;
      }
      if((passo.op==='D'&&Object.hasOwn(passo,'dopo'))||(passo.op==='I'&&Object.hasOwn(passo,'prima')))return true;
    }
    const visita = (v: unknown): boolean => {
      if (typeof v === 'string') return v === ARTICOLO || v === CATALOGO;
      if (Array.isArray(v)) return v.some(visita);
      return !!v && typeof v === 'object' && Object.entries(v).some(([k, y]) => k === ARTICOLO || k === CATALOGO || visita(y));
    };
    return visita(x);
  };
  for (const r of db.prepare('SELECT registro_json FROM main.cestino').all() as Array<{ registro_json: string }>) if (contiene(r.registro_json)) foto = true;
  if (!a || !c) { esito = 'assente'; motivo = 'Articolo o identità del catalogo assente: nessuna ricreazione.'; }
  else if (foto) motivo = 'Fotografia pertinente o registro cestino non leggibile: blocco escluso, nessun ripristino parziale.';
  else if(db.prepare('SELECT 1 FROM main.articolo WHERE (catalogo_chiave=? AND chiave<>?) OR articolo_condiviso=? LIMIT 1').get(CATALOGO,ARTICOLO,ARTICOLO)||db.prepare('SELECT 1 FROM main.negozio WHERE listino_condiviso=? LIMIT 1').get('chiosco-kiyasuku'))motivo='Condivisioni o altre offerte riferiscono la stessa identità: intero blocco escluso, nessuna variante riscritta.';
  else if (firmaA && firmaC && a.effetto === DOPO && c.effetto === DOPO) { esito = 'gia-corretta'; motivo = 'Entrambe le firme coincidono con il dopo pubblico atteso.'; }
  else if (firmaA && firmaC && a.effetto === PRIMA && c.effetto === PRIMA) { esito = 'rettificata'; motivo = 'Guardia pubblica93 e trasformazione deterministica121 coincidenti.'; }
  // Audit scritto prima delle sole due mutazioni; la TX della migrazione comprende tutto.
  db.prepare('INSERT INTO main.audit_aojiru_136(id,versione,articolo_chiave,catalogo_chiave,esito,motivo,prima_json,dopo_json,creato_il) VALUES(1,1,?,?,?,?,?,?,?)')
    .run(ARTICOLO,CATALOGO,esito, motivo, JSON.stringify({ articolo: a ?? null, catalogo: c ?? null }), JSON.stringify({ effetto: DOPO }), adesso);
  if (esito === 'rettificata') {
    if (db.prepare('UPDATE main.articolo SET effetto=? WHERE chiave=? AND effetto IS ? AND origine=\'seed\' AND seed_json IS NULL').run(DOPO, ARTICOLO, PRIMA).changes !== 1
      || db.prepare('UPDATE main.catalogo_oggetto SET effetto=? WHERE chiave=? AND effetto IS ? AND origine=\'seed\' AND seed_json IS NULL').run(DOPO, CATALOGO, PRIMA).changes !== 1) throw new Error('136: CAS della rettifica Aojiru non riuscito.');
  }
}

export const migration136: Migration = {
  id: 136, name: 'aojiru_e_effetti_voce',
  up(db) {
    db.exec(`CREATE TABLE main.voce_effetto (
      uid TEXT NOT NULL UNIQUE CHECK(length(uid)=32), voce_uid TEXT NOT NULL REFERENCES voce_giornata(uid) ON DELETE CASCADE,
      ordine INTEGER NOT NULL CHECK(ordine>=0), tipo TEXT NOT NULL, chiave TEXT, dati_json TEXT NOT NULL CHECK(json_valid(dati_json)),
      origine TEXT NOT NULL CHECK(origine IN ('seed','regola','utente')), updated_at TEXT NOT NULL, PRIMARY KEY(voce_uid,ordine));
    CREATE TABLE main.voce_effetto_transizione (
      voce_uid TEXT PRIMARY KEY REFERENCES voce_giornata(uid) ON DELETE CASCADE,
      stato TEXT NOT NULL CHECK(stato IN ('convertita','legacy-da-correggere')), raw_json TEXT NOT NULL,
      motivo TEXT, impronta TEXT NOT NULL, aggiornata_il TEXT NOT NULL);
    CREATE TABLE main.proposta_effetto_voce (
      id TEXT PRIMARY KEY, voce_uid TEXT NOT NULL REFERENCES voce_giornata(uid) ON DELETE CASCADE,
      tipo TEXT NOT NULL, chiave TEXT, gruppo TEXT NOT NULL DEFAULT '', dati_json TEXT NOT NULL CHECK(json_valid(dati_json)),
      motivo TEXT NOT NULL, certezza TEXT NOT NULL CHECK(certezza IN ('certa','probabile','da-verificare')),
      stato TEXT NOT NULL DEFAULT 'aperta' CHECK(stato IN ('aperta','confermata','scartata')), updated_at TEXT NOT NULL);
    CREATE UNIQUE INDEX main.proposta_effetto_identita ON proposta_effetto_voce(voce_uid,tipo,COALESCE(chiave,''),gruppo);
    CREATE TABLE main.operazione_effetti_voce(id TEXT PRIMARY KEY,voce_uid TEXT NOT NULL,payload_json TEXT NOT NULL,prima_json TEXT NOT NULL,dopo_json TEXT NOT NULL,creata_il TEXT NOT NULL);
    CREATE TABLE main.audit_aojiru_136(id INTEGER PRIMARY KEY CHECK(id=1),versione INTEGER NOT NULL CHECK(versione=1),articolo_chiave TEXT NOT NULL,catalogo_chiave TEXT NOT NULL,esito TEXT NOT NULL,motivo TEXT NOT NULL,prima_json TEXT NOT NULL,dopo_json TEXT NOT NULL,creato_il TEXT NOT NULL);`);
    const adesso = new Date().toISOString();
    for (const v of db.prepare('SELECT uid,produce_json,azione FROM main.voce_giornata ORDER BY uid').all() as Array<{ uid: string; produce_json: string; azione: string }>) {
      const raw = v.produce_json, effetti = typeof raw === 'string' ? converti(raw) : null;
      db.prepare('INSERT INTO main.voce_effetto_transizione(voce_uid,stato,raw_json,motivo,impronta,aggiornata_il) VALUES(?,?,?,?,?,?)')
        .run(v.uid, effetti === null ? 'legacy-da-correggere' : 'convertita', typeof raw === 'string' ? raw : JSON.stringify(raw), effetti === null ? 'Documento legacy non convertibile integralmente: RAW conservato.' : null, createHash('sha256').update(String(raw)).digest('hex'), adesso);
      for (const [ordine, e] of (effetti ?? []).entries()) {
        const r = e as Riga;
        db.prepare('INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,?,?,?,?,?)')
          .run(uid(`136\0${v.uid}\0${ordine}\0${raw}`), v.uid, ordine, r.tipo, r.chiave ?? r.dote ?? r.attivita ?? null, JSON.stringify(e), 'regola', adesso);
      }
      if (/aojiru/i.test(v.azione)) db.prepare('INSERT INTO main.proposta_effetto_voce(id,voce_uid,tipo,chiave,gruppo,dati_json,motivo,certezza,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(uid(`136-proposta\0${v.uid}`), v.uid, 'acquisto', ARTICOLO, 'aojiru', JSON.stringify({ articolo: ARTICOLO, variante: null, fortuna: null, sostituisceDoti: [] }), 'Candidato dal testo: confermare identità, variante osservata e conteggio precedente; nessuna consumazione è stata dedotta.', 'da-verificare', adesso);
    }
    estendiCestino(db);
    bonifica(db, adesso);
  },
};
