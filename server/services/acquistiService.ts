import { getDb, nowIso, prepared } from '../db/dbService.js';
import { collegaGenerazioneLegacy, fotoLegacy, generazioneRappresentata, valutazioniLegacyPartita } from '../db/acquistiLegacy.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento, annullaEventiFonteAcquistoNellaTransazione } from './storicoService.js';
import { eDote, puntiDaNote } from '../../shared/doti.js';
import { giornoDellaSettimanaPiatto } from '../../shared/date.js';
import { AOJIRU_NOTE, ARTICOLO_AOJIRU, PREZZO_AOJIRU, eOffertaAojiru, prossimaVarianteAojiru } from '../../shared/acquisti.js';
import type { AnteprimaRegistrazioneAcquistoDto, AnteprimaRimozioneAcquistoDto, DatiConsumoAojiru, FonteAcquisto, IdentitaAcquisto, NuovaRegistrazioneAcquisto, PresenzaStoricaAcquistoDto, ProvenienzaAcquistoDto, RegistrazioneAcquistoDto, RicevutaOperazioneAcquistoDto, RichiestaAnnullaProvenienza, RichiestaAnteprimaAnnullaProvenienza, RichiestaAnteprimaRimozioneLegacy, RichiestaRegistraAcquisto, RichiestaRimozioneLegacy, StatoAcquistiArticoloDto, StatoAcquistiDto } from '../../shared/acquisti.js';
import type { DisponibilitaDto } from '../../shared/types.js';
import { normalizzaEffettoVoce } from '../../shared/effettiVoce.js';
import { improntaDato, jsonCanonico, leggiJsonRegistro, leggiOggettoRegistro, leggiPropostePartita, nuovoUid, riconciliaBeneficiAcquisto } from './propostePartitaService.js';

