import { dataValida, type RequisitoSpillo } from './condizioniSpillo.js';
/** Conversione una tantum: solo frasi intere note. Nessun riconoscimento parziale a runtime. */
export function migraTestiCondizioni(testi: Array<string|null|undefined>, confidente?:string|null): RequisitoSpillo[] {
  const mesi=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const palazzi=['kamoshida','madarame','kaneshiro','futaba','okumura','niijima','shido','maruki'];
  return testi.flatMap((originale):RequisitoSpillo[]=>{
    if(!originale?.trim()) return [];
    const t=originale.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('’',"'");
    let m:RegExpMatchArray|null;
    if(/^(sempre disponibile|sempre acquistabile)$/.test(t)) return [];
    if((m=t.match(/^(?:disponibile )?dal (\d{1,2}|primo) ([a-z]+)$/))){
      const mese=mesi.indexOf(m[2])+1, data=String(mese).padStart(2,'0')+'-'+String(m[1]==='primo'?1:Number(m[1])).padStart(2,'0');
      if(dataValida(data))return [{tipo:'data',dal:data}];
    }
    if((m=t.match(/^(?:richiede )?(conoscenza|coraggio|perizia|gentilezza|fascino) rango ([1-5])$/)))return [{tipo:'dote',dote:m[1],rango:Number(m[2])}];
    if((m=t.match(/^rango confidente ([a-z]+) (\d{1,2})$/))&&Number(m[2])<=10&&Number(m[2])>0)return [{tipo:'confidente',confidente:m[1],rango:Number(m[2])}];
    if((m=t.match(/^rango confidente (\d{1,2})$/))&&confidente&&Number(m[1])<=10&&Number(m[1])>0)return [{tipo:'confidente',confidente,rango:Number(m[1])}];
    if((m=t.match(/^dopo (?:il )?palazzo di ([a-z]+)$/))&&palazzi.includes(m[1]))return [{tipo:'palazzo',dungeon:m[1]}];
    if(t==='solo nei giorni di pioggia')return [{tipo:'piove'}];
    if(t==='solo di sera'||t==='solo di giorno')return [{tipo:'fascia',fascia:t==='solo di sera'?'sera':'giorno'}];
    return [{tipo:'da-configurare',nota:originale.trim()}];
  });
}
