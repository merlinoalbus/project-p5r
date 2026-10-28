import { createHash, randomBytes } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { avanzaDopoChiusuraAutomatica, avanzaUnaVoltaAllaFine, prelevaAvanzamentoValido } from './avanzamentoGiornataService.js';
import { eDote, puntiDaNote, type DoteChiave } from '../../shared/doti.js';
import { AOJIRU_NOTE, type NuovaRegistrazioneAcquisto } from '../../shared/acquisti.js';
import type { EffettoVoceDto } from '../../shared/effettiVoce.js';
import { eEffettoCheSomma, eEffettoDiStato, normalizzaEffettoVoce } from '../../shared/effettiVoce.js';
import { avvisoScortaPiena, motivoPersonaConScortaAdesso, statoGiaVero, statoSegnatoDallaVoce } from './effettiDiStatoService.js';
import type { AnteprimaDecisioneProposteDto, DecisioneProposte, MovimentoPropostoDto, PropostaPartitaDto, RicevutaDecisioneProposteDto, RichiestaAnteprimaDecisioneProposte, RichiestaDecisioneProposte, SaldoBeneficioDto } from '../../shared/propostePartita.js';
import { deltaCertoPesca, type IntervalloBeneficioPesca, type NuovaSessionePesca } from '../../shared/pesca.js';
import { targetBeneficiPesca, leggiPescaPartita, fotografiaPesca } from './pescaLetture.js';
import { yenPropostiInSospeso } from './yenAutomaticiService.js';
import { yenPrevistiApprovando } from './sfideDellaVoce.js';

export const nuovoUid = (): string => randomBytes(16).toString('hex');
export function jsonCanonico(v: unknown): string {
  const visti = new Set<object>();
  const ordina = (x: unknown): unknown => {
    if (x == null || typeof x === 'string' || typeof x === 'boolean') return x ?? null;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (typeof x !== 'object') throw httpErrors.conflict('registro-non-valido', 'Un valore del registro non è serializzabile.');
    if (visti.has(x)) throw httpErrors.conflict('registro-non-valido', 'Il registro contiene un ciclo.');
    visti.add(x);
    let out: unknown;
    if (x instanceof Set) out = [...x].map(ordina).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    else if (x instanceof Map) out = [...x].map(([k,y]) => [ordina(k),ordina(y)]).sort((a,b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0])));
    else if (Array.isArray(x)) out = x.map(ordina);
    else out = Object.fromEntries(Object.entries(x).filter(([,y]) => y !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,y]) => [k,ordina(y)]));
    visti.delete(x); return out;
  };
  return JSON.stringify(ordina(v));
}
export const improntaDato = (v: unknown): string => createHash('sha256').update(jsonCanonico(v)).digest('hex');
export function leggiJsonRegistro<T>(raw: string, contesto = 'registro'): T {
  try { return JSON.parse(raw) as T; } catch { throw httpErrors.conflict('registro-non-valido', `Il ${contesto} non è leggibile: nessun dato viene azzerato.`); }
}
export function leggiOggettoRegistro(raw:string,contesto='registro'):Record<string,unknown> {
  const x=leggiJsonRegistro<unknown>(raw,contesto);if(!x||typeof x!=='object'||Array.isArray(x))throw httpErrors.conflict('registro-non-valido',`Il ${contesto} non contiene un oggetto riconoscibile: nessun dato viene azzerato.`);return x as Record<string,unknown>;
}

/** L13 (decisione 3, utente 047): `richiesta` = gli yen di una Richiesta completata, `chiave` = la chiave della Richiesta. */
type Causa = { tipo: 'acquisto' | 'voce' | 'pesca' | 'richiesta'; chiave: string };
/** La chiave di una Richiesta come la scrive `richiesteService` (slug, al più 200 caratteri). */
const CHIAVE_RICHIESTA = /^[a-z0-9][a-z0-9._-]{0,199}$/i;
/** `note`: per una Dote, le note (1–3) da cui vengono i punti, quando il beneficio viene da una fonte sola (`noteDellaRicevuta`): solo per
 *  dirle accanto ai punti, mai nella firma del beneficio (`firmaTarget`), così una proposta già decisa non rinasce. */
interface Beneficio { tipo: 'dote' | 'yen' | 'punti-pesca'; chiave: string; delta: number; motivo: string; fortunaIgnota?: boolean; storica?: boolean; intervallo?: IntervalloBeneficioPesca; note?: 1 | 2 | 3 }
interface Target extends Beneficio { attiva: boolean }
interface RigaProposta {
  id: number; uid: string; partita_id: number; voce_uid: string | null; causa_tipo: Causa['tipo']; causa_chiave: string;
  tipo: PropostaPartitaDto['tipo']; chiave: string; unita: PropostaPartitaDto['unita']; ciclo: number; revisione_causa: string;
  delta: number; dati_json: string; motivo: string; stato: PropostaPartitaDto['stato']; verifica: PropostaPartitaDto['verifica'];
  chiusa_da: 'utente' | 'causa' | null; motivo_chiusura: string | null; delta_applicato: number; delta_riconosciuto: number;
  applicazione_json: string | null; creata_il: string; decisa_il: string | null;
}
const righeCausa = (p: number, c: Causa): RigaProposta[] => prepared('SELECT * FROM utente.da_applicare WHERE partita_id=? AND causa_tipo=? AND causa_chiave=? ORDER BY id').all(p,c.tipo,c.chiave) as RigaProposta[];
const causaDi = (r: RigaProposta): Causa => {if((r.causa_tipo==='voce'&&!/^[0-9a-f]{32}:[0-9a-f]{32}$/.test(r.causa_chiave))||(['acquisto','pesca'].includes(r.causa_tipo)&&!/^[0-9a-f]{32}$/.test(r.causa_chiave))||(r.causa_tipo==='richiesta'&&!CHIAVE_RICHIESTA.test(r.causa_chiave)))throw httpErrors.conflict('causa-incoerente','Il registro contiene un’identità di causa non riconoscibile.');return { tipo: r.causa_tipo, chiave: r.causa_chiave };};
export const verificaBeneficio = (v: unknown): Beneficio => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw httpErrors.conflict('beneficio-non-valido', 'La ricevuta del beneficio non è valida.');
  const b = v as Record<string, unknown>;
  if ((b.tipo !== 'dote' && b.tipo !== 'yen' && b.tipo !== 'punti-pesca') || typeof b.chiave !== 'string' || !Number.isSafeInteger(b.delta) || (b.tipo === 'dote' && !eDote(b.chiave))) throw httpErrors.conflict('beneficio-non-valido', 'La ricevuta del beneficio ha identità o unità incoerenti.');
  let intervallo:IntervalloBeneficioPesca|undefined;
  if(b.intervallo!==undefined){const i=b.intervallo as IntervalloBeneficioPesca;if(!i||!Number.isSafeInteger(i.minimo)||(i.massimo!==null&&(!Number.isSafeInteger(i.massimo)||i.massimo<i.minimo)))throw httpErrors.conflict('beneficio-non-valido','Intervallo del beneficio non riconoscibile.');intervallo=i;}
  return { tipo: b.tipo, chiave: b.chiave, delta: b.delta as number, motivo: typeof b.motivo === 'string' ? b.motivo : 'Effetto confermato', fortunaIgnota: b.fortunaIgnota === true, storica: b.storica === true,...(intervallo?{intervallo}:{}) };
};

/**
 * Le note di una Dote della ricevuta della spunta (`ricevuta.legacy`: Doti della voce, delle letture, dei turni e dell'incontro), quando i suoi
 * punti vengono da una sola di queste con le note conosciute e lo stesso numero di punti: «Perizia ♪♪♪ · 5 punti» invece di «Perizia +5». Più
 * fonti sommate, note mancanti (ricevute di prima) o punti diversi: nessuna nota, restano i punti. Sola lettura, tollerante: una ricevuta che
 * non si legge così non ferma niente (la validano altrove).
 */
function noteDellaRicevuta(legacy: unknown, chiave: string, delta: number): 1 | 2 | 3 | undefined {
  if (!legacy || typeof legacy !== 'object') return undefined;
  const l = legacy as { doti?: unknown; letture?: unknown; turni?: unknown; incontro?: unknown };
  const elenco = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
  const dotiDi = (x: unknown): unknown[] => (x && typeof x === 'object' ? elenco((x as { doti?: unknown }).doti) : []);
  const tutte = [...elenco(l.doti), ...elenco(l.letture).flatMap(dotiDi), ...elenco(l.turni).flatMap(dotiDi), ...dotiDi(l.incontro)]
    .filter((d): d is { chiave: string; delta: number; note?: unknown } => !!d && typeof d === 'object' && (d as { chiave?: unknown }).chiave === chiave && typeof (d as { delta?: unknown }).delta === 'number' && (d as { delta: number }).delta !== 0);
  const sola = tutte.length === 1 ? tutte[0]! : undefined;
  return sola && sola.delta === delta && (sola.note === 1 || sola.note === 2 || sola.note === 3) ? sola.note : undefined;
}

