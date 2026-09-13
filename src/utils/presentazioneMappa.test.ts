import type { MappaDto, MappaRiassuntoDto } from '../types';
import { alternativeMappa, etichetteDistinte, nomePresentazioneMappa, titoloContesto, risolviContesto, etichettaPlanimetria, presentaMappa, titoloGruppoImmagini } from './presentazioneMappa';
const m = {nome:'Area tecnica',nomeRivisto:false,contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2},{id:'c',nome:'Museo, 2P',campo:'F3',texpack:2}]};
it('senza contesto mantiene tutti i titoli senza sceglierne uno canonico',()=>{
  expect(nomePresentazioneMappa(m)).toBe('Museo, 1P / Museo, 2P');
  expect(titoloContesto(m,null)).toBeNull();
});
it('sceglie soltanto un contesto appartenente alla risorsa',()=>{
  expect(nomePresentazioneMappa(m,'a')).toBe('Museo, 1P');
  expect(nomePresentazioneMappa(m,'b')).toBe('Museo, 2P');
  expect(nomePresentazioneMappa(m,'non-esiste')).toBe('Museo, 1P / Museo, 2P');
  expect(titoloContesto(m,'a|b')).toBeNull();
});
it('i nomi uguali conservano ogni ID senza associare un campo arbitrario',()=>{
  expect(alternativeMappa(m)[1]).toEqual({nome:'Museo, 2P',ids:['b','c'],valore:'b|c'});
  expect(titoloContesto(m,'b|c')).toBe('Museo, 2P');
});
it('le immagini del Covo condividono solo il nome verificato del luogo',()=>{
  expect(nomePresentazioneMappa({nome:'livello grafico 4',nomeRivisto:false,gruppoImmagini:{id:'covo',nome:'Covo dei Ladri',ordine:3}})).toBe('Covo dei Ladri');
});
it('quando la versione ha un’etichetta dimostrata il nome la porta, in ogni schermata',()=>{
  const covo={nome:'Covo dei Ladri',nomeRivisto:false,gruppoImmagini:{id:'covo',nome:'Covo dei Ladri',ordine:0,etichetta:'settore d’ingresso'}} as never;
  expect(nomePresentazioneMappa(covo)).toBe('Covo dei Ladri — settore d’ingresso');
});

const parziale: MappaRiassuntoDto = {chiave:'nativo-rmap-153-4-0',nome:'Area 4 — RMAP 153',nomeRivisto:false,tipo:'area',genitore:'palazzo-verificato',genitoreNome:'Palazzo di Madarame',nomeCompleto:'Altro genitore › Area 4 — RMAP 153',ordine:0,immagineUrl:null,asset:null,entita:null,origine:'seed',numeroSpilli:0,numeroFigli:0,updatedAt:'',contesti:[{id:'normale',nome:'Ripostiglio',campo:'F153_004_00',texpack:102},{id:'safe',nome:null,campo:'F153_051_00',texpack:103},{id:'altro-ignoto',nome:null,campo:'F153_052_00',texpack:104}]};
it.each([
  [null,'assente'],['','assente'],['safe','senza-titolo'],['altro-ignoto','senza-titolo'],['estraneo','non-valido'],['normale|safe','senza-titolo'],['safe|normale','senza-titolo'],['normale|normale','non-valido'],['safe|safe','non-valido'],['normale|','non-valido'],['|normale','non-valido'],['normale||safe','non-valido'],['safe|estraneo','non-valido'],
])('il contesto %s mantiene il nome neutro e distingue lo stato %s',(selezione,stato)=>{
  expect(risolviContesto(parziale,selezione).stato).toBe(stato);
  expect(titoloContesto(parziale,selezione)).toBeNull();
  expect(nomePresentazioneMappa(parziale,selezione)).toBe('Palazzo di Madarame — Planimetria');
});
it('Ripostiglio è mostrato soltanto selezionando il contesto noto',()=>{
  expect(risolviContesto(parziale,'normale')).toEqual({stato:'nominato',titolo:'Ripostiglio',ids:['normale']});
  expect(nomePresentazioneMappa(parziale,'normale')).toBe('Ripostiglio');
  expect(alternativeMappa(parziale)).toHaveLength(3);
  expect(alternativeMappa(parziale).filter(a=>a.nome===null).map(a=>a.valore)).toEqual(['safe','altro-ignoto']);
});
it('albero ed editor usano il genitore esplicito senza ricavarlo da nomeCompleto o chiave RMAP',()=>{
  expect(etichettaPlanimetria(parziale)).toBe('Palazzo di Madarame — Planimetria');
  expect(etichettaPlanimetria({...parziale,genitoreNome:null})).toBe('Planimetria');
  expect(nomePresentazioneMappa({...parziale,genitoreNome:undefined})).toBe('Planimetria');
  const dto: MappaDto={...parziale,genitoreNome:parziale.genitoreNome ?? null,larghezza:1536,altezza:1536,note:'',percorso:[{chiave:'palazzo-verificato',nome:'Palazzo di Madarame'},{chiave:parziale.chiave,nome:parziale.nome}],figli:[],spilli:[]};
  const vista=presentaMappa(dto,'safe');
  expect(vista.nome).toBe('Palazzo di Madarame — Planimetria');
  expect(vista.percorso[0]).toEqual(dto.percorso[0]);
  expect(vista.percorso[1].nome).toBe(vista.nome);
  expect(dto.nome).toBe('Area 4 — RMAP 153');
});
it('i contesti completi continuano a mostrare tutte le alternative senza nomi neutri',()=>{
  expect(nomePresentazioneMappa({...m,genitoreNome:'Palazzo di Madarame'})).toBe('Museo, 1P / Museo, 2P');
  expect(nomePresentazioneMappa(m,'b|c')).toBe('Museo, 2P');
  expect(risolviContesto(m,'a|b').stato).toBe('multiplo');
});

