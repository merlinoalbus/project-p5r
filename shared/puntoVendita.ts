// ============================================================
// puntoVendita — regole pure del modello luogo / punto vendita / pin
// ============================================================
//
// Il luogo dice dove, il punto vendita (tabella `negozio`) che cosa si compra, il pin quale. Le regole valgono per le scritture
// nuove: chi le chiama passa lo stato prima e dopo, così una riga già esistente che non cambia nei campi della regola resta ammessa.
// Ripristinare dal Cestino e «Importa» riportano stati già esistenti e non passano da qui; nascondere un luogo intero, reversibile, nasconde con lui i suoi punti vendita. Le risposte che il codice non può dare (se una macchina è documentata, se si sa quale macchina è un pin di luogo)
// restano alla query di conformità.
// ============================================================

/** Un rifiuto: il codice e lo stato della risposta, il messaggio per l'utente. */
export interface ViolazionePuntoVendita { codice: string; stato: 400 | 409; messaggio: string }

/** I punti vendita che non stanno sulla mappa, gli unici ammessi senza sede. */
export const PUNTI_VENDITA_FUORI_DALLA_MAPPA: ReadonlySet<string> = new Set(['negozio-palazzo-niijima']);

/** I generi di luogo che esistono per vendere. */
export const TIPI_LUOGO_DI_VENDITA: readonly string[] = ['negozio', 'distributore'];

/** Il genere di punto vendita, e di pin, che è una macchina. */
export const TIPO_MACCHINA = 'distributore';

/**
 * Che cosa vende il primo punto vendita di un luogo che nasce per vendere: una macchina per un luogo «distributore», «altro» (da scegliere
 * nell'editor del posto) per un luogo «negozio»; null per i generi di posto che non vendono.
 */
export function tipoPuntoVenditaDelLuogo(genere: string): string | null {
  if (genere === TIPO_MACCHINA) return TIPO_MACCHINA;
  return TIPI_LUOGO_DI_VENDITA.includes(genere) ? 'altro' : null;
}

/** L'ancora della sezione di un punto vendita nella pagina del suo luogo (`#negozio-untouchable`): la stessa per il server e l'interfaccia. */
export function ancoraPuntoVendita(chiave: string): string {
  return `negozio-${chiave.replace(/[^a-zA-Z0-9]+/g, '-')}`;
}

/** I1. Un punto vendita ha una sede: la perde o nasce senza solo chi non sta sulla mappa. Senza sede già prima resta ammesso. */
export function violazioneSede(p: { chiave: string | null; sedePrima: string | null; sedeDopo: string | null; nuovo: boolean }): ViolazionePuntoVendita | null {
  if (p.sedeDopo !== null || (!p.nuovo && p.sedePrima === null)) return null;
  if (p.chiave !== null && PUNTI_VENDITA_FUORI_DALLA_MAPPA.has(p.chiave)) return null;
  return { codice: 'punto-vendita-senza-sede', stato: 400, messaggio: 'Un punto vendita sta in un luogo: scegli la sede.' };
}

/** I1, I2 e un solo pin per punto vendita: il pin nuovo o spostato verso un punto vendita. */
export function violazionePinVersoPuntoVendita(p: {
  puntoVendita: string; sede: { nome: string; area: string | null } | null; areaPlanimetria: string | null; altriPin: number;
}): ViolazionePuntoVendita | null {
  if (!p.sede) return { codice: 'punto-vendita-senza-sede', stato: 400, messaggio: `«${p.puntoVendita}» non ha una sede: scegline una prima di metterlo sulla mappa.` };
  if (p.sede.area === null) return { codice: 'sede-senza-area', stato: 400, messaggio: `«${p.sede.nome}» non è ancora in un’Area: collocalo prima di mettere sulla mappa «${p.puntoVendita}».` };
  if (p.areaPlanimetria !== p.sede.area) return { codice: 'pin-fuori-dall-area-della-sede', stato: 400, messaggio: `Il pin di «${p.puntoVendita}» va su una planimetria dell’Area della sua sede, «${p.sede.nome}».` };
  if (p.altriPin > 0) return { codice: 'punto-vendita-gia-sulla-mappa', stato: 409, messaggio: `«${p.puntoVendita}» ha già il suo pin: un punto vendita ne ha uno solo.` };
  return null;
}

/**
 * I3. Un pin di macchina su una planimetria indica la macchina se il luogo ne ha più d'una e si sa quale. Il codice lo sa solo per
 * i luoghi dove almeno una macchina ha già il suo pin: dove nessuna ce l'ha (Shinjuku, Akihabara) non si sa, e il pin resta sul luogo.
 * Sull'illustrazione del quartiere, senza Area, il pin rappresenta il luogo intero.
 */