function targetCausa(partita: number, causa: Causa): Target[] {
  if(causa.tipo==='richiesta'){
    // L13 (decisione 3): gli yen della Richiesta li applica solo la Richiesta completata (`richiesta.yen`): beneficio attivo finché è completata
    // nella partita; tolto il completamento (o eliminata la Richiesta) il beneficio resta descritto dalle righe di prima, non più attivo.
    // Decisione 18: la Richiesta completata muove i suoi yen da sola (`yenAutomaticiService.riallineaYenRichiesta`): qui il beneficio resta attivo
    // SOLO per una causa che ha ancora yen proposti in sospeso nel registro delle proposte (una proposta aperta, o yen applicati non tornati a
    // zero), così quella proposta resta decidibile e quella applicata ritrova la sua causa; altrimenti nessuna proposta «Applica» nuova
    const r=prepared("SELECT r.nome,r.yen FROM main.richiesta r JOIN utente.richiesta_partita p ON p.richiesta_chiave=r.chiave AND p.partita_id=? AND p.stato='completata' WHERE r.chiave=?").get(partita,causa.chiave) as {nome:string;yen:number|null}|undefined;
    const insieme=new Map<string,Target>();
    for(const x of righeCausa(partita,causa)){const b=verificaBeneficio(leggiOggettoRegistro(x.dati_json,'proposta richiesta').beneficio);insieme.set(`${b.tipo}\0${b.chiave}`,{...b,attiva:false});}
    if(r&&Number.isSafeInteger(r.yen)&&(r.yen as number)>0&&yenPropostiInSospeso(partita,'richiesta',causa.chiave))insieme.set('yen\0yen',{tipo:'yen',chiave:'yen',delta:r.yen as number,motivo:`Yen della Richiesta «${r.nome}» completata: applicali quando li ricevi nel gioco.`,fortunaIgnota:false,storica:false,attiva:true});
    return [...insieme.values()];
  }
  if(causa.tipo==='pesca'){
    const attuali=targetBeneficiPesca(partita,causa.chiave),insieme=new Map<string,Target>();
    for(const r of righeCausa(partita,causa)){const b=verificaBeneficio(leggiOggettoRegistro(r.dati_json,'proposta pesca').beneficio);insieme.set(`${b.tipo}\0${b.chiave}`,{...b,attiva:false});}
    for(const b of attuali)insieme.set(`${b.tipo}\0${b.chiave}`,b);
    return [...insieme.values()];
  }
  if (causa.tipo === 'acquisto') {
    const a = prepared('SELECT dati_json,prezzo_yen FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(partita,causa.chiave) as { dati_json: string; prezzo_yen: number } | undefined;
    if (a) {
      const d = leggiOggettoRegistro(a.dati_json,'consumo');
      if (d.regola !== 'aojiru' || d.versione !== 1 || !eDote(d.variante) || !(d.fortuna === null || typeof d.fortuna === 'boolean')||a.prezzo_yen!==5000||Object.keys(d).some((k)=>!['regola','versione','variante','fortuna'].includes(k))) throw httpErrors.conflict('consumo-non-valido','I dati della consumazione non sono validi.');
      const attiva = !!prepared('SELECT 1 FROM utente.acquisto_provenienza WHERE partita_id=? AND acquisto_id=? LIMIT 1').get(partita,causa.chiave);
      // Gli yen non sono più una proposta (BON-12): la proposta Dote porta il costo della consumazione come dato. L13 (decisione 18): la
      // consumazione nuova registrata dalla spunta di una voce li scala da sola dal saldo (`motoreDiario.yenDellEffetto`).
      return [
        // l'Aojiru dà una nota (♪) della Dote scelta: i punti con la regola unica, con la Fortuna solo se attestata (sconosciuta: la base certa)
        { tipo:'dote',chiave:d.variante,delta:puntiDaNote(AOJIRU_NOTE,false,d.fortuna === true),motivo:d.fortuna === null ? `Aojiru: sola base certa di ${puntiDaNote(AOJIRU_NOTE)} punti; bonus Fortuna non attestato.` : 'Dote della consumazione Aojiru confermata.',fortunaIgnota:d.fortuna === null,storica:true,attiva,note:AOJIRU_NOTE },
        ...righeCausa(partita,causa).filter((r)=>r.tipo==='yen'&&r.stato==='aperta'&&r.delta_applicato===0&&r.delta_riconosciuto===0).map((r):Target=>({...verificaBeneficio(leggiOggettoRegistro(r.dati_json,'proposta').beneficio),attiva:false})),
      ];
    }
  } else {
    const [voce, effetto] = causa.chiave.split(':');
    const ricevute = prepared('SELECT ricevuta_json FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? AND annullato_il IS NULL').all(partita,voce,effetto) as Array<{ ricevuta_json: string }>;
    if (ricevute.length > 1) throw httpErrors.conflict('ricevute-incoerenti','Più ricevute attive descrivono lo stesso effetto.');
    if (ricevute[0]) {
      const d = leggiOggettoRegistro(ricevute[0].ricevuta_json,'effetto applicato');
      if (!Array.isArray(d.benefici)) throw httpErrors.conflict('ricevuta-incoerente','La ricevuta non dichiara i propri benefici.');
      // le note della Dote dalla ricevuta della spunta, solo per dirle accanto ai punti (fuori dalla firma del beneficio)
      const correnti=d.benefici.map(verificaBeneficio).map((b) => {const note=b.tipo==='dote'?noteDellaRicevuta(d.legacy,b.chiave,b.delta):undefined;return {...b,...(note?{note}:{}),attiva:true};});
      const storici=new Map<string,Target>();
      for(const r of righeCausa(partita,causa))if(r.tipo!=='effetto-voce'){const b=verificaBeneficio(leggiOggettoRegistro(r.dati_json,'proposta').beneficio);storici.set(`${b.tipo}\0${b.chiave}`,{...b,attiva:false});}
      for(const b of correnti)storici.set(`${b.tipo}\0${b.chiave}`,b);
      return [...storici.values()];
    }
  }
  // L'assenza della causa è distinta da una ricevuta malformata. Conserva la descrizione dei suoi inversi.
  const visti = new Map<string,Target>();
  for (const r of righeCausa(partita,causa)) if (r.tipo !== 'effetto-voce') {
    const dati = leggiOggettoRegistro(r.dati_json,'proposta');
    const b = verificaBeneficio(dati.beneficio);
    visti.set(`${b.tipo}\0${b.chiave}`,{...b,attiva:false});
  }
  return [...visti.values()];
}

function saldo(partita: number, causa: Causa, t: Target): SaldoBeneficioDto {
  const righe = righeCausa(partita,causa).filter((r) => r.tipo === t.tipo && r.chiave === t.chiave);
  let attribuito = 0;
  for (const r of righe) {
    if (!Number.isSafeInteger(r.delta_applicato) || !Number.isSafeInteger(r.delta_riconosciuto)) throw httpErrors.conflict('saldo-incoerente','Il registro dei delta non è integro.');
    if (r.stato !== 'applicata' && (r.delta_applicato !== 0 || r.delta_riconosciuto !== 0)) throw httpErrors.conflict('saldo-incoerente','Un delta risulta attribuito senza decisione applicata.');
    if (r.stato === 'applicata') {
      if (!r.applicazione_json) throw httpErrors.conflict('saldo-incoerente','Manca la ricevuta di un delta attribuito.');
      const app = leggiOggettoRegistro(r.applicazione_json,'applicazione');
      if (app.deltaApplicato !== r.delta_applicato || app.deltaRiconosciuto !== r.delta_riconosciuto) throw httpErrors.conflict('saldo-incoerente','Ricevuta e delta attribuito divergono.');
      if(typeof app.operazioneId!=='string'||typeof app.decisione!=='string'||!['applica','gia-conteggiata','trasferimento'].includes(app.decisione)||(app.decisione==='applica'&&(r.delta_applicato!==r.delta||r.delta_riconosciuto!==0))||(app.decisione==='gia-conteggiata'&&(r.delta_applicato!==0||Math.sign(r.delta_riconosciuto)!==Math.sign(r.delta)||Math.abs(r.delta_riconosciuto)>Math.abs(r.delta))))throw httpErrors.conflict('saldo-incoerente','La decisione non dimostra il delta attribuito.');
      const operazione=prepared('SELECT payload_json,ricevuta_json FROM utente.proposta_operazione WHERE partita_id=? AND operazione_id=?').get(partita,app.operazioneId) as {payload_json:string;ricevuta_json:string}|undefined;
      const documento=operazione?leggiOggettoRegistro(operazione.ricevuta_json,'operazione del saldo'):null;
      if(!documento||documento.partitaId!==partita||documento.operazioneId!==app.operazioneId||!Array.isArray(documento.proposte)||!documento.proposte.some((x)=>!!x&&typeof x==='object'&&(x as Record<string,unknown>).id===r.id&&(x as Record<string,unknown>).uid===r.uid))throw httpErrors.conflict('saldo-incoerente','Manca il collegamento alla decisione durevole del delta.');
      const richiesta=leggiOggettoRegistro(operazione!.payload_json,'payload della decisione'),decisione=richiesta.decisione as Record<string,unknown>|undefined;
      if(documento.decisione!==app.decisione)throw httpErrors.conflict('saldo-incoerente','Payload e ricevuta della decisione non coincidono.');
      if(app.decisione==='trasferimento'){
        if(jsonCanonico(richiesta)!==jsonCanonico({tipo:'trasferimento',...(app.trasferimento as object)}))throw httpErrors.conflict('saldo-incoerente','Il payload del trasferimento non coincide con la prova.');
      }else{
        if(richiesta.operazioneId!==app.operazioneId||!decisione||decisione.tipo!==app.decisione)throw httpErrors.conflict('saldo-incoerente','La decisione non coincide con l’operazione registrata.');
        if(app.decisione==='gia-conteggiata'&&(decisione.quantita!==Math.abs(r.delta_riconosciuto)||jsonCanonico(decisione.proposta)!==jsonCanonico({id:r.id,uid:r.uid})))throw httpErrors.conflict('saldo-incoerente','Il riconoscimento non coincide con quantità e identità approvate.');
        if(app.decisione==='applica'&&(!Array.isArray(decisione.proposte)||jsonCanonico(decisione.proposte)!==jsonCanonico(documento.proposte)))throw httpErrors.conflict('saldo-incoerente','Il gruppo applicato non coincide con la decisione.');
      }
      if(app.decisione==='trasferimento')verificaCoppiaTrasferimento(partita,r,app,documento);
      if(r.tipo==='yen'&&r.delta_applicato!==0){const m=prepared('SELECT prima,delta,dopo,operazione_id,causa_tipo,causa_chiave FROM utente.movimento_yen WHERE partita_id=? AND proposta_uid=?').get(partita,r.uid) as {prima:number;delta:number;dopo:number;operazione_id:string;causa_tipo:string;causa_chiave:string}|undefined;const movimento=app.movimento as Record<string,unknown>|null;if(!m||!movimento||m.prima!==movimento.prima||m.delta!==r.delta_applicato||m.dopo!==movimento.dopo||m.dopo!==m.prima+m.delta||m.operazione_id!==app.operazioneId||m.causa_tipo!==r.causa_tipo||m.causa_chiave!==r.causa_chiave)throw httpErrors.conflict('saldo-yen-incoerente','Il movimento yen non coincide con la propria ricevuta.');}
      if(r.tipo==='punti-pesca'&&r.delta_applicato!==0){const m=prepared("SELECT prima,delta,dopo,operazione_id,causa_tipo,causa_chiave FROM utente.movimento_punti_pesca WHERE partita_id=? AND proposta_uid=? AND tipo='proposta'").get(partita,r.uid) as {prima:number;delta:number;dopo:number;operazione_id:string;causa_tipo:string;causa_chiave:string}|undefined;const movimento=app.movimento as Record<string,unknown>|null;if(!m||!movimento||m.prima!==movimento.prima||m.delta!==r.delta_applicato||m.dopo!==movimento.dopo||m.dopo!==m.prima+m.delta||m.operazione_id!==app.operazioneId||m.causa_tipo!==r.causa_tipo||m.causa_chiave!==r.causa_chiave)throw httpErrors.conflict('pesca-saldo-incoerente','Il movimento punti pesca non coincide con la decisione durevole.');}
      attribuito += r.delta_applicato + r.delta_riconosciuto;
      if(!Number.isSafeInteger(attribuito))throw httpErrors.conflict('saldo-incoerente','Il saldo non è rappresentabile esattamente.');
    }
  }
  const checkpoint = prepared('SELECT * FROM utente.beneficio_ciclo WHERE partita_id=? AND causa_tipo=? AND causa_chiave=? AND tipo=? AND chiave=?').get(partita,causa.tipo,causa.chiave,t.tipo,t.chiave) as Record<string,unknown> | undefined;
  const intervallo=t.intervallo?(t.attiva?t.intervallo:{minimo:0,massimo:0}):undefined;
  const dovuto = intervallo ? intervallo.minimo===intervallo.massimo?intervallo.minimo:null : t.attiva ? t.delta : 0;
  return { dovuto,attribuito,differenza:intervallo?deltaCertoPesca(intervallo,attribuito):dovuto!-attribuito,ciclo:Number(checkpoint?.ciclo ?? 1),revisione:improntaDato({causa,t,righe,checkpoint:checkpoint ?? null}),...(intervallo?{intervallo,residuoIgnoto:intervallo.minimo!==intervallo.massimo}:{}) };
}
const firmaTarget=(t:Target):string=>improntaDato({attiva:t.attiva,tipo:t.tipo,chiave:t.chiave,delta:t.delta,...(t.intervallo?{intervallo:t.intervallo}:{})});

interface ProvaTrasferimento {
  destinazioneTipo?: 'pesca';
  versione:1;ricevutaOrigine:string;ricevutaDestinazione:string;causaOrigine:string;acquistoDestinazione:string;
  dote:DoteChiave;quantita:number;primaOrigine:number;primaDestinazione:number;
  attribuzioniOrigine:Array<{id:number;uid:string;applicato:number;riconosciuto:number}>;
  attribuzioniDestinazione:Array<{id:number;uid:string;applicato:number;riconosciuto:number}>;
}
function verificaCoppiaTrasferimento(p:number,r:RigaProposta,app:Record<string,unknown>,documento:Record<string,unknown>):void {
  const prova=app.trasferimento as ProvaTrasferimento|undefined,c=app.contropartita as {id?:unknown;uid?:unknown}|undefined;
  if(!prova||prova.versione!==1||!eDote(prova.dote)||!Number.isSafeInteger(prova.quantita)||prova.quantita<=0||!Number.isSafeInteger(prova.primaOrigine)||prova.primaOrigine!==prova.quantita||!Number.isSafeInteger(prova.primaDestinazione)||prova.primaDestinazione<0||r.tipo!=='dote'||r.chiave!==prova.dote||r.unita!=='punti-interni'||r.delta_applicato!==0||!c||!Number.isSafeInteger(c.id)||typeof c.uid!=='string'||c.uid===r.uid||documento.decisione!=='trasferimento'||jsonCanonico(documento.trasferimento)!==jsonCanonico(prova))throw httpErrors.conflict('trasferimento-incoerente','Il trasferimento non dimostra quantità, unità e contropartita.');
  const altra=prepared('SELECT * FROM utente.da_applicare WHERE partita_id=? AND id=? AND uid=?').get(p,c.id,c.uid) as RigaProposta|undefined;
  const altraApp=altra?.applicazione_json?leggiOggettoRegistro(altra.applicazione_json,'contropartita'):null;
  const tipoDestinazione=prova.destinazioneTipo??'acquisto';
  if(tipoDestinazione!=='acquisto'&&tipoDestinazione!=='pesca')throw httpErrors.conflict('trasferimento-incoerente','Tipo della causa destinataria non riconoscibile.');
  const origine=r.causa_tipo==='voce'&&r.causa_chiave===prova.causaOrigine,destinazione=r.causa_tipo===tipoDestinazione&&r.causa_chiave===prova.acquistoDestinazione;
  if(!altra||!altraApp||(!origine&&!destinazione)||altra.stato!=='applicata'||altra.chiusa_da!=='causa'||r.chiusa_da!=='causa'||altra.tipo!=='dote'||altra.chiave!==r.chiave||altra.unita!==r.unita||altra.delta_applicato!==0||altra.delta_riconosciuto!==-r.delta_riconosciuto||r.delta!==r.delta_riconosciuto||altra.delta!==altra.delta_riconosciuto||r.delta_riconosciuto!==(origine?-prova.quantita:prova.quantita)||altra.causa_tipo!==(origine?tipoDestinazione:'voce')||altra.causa_chiave!==(origine?prova.acquistoDestinazione:prova.causaOrigine)||altraApp.operazioneId!==app.operazioneId||altraApp.decisione!=='trasferimento'||altraApp.deltaApplicato!==0||altraApp.deltaRiconosciuto!==altra.delta_riconosciuto||jsonCanonico(altraApp.contropartita)!==jsonCanonico({id:r.id,uid:r.uid})||jsonCanonico(altraApp.trasferimento)!==jsonCanonico(prova)||!Array.isArray(documento.proposte)||documento.proposte.length!==2||!documento.proposte.some((x)=>jsonCanonico(x)===jsonCanonico({id:altra.id,uid:altra.uid})))throw httpErrors.conflict('trasferimento-incoerente','Manca una metà reciproca del trasferimento: saldo conservato.');
  const verificaPrima=(refs:ProvaTrasferimento['attribuzioniOrigine'],causa:Causa,atteso:number):void=>{
    if(!Array.isArray(refs)||refs.some((x)=>!x||typeof x!=='object')||new Set(refs.map((x)=>x.uid)).size!==refs.length)throw httpErrors.conflict('trasferimento-incoerente','La fotografia delle attribuzioni non è integra.');
    let totale=0;
    for(const ref of refs){if(!ref||!Number.isSafeInteger(ref.id)||ref.id>=Math.min(r.id,altra.id)||typeof ref.uid!=='string'||!Number.isSafeInteger(ref.applicato)||!Number.isSafeInteger(ref.riconosciuto))throw httpErrors.conflict('trasferimento-incoerente','Un’attribuzione precedente non è riconoscibile.');
      const v=prepared('SELECT delta_applicato,delta_riconosciuto,stato FROM utente.da_applicare WHERE partita_id=? AND id=? AND uid=? AND causa_tipo=? AND causa_chiave=? AND tipo=\'dote\' AND chiave=? AND unita=\'punti-interni\'').get(p,ref.id,ref.uid,causa.tipo,causa.chiave,prova.dote) as {delta_applicato:number;delta_riconosciuto:number;stato:string}|undefined;
      if(!v||v.stato!=='applicata'||v.delta_applicato!==ref.applicato||v.delta_riconosciuto!==ref.riconosciuto)throw httpErrors.conflict('trasferimento-incoerente','La precedente attribuzione è diversa dalla prova registrata.');totale+=ref.applicato+ref.riconosciuto;if(!Number.isSafeInteger(totale))throw httpErrors.conflict('trasferimento-incoerente','Somma delle attribuzioni non rappresentabile.');
    }
    const anteriori=righeCausa(p,causa).filter((x)=>x.id<Math.min(r.id,altra.id)&&x.tipo==='dote'&&x.chiave===prova.dote&&x.stato==='applicata');
    if(totale!==atteso||jsonCanonico(anteriori.map((x)=>({id:x.id,uid:x.uid,applicato:x.delta_applicato,riconosciuto:x.delta_riconosciuto})))!==jsonCanonico(refs))throw httpErrors.conflict('trasferimento-incoerente','La prova non copre B netto precedente per intero.');
  };
  verificaPrima(prova.attribuzioniOrigine,{tipo:'voce',chiave:prova.causaOrigine},prova.primaOrigine);verificaPrima(prova.attribuzioniDestinazione,{tipo:tipoDestinazione,chiave:prova.acquistoDestinazione},prova.primaDestinazione);
  const ro=prepared('SELECT * FROM utente.effetto_applicato WHERE partita_id=? AND id=?').get(p,prova.ricevutaOrigine) as Record<string,unknown>|undefined,rd=prepared('SELECT * FROM utente.effetto_applicato WHERE partita_id=? AND id=?').get(p,prova.ricevutaDestinazione) as Record<string,unknown>|undefined;
  const prima=ro?leggiOggettoRegistro(String(ro.prima_json),'versione assorbita'):null,nuova=rd?leggiOggettoRegistro(String(rd.ricevuta_json),'acquisto assorbente'):null;
  const vecchia=prima?.effetto as {tipo?:unknown;dote?:unknown}|undefined;
  const versioneCorretta=tipoDestinazione==='pesca'?(ro?.tipo==='dote'&&vecchia?.tipo==='dote'&&vecchia.dote==='perizia'||ro?.tipo==='turno'&&vecchia?.tipo==='turno')&&prova.dote==='perizia':ro?.tipo==='dote'&&vecchia?.tipo==='dote'&&vecchia.dote===prova.dote;
  if(!ro||!rd||!versioneCorretta||rd.tipo!==tipoDestinazione||!ro.annullato_il||ro.sostituita_da!==null||ro.assorbita_da!==rd.id||`${String(ro.voce_uid)}:${String(ro.effetto_uid)}`!==prova.causaOrigine||ro.voce_uid!==rd.voce_uid||(tipoDestinazione==='pesca'?nuova?.sessioneId:nuova?.acquistoId)!==prova.acquistoDestinazione||!Array.isArray(nuova?.assorbeRicevute)||nuova.assorbeRicevute.filter((id:unknown)=>id===ro.id).length!==1)throw httpErrors.conflict('trasferimento-incoerente','Le ricevute non provano l’assorbimento dichiarato.');
  if(tipoDestinazione==='pesca'){
    const op=nuova?.operazione as Record<string,unknown>|undefined;
    const journal=op&&typeof op.operazioneId==='string'?prepared('SELECT ricevuta_json FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,op.operazioneId) as {ricevuta_json:string}|undefined:undefined;
    if(!journal||op?.sessioneId!==prova.acquistoDestinazione||jsonCanonico(leggiOggettoRegistro(journal.ricevuta_json,'operazione pesca destinataria'))!==jsonCanonico(op))throw httpErrors.conflict('trasferimento-incoerente','Il journal durevole non prova la sessione destinataria, anche se eliminata.');
  }else{const fatto=prepared('SELECT dati_json FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(p,prova.acquistoDestinazione) as {dati_json:string}|undefined;if(!fatto||leggiOggettoRegistro(fatto.dati_json,'consumazione').variante!==prova.dote)throw httpErrors.conflict('trasferimento-incoerente','Il destinatario non corrisponde alla Dote del fatto.');}
}
export function saldoDoteVoce(p:number,voce:string,effetto:string,dote:DoteChiave):SaldoBeneficioDto {
  const causa:Causa={tipo:'voce',chiave:`${voce}:${effetto}`},t=targetCausa(p,causa).find((t)=>t.tipo==='dote'&&t.chiave===dote)??{tipo:'dote' as const,chiave:dote,delta:0,attiva:false,motivo:'Causa senza beneficio attribuito.'};
  return saldo(p,causa,t);
}
/** Rialloca soltanto attribuzioni provate: nessuna scrittura al valore corrente della Dote. */
export function trasferisciAttribuzioneDote(p:number,voce:string,effetto:string,ricevutaOrigine:string,ricevutaDestinazione:string,acquisto:string,dote:DoteChiave,qAtteso:number,destinazioneTipo:'acquisto'|'pesca'='acquisto'):void {
  if(!getDb().inTransaction)throw new Error('Il trasferimento richiede la transazione del raccordo.');
  const causaOld:Causa={tipo:'voce',chiave:`${voce}:${effetto}`},causaNew:Causa={tipo:destinazioneTipo,chiave:acquisto};
  const old=targetCausa(p,causaOld).find((t)=>t.tipo==='dote'&&t.chiave===dote)??{tipo:'dote' as const,chiave:dote,delta:0,attiva:false,motivo:'Dote ritirata.'},q=saldo(p,causaOld,old).attribuito;
  if(!Number.isSafeInteger(q)||q<0||q!==qAtteso||old.attiva)throw httpErrors.conflict('attribuzione-cambiata','B o la causa precedente sono cambiati prima del raccordo.');
  const nuova=targetCausa(p,causaNew).find((t)=>t.tipo==='dote');
  if(!nuova)throw httpErrors.conflict('acquisto-senza-beneficio','Il fatto destinatario non ha una Dote registrata.');
  if(nuova.chiave===dote&&q>0){
    const bNew=saldo(p,causaNew,nuova).attribuito;if(!Number.isSafeInteger(bNew)||bNew<0||!Number.isSafeInteger(bNew+q))throw httpErrors.conflict('attribuzione-incoerente','B dell’acquisto non è integro.');
    const fotografia=(c:Causa)=>righeCausa(p,c).filter((x)=>x.tipo==='dote'&&x.chiave===dote&&x.stato==='applicata').map((x)=>({id:x.id,uid:x.uid,applicato:x.delta_applicato,riconosciuto:x.delta_riconosciuto}));
    const prova:ProvaTrasferimento={versione:1,...(destinazioneTipo==='pesca'?{destinazioneTipo}:{}),ricevutaOrigine,ricevutaDestinazione,causaOrigine:causaOld.chiave,acquistoDestinazione:acquisto,dote,quantita:q,primaOrigine:q,primaDestinazione:bNew,attribuzioniOrigine:fotografia(causaOld),attribuzioniDestinazione:fotografia(causaNew)};
    const op=createHash('sha256').update(`trasferimento\0${ricevutaOrigine}\0${ricevutaDestinazione}`).digest('hex').slice(0,32),adesso=nowIso(),uidOld=nuovoUid(),uidNew=nuovoUid();
    if(prepared('SELECT 1 FROM utente.proposta_operazione WHERE partita_id=? AND operazione_id=?').get(p,op))throw httpErrors.conflict('trasferimento-gia-registrato','Il trasferimento esiste già: nessuna seconda attribuzione.');
    const inserisci=(c:Causa,t:Target,delta:number,uid:string,ciclo:number):number=>Number(prepared(`INSERT INTO utente.da_applicare(uid,partita_id,voce_uid,causa_tipo,causa_chiave,tipo,chiave,unita,ciclo,revisione_causa,delta,dati_json,motivo,stato,verifica,chiusa_da,motivo_chiusura,delta_applicato,delta_riconosciuto,creata_il,decisa_il) VALUES(?,?,?,?,?,'dote',?,'punti-interni',?,?,?,?,'Attribuzione riallocata dal raccordo esplicito: saldo Dote invariato.','applicata','non-conteggiata','causa','beneficio-riallocato',0,?,?,?)`).run(uid,p,c.tipo==='voce'?voce:null,c.tipo,c.chiave,dote,ciclo,improntaDato({attiva:t.attiva,tipo:t.tipo,chiave:t.chiave,delta:t.delta}),delta,jsonCanonico({beneficio:t,trasferimento:prova}),delta,adesso,adesso).lastInsertRowid);
    // I due ID sono determinati prima di compilare le ricevute reciproche; nessun reader intermedio.
    const cicloOld=saldo(p,causaOld,old).ciclo,cicloNew=saldo(p,causaNew,nuova).ciclo;
    const idOld=inserisci(causaOld,old,-q,uidOld,cicloOld),idNew=inserisci(causaNew,nuova,q,uidNew,cicloNew);
    const refs=[{id:idOld,uid:uidOld},{id:idNew,uid:uidNew}];
    for(const [i,ref] of refs.entries())prepared('UPDATE utente.da_applicare SET applicazione_json=? WHERE partita_id=? AND id=? AND uid=?').run(jsonCanonico({operazioneId:op,decisione:'trasferimento',deltaApplicato:0,deltaRiconosciuto:i===0?-q:q,contropartita:refs[1-i],trasferimento:prova,creataIl:adesso}),p,ref.id,ref.uid);
    prepared('INSERT INTO utente.proposta_operazione(partita_id,operazione_id,payload_json,ricevuta_json,created_at) VALUES(?,?,?,?,?)').run(p,op,jsonCanonico({tipo:'trasferimento',...prova}),jsonCanonico({operazioneId:op,partitaId:p,decisione:'trasferimento',proposte:refs,trasferimento:prova,movimenti:[],decisaIl:adesso}),adesso);
  }
  riconciliaBeneficiCausa(p,causaOld);riconciliaBeneficiCausa(p,causaNew);
}

export function riconciliaBeneficiCausa(partita: number, causa: Causa): void {
  const adesso = nowIso();
  // una proposta chiusa da sola (non più dovuta) può essere l'ultima decisione aperta di una giornata già spuntata: a fine riconciliazione (le proposte
  // sostitutive sono già inserite) la partita avanza come dopo una decisione dell'utente (A1, 2026-10-25)
  let chiusaDaSola = false;
  for (const t of targetCausa(partita,causa)) {
    const firma = firmaTarget(t);
    const prima = prepared('SELECT ciclo,attiva,impronta_target FROM utente.beneficio_ciclo WHERE partita_id=? AND causa_tipo=? AND causa_chiave=? AND tipo=? AND chiave=?').get(partita,causa.tipo,causa.chiave,t.tipo,t.chiave) as {ciclo:number;attiva:number;impronta_target:string}|undefined;
    const ciclo = prima ? prima.ciclo + ((!prima.attiva && t.attiva) || (prima.attiva && t.attiva && prima.impronta_target !== firma) ? 1 : 0) : 1;
    prepared(`INSERT INTO utente.beneficio_ciclo(partita_id,causa_tipo,causa_chiave,tipo,chiave,ciclo,attiva,impronta_target,updated_at) VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(partita_id,causa_tipo,causa_chiave,tipo,chiave) DO UPDATE SET ciclo=excluded.ciclo,attiva=excluded.attiva,impronta_target=excluded.impronta_target,updated_at=excluded.updated_at`)
      .run(partita,causa.tipo,causa.chiave,t.tipo,t.chiave,ciclo,t.attiva ? 1 : 0,firma,prima?.impronta_target === firma ? (prepared('SELECT updated_at FROM utente.beneficio_ciclo WHERE partita_id=? AND causa_tipo=? AND causa_chiave=? AND tipo=? AND chiave=?').get(partita,causa.tipo,causa.chiave,t.tipo,t.chiave) as {updated_at:string}).updated_at : adesso);
    const s = saldo(partita,causa,t);
    const rs = righeCausa(partita,causa).filter((r) => r.tipo === t.tipo && r.chiave === t.chiave);
    const aperta = rs.find((r) => r.stato === 'aperta');
    if (aperta && aperta.delta === s.differenza && aperta.revisione_causa === firma && aperta.ciclo === ciclo && s.differenza !== 0) continue;
    if (aperta && prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE id=? AND stato='aperta'").run(adesso,aperta.id).changes>0) chiusaDaSola=true;
    if (s.differenza === 0) continue;
    if (rs.some((r) => r.stato === 'scartata' && (r.chiusa_da === 'utente' || r.motivo_chiusura === 'gia-nel-saldo') && r.ciclo === ciclo && r.revisione_causa === firma && r.delta === s.differenza)) continue;
    const dati = {beneficio:t,fortunaIgnota:t.fortunaIgnota === true};
    prepared(`INSERT INTO utente.da_applicare(uid,partita_id,voce_uid,causa_tipo,causa_chiave,tipo,chiave,unita,ciclo,revisione_causa,delta,dati_json,motivo,verifica,creata_il)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(nuovoUid(),partita,causa.tipo === 'voce' ? causa.chiave.split(':')[0] : null,causa.tipo,causa.chiave,t.tipo,t.chiave,t.tipo === 'yen' ? 'yen' : t.tipo==='punti-pesca'?'punti-pesca':'punti-interni',ciclo,firma,s.differenza,jsonCanonico(dati),s.dovuto === 0 ? 'Proposta inversa: ultima fonte rimossa.' : t.motivo,t.storica ? 'da-dichiarare' : 'non-conteggiata',adesso);
  }
  if (chiusaDaSola) avanzaDopoChiusuraAutomatica(partita,[{voce_uid:causa.tipo==='voce'?causa.chiave.split(':')[0]??null:null,causa_tipo:causa.tipo,causa_chiave:causa.chiave}]);
}
export const riconciliaBeneficiAcquisto = (p:number,id:string):void => riconciliaBeneficiCausa(p,{tipo:'acquisto',chiave:id});
export const riconciliaBeneficiVoce = (p:number,voce:string,effetto:string):void => riconciliaBeneficiCausa(p,{tipo:'voce',chiave:`${voce}:${effetto}`});
export const riconciliaBeneficiPesca = (p:number,id:string):void => riconciliaBeneficiCausa(p,{tipo:'pesca',chiave:id});
/** L13 (decisione 3): riallinea gli yen di una Richiesta nella partita (completata: la proposta «Applica»; non più: la chiusura o l'inversa). */
export const riconciliaBeneficiRichiesta = (p:number,chiave:string):void => riconciliaBeneficiCausa(p,{tipo:'richiesta',chiave});
export function beneficiPescaDto(p:number,id:string):import('../../shared/pesca.js').BeneficioPescaDto[] {
  const c:Causa={tipo:'pesca',chiave:id};return targetCausa(p,c).map(t=>{const s=saldo(p,c,t);return {causa:id,tipo:t.tipo,chiave:t.chiave,unita:t.tipo==='dote'?'punti-interni':t.tipo,intervallo:s.intervallo??{minimo:s.dovuto!,massimo:s.dovuto!},attribuito:s.attribuito,deltaCerto:s.differenza,residuoIgnoto:s.residuoIgnoto??false,motivo:t.motivo};});
}

/**
 * Propone (o chiude) il raccordo di un effetto già spuntato. Una proposta chiusa da sola (dote rivendicata da un acquisto, non più dovuta,
 * configurazione cambiata) può essere l'ultima decisione aperta di una giornata già spuntata: a fine operazione, con l'eventuale proposta
 * sostitutiva già inserita, la partita avanza come dopo una decisione dell'utente (A1, 2026-10-25).
 */
/**
 * L13 (decisione 19, «Elenco da approvare»): la proposta di un effetto di STATO mai applicato da una spunta già fatta (aggiunto alla voce prima che
 * il salvataggio lo applicasse da solo, o non applicabile al salvataggio). `descrizione`: che cosa cambia nella partita, a parole; `motivo`: perché
 * è in elenco. Solo con `passato` uno stato diventa proposta: la Fortuna mai (vale solo il giorno della spunta).
 */
export interface PassatoDiStato { descrizione:string; motivo:string }
/** `senzaAvanzamento` (L13, decisione 19): il censimento all'avvio e dopo l'importazione, che non è un gesto dell'utente: una proposta che si chiude
 *  lì non fa avanzare la partita da sola (avanza al prossimo gesto, come sempre). */
export function creaPropostaEffettoStorico(partita:number,voce:string,effetto:string,precedente?:EffettoVoceDto,opz:{passato?:PassatoDiStato;senzaAvanzamento?:true}={}):void {
  if(creaPropostaEffettoStoricoInterno(partita,voce,effetto,precedente,opz)&&!opz.senzaAvanzamento)avanzaDopoChiusuraAutomatica(partita,[{voce_uid:voce,causa_tipo:'voce',causa_chiave:`${voce}:${effetto}`}]);
}
/** L13 (decisione 19): chiude la proposta del passato di quell'effetto, aperta, se c'è (una per coppia partita/effetto). Dice se l'ha chiusa. */
export function chiudiPropostePassato(partita:number,voce:string,effetto:string):boolean {
  return prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta' AND json_extract(dati_json,'$.passato')=1").run(nowIso(),partita,`${voce}:${effetto}`).changes>0;
}
/** Dice se ha chiuso una proposta aperta. */
function creaPropostaEffettoStoricoInterno(partita:number,voce:string,effetto:string,precedente?:EffettoVoceDto,opz:{passato?:PassatoDiStato}={}):boolean {
  const e = prepared('SELECT dati_json,ordine FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(voce,effetto) as {dati_json:string;ordine:number}|undefined;
  if (!e || !prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(partita,voce)) return false;
  // la Fortuna vale per il giorno della spunta: su una spunta già fatta non c'è niente da applicare dopo
  const tipoEffetto = leggiJsonRegistro<{tipo?:string}>(e.dati_json,'configurazione effetto').tipo;
  if (tipoEffetto === 'fortuna') return false;
  // gli stati: decisione 19, al salvataggio si applicano da soli (`motoreDiario.riallineaStatiDellaVoce`); diventano proposta solo per l'elenco del passato
  const diStato = tipoEffetto === 'storia' || tipoEffetto === 'domanda' || tipoEffetto === 'cruciverba' || tipoEffetto === 'richiesta' || tipoEffetto === 'articolo' || tipoEffetto === 'invito' || tipoEffetto === 'persona' || tipoEffetto === 'oggetto' || tipoEffetto === 'trofeo' || tipoEffetto === 'sblocco'
    || tipoEffetto === 'personaTolta' || tipoEffetto === 'puntiConfidente' || tipoEffetto === 'uscitaOggetto';
  if (diStato && !opz.passato) return false;
  if (!diStato && opz.passato) throw new Error('Solo un effetto di stato entra nell’elenco del passato.');
  if (diStato) return propostaPassato(partita,voce,effetto,e.dati_json,opz.passato!);
  const rivendicato=(prepared("SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? AND tipo='acquisto'").all(voce) as Array<{dati_json:string}>).filter((r)=>{
    const acquisto=normalizzaEffettoVoce(leggiJsonRegistro(r.dati_json,'raccordo canonico'));
    if(!acquisto||acquisto.tipo!=='acquisto')throw httpErrors.conflict('raccordo-canonico-incoerente','La configurazione di acquisto non è riconoscibile.');
    return acquisto.sostituisceDoti.includes(effetto);
  });
  if(rivendicato.length){
    const nodo=normalizzaEffettoVoce(leggiJsonRegistro(e.dati_json,'Dote rivendicata'));
    if(rivendicato.length!==1||nodo?.tipo!=='dote')throw httpErrors.conflict('rivendicazione-ambigua','La Dote è rivendicata da una configurazione non univoca.');
    return prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='dote-rivendicata-da-acquisto',decisa_il=? WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta'").run(nowIso(),partita,`${voce}:${effetto}`).changes>0;
  }
  const ricevuta=prepared('SELECT id,prima_json FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? AND annullato_il IS NULL').get(partita,voce,effetto) as {id:string;prima_json:string|null}|undefined;
  if(ricevuta&&jsonCanonico(leggiJsonRegistro<Record<string,unknown>>(ricevuta.prima_json??'null')?.effetto)===jsonCanonico(leggiJsonRegistro(e.dati_json))){return prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta'").run(nowIso(),partita,`${voce}:${effetto}`).changes>0;}
  const causa = `${voce}:${effetto}`, firma = improntaDato(leggiOggettoRegistro(e.dati_json,'configurazione effetto'));
  const aperta = prepared("SELECT id,revisione_causa FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta'").get(partita,causa) as {id:number;revisione_causa:string}|undefined;
  if (aperta?.revisione_causa === firma) return false;
  const chiusa = !!aperta && prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='configurazione-cambiata',decisa_il=? WHERE id=?").run(nowIso(),aperta.id).changes>0;
  if(prepared("SELECT 1 FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND revisione_causa=? AND (chiusa_da='utente' OR motivo_chiusura='gia-nel-saldo') AND stato='scartata'").get(partita,causa,firma))return chiusa;
  prepared(`INSERT INTO utente.da_applicare(uid,partita_id,voce_uid,causa_tipo,causa_chiave,tipo,chiave,unita,ciclo,revisione_causa,delta,dati_json,motivo,creata_il)
    VALUES(?,?,?,'voce',?,'effetto-voce',?,'azione',1,?,1,?,'Effetto che la spunta già presente avrebbe dato: serve conferma esplicita.',?)`)
    .run(nuovoUid(),partita,voce,causa,effetto,firma,jsonCanonico({voceUid:voce,effettoUid:effetto,...(prepared('SELECT data AS giorno,fascia FROM main.voce_giornata WHERE uid=?').get(voce) as object),articolo:(leggiJsonRegistro<Record<string,unknown>>(e.dati_json)).articolo,effetto:leggiJsonRegistro(e.dati_json),sostituzione:!!precedente||!!ricevuta,versionePrecedente:ricevuta?leggiJsonRegistro<Record<string,unknown>>(ricevuta.prima_json??'null')?.effetto??null:precedente?.effetto??null,ricevutaPrecedente:ricevuta?.id??null}),nowIso());
  return chiusa;
}
/**
 * L13 (decisione 19): la proposta del passato di un effetto di stato (`dati.passato`), con le stesse guardie delle altre: una aperta con la stessa
 * configurazione resta (nessun doppione), una scartata dall'utente con la stessa configurazione non torna, una con la configurazione cambiata si
 * chiude e si rifà. Con la riga dello stato già scritta dalla spunta non c'è niente da proporre. Dice se ha chiuso una proposta aperta.
 */
function propostaPassato(partita:number,voce:string,effetto:string,datiJson:string,passato:PassatoDiStato):boolean {
  const causa=`${voce}:${effetto}`;
  // la voce l'ha già segnato (per la Persona «anche nella scorta», con tutte e due le righe: `statoSegnatoDallaVoce`)
  if(statoSegnatoDallaVoce(partita,voce,effetto,normalizzaEffettoVoce(leggiJsonRegistro(datiJson,'configurazione effetto'))))
    return prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta'").run(nowIso(),partita,causa).changes>0;
  const configurazione=leggiOggettoRegistro(datiJson,'configurazione effetto'),firma=improntaDato(configurazione);
  const aperta=prepared("SELECT id,revisione_causa FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND stato='aperta'").get(partita,causa) as {id:number;revisione_causa:string}|undefined;
  if(aperta?.revisione_causa===firma)return false;
  const chiusa=!!aperta&&prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='configurazione-cambiata',decisa_il=? WHERE id=?").run(nowIso(),aperta.id).changes>0;
  if(prepared("SELECT 1 FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='voce' AND causa_chiave=? AND tipo='effetto-voce' AND revisione_causa=? AND chiusa_da='utente' AND stato IN ('scartata','applicata')").get(partita,causa,firma))return chiusa;
  const v=prepared('SELECT data AS giorno,fascia FROM main.voce_giornata WHERE uid=?').get(voce) as {giorno:string;fascia:string}|undefined;
  prepared(`INSERT INTO utente.da_applicare(uid,partita_id,voce_uid,causa_tipo,causa_chiave,tipo,chiave,unita,ciclo,revisione_causa,delta,dati_json,motivo,creata_il)
    VALUES(?,?,?,'voce',?,'effetto-voce',?,'azione',1,?,1,?,?,?)`)
    .run(nuovoUid(),partita,voce,causa,effetto,firma,jsonCanonico({voceUid:voce,effettoUid:effetto,...(v??{}),effetto:configurazione,passato:true,descrizione:passato.descrizione,sostituzione:false,versionePrecedente:null,ricevutaPrecedente:null}),passato.motivo,nowIso());
  return chiusa;
}

function dto(r:RigaProposta):PropostaPartitaDto {
  const causa=causaDi(r), dati=leggiOggettoRegistro(r.dati_json,'proposta');
  const impedimenti:string[]=[];
  let s:SaldoBeneficioDto|null=null, orfana=false, motivo=r.motivo;
  if(r.tipo==='effetto-voce') {
    const [voce,effetto]=r.causa_chiave.split(':');
    const e=prepared('SELECT dati_json,ordine FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(voce,effetto) as {dati_json:string;ordine:number}|undefined;
    orfana=!e;
    if(!e) impedimenti.push('Voce o effetto non più presente.');
    else if(improntaDato(leggiOggettoRegistro(e.dati_json,'configurazione effetto'))!==r.revisione_causa) impedimenti.push('La configurazione è cambiata: rivedere il raccordo.');
    if(!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(r.partita_id,voce)) impedimenti.push('La voce non è più spuntata.');
    if(dati.sostituzione===true){
      if(typeof dati.ricevutaPrecedente!=='string')impedimenti.push('Versione precedente priva di sidecar attribuibile: sostituzione da riconciliare, nessuna aggiunta automatica.');
      else if(!prepared('SELECT 1 FROM utente.effetto_applicato WHERE partita_id=? AND id=? AND voce_uid=? AND effetto_uid=? AND annullato_il IS NULL').get(r.partita_id,dati.ricevutaPrecedente,voce,effetto))impedimenti.push('La ricevuta della versione precedente è cambiata.');
    }
    const configurazione=dati.effetto as {tipo?:unknown;sostituisceDoti?:unknown}|undefined;
    // L13 (decisione 19): l'anteprima dell'approvazione di un effetto dell'elenco del passato che muove yen (l'articolo, la Richiesta con una
    // ricompensa) dice il movimento sul saldo (`yenPrevisti`, con il segno; 0 = gli yen non cambiano), con le stesse regole dell'approvazione
    // (`yenPrevistiApprovando`). Un registro degli yen illeggibile non fa fallire l'intero elenco della partita: questa proposta lo dice e non si
    // applica (l'approvazione si fermerebbe sullo stesso registro)
    if(dati.passato===true&&r.stato==='aperta'&&e&&effetto&&voce){
      try{const y=yenPrevistiApprovando(r.partita_id,voce,effetto,dati.effetto);if(y!==null)dati.yenPrevisti=y;}
      catch(err){if(!(err instanceof HttpError)||err.status>=500)throw err;impedimenti.push(err.message);}
      // il motivo scritto dal censimento può non valere più (revisione R7): lo stato è stato segnato dopo, a mano o da un'altra voce
      const stato=normalizzaEffettoVoce(dati.effetto);
      if(stato&&eEffettoDiStato(stato)&&!eEffettoCheSomma(stato)&&statoGiaVero(r.partita_id,stato))dati.oraGiaVero=true;
      // 2026-10-26: la Persona «anche nella scorta» con la scorta piena entra lo stesso (la capienza è solo informativa): l'anteprima lo dice.
      // Il motivo del censimento dice la parte che mancava quando è nata la proposta: si riscrive con quella che manca adesso (revisione della fusione)
      else if(stato?.tipo==='persona'&&stato.scorta){
        const a=avvisoScortaPiena(r.partita_id,stato.persona);if(a)dati.avvisoScorta=a;
        motivo=motivoPersonaConScortaAdesso(r.partita_id,stato,r.motivo)??r.motivo;
      }
    }
    if(configurazione?.tipo==='acquisto'&&Array.isArray(configurazione.sostituisceDoti))dati.raccordoDoti=configurazione.sostituisceDoti.map((id:unknown)=>{
      if(typeof id!=='string')throw httpErrors.conflict('raccordo-dote-incoerente','L’identità della Dote da raccordare non è valida.');
      const nodo=prepared('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(voce,id) as {dati_json:string}|undefined,originale=nodo?leggiOggettoRegistro(nodo.dati_json,'Dote da raccordare'):null;
      const ricevute=prepared('SELECT id,annullato_il,assorbita_da,prima_json FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? ORDER BY applicato_il,id').all(r.partita_id,voce,id) as Array<{id:string;annullato_il:string|null;assorbita_da:string|null;prima_json:string|null}>;
      const attiva=ricevute.find((x)=>x.annullato_il===null);
      if(originale?.tipo!=='dote'||!eDote(originale.dote))return {effettoUid:id,dote:null,attribuito:null,sidecarId:null,verifica:'fonte-da-riconciliare'};
      const b=saldoDoteVoce(r.partita_id,voce!,id,originale.dote).attribuito;
      return {effettoUid:id,dote:originale.dote,attribuito:b,sidecarId:attiva?.id??null,versionePrecedente:attiva?.prima_json?leggiOggettoRegistro(attiva.prima_json,'versione Dote').effetto:null,giaAssorbitaDa:ricevute.find((x)=>x.assorbita_da)?.assorbita_da??null,verifica:attiva?'sidecar-da-verificare':'promemoria-da-dichiarare'};
    });
  } else {
    const target=targetCausa(r.partita_id,causa).find((t)=>t.tipo===r.tipo&&t.chiave===r.chiave);
    if(!target) throw httpErrors.conflict('proposta-incoerente','La proposta non ha una descrizione del proprio beneficio.');
    // le note della Dote e i punti che la fonte dà in tutto, per dirli accanto ai punti della proposta («Perizia ♪♪♪ · 5 punti»; una proposta
    // che completa la differenza dice anche da dove viene: «Perizia ♪♪♪ · 5 punti in tutto»). Solo vista: il registro non cambia
    if(r.tipo==='dote'&&target.note){dati.note=target.note;dati.puntiDellaFonte=target.delta;}
    s=saldo(r.partita_id,causa,target);
    if(s.differenza!==r.delta || r.revisione_causa!==firmaTarget(target)) impedimenti.push('La causa o il saldo sono cambiati: rivedere la proposta.');
    if(r.tipo==='dote'&&!prepared('SELECT 1 FROM main.dote_sociale WHERE chiave=?').get(r.chiave)) {orfana=true;impedimenti.push('La Dote destinataria non esiste.');}
    if(r.verifica!=='non-conteggiata') impedimenti.push('Prima indica se questi punti sono già nel saldo.');
    if(causa.tipo==='acquisto') {
      const a=prepared('SELECT articolo_chiave FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(r.partita_id,causa.chiave) as {articolo_chiave:string}|undefined;
      orfana=orfana||!a||!prepared('SELECT 1 FROM main.articolo WHERE chiave=?').get(a.articolo_chiave);
    } else if(causa.tipo==='voce')orfana=orfana||!prepared('SELECT 1 FROM main.voce_giornata WHERE uid=?').get(r.voce_uid);
    else if(causa.tipo==='richiesta')orfana=orfana||!prepared('SELECT 1 FROM main.richiesta WHERE chiave=?').get(causa.chiave);
    else orfana=orfana||!prepared('SELECT 1 FROM utente.pesca_sessione WHERE partita_id=? AND id=? UNION ALL SELECT 1 FROM utente.pesca_acquisto_esca WHERE partita_id=? AND id=?').get(r.partita_id,causa.chiave,r.partita_id,causa.chiave);
  }
  // R10-10/4: il testo della voce del Diario da cui nasce la proposta, per dirlo all'utente in parole (non solo il suo identificativo)
  // L13: per gli yen di una Richiesta completata, la frase che la nomina (non c'è una voce)
  const voceTesto=r.voce_uid?((prepared('SELECT azione FROM main.voce_giornata WHERE uid=?').get(r.voce_uid) as {azione:string}|undefined)?.azione??null)
    :causa.tipo==='richiesta'?`Richiesta «${(prepared('SELECT nome FROM main.richiesta WHERE chiave=?').get(causa.chiave) as {nome:string}|undefined)?.nome??causa.chiave}» completata`:null;
  // BON-12: la spesa del consumo non è una proposta; la proposta Dote la porta come dato (decisione 18: dal Diario si scala da sola)
  const promemoriaYen=r.tipo==='dote'&&causa.tipo==='acquisto'?((prepared('SELECT prezzo_yen FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(r.partita_id,causa.chiave) as {prezzo_yen:number}|undefined)?.prezzo_yen??null):null;
  // BON-01: la voce del Diario a cui il pulsante «Applica» si aggancia (quella della proposta, o quella che ha confermato il consumo)
  const voceUid=r.voce_uid??(causa.tipo==='acquisto'?((prepared('SELECT voce_uid FROM utente.acquisto_provenienza WHERE partita_id=? AND acquisto_id=? AND voce_uid IS NOT NULL ORDER BY rowid LIMIT 1').get(r.partita_id,causa.chiave) as {voce_uid:string}|undefined)?.voce_uid??null):null);
  return {id:r.id,uid:r.uid,partitaId:r.partita_id,tipo:r.tipo,chiave:r.chiave,causa,voceTesto,voceUid,promemoriaYen,unita:r.unita,delta:r.delta,stato:r.stato,verifica:r.verifica,motivo,chiusaDa:r.chiusa_da,motivoChiusura:r.motivo_chiusura,deltaApplicato:r.delta_applicato,deltaRiconosciuto:r.delta_riconosciuto,saldo:s,dote:eDote(r.chiave)?r.chiave:null,orfana,applicabile:r.stato==='aperta'&&impedimenti.length===0,impedimenti,creataIl:r.creata_il,decisaIl:r.decisa_il,dati};
}
export function leggiPropostePartita(partita:number,opz:{ancheChiuse?:boolean}={}):PropostaPartitaDto[] {
  verificaPartita(partita);
  return (prepared(`SELECT * FROM utente.da_applicare WHERE partita_id=?${opz.ancheChiuse?'':" AND stato='aperta'"} ORDER BY id`).all(partita) as RigaProposta[]).map(dto);
}

export interface PortePropostePartita {
  applicaDote:(partitaId:number,chiave:DoteChiave,delta:number)=>void;
  applicaYen:(partitaId:number,delta:number)=>void;
  applicaPuntiPesca?:(partitaId:number,delta:number)=>void;
  applicaEffettoStorico?:(partitaId:number,proposta:PropostaPartitaDto,acquisto:NuovaRegistrazioneAcquisto|undefined,revisioneAcquistiAttesa:string|undefined,pesca?:NuovaSessionePesca,revisionePescaAttesa?:string)=>void;
}
function valore(partita:number,tipo:'dote'|'yen'|'punti-pesca',chiave:string):number {
  if(tipo==='yen')return (prepared('SELECT yen FROM utente.partita WHERE id=?').get(partita) as {yen:number}).yen;
  if(tipo==='punti-pesca'){const saldo=(prepared('SELECT saldo FROM utente.punti_pesca_partita WHERE partita_id=?').get(partita) as {saldo:number|null}|undefined)?.saldo;if(saldo==null)throw httpErrors.conflict('pesca-saldo-ignoto','Dichiara il saldo punti pesca osservato prima di applicare un movimento.');return saldo;}
  return (prepared('SELECT punti FROM utente.dote_sociale_partita WHERE partita_id=? AND dote_chiave=?').get(partita,chiave) as {punti:number}|undefined)?.punti??0;
}
function riferimenti(d:DecisioneProposte) {return 'proposte' in d?d.proposte:[d.proposta];}
function prepara(partita:number,r:RichiestaAnteprimaDecisioneProposte):AnteprimaDecisioneProposteDto {
  verificaPartita(partita);
  const refs=riferimenti(r.decisione);
  if(!refs.length||refs.length>100||new Set(refs.map((x)=>x.uid)).size!==refs.length)throw httpErrors.badRequest('proposte-non-valide','Il gruppo deve contenere proposte distinte.');
  const righe=refs.map((ref)=>{
    const row=prepared('SELECT * FROM utente.da_applicare WHERE partita_id=? AND id=? AND uid=?').get(partita,ref.id,ref.uid) as RigaProposta|undefined;
    if(!row)throw httpErrors.notFound('proposta-non-trovata','La proposta non esiste più con questa identità.');
    if(row.stato!=='aperta')throw httpErrors.conflict('proposta-chiusa','La proposta è già stata decisa.');
    return row;
  });
  const proposte=righe.map(dto), virtuali=new Map<string,MovimentoPropostoDto>();
  for(const p of proposte) {
    if(r.decisione.tipo==='applica') {
      // BON-12: gli yen di un consumo non sono una proposta. L13 (ondata 3, decisione 1): gli yen dichiarati da un effetto «yen» di una voce si
      // applicavano come la Dote, dal pulsante «Applica» sulla voce, con il movimento registrato (`movimento_yen`); così quelli di una Richiesta
      // completata (decisione 3). Dalla decisione 18 si muovono da soli (`yenAutomaticiService`): qui passano solo le proposte nate prima, ancora aperte
      if(p.tipo==='yen'&&p.causa.tipo!=='voce'&&p.causa.tipo!=='richiesta')throw httpErrors.conflict('yen-a-mano','Gli yen non si applicano da qui: non c’è niente da applicare.');
      if(p.tipo==='effetto-voce'||!p.applicabile)throw httpErrors.conflict('proposta-non-applicabile',p.impedimenti.join(' ')||'Questa proposta richiede il raccordo esplicito.');
      const k=`${p.tipo}\0${p.chiave}`,v=virtuali.get(k)??{tipo:p.tipo,chiave:p.chiave,prima:valore(partita,p.tipo,p.chiave),delta:0,dopo:0};
      v.delta+=p.delta;v.dopo=v.prima+v.delta;
      if(v.dopo<0||v.dopo>(p.tipo==='punti-pesca'?999_999_999:p.tipo==='yen'?9_999_999:999))throw httpErrors.conflict('valore-fuori-limiti','Il delta approvato supererebbe i limiti; nessuna saturazione automatica.');
      virtuali.set(k,v);
    } else if(r.decisione.tipo==='applica-effetto') {
      if(p.tipo!=='effetto-voce'||!p.applicabile)throw httpErrors.conflict('effetto-non-applicabile','Il raccordo della spunta non è più applicabile.');
      const effetto=p.dati.effetto as {tipo?:string}|undefined;
      if(effetto?.tipo==='pesca'){if(!r.decisione.pesca||!r.decisione.revisionePescaAttesa||r.decisione.acquisto!==undefined||r.decisione.revisioneAcquistiAttesa!==undefined)throw httpErrors.badRequest('pesca-richiesta','La pesca richiede sessione completa e token, senza un acquisto alternativo.');}
      else if(r.decisione.pesca!==undefined||r.decisione.revisionePescaAttesa!==undefined)throw httpErrors.badRequest('pesca-inattesa','Questo effetto non dichiara una visita di pesca.');
      if(effetto?.tipo==='acquisto'){if(!r.decisione.acquisto||!r.decisione.revisioneAcquistiAttesa)throw httpErrors.badRequest('acquisto-richiesto','Una consumazione richiede acquisto completo e token.');}
      else if(r.decisione.acquisto!==undefined||r.decisione.revisioneAcquistiAttesa!==undefined)throw httpErrors.badRequest('acquisto-inatteso','Questo effetto non è un acquisto.');
    } else if(r.decisione.tipo!=='scarta'&&p.tipo==='effetto-voce')throw httpErrors.badRequest('decisione-non-valida','Il già conteggiato si dichiara sulla proposta Dote o yen, dopo il raccordo.');
    if(r.decisione.tipo==='gia-conteggiata'&&(!Number.isInteger(r.decisione.quantita)||r.decisione.quantita<=0||r.decisione.quantita>Math.abs(p.delta)))throw httpErrors.badRequest('quantita-non-valida','Indica la parte di questa proposta già conteggiata, entro il delta mostrato.');
  }
  const movimenti=[...virtuali.values()];
  const raccordi=proposte.filter((p)=>p.tipo==='effetto-voce').map((p)=>{
    const uid=p.dati.voceUid;
    return {proposta:p.uid,ricevute:prepared('SELECT * FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? ORDER BY id').all(partita,uid),proposteVoce:prepared('SELECT * FROM utente.da_applicare WHERE partita_id=? AND (voce_uid=? OR causa_chiave LIKE ?) ORDER BY id').all(partita,uid,`${String(uid)}:%`)};
  });
  const sceltaPesca=r.decisione.tipo==='applica-effetto'?r.decisione.pesca?.scelta:undefined;
  const fotografiaSessionePesca=sceltaPesca?.tipo==='collega'?leggiPescaPartita(partita,id=>beneficiPescaDto(partita,id)).sessioni.find(s=>s.id===sceltaPesca.sessioneId):undefined;
  if(sceltaPesca?.tipo==='collega'&&!fotografiaSessionePesca)throw httpErrors.conflict('pesca-sessione-assente','La sessione scelta non è presente nell’anteprima della decisione.');
  const fotoPesca=r.decisione.tipo==='applica-effetto'&&r.decisione.pesca?fotografiaPesca(partita):undefined;
  return {richiesta:r,proposte,movimenti,...(fotografiaSessionePesca?{fotografiaSessionePesca}:{}),revisioneProposteAttesa:improntaDato({r,righe,proposte,movimenti,raccordi,fotoPesca})};
}
export function anteprimaDecisioneProposte(partita:number,r:RichiestaAnteprimaDecisioneProposte):AnteprimaDecisioneProposteDto {return getDb().transaction(()=>prepara(partita,r))();}
export function decidiProposte(partita:number,r:RichiestaDecisioneProposte,porte?:PortePropostePartita):RicevutaDecisioneProposteDto {
  return getDb().transaction(()=>{
    verificaPartita(partita);
    const richiesta={operazioneId:r.operazioneId,decisione:r.decisione},payload=jsonCanonico(richiesta);
    const replay=prepared('SELECT payload_json,ricevuta_json FROM utente.proposta_operazione WHERE partita_id=? AND operazione_id=?').get(partita,r.operazioneId) as {payload_json:string;ricevuta_json:string}|undefined;
    if(replay){
      if(replay.payload_json!==payload)throw httpErrors.conflict('operazione-diversa','Questo ID appartiene a un’altra decisione.');
      const ricevuta=leggiOggettoRegistro(replay.ricevuta_json,'ricevuta operazione');
      if(ricevuta.operazioneId!==r.operazioneId||ricevuta.partitaId!==partita||ricevuta.decisione!==r.decisione.tipo||jsonCanonico(ricevuta.proposte)!==jsonCanonico(riferimenti(r.decisione))||!Array.isArray(ricevuta.movimenti)||typeof ricevuta.decisaIl!=='string'||ricevuta.movimenti.some((x)=>!x||typeof x!=='object'||!['dote','yen','punti-pesca'].includes(String((x as Record<string,unknown>).tipo))||!Number.isInteger((x as Record<string,unknown>).prima)||!Number.isInteger((x as Record<string,unknown>).delta)||!Number.isInteger((x as Record<string,unknown>).dopo)||Number((x as Record<string,unknown>).prima)+Number((x as Record<string,unknown>).delta)!==Number((x as Record<string,unknown>).dopo)))throw httpErrors.conflict('ricevuta-operazione-incoerente','La ricevuta della decisione non coincide con la propria identità o catena.');
      return ricevuta as unknown as RicevutaDecisioneProposteDto;
    }
    // decisione A1 (2026-10-25): l'avanzamento si valuta una volta sola, alla fine, dopo tutte le riconciliazioni (le chiusure automatiche delle cause
    // riconciliate qui sotto si raccolgono e si valutano insieme alle proposte decise: niente avanzamento a metà con una decisione nuova che sta per aprirsi)
    const {valore:esitoDecisione,avanzamento:esplicito}=avanzaUnaVoltaAllaFine(partita,()=>{
    const p=prepara(partita,richiesta);
    if(p.revisioneProposteAttesa!==r.revisioneProposteAttesa)throw httpErrors.conflict('proposte-cambiate','Il gruppo, la causa o i valori sono cambiati: rileggi l’anteprima.');
    const adesso=nowIso();
    if(r.decisione.tipo==='applica') {
      if(!porte)throw httpErrors.conflict('dominio-non-collegato','Il mutatore canonico non è disponibile.');
      for(const m of p.movimenti){if(m.tipo==='yen')porte.applicaYen(partita,m.delta);else if(m.tipo==='punti-pesca'){if(!porte.applicaPuntiPesca)throw httpErrors.conflict('dominio-non-collegato','Il saldo punti pesca non è collegato.');porte.applicaPuntiPesca(partita,m.delta);}else {if(!eDote(m.chiave))throw httpErrors.conflict('dote-non-valida','Dote non valida.');porte.applicaDote(partita,m.chiave,m.delta);}if(valore(partita,m.tipo,m.chiave)!==m.dopo)throw httpErrors.conflict('delta-non-applicato','Il dominio non ha applicato il delta esatto approvato.');}
    }
    const cause=new Map<string,Causa>(),cursori=new Map(p.movimenti.map((m)=>[`${m.tipo}\0${m.chiave}`,m.prima])),decise:RigaProposta[]=[];
    for(const item of p.proposte){
      const q=prepared('SELECT * FROM utente.da_applicare WHERE partita_id=? AND id=? AND uid=?').get(partita,item.id,item.uid) as RigaProposta;
      decise.push(q);
      if(r.decisione.tipo==='scarta')prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='utente',motivo_chiusura='scartata-dall-utente',decisa_il=? WHERE id=? AND stato='aperta'").run(adesso,q.id);
      else if(r.decisione.tipo==='non-conteggiata'||r.decisione.tipo==='ignota')prepared('UPDATE utente.da_applicare SET verifica=? WHERE id=? AND stato=\'aperta\'').run(r.decisione.tipo,q.id);
      else {
        let deltaApplicato=0,deltaRiconosciuto=0;
        if(r.decisione.tipo==='applica')deltaApplicato=q.delta;
        else if(r.decisione.tipo==='gia-conteggiata')deltaRiconosciuto=Math.sign(q.delta)*r.decisione.quantita;
        else if(r.decisione.tipo==='applica-effetto'){
          if(!porte?.applicaEffettoStorico)throw httpErrors.conflict('dominio-non-collegato','Il raccordo canonico non è disponibile.');
          porte.applicaEffettoStorico(partita,item,r.decisione.acquisto,r.decisione.revisioneAcquistiAttesa,r.decisione.pesca,r.decisione.revisionePescaAttesa);
        }
        const gruppo=p.movimenti.find((m)=>m.tipo===q.tipo&&m.chiave===q.chiave),k=`${q.tipo}\0${q.chiave}`,prima=cursori.get(k);
        const movimento=gruppo&&prima!==undefined?{tipo:gruppo.tipo,chiave:gruppo.chiave,prima,delta:deltaApplicato,dopo:prima+deltaApplicato}:null;
        if(movimento)cursori.set(k,movimento.dopo);
        const app={operazioneId:r.operazioneId,decisione:r.decisione.tipo,deltaApplicato,deltaRiconosciuto,movimento,creataIl:adesso,...(item.causa.tipo==='pesca'?{intervalloOsservato:item.saldo?.intervallo??null,componente:r.decisione.tipo==='gia-conteggiata'?'attribuzione-dichiarata':q.tipo==='dote'&&deltaApplicato>0&&item.saldo?.residuoIgnoto?'base-certa':'delta-certo'}:{})};
        if(prepared("UPDATE utente.da_applicare SET stato='applicata',chiusa_da='utente',delta_applicato=?,delta_riconosciuto=?,applicazione_json=?,decisa_il=? WHERE id=? AND uid=? AND stato='aperta'").run(deltaApplicato,deltaRiconosciuto,jsonCanonico(app),adesso,q.id,q.uid).changes!==1)throw httpErrors.conflict('proposta-cambiata','La proposta è cambiata durante la decisione.');
        if(q.tipo==='yen'&&deltaApplicato!==0){const m=movimento!;prepared('INSERT INTO utente.movimento_yen(id,partita_id,proposta_uid,causa_tipo,causa_chiave,prima,delta,dopo,operazione_id,creato_il) VALUES(?,?,?,?,?,?,?,?,?,?)').run(nuovoUid(),partita,q.uid,q.causa_tipo,q.causa_chiave,m.prima,deltaApplicato,m.prima+deltaApplicato,r.operazioneId,adesso);}
        if(q.tipo==='punti-pesca'&&deltaApplicato!==0){const m=movimento!;prepared("INSERT INTO utente.movimento_punti_pesca(id,partita_id,proposta_uid,operazione_id,tipo,causa_tipo,causa_chiave,prima,delta,dopo,creato_il) VALUES(?,?,?,?,'proposta',?,?,?,?,?,?)").run(nuovoUid(),partita,q.uid,r.operazioneId,q.causa_tipo,q.causa_chiave,m.prima,deltaApplicato,m.dopo,adesso);}
      }
      if(q.tipo!=='effetto-voce')cause.set(`${q.causa_tipo}\0${q.causa_chiave}`,causaDi(q));
    }
    const ricevuta: RicevutaDecisioneProposteDto={operazioneId:r.operazioneId,partitaId:partita,decisione:r.decisione.tipo,proposte:p.proposte.map(({id,uid})=>({id,uid})),movimenti:p.movimenti,decisaIl:adesso};
    prepared('INSERT INTO utente.proposta_operazione(partita_id,operazione_id,payload_json,ricevuta_json,created_at) VALUES(?,?,?,?,?)').run(partita,r.operazioneId,payload,jsonCanonico(ricevuta),adesso);
    for(const c of cause.values())riconciliaBeneficiCausa(partita,c);
    prepared('UPDATE utente.partita SET updated_at=? WHERE id=?').run(adesso,partita);
    return {valore:ricevuta,decise};
    });
    // decisione A1 (2026-10-25): chiusa l'ultima decisione aperta di una fascia/giornata già spuntata per intero, la partita avanza (alla sera o al
    // giorno dopo) nella stessa transazione, e la risposta lo dice. L'avanzamento non entra nella ricevuta salvata: una ripetizione del gesto la rende com'era (il client, che non trova l'esito, rilegge la partita e si allinea da solo: `giornoAvanzato.ts`).
    // (l'esito ricordato dalla richiesta si preleva comunque, così non resta nel contesto: c'è solo se un percorso non raccolto ha già fatto avanzare la partita)
    const registrato=prelevaAvanzamentoValido(partita),avanzamento=esplicito??registrato;
    return avanzamento?{...esitoDecisione,...avanzamento}:esitoDecisione;
  })();
}