// ---- Il nome rivisto a mano (082) ----
//
// Il caso da cui è nata la regola: due versioni della stessa immagine del sottopasso di Shibuya,
// con lo stesso nome di gruppo e un'etichetta ciascuna. Chi correggeva il campo «Nome» nell'editor
// continuava a vedere in alto il titolo dedotto, suffisso della versione compreso.
const sottopasso = {nome:'Sottopasso',nomeRivisto:false,gruppoImmagini:{id:'nativo-rmap-001-2-0',nome:'Sottopasso',ordine:0,etichetta:'inquadratura orientale'}};
it('finché il nome è quello del pacchetto, a presentare la mappa sono gruppo ed etichetta',()=>{
  expect(nomePresentazioneMappa(sottopasso)).toBe('Sottopasso — inquadratura orientale');
  expect(titoloGruppoImmagini(sottopasso)).toBe('Sottopasso');
});
it('il nome rivisto si mostra esattamente com’è scritto, senza il suffisso della versione',()=>{
  // è il caso segnalato: `nome` e nome del gruppo coincidono, e prima il suffisso restava comunque
  expect(nomePresentazioneMappa({...sottopasso,nomeRivisto:true})).toBe('Sottopasso');
  expect(nomePresentazioneMappa({...sottopasso,nome:'Sottopasso di Shibuya',nomeRivisto:true})).toBe('Sottopasso di Shibuya');
});
it('il nome rivisto vale anche dove i contesti non hanno un titolo, e anche se è tecnico',()=>{
  expect(nomePresentazioneMappa({...parziale,nome:'Ripostiglio del seminterrato',nomeRivisto:true})).toBe('Ripostiglio del seminterrato');
  // se una persona sceglie di tenere la sigla, la sigla resta: il gergo lo toglie solo ai nomi dedotti
  expect(nomePresentazioneMappa({...parziale,nomeRivisto:true})).toBe('Area 4 — RMAP 153');
});
it('il contesto scelto resta davanti al nome rivisto: è la vista in corso, non il nome',()=>{
  expect(nomePresentazioneMappa({...parziale,nome:'Ripostiglio del seminterrato',nomeRivisto:true},'normale')).toBe('Ripostiglio');
});
it('albero, miniature e briciole chiamano la mappa rivista come l’editor',()=>{
  const rivista={...sottopasso,nome:'Sottopasso di Shibuya',nomeRivisto:true};
  expect(titoloGruppoImmagini(rivista)).toBe('Sottopasso di Shibuya');
  expect(titoloGruppoImmagini({nome:'Area tecnica',nomeRivisto:false,contesti:[]})).toBe('Area tecnica');
  // dopo il salvataggio il server ricalcola anche `nomeCompleto`: il selettore tiene la gerarchia
  expect(etichettaPlanimetria({...parziale,nome:'Ripostiglio del seminterrato',nomeRivisto:true,nomeCompleto:'Altro genitore › Ripostiglio del seminterrato'})).toBe('Altro genitore › Ripostiglio del seminterrato');
  const dto: MappaDto={...parziale,nome:'Ripostiglio del seminterrato',nomeRivisto:true,genitoreNome:parziale.genitoreNome ?? null,larghezza:null,altezza:null,note:'',percorso:[{chiave:'palazzo-verificato',nome:'Palazzo di Madarame'},{chiave:parziale.chiave,nome:'Ripostiglio del seminterrato'}],figli:[{...sottopasso,...parziale,chiave:'figlia',nome:'Sottopasso di Shibuya',nomeRivisto:true}],spilli:[]};
  expect(presentaMappa(dto).nome).toBe('Ripostiglio del seminterrato');
  expect(presentaMappa(dto).figli[0].nome).toBe('Sottopasso di Shibuya');
});
it('due versioni riviste con lo stesso nome restano distinguibili negli elenchi',()=>{
  const una={...sottopasso,nomeRivisto:true};
  const altra={...sottopasso,nomeRivisto:true,gruppoImmagini:{id:'nativo-rmap-001-2-0',nome:'Sottopasso',ordine:1,etichetta:'planimetria completa'}};
  expect(etichetteDistinte([una,altra])).toEqual(['Sottopasso · 1','Sottopasso · 2']);
});

