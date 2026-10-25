// ============================================================
// ArchivioDelPalazzo — le planimetrie del «Palazzo» confluito in un dedalo (Iweleth), in sola lettura (L8, B7, R8-16)
// ============================================================
//
// Iweleth esiste solo come dedalo dei Memento (decisione D3): le sue aree e le sue voci stanno nel dedalo, le planimetrie del vecchio
// Palazzo restano consultabili da qui, raggruppate per l'area del dedalo a cui appartengono. Nessun secondo percorso operativo: ogni voce è
// un collegamento al visore della planimetria. Le planimetrie senza un'area certa (Corridoi IV e V) stanno in fondo, dichiarate.
// ============================================================

import { Link } from 'react-router-dom';
import type { ArchivioDelPalazzoDto } from '../../types';
import { ModificaGuida } from './ModificaGuida';

interface Props { archivio: ArchivioDelPalazzoDto; onSalvato: () => void | Promise<void> }

/** L'archivio in una sezione chiusa: titolo, conto, e le planimetrie per area del dedalo con il loro link; ogni legame (Palazzo ↔ dedalo, planimetria ↔ area) ha la sua matita. */
export function ArchivioDelPalazzo({ archivio, onSalvato }: Props) {
  const salvato = () => { void onSalvato(); };
  const gruppi = new Map<string, { nome: string; mappe: ArchivioDelPalazzoDto['planimetrie'] }>();
  for (const p of archivio.planimetrie) {
    const k = p.areaDedalo ?? '';
    const g = gruppi.get(k) ?? { nome: p.areaNome ?? 'Senza un’area certa nel dedalo', mappe: [] };
    g.mappe = [...g.mappe, p];
    gruppi.set(k, g);
  }
  const elenco = [...gruppi.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : 0));
  return (
    <details className="rounded-lg border border-border-light p-2.5 testo-13" aria-label="Archivio del Palazzo">
      <summary className="touch cursor-pointer font-semibold">Archivio del Palazzo di {archivio.nome.replace(/^Dedalo di /, '')} · {archivio.planimetrie.length} planimetrie</summary>
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center gap-1 testo-12 text-text-secondary">
          Il Palazzo confluisce nel dedalo di Iweleth.
          <ModificaGuida tipo="dedalo-confluenza" chiave={archivio.dungeon} cosa={`la confluenza del Palazzo di ${archivio.nome.replace(/^Dedalo di /, '')}`} soloIcona onSalvato={salvato} />
        </div>
        <p className="m-0 testo-12 text-text-muted">
          Le aree e le voci sono nel dedalo ({archivio.voci.convertite} voci sono diventate Trama, {archivio.voci.doppie} Persona doppie puntano a quelle del dedalo: nessuna si è persa).
          Qui restano, in sola lettura, le planimetrie del vecchio Palazzo.
        </p>
        {elenco.map(([k, g]) => (
          <section key={k || 'senza-area'} className="flex flex-col gap-1" aria-label={g.nome}>
            <h4 className="m-0 testo-12 font-semibold uppercase tracking-wide text-text-muted">{g.nome}</h4>
            <ul className="m-0 flex list-none flex-col p-0">
              {g.mappe.map((m) => (
                <li key={m.chiave} className="flex items-center gap-1">
                  <Link to={`/guida/mappe/${m.chiave}`} className="touch inline-flex min-h-11 items-center testo-13" title={m.nota || undefined}>{m.nome.replace(/^Dedalo di Iweleth › /, '')}</Link>
                  {m.identita && <ModificaGuida tipo="mappa-dedalo" chiave={m.identita} cosa={`la planimetria «${m.nome.replace(/^Dedalo di Iweleth › /, '')}»`} soloIcona onSalvato={salvato} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
