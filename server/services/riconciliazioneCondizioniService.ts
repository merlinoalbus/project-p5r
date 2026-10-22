import { createHash } from 'node:crypto';
import { getDb, nowIso } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { SCHEMI_CATALOGO_PARZIALI } from '../schemas/catalogo.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { aggiornaElemento } from './catalogoService.js';
import { nomiCondizioni } from './condizioni/nomiCondizioni.js';
import { invitiCheAprono, tuttiGliInviti } from './condizioni/condizioneEffettiva.js';
import { fonteConfidenteAttivita } from './fonteConfidenteAttivitaService.js';
import { condizioneDelRequisito, type RigaRequisito } from './semaforiService.js';
import { descriviOrari, descriviOrariDelLuogo, leggiOrari, orariDelLuogo } from '../../shared/orariNegozio.js';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { GRUPPI_FRASI_CONDIZIONI, REVISIONE_RICONCILIAZIONE, type GruppoFraseCondizioni } from '../../shared/riconciliazioneCondizioniManifest.js';
import { ARTICOLO_AOJIRU, CATALOGO_AOJIRU, PREZZO_AOJIRU, eOffertaAojiru } from '../../shared/acquisti.js';
import { ATTIVITA_PESCA, SFIDA_PESCA, REGOLA_PESCA } from '../../shared/pesca.js';
import { leggiRegolaPesca, rigaRegolaPesca } from './regolePescaService.js';
import { campiAutonomiAttivitaPesca } from '../../shared/attivitaPesca.js';
import type { DecisioneCondizioni, DecisioneCondizioniInput, DipendenzaRiconciliazione, FormulaRiconciliazione, RigaRiconciliazioneDto,
  RiconciliazioneCondizioniDto, TabellaRiconciliazione } from '../../shared/riconciliazioneCondizioni.js';

