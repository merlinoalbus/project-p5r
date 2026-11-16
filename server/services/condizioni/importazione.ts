// Compatibilità dei file di mappe esportati: solo durante l'importazione esplicita di un pacchetto di mappe.
// Condizioni già correnti e dati della partita non vengono riscritti.
import { normalizzaRequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { httpErrors } from '../../utils/httpError.js';

/** Converte i soli nodi legacy `manuale`, usando il normalizzatore del vocabolario. Gli altri campi restano identici.
 * La lista contiene riferimenti alle righe, mai il contenuto delle note. Un nodo non convertibile ferma l'importazione,
 * invece di scartare una condizione che l'utente voleva preservare. */
export function convertiManualiImportati(valore: unknown, origine: string, conversioni: string[], profondita = 0): unknown {
  if (profondita > 100) throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `Condizioni troppo annidate in ${origine}: nessuna condizione è stata scartata.`);
  if (Array.isArray(valore)) return valore.map((c, i) => convertiManualiImportati(c, `${origine}[${i}]`, conversioni, profondita + 1));
  if (!valore || typeof valore !== 'object') return valore;
  const c = valore as Record<string, unknown>;
  if (c.tipo === 'manuale') {
    const nuova = normalizzaRequisitoSpillo(c);
    if (!nuova) throw httpErrors.badRequest('condizioni-legacy-non-convertibili', `L'avviso di ${origine} non ha un testo valido: nessuna condizione è stata scartata.`);
    conversioni.push(`${origine}: manuale → avviso`);
    return nuova;
  }
  if (c.tipo === 'gruppo') return { ...c, condizioni: convertiManualiImportati(c.condizioni, `${origine}.condizioni`, conversioni, profondita + 1) };
  if (c.tipo === 'non') return { ...c, condizione: convertiManualiImportati(c.condizione, `${origine}.condizione`, conversioni, profondita + 1) };
  return valore;
}
