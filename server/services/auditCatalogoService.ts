import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { AuditCatalogo } from '../../shared/auditCatalogo.js';
import { z } from 'zod';

const riferimento = z.object({ id: z.string(), tipo: z.string(), chiave: z.string(), catalogo: z.string().nullable() });
const formatoAudit = z.object({
  schemaVersion: z.literal(1), ricostruzione: z.literal(true), creatoIl: z.string(),
  campiPerTipo: z.record(z.string(), z.array(z.string())), canonicalizzazione: z.literal('json-chiavi-ordinate-v1'), originePacchetto: z.unknown(),
  fonti: z.array(z.object({
    id: z.string(), tipo: z.string(), chiave: z.string(), impronta: z.string(), fontePubblicaHash: z.string().nullable(),
    nuova: z.boolean(), mutata: z.boolean(), input: z.unknown(), granularita: z.literal('fonte'),
    esito: z.enum(['collegata', 'proposta', 'da-verificare', 'esclusa']), motivo: z.string(), decisione: z.boolean(),
    sottoelementiNonRiconciliati: z.boolean(), risultati: z.array(riferimento), proposte: z.array(riferimento), contestoRisultati: z.array(riferimento),
  })),
  manifestAssenti: z.array(z.object({ tipo: z.string(), chiave: z.string(), impronta: z.string() })),
  risultatiConFonti: z.array(riferimento.extend({ fonti: z.array(z.string()), fontiContesto: z.array(z.string()), dati: z.unknown() })),
  limiti: z.array(z.string()),
});

/** Fotografia degli esiti della 121: non certifica le modifiche fatte in seguito nel catalogo. */
export function auditConversioneCatalogo(): AuditCatalogo | null {
  const r = prepared("SELECT json FROM dati_guida WHERE chiave = 'audit-catalogo-121'").get() as { json: string } | undefined;
  if (!r) return null;
  let v: unknown;
  try { v = JSON.parse(r.json); } catch { throw httpErrors.conflict('audit-catalogo-illeggibile', 'Il riepilogo della conversione non è leggibile.'); }
  const esito = formatoAudit.safeParse(v);
  if (!esito.success) throw httpErrors.conflict('audit-catalogo-incompatibile', 'Il riepilogo della conversione ha un formato non supportato.');
  return esito.data;
}