type Riga = Record<string, unknown>;
const TABELLE = ['luogo', 'negozio', 'attivita', 'articolo'] as const;
const PREFISSO = 'riconciliazione-condizioni/';
const ATTIVITA_TAKEMI = 'esperimenti-clinici-takemi';
const AUDIT_TAKEMI = 'rettifica-attivita-takemi-135';
const stringa = (x: unknown): string | null => typeof x === 'string' ? x : null;
const record = (x: unknown): Riga | null => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as Riga : null;
function canonico(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canonico);
  if (!x || typeof x !== 'object') return x;
  return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonico(v)]));
}
const json = (x: unknown) => JSON.stringify(canonico(x));
const impronta = (x: unknown) => createHash('sha256').update(json(x)).digest('hex');
function decodifica(x: unknown): unknown { if (typeof x !== 'string') return x; try { return JSON.parse(x) as unknown; } catch { return undefined; } }
function casa(tabella: string, chiave: string): string | null {
  const k = chiave.split('/').map(encodeURIComponent).join('/');
  if (tabella === 'luogo') return `/guida/luogo/${k}`;
  if (tabella === 'negozio') return `/guida/negozi/${encodeURIComponent(chiave)}`;
  if (tabella === 'quartiere') return `/guida/citta/${encodeURIComponent(chiave)}`;
  if (tabella === 'confidente') return `/confidenti/${encodeURIComponent(chiave)}`;
  if (tabella === 'attivita') return '/guida/attivita';
  return null;
}
interface Proposta { dopo: RequisitoSpillo[]; prima: RequisitoSpillo[][]; identita: Riga; contesto?: { tabella: 'quartiere'; chiave: string; identita: Riga } }
const data = (dal: string): RequisitoSpillo => ({ tipo: 'data', dal });
const conf = (confidente: string, rango: number): RequisitoSpillo => ({ tipo: 'confidente', confidente, rango });
/** Solo formule INTERE con fonte e forma precedente attestate. Le altre proposte restano leggibili, senza scrittura presunta. */
function proposta(g: GruppoFraseCondizioni, chiave: string): Proposta | null {
  // Confronti soltanto informativi: prima vuoto impedisce di applicare una parte delle bonifiche atomiche130/134.
  if (g.id === 'A12' && chiave === ATTIVITA_TAKEMI) return { dopo: [], prima: [], identita: { chiave: ATTIVITA_TAKEMI, confidente_chiave: 'takemi' } };
  if (g.id === 'L26') return { dopo: [data('05-07')], prima: [], identita: {
    chiave: 'mementos/ingresso-mementos', quartiere_chiave: 'mementos', origine: 'seed', nascosto: 0,
    ordine: 0, tipo: 'trasporto', nome: 'Ingresso ai Memento',
    cosa_offre: 'Accesso al dungeon procedurale dei Memento tramite la metropolitana di Shibuya; qui si ricevono e completano le richieste dei cittadini.',
    quando: null, giorni: null, sblocco: 'dopo il primo Palazzo (Kamoshida)', confidenti_json: '[]',
    attivita_json: '["richieste secondarie"]', negozio: null, piatti_json: null, note: null,
    fonte: 'https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/', verificato: 0, giorni_json: '[]',
    area_chiave: null, orari_json: null, solo_eventi_confidente: null, fonte_condizioni_json: null,
  }, contesto: { tabella: 'quartiere', chiave: 'mementos', identita: {
    chiave: 'mementos', sblocco: null, sblocco_data: null, fonte: 'https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/',
    condizioni_json: null, condizioni_guida_json: null, fonte_condizioni_json: null, fonte_condizioni_guida_json: null,
  } } };
  if (g.id === 'N14') return { dopo: [
    { tipo: 'finestra-palazzo', dungeon: 'niijima' },
    { tipo: 'non', condizione: { tipo: 'palazzo', dungeon: 'niijima' } },
    { tipo: 'gruppo', modo: 'almeno-una', condizioni: [
      { tipo: 'evento', evento: 'niijima-banco-soci-accessibile' },
      { tipo: 'evento', evento: 'niijima-banco-alte-accessibile' },
    ] },
  ], prima: [], identita: { chiave: 'negozio-palazzo-niijima', origine: 'seed', nascosto: 0,
    sede_chiave: null, luogo_chiave: null, condizioni_json: '[]', seed_json: null, listino_condiviso: null,
    orari_json: '{"giorni":[],"fasce":[],"chiusoConPioggia":false,"nota":"solo durante l’esplorazione del Palazzo"}', eccezione_orari_json: null } };
  if (g.id === 'A08') return { dopo: [data('04-09')], prima: [[{ tipo: 'intervallo', dal: '04-09', al: '05-20' }]],
    identita: { tipo: 'studio', sede_chiave: 'shujin-academy/biblioteca-shujin' } };
  if (g.id === 'A13') return { dopo: [conf('shinya', 1), data('09-04')],
    prima: [[conf('shinya', 1), data('09-04'), { tipo: 'richiesta', richiesta: 'i-vincenti-non-imbrogliano' }]],
    identita: { tipo: 'mini-gioco', sede_chiave: 'akihabara/sala-giochi-akihabara' } };
  if (g.id === 'I41' || g.id === 'I43') {
    const film = g.id === 'I41';
    const q: RequisitoSpillo = { tipo: 'quartiere', quartiere: 'shinjuku' };
    return { dopo: [q, { tipo: 'contatore', cosa: film ? 'film-con-una-visione' : 'videogiochi-giocati', almeno: 1 }],
      prima: [[q, { tipo: 'contatore', cosa: film ? 'film-completati' : 'videogiochi-completati', almeno: 1 }]],
      identita: { negozio_chiave: 'hinokuniya', catalogo_chiave: `libro/${film ? 'anima-da-cineasta' : 'segreti-di-gioco'}` } };
  }
  if (g.id === 'I73') {
    const mansarda: RequisitoSpillo = { tipo: 'evento', evento: 'mansarda-pulita' };
    return { dopo: [data('04-18'), data('11-25'), { tipo: 'non', condizione: mansarda }],
      prima: [[data('04-18'), data('11-25'), { tipo: 'gruppo', modo: 'almeno-una', condizioni: [
        { tipo: 'non', condizione: mansarda }, { tipo: 'gruppo', modo: 'tutte', condizioni: [mansarda, data('04-18')] }] }]],
      identita: { negozio_chiave: 'libreria-taiheido', catalogo_chiave: `libro/${chiave.slice('libreria-taiheido/'.length)}` } };
  }
  // Confronti senza applicazione: forme intere censite nel pacchetto pubblico 93.
  // Le copie di altri requisiti restano esplicite; non si elimina un operando perché non è citato nella frase.
  const qShinjuku: RequisitoSpillo = { tipo: 'quartiere', quartiere: 'shinjuku' };
  const giorni = (giorni: string[]): RequisitoSpillo => ({ tipo: 'giorno-settimana', giorni });
  const att = (attivita: string): RequisitoSpillo => ({ tipo: 'attivita', attivita, volte: 1 });
  const pieni: Record<string, RequisitoSpillo[]> = {
    I01: [{ tipo: 'quartiere', quartiere: 'kichijoji' }, { tipo: 'punti-negozio', negozio: 'vestiti-usati-kichijoji', punti: 150 }],
    I02: [{ tipo: 'quartiere', quartiere: 'kichijoji' }, { tipo: 'punti-negozio', negozio: 'vestiti-usati-kichijoji', punti: 50 }],
    I07: [conf('sojiro', 10)], I08: [conf('sojiro', 2)], I09: [conf('sojiro', 4)], I10: [conf('sojiro', 6)],
    I11: [conf('sojiro', 9), { tipo: 'richiesta', richiesta: 'lo-zio-ingordo' }],
    I13: [data('04-18'), { tipo: 'intervallo', dal: '08-28', al: '10-10' }],
    I34: [qShinjuku, { tipo: 'evento', evento: 'primo-strumento-creato' }], I35: [data('04-18'), att('biliardo')],
    I36: [qShinjuku, att('freccette')], I37: [qShinjuku, att('lavoro-rafflesia')],
    I40: [qShinjuku, att('pesca-ichigaya')], I42: [qShinjuku, att('centro-battute-yongen-jaya')],
    I58: [data('04-18'), conf('haru', 10)], I64: [giorni(['venerdi'])],
    I65: [data('04-18'), { tipo: 'stagione', stagione: 'autunno' }],
    I66: [...(chiave === 'triple-seven/soba-calmante' ? [data('04-18')] : []), { tipo: 'stagione', stagione: 'estate' }],
    I67: [...(chiave === 'venditore-patate-dolci/yaki-imo-leggendario' ? [data('10-09'), { tipo: 'meteo', condizione: 'non-piove' } as RequisitoSpillo] : []), { tipo: 'stagione', stagione: 'inverno' }],
    I68: [data('04-18'), { tipo: 'stagione', stagione: 'primavera' }],
    I70: [{ tipo: 'quartiere', quartiere: 'kichijoji' }, data('06-05'), giorni(['domenica']), { tipo: 'fascia', fascia: 'sera' }],
    I72: [...(chiave === 'prossimo-asso/frullato-iperproteico' ? [data('04-18')] : []), { tipo: 'piove' }],
  };
  const dateTv: Record<string, string> = { I14: '05-01', I15: '12-11', I16: '11-13', I17: '08-14', I18: '01-15', I19: '05-15', I20: '06-19',
    I21: '10-02', I22: '01-22', I23: '05-22', I24: '04-24', I25: '09-25', I26: '06-26', I27: '11-27', I28: '01-29',
    I29: '05-29', I30: '07-03', I31: '11-06', I32: '08-07', I33: '05-08' };
  if (dateTv[g.id]) pieni[g.id] = [giorni(['domenica']), { tipo: 'intervallo', dal: dateTv[g.id], al: dateTv[g.id] }];
  const rangoSfida = ({ I52: 2, I53: 3, I54: 4 } as Record<string, number>)[g.id];
  if (rangoSfida) pieni[g.id] = [data('04-18'), ...['coraggio', 'conoscenza', 'perizia'].map((dote): RequisitoSpillo => ({ tipo: 'dote', dote, rango: rangoSfida }))];
  const rangoVenditore = ({ I55: 2, I56: 3, I57: 5 } as Record<string, number>)[g.id];
  if (rangoVenditore) pieni[g.id] = [giorni(['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi']), { tipo: 'fascia', fascia: 'sera' },
    { tipo: 'meteo', condizione: 'non-piove' }, { tipo: 'dote', dote: 'fascino', rango: rangoVenditore }];
  if (pieni[g.id]) return { dopo: pieni[g.id], prima: [], identita: { negozio_chiave: chiave.split('/')[0] } };
  return null;
}

