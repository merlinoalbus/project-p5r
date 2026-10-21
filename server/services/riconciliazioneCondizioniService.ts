import { createHash } from 'node:crypto';
import { getDb, nowIso } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { SCHEMI_CATALOGO_PARZIALI } from '../schemas/catalogo.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { aggiornaElemento } from './catalogoService.js';
import { nomiCondizioni } from './condizioni/nomiCondizioni.js';
import { invitiCheAprono, tuttiGliInviti } from './condizioni/condizioneEffettiva.js';
import { descriviOrari, descriviOrariDelLuogo, leggiOrari, orariDelLuogo } from '../../shared/orariNegozio.js';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { GRUPPI_FRASI_CONDIZIONI, REVISIONE_RICONCILIAZIONE, type GruppoFraseCondizioni } from '../../shared/riconciliazioneCondizioniManifest.js';
import type { DecisioneCondizioni, DecisioneCondizioniInput, DipendenzaRiconciliazione, FormulaRiconciliazione, RigaRiconciliazioneDto,
  RiconciliazioneCondizioniDto, TabellaRiconciliazione } from '../../shared/riconciliazioneCondizioni.js';

type Riga = Record<string, unknown>;
const TABELLE = ['luogo', 'negozio', 'attivita', 'articolo'] as const;
const PREFISSO = 'riconciliazione-condizioni/';
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
interface Proposta { dopo: RequisitoSpillo[]; prima: RequisitoSpillo[][]; identita: Riga }
const data = (dal: string): RequisitoSpillo => ({ tipo: 'data', dal });
const conf = (confidente: string, rango: number): RequisitoSpillo => ({ tipo: 'confidente', confidente, rango });
/** Solo formule INTERE con fonte e forma precedente attestate. Le altre proposte restano leggibili, senza scrittura presunta. */
function proposta(g: GruppoFraseCondizioni, chiave: string): Proposta | null {
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
  const aud = [123, 124].map((n) => ({ n, valore: record(decodifica(dati.get(n === 123 ? 'bonifica-condizioni-letture-123' : 'bonifica-condizioni-attivita-124')?.json)) }));
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
    const campo = tabella === 'negozio' ? 'sblocco_json' : 'condizioni_json';
    const dipendenze = new Map<string, unknown>();
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
    const proprie = r ? formula(r[campo]) : { valore: null, testo: [], errore: 'Oggetto assente: condizioni non disponibili.' };
    const p = g ? proposta(g, chiave) : null;
    const propostaValida = p && r && Object.entries(p.identita).every(([k, v]) => json(r[k]) === json(v));
    const frase = stringa(r?.[campoFrase]);
    const esitoFonte = !r ? 'assente' : !g ? 'nuova' : frase === g.fraseStorica ? 'presente-identica' : 'mutata';
    const esitoFormula = !g || g.analisi === 'ricerca' ? 'da-ricercare' : !p || !propostaValida || proprie.errore ? 'non-confrontabile'
      : json(proprie.valore) === json(p.dopo) ? 'coincide' : 'diversa';
    const improntaFonte = impronta({ revisione: REVISIONE_RICONCILIAZIONE, g: g ?? null, r: r ?? null, dipendenze: [...dipendenze].sort(([a], [b]) => a.localeCompare(b)), proposta: p });
    const reg = registro(dati.get(PREFISSO + id)?.json);
    if (reg) registri.set(id, reg);
    const precedente = reg?.attuale;
    const azioni: RigaRiconciliazioneDto['azioniConsentite'] = [];
    if (r) azioni.push('mantieni-nota');
    if (r && g && esitoFonte === 'presente-identica' && !proprie.errore && !dipendenzeIncomplete && !fontiEreditate.some((f) => f.mancante || f.formula?.errore)) {
      if (propostaValida || g.analisi === 'solo-nota') azioni.push('conferma-corrente');
      // Nessuna riscrittura verso un listino condiviso implicito; resta raggiungibile l'editor ordinario.
      const negozio = tabella === 'articolo' ? leggiTabella('negozio').get(String(r.negozio_chiave)) : r;
      if (propostaValida && p && p.prima.some((a) => json(a) === json(proprie.valore)) && !negozio?.listino_condiviso && !r.articolo_condiviso) {
        azioni.push('applica-proposta'); proposte.set(id, p);
      }
    }
    const auditMigrazioni: RigaRiconciliazioneDto['auditMigrazioni'] = [];
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
    const canonicoOggetto = typeof r?.catalogo_chiave === 'string' ? leggiTabella('catalogo_oggetto').get(r.catalogo_chiave) : null;
    righe.push({ id, gruppo: g?.id ?? null, tabella, chiave, nome: String(canonicoOggetto?.nome ?? r?.nome_it ?? r?.nome ?? chiave) || chiave,
      casa: tabella === 'articolo' && r?.negozio_chiave ? casa('negozio', String(r.negozio_chiave)) : casa(tabella, chiave),
      fraseStorica: g?.fraseStorica ?? null, fraseAttuale: frase, origine: stringa(r?.origine), nascosto: r?.nascosto === 1,
      notaConservata: g?.notaDaConservare ?? 'Frase nuova: resta conservata; interpretazione da ricercare.', classeStorica: g?.classeStorica ?? null,
      analisi: g?.analisi ?? 'ricerca', propostaTesto: g?.propostaTesto ?? 'Nuova frase rispetto al censimento pubblico: richiede una proposta documentata.',
      fonti: g?.fonti ?? [], destinazione: g ? { tabella, chiave, campo } : null, condizioniProprie: proprie, fontiEreditate,
      formulaProposta: p ? formula(p.dopo) : null, esitoFonte, esitoFormula, auditMigrazioni,
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
