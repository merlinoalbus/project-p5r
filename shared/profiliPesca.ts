import type { DefinizioneRegolaPesca, EsitoProfiloPescaDto, MomentoPesca, OsservazionePesca, PuntoValutazionePesca, ViaPescaDto } from './pesca.js';
import type { RequisitoSpillo } from './condizioniSpillo.js';

/** Le vie sono sufficienti, non un elenco di tutte le possibilità del gioco. */
export function valutaProfiliPesca(regola:DefinizioneRegolaPesca|null,_momento:MomentoPesca,o:OsservazionePesca,guardianoPrecedente:boolean|null,punto:PuntoValutazionePesca,valuta:(r:RequisitoSpillo)=>'verde'|'rosso'|'grigio'):EsitoProfiloPescaDto[] {
  return (['guardiano','boss'] as const).map(specie=>{
    const necessita:string[]=[],incertezze:string[]=[],vie:ViaPescaDto[]=[];
    const consumati=punto.tipo==='prossimo-tentativo'?punto.consumati:o.tentativiConsumati;
    const residui=o.rangoPeriziaOsservato!==null&&consumati!==null?Math.max(0,o.rangoPeriziaOsservato+2-consumati):null;
    const precedenti=o.catture?.filter(c=>punto.tipo==='pianificazione'||(c.tentativo!==null&&c.tentativo<=punto.consumati&&(punto.posizione===null||c.posizione!==null&&c.posizione<punto.posizione)))??null;
    const giaCatturato=precedenti?.some(c=>c.specie===specie)??false;
    const ordineCatturaIgnoto=punto.tipo==='prossimo-tentativo'&&o.catture?.some(c=>c.specie===specie&&(c.tentativo===null||punto.posizione!==null&&c.posizione===null))===true;
    if(o.faseTerzoSemestre===null)incertezze.push('Il terzo semestre al momento della visita non è attestato.');
    if(o.meteo===null)incertezze.push('Meteo della visita ignoto. L’allerta gelo da sola non prova pioggia o neve.');
    if(o.rangoPeriziaOsservato===null)incertezze.push('Rango Perizia osservato ignoto; la Dote odierna non viene usata per il passato.');
    if(o.escaSpecialePosseduta===false)necessita.push('Esca speciale non posseduta al momento osservato.');
    else if(o.escaSpecialePosseduta===null)incertezze.push('Possesso dell’esca speciale da verificare.');
    if(specie==='boss'){
      if(o.faseTerzoSemestre===false)necessita.push('La via documentata del Boss riguarda il terzo semestre.');
      if(guardianoPrecedente===false)necessita.push('La cattura precedente del Guardiano non risulta avvenuta prima della visita.');
      else if(guardianoPrecedente===null)incertezze.push('La cattura del Guardiano prima della visita è ignota.');
    }
    let comparsa=false,cattura=false;
    if(!regola)incertezze.push('Regola della guida assente o illeggibile.');
    for(const v of regola?.vie.filter(v=>v.specie===specie)??[]){
      const fase:RequisitoSpillo={tipo:'evento',evento:'terzo-semestre-avviato'};
      const guardian:RequisitoSpillo={tipo:'evento',evento:'guardiano-ichigaya-catturato'};
      const asciutto:RequisitoSpillo={tipo:'meteo',condizione:'non-piove'};
      const ambito=valuta(v.faseTerzoSemestre?fase:{tipo:'non',condizione:fase})==='verde'&&valuta({tipo:'fascia',fascia:v.fascia})==='verde'&&valuta(v.meteo==='pioggia-neve'?{tipo:'non',condizione:asciutto}:asciutto)==='verde';
      const precedente=v.guardianoPrecedente==='indifferente'||valuta(v.guardianoPrecedente==='si'?guardian:{tipo:'non',condizione:guardian})==='verde';
      const sei=precedenti!==null&&new Set(precedenti.filter(c=>c.tentativo!==null&&c.tentativo<=6).map(c=>c.tentativo)).size>=6;
      const rangoComparsa=v.rangoComparsa===null||valuta({tipo:'dote',dote:'perizia',rango:v.rangoComparsa})==='verde';
      const contesto=ambito&&precedente&&rangoComparsa&&(!v.seiCatture||sei);
      const rango=valuta({tipo:'dote',dote:'perizia',rango:v.rangoCattura})==='verde';
      // Pianificare il settimo lancio non equivale ad averlo ancora disponibile adesso.
      const ordinale=punto.tipo==='pianificazione'||(v.tentativo==='primo'?punto.consumati===0:punto.consumati===6);
      const possibile=contesto&&rango&&ordinale&&!giaCatturato&&!ordineCatturaIgnoto&&(punto.tipo==='pianificazione'||residui!==null&&residui>0);
      comparsa ||= contesto&&!giaCatturato;
      cattura ||= possibile;
      vie.push({id:v.id,descrizione:v.nota,esito:possibile?'soddisfatta':ambito?'non-dimostrata':'non-applicabile',fonti:v.fonti});
    }
    if(!cattura&&!necessita.length)incertezze.push('Nessuna via sufficiente è dimostrata nel contesto osservato; ciò non prova un’impossibilità universale.');
    if(giaCatturato)incertezze.push('La specie è già stata catturata prima del punto valutato in questa visita: le fonti non prevedono una nuova comparsa nella stessa visita.');
    if(ordineCatturaIgnoto)incertezze.push('Una cattura della specie ha ordine ignoto rispetto al punto valutato: nessuna nuova via positiva viene dedotta.');
    const tentativo=giaCatturato?'gia-catturato':residui===0?'esaurito':punto.tipo==='pianificazione'?'pianificabile':cattura&&residui!==null&&residui>0?'tentabile':'da-verificare';
    const disponibile=cattura&&valuta({tipo:'pesca-sessione',dato:'esca-speciale',valore:true})==='verde'&&tentativo!=='esaurito'&&tentativo!=='gia-catturato'&&(punto.tipo==='pianificazione'||valuta({tipo:'pesca-sessione',dato:'tentativo-residuo',valore:true})==='verde');
    return {specie,esito:necessita.length?'prerequisito-mancante':disponibile?'via-documentata':'da-verificare',comparsa:comparsa?'documentata':'da-verificare',catturabilita:necessita.length?'prerequisito-mancante':disponibile?'via-documentata':'da-verificare',tentativo,tentativiResidui:residui,necessita,vie,incertezze};
  });
}