/** Sola proiezione dei due esiti, senza prima-immagini. La fonte corrente non dimostra che la migrazione sia passata. */
function auditTakemi(r: Riga | undefined): { stato: NonNullable<RigaRiconciliazioneDto['statoAuditConfidente']>; righe: RigaRiconciliazioneDto['auditMigrazioni'] } {
  const a = record(decodifica(r?.json));
  const attivita = record(a?.attivita), beneficio = record(a?.beneficio);
  const valido = a?.versione === 1 && attivita?.chiave === ATTIVITA_TAKEMI && beneficio?.confidente === 'takemi' && beneficio.rango === 8
    && typeof attivita.esito === 'string' && ['rettificata', 'gia-corretta', 'assente', 'esclusa'].includes(attivita.esito)
    && typeof beneficio.esito === 'string' && ['aggiunto', 'gia-corretto', 'escluso'].includes(beneficio.esito)
    && typeof attivita.motivo === 'string' && !!attivita.motivo.trim() && typeof beneficio.motivo === 'string' && !!beneficio.motivo.trim();
  if (!valido || !attivita || !beneficio) {
    const stato = r ? 'illeggibile' : 'assente';
    return { stato, righe: [] };
  }
  return { stato: 'leggibile', righe: [
    { migrazione: 135, esito: attivita.esito === 'rettificata' ? 'applicata' : attivita.esito === 'gia-corretta' ? 'gia-corretta' : 'esclusa', motivo: `Attività: esito originale135 ${attivita.esito}. ${attivita.motivo}` },
    { migrazione: 135, esito: beneficio.esito === 'aggiunto' ? 'applicata' : beneficio.esito === 'gia-corretto' ? 'gia-corretta' : 'esclusa', motivo: `Beneficio verso rango8: esito originale135 ${beneficio.esito}. ${beneficio.motivo}` },
  ] };
}
function auditAojiru(righe: Riga[]): { stato: NonNullable<RigaRiconciliazioneDto['statoAuditAcquisto']>; righe: RigaRiconciliazioneDto['auditMigrazioni'] } {
  if (!righe.length) return { stato: 'assente', righe: [] };
  const a = righe[0];
  const campi = ['id','versione','articolo_chiave','catalogo_chiave','esito','motivo','prima_json','dopo_json','creato_il'];
  const prima = record(decodifica(a?.prima_json)), dopo = record(decodifica(a?.dopo_json));
  const valido = righe.length === 1 && a?.id === 1 && a.versione === 1 && a.articolo_chiave === ARTICOLO_AOJIRU && a.catalogo_chiave === CATALOGO_AOJIRU
    && Object.keys(a).length === campi.length && campi.every(c => c in a)
    && typeof a.esito === 'string' && ['rettificata','gia-corretta','assente','esclusa'].includes(a.esito)
    && typeof a.motivo === 'string' && !!a.motivo.trim() && typeof a.creato_il === 'string'
    && prima !== null && Object.keys(prima).length === 2 && 'articolo' in prima && 'catalogo' in prima
    && (prima.articolo === null || record(prima.articolo)?.chiave === ARTICOLO_AOJIRU)
    && (prima.catalogo === null || record(prima.catalogo)?.chiave === CATALOGO_AOJIRU)
    && typeof dopo?.effetto === 'string' && !!dopo.effetto.trim();
  if (!valido || !a) return { stato: 'illeggibile', righe: [] };
  return { stato: 'leggibile', righe: [{ migrazione: 136,
    esito: a.esito === 'rettificata' ? 'applicata' : a.esito === 'gia-corretta' ? 'gia-corretta' : 'esclusa',
    motivo: `Articolo e testo del catalogo: esito originale136 ${String(a.esito)}. ${String(a.motivo)}` }] };
}
function auditPesca(righe:Riga[]):{stato:NonNullable<RigaRiconciliazioneDto['statoAuditPesca']>;righe:RigaRiconciliazioneDto['auditMigrazioni']} {
  if(!righe.length)return {stato:'assente',righe:[]};
  const a=righe[0]!,campi=['id','versione','regola_chiave','esito','motivo','attivita_json','prima_json','dopo_json','copertura_json','creato_il'];
  const att=decodifica(a.attivita_json),prima=decodifica(a.prima_json),dopo=decodifica(a.dopo_json),copertura=record(decodifica(a.copertura_json));
  const esiti=['rettificata','gia-corretta','assente','esclusa'];
  if(righe.length!==1||Object.keys(a).length!==campi.length||campi.some(c=>!(c in a))||a.id!==1||a.versione!==1||a.regola_chiave!==REGOLA_PESCA||!esiti.includes(String(a.esito))||typeof a.motivo!=='string'||typeof a.creato_il!=='string'||!Number.isFinite(Date.parse(a.creato_il))||!Array.isArray(att)||att.length!==2||att.some((x,i)=>{const r=record(x);return !r||Object.keys(r).length!==3||r.chiave!==[ATTIVITA_PESCA,SFIDA_PESCA][i]||!esiti.includes(String(r.esito))||typeof r.motivo!=='string';})||!Array.isArray(prima)||prima.length!==2||prima.some(r=>r!==null&&!record(r))||!Array.isArray(dopo)||dopo.length!==2||dopo.some(r=>r!==null&&!record(r))||!copertura||Object.keys(copertura).length!==4||typeof copertura.leggibile!=='boolean'||['registri','passi','pertinenti'].some(c=>!Number.isSafeInteger(copertura[c])||Number(copertura[c])<0))return {stato:'illeggibile',righe:[]};
  return {stato:'leggibile',righe:att.map((x,i)=>{const r=record(x)!;return {migrazione:138,esito:r.esito==='rettificata'?'applicata':r.esito==='gia-corretta'?'gia-corretta':'esclusa',motivo:`${i===0?'Visita A02':'Obiettivi A10'}: esito originale138 ${String(r.esito)}. ${String(r.motivo)}`};})};
}
interface Registro { attuale: DecisioneCondizioni; storico: DecisioneCondizioni[] }
function decisione(x: unknown): x is DecisioneCondizioni {
  const r = record(x);
  return !!r && Number.isInteger(r.revisione) && Number(r.revisione) > 0 && typeof r.data === 'string'
    && typeof r.improntaFonte === 'string' && typeof r.revisioneManifest === 'string'
    && ['conferma-corrente', 'applica-proposta', 'mantieni-nota'].includes(String(r.azione));
}
function registro(raw: unknown): Registro | null {
  if (raw == null) return null;
  const r = record(decodifica(raw));
  if (!r || !decisione(r.attuale) || !Array.isArray(r.storico) || !r.storico.every(decisione)) {
    throw httpErrors.conflict('decisione-illeggibile', 'Una decisione salvata non è leggibile. I dati sono stati conservati.');
  }
  return { attuale: r.attuale, storico: r.storico };
}

