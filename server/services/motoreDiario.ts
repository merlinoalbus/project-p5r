import { createHash } from 'node:crypto';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { eDote } from '../../shared/doti.js';
import { chiaveSblocco, eEffettoDiStato, fondiArticoliUguali, motivoYenGiaStrutturati, normalizzaEffettoVoce, normalizzaEffettiVoce } from '../../shared/effettiVoce.js';
import { yenDelDato } from './yenDeiDati.js';
import { MOTIVO_VOCE_ELIMINATA, conMotivoDiRestituzione, conYenInOrdine, muoviYenAutomatico, restituisciYenAutomatico, restituisciYenAutomaticiDellaVoce, segnaYenDellaSpuntaFuoriRegistro, yenPropostiInSospeso } from './yenAutomaticiService.js';
import type { AnteprimaDecisioneEffettoVoceDto, EffettoLegacyVoce, EffettoVoce, EffettoVoceDto, PropostaEffettoVoceDto, ReceiptEffettoVoceDto, RichiestaAnteprimaDecisioneEffettoVoce, RichiestaDecisioneEffettoVoce, RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../shared/effettiVoce.js';
import type { NuovaRegistrazioneAcquisto, RichiestaRegistraAcquisto } from '../../shared/acquisti.js';
import type { EffettiAzioneDto } from '../../shared/types.js';
import type { PropostaPartitaDto } from '../../shared/propostePartita.js';
import { annullaFontiDiarioNellaTransazione, anteprimaRegistrazioneAcquisto, registraAcquistoNellaTransazione, verificaOffertaConsumo, type PorteDisponibilitaAcquisto } from './acquistiService.js';
import { accendiFortunaDaVoce, spegniFortunaDaVoce } from './fortunaService.js';
import { applicaEffettiDiStato, annullaEffettiDiStato, verificaEffettoDiStato } from './effettiDiStatoService.js';
import { creaPropostaEffettoStorico, improntaDato, jsonCanonico, leggiJsonRegistro, leggiPropostePartita, nuovoUid, riconciliaBeneficiVoce, verificaBeneficio, saldoDoteVoce, trasferisciAttribuzioneDote } from './propostePartitaService.js';
import { leggiRicevutaEffettiAzione } from './effettiAzioneService.js';
import { confidentiAnnullatiAlVecchioModo, nuovaGenerazione, riconciliaRegistroDopoRipristino, senzaEventiGestiti, togliEventiDellaVoce } from './puntiCronologici.js';
import { verificaEffetti } from './azioniStrutturateService.js';
import { ATTIVITA_PESCA, REGOLA_PESCA, eAttivitaPesca, type NuovaSessionePesca, type RichiestaRegistraSessionePesca } from '../../shared/pesca.js';
import { anteprimaPesca, confermaPesca, rimuoviFontePescaNellaTransazione } from './pescaService.js';
import { fontiPesca, quotaSessionePesca } from './pescaLetture.js';
import { leggiRegolaPesca } from './regolePescaService.js';
import { provaUidTurnoPesca } from './allocazioniTurniPesca.js';
import { risolviScelteSpunta, type SceltaRisolta } from './esitiAttivitaService.js';
import type { SceltaEsitoSpunta } from '../../shared/esitiAttivita.js';

interface RigaEffetto {uid:string;voce_uid:string;ordine:number;tipo:string;chiave:string|null;dati_json:string;origine:EffettoVoceDto['origine'];updated_at:string}
interface Transizione {voce_uid:string;stato:StatoEffettiVoceDto['stato'];raw_json:string;motivo:string|null;impronta:string;aggiornata_il:string}
interface RigaRicevuta {id:string;partita_id:number;voce_uid:string;effetto_uid:string;effetto_ordine:number;formato:number;tipo:string;chiave:string|null;prima_json:string|null;ricevuta_json:string;creato:number;applicato_il:string;annullato_il:string|null;sostituita_da:string|null;assorbita_da:string|null}
interface RigaProposta {id:string;voce_uid:string;tipo:string;chiave:string|null;gruppo:string;dati_json:string;motivo:string;certezza:PropostaEffettoVoceDto['certezza'];stato:PropostaEffettoVoceDto['stato'];updated_at:string}
export interface PorteEffettiLegacy {
  /** `scelte`: L13, le scelte d'esito già risolte nella stessa posizione di `produce` (undefined dove l'effetto non ne chiede). */
  applicaLegacy:(partitaId:number,produce:EffettoLegacyVoce[],scelte?:ReadonlyArray<SceltaRisolta|undefined>)=>EffettiAzioneDto|null;
  annullaLegacy:(partitaId:number,ricevuta:EffettiAzioneDto)=>void;
}
const righeEffetti=(uid:string):RigaEffetto[]=>prepared('SELECT * FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(uid) as RigaEffetto[];
// `voce_giornata.produce_json` non si legge più (F2: un solo punto di modifica, la fonte `voce_effetto`): il RAW storico che la fonte
// conserva è quello del registro di transizione (`raw_json`, copiato dalla 136), e una voce nuova nasce senza RAW ('[]').
function voce(uid:string):{uid:string;data:string;fascia:'giorno'|'sera';ordine:number;azione:string;genere:string} {
  const v=prepared('SELECT uid,data,fascia,ordine,azione,genere FROM main.voce_giornata WHERE uid=?').get(uid) as ReturnType<typeof voce>|undefined;
  if(!v)throw httpErrors.notFound('voce-non-trovata','La voce del Diario non è più presente.');return v;
}
function effettoDto(r:RigaEffetto):EffettoVoceDto {
  const effetto=normalizzaEffettoVoce(leggiJsonRegistro(r.dati_json,'effetto canonico'));
  if(!effetto||effetto.tipo!==r.tipo||!['seed','regola','utente'].includes(r.origine))throw httpErrors.conflict('effetto-incoerente','L’effetto canonico non coincide con il proprio tipo: dati conservati.');
  return {uid:r.uid,ordine:r.ordine,effetto,origine:r.origine};
}
export function leggiEffettiVoce(uid:string):StatoEffettiVoceDto {
  voce(uid);const t=prepared('SELECT * FROM main.voce_effetto_transizione WHERE voce_uid=?').get(uid) as Transizione|undefined,rs=righeEffetti(uid);
  if(!t)throw httpErrors.conflict('transizione-assente','La voce non ha un registro di transizione: nessun RAW viene interpretato implicitamente.');
  const effetti=rs.map(effettoDto);
  if(t.stato==='legacy-da-correggere'&&effetti.length)throw httpErrors.conflict('transizione-incoerente','La fonte fallback contiene anche effetti canonici.');
  return {voceUid:uid,stato:t.stato,effetti,rawLegacy:t.raw_json,motivo:t.motivo,revisione:improntaDato({uid,rawAttuale:t.raw_json,t,rs})};
}
/**
 * F3: la fonte degli effetti per **mostrare** una voce del Diario. Se la voce non ha il registro di transizione o la fonte è incoerente
 * (409 di `leggiEffettiVoce`), solo quella voce risulta «da correggere» con il motivo, senza effetti eseguibili: le altre voci del giorno
 * si vedono e funzionano. Scritture e spunte continuano a usare `leggiEffettiVoce` e restano rifiutate su quella voce finché non la si
 * corregge. Gli altri errori (voce assente) passano com'erano.
 */
export function leggiEffettiVocePerMostrare(uid:string):StatoEffettiVoceDto {
  try {return leggiEffettiVoce(uid);}
  catch(e){
    if(!(e instanceof HttpError)||e.status!==409)throw e;
    const t=prepared('SELECT raw_json FROM main.voce_effetto_transizione WHERE voce_uid=?').get(uid) as {raw_json:string}|undefined;
    return {voceUid:uid,stato:'legacy-da-correggere',effetti:[],rawLegacy:t?.raw_json??'[]',motivo:e.message,revisione:improntaDato({uid,errore:e.code,raw:t?.raw_json??null})};
  }
}
const chiaveEffetto=(e:EffettoVoce):string|null=>e.tipo==='acquisto'?e.articolo:e.tipo==='dote'||e.tipo==='fortuna'?e.dote:e.tipo==='lettura'?e.chiave:e.tipo==='storia'?e.evento:e.tipo==='domanda'?String(e.domanda):e.tipo==='cruciverba'?e.data:e.tipo==='richiesta'?e.richiesta:e.tipo==='articolo'?e.articolo:e.tipo==='invito'?e.invito:e.tipo==='persona'?String(e.persona)
  :e.tipo==='yen'?'yen':e.tipo==='oggetto'?e.oggetto:e.tipo==='trofeo'?e.trofeo:e.tipo==='sblocco'?chiaveSblocco(e.bersaglio,e.chiave):e.attivita;
/**
 * L13: il beneficio in yen di un effetto «yen» nel vecchio registro delle proposte (la ricevuta lo dichiara, la proposta «Applica» lo porta nel
 * saldo). Dalla decisione 18 si usa SOLO per una causa che ha ancora yen proposti in sospeso (`yenPropostiInSospeso`): così la proposta applicata
 * prima ritrova la sua causa e niente si conta due volte. Altrimenti gli yen si muovono da soli (`ricevutaYen`, `muoviYenDellaVoce`).
 */
const beneficioYen=(e:Extract<EffettoVoce,{tipo:'yen'}>,storica:boolean)=>({tipo:'yen' as const,chiave:'yen',delta:e.importo,motivo:e.importo>0?'Yen della voce: applicali quando li ricevi nel gioco.':'Yen spesi nella voce: applicali quando li spendi nel gioco.',storica});
/**
 * L13 (decisione 18): la ricevuta di un effetto «yen» e il suo movimento. Con yen ancora proposti in sospeso per lo stesso effetto (proposta aperta
 * o applicata prima, non tornata a zero) resta il registro delle proposte, com'era; altrimenti la ricevuta non dichiara benefici (nessuna
 * proposta «Applica») e gli yen entrano o si scalano da soli dal saldo, mai sotto zero.
 */
function ricevutaYen(p:number,uid:string,e:EffettoVoceDto&{effetto:Extract<EffettoVoce,{tipo:'yen'}>},dati:Record<string,unknown>,storica:boolean,opz:{id?:string}={}):{ricevuta:ReceiptEffettoVoceDto;movimento:YenDaMuovere|null} {
  if(yenPropostiInSospeso(p,'voce',`${uid}:${e.uid}`))return {ricevuta:registraRicevuta(p,uid,e,{...dati,benefici:[beneficioYen(e.effetto,storica)]},true,opz),movimento:null};
  return {ricevuta:registraRicevuta(p,uid,e,{...dati,benefici:[],yenAutomatici:true},true,opz),movimento:{effettoUid:e.uid,importo:e.effetto.importo,motivo:e.effetto.importo>0?'Yen ricevuti nella voce':'Yen spesi nella voce'}};
}
/** Un movimento automatico della voce da fare (`muoviYenDellaVoce`): l'effetto, l'importo con il segno, il motivo. */
interface YenDaMuovere {effettoUid:string;importo:number;motivo:string}
/** Muove gli yen degli effetti della voce: prima i guadagni, poi le spese, così il tetto a zero non mangia una spesa che il guadagno della stessa
 *  voce copriva. Nella spunta e nel suo annullo l'ordine vale anche fra cause diverse (turni, Richieste): li esegue `conYenInOrdine`. */
function muoviYenDellaVoce(p:number,uid:string,elenco:Array<YenDaMuovere|null>):void {
  for(const m of elenco.filter((x):x is YenDaMuovere=>x!==null).sort((a,b)=>b.importo-a.importo))muoviYenAutomatico(p,{tipo:'voce',chiave:`${uid}:${m.effettoUid}`},m.importo,m.motivo,uid);
}
/**
 * L13 (decisione 18): gli yen che la spunta muove da soli per un effetto che porta già il suo prezzo (decisione 2: li muove quel dato), fotografati
 * al gesto: gli articoli comprati (prezzo × copie, solo se l'acquisto è stato davvero segnato), la consumazione Aojiru nuova, la visita di pesca
 * nuova (la sua quota), il biglietto del cinema di una visione. I turni li muove il turno stesso (`attivitaService.registraTurno`), le Richieste la
 * Richiesta completata (`riallineaYenRichiesta`). Mai sotto zero, e la spunta non si ferma per il saldo.
 */
function yenDellEffetto(p:number,uid:string,e:EffettoVoceDto,ricevuta?:ReceiptEffettoVoceDto,porzione?:EffettiAzioneDto|null):YenDaMuovere|null {
  const x=e.effetto,spesa=(importo:number,motivo:string):YenDaMuovere=>({effettoUid:e.uid,importo:-importo,motivo});
  if(x.tipo==='articolo'){
    // l'acquisto segnato dalla spunta: la riga dello stato c'è anche quando l'articolo risultava già comprato, e allora il prezzo si scala solo se
    // a segnarlo era un'altra voce spuntata (un acquisto ripetuto nel gioco: Katsu il 06-05 e l'11-13). Già comprato dalla pagina del negozio, con
    // un regalo o prima della decisione 18 (nessuna voce lo rivendica): è lo stesso acquisto, già pagato, e niente si scala due volte
    const statoVoce=prepared('SELECT prima_json FROM utente.effetto_stato_voce WHERE partita_id=? AND voce_uid=? AND effetto_uid=?').get(p,uid,e.uid) as {prima_json:string}|undefined;
    if(!statoVoce)return null;
    const giaComprato=leggiJsonRegistro<{gia?:boolean}|null>(statoVoce.prima_json,'stato prima dell’acquisto')?.gia===true;
    if(giaComprato&&!prepared("SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id=? AND tipo='articolo' AND chiave=? AND voce_uid<>?").get(p,x.articolo,uid))return null;
    // il nome del catalogo, se il file di gioco lo ha (come `esitiAttivitaService.articoloEsito`), altrimenti quello del listino
    const conCatalogo=!!prepared("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='catalogo_oggetto'").get();
    const a=prepared(conCatalogo?"SELECT COALESCE(c.nome,NULLIF(a.nome,''),a.chiave) AS nome,a.prezzo FROM main.articolo a LEFT JOIN main.catalogo_oggetto c ON c.chiave=a.catalogo_chiave WHERE a.chiave=?":"SELECT COALESCE(NULLIF(nome,''),chiave) AS nome,prezzo FROM main.articolo WHERE chiave=?").get(x.articolo) as {nome:string;prezzo:number|null}|undefined;
    const copie=x.quantita??1;
    return a?.prezzo!=null&&a.prezzo>0?spesa(a.prezzo*copie,`Acquisto: ${a.nome}${copie>1?` ×${copie}`:''}`):null;
  }
  if(x.tipo==='acquisto'&&ricevuta?.creato){
    const a=prepared('SELECT prezzo_yen FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(p,String(ricevuta.ricevuta.acquistoId)) as {prezzo_yen:number}|undefined;
    return a&&a.prezzo_yen>0?spesa(a.prezzo_yen,'Consumazione Aojiru'):null;
  }
  if(x.tipo==='pesca'&&ricevuta?.creato){
    const quota=quotaSessionePesca(p,String(ricevuta.ricevuta.sessioneId));
    return quota!==null&&quota>0?spesa(quota,'Quota della visita di pesca'):null;
  }
  if(x.tipo==='lettura'&&x.categoria==='film'){
    const l=porzione?.letture?.find((v)=>v.categoria==='film'&&v.chiave===x.chiave);
    const f=prepared('SELECT nome,prezzo FROM main.film WHERE chiave=?').get(x.chiave) as {nome:string;prezzo:number|null}|undefined;
    return l&&(l.visione===true||l.dopo>l.prima)&&f?.prezzo!=null&&f.prezzo>0?spesa(f.prezzo,`Biglietto del cinema: ${f.nome}`):null;
  }
  return null;
}
function verificaNuovoEffetto(e:EffettoVoce):void {if(e.tipo==='fortuna'||e.tipo==='yen')return;if(eEffettoDiStato(e)){verificaEffettoDiStato(e);return;}if(e.tipo==='acquisto')verificaOffertaConsumo(e.articolo);else if(e.tipo==='pesca'){if(e.attivita!==ATTIVITA_PESCA||e.regola!==REGOLA_PESCA||leggiRegolaPesca(e.regola).stato!=='collegata')throw httpErrors.conflict('pesca-regola-assente','La fonte della pesca non è collegata a una regola leggibile.');}else verificaEffetti([e]);}
function verificaLista(effetti:EffettoVoceDto[]):void {
  const ids=new Set<string>(),rivendicati=new Set<string>();
  for(const e of effetti){if(!/^[0-9a-f]{32}$/.test(e.uid)||ids.has(e.uid))throw httpErrors.badRequest('identita-effetto-non-valida','Gli UID degli effetti devono essere distinti.');ids.add(e.uid);}
  // L13 (decisione 2): gli yen che un altro dato porta già (il prezzo di un articolo o di una consumazione, la quota della pesca, le
  // ricompense di una Richiesta completata, la paga o il costo del turno di un'attività, il prezzo del film visto) li muove quel dato: un
  // effetto «yen» accanto a loro li conterebbe due volte. Qui gli effetti; il collegamento della voce lo guarda `verificaYenVoce` al salvataggio
  const motivo=motivoYenGiaStrutturati(effetti.map((e)=>e.effetto),{riferimento:null,yenDi:yenDelDato});
  if(motivo)throw httpErrors.conflict('yen-gia-strutturati',motivo);
  if(effetti.filter((e)=>e.effetto.tipo==='yen').length>1)throw httpErrors.badRequest('yen-ripetuti','Una voce ha al più un effetto Yen: scrivi l’importo complessivo.');
  for(const e of effetti)if(e.effetto.tipo==='acquisto')for(const id of e.effetto.sostituisceDoti){
    const sostituito=effetti.find((x)=>x.uid===id);
    if(!sostituito||sostituito.effetto.tipo!=='dote'||rivendicati.has(id))throw httpErrors.badRequest('sostituzione-non-valida','Ogni sostituzione deve indicare una Dote presente, rivendicata da un solo acquisto.');rivendicati.add(id);
  }
  for(const e of effetti)if(e.effetto.tipo==='pesca')for(const [famiglia,elenco] of [['turno',e.effetto.sostituisceTurni],['dote',e.effetto.sostituisceDoti]] as const)for(const id of elenco){
    const sostituito=effetti.find(x=>x.uid===id);
    if(!sostituito||sostituito.effetto.tipo!==famiglia||rivendicati.has(id)||sostituito.effetto.tipo==='turno'&&!eAttivitaPesca(sostituito.effetto.attivita)||sostituito.effetto.tipo==='dote'&&sostituito.effetto.dote!=='perizia')throw httpErrors.conflict('pesca-sostituzione-non-valida','Ogni raccordo deve indicare un turno di pesca o una Dote Perizia presente, rivendicati da una sola fonte.');rivendicati.add(id);
  }
}
/**
 * L13 (decisione 2): la regola degli yen già portati da un altro dato, con anche il collegamento della voce (film, attività o Richiesta con i
 * suoi yen). Al salvataggio degli effetti e, cambiando il collegamento, dopo averlo scritto (`giornataService.aggiornaVoce`): 409 se non vale.
 */
export function verificaYenVoce(uid:string,effetti?:readonly EffettoVoce[]):void {
  const v=prepared('SELECT riferimento_tipo,riferimento_chiave FROM main.voce_giornata WHERE uid=?').get(uid) as {riferimento_tipo:string|null;riferimento_chiave:string|null}|undefined;
  const lista=effetti??(prepared('SELECT dati_json FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine').all(uid) as Array<{dati_json:string}>).flatMap((r)=>{const e=normalizzaEffettoVoce(leggiJsonRegistro(r.dati_json,'effetto della voce'));return e?[e]:[];});
  const motivo=motivoYenGiaStrutturati(lista,{riferimento:v?.riferimento_tipo&&v.riferimento_chiave?{tipo:v.riferimento_tipo,chiave:v.riferimento_chiave}:null,yenDi:yenDelDato});
  if(motivo)throw httpErrors.conflict('yen-gia-strutturati',motivo);
}
function scriviLista(uid:string,effetti:EffettoVoceDto[],raw:string):void {
  verificaLista(effetti);verificaYenVoce(uid,effetti.map((e)=>e.effetto));const adesso=nowIso();
  prepared('DELETE FROM main.voce_effetto WHERE voce_uid=?').run(uid);
  for(const [ordine,e] of effetti.entries())prepared('INSERT INTO main.voce_effetto(uid,voce_uid,ordine,tipo,chiave,dati_json,origine,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(e.uid,uid,ordine,e.effetto.tipo,chiaveEffetto(e.effetto),jsonCanonico(e.effetto),e.origine,adesso);
  prepared(`INSERT INTO main.voce_effetto_transizione(voce_uid,stato,raw_json,motivo,impronta,aggiornata_il) VALUES(?,'convertita',?,NULL,?,?)
    ON CONFLICT(voce_uid) DO UPDATE SET stato='convertita',motivo=NULL,impronta=excluded.impronta,aggiornata_il=excluded.aggiornata_il`).run(uid,raw,improntaDato(effetti.map((e)=>e.effetto)),adesso);
}
export function inizializzaEffettiVoce(uid:string,elenco:EffettoVoce[],origine:EffettoVoceDto['origine']='utente'):void {
  if(!getDb().inTransaction)throw new Error('La creazione degli effetti richiede la transazione della voce.');
  const v=voce(uid),riconosciuti=normalizzaEffettiVoce(elenco);
  if(riconosciuti===null)throw httpErrors.badRequest('effetti-non-validi','La lista completa degli effetti non è riconoscibile.');
  const validi=fondiArticoliUguali(riconosciuti.map((effetto)=>({effetto}))).map((x)=>x.effetto);
  if(v.genere!=='azione'&&validi.length)throw httpErrors.conflict('voce-non-spuntabile','Soltanto un’azione può avere effetti eseguibili.');
  for(const e of validi)verificaNuovoEffetto(e);
  if(prepared('SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid=?').get(uid))throw httpErrors.conflict('effetti-gia-inizializzati','La voce possiede già la propria fonte.');
  scriviLista(uid,validi.map((effetto,ordine)=>({uid:nuovoUid(),ordine,effetto,origine})),'[]');
}
export function salvaEffettiVoce(uid:string,r:RichiestaSalvaEffettiVoce):StatoEffettiVoceDto {
  return getDb().transaction(()=>{
    const prima=leggiEffettiVoce(uid);if(prima.revisione!==r.revisioneEffettiAttesa)throw httpErrors.conflict('effetti-cambiati','Gli effetti o la fonte sono cambiati: rileggi prima di salvare.');
    if(voce(uid).genere!=='azione'&&r.effetti.length)throw httpErrors.conflict('voce-non-spuntabile','Soltanto un’azione può avere effetti eseguibili.');
    const usati=new Set<string>();
    // L13 (ondata 4a): lo stesso articolo in più effetti è un solo effetto con le copie sommate (la regola della pagina, `fondiArticoliUguali`)
    const riconosciuti=r.effetti.map((x)=>{const effetto=normalizzaEffettoVoce(x.effetto);if(!effetto)throw httpErrors.badRequest('effetto-non-valido','Un effetto della lista non è riconoscibile integralmente.');return {uid:x.uid,effetto};});
    const nuovi=fondiArticoliUguali(riconosciuti).map((x,ordine):EffettoVoceDto=>{
      const effetto=x.effetto;
      const old=x.uid===null?undefined:prima.effetti.find((e)=>e.uid===x.uid);
      if(x.uid!==null&&(!old||usati.has(x.uid)))throw httpErrors.conflict('uid-effetto-diverso','Un UID non appartiene alla fonte corrente oppure è duplicato.');
      if(x.uid)usati.add(x.uid);
      const uguale=old&&jsonCanonico(old.effetto)===jsonCanonico(effetto),id=old?.uid??nuovoUid();
      if(!uguale)verificaNuovoEffetto(effetto);
      return {uid:id,ordine,effetto,origine:uguale?old.origine:'utente'};
    });
    verificaLista(nuovi);
    if(prima.stato==='convertita'&&jsonCanonico(prima.effetti)===jsonCanonico(nuovi))return prima;
    const id=nuovoUid();
    prepared('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)').run(id,uid,jsonCanonico(r),jsonCanonico(prima),jsonCanonico(nuovi),nowIso());
    scriviLista(uid,nuovi,prima.rawLegacy);
    const partite=prepared('SELECT partita_id FROM utente.spunta_voce_partita WHERE voce_uid=?').all(uid) as Array<{partita_id:number}>;
    for(const p of partite)for(const e of nuovi){const old=prima.effetti.find((x)=>x.uid===e.uid);if(!old||jsonCanonico(old.effetto)!==jsonCanonico(e.effetto))creaPropostaEffettoStorico(p.partita_id,uid,e.uid,old);}
    for(const p of partite)for(const e of nuovi)if(e.effetto.tipo==='acquisto')for(const id of e.effetto.sostituisceDoti)creaPropostaEffettoStorico(p.partita_id,uid,id);
    return leggiEffettiVoce(uid);
  })();
}
export function copiaEffettiVoce(daUid:string,aUid:string):void {
  if(!getDb().inTransaction)throw new Error('La copia richiede la transazione della voce.');
  const fonte=leggiEffettiVoce(daUid);voce(aUid);
  if(prepared('SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid=?').get(aUid))throw httpErrors.conflict('fonte-gia-presente','La destinazione possiede già una fonte.');
  if(fonte.stato==='legacy-da-correggere'){
    prepared('INSERT INTO main.voce_effetto_transizione(voce_uid,stato,raw_json,motivo,impronta,aggiornata_il) VALUES(?,?,?,?,?,?)').run(aUid,fonte.stato,fonte.rawLegacy,fonte.motivo,improntaDato(fonte.rawLegacy),nowIso());return;
  }
  const mappa=new Map(fonte.effetti.map((e)=>[e.uid,nuovoUid()]));
  const effetti=fonte.effetti.map((e):EffettoVoceDto=>({...e,uid:mappa.get(e.uid)!,effetto:e.effetto.tipo==='acquisto'?{...e.effetto,sostituisceDoti:e.effetto.sostituisceDoti.map((id)=>mappa.get(id)!)}:e.effetto.tipo==='pesca'?{...e.effetto,sostituisceDoti:e.effetto.sostituisceDoti.map(id=>mappa.get(id)!),sostituisceTurni:e.effetto.sostituisceTurni.map(id=>mappa.get(id)!)}:e.effetto}));
  scriviLista(aUid,effetti,fonte.rawLegacy);
}

function ricevutaDto(r:RigaRicevuta):ReceiptEffettoVoceDto {
  const prima=r.prima_json===null?null:leggiJsonRegistro(r.prima_json,'prima dell’effetto'),ricevuta=leggiJsonRegistro<Record<string,unknown>>(r.ricevuta_json,'effetto applicato');
  if(r.formato!==1||!['dote','lettura','turno','acquisto','pesca','yen','contesto'].includes(r.tipo)||!ricevuta||typeof ricevuta!=='object'||Array.isArray(ricevuta)||!Array.isArray(ricevuta.benefici)||ricevuta.voceUid!==r.voce_uid||ricevuta.effettoUid!==r.effetto_uid)throw httpErrors.conflict('ricevuta-effetto-incoerente','La ricevuta non coincide con l’identità dell’effetto.');
  for(const b of ricevuta.benefici)verificaBeneficio(b);
  if(r.tipo!=='contesto'){
    const configurazione=prima&&typeof prima==='object'&&!Array.isArray(prima)?normalizzaEffettoVoce((prima as {effetto?:unknown}).effetto):null;
    if(!configurazione||configurazione.tipo!==r.tipo||chiaveEffetto(configurazione)!==r.chiave)throw httpErrors.conflict('versione-ricevuta-incoerente','La fotografia della versione precedente non è riconoscibile o coincide con un’altra identità.');
  }
  if(r.tipo==='acquisto'&&(typeof ricevuta.acquistoId!=='string'||typeof ricevuta.provenienzaId!=='string'))throw httpErrors.conflict('ricevuta-acquisto-incoerente','Mancano le identità possedute dell’acquisto.');
  if(r.tipo==='acquisto'){
    const fatto=prepared('SELECT articolo_chiave FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(r.partita_id,ricevuta.acquistoId) as {articolo_chiave:string}|undefined;
    const fonte=prepared('SELECT partita_id,acquisto_id,voce_uid,effetto_uid FROM utente.acquisto_provenienza WHERE id=?').get(ricevuta.provenienzaId) as {partita_id:number;acquisto_id:string;voce_uid:string;effetto_uid:string}|undefined;
    if(!fatto||fatto.articolo_chiave!==r.chiave||(fonte&&(fonte.partita_id!==r.partita_id||fonte.acquisto_id!==ricevuta.acquistoId||fonte.voce_uid!==r.voce_uid||fonte.effetto_uid!==r.effetto_uid)))throw httpErrors.conflict('catena-acquisto-incoerente','La ricevuta appartiene a un altro fatto o a un’altra provenienza.');
  }
  if(r.tipo==='pesca'){
    const op=ricevuta.operazione as {operazioneId?:unknown;sessioneId?:unknown;provenienzaId?:unknown;partitaId?:unknown;richiesta?:unknown}|undefined;
    const journal=op&&typeof op.operazioneId==='string'?prepared('SELECT ricevuta_json FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(r.partita_id,op.operazioneId) as {ricevuta_json:string}|undefined:undefined;
    if(!op||op.partitaId!==r.partita_id||op.sessioneId!==ricevuta.sessioneId||op.provenienzaId!==ricevuta.provenienzaId||!journal||jsonCanonico(leggiJsonRegistro(journal.ricevuta_json))!==jsonCanonico(op))throw httpErrors.conflict('pesca-ricevuta-incoerente','La ricevuta della pesca non coincide con il journal della sessione.');
  }
  return {id:r.id,partitaId:r.partita_id,voceUid:r.voce_uid,effettoUid:r.effetto_uid,ordine:r.effetto_ordine,formato:1,tipo:r.tipo as ReceiptEffettoVoceDto['tipo'],chiave:r.chiave,prima,ricevuta,creato:r.creato===1,applicatoIl:r.applicato_il,annullatoIl:r.annullato_il,sostituitaDa:r.sostituita_da,assorbitaDa:r.assorbita_da};
}
export function leggiRicevuteEffettiVoce(p:number,uid:string):ReceiptEffettoVoceDto[] {
  verificaPartita(p);const righe=(prepared('SELECT * FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? ORDER BY applicato_il,id').all(p,uid) as RigaRicevuta[]),ricevute=righe.map(ricevutaDto);
  for(const r of ricevute)if(r.sostituitaDa){const successiva=ricevute.find((x)=>x.id===r.sostituitaDa);if(!r.annullatoIl||!successiva||successiva.effettoUid!==r.effettoUid||successiva.ricevuta.sostituisceRicevuta!==r.id)throw httpErrors.conflict('catena-ricevute-incoerente','La catena delle versioni non è integra.');const visti=new Set([r.id]);let prossima:ReceiptEffettoVoceDto|undefined=successiva;while(prossima){if(visti.has(prossima.id))throw httpErrors.conflict('catena-ricevute-ciclica','La catena contiene un ciclo.');visti.add(prossima.id);prossima=prossima.sostituitaDa?ricevute.find((x)=>x.id===prossima!.sostituitaDa):undefined;}}
  for(const r of ricevute)if(r.assorbitaDa){const destinazione=ricevute.find((x)=>x.id===r.assorbitaDa),ids=destinazione?.ricevuta.assorbeRicevute;
    if(destinazione?.tipo==='pesca'){
      if(!['dote','turno'].includes(r.tipo)||!r.annullatoIl||r.sostituitaDa||!Array.isArray(ids)||ids.filter(id=>id===r.id).length!==1)throw httpErrors.conflict('pesca-assorbimento-incoerente','La porzione legacy non possiede una fonte pesca reciproca.');
      verificaPorzionePesca(r);continue;
    }
    if(r.tipo!=='dote'||!r.annullatoIl||r.sostituitaDa||!destinazione||destinazione.tipo!=='acquisto'||!Array.isArray(ids)||ids.filter((id)=>id===r.id).length!==1)throw httpErrors.conflict('assorbimento-incoerente','La ricevuta Dote non ha il proprio acquisto reciproco.');
    const legacy=leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy)),benefici=r.ricevuta.benefici as unknown[];
    if(!legacy||legacy.confidente||legacy.incontro||legacy.turni?.length||legacy.letture?.length||legacy.apertureDedali?.length||legacy.doti.length!==1||legacy.doti[0]!.chiave!==r.chiave||benefici.length!==1)throw httpErrors.conflict('assorbimento-incoerente','La ricevuta assorbita non è una Dote pura.');
    const b=verificaBeneficio(benefici[0]);if(b.tipo!=='dote'||b.chiave!==r.chiave||b.delta!==legacy.doti[0]!.delta||b.delta<0)throw httpErrors.conflict('assorbimento-incoerente','La Dote assorbita e il beneficio non coincidono.');
  }
  for(const r of ricevute)if(r.ricevuta.assorbeRicevute!==undefined){const ids=r.ricevuta.assorbeRicevute;if(!['acquisto','pesca'].includes(r.tipo)||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some((id)=>typeof id!=='string'||!ricevute.some((x)=>x.id===id&&x.assorbitaDa===r.id)))throw httpErrors.conflict('assorbimento-incoerente','Il fatto contiene assorbimenti non reciproci.');}
  return ricevute;
}
function registraRicevuta(p:number,uid:string,e:{uid:string;ordine:number;effetto:EffettoVoce|null},ricevuta:Record<string,unknown>,creato:boolean,opz:{id?:string}={}):ReceiptEffettoVoceDto {
  const id=opz.id??nuovoUid(),adesso=nowIso(),dati={...ricevuta,voceUid:uid,effettoUid:e.uid};
  if(prepared('SELECT 1 FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? AND annullato_il IS NULL').get(p,uid,e.uid))throw httpErrors.conflict('effetto-gia-applicato','L’effetto possiede già una ricevuta attiva.');
  prepared('INSERT INTO utente.effetto_applicato(id,partita_id,voce_uid,effetto_uid,effetto_ordine,formato,tipo,chiave,prima_json,ricevuta_json,creato,applicato_il) VALUES(?,?,?,?,?,1,?,?,?,?,?,?)').run(id,p,uid,e.uid,e.ordine,e.effetto?.tipo??'contesto',e.effetto?chiaveEffetto(e.effetto):null,jsonCanonico(e.effetto?{effetto:e.effetto}:{contesto:true}),jsonCanonico(dati),creato?1:0,adesso);
  riconciliaBeneficiVoce(p,uid,e.uid);return ricevutaDto(prepared('SELECT * FROM utente.effetto_applicato WHERE id=?').get(id) as RigaRicevuta);
}
function beneficiLegacy(e:EffettiAzioneDto|null,storica:boolean):Array<{tipo:'dote';chiave:string;delta:number;motivo:string;storica:boolean}> {
  const somma=new Map<string,number>();
  for(const d of [...(e?.doti??[]),...(e?.letture??[]).flatMap((l)=>l.doti??[]),...(e?.turni??[]).flatMap((t)=>t.doti),...(e?.incontro?.doti??[])]){
    if(!eDote(d.chiave)||!Number.isInteger(d.delta))throw httpErrors.conflict('beneficio-legacy-incoerente','La ricevuta contiene una Dote o una quantità non riconoscibile.');somma.set(d.chiave,(somma.get(d.chiave)??0)+d.delta);
  }
  return [...somma].filter(([,delta])=>delta!==0).map(([chiave,delta])=>({tipo:'dote',chiave,delta,motivo:'Dote della voce confermata, da applicare esplicitamente.',storica}));
}
/** Fotografie solo delle risorse nominate dalla porzione tipizzata, mai SQL preso dal receipt. */
function risorseLegacy(p:number,e:EffettiAzioneDto|null):unknown {
  return {
    turni:(e?.turni??[]).map((t)=>({attivita:t.attivita,ordine:t.ordine,turno:prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND attivita_chiave=? AND ordine=?').get(p,t.attivita,t.ordine)??null,effetti:prepared("SELECT * FROM utente.effetto_lettura_partita WHERE partita_id=? AND tipo='attivita' AND chiave=? AND ordine=? ORDER BY dote_chiave").all(p,t.attivita,t.ordine)})),
    letture:(e?.letture??[]).map((l)=>{
      const progresso=l.categoria==='libro'?prepared('SELECT * FROM utente.progresso_libro_partita WHERE partita_id=? AND libro_chiave=?').get(p,l.chiave):l.categoria==='film'?prepared('SELECT * FROM utente.progresso_film_partita WHERE partita_id=? AND film_chiave=?').get(p,l.chiave):prepared('SELECT * FROM utente.progresso_videogioco_partita WHERE partita_id=? AND videogioco_chiave=?').get(p,l.chiave);
      // R10-20: «letto» non si fotografa più dalla riga `lettura_partita` (specchio derivato): si calcola dall'avanzamento (`lettureCompletate`),
      // che la fotografia contiene già in `progresso`
      return {categoria:l.categoria,chiave:l.chiave,progresso:progresso??null,effetti:prepared('SELECT * FROM utente.effetto_lettura_partita WHERE partita_id=? AND tipo=? AND chiave=? ORDER BY ordine,dote_chiave').all(p,l.categoria,l.chiave)};
    }),
  };
}
function verificaRisorseRicevuta(p:number,r:ReceiptEffettoVoceDto):EffettiAzioneDto|null {
  const legacy=leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy));
  if((legacy?.turni?.length||legacy?.letture?.length)&&(!('risorse' in r.ricevuta)||!risorseCompatibiliPesca(p,r.ricevuta.risorse,risorseLegacy(p,legacy))))throw httpErrors.conflict('risorse-effetto-cambiate','Turno o lettura sono cambiati dopo la ricevuta: nessuna sostituzione o rimozione di risorse successive.');
  return legacy;
}
/** La029 aggiunge UID NULL. Un UID assegnato dopo è ignorabile soltanto col raccordo storico esplicito della stessa riga. */
function risorseCompatibiliPesca(p:number,prima:unknown,ora:unknown):boolean {
  if(!prima||!ora||typeof prima!=='object'||typeof ora!=='object')return false;
  const a=prima as {turni?:unknown[]},b=JSON.parse(jsonCanonico(ora)) as {turni?:Array<Record<string,unknown>>};
  if(Array.isArray(a.turni)&&Array.isArray(b.turni)&&a.turni.length===b.turni.length)for(const [i,t] of b.turni.entries()){
    const old=a.turni[i] as {attivita?:unknown;ordine?:unknown;turno?:Record<string,unknown>|null}|undefined,current=t.turno as Record<string,unknown>|null;
    if(!old?.turno||!current||old.attivita!==t.attivita||old.ordine!==t.ordine||old.turno.uid!==undefined&&old.turno.uid!==null)continue;
    const nuovoUid=current.uid;
    const aggiuntaNulla=old.turno.uid===undefined&&nuovoUid===null;
    const raccordo=typeof nuovoUid==='string'&&provaUidTurnoPesca(p,t.attivita,t.ordine,old.turno,current);
    if(aggiuntaNulla||raccordo){if(Object.hasOwn(old.turno,'uid'))current.uid=old.turno.uid;else delete current.uid;}
  }
  // le ricevute di prima portano anche `letto` (la riga dello specchio `lettura_partita`): non fa più parte della fotografia
  const senzaLetto=(x:unknown):unknown=>{if(!x||typeof x!=='object')return x;const o=x as {letture?:unknown};if(!Array.isArray(o.letture))return x;return {...o,letture:o.letture.map((l)=>{if(!l||typeof l!=='object')return l;const {letto:_letto,...resto}=l as Record<string,unknown>;return resto;})};};
  return jsonCanonico(senzaLetto(prima))===jsonCanonico(senzaLetto(b));
}
function porzioniLegacy(effetti:EffettoVoceDto[],legacy:EffettiAzioneDto|null):Map<string,EffettiAzioneDto> {
  const out=new Map<string,EffettiAzioneDto>();let d=0,l=0,t=0;
  for(const e of effetti){const segmento:EffettiAzioneDto={doti:[],confidente:null};
    if(e.effetto.tipo==='dote'){const v=legacy?.doti[d++];if(!v||v.chiave!==e.effetto.dote)throw httpErrors.conflict('porzione-dote-non-provata','La ricevuta non corrisponde all’ordine degli effetti Dote.');segmento.doti=[v];}
    else if(e.effetto.tipo==='lettura'){const v=legacy?.letture?.[l++];if(!v||v.chiave!==e.effetto.chiave||v.categoria!==e.effetto.categoria)throw httpErrors.conflict('porzione-lettura-non-provata','La ricevuta non corrisponde all’ordine delle letture.');segmento.letture=[v];}
    else if(e.effetto.tipo==='turno'){const v=legacy?.turni?.[t++];if(!v||v.attivita!==e.effetto.attivita)throw httpErrors.conflict('porzione-turno-non-provata','La ricevuta non corrisponde all’ordine dei turni.');segmento.turni=[v];}
    else throw httpErrors.conflict('tipo-porzione-non-valido','Un acquisto non appartiene alla ricevuta legacy.');
    out.set(e.uid,segmento);
  }
  if(d!==(legacy?.doti.length??0)||l!==(legacy?.letture?.length??0)||t!==(legacy?.turni?.length??0))throw httpErrors.conflict('porzioni-incomplete','La ricevuta contiene effetti legacy non attribuibili alla lista eseguita.');
  return out;
}
function registraConsumo(p:number,uid:string,e:EffettoVoceDto,r:RichiestaRegistraAcquisto,porte?:PorteDisponibilitaAcquisto,nuovaSpunta=false,opz:{id?:string;sostituisceRicevuta?:string;assorbeRicevute?:string[];generazione?:string}={}):ReceiptEffettoVoceDto {
  if(e.effetto.tipo!=='acquisto'||r.fonte.tipo!=='diario'||r.fonte.voceUid!==uid||r.fonte.effettoUid!==e.uid||r.articolo!==e.effetto.articolo)throw httpErrors.conflict('fonte-acquisto-diversa','La richiesta non appartiene a questo effetto del Diario.');
  if(e.effetto.variante!==null&&e.effetto.variante!==r.variante)throw httpErrors.conflict('osservazione-diversa','La variante diverge dall’effetto confermato: correggi esplicitamente la fonte.');
  if(prepared('SELECT 1 FROM utente.acquisto_operazione WHERE partita_id=? AND operazione_id=?').get(p,r.operazioneId))throw httpErrors.conflict('operazione-diario-gia-conclusa','L’operazione d’acquisto è già conclusa: rileggi lo stato della spunta o della proposta. La sua ricevuta storica non viene riutilizzata per una nuova applicazione.');
  const ricevuta=registraAcquistoNellaTransazione(p,r,porte,{nuovaSpunta});
  if(!ricevuta.acquistoId||!ricevuta.provenienzaId)throw httpErrors.conflict('ricevuta-acquisto-assente','La registrazione non ha prodotto una provenienza identificabile.');
  return registraRicevuta(p,uid,e,{benefici:[],acquistoId:ricevuta.acquistoId,provenienzaId:ricevuta.provenienzaId,operazione:ricevuta,...(opz.generazione?{generazione:opz.generazione}:{}),...(opz.sostituisceRicevuta?{sostituisceRicevuta:opz.sostituisceRicevuta}:{}),...(opz.assorbeRicevute?.length?{assorbeRicevute:opz.assorbeRicevute}:{})},ricevuta.esito==='registrata',{id:opz.id});
}
function registraPesca(p:number,uid:string,e:EffettoVoceDto,r:RichiestaRegistraSessionePesca,generazione:string,nuovaSpunta:boolean,opz:{id?:string;sostituisceRicevuta?:string;assorbeRicevute?:string[]}={}):ReceiptEffettoVoceDto {
  if(e.effetto.tipo!=='pesca'||r.fonte.tipo!=='diario'||r.fonte.voceUid!==uid||r.fonte.effettoUid!==e.uid)throw httpErrors.conflict('pesca-fonte-diversa','La sessione non appartiene a questo effetto della voce.');
  if(prepared('SELECT 1 FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,r.operazioneId))throw httpErrors.conflict('pesca-operazione-diario-conclusa','Questa operazione appartiene a una generazione già conclusa. Non viene riutilizzata per una nuova spunta.');
  const operazione=confermaPesca(p,'registra-sessione',r,null,{generazione,nuovaSpunta,voceUid:uid,effettoUid:e.uid});
  return registraRicevuta(p,uid,e,{benefici:[],sessioneId:operazione.sessioneId,provenienzaId:operazione.provenienzaId,operazione,generazione,...(opz.sostituisceRicevuta?{sostituisceRicevuta:opz.sostituisceRicevuta}:{}),...(opz.assorbeRicevute?.length?{assorbeRicevute:opz.assorbeRicevute}:{})},operazione.esito==='sessione-creata',{id:opz.id});
}
interface AssorbimentoDote {ricevuta:ReceiptEffettoVoceDto;nodo:EffettoVoceDto&{effetto:Extract<EffettoVoce,{tipo:'dote'}>};q:number}
function verificaPorzionePesca(r:ReceiptEffettoVoceDto):EffettiAzioneDto {
  const l=leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy));
  if(!l||l.confidente||l.incontro||l.letture?.length||l.apertureDedali?.length)throw httpErrors.conflict('pesca-porzione-non-pura','La fonte pregressa non è una porzione isolata della pesca.');
  if(r.tipo==='dote'){
    if(l.turni?.length||l.doti.length!==1||l.doti[0]!.chiave!=='perizia')throw httpErrors.conflict('pesca-porzione-non-pura','Il raccordo Dote richiede una sola Perizia attribuibile.');
  }else if(r.tipo==='turno'){
    if(l.doti.length||l.turni?.length!==1||!['pesca-ichigaya','sfida-pesca-guardiano-ichigaya'].includes(l.turni[0]!.attivita)||l.turni[0]!.doti.some(d=>d.chiave!=='perizia'))throw httpErrors.conflict('pesca-porzione-non-pura','Il raccordo turno richiede una sola visita di pesca già registrata.');
  }else throw httpErrors.conflict('pesca-porzione-non-pura','Tipo della porzione pesca non riconosciuto.');
  const dichiarati=beneficiLegacy(l,true),benefici=r.ricevuta.benefici;
  if(!Array.isArray(benefici)||benefici.length!==dichiarati.length||benefici.some((b,i)=>{const v=verificaBeneficio(b),d=dichiarati[i]!;return v.tipo!=='dote'||v.chiave!=='perizia'||v.delta!==d.delta||v.delta<0;}))throw httpErrors.conflict('pesca-beneficio-non-provato','La porzione pregressa non dimostra il beneficio Perizia da riallocare.');
  return l;
}
function preparaAssorbimentiPesca(p:number,uid:string,e:EffettoVoceDto,r:NuovaSessionePesca,tutte:ReceiptEffettoVoceDto[]):Array<{ricevuta:ReceiptEffettoVoceDto;q:number}> {
  if(e.effetto.tipo!=='pesca')return [];
  const out:Array<{ricevuta:ReceiptEffettoVoceDto;q:number}>=[],stato=leggiEffettiVoce(uid);
  for(const id of [...e.effetto.sostituisceTurni,...e.effetto.sostituisceDoti]){
    const nodo=stato.effetti.find(n=>n.uid===id),attiva=tutte.find(x=>x.effettoUid===id&&x.annullatoIl===null),b=saldoDoteVoce(p,uid,id,'perizia').attribuito;
    if(!Number.isSafeInteger(b)||b<0)throw httpErrors.conflict('pesca-attribuzione-incoerente','L’attribuzione pregressa della Perizia non è integra.');
    if(!attiva){if(b!==0||tutte.some(x=>x.effettoUid===id&&x.assorbitaDa))throw httpErrors.conflict('pesca-sidecar-non-attribuibile','Un beneficio o una porzione già assorbita non possono essere attribuiti a una nuova sessione.');continue;}
    if(!nodo||jsonCanonico((attiva.prima as {effetto?:unknown}|null)?.effetto)!==jsonCanonico(nodo.effetto)||attiva.assorbitaDa||attiva.sostituitaDa)throw httpErrors.conflict('pesca-versione-diversa','La porzione eseguita non coincide con la versione rivendicata.');
    const l=verificaPorzionePesca(attiva);
    if(attiva.tipo==='turno'){
      verificaRisorseRicevuta(p,attiva);const t=l.turni![0]!;
      if(r.turno.tipo!=='esistente'||r.turno.ordine!==t.ordine)throw httpErrors.conflict('pesca-raccordo-turno-richiesto','La sessione deve rappresentare il turno esatto della vecchia ricevuta; nessun secondo turno viene creato.');
      const raw=prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND attivita_chiave=? AND ordine=?').get(p,t.attivita,t.ordine);
      if(improntaDato(raw)!==r.turno.firmaTurno)throw httpErrors.conflict('pesca-raccordo-turno-diverso','La firma non identifica il turno della porzione pregressa.');
    }
    out.push({ricevuta:attiva,q:b});
  }
  return out;
}
function preparaAssorbimentiDote(p:number,uid:string,e:EffettoVoceDto,r:NuovaRegistrazioneAcquisto,ricevute:ReceiptEffettoVoceDto[]):AssorbimentoDote[] {
  if(e.effetto.tipo!=='acquisto')return [];
  const fonte=leggiEffettiVoce(uid),proposte=leggiPropostePartita(p,{ancheChiuse:true}),out:AssorbimentoDote[]=[];
  for(const id of e.effetto.sostituisceDoti){
    const nodo=fonte.effetti.find((x)=>x.uid===id);
    if(!nodo||nodo.effetto.tipo!=='dote')throw httpErrors.conflict('dote-da-assorbire-assente','L’UID dichiarato non è una Dote della medesima voce.');
    const dote=nodo.effetto.dote,s=saldoDoteVoce(p,uid,id,dote);
    if(!Number.isSafeInteger(s.attribuito)||s.attribuito<0)throw httpErrors.conflict('attribuzione-dote-incoerente','B della Dote non è integro o non negativo.');
    const attiva=ricevute.find((x)=>x.effettoUid===id&&x.annullatoIl===null);
    if(!attiva){
      const assorbite=ricevute.filter((x)=>x.effettoUid===id&&x.assorbitaDa!==null);
      if(assorbite.length){const destinazione=r.scelta.tipo==='collega'?r.scelta.acquistoId:null;if(s.attribuito===0&&destinazione&&assorbite.some((x)=>ricevute.find((a)=>a.id===x.assorbitaDa)?.ricevuta.acquistoId===destinazione))continue;throw httpErrors.conflict('dote-gia-assorbita','La Dote appartiene già a un altro raccordo o conserva un’attribuzione non riconciliata: collega il medesimo fatto senza trasferirla di nuovo.');}
      const altraPromessa=proposte.some((x)=>x.stato==='aperta'&&x.causa.tipo==='voce'&&x.causa.chiave.startsWith(`${uid}:`)&&x.causa.chiave!==`${uid}:${e.uid}`&&((x.tipo==='dote'&&x.chiave===dote)||(x.tipo==='effetto-voce'&&((x.dati.effetto as {tipo?:unknown;dote?:unknown;variante?:unknown}|undefined)?.dote===dote||(x.dati.effetto as {variante?:unknown}|undefined)?.variante===dote))));
      const altroSidecar=ricevute.some((x)=>x.annullatoIl===null&&x.effettoUid!==e.uid&&Array.isArray(x.ricevuta.benefici)&&x.ricevuta.benefici.some((b)=>{const v=verificaBeneficio(b);return v.tipo==='dote'&&v.chiave===dote&&v.delta!==0;}));
      if(s.attribuito!==0||altraPromessa||altroSidecar)throw httpErrors.conflict('dote-precedente-da-riconciliare','Senza sidecar provato restano attribuzioni o promesse della Dote: riconciliale prima del raccordo.');
      continue; // Il promemoria legacy non prova alcuna attribuzione: la nuova Dote resta da dichiarare.
    }
    const configurazione=(attiva.prima as {effetto?:unknown}|null)?.effetto,legacy=leggiRicevutaEffettiAzione(jsonCanonico(attiva.ricevuta.legacy));
    const benefici=attiva.ricevuta.benefici as unknown[];
    if(attiva.tipo!=='dote'||attiva.assorbitaDa||attiva.sostituitaDa||jsonCanonico(configurazione)!==jsonCanonico(nodo.effetto)||!legacy||legacy.confidente||legacy.incontro||legacy.apertureDedali?.length||legacy.letture?.length||legacy.turni?.length||legacy.doti.length!==1||legacy.doti[0]!.chiave!==dote||benefici.length!==1)throw httpErrors.conflict('sidecar-dote-non-puro','La ricevuta non prova la sola versione Dote dichiarata.');
    const b=verificaBeneficio(benefici[0]);if(b.tipo!=='dote'||b.chiave!==dote||b.delta!==legacy.doti[0]!.delta||b.delta<0)throw httpErrors.conflict('beneficio-dote-non-provato','La Dote della ricevuta non coincide con il proprio beneficio.');
    out.push({ricevuta:attiva,nodo:nodo as AssorbimentoDote['nodo'],q:s.attribuito});
  }
  return out;
}
/** La spunta della voce. L13 (decisione 18): gli yen che muove (effetti, turni, Richieste) si eseguono alla fine, prima ciò che entra (`conYenInOrdine`). */
export function applicaEffettiVoce(...a:Parameters<typeof applicaEffettiVoceInOrdine>):ReturnType<typeof applicaEffettiVoceInOrdine> {return conYenInOrdine(()=>applicaEffettiVoceInOrdine(...a));}
function applicaEffettiVoceInOrdine(p:number,uid:string,porte:PorteEffettiLegacy,opz:{acquisti?:RichiestaRegistraAcquisto[];pesche?:RichiestaRegistraSessionePesca[];porteAcquisti?:PorteDisponibilitaAcquisto;spuntaFattaIl:string;scelteEsito?:SceltaEsitoSpunta[]}):{effettiLegacy:EffettiAzioneDto|null;receiptNuovi:ReceiptEffettoVoceDto[];proposte:PropostaPartitaDto[]} {
  if(!getDb().inTransaction)throw new Error('L’applicazione degli effetti richiede la transazione della spunta.');
  verificaPartita(p);const stato=leggiEffettiVoce(uid);
  if(stato.stato!=='convertita')throw httpErrors.conflict('effetti-da-correggere','Il RAW storico non è convertibile: correggi gli effetti prima di una nuova spunta.');
  verificaLista(stato.effetti);
  if(prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,uid))throw httpErrors.conflict('voce-gia-spuntata','Una spunta presente non viene rieseguita.');
  const consumi=stato.effetti.filter((e)=>e.effetto.tipo==='acquisto'),richieste=opz.acquisti??[];
  if(richieste.length!==consumi.length||new Set(richieste.map((r)=>r.fonte.tipo==='diario'?r.fonte.effettoUid:'')).size!==richieste.length||new Set(richieste.map((r)=>r.operazioneId)).size!==richieste.length)throw httpErrors.conflict('dati-acquisti-richiesti','Rivedi ogni consumazione della voce e invia variante osservata, Fortuna, eventuale raccordo e token insieme alla spunta, con operazioni distinte.');
  const receiptNuovi:ReceiptEffettoVoceDto[]=[],generazione=nuovoUid(),pesche=stato.effetti.filter(e=>e.effetto.tipo==='pesca'),richiestePesca=opz.pesche??[];
  if(richiestePesca.length!==pesche.length||new Set(richiestePesca.map(r=>r.operazioneId)).size!==richiestePesca.length||new Set([...richieste,...richiestePesca].map(r=>r.operazioneId)).size!==richieste.length+richiestePesca.length)throw httpErrors.conflict('pesca-osservazioni-richieste','Rivedi ogni visita di pesca con operazioni distinte prima della spunta.');
  for(const e of pesche){const r=richiestePesca.find(r=>r.fonte.tipo==='diario'&&r.fonte.voceUid===uid&&r.fonte.effettoUid===e.uid);if(!r)throw httpErrors.conflict('pesca-osservazione-mancante','Manca la visita osservata per un effetto pesca.');const {revisionePescaAttesa,...input}=r;if(anteprimaPesca(p,'registra-sessione',input).revisionePescaAttesa!==revisionePescaAttesa)throw httpErrors.conflict('pesca-cambiata','Una visita del gruppo è cambiata: nessun effetto viene applicato.');}
  // Tutti i token sono riferiti al medesimo stato precedente: non mutare un acquisto prima di validare gli altri.
  for(const e of consumi){const richiesta=richieste.find((r)=>r.fonte.tipo==='diario'&&r.fonte.effettoUid===e.uid);if(!richiesta)throw httpErrors.conflict('richiesta-acquisto-mancante','Manca il riepilogo di una consumazione.');const {revisioneAcquistiAttesa,...nuovo}=richiesta;if(anteprimaRegistrazioneAcquisto(p,nuovo,opz.porteAcquisti).revisioneAcquistiAttesa!==revisioneAcquistiAttesa)throw httpErrors.conflict('acquisti-cambiati','Una consumazione del gruppo è cambiata: nessuna spunta viene applicata.');}
  // L13 (decisione 18): gli yen che la spunta muove da soli, raccolti e mossi alla fine (prima i guadagni, poi le spese)
  const yenDaMuovere:Array<YenDaMuovere|null>=[];
  for(const e of consumi){const richiesta=richieste.find((r)=>r.fonte.tipo==='diario'&&r.fonte.effettoUid===e.uid)!;const {revisioneAcquistiAttesa:_prima,...nuovo}=richiesta;const token=anteprimaRegistrazioneAcquisto(p,nuovo,opz.porteAcquisti).revisioneAcquistiAttesa;const ricevuta=registraConsumo(p,uid,e,{...nuovo,revisioneAcquistiAttesa:token},opz.porteAcquisti,true,{generazione});receiptNuovi.push(ricevuta);yenDaMuovere.push(yenDellEffetto(p,uid,e,ricevuta));}
  for(const e of pesche){const r=richiestePesca.find(r=>r.fonte.tipo==='diario'&&r.fonte.effettoUid===e.uid)!;const {revisionePescaAttesa:_prima,...input}=r;const ricevuta=registraPesca(p,uid,e,{...input,revisionePescaAttesa:anteprimaPesca(p,'registra-sessione',input).revisionePescaAttesa},generazione,true);receiptNuovi.push(ricevuta);yenDaMuovere.push(yenDellEffetto(p,uid,e,ricevuta));}
  const sostituite=new Set([...consumi.flatMap((e)=>e.effetto.tipo==='acquisto'?e.effetto.sostituisceDoti:[]),...pesche.flatMap(e=>e.effetto.tipo==='pesca'?[...e.effetto.sostituisceDoti,...e.effetto.sostituisceTurni]:[])]);
  const legacy=stato.effetti.filter((e):e is EffettoVoceDto&{effetto:EffettoLegacyVoce}=>e.effetto.tipo!=='acquisto'&&e.effetto.tipo!=='pesca'&&e.effetto.tipo!=='fortuna'&&e.effetto.tipo!=='yen'&&!eEffettoDiStato(e.effetto)&&!sostituite.has(e.uid));
  // L13: le scelte d'esito (turni delle attività con esiti, Doti a valori possibili) si verificano tutte insieme, prima degli effetti legacy e nella
  // transazione della spunta: una scelta mancante o rifiutata annulla anche consumi e pesca già registrati qui sopra (niente resta a metà)
  const v=voce(uid),risolte=risolviScelteSpunta(p,{data:v.data,fascia:v.fascia},legacy,opz.scelteEsito);
  const effettiLegacy=porte.applicaLegacy(p,legacy.map((e)=>e.effetto),legacy.map((e)=>risolte.get(e.uid))),porzioni=porzioniLegacy(legacy,effettiLegacy),spunta={fattaIl:opz.spuntaFattaIl,raw:effettiLegacy?JSON.stringify(effettiLegacy):null};
  for(const e of legacy){const segmento=porzioni.get(e.uid)!;receiptNuovi.push(registraRicevuta(p,uid,e,{benefici:beneficiLegacy(segmento,false),legacy:segmento,risorse:risorseLegacy(p,segmento),gestitaDaSpunta:true,spunta},true));yenDaMuovere.push(yenDellEffetto(p,uid,e,undefined,segmento));}
  // L13 (decisione 18): gli yen della voce entrano o si scalano da soli (mai sotto zero), con la ricevuta che lo dice; togliendo la spunta tornano.
  // Solo una causa con yen ancora proposti in sospeso (proposta di prima, aperta o applicata) resta alla proposta «Applica», com'era
  for(const e of stato.effetti)if(e.effetto.tipo==='yen'){const y=ricevutaYen(p,uid,e as EffettoVoceDto&{effetto:Extract<EffettoVoce,{tipo:'yen'}>},{gestitaDaSpunta:true,spunta},false);receiptNuovi.push(y.ricevuta);yenDaMuovere.push(y.movimento);}
  if(effettiLegacy&&(effettiLegacy.confidente||effettiLegacy.incontro||effettiLegacy.apertureDedali?.length)){
    const contesto:EffettiAzioneDto={doti:[],confidente:effettiLegacy.confidente,...(effettiLegacy.incontro?{incontro:effettiLegacy.incontro}:{}),...(effettiLegacy.apertureDedali?{apertureDedali:effettiLegacy.apertureDedali}:{})};
    receiptNuovi.push(registraRicevuta(p,uid,{uid:createHash('sha256').update(`contesto-voce\0${uid}`).digest('hex').slice(0,32),ordine:stato.effetti.length,effetto:null},{benefici:beneficiLegacy(contesto,false),legacy:contesto,gestitaDaSpunta:true,contesto:true,spunta},true));
  }
  // la lettura della buona sorte: la spunta accende la Fortuna sulla Dote dell'effetto (si spegne togliendo la spunta o al cambio di giorno)
  for(const e of stato.effetti)if(e.effetto.tipo==='fortuna')accendiFortunaDaVoce(p,uid,e.effetto.dote);
  // gli effetti «segna lo stato» (evento di storia, domanda, cruciverba, Richiesta): stessi setter delle pagine, con il «prima» ricordato
  applicaEffettiDiStato(p,uid,stato.effetti.flatMap((e)=>eEffettoDiStato(e.effetto)?[{uid:e.uid,effetto:e.effetto}]:[]));
  // gli articoli comprati: il loro prezzo, solo se l'acquisto è stato davvero segnato (un articolo non ancora disponibile resta da segnare dal negozio)
  for(const e of stato.effetti)if(e.effetto.tipo==='articolo')yenDaMuovere.push(yenDellEffetto(p,uid,e));
  muoviYenDellaVoce(p,uid,yenDaMuovere);
  return {effettiLegacy,receiptNuovi,proposte:leggiPropostePartita(p)};
}

/** Raccordo esplicito di un effetto nuovo su una spunta già esistente; mai riesecuzione dell'intera spunta. */
export function applicaEffettoStorico(p:number,proposta:PropostaPartitaDto,acquisto:NuovaRegistrazioneAcquisto|undefined,token:string|undefined,porte:PorteEffettiLegacy,porteAcquisti?:PorteDisponibilitaAcquisto,pesca?:NuovaSessionePesca,tokenPesca?:string):void {
  if(!getDb().inTransaction)throw new Error('Il raccordo richiede la transazione della decisione.');
  const uid=proposta.dati.voceUid,id=proposta.dati.effettoUid;
  if(proposta.partitaId!==p||proposta.tipo!=='effetto-voce'||typeof uid!=='string'||typeof id!=='string'||!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,uid))throw httpErrors.conflict('raccordo-non-valido','La proposta non appartiene a una spunta attiva di questa partita.');
  const e=leggiEffettiVoce(uid).effetti.find((x)=>x.uid===id);if(!e||jsonCanonico(e.effetto)!==jsonCanonico(proposta.dati.effetto))throw httpErrors.conflict('effetto-cambiato','L’effetto è cambiato dopo la proposta.');
  const tutte=leggiRicevuteEffettiVoce(p,uid),attiva=tutte.find((r)=>r.effettoUid===id&&r.annullatoIl===null);
  if(proposta.dati.sostituzione===true&&(!attiva||attiva.id!==proposta.dati.ricevutaPrecedente))throw httpErrors.conflict('sostituzione-non-provata','La versione precedente non ha una ricevuta attribuibile: riconcilia prima, nessuna aggiunta viene inventata.');
  if(attiva&&jsonCanonico((attiva.prima as {effetto?:unknown}|null)?.effetto)!==jsonCanonico(proposta.dati.versionePrecedente))throw httpErrors.conflict('versione-precedente-diversa','La proposta non descrive la versione effettivamente applicata.');
  if(attiva&&proposta.dati.sostituzione!==true)throw httpErrors.conflict('effetto-gia-applicato','La versione possiede già una ricevuta attiva.');
  const nuovaRicevuta=nuovoUid(),vecchioLegacy=attiva&&attiva.tipo!=='acquisto'&&attiva.tipo!=='pesca'&&attiva.tipo!=='yen'?verificaRisorseRicevuta(p,attiva):null;
  const assorbimenti=e.effetto.tipo==='acquisto'&&acquisto?preparaAssorbimentiDote(p,uid,e,acquisto,tutte):[];
  const assorbimentiPesca=e.effetto.tipo==='pesca'&&pesca?preparaAssorbimentiPesca(p,uid,e,pesca,tutte):[];
  if(e.effetto.tipo==='pesca'&&(!pesca||!tokenPesca||anteprimaPesca(p,'registra-sessione',pesca).revisionePescaAttesa!==tokenPesca))throw httpErrors.conflict('pesca-cambiata','Rivedi la visita e il suo contesto prima del raccordo.');
  if(e.effetto.tipo==='acquisto'){
    if(!acquisto||!token)throw httpErrors.badRequest('consumazione-richiesta','Rivedi la consumazione completa prima del raccordo.');
    if(anteprimaRegistrazioneAcquisto(p,acquisto,porteAcquisti).revisioneAcquistiAttesa!==token)throw httpErrors.conflict('acquisti-cambiati','Il contesto dell’acquisto è cambiato.');
  }else if(acquisto!==undefined||token!==undefined)throw httpErrors.badRequest('payload-acquisto-inatteso','Un effetto diverso da acquisto non accetta una consumazione.');
  // L13: nel raccordo nessuno sceglie: vale l'esito atteso dichiarato dalla voce (o quello automatico del giorno), altrimenti si ferma
  // PRIMA di annullare la versione precedente (la voce si rispunta per scegliere)
  const sceltaStorica=risolviScelteSpunta(p,{data:voce(uid).data,fascia:voce(uid).fascia},[e],undefined,{storico:true}).get(e.uid);
  if(attiva){
    if(attiva.tipo==='contesto')throw httpErrors.conflict('contesto-non-sostituibile','Il contesto dell’incontro non è un effetto modificabile.');
    if(attiva.tipo==='acquisto')annullaFontiDiarioNellaTransazione(p,uid,[String(attiva.ricevuta.provenienzaId)],id);else if(attiva.tipo==='pesca'){const f=fontiPesca(p).find(f=>f.id===attiva.ricevuta.provenienzaId);if(f)rimuoviFontePescaNellaTransazione(p,f.id);}else if(vecchioLegacy)porte.annullaLegacy(p,vecchioLegacy);
    if(prepared('UPDATE utente.effetto_applicato SET annullato_il=?,sostituita_da=? WHERE partita_id=? AND id=? AND annullato_il IS NULL AND sostituita_da IS NULL').run(nowIso(),nuovaRicevuta,p,attiva.id).changes!==1)throw httpErrors.conflict('versione-cambiata','La versione precedente è cambiata.');
  }
  // L13 (decisione 18): gli yen che la versione precedente aveva mosso da soli tornano com'erano e la nuova versione muove i suoi. Per una
  // consumazione o una visita collegata allo stesso fatto già pagato (non nuova) il movimento di prima resta: quel fatto è lo stesso
  const causaYen={tipo:'voce' as const,chiave:`${uid}:${id}`};
  const sostituisciYen=(nuovo:YenDaMuovere|null,fattoNuovo:boolean):void=>{if(fattoNuovo||e.effetto.tipo==='yen'||(e.effetto.tipo!=='acquisto'&&e.effetto.tipo!=='pesca'))restituisciYenAutomatico(p,causaYen,'versione-sostituita');muoviYenDellaVoce(p,uid,[nuovo]);};
  if(e.effetto.tipo==='acquisto'){
    for(const a of assorbimenti)if(prepared('UPDATE utente.effetto_applicato SET annullato_il=?,assorbita_da=? WHERE partita_id=? AND id=? AND annullato_il IS NULL AND assorbita_da IS NULL AND sostituita_da IS NULL').run(nowIso(),nuovaRicevuta,p,a.ricevuta.id).changes!==1)throw httpErrors.conflict('sidecar-dote-cambiato','La Dote precedente è cambiata durante il raccordo.');
    const tokenCorrente=anteprimaRegistrazioneAcquisto(p,acquisto!,porteAcquisti).revisioneAcquistiAttesa;
    const nuova=registraConsumo(p,uid,e,{...acquisto!,revisioneAcquistiAttesa:tokenCorrente},porteAcquisti,false,{id:nuovaRicevuta,sostituisceRicevuta:attiva?.id,assorbeRicevute:assorbimenti.map((a)=>a.ricevuta.id)});
    for(const a of assorbimenti)trasferisciAttribuzioneDote(p,uid,a.nodo.uid,a.ricevuta.id,nuova.id,String(nuova.ricevuta.acquistoId),a.nodo.effetto.dote,a.q);
    sostituisciYen(yenDellEffetto(p,uid,e,nuova),nuova.creato);
    leggiRicevuteEffettiVoce(p,uid);return;
  }
  if(e.effetto.tipo==='pesca'){
    if(!pesca||!tokenPesca)throw httpErrors.badRequest('pesca-osservazione-richiesta','Rivedi la visita completa e il suo token prima del raccordo.');
    for(const a of assorbimentiPesca)if(prepared('UPDATE utente.effetto_applicato SET annullato_il=?,assorbita_da=? WHERE partita_id=? AND id=? AND annullato_il IS NULL AND assorbita_da IS NULL').run(nowIso(),nuovaRicevuta,p,a.ricevuta.id).changes!==1)throw httpErrors.conflict('pesca-porzione-cambiata','La porzione pregressa è cambiata prima del raccordo.');
    const tokenCorrente=anteprimaPesca(p,'registra-sessione',pesca).revisionePescaAttesa;
    const nuova=registraPesca(p,uid,e,{...pesca,revisionePescaAttesa:tokenCorrente},nuovoUid(),false,{id:nuovaRicevuta,sostituisceRicevuta:attiva?.id,assorbeRicevute:assorbimentiPesca.map(a=>a.ricevuta.id)});
    for(const a of assorbimentiPesca)trasferisciAttribuzioneDote(p,uid,a.ricevuta.effettoUid,a.ricevuta.id,nuova.id,String(nuova.ricevuta.sessioneId),'perizia',a.q,'pesca');
    sostituisciYen(yenDellEffetto(p,uid,e,nuova),nuova.creato);
    leggiRicevuteEffettiVoce(p,uid);return;
  }
  if(e.effetto.tipo==='fortuna'||eEffettoDiStato(e.effetto))throw httpErrors.conflict('raccordo-non-valido','Questo effetto si applica spuntando la voce: non si raccorda a una spunta già fatta.');
  // L13: un effetto Yen aggiunto (o cambiato) su una voce già spuntata, confermato qui: decisione 18, gli yen entrano o si scalano da soli (mai sotto
  // zero); solo con yen ancora proposti in sospeso per lo stesso effetto la ricevuta dichiara il beneficio e resta la proposta «Applica», com'era
  if(e.effetto.tipo==='yen'){restituisciYenAutomatico(p,causaYen,'versione-sostituita');const y=ricevutaYen(p,uid,e as EffettoVoceDto&{effetto:Extract<EffettoVoce,{tipo:'yen'}>},{gestitaDaSpunta:false,...(attiva?{sostituisceRicevuta:attiva.id}:{})},true,{id:nuovaRicevuta});muoviYenDellaVoce(p,uid,[y.movimento]);return;}
  const legacy=porte.applicaLegacy(p,[e.effetto],[sceltaStorica]);
  registraRicevuta(p,uid,e,{benefici:beneficiLegacy(legacy,true),legacy,risorse:risorseLegacy(p,legacy),gestitaDaSpunta:false,...(attiva?{sostituisceRicevuta:attiva.id}:{})},true,{id:nuovaRicevuta});
  sostituisciYen(yenDellEffetto(p,uid,e,undefined,legacy),false);
}
/** Togliere la spunta. L13 (decisione 18): gli yen tornano alla fine, prima le spese restituite e poi i guadagni tolti (`conYenInOrdine`). */
export function annullaEffettiVoce(...a:Parameters<typeof annullaEffettiVoceInOrdine>):void {conYenInOrdine(()=>annullaEffettiVoceInOrdine(...a));}
function annullaEffettiVoceInOrdine(p:number,uid:string,legacy:EffettiAzioneDto|null,porte:PorteEffettiLegacy):void {
  if(!getDb().inTransaction)throw new Error('L’annullo richiede la transazione della spunta.');
  const tutte=leggiRicevuteEffettiVoce(p,uid),ricevute=tutte.filter((r)=>r.annullatoIl===null);
  const spunta=prepared('SELECT fatta_at,effetti_json FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,uid) as {fatta_at:string;effetti_json:string|null}|undefined;
  const identitaSpunta=spunta?{fattaIl:spunta.fatta_at,raw:spunta.effetti_json}:null;
  const stessaGenerazione=(x:unknown):boolean=>!!identitaSpunta&&!!x&&typeof x==='object'&&!Array.isArray(x)&&(x as Record<string,unknown>).fattaIl===identitaSpunta.fattaIl;
  const confrontaRaw=(x:unknown):boolean=>{if(!stessaGenerazione(x))return false;const raw=(x as {raw:unknown}).raw;if(!(raw===null||typeof raw==='string'))throw httpErrors.conflict('identita-spunta-incoerente','La fotografia della spunta non è valida.');const prima=leggiRicevutaEffettiAzione(raw),ora=leggiRicevutaEffettiAzione(identitaSpunta!.raw);const senzaAperture=(e:EffettiAzioneDto|null)=>e?Object.fromEntries(Object.entries(e).filter(([k])=>k!=='apertureDedali')):null;if(jsonCanonico(senzaAperture(prima))!==jsonCanonico(senzaAperture(ora)))throw httpErrors.conflict('ricevuta-spunta-cambiata','La stessa spunta contiene effetti diversi dopo l’annullo: nessun effetto viene ripetuto.');return true;};
  const giaAnnullata=!!identitaSpunta&&tutte.some((r)=>r.annullatoIl!==null&&r.ricevuta.annulloLegacyIntegrale===true&&confrontaRaw(r.ricevuta.spunta));
  if(!spunta&&!ricevute.length&&!prepared('SELECT 1 FROM utente.acquisto_provenienza WHERE partita_id=? AND voce_uid=?').get(p,uid))return;
  let legacyDaAnnullare=legacy===null?null:leggiRicevutaEffettiAzione(jsonCanonico(legacy));
  if(giaAnnullata)legacyDaAnnullare=null;
  const togliUna=<T>(elenco:T[]|undefined,valore:T):T[]=>{const out=[...(elenco??[])],i=out.findIndex((x)=>jsonCanonico(x)===jsonCanonico(valore));if(i<0)throw httpErrors.conflict('porzione-storica-non-presente','Una porzione già sostituita non coincide con il RAW della spunta: nessun doppio annullo.');out.splice(i,1);return out;};
  for(const r of tutte)if(!giaAnnullata&&r.tipo!=='yen'&&(r.sostituitaDa||r.assorbitaDa)&&r.ricevuta.gestitaDaSpunta===true&&stessaGenerazione(r.ricevuta.spunta)){
    const segmento=leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy));
    if(!segmento||!legacyDaAnnullare)throw httpErrors.conflict('porzione-storica-assente','La sostituzione non è conciliabile con la ricevuta storica.');
    for(const d of segmento.doti)legacyDaAnnullare={...legacyDaAnnullare,doti:togliUna(legacyDaAnnullare.doti,d)};
    for(const l of segmento.letture??[])legacyDaAnnullare={...legacyDaAnnullare,letture:togliUna(legacyDaAnnullare.letture,l)};
    // Il raccordo pesca non acquisisce il turno pregresso: l’undo della spunta
    // originaria lo toglie ancora, mentre l’annullo del solo dettaglio pesca no.
    const turnoPregressoPesca=r.tipo==='turno'&&r.assorbitaDa&&tutte.some(x=>x.id===r.assorbitaDa&&x.tipo==='pesca');
    if(!turnoPregressoPesca)for(const t of segmento.turni??[])legacyDaAnnullare={...legacyDaAnnullare,turni:togliUna(legacyDaAnnullare.turni,t)};
  }
  for(const r of ricevute)if(r.tipo==='turno'){
    const segmento=leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy)),salvate=r.ricevuta.risorse as {turni?:unknown}|undefined,correnti=risorseLegacy(p,segmento) as {turni:unknown};
    if(!salvate||!risorseCompatibiliPesca(p,{turni:salvate.turni},{turni:correnti.turni}))throw httpErrors.conflict('turno-cambiato','Il turno posseduto non coincide più con la propria fotografia: nessun turno successivo viene rimosso.');
  }
  // L13: le ricevute degli yen non hanno una porzione legacy (solo il beneficio): l'annullo le chiude più sotto, con la riconciliazione
  const extra=ricevute.filter((r)=>r.ricevuta.gestitaDaSpunta===false&&r.tipo!=='yen').map((r)=>leggiRicevutaEffettiAzione(jsonCanonico(r.ricevuta.legacy)));
  const turniRaccordatiExtra=tutte.filter(r=>r.tipo==='turno'&&r.assorbitaDa&&r.ricevuta.gestitaDaSpunta===false&&tutte.some(x=>x.id===r.assorbitaDa&&x.tipo==='pesca')).map(r=>({r,marker:createHash('sha256').update(`annullo-turno-originario\0${r.id}`).digest('hex').slice(0,32)})).filter(x=>!prepared('SELECT 1 FROM utente.effetto_applicato WHERE partita_id=? AND id=?').get(p,x.marker));
  for(const x of turniRaccordatiExtra){verificaRisorseRicevuta(p,x.r);extra.push(verificaPorzionePesca(x.r));}
  // Valida tutto prima della prima mutazione. L'annullo legge i receipt, mai la configurazione attuale.
  // L13 (decisione 18): per primi tornano gli yen che gli effetti della voce avevano mosso da soli (le spese restituite com'erano state scalate,
  // poi i guadagni tolti al più fino a zero); quelli dei turni li restituisce il turno tolto qui sotto, quelli di una Richiesta la Richiesta riaperta
  // Una spunta nata prima degli yen automatici non ha movimenti da restituire (il saldo di allora la contava già): i suoi effetti senza movimento e
  // la spunta stessa restano fuori registro, così rispuntando la voce il saldo non cambia (prima della restituzione: una riga in coda non conta più)
  if(spunta)segnaYenDellaSpuntaFuoriRegistro(p,uid,spunta.fatta_at,[...righeEffetti(uid).map((e)=>e.uid),...tutte.map((r)=>r.effettoUid)]);
  restituisciYenAutomaticiDellaVoce(p,uid,'spunta-tolta');
  if(legacyDaAnnullare)porte.annullaLegacy(p,legacyDaAnnullare);
  for(const r of extra)if(r)porte.annullaLegacy(p,r);
  for(const x of turniRaccordatiExtra){const adesso=nowIso();prepared("INSERT INTO utente.effetto_applicato(id,partita_id,voce_uid,effetto_uid,effetto_ordine,formato,tipo,chiave,prima_json,ricevuta_json,creato,applicato_il,annullato_il) VALUES(?,?,?,?,0,1,'contesto',NULL,NULL,?,0,?,?)").run(x.marker,p,uid,x.marker,jsonCanonico({voceUid:uid,effettoUid:x.marker,benefici:[],annulloTurnoOriginario:x.r.id}),adesso,adesso);}
  annullaFontiDiarioNellaTransazione(p,uid,ricevute.filter((r)=>r.tipo==='acquisto').map((r)=>String(r.ricevuta.provenienzaId)));
  for(const r of ricevute.filter(r=>r.tipo==='pesca')){const f=fontiPesca(p).find(f=>f.id===r.ricevuta.provenienzaId);if(f){if(f.voce_uid!==uid||f.effetto_uid!==r.effettoUid||f.generazione!==r.ricevuta.generazione)throw httpErrors.conflict('pesca-annullo-fonte-diversa','La fonte appartiene a un’altra generazione della spunta.');rimuoviFontePescaNellaTransazione(p,f.id);}}
  for(const r of ricevute){if(prepared('UPDATE utente.effetto_applicato SET annullato_il=? WHERE partita_id=? AND id=? AND annullato_il IS NULL').run(nowIso(),p,r.id).changes!==1)throw httpErrors.conflict('ricevuta-cambiata','La ricevuta è cambiata durante l’annullo.');riconciliaBeneficiVoce(p,uid,r.effettoUid);}
  if(identitaSpunta&&!giaAnnullata){
    const id=nuovoUid(),adesso=nowIso(),effettoUid=createHash('sha256').update(`annullo-legacy\0${uid}\0${jsonCanonico(identitaSpunta)}`).digest('hex').slice(0,32);
    prepared("INSERT INTO utente.effetto_applicato(id,partita_id,voce_uid,effetto_uid,effetto_ordine,formato,tipo,chiave,prima_json,ricevuta_json,creato,applicato_il,annullato_il) VALUES(?,?,?,?,0,1,'contesto',NULL,NULL,?,0,?,?)").run(id,p,uid,effettoUid,jsonCanonico({voceUid:uid,effettoUid,benefici:[],annulloLegacyIntegrale:true,spunta:identitaSpunta}),adesso,adesso);
  }
  spegniFortunaDaVoce(p,uid);
  annullaEffettiDiStato(p,uid);
  prepared("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE partita_id=? AND voce_uid=? AND tipo='effetto-voce' AND stato='aperta'").run(nowIso(),p,uid);
}
export function preparaRimozioneEffettiVoce(uid:string,porte:Pick<PorteEffettiLegacy,'annullaLegacy'>):void {
  if(!getDb().inTransaction)throw new Error('La rimozione richiede la transazione del cestino.');
  const spunte=prepared('SELECT partita_id,effetti_json FROM utente.spunta_voce_partita WHERE voce_uid=?').all(uid) as Array<{partita_id:number;effetti_json:string|null}>;
  const partite=new Set([...spunte.map((s)=>s.partita_id),...(prepared('SELECT DISTINCT partita_id FROM utente.effetto_applicato WHERE voce_uid=? UNION SELECT DISTINCT partita_id FROM utente.acquisto_provenienza WHERE voce_uid=?').all(uid,uid) as Array<{partita_id:number}>).map((r)=>r.partita_id)]);
  const validati=new Map(spunte.map((s)=>[s.partita_id,leggiRicevutaEffettiAzione(s.effetti_json)]));
  for(const p of partite)leggiRicevuteEffettiVoce(p,uid);
  // R10-11f: punti e rank up della voce stanno nel registro cronologico: si tolgono da lì (con ricalcolo) e non si annullano due volte; chi è disfatto col
  // vecchio annullo riparte da una nuova base. Anche le righe del registro di partite senza spunta (orfane) se ne vanno con la voce.
  for(const p of partite){
    const ricevuta=validati.get(p)??null,tolti=togliEventiDellaVoce(p,uid);
    // L13 (decisione 18): gli yen della voce tornano con il motivo «voce eliminata», così rimettendola dal cestino si muovono di nuovo
    conMotivoDiRestituzione(MOTIVO_VOCE_ELIMINATA,()=>annullaEffettiVoce(p,uid,senzaEventiGestiti(ricevuta,tolti),{...porte,applicaLegacy:()=>null}));
    for(const chiave of confidentiAnnullatiAlVecchioModo(ricevuta,tolti))nuovaGenerazione(p,chiave);
  }
  for(const r of prepared('SELECT DISTINCT partita_id FROM utente.punti_confidente_voce WHERE voce_uid=?').all(uid) as Array<{partita_id:number}>)togliEventiDellaVoce(r.partita_id,uid);
}
export function riconciliaEffettiDopoRipristino(p:number,uids:string[],confidentiNonRimessi:ReadonlySet<string>=new Set()):void {
  if(!getDb().inTransaction)throw new Error('Il ripristino richiede la transazione del cestino.');
  riconciliaRegistroDopoRipristino(p,uids,confidentiNonRimessi);
  const cause=prepared("SELECT DISTINCT causa_chiave FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='voce' AND tipo<>'effetto-voce'").all(p) as Array<{causa_chiave:string}>;
  for(const c of cause){const [uid,e]=c.causa_chiave.split(':');if(uid&&e&&uids.includes(uid))riconciliaBeneficiVoce(p,uid,e);}
  // Una fotografia non riattiva i receipt durevoli già annullati. Una spunta ripristinata propone soltanto gli effetti mancanti.
  for(const uid of uids)if(prepared('SELECT 1 FROM main.voce_giornata WHERE uid=?').get(uid)&&prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,uid))for(const e of leggiEffettiVoce(uid).effetti)creaPropostaEffettoStorico(p,uid,e.uid);
}