export function violazionePinVersoLuogo(p: {
  tipoPin: string; luogo: string; areaPlanimetria: string | null; macchine: number; macchineConPin: number;
}): ViolazionePuntoVendita | null {
  if (p.tipoPin !== TIPO_MACCHINA || p.areaPlanimetria === null || p.macchine < 2 || p.macchineConPin === 0) return null;
  return { codice: 'pin-senza-macchina', stato: 400, messaggio: `In «${p.luogo}» ogni macchina ha il suo pin: collega questo pin alla macchina, non al luogo.` };
}

/** I2 dalla parte della sede: cambiata la sede o l'Area, nessun pin dei suoi punti vendita resta fuori dall'Area nuova. */
export function violazioneAreaDeiPin(p: { areaDopo: string | null; pin: ReadonlyArray<{ puntoVendita: string; area: string | null }> }): ViolazionePuntoVendita | null {
  const fuori = p.pin.find((x) => x.area !== p.areaDopo);
  if (!fuori) return null;
  return { codice: 'sede-con-pin-in-altra-area', stato: 409, messaggio: `Il pin di «${fuori.puntoVendita}» resterebbe fuori dall’Area della sua sede: spostalo o scollegalo prima.` };
}

/** I2 dalla parte della planimetria: spostata in un'altra Area (o in una nuova, `areaDopo` null), nessun suo pin di punto vendita resta fuori dall'Area della sede. */
export function violazionePlanimetriaDeiPin(p: { areaDopo: string | null; pin: ReadonlyArray<{ puntoVendita: string; areaSede: string | null }> }): ViolazionePuntoVendita | null {
  const fuori = p.pin.find((x) => p.areaDopo === null || x.areaSede !== p.areaDopo);
  if (!fuori) return null;
  return { codice: 'planimetria-con-pin-di-vendita', stato: 409, messaggio: `Il pin di «${fuori.puntoVendita}» resterebbe fuori dall’Area della sua sede: spostalo o scollegalo prima.` };
}

/** I1 sull'eliminazione di un luogo: i suoi punti vendita resterebbero senza sede. */
export function violazioneLuogoConPuntiVendita(p: { luogo: string; puntiVendita: number }): ViolazionePuntoVendita | null {
  if (p.puntiVendita === 0) return null;
  return { codice: 'luogo-con-punti-vendita', stato: 409, messaggio: `«${p.luogo}» ha ancora ${p.puntiVendita === 1 ? 'un punto vendita' : `${p.puntiVendita} punti vendita`}, compresi quelli nascosti: spostali in un altro luogo o eliminali prima. L’ultimo si elimina dopo aver scritto «${SEGNO_ATTESA}» e il motivo nelle note del luogo.` };
}

/** Lo stato di un luogo rispetto a I4. */
export interface StatoLuogoDiVendita { tipo: string; puntiVendita: number; note: string | null }

/** Il segno che rende riconoscibile l'attesa: una riga delle note del luogo che comincia così, seguita dal motivo. */
export const SEGNO_ATTESA = 'In attesa:';

/** La nota dichiara l'attesa: una riga con il segno e almeno un carattere di motivo. Una nota qualsiasi non basta. */
export function haMotivoDiAttesa(note: string | null): boolean {
  return (note ?? '').split('\n').some((riga) => {
    const r = riga.trim();
    return r.toLowerCase().startsWith(SEGNO_ATTESA.toLowerCase()) && r.slice(SEGNO_ATTESA.length).trim() !== '';
  });
}

/** I4. Un luogo che vende ha almeno un punto vendita, salvo l'attesa con il motivo scritto nelle note dopo il segno. */
export function luogoDiVenditaConforme(s: StatoLuogoDiVendita): boolean {
  return !TIPI_LUOGO_DI_VENDITA.includes(s.tipo) || s.puntiVendita > 0 || haMotivoDiAttesa(s.note);
}

/** I4 sulle modifiche: si rifiuta solo il passaggio da conforme a non conforme, così un luogo appena creato o di prima resta modificabile. */
export function violazionePuntoVenditaDelLuogo(p: { luogo: string; prima: StatoLuogoDiVendita; dopo: StatoLuogoDiVendita }): ViolazionePuntoVendita | null {
  if (!luogoDiVenditaConforme(p.prima) || luogoDiVenditaConforme(p.dopo)) return null;
  return { codice: 'luogo-senza-punto-vendita', stato: 409, messaggio: `«${p.luogo}» resterebbe senza punti vendita: aggiungine uno o scrivi nelle note del luogo «${SEGNO_ATTESA}» seguito dal motivo.` };
}