/** Un'unica fotografia transazionale; non esporta righe grezze o fotografie seed al client. */
function fotografia(): { dto: RiconciliazioneCondizioniDto; proposte: Map<string, Proposta>; registri: Map<string, Registro> } {
  const db = getDb();
  const nomi = nomiCondizioni({ conPin: true });
  const tabelle = new Map<string, Map<string, Riga>>();
  const leggiTabella = (t: string): Map<string, Riga> => {
    // Tutti gli identificatori provengono dalle chiamate interne sottostanti, mai dal client.
    const nota = tabelle.get(t); if (nota) return nota;
    const rows = db.prepare(`SELECT * FROM main.${t}`).all() as Riga[];
    const m = new Map(rows.map((r) => [String(r.chiave ?? r.id), r])); tabelle.set(t, m); return m;
  };
  for (const t of TABELLE) leggiTabella(t);
  const inviti = tuttiGliInviti();
  const formula = (raw: unknown): FormulaRiconciliazione => {
    if (raw == null) return { valore: [], testo: ['Nessuna condizione propria'], errore: null };
    const a = decodifica(raw);
    if (!Array.isArray(a)) return { valore: null, testo: [], errore: 'Condizioni non leggibili: dato conservato.' };
    const risultato = condizioneSpillo.array().safeParse(a);
    if (!risultato.success) return { valore: null, testo: [], errore: 'Condizioni fuori dal vocabolario corrente: dato conservato.' };
    if (json(a) !== json(risultato.data)) return { valore: null, testo: [], errore: 'La formula contiene una forma storica o campi aggiuntivi: conservata senza normalizzazione.' };
    return { valore: risultato.data, testo: risultato.data.length ? risultato.data.map((c) => descriviRequisitoSpillo(c, nomi)) : ['Nessuna condizione propria'], errore: null };
  };
  const dati = leggiTabella('dati_guida');
  const tabellaAuditAojiruPresente = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='audit_aojiru_136'").get();
  const righeAuditAojiru = tabellaAuditAojiruPresente ? db.prepare('SELECT * FROM main.audit_aojiru_136 ORDER BY id').all() as Riga[] : [];
  const tabellaAuditPescaPresente=!!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='audit_pesca_138'").get();
  const righeAuditPesca=tabellaAuditPescaPresente?db.prepare('SELECT * FROM main.audit_pesca_138 ORDER BY id').all() as Riga[]:[];
  const aud = [123, 124].map((n) => ({ n, valore: record(decodifica(dati.get(n === 123 ? 'bonifica-condizioni-letture-123' : 'bonifica-condizioni-attivita-124')?.json)) }));
  // PK composte: array ordinati dedicati, senza la mappa chiave/id di leggiTabella.
  const fontiConfidenti = new Map<string, { raw: Riga; requisiti: Riga[]; guida: Riga[] }>();
  const fotografaConfidente = (k: string) => {
    const gia = fontiConfidenti.get(k); if (gia) return gia;
    const leggi = (tabella: string, ordine: string) => {
      const presente = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name=?").get(tabella);
      const righe = presente ? db.prepare(`SELECT * FROM main.${tabella} WHERE ${tabella === 'confidente' ? 'chiave' : 'confidente_chiave'}=? ORDER BY ${ordine}`).all(k) as Riga[] : [];
      return { presente, righe };
    };
    const identita = leggi('confidente', 'chiave');
    const disponibilita = leggi('confidente_disponibilita', 'confidente_chiave');
    const requisiti = leggi('confidente_requisito', 'rango,indice');
    const guida = leggi('confidente_requisito_guida', 'rango,indice');
    const benefici = leggi('confidente_dote_incontro', 'verso_rango');
    const f = { raw: { identita, disponibilita, requisiti, guida, benefici }, requisiti: requisiti.righe, guida: guida.righe };
    fontiConfidenti.set(k, f); return f;
  };
  const registri = new Map<string, Registro>();
  const proposte = new Map<string, Proposta>();
  const manifest = new Map<string, GruppoFraseCondizioni>();
  for (const g of GRUPPI_FRASI_CONDIZIONI) for (const k of g.chiavi) manifest.set(`${g.tabella}:${k}:${g.campoFrase}`, g);
  const ids = new Set(manifest.keys());
  for (const t of TABELLE) for (const [k, r] of leggiTabella(t)) {
    const campo = t === 'articolo' ? 'condizione' : 'sblocco';
    if (typeof r[campo] === 'string' && r[campo].trim()) ids.add(`${t}:${k}:${campo}`);
  }
  const righe: RigaRiconciliazioneDto[] = [];
  for (const id of ids) {
    const primoSeparatore = id.indexOf(':'), ultimoSeparatore = id.lastIndexOf(':');
    const tabella = id.slice(0, primoSeparatore) as TabellaRiconciliazione;
    const chiave = id.slice(primoSeparatore + 1, ultimoSeparatore);
    const campoFrase = id.slice(ultimoSeparatore + 1);
    const g = manifest.get(id);
    const r = leggiTabella(tabella).get(chiave);
    const a12 = g?.id === 'A12' && tabella === 'attivita' && chiave === ATTIVITA_TAKEMI;
    const i71 = g?.id === 'I71' && tabella === 'articolo' && chiave === ARTICOLO_AOJIRU;
    const a10=g?.id==='A10'&&tabella==='attivita'&&chiave===SFIDA_PESCA;
    const fontePesca=a10&&r?.pesca_regola_chiave===REGOLA_PESCA&&r.pesca_ruolo==='obiettivi'?{regola:leggiRegolaPesca(),ruolo:'obiettivi' as const}:null;
    const motiviPesca=a10?campiAutonomiAttivitaPesca(r??{}):[];
    if(a10&&!fontePesca)motiviPesca.push('L’attività non rimanda al profilo canonico degli obiettivi.');
    if(a10&&fontePesca?.regola.stato!=='collegata')motiviPesca.push('La regola della guida non è leggibile o presente.');
    const informazionePesca=a10?{tipo:'ichigaya' as const,compatibilitaTecnicaRegistrazione:!!fontePesca&&fontePesca.regola.stato==='collegata'&&!motiviPesca.length,motivi:motiviPesca}:undefined;
    const auditFontePesca=a10?auditPesca(righeAuditPesca):null;
    const auditAcquisto = i71 ? auditAojiru(righeAuditAojiru) : null;
    const motiviAcquisto: string[] = [];
    if (i71) {
      if (!r) motiviAcquisto.push('Offerta assente: nessuna ricreazione.');
      else {
        if (!eOffertaAojiru({ chiave, catalogoChiave: r.catalogo_chiave as string | null })) motiviAcquisto.push('Il collegamento non rientra nel predicato tecnico del gesto Aojiru.');
        if (r.catalogo_chiave == null) motiviAcquisto.push('Catalogo non risolto: NULL è tecnicamente ammesso dal gesto, non dimostra un’identità canonica.');
        if (r.prezzo !== PREZZO_AOJIRU || r.costo_json != null || r.articolo_condiviso != null) motiviAcquisto.push('Prezzo, costo o condivisione divergono dal gesto di registrazione riconosciuto.');
      }
    }
    const informazioneAcquisto = i71 ? { tipo: 'aojiru' as const,
      regola: 'Domenica; 5000 yen e 2 punti interni (1 nota) di base. Fascino → Perizia → Coraggio → Gentilezza → Conoscenza: la rotazione avanza con le consumazioni confermate, senza calendario assoluto. Fortuna e precedente conteggio restano dichiarazioni esplicite.',
      compatibilitaTecnicaRegistrazione: !!r && eOffertaAojiru({ chiave, catalogoChiave: r.catalogo_chiave as string | null }) && r.prezzo === PREZZO_AOJIRU && r.costo_json == null && r.articolo_condiviso == null,
      motivi: motiviAcquisto } : undefined;
    const fonteConfidente = a12 && r ? fonteConfidenteAttivita(r) : null;
    const auditConfidente = a12 ? auditTakemi(dati.get(AUDIT_TAKEMI)) : null;
    const campo = tabella === 'negozio' ? 'sblocco_json' : 'condizioni_json';
    const dipendenze = new Map<string, unknown>();
    if(a10){dipendenze.set('pesca:regola',rigaRegolaPesca());dipendenze.set('pesca:audit138',{presente:tabellaAuditPescaPresente,righe:righeAuditPesca});dipendenze.set('pesca:visita',leggiTabella('attivita').get(ATTIVITA_PESCA)??null);}
    const fontiEreditate: DipendenzaRiconciliazione[] = [];
    const viste = new Set<string>();
    const mostrate = new Set<string>();
    let dipendenzeIncomplete = false;
    // Anche i riferimenti dentro gruppi/NON entrano nell'impronta. Un ciclo non tronca le altre dipendenze.
    const riferimenti = (x: unknown): void => {
      if (Array.isArray(x)) { x.forEach(riferimenti); return; }
      const c = record(x); if (!c) return;
      const chiavi: Record<string, [string, string]> = {
        luogo: ['luogo', 'luogo'], quartiere: ['quartiere', 'quartiere'], invito: ['confidente_invito', 'invito'],
        confidente: ['confidente', 'confidente'], articolo: ['articolo', 'articolo'], attivita: ['attivita', 'attivita'],
        richiesta: ['richiesta', 'richiesta'], palazzo: ['dungeon', 'dungeon'], arco: ['dungeon', 'dungeon'],
        'finestra-palazzo': ['dungeon', 'dungeon'], 'rango-cliente': ['negozio', 'negozio'], 'punti-negozio': ['negozio', 'negozio'],
      };
      const ref = chiavi[String(c.tipo)];
      if (ref && typeof c[ref[1]] === 'string') acquisisci(ref[0], String(c[ref[1]]), false);
      if (c.tipo === 'lettura' && (c.categoria === 'libro' || c.categoria === 'film') && typeof c.chiave === 'string') acquisisci(c.categoria, c.chiave, false);
      Object.values(c).forEach((v) => { if (typeof v === 'object') riferimenti(v); });
    };
    const acquisisci = (t: string, k: string, mostra: boolean): void => {
      const identita = `${t}:${k}`;
      const fonte = leggiTabella(t).get(k);
      if (!fonte) dipendenzeIncomplete = true;
      if (fonte) {
        for (const f of ['condizioni_json', 'sblocco_json']) if (f in fonte && formula(fonte[f]).errore) dipendenzeIncomplete = true;
        for (const f of ['orari_json', 'eccezione_orari_json']) if (fonte[f] != null && !record(decodifica(fonte[f]))) dipendenzeIncomplete = true;
      }
      const mostraNuova = mostra && !mostrate.has(identita);
      if (mostraNuova) {
        mostrate.add(identita);
        const cf = t === 'negozio' ? 'sblocco_json' : 'condizioni_json';
        const rawOrari = fonte?.eccezione_orari_json ?? fonte?.orari_json;
        const orari = rawOrari != null && !record(decodifica(rawOrari)) ? 'Orari non leggibili: dato conservato.'
          : t === 'luogo' ? descriviOrariDelLuogo(orariDelLuogo(stringa(fonte?.orari_json)))
            : rawOrari != null ? descriviOrari(leggiOrari(stringa(rawOrari))) : null;
        fontiEreditate.push({ tipo: t, chiave: k, nome: String(fonte?.nome_it ?? fonte?.nome ?? k), campo: cf,
          formula: fonte ? formula(fonte[cf]) : null, orari: fonte ? orari : null,
          casa: casa(t, k), mancante: !fonte });
      }
      if (viste.has(identita) && !mostraNuova) return;
      viste.add(identita); dipendenze.set(identita, fonte ?? null);
      if (!fonte) return;
      for (const [f, v] of Object.entries(fonte)) if (f.includes('condizioni') || f === 'sblocco_json') riferimenti(decodifica(v));
      if (typeof fonte.sede_chiave === 'string') acquisisci('luogo', fonte.sede_chiave, mostra);
      if (typeof fonte.quartiere_chiave === 'string') acquisisci('quartiere', fonte.quartiere_chiave, mostra);
      if (typeof fonte.listino_condiviso === 'string') acquisisci('negozio', fonte.listino_condiviso, mostra);
      if (typeof fonte.articolo_condiviso === 'string') acquisisci('articolo', fonte.articolo_condiviso, mostra);
      if (t === 'luogo' || t === 'quartiere') {
        const attinenti = invitiCheAprono(t, k, inviti);
        // L'insieme vuoto è parte dell'impronta: aggiungere il primo invito invalida la conferma.
        dipendenze.set(`inviti:${identita}`, attinenti);
        for (const i of attinenti) acquisisci('confidente_invito', String(i.chiave), mostra);
      }
    };
    if (r) {
      acquisisci(tabella, chiave, false);
      if (typeof r.negozio_chiave === 'string') acquisisci('negozio', r.negozio_chiave, true);
      if (typeof r.sede_chiave === 'string') acquisisci('luogo', r.sede_chiave, true);
      if (typeof r.quartiere_chiave === 'string') acquisisci('quartiere', r.quartiere_chiave, true);
      if (tabella === 'luogo') for (const i of inviti.filter((i) => i.apre_tipo === 'luogo' && i.apre_chiave === chiave)) acquisisci('confidente_invito', String(i.chiave), true);
      // Articoli e attività possono avere un legame al Catalogo che determina l'identità mostrata.
      if (typeof r.catalogo_chiave === 'string') acquisisci('catalogo_oggetto', r.catalogo_chiave, false);
    }
    if (a12) {
      for (const k of new Set(['takemi', ...(typeof r?.confidente_chiave === 'string' ? [r.confidente_chiave] : [])])) {
        const f = fotografaConfidente(k);
        dipendenze.set(`fonte-confidente:${k}`, f.raw);
        for (const requisito of [...f.requisiti, ...f.guida]) {
          let c: RequisitoSpillo | null = null;
          try { c = condizioneDelRequisito(requisito as unknown as RigaRequisito); } catch { /* il RAW resta nell'impronta */ }
          if (!c) dipendenzeIncomplete = true;
          else riferimenti(c);
        }
      }
      // Anche l'assenza e il RAW illeggibile fanno parte del CAS: non si firma una fonte troncata.
      dipendenze.set(`audit:${AUDIT_TAKEMI}`, { presente: dati.has(AUDIT_TAKEMI), raw: dati.get(AUDIT_TAKEMI) ?? null });
    }
    if (i71) {
      dipendenze.set('audit:aojiru-136', { presente: tabellaAuditAojiruPresente, righe: righeAuditAojiru });
      acquisisci('catalogo_oggetto', CATALOGO_AOJIRU, false);
    }
    const proprie = r ? formula(r[campo]) : { valore: null, testo: [], errore: 'Oggetto assente: condizioni non disponibili.' };
    const fonteA12Valida = a12 && r?.confidente_chiave === 'takemi' && fonteConfidente?.chiave === 'takemi' && fonteConfidente.stato === 'collegato'
      && !fonteConfidente.campiIncompatibili.length && !proprie.errore && proprie.valore?.length === 0 && !dipendenzeIncomplete;
    const p = g && (!a12 || fonteA12Valida) ? proposta(g, chiave) : null;
    const contestoProposta = p?.contesto ? leggiTabella(p.contesto.tabella).get(p.contesto.chiave) : null;
    const propostaValida = p && r && Object.entries(p.identita).every(([k, v]) => json(r[k]) === json(v))
      && (!p.contesto || (contestoProposta && Object.entries(p.contesto.identita).every(([k, v]) => json(contestoProposta[k]) === json(v))));
    const frase = stringa(r?.[campoFrase]);
    const esitoFonte = !r ? 'assente' : !g ? 'nuova' : frase === g.fraseStorica ? 'presente-identica' : 'mutata';
    const esitoFormula = !g || g.analisi === 'ricerca' ? 'da-ricercare' : !p || !propostaValida || proprie.errore ? 'non-confrontabile'
      : json(proprie.valore) === json(p.dopo) ? 'coincide' : 'diversa';
    // Il delta informativo I71 non riapre le altre decisioni: per esse la
    // fotografia resta identica alla revisione precedente, comprese le sue fonti.
    const revisioneFonte = i71 ? REVISIONE_RICONCILIAZIONE : '2026-10-21.3';
    const improntaFonte = impronta({ revisione: revisioneFonte, g: g ?? null, r: r ?? null, dipendenze: [...dipendenze].sort(([a], [b]) => a.localeCompare(b)), proposta: p });
    const reg = registro(dati.get(PREFISSO + id)?.json);
    if (reg) registri.set(id, reg);
    const precedente = reg?.attuale;
    const azioni: RigaRiconciliazioneDto['azioniConsentite'] = [];
    if (r) azioni.push('mantieni-nota');
    const fraseRaccordataA12 = fonteA12Valida && r?.sblocco === null;
    if (r && g && (esitoFonte === 'presente-identica' || fraseRaccordataA12) && !proprie.errore && !dipendenzeIncomplete && !fontiEreditate.some((f) => f.mancante || f.formula?.errore)) {
      if (propostaValida || g.analisi === 'solo-nota') azioni.push('conferma-corrente');
      // Nessuna riscrittura verso un listino condiviso implicito; resta raggiungibile l'editor ordinario.
      const negozio = tabella === 'articolo' ? leggiTabella('negozio').get(String(r.negozio_chiave)) : r;
      if (propostaValida && p && p.prima.some((a) => json(a) === json(proprie.valore)) && !negozio?.listino_condiviso && !r.articolo_condiviso) {
        azioni.push('applica-proposta'); proposte.set(id, p);
      }
    }
    const auditMigrazioni: RigaRiconciliazioneDto['auditMigrazioni'] = [];
    if (auditConfidente) auditMigrazioni.push(...auditConfidente.righe);
    if (auditAcquisto) auditMigrazioni.push(...auditAcquisto.righe);
    if(auditFontePesca)auditMigrazioni.push(...auditFontePesca.righe);
    const origineAudit = `${tabella}:${chiave}`;
    for (const a of aud) {
      const arr = (campoAudit: string) => Array.isArray(a.valore?.[campoAudit]) ? a.valore[campoAudit] as unknown[] : [];
      if (arr('convertite').includes(origineAudit)) auditMigrazioni.push({ migrazione: a.n, esito: 'applicata', motivo: 'Riga convertita dalla bonifica; le modifiche successive restano distinte.' });
      if (arr('giaCorrette').includes(origineAudit)) auditMigrazioni.push({ migrazione: a.n, esito: 'gia-corretta', motivo: 'Formula già corrispondente al momento della bonifica.' });
      for (const v of arr('escluse')) {
        const e = record(v);
        if (e?.origine === origineAudit) auditMigrazioni.push({ migrazione: a.n, esito: 'esclusa', motivo: String(e.motivo ?? 'Dati preservati.') });
      }
    }
    // Gli audit puntuali non certificano la formula corrente: esito storico e confronto restano separati.
    // Nessuna decisione dell'utente viene creata o riscritta per la sola presenza del rendiconto.
    const auditPuntuale = g?.id === 'L26' ? { numero: 130, chiave: 'rettifica-ingresso-memento-130', bersaglio: 'luogo' }
      : g?.id === 'N14' ? { numero: 134, chiave: 'rettifica-banchi-niijima-134', bersaglio: 'negozio' } : null;
    if (auditPuntuale) {
      const a = record(decodifica(dati.get(auditPuntuale.chiave)?.json));
      const esiti = auditPuntuale.numero === 130 ? ['rettificata', 'gia-corretta', 'assente', 'personale', 'conflitto']
        : ['applicata', 'gia-corretta', 'assente', 'esclusa'];
      if (a?.versione === 1 && a[auditPuntuale.bersaglio] === chiave && typeof a.esito === 'string'
        && esiti.includes(a.esito) && typeof a.motivo === 'string') {
        auditMigrazioni.push({ migrazione: auditPuntuale.numero,
          esito: a.esito === 'rettificata' || a.esito === 'applicata' ? 'applicata' : a.esito === 'gia-corretta' ? 'gia-corretta' : 'esclusa',
          motivo: `Esito originale${auditPuntuale.numero}: ${a.esito}. ${a.motivo}` });
      }
    }
    const canonicoOggetto = typeof r?.catalogo_chiave === 'string' ? leggiTabella('catalogo_oggetto').get(r.catalogo_chiave) : null;
    righe.push({ id, gruppo: g?.id ?? null, tabella, chiave, nome: String(canonicoOggetto?.nome ?? r?.nome_it ?? r?.nome ?? chiave) || chiave,
      casa: tabella === 'articolo' && r?.negozio_chiave ? casa('negozio', String(r.negozio_chiave)) : casa(tabella, chiave),
      fraseStorica: g?.fraseStorica ?? null, fraseAttuale: frase, origine: stringa(r?.origine), nascosto: r?.nascosto === 1,
      notaConservata: g?.notaDaConservare ?? 'Frase nuova: resta conservata; interpretazione da ricercare.', classeStorica: g?.classeStorica ?? null,
      analisi: g?.analisi ?? 'ricerca', propostaTesto: g?.propostaTesto ?? 'Nuova frase rispetto al censimento pubblico: richiede una proposta documentata.',
      fonti: g?.fonti ?? [], destinazione: g ? { tabella, chiave, campo } : null, condizioniProprie: proprie, fontiEreditate,
      formulaProposta: p ? formula(p.dopo) : null, esitoFonte, esitoFormula, auditMigrazioni,
      ...(a12 ? { fonteConfidente, statoAuditConfidente: auditConfidente!.stato } : {}),
      ...(i71 ? { informazioneAcquisto, statoAuditAcquisto: auditAcquisto!.stato } : {}),
      ...(a10?{fontePesca,informazionePesca,statoAuditPesca:auditFontePesca!.stato}:{}),
      decisione: precedente ? { ...precedente, daRiconfermare: precedente.improntaFonte !== improntaFonte, storico: reg!.storico } : null,
      azioniConsentite: azioni, improntaFonte, revisioneAttesa: impronta({ improntaFonte, registro: reg }) });
  }
  return { proposte, registri, dto: { versione: 1, revisioneManifest: REVISIONE_RICONCILIAZIONE, completo: true, righe,
    totali: { storiche: manifest.size, presenti: righe.filter((r) => r.esitoFonte === 'presente-identica').length,
      mutate: righe.filter((r) => r.esitoFonte === 'mutata').length, nuove: righe.filter((r) => r.esitoFonte === 'nuova').length,
      assenti: righe.filter((r) => r.esitoFonte === 'assente').length, daRicercare: righe.filter((r) => r.esitoFormula === 'da-ricercare').length,
      confermate: righe.filter((r) => r.decisione && !r.decisione.daRiconfermare && r.decisione.azione !== 'mantieni-nota').length,
      daRiconfermare: righe.filter((r) => r.decisione?.daRiconfermare).length } } };
}
export function riconciliazioneCondizioni(): RiconciliazioneCondizioniDto { return getDb().transaction(() => fotografia().dto)(); }