function propostaDto(r:RigaProposta):PropostaEffettoVoceDto {
  const v=voce(r.voce_uid),d=leggiJsonRegistro<Record<string,unknown>>(r.dati_json,'candidato effetto');
  const effetto=normalizzaEffettoVoce({...d,tipo:r.tipo});if(!effetto)throw httpErrors.conflict('candidato-non-valido','Il candidato non è riconoscibile integralmente.');
  return {id:r.id,voceUid:r.voce_uid,giorno:v.data,fascia:v.fascia,testo:v.azione,effetto,motivo:r.motivo,certezza:r.certezza,stato:r.stato,revisione:improntaDato({r,v,fonte:leggiEffettiVoce(r.voce_uid)})};
}
export function elencaProposteEffettiVoce():PropostaEffettoVoceDto[] {return (prepared('SELECT * FROM main.proposta_effetto_voce ORDER BY voce_uid,id').all() as RigaProposta[]).map(propostaDto);}
function preparaDecisione(id:string,r:RichiestaAnteprimaDecisioneEffettoVoce):AnteprimaDecisioneEffettoVoceDto {
  const row=prepared('SELECT * FROM main.proposta_effetto_voce WHERE id=?').get(id) as RigaProposta|undefined;
  if(!row)throw httpErrors.notFound('candidato-non-trovato','Il candidato non è più presente.');if(row.stato!=='aperta')throw httpErrors.conflict('candidato-deciso','Il candidato è già stato deciso.');
  const proposta=propostaDto(row),effetti=leggiEffettiVoce(row.voce_uid);
  if(r.decisione==='conferma'&&(!r.effetto||!normalizzaEffettoVoce(r.effetto)))throw httpErrors.badRequest('effetto-richiesto','Conferma esplicitamente l’intero effetto.');
  if(r.decisione==='scarta'&&r.effetto!==undefined)throw httpErrors.badRequest('effetto-inatteso','Lo scarto non modifica gli effetti.');
  const partiteGiaSpuntate=(prepared('SELECT COUNT(*) AS n FROM utente.spunta_voce_partita WHERE voce_uid=?').get(row.voce_uid) as {n:number}).n;
  return {richiesta:r,proposta,effetti,partiteGiaSpuntate,revisionePropostaAttesa:improntaDato({id,r,proposta,effetti,partiteGiaSpuntate})};
}
export function anteprimaDecisioneEffettoVoce(id:string,r:RichiestaAnteprimaDecisioneEffettoVoce):AnteprimaDecisioneEffettoVoceDto {return getDb().transaction(()=>preparaDecisione(id,r))();}
export function decidiPropostaEffettoVoce(id:string,r:RichiestaDecisioneEffettoVoce):StatoEffettiVoceDto {
  return getDb().transaction(()=>{
    const richiesta={id,operazioneId:r.operazioneId,decisione:r.decisione,...(r.effetto===undefined?{}:{effetto:r.effetto})},payload=jsonCanonico(richiesta),old=prepared('SELECT payload_json,dopo_json FROM main.operazione_effetti_voce WHERE id=?').get(r.operazioneId) as {payload_json:string;dopo_json:string}|undefined;
    if(old){if(old.payload_json!==payload)throw httpErrors.conflict('operazione-diversa','L’ID appartiene a un’altra decisione.');return leggiJsonRegistro<StatoEffettiVoceDto>(old.dopo_json,'ricevuta decisione candidato');}
    const p=preparaDecisione(id,{operazioneId:r.operazioneId,decisione:r.decisione,...(r.effetto===undefined?{}:{effetto:r.effetto})});
    if(p.revisionePropostaAttesa!==r.revisionePropostaAttesa)throw httpErrors.conflict('candidato-cambiato','Il candidato, la voce o le spunte sono cambiati: rivedi.');
    if(r.decisione==='conferma'){
      if(p.effetti.stato!=='convertita')throw httpErrors.conflict('raw-da-correggere','Correggi esplicitamente il RAW prima di aggiungere il nuovo effetto.');
      const effetto=normalizzaEffettoVoce(r.effetto)!;
      if(p.effetti.effetti.some((e)=>jsonCanonico(e.effetto)===jsonCanonico(effetto)))throw httpErrors.conflict('effetto-gia-presente','L’effetto è già presente: nessun doppio viene aggiunto.');
      salvaEffettiVoce(p.proposta.voceUid,{revisioneEffettiAttesa:p.effetti.revisione,effetti:[...p.effetti.effetti.map((e)=>({uid:e.uid,effetto:e.effetto})),{uid:null,effetto}]});
    }
    if(prepared("UPDATE main.proposta_effetto_voce SET stato=?,updated_at=? WHERE id=? AND stato='aperta'").run(r.decisione==='conferma'?'confermata':'scartata',nowIso(),id).changes!==1)throw httpErrors.conflict('candidato-cambiato','Il candidato è cambiato.');
    const dopo=leggiEffettiVoce(p.proposta.voceUid);
    prepared('INSERT INTO main.operazione_effetti_voce(id,voce_uid,payload_json,prima_json,dopo_json,creata_il) VALUES(?,?,?,?,?,?)').run(r.operazioneId,p.proposta.voceUid,payload,jsonCanonico({richiesta:p.richiesta,proposta:p.proposta,effetti:p.effetti}),jsonCanonico(dopo),nowIso());return dopo;
  })();
}