interface RigaAcquisto { id:string;partita_id:number;articolo_chiave:string;giorno:string;fascia:'giorno'|'sera';ordine:number;prezzo_yen:number;identita_json:string;dati_json:string;legacy_firma:string|null;legacy_raw_json:string|null;created_at:string }
interface RigaFonte {id:string;partita_id:number;acquisto_id:string;tipo:'manuale'|'diario';voce_uid:string|null;effetto_uid:string|null;effetto_ordine:number|null;fonte_json:string;operazione_id:string;created_at:string}
interface RigaLegacy {partita_id:number;articolo_chiave:string;updated_at:string}
export interface PorteDisponibilitaAcquisto { valutaCorrente:(partitaId:number,articolo:string,sede?:string)=>{disponibilita:DisponibilitaDto;revisione:string} }
const righeAcquisti=(p:number):RigaAcquisto[]=>prepared('SELECT * FROM utente.acquisto_registrato WHERE partita_id=? ORDER BY CASE WHEN substr(giorno,1,2)<\'04\' THEN 1 ELSE 0 END,giorno,CASE fascia WHEN \'giorno\' THEN 0 ELSE 1 END,ordine,id').all(p) as RigaAcquisto[];
const righeFonti=(p:number):RigaFonte[]=>prepared('SELECT * FROM utente.acquisto_provenienza WHERE partita_id=? ORDER BY id').all(p) as RigaFonte[];
const righeLegacy=(p:number):RigaLegacy[]=>prepared('SELECT partita_id,articolo_chiave,updated_at FROM utente.acquisto_partita WHERE partita_id=? ORDER BY articolo_chiave').all(p) as RigaLegacy[];
function datiConsumo(raw:string):DatiConsumoAojiru {
  const d=leggiOggettoRegistro(raw,'consumazione');
  if(Object.keys(d).some((k)=>!['regola','versione','variante','fortuna'].includes(k))||d.regola!=='aojiru'||d.versione!==1||!eDote(d.variante)||!(d.fortuna===null||typeof d.fortuna==='boolean'))throw httpErrors.conflict('consumo-non-valido','Il registro della consumazione non è valido.');
  return {regola:'aojiru',versione:1,variante:d.variante,fortuna:d.fortuna};
}
function identitaRegistrata(raw:string):IdentitaAcquisto {
  const d=leggiOggettoRegistro(raw,'identità acquisto');
  if(typeof d.articolo!=='string'||typeof d.nome!=='string'||!(d.negozio===null||typeof d.negozio==='string')||typeof d.negozioNome!=='string'||!(d.catalogo===null||typeof d.catalogo==='string'))throw httpErrors.conflict('identita-acquisto-non-valida','L’identità registrata non è valida.');
  return d as unknown as IdentitaAcquisto;
}
function fonteDto(f:RigaFonte):ProvenienzaAcquistoDto {
  const fonte=leggiOggettoRegistro(f.fonte_json,'provenienza') as unknown as FonteAcquisto;
  if(!fonte||fonte.tipo!==f.tipo||(fonte.tipo==='diario'&&(fonte.voceUid!==f.voce_uid||fonte.effettoUid!==f.effetto_uid)))throw httpErrors.conflict('fonte-incoerente','La provenienza non coincide con la propria identità.');
  const attesa=fonte.tipo==='manuale'?{tipo:'manuale'}:{tipo:'diario',voceUid:f.voce_uid,effettoUid:f.effetto_uid};
  if(jsonCanonico(fonte)!==jsonCanonico(attesa))throw httpErrors.conflict('fonte-incoerente','La provenienza contiene campi non riconoscibili: nessuna appartenenza viene dedotta.');
  const orfana=fonte.tipo==='diario'&&!prepared('SELECT 1 FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(fonte.voceUid,fonte.effettoUid);
  const voceCorrente=fonte.tipo==='diario'?(prepared('SELECT data AS giorno,fascia FROM main.voce_giornata WHERE uid=?').get(fonte.voceUid) as {giorno:string;fascia:'giorno'|'sera'}|undefined)??null:null;
  return {id:f.id,acquistoId:f.acquisto_id,fonte,creataIl:f.created_at,orfana:!!orfana,voceCorrente};
}
function registrazioneDto(a:RigaAcquisto,fonti:RigaFonte[]):RegistrazioneAcquistoDto {
  const identita=identitaRegistrata(a.identita_json),consumo=datiConsumo(a.dati_json);
  if(a.prezzo_yen!==PREZZO_AOJIRU||!Number.isSafeInteger(a.ordine)||a.ordine<0||!/^\d{2}-\d{2}$/.test(a.giorno)||!['giorno','sera'].includes(a.fascia))throw httpErrors.conflict('fatto-acquisto-incoerente','Momento o prezzo non corrispondono alla versione della regola registrata.');
  if(identita.articolo!==a.articolo_chiave)throw httpErrors.conflict('identita-acquisto-incoerente','Il riferimento e la fotografia dell’acquisto divergono.');
  if(a.legacy_firma!==null){const raw=leggiOggettoRegistro(a.legacy_raw_json??'','tuple legacy');if(improntaDato(raw)!==a.legacy_firma||raw.partita_id!==a.partita_id||raw.articolo_chiave!==a.articolo_chiave)throw httpErrors.conflict('legacy-incoerente','Il raccordo legacy non è valido.');}
  const provenienze=fonti.filter((f)=>f.acquisto_id===a.id).map(fonteDto);
  const legacyValutazioneId=generazioneRappresentata(getDb(),a.id);
  if(legacyValutazioneId){const f=fotoLegacy(getDb(),legacyValutazioneId);if(f.riga.presenza_firma!==a.legacy_firma||jsonCanonico(f.presenza)!==jsonCanonico(leggiOggettoRegistro(a.legacy_raw_json??'','tuple legacy')))throw httpErrors.conflict('generazione-acquisto-diversa','Il fatto non coincide con la generazione della presenza rappresentata.');}
  return {id:a.id,partitaId:a.partita_id,identita,momento:{giorno:a.giorno,fascia:a.fascia,ordine:a.ordine},prezzoYen:a.prezzo_yen,consumo,legacyFirma:a.legacy_firma,legacyValutazioneId,attiva:provenienze.length>0,provenienze,creataIl:a.created_at,orfana:!prepared('SELECT 1 FROM main.articolo WHERE chiave=?').get(a.articolo_chiave)};
}
export function leggiAcquistiPartita(partita:number):StatoAcquistiDto {
  verificaPartita(partita);
  const acquisti=righeAcquisti(partita),fonti=righeFonti(partita),legacy=righeLegacy(partita);
  if(fonti.some((f)=>!acquisti.some((a)=>a.id===f.acquisto_id)))throw httpErrors.conflict('fonti-orfane-interne','Una provenienza non ha più il proprio acquisto: registro conservato.');
  const registrazioni=acquisti.map((a)=>registrazioneDto(a,fonti));
  const fotografie=valutazioniLegacyPartita(getDb(),partita);
  const presenzeStoriche:PresenzaStoricaAcquistoDto[]=fotografie.map((f)=>{
    const r=f.presenza,firma=improntaDato(r),rappresentanti=registrazioni.filter((x)=>x.attiva&&x.legacyFirma===firma&&x.legacyValutazioneId===f.riga.id&&x.identita.articolo===r.articolo_chiave);
    if(registrazioni.some(x=>x.legacyFirma===firma&&x.identita.articolo===r.articolo_chiave&&!x.legacyValutazioneId))throw httpErrors.conflict('generazione-legacy-da-riconciliare','Il fatto precedente richiede il raccordo esplicito alla generazione della presenza.');
    if(rappresentanti.length>1)throw httpErrors.conflict('legacy-duplicata','Più fatti rappresentano la stessa presenza legacy.');
    return {articolo:r.articolo_chiave,negozioNome:f.identita.negozioNome,firma,rappresentataDa:rappresentanti[0]?.id??null,orfana:!prepared('SELECT 1 FROM main.articolo WHERE chiave=?').get(r.articolo_chiave),
      valutazione:{id:f.riga.id,generazione:f.riga.generazione,nome:f.identita.nome,negozio:f.identita.negozio,contributoYen:f.riga.contributo_yen,prezzoCatalogoYen:f.riga.prezzo_catalogo,statoPrezzo:f.riga.stato_prezzo,origine:f.riga.origine}};
  });
  const spesa=new Map<string,number>(),ottenuti=new Set(legacy.map((r)=>r.articolo_chiave));
  for(const l of presenzeStoriche)if(!l.rappresentataDa&&l.valutazione?.negozio!==null&&l.valutazione?.negozio!==undefined){const k=l.valutazione.negozio;spesa.set(k,(spesa.get(k)??0)+l.valutazione.contributoYen);}
  for(const a of registrazioni)if(a.attiva){ottenuti.add(a.identita.articolo);if(a.identita.negozio)spesa.set(a.identita.negozio,(spesa.get(a.identita.negozio)??0)+a.prezzoYen);}
  if([...spesa.values()].some(n=>!Number.isSafeInteger(n)))throw httpErrors.conflict('spesa-non-rappresentabile','Il totale della spesa non è rappresentabile senza perdita di precisione.');
  return {partitaId:partita,presenzeStoriche,registrazioni,articoliOttenuti:[...ottenuti].sort(),spesaPerNegozio:[...spesa].sort(([a],[b])=>a.localeCompare(b)).map(([negozio,spesa])=>({negozio,spesa})),revisione:improntaDato({acquisti,fonti,legacy,fotografie,raccordi:registrazioni.map(a=>[a.id,a.legacyValutazioneId])})};
}
export function acquistiArticolo(partita:number,articolo:string,precaricato?:StatoAcquistiDto):StatoAcquistiArticoloDto {
  const stato=precaricato??leggiAcquistiPartita(partita);if(stato.partitaId!==partita)throw httpErrors.conflict('partita-diversa','Il riepilogo appartiene a un’altra partita.');
  const registrazioni=stato.registrazioni.filter((a)=>a.identita.articolo===articolo);
  const attive=registrazioni.filter((a)=>a.attiva),incongruenze:string[]=[];
  for(let i=1;i<attive.length;i++)if(prossimaVarianteAojiru(attive[i-1]!.consumo.variante)!==attive[i]!.consumo.variante)incongruenze.push(`Fra ${attive[i-1]!.momento.giorno} e ${attive[i]!.momento.giorno} lo storico registrato ha una lacuna o una variante differente.`);
  return {articolo,acquistato:stato.articoliOttenuti.includes(articolo),presenzaStorica:stato.presenzeStoriche.find((l)=>l.articolo===articolo)??null,registrazioni,
    aojiru:articolo===ARTICOLO_AOJIRU?{confermate:attive.length,varianteAttesa:attive.length?prossimaVarianteAojiru(attive[attive.length-1]!.consumo.variante):null,incongruenze,nota:'Atteso secondo le consumazioni registrate; eventuali consumi mancanti non sono dedotti dalle date o dal segno storico.'}:null};
}
export const chiaviArticoliOttenuti=(p:number,stato?:StatoAcquistiDto):Set<string>=>{if(stato&&stato.partitaId!==p)throw httpErrors.conflict('partita-diversa','Riepilogo di un’altra partita.');return new Set((stato??leggiAcquistiPartita(p)).articoliOttenuti);};
export const spesaAcquistiPerNegozio=(p:number,stato?:StatoAcquistiDto):Map<string,number>=>{if(stato&&stato.partitaId!==p)throw httpErrors.conflict('partita-diversa','Riepilogo di un’altra partita.');return new Map((stato??leggiAcquistiPartita(p)).spesaPerNegozio.map((x)=>[x.negozio,x.spesa]));};

function offerta(chiave:string):{identita:IdentitaAcquisto;raw:Record<string,unknown>} {
  const r=prepared('SELECT a.*,n.nome AS negozio_nome,c.nome AS catalogo_nome FROM main.articolo a LEFT JOIN main.negozio n ON n.chiave=a.negozio_chiave LEFT JOIN main.catalogo_oggetto c ON c.chiave=a.catalogo_chiave WHERE a.chiave=?').get(chiave) as Record<string,unknown>|undefined;
  if(!r)throw httpErrors.notFound('articolo-non-trovato','L’offerta non esiste: non viene ricreata.');
  if(!eOffertaAojiru({chiave,catalogoChiave:r.catalogo_chiave as string|null}))throw httpErrors.conflict('offerta-non-aojiru','Questa identità non corrisponde all’offerta Aojiru riconosciuta.');
  if(r.prezzo!==PREZZO_AOJIRU||r.costo_json!=null||r.articolo_condiviso!=null)throw httpErrors.conflict('offerta-variata','Prezzo o identità dell’offerta sono diversi: nessuna regola viene imposta alla variante.');
  return {identita:{articolo:chiave,nome:String(r.catalogo_nome??r.nome),negozio:typeof r.negozio_chiave==='string'?r.negozio_chiave:null,negozioNome:String(r.negozio_nome??'Offerta precedente'),catalogo:typeof r.catalogo_chiave==='string'?r.catalogo_chiave:null},raw:r};
}
export function verificaOffertaConsumo(chiave:string):void {offerta(chiave);}
function verificaFonte(partita:number,r:NuovaRegistrazioneAcquisto):{raw:unknown;ordine:number|null} {
  if(r.fonte.tipo==='manuale')return {raw:r.fonte,ordine:null};
  const e=prepared('SELECT e.*,v.data,v.fascia,v.ordine AS ordine_voce FROM main.voce_effetto e JOIN main.voce_giornata v ON v.uid=e.voce_uid WHERE e.voce_uid=? AND e.uid=?').get(r.fonte.voceUid,r.fonte.effettoUid) as Record<string,unknown>|undefined;
  if(!e)throw httpErrors.conflict('fonte-non-presente','La voce o l’effetto di origine non sono più presenti.');
  const d=leggiOggettoRegistro(String(e.dati_json),'effetto di origine'),effetto=normalizzaEffettoVoce(d);
  if(!effetto||effetto.tipo!=='acquisto'||e.tipo!=='acquisto'||effetto.articolo!==r.articolo)throw httpErrors.conflict('fonte-diversa','La voce non dichiara questo acquisto.');
  if(effetto.variante!==null&&effetto.variante!==r.variante)throw httpErrors.conflict('osservazione-diversa','La variante diverge dall’effetto canonico confermato.');
  const old=prepared('SELECT id,acquisto_id FROM utente.acquisto_provenienza WHERE partita_id=? AND voce_uid=? AND effetto_uid=?').get(partita,r.fonte.voceUid,r.fonte.effettoUid) as {id:string;acquisto_id:string}|undefined;
  if(old&&(r.scelta.tipo!=='collega'||r.scelta.acquistoId!==old.acquisto_id)){
    const receipt=prepared('SELECT prima_json,ricevuta_json FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? AND annullato_il IS NULL').get(partita,r.fonte.voceUid,r.fonte.effettoUid) as {prima_json:string;ricevuta_json:string}|undefined;
    const prima=receipt?leggiJsonRegistro<Record<string,unknown>>(receipt.prima_json,'versione precedente'):null,ric=receipt?leggiJsonRegistro<Record<string,unknown>>(receipt.ricevuta_json,'fonte precedente'):null;
    if(!prima||!ric||ric.provenienzaId!==old.id||ric.acquistoId!==old.acquisto_id||jsonCanonico(prima.effetto)===jsonCanonico(d))throw httpErrors.conflict('fonte-gia-collegata','La voce possiede già una provenienza: collega quel medesimo fatto.');
  }
  const v=prepared('SELECT * FROM main.voce_giornata WHERE uid=?').get(r.fonte.voceUid),transizione=prepared('SELECT * FROM main.voce_effetto_transizione WHERE voce_uid=?').get(r.fonte.voceUid),effetti=prepared('SELECT * FROM main.voce_effetto WHERE voce_uid=? ORDER BY ordine,uid').all(r.fonte.voceUid);
  return {raw:{effetto:e,voce:v,transizione,effetti},ordine:Number(e.ordine)};
}
function preparaRegistrazione(partita:number,r:NuovaRegistrazioneAcquisto,porte?:PorteDisponibilitaAcquisto):AnteprimaRegistrazioneAcquistoDto {
  verificaPartita(partita);
  if(!eDote(r.variante)||!(r.fortuna===null||typeof r.fortuna==='boolean'))throw httpErrors.badRequest('consumo-non-valido','Variante e Fortuna devono essere dichiarate esplicitamente.');
  const o=offerta(r.articolo),fonte=verificaFonte(partita,r),stato=leggiAcquistiPartita(partita),acquisti=acquistiArticolo(partita,r.articolo,stato);
  const g=prepared('SELECT 1 FROM main.giorno WHERE data=?').get(r.momento.giorno);
  if(!g||giornoDellaSettimanaPiatto(r.momento.giorno)!=='domenica')throw httpErrors.conflict('momento-non-compatibile','Il momento dichiarato non è una domenica del calendario: correggi il momento reale, la voce resta invariata.');
  const p=prepared('SELECT data_gioco,fascia_gioco,updated_at FROM utente.partita WHERE id=?').get(partita) as {data_gioco:string|null;fascia_gioco:string;updated_at:string};
  const corrente=p.data_gioco===r.momento.giorno&&p.fascia_gioco===r.momento.fascia;
  let valutazione:unknown=null;
  if(corrente){if(!porte)throw httpErrors.conflict('valutatore-non-collegato','Il valutatore corrente non è disponibile.');valutazione=porte.valutaCorrente(partita,r.articolo);if((valutazione as {disponibilita:DisponibilitaDto}).disponibilita.stato!=='disponibile')throw httpErrors.conflict('articolo-non-disponibile','L’offerta non risulta disponibile nel momento corrente.');}
  const legacy=acquisti.presenzaStorica;
  if(legacy){if(!r.rapportoLegacy||r.rapportoLegacy.firma!==legacy.firma)throw httpErrors.conflict('rapporto-legacy-richiesto','Dichiara se questa consumazione rappresenta il segno storico oppure è ulteriore.');
    if(!r.rapportoLegacy.valutazione||jsonCanonico(r.rapportoLegacy.valutazione)!==jsonCanonico(legacy.valutazione))throw httpErrors.conflict('generazione-legacy-cambiata','La generazione o la valutazione della presenza non coincide con quella mostrata: rileggi il registro e prepara una nuova anteprima.');}
  else if(r.rapportoLegacy!==null)throw httpErrors.conflict('presenza-legacy-cambiata','La presenza storica non corrisponde più al riepilogo.');
  let esitoPrevisto:AnteprimaRegistrazioneAcquistoDto['esitoPrevisto']='registrata';
  if(r.scelta.tipo==='collega'){
    const acquistoId=r.scelta.acquistoId,a=stato.registrazioni.find((a)=>a.id===acquistoId);
    if(!a)throw httpErrors.notFound('acquisto-non-trovato','La registrazione indicata non appartiene alla partita.');
    if(a.identita.articolo!==r.articolo||a.identita.catalogo!==o.identita.catalogo||a.identita.negozio!==o.identita.negozio||jsonCanonico(a.momento)!==jsonCanonico(r.momento)||a.consumo.variante!==r.variante||a.consumo.fortuna!==r.fortuna||a.prezzoYen!==PREZZO_AOJIRU)throw httpErrors.conflict('acquisto-differente','Identità, momento, variante, prezzo o Fortuna divergono: il fatto non viene sovrascritto né collegato.');
    if(a.legacyFirma&&r.rapportoLegacy?.tipo==='ulteriore'&&a.legacyFirma===r.rapportoLegacy.firma&&a.legacyValutazioneId===legacy?.valutazione?.id)throw httpErrors.conflict('rapporto-legacy-diverso','Questo fatto rappresenta già questa generazione della presenza storica.');
    if(a.legacyFirma&&r.rapportoLegacy?.tipo==='rappresenta'&&a.legacyFirma!==r.rapportoLegacy.firma)throw httpErrors.conflict('rapporto-legacy-diverso','Il fatto rappresenta un’altra tuple storica immutabile: il raccordo non viene sovrascritto.');
    if(a.legacyFirma&&r.rapportoLegacy?.tipo==='rappresenta'&&a.legacyValutazioneId!==legacy?.valutazione?.id)throw httpErrors.conflict('generazione-legacy-diversa','Il fatto rappresenta un’altra generazione storica: il raccordo non viene sovrascritto.');
    esitoPrevisto=a.provenienze.some((f)=>jsonCanonico(f.fonte)===jsonCanonico(r.fonte))?'gia-collegata':'fonte-collegata';
  }
  if(r.rapportoLegacy?.tipo==='rappresenta'){
    const firma=r.rapportoLegacy.firma,rappresentante=stato.registrazioni.find((a)=>a.legacyFirma===firma&&a.legacyValutazioneId===legacy?.valutazione?.id&&a.identita.articolo===r.articolo);
    if(rappresentante&&(r.scelta.tipo!=='collega'||r.scelta.acquistoId!==rappresentante.id))throw httpErrors.conflict('legacy-gia-rappresentata','La presenza storica ha già una registrazione, anche se inattiva: usa quel medesimo UUID.');
  }
  return {nuovo:r,identita:o.identita,acquisti,disponibilita:{tipo:corrente?'corrente':'osservazione',calendario:'compatibile',condizioniStoricheNonRicostruibili:!corrente,motivi:corrente?[]:['Solo il calendario è verificato; i progressi del momento storico non sono ricostruiti. La consumazione è una tua osservazione esplicita.']},effetto:{dote:r.variante,puntiBase:2,puntiConfermati:r.fortuna===null?null:puntiDaNote(AOJIRU_NOTE,false,r.fortuna),note:AOJIRU_NOTE,prezzoYen:5000},esitoPrevisto,revisioneAcquistiAttesa:improntaDato({richiesta:r,stato,o,fonte,p,g,valutazione})};
}
export function anteprimaRegistrazioneAcquisto(p:number,r:NuovaRegistrazioneAcquisto,porte?:PorteDisponibilitaAcquisto):AnteprimaRegistrazioneAcquistoDto {return getDb().transaction(()=>preparaRegistrazione(p,r,porte))();}
function replay(p:number,id:string,azione:string,payload:unknown):RicevutaOperazioneAcquistoDto|null {
  const r=prepared('SELECT azione,payload_json,ricevuta_json FROM utente.acquisto_operazione WHERE partita_id=? AND operazione_id=?').get(p,id) as {azione:string;payload_json:string;ricevuta_json:string}|undefined;
  if(!r)return null;if(r.azione!==azione||r.payload_json!==jsonCanonico(payload))throw httpErrors.conflict('operazione-diversa','L’ID dell’operazione appartiene a un’altra identità o payload.');
  const ricevuta=leggiOggettoRegistro(r.ricevuta_json,'ricevuta operazione acquisto'),dato=payload as Record<string,unknown>;
  const esiti=azione==='registra'?['registrata','fonte-collegata','gia-collegata']:azione==='annulla-fonte'?['fonte-rimossa']:['presenza-rimossa'];
  const uid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{32}$/.test(x);
  if(ricevuta.partitaId!==p||ricevuta.operazioneId!==id||!esiti.includes(String(ricevuta.esito))||typeof ricevuta.articolo!=='string'||typeof ricevuta.creataIl!=='string'||(azione==='registra'&&(!uid(ricevuta.acquistoId)||!uid(ricevuta.provenienzaId)||ricevuta.articolo!==dato.articolo))||(azione==='annulla-fonte'&&(!uid(ricevuta.acquistoId)||ricevuta.provenienzaId!==dato.provenienzaId))||(azione==='rimuovi-legacy'&&(ricevuta.acquistoId!==null||ricevuta.provenienzaId!==null||ricevuta.articolo!==dato.articolo)))throw httpErrors.conflict('ricevuta-operazione-incoerente','La ricevuta non coincide con operazione, identità o payload: registro conservato.');
  return ricevuta as unknown as RicevutaOperazioneAcquistoDto;
}
function salvaOperazione(p:number,id:string,azione:string,payload:unknown,ricevuta:RicevutaOperazioneAcquistoDto):void {
  prepared('INSERT INTO utente.acquisto_operazione(partita_id,operazione_id,azione,payload_json,ricevuta_json,created_at) VALUES(?,?,?,?,?,?)').run(p,id,azione,jsonCanonico(payload),jsonCanonico(ricevuta),ricevuta.creataIl);
  const fonte=payload&&typeof payload==='object'?'fonte' in payload?(payload as {fonte?:FonteAcquisto}).fonte:undefined:undefined;
  registraEvento(p,'acquisto',ricevuta.esito==='presenza-rimossa'?'Presenza storica rimossa':ricevuta.esito==='fonte-rimossa'?'Provenienza acquisto rimossa':'Consumazione confermata',ricevuta.articolo,{operazioneId:id,acquistoId:ricevuta.acquistoId,provenienzaId:ricevuta.provenienzaId,acquistoV1:{formato:1,azione},...(fonte?.tipo==='diario'?{voceUid:fonte.voceUid,effettoUid:fonte.effettoUid}:{})});
  prepared('UPDATE utente.partita SET updated_at=? WHERE id=?').run(ricevuta.creataIl,p);
}
export function registraAcquistoNellaTransazione(p:number,r:RichiestaRegistraAcquisto,porte?:PorteDisponibilitaAcquisto,opz:{nuovaSpunta?:boolean}={}):RicevutaOperazioneAcquistoDto {
  if(!getDb().inTransaction)throw new Error('La registrazione richiede la transazione del dominio.');
  verificaPartita(p);const {revisioneAcquistiAttesa,...nuovo}=r;
  const precedente=replay(p,r.operazioneId,'registra',nuovo);if(precedente)return precedente;
  if(r.fonte.tipo==='diario'&&!opz.nuovaSpunta&&!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,r.fonte.voceUid))throw httpErrors.conflict('fonte-non-spuntata','Conferma l’acquisto insieme alla nuova spunta oppure raccorda una voce già fatta.');
  const a=preparaRegistrazione(p,nuovo,porte);if(a.revisioneAcquistiAttesa!==revisioneAcquistiAttesa)throw httpErrors.conflict('acquisti-cambiati','Il contesto o gli acquisti sono cambiati: rivedi l’anteprima.');
  if(r.fonte.tipo==='diario'){
    const old=prepared('SELECT acquisto_id FROM utente.acquisto_provenienza WHERE partita_id=? AND voce_uid=? AND effetto_uid=?').get(p,r.fonte.voceUid,r.fonte.effettoUid) as {acquisto_id:string}|undefined;
    if(old&&(r.scelta.tipo!=='collega'||r.scelta.acquistoId!==old.acquisto_id))throw httpErrors.conflict('sostituzione-da-confermare','La sostituzione della provenienza si conferma dalla proposta del Diario insieme alla versione precedente.');
  }
  const adesso=nowIso(),id=r.scelta.tipo==='collega'?r.scelta.acquistoId:nuovoUid();
  const legacy=r.rapportoLegacy?.tipo==='rappresenta'?righeLegacy(p).find((l)=>l.articolo_chiave===r.articolo):undefined;
  if(r.scelta.tipo==='nuova')prepared('INSERT INTO utente.acquisto_registrato(id,partita_id,articolo_chiave,giorno,fascia,ordine,prezzo_yen,identita_json,dati_json,legacy_firma,legacy_raw_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id,p,r.articolo,r.momento.giorno,r.momento.fascia,r.momento.ordine,PREZZO_AOJIRU,jsonCanonico(a.identita),jsonCanonico({regola:'aojiru',versione:1,variante:r.variante,fortuna:r.fortuna}),legacy?improntaDato(legacy):null,legacy?jsonCanonico(legacy):null,adesso);
  else if(legacy){const attuale=prepared('SELECT legacy_firma FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(p,id) as {legacy_firma:string|null};if(attuale.legacy_firma===null&&prepared('UPDATE utente.acquisto_registrato SET legacy_firma=?,legacy_raw_json=? WHERE partita_id=? AND id=? AND legacy_firma IS NULL').run(improntaDato(legacy),jsonCanonico(legacy),p,id).changes!==1)throw httpErrors.conflict('legacy-cambiata','Il raccordo storico è cambiato.');}
  if(legacy)collegaGenerazioneLegacy(getDb(),id,legacy);
  let provenienza=righeFonti(p).find((f)=>f.acquisto_id===id&&jsonCanonico(leggiJsonRegistro(f.fonte_json))===jsonCanonico(r.fonte));
  if(!provenienza){const fonte=verificaFonte(p,nuovo),fid=nuovoUid();prepared('INSERT INTO utente.acquisto_provenienza(id,partita_id,acquisto_id,tipo,voce_uid,effetto_uid,effetto_ordine,fonte_json,operazione_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(fid,p,id,r.fonte.tipo,r.fonte.tipo==='diario'?r.fonte.voceUid:null,r.fonte.tipo==='diario'?r.fonte.effettoUid:null,fonte.ordine,jsonCanonico(r.fonte),r.operazioneId,adesso);provenienza=prepared('SELECT * FROM utente.acquisto_provenienza WHERE id=?').get(fid) as RigaFonte;}
  riconciliaBeneficiAcquisto(p,id);
  const ricevuta:RicevutaOperazioneAcquistoDto={operazioneId:r.operazioneId,esito:a.esitoPrevisto,partitaId:p,acquistoId:id,provenienzaId:provenienza.id,articolo:r.articolo,creataIl:adesso};salvaOperazione(p,r.operazioneId,'registra',nuovo,ricevuta);return ricevuta;
}
export function registraAcquisto(p:number,r:RichiestaRegistraAcquisto,porte?:PorteDisponibilitaAcquisto):RicevutaOperazioneAcquistoDto {if(r.fonte.tipo!=='manuale')throw httpErrors.badRequest('fonte-diario-dal-motore','Un acquisto del Diario si conferma insieme alla spunta o dalla sua proposta, con ricevuta posseduta.');return getDb().transaction(()=>registraAcquistoNellaTransazione(p,r,porte))();}

export function anteprimaAnnullaProvenienza(p:number,r:RichiestaAnteprimaAnnullaProvenienza):AnteprimaRimozioneAcquistoDto {
  verificaPartita(p);const s=leggiAcquistiPartita(p),a=s.registrazioni.find((a)=>a.provenienze.some((f)=>f.id===r.provenienzaId));
  if(!a)throw httpErrors.notFound('provenienza-non-trovata','La provenienza non esiste più.');
  return {operazioneId:r.operazioneId,articolo:a.identita.articolo,acquisto:a,presenzaStorica:s.presenzeStoriche.find((l)=>l.articolo===a.identita.articolo)??null,ultimaFonte:a.provenienze.length===1,revisioneAcquistiAttesa:improntaDato({r,s,proposte:leggiPropostePartita(p,{ancheChiuse:true})})};
}
export function annullaProvenienzaAcquistoNellaTransazione(p:number,r:RichiestaAnnullaProvenienza):RicevutaOperazioneAcquistoDto {
  if(!getDb().inTransaction)throw new Error('La rimozione richiede il cestino nella transazione del chiamante.');
  const payload={operazioneId:r.operazioneId,provenienzaId:r.provenienzaId},old=replay(p,r.operazioneId,'annulla-fonte',payload);if(old)return old;
  const a=anteprimaAnnullaProvenienza(p,payload);if(a.revisioneAcquistiAttesa!==r.revisioneAcquistiAttesa)throw httpErrors.conflict('acquisti-cambiati','La provenienza o i suoi effetti sono cambiati.');
  annullaEventiFonteAcquistoNellaTransazione(p,r.provenienzaId);
  if(prepared('DELETE FROM utente.acquisto_provenienza WHERE partita_id=? AND id=?').run(p,r.provenienzaId).changes!==1)throw httpErrors.conflict('fonte-cambiata','La provenienza è cambiata.');
  riconciliaBeneficiAcquisto(p,a.acquisto!.id);
  const ricevuta:RicevutaOperazioneAcquistoDto={operazioneId:r.operazioneId,esito:'fonte-rimossa',partitaId:p,acquistoId:a.acquisto!.id,provenienzaId:r.provenienzaId,articolo:a.articolo,creataIl:nowIso()};salvaOperazione(p,r.operazioneId,'annulla-fonte',payload,ricevuta);return ricevuta;
}
export const annullaProvenienzaAcquisto=annullaProvenienzaAcquistoNellaTransazione;
export function annullaFontiDiarioNellaTransazione(p:number,voce:string,provenienzePossedute:string[],effetto?:string):void {
  if(!getDb().inTransaction)throw new Error('L’annullo del Diario richiede una transazione.');
  const fonti=(prepared(`SELECT * FROM utente.acquisto_provenienza WHERE partita_id=? AND voce_uid=?${effetto?' AND effetto_uid=?':''}`).all(...(effetto?[p,voce,effetto]:[p,voce])) as RigaFonte[]);
  if(fonti.some((f)=>!provenienzePossedute.includes(f.id)))throw httpErrors.conflict('provenienza-diversa','La fonte corrente non è quella posseduta dalle ricevute: nessuna attribuzione per solo UID.');
  for(const f of fonti){fonteDto(f);annullaEventiFonteAcquistoNellaTransazione(p,f.id);prepared('DELETE FROM utente.acquisto_provenienza WHERE partita_id=? AND id=?').run(p,f.id);}
  for(const id of new Set(fonti.map((f)=>f.acquisto_id)))riconciliaBeneficiAcquisto(p,id);
}
/** Il cestino del chiamante fotografa le fonti; fatto, saldi e ricevute restano durevoli. */
export function preparaRimozioneArticoliAcquistati(chiaviArticoli:string[]):void {
  if(!getDb().inTransaction)throw new Error('La rimozione degli articoli richiede la transazione del cestino.');
  const chiavi=new Set(chiaviArticoli),fatti=(prepared('SELECT * FROM utente.acquisto_registrato ORDER BY partita_id,id').all() as RigaAcquisto[]).filter((a)=>chiavi.has(a.articolo_chiave));
  for(const p of new Set(fatti.map((a)=>a.partita_id)))leggiAcquistiPartita(p);
  for(const a of fatti){const fonti=prepared('SELECT id FROM utente.acquisto_provenienza WHERE partita_id=? AND acquisto_id=?').all(a.partita_id,a.id) as Array<{id:string}>;for(const f of fonti)annullaEventiFonteAcquistoNellaTransazione(a.partita_id,f.id);prepared('DELETE FROM utente.acquisto_provenienza WHERE partita_id=? AND acquisto_id=?').run(a.partita_id,a.id);riconciliaBeneficiAcquisto(a.partita_id,a.id);}
}
export function anteprimaRimozionePresenzaLegacy(p:number,r:RichiestaAnteprimaRimozioneLegacy):AnteprimaRimozioneAcquistoDto {
  const s=leggiAcquistiPartita(p),presenza=s.presenzeStoriche.find((l)=>l.articolo===r.articolo);if(!presenza)throw httpErrors.notFound('presenza-non-trovata','La presenza storica non esiste più.');
  return {operazioneId:r.operazioneId,articolo:r.articolo,acquisto:null,presenzaStorica:presenza,ultimaFonte:false,revisioneAcquistiAttesa:improntaDato({r,s})};
}
export function rimuoviPresenzaLegacy(p:number,r:RichiestaRimozioneLegacy):RicevutaOperazioneAcquistoDto {
  if(!getDb().inTransaction)throw new Error('La rimozione legacy richiede il cestino nella transazione del chiamante.');
  const payload={operazioneId:r.operazioneId,articolo:r.articolo},old=replay(p,r.operazioneId,'rimuovi-legacy',payload);if(old)return old;
  const a=anteprimaRimozionePresenzaLegacy(p,payload);if(a.revisioneAcquistiAttesa!==r.revisioneAcquistiAttesa)throw httpErrors.conflict('presenza-cambiata','La presenza storica è cambiata.');
  const raw=righeLegacy(p).find((l)=>l.articolo_chiave===r.articolo)!;
  if(prepared('DELETE FROM utente.acquisto_partita WHERE partita_id=? AND articolo_chiave=? AND updated_at IS ?').run(p,r.articolo,raw.updated_at).changes!==1)throw httpErrors.conflict('presenza-cambiata','La tuple storica non coincide più.');
  const ricevuta:RicevutaOperazioneAcquistoDto={operazioneId:r.operazioneId,esito:'presenza-rimossa',partitaId:p,acquistoId:null,provenienzaId:null,articolo:r.articolo,creataIl:nowIso()};salvaOperazione(p,r.operazioneId,'rimuovi-legacy',payload,ricevuta);return ricevuta;
}

// L13 (decisione 18): con i movimenti automatici degli yen (utente 048) e le cause già nel saldo da prima (utente 049), storia durevole del saldo come `movimento_yen`
export const TABELLE_DUREVOLI_ACQUISTI=['da_applicare','effetto_applicato','movimento_yen','yen_automatico','yen_fuori_registro','acquisto_operazione','proposta_operazione','beneficio_ciclo'] as const;
export interface ContestoRipristinoAcquisti {tipoCestino:string;partitaIds:number[];acquistoIds:string[];durevoli:Record<string,unknown[]>;identita:Record<string,unknown>[]}
export function preparaRipristinoAcquisti(r:{tipoCestino:string;partitaIds:number[];acquistoIds:string[]}):ContestoRipristinoAcquisti {
  if(!getDb().inTransaction)throw new Error('Il ripristino richiede la transazione del cestino.');
  const ids=[...new Set(r.partitaIds)],durevoli:Record<string,unknown[]>={};
  for(const p of ids)if(prepared('SELECT 1 FROM utente.partita WHERE id=?').get(p))leggiPropostePartita(p,{ancheChiuse:true});
  for(const t of TABELLE_DUREVOLI_ACQUISTI)durevoli[t]=ids.flatMap((p)=>prepared(`SELECT * FROM utente.${t} WHERE partita_id=? ORDER BY rowid`).all(p));
  const identita=ids.flatMap((p)=>prepared('SELECT * FROM utente.acquisto_registrato WHERE partita_id=? ORDER BY id').all(p)) as Record<string,unknown>[];
  return {...r,partitaIds:ids,durevoli,identita};
}
export function verificaRipristinoAcquisti(c:ContestoRipristinoAcquisti):void {
  if(c.tipoCestino!=='partita')for(const t of TABELLE_DUREVOLI_ACQUISTI){const ora=c.partitaIds.flatMap((p)=>prepared(`SELECT * FROM utente.${t} WHERE partita_id=? ORDER BY rowid`).all(p));if(jsonCanonico(ora)!==jsonCanonico(c.durevoli[t]))throw httpErrors.conflict('ricevute-cambiate','Il ripristino tentava di cambiare ricevute o decisioni successive: intero blocco conservato.');}
  for(const prima of c.identita){const ora=prepared('SELECT * FROM utente.acquisto_registrato WHERE partita_id=? AND id=?').get(prima.partita_id,prima.id) as Record<string,unknown>|undefined;if(ora&&jsonCanonico(ora)!==jsonCanonico(prima))throw httpErrors.conflict('uuid-acquisto-occupato','Lo stesso UUID ha un’identità o contenuto diverso: nessuna sovrascrittura.');}
  if(c.tipoCestino!=='partita')for(const p of c.partitaIds)for(const f of righeFonti(p))if(f.tipo==='diario'){
    const ricevute=prepared('SELECT annullato_il FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? ORDER BY applicato_il,id').all(p,f.voce_uid,f.effetto_uid) as Array<{annullato_il:string|null}>;
    if(ricevute.length&&ricevute.every((r)=>r.annullato_il!==null)&&!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,f.voce_uid))throw httpErrors.conflict('fonte-annullata-successivamente','La spunta è stata annullata dopo la rimozione: il ripristino non può riattivare quella fonte.');
  }
  for(const p of c.partitaIds)if(prepared('SELECT 1 FROM utente.partita WHERE id=?').get(p)){leggiAcquistiPartita(p);leggiPropostePartita(p,{ancheChiuse:true});}
}
export function riconciliaAcquistiDopoRipristino(p:number,ids:string[]):void {
  const tutti=new Set([...ids,...righeAcquisti(p).map((a)=>a.id),...(prepared("SELECT DISTINCT causa_chiave FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='acquisto'").all(p) as Array<{causa_chiave:string}>).map((r)=>r.causa_chiave)]);
  for(const id of tutti)riconciliaBeneficiAcquisto(p,id);
}