export function decidiCondizioni(input: DecisioneCondizioniInput): RiconciliazioneCondizioniDto {
  const db = getDb();
  return db.transaction(() => {
    const prima = fotografia();
    const r = prima.dto.righe.find((x) => x.id === input.id);
    if (!r) throw httpErrors.notFound('frase-non-trovata', 'La frase non è più presente nel censimento.');
    if (r.revisioneAttesa !== input.revisioneAttesa) throw httpErrors.conflict('riconciliazione-obsoleta', 'Fonti o decisioni sono cambiate. Rileggi la proposta prima di decidere.');
    if (!r.azioniConsentite.includes(input.azione)) throw httpErrors.conflict('decisione-non-ammessa', 'Questa proposta non è applicabile ai dati correnti. Nessuna modifica eseguita.');
    if (input.azione === 'applica-proposta') {
      const p = prima.proposte.get(input.id);
      if (!p || !r.destinazione) throw httpErrors.conflict('proposta-incompleta', 'La proposta non contiene una modifica completa.');
      const validati = SCHEMI_CATALOGO_PARZIALI[r.tabella].parse({ [r.destinazione.campo]: p.dopo });
      aggiornaElemento(r.tabella, r.chiave, validati);
    }
    const dopo = fotografia().dto.righe.find((x) => x.id === input.id)!;
    const precedente = prima.registri.get(input.id);
    const nuovo: Registro = { attuale: { revisione: (precedente?.attuale.revisione ?? 0) + 1, azione: input.azione,
      data: nowIso(), improntaFonte: dopo.improntaFonte, revisioneManifest: REVISIONE_RICONCILIAZIONE },
    storico: precedente ? [...precedente.storico, precedente.attuale] : [] };
    // La transazione serializza read-CAS-write; nessuna decisione viene persa e la fonte risultante non include il record stesso.
    db.prepare('INSERT INTO main.dati_guida(chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO UPDATE SET json=excluded.json').run(PREFISSO + input.id, JSON.stringify(nuovo));
    return fotografia().dto;
  })();
}