// ---- Il vocabolario dell'estrattore non arriva a chi gioca ----
const grezza = (nome: string) => ({ nome, nomeRivisto: false, contesti: [] } as unknown as MappaRiassuntoDto);

it('toglie il gergo dell’estrazione e tiene il luogo davanti', () => {
  expect(nomePresentazioneMappa(grezza('Palazzo di Kamoshida — Immagini native che nessun campo usa')))
    .toBe('Palazzo di Kamoshida — Planimetria non attribuita');
  expect(nomePresentazioneMappa(grezza('Palazzo di Madarame — Immagini native che nessun campo usa — tela quadrata, disegno minuto — la seconda per estensione')))
    .toBe('Palazzo di Madarame — Planimetria non attribuita');
  expect(nomePresentazioneMappa(grezza('Immagini native che nessun campo usa — tela alta, disegno minuto')))
    .toBe('Planimetria non attribuita');
  // e un nome vero non si tocca
  expect(nomePresentazioneMappa(grezza('Cancello del castello — porzione occidentale')))
    .toBe('Cancello del castello — porzione occidentale');
});

it('numera solo le etichette che finirebbero uguali, nell’ordine dell’elenco', () => {
  const elenco = [
    grezza('Palazzo di Kamoshida — Immagini native che nessun campo usa'),
    grezza('Cancello del castello'),
    grezza('Palazzo di Kamoshida — Immagini native che nessun campo usa — tela larga, disegno minuto — la più estesa'),
    grezza('Vecchio castello 1P'),
  ];
  expect(etichetteDistinte(elenco)).toEqual([
    'Palazzo di Kamoshida — Planimetria non attribuita · 1',
    'Cancello del castello',
    'Palazzo di Kamoshida — Planimetria non attribuita · 2',
    'Vecchio castello 1P',
  ]);
});

it('confronta le etichette dopo la trasformazione, non prima', () => {
  const elenco = [grezza('Palazzo di Shido — Sala d’ingresso'), grezza('Palazzo di Shido — Sala d’ingresso')];
  const senzaPrefisso = (t: string) => t.replace('Palazzo di Shido — ', '');
  expect(etichetteDistinte(elenco, senzaPrefisso)).toEqual(['Sala d’ingresso · 1', 'Sala d’ingresso · 2']);
});
