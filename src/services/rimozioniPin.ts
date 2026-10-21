import { useEffect } from 'react';
import { create } from 'zustand';
import { z } from 'zod';
import { eliminaSpillo, isApiError } from './api';
import { notifica } from '../stores/notificationStore';

const CHIAVE = 'p5r.rimozioni-pin.v1';
const uid = z.string().regex(/^[0-9a-f]{32}$/);
const schemaIntento = z.object({
  id: z.number().int().positive().safe(), uid, nome: z.string().min(1), mappa: z.string().min(1),
  richiesta: z.object({ spilloUid: uid, revisioneRimozioneAttesa: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
  stato: z.enum(['invio', 'incerto', 'riuscita', 'rifiutata']),
}).strict().refine(v => v.uid === v.richiesta.spilloUid);
export type IntentoRimozionePin = z.infer<typeof schemaIntento>;
interface Registro { intenti: readonly IntentoRimozionePin[]; pronto: boolean; errore: string | null }
const store = create<Registro>(() => ({ intenti: [], pronto: false, errore: null }));
let caricato = false, archivioInterpretato = false, ultimoRaw: string | null = null;
const inVolo = new Set<string>();
const copia = (a: readonly IntentoRimozionePin[]) => Object.freeze(a.map(i => Object.freeze({ ...i, richiesta: Object.freeze({ ...i.richiesta }) })));
const erroreTesto = (e: unknown) => e instanceof Error ? e.message : String(e);
function blocca(e: unknown): Error {
  const errore = `Registro delle rimozioni non disponibile: ${erroreTesto(e)}. Nessun nuovo invio è consentito.`;
  store.setState({ errore }); return new Error(errore);
}
function scrivi(intenti: readonly IntentoRimozionePin[]): void {
  try {
    if (sessionStorage.getItem(CHIAVE) !== ultimoRaw) throw new Error('Il registro della scheda è cambiato esternamente.');
    const raw = JSON.stringify({ versione: 1, intenti });
    sessionStorage.setItem(CHIAVE, raw);
    if (sessionStorage.getItem(CHIAVE) !== raw) throw new Error('Salvataggio non confermato.');
    ultimoRaw = raw;
  } catch (e) { throw blocca(e); }
  store.setState({ intenti: copia(intenti), pronto: true, errore: null });
}
function carica(): void {
  if (caricato) return;
  caricato = true;
  try {
    ultimoRaw = sessionStorage.getItem(CHIAVE);
    const letti = ultimoRaw === null ? [] : z.object({ versione: z.literal(1), intenti: z.array(schemaIntento) }).strict().parse(JSON.parse(ultimoRaw)).intenti;
    if (new Set(letti.map(i => i.uid)).size !== letti.length) throw new Error('Identità duplicate nel registro.');
    archivioInterpretato = true;
    const intenti = letti.map(i => i.stato === 'invio' ? { ...i, stato: 'incerto' as const } : i);
    store.setState({ intenti: copia(intenti), pronto: true, errore: null });
    if (letti.some(i => i.stato === 'invio')) scrivi(intenti);
  } catch (e) { blocca(e); store.setState({ pronto: true }); }
}
export function useRegistroRimozioniPin(): Registro {
  const stato = store(); useEffect(carica, []); return stato;
}
export function rimozionePinPendente(uidPin: string | undefined): IntentoRimozionePin | null {
  if (!uidPin) return null;
  return store.getState().intenti.find(i => i.uid === uidPin && (i.stato === 'invio' || i.stato === 'incerto')) ?? null;
}
function salvaEsito(i: IntentoRimozionePin): void {
  const intenti = store.getState().intenti.map(v => v.uid === i.uid ? i : v);
  try { scrivi(intenti); }
  catch {
    // L’esito ricevuto resta noto nella memoria della scheda anche se lo storage non può salvarlo.
    store.setState({ intenti: copia(intenti) });
    notifica('warning', `Esito della rimozione del pin «${i.nome}» acquisito ma non salvato nella scheda. Conserva questa scheda e salva il registro senza ripetere la richiesta.`, 0);
  }
}
/** Un solo invio, preceduto da persistenza verificata; chiusura e reload non cancellano l’incertezza. */
export async function rimuoviPinConRegistro(input: Omit<IntentoRimozionePin, 'stato'>): Promise<void> {
  carica();
  if (store.getState().errore) throw new Error(store.getState().errore!);
  const i = schemaIntento.parse({ ...input, stato: 'invio' });
  if (inVolo.has(i.uid) || rimozionePinPendente(i.uid)) throw new Error('Esiste già una rimozione da verificare per questo UID. Nessun nuovo invio.');
  scrivi([...store.getState().intenti.filter(v => v.uid !== i.uid), i]);
  inVolo.add(i.uid);
  try { await eliminaSpillo(i.id, i.richiesta); salvaEsito({ ...i, stato: 'riuscita' }); }
  catch (e) {
    const certo = isApiError(e) && e.status >= 400 && e.status < 500 && e.status !== 408 && e.code !== 'http-error';
    salvaEsito({ ...i, stato: certo ? 'rifiutata' : 'incerto' }); throw e;
  } finally { inVolo.delete(i.uid); }
}
/** Chiamato solo dopo la rilettura esplicita e la dimostrazione che il vecchio CAS non è più valido. */
export function risolviRimozionePinOsservata(uidPin: string, revisioneOriginale: string): void {
  const i = rimozionePinPendente(uidPin);
  if (!i || inVolo.has(uidPin) || i.richiesta.revisioneRimozioneAttesa !== revisioneOriginale) throw new Error('Il gesto da verificare è cambiato o è ancora in invio.');
  scrivi(store.getState().intenti.filter(v => v.uid !== uidPin));
}
/** Non rilegge o cancella contenuti divergenti: ritenta soltanto la persistenza dello stato già noto. */
export function salvaRegistroRimozioniPin(): void {
  carica();
  if (!archivioInterpretato) throw new Error('Il contenuto conservato non è leggibile: nessuna sovrascrittura del registro.');
  scrivi(store.getState().intenti);
}
