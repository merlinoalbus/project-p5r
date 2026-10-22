import type { DescrizioneRotta, DescrizioniArea } from '../tipi.js';
const base='/api/partite/:id/pesca';
const lettura=(sommario:string,risposta:string):DescrizioneRotta=>({sommario,risposta,descrizione:'Lettura senza mutazioni. Conserva identità UUID, fonti temporali, ignoto distinto da falso, unità e proprietà dei turni. Nessuna cattura o beneficio viene dedotto da un conteggio.',errori:[[404,'partita-non-trovata'],[409,'pesca-registro-illeggibile']]});
const coppia=(nome:string):readonly [DescrizioneRotta,DescrizioneRotta]=>[
  {sommario:`Rivedi ${nome}`,descrizione:'Corpo strict del gesto con operazioneId. Fotografa le fonti e i dati personali nella stessa transazione readonly; restituisce CAS, conseguenze e costi tipizzati. Comparsa, via sufficiente e cattura osservata restano distinte. Le quote e la Perizia ignote conservano intervalli, senza inverse presunte.',risposta:'`AnteprimaOperazionePescaDto`',errori:[[409,'pesca-regola-assente'],[409,'pesca-cambiata']]},
  {sommario:`Conferma ${nome}`,descrizione:'Corpo dell’anteprima più revisionePescaAttesa. Replay del medesimo operazioneId/payload prima del CAS; ID diverso dal payload è409. Ricevuta costruita nella transazione e consultabile dopo perdita della risposta. Il POST pubblico della sessione accetta solo fonte manuale; Diario usa il motore canonico. Nessun beneficio o costo applicato automaticamente. Le rimozioni esplicite sono recuperabili dal cestino personale; collisioni e generazioni annullate non vengono sovrascritte.',risposta:'`RicevutaOperazionePescaDto` (201)',errori:[[409,'pesca-cambiata'],[409,'pesca-operazione-diversa'],[409,'pesca-fonte-riservata']]},
];
const gesti=[
  ['/anteprima','','la visita osservata'],
  ['/sessioni/:sessione/anteprima-osservazione','/sessioni/:sessione/osservazioni','la correzione versionata dell’osservazione'],
  ['/provenienze/:fonte/anteprima-rimozione','/provenienze/:fonte/rimozione','la rimozione della sola fonte'],
  ['/sessioni/:sessione/anteprima-rimozione','/sessioni/:sessione/rimozione','la rimozione della sessione e delle sue fonti'],
  ['/fatti/:evento/anteprima','/fatti/:evento','la fonte manuale temporale del fatto'],
  ['/fatti/fonti/:fonte/anteprima-rimozione','/fatti/fonti/:fonte/rimozione','la revoca della fonte manuale del fatto'],
  ['/acquisti-esca/anteprima','/acquisti-esca','l’acquisto effettivo dell’esca in punti pesca'],
  ['/acquisti-esca/:acquisto/anteprima-rimozione','/acquisti-esca/:acquisto/rimozione','la rimozione dell’acquisto dell’esca'],
  ['/punti/anteprima-rettifica','/punti/rettifica','il saldo punti pesca osservato'],
] as const;
export const DESCRIZIONI_PESCA:DescrizioniArea={
  [`GET ${base}`]:lettura('Registro della pesca della partita','`StatoPescaDto`'),
  [`GET ${base}/sessioni/:sessione`]:lettura('Visita, fonti e osservazioni della sessione','`SessionePescaDto`'),
  [`GET ${base}/operazioni/:operazione`]:lettura('Ricevuta durevole del gesto pesca','`RicevutaOperazionePescaDto`;404 non dimostra un rifiuto pre-commit'),
  [`GET ${base}/fatti`]:lettura('Fatti della pesca con fonti e limiti temporali','`FattoPescaDto[]`'),
  ...Object.fromEntries(gesti.flatMap(([preview,salva,nome])=>{const [a,b]=coppia(nome);return [[`POST ${base}${preview}`,a],[`POST ${base}${salva}`,b]];})),
  'GET /api/pesca/regola/:chiave':lettura('Regola modificabile della pesca e fonti','`RegolaPescaDto`, inclusi dati e revisione'),
  'PUT /api/pesca/regola/:chiave':{sommario:'Salva la regola della pesca con precondizione',descrizione:'Corpo strict nome,dati,revisioneAttesa; dati comprende quote, costo esca in punti pesca, base Perizia e bonusFortuna aggiuntivo, fonti e vie sufficienti. Le personalizzazioni non diventano necessità universali del gioco. Non modifica visite, fotografie storiche o benefici applicati.',risposta:'`RegolaPescaDto`',errori:[[409,'pesca-regola-cambiata'],[400,'pesca-regola-non-valida']]},
};
