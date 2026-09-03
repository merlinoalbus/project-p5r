// ============================================================
// ImportaRiferimenti — importa nella propria istanza le immagini di riferimento (link del catalogo)
// ============================================================
//
// Il catalogo (data/riferimenti/immagini.json) contiene solo link alle immagini ufficiali ospitate dal
// Megami Tensei Wiki. L'importazione avviene a lotti (max 20 per richiesta) con barra di avanzamento;
// le immagini già presenti (caricate dall'utente o importate prima) vengono saltate, salvo "sovrascrivi".
// ============================================================

import { useState } from 'react';
import { getCatalogoRiferimenti, importaCatalogoRiferimenti, type AmbitoImmagine } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import type { EsitoImportazioneCatalogoDto, VoceCatalogoDto } from '../../types';
import { lotti } from '../../utils/lotti';

const AMBITI: Array<{ ambito: AmbitoImmagine; titolo: string }> = [
  { ambito: 'arcana', titolo: 'Carte degli Arcani' },
  { ambito: 'confidente', titolo: 'Confidenti' },
  { ambito: 'persona', titolo: 'Persona del compendio' },
];

interface Avanzamento {
  ambito: AmbitoImmagine;
  fatte: number;
  totale: number;
  esito: EsitoImportazioneCatalogoDto;
}

function sommaEsiti(a: EsitoImportazioneCatalogoDto, b: EsitoImportazioneCatalogoDto): EsitoImportazioneCatalogoDto {
  return { importate: [...a.importate, ...b.importate], saltate: [...a.saltate, ...b.saltate], fallite: [...a.fallite, ...b.fallite] };
}

/** Sezione Impostazioni: per ogni ambito conteggio riferimenti/presenti e pulsante di importazione a lotti. */
export function ImportaRiferimenti() {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getCatalogoRiferimenti(), []);
  const [sovrascrivi, setSovrascrivi] = useState(false);
  const [avanzamento, setAvanzamento] = useState<Avanzamento | null>(null);
  const [ultimoEsito, setUltimoEsito] = useState<Avanzamento | null>(null);

  const importa = async (ambito: AmbitoImmagine) => {
    if (!dati) return;
    const voci = dati.filter((v) => v.ambito === ambito && (sovrascrivi || !v.presente));
    if (voci.length === 0) {
      notifica('info', 'Nessuna immagine da importare: sono già tutte presenti.');
      return;
    }
    let esito: EsitoImportazioneCatalogoDto = { importate: [], saltate: [], fallite: [] };
    setAvanzamento({ ambito, fatte: 0, totale: voci.length, esito });
    setUltimoEsito(null);
    try {
      for (const lotto of lotti(voci.map((v) => v.chiave), 10)) {
        const parziale = await importaCatalogoRiferimenti(ambito, lotto, sovrascrivi);
        esito = sommaEsiti(esito, parziale);
        setAvanzamento({ ambito, fatte: esito.importate.length + esito.saltate.length + esito.fallite.length, totale: voci.length, esito });
      }
      const presenti = new Set(esito.importate);
      imposta(dati.map((v) => (v.ambito === ambito && presenti.has(v.chiave) ? { ...v, presente: true } : v)));
      setUltimoEsito({ ambito, fatte: voci.length, totale: voci.length, esito });
      if (esito.fallite.length === 0) notifica('success', `${esito.importate.length} immagini importate.`);
      else notifica('warning', `${esito.importate.length} importate, ${esito.fallite.length} non riuscite.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Importazione interrotta.');
      setUltimoEsito({ ambito, fatte: 0, totale: voci.length, esito });
    } finally {
      setAvanzamento(null);
      // Aggiorna i flag "presente" dal server (anche dopo un'interruzione).
      void ricarica();
    }
  };

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Immagini di riferimento dal wiki (uso personale)</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        L'app include solo i <strong>link</strong> alle immagini ufficiali ospitate dal Megami Tensei Wiki (© ATLUS/SEGA). Con un tocco le scarichi
        nella tua istanza, dove hanno la stessa precedenza delle immagini caricate a mano. Le immagini già presenti non vengono toccate, salvo "sovrascrivi".
      </p>
      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {dati && dati.length === 0 ? (
          <p className="m-0 text-[13px] text-text-muted">Nessun catalogo di riferimenti incluso in questa versione.</p>
        ) : (
          <>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary touch cursor-pointer self-start">
              <input type="checkbox" className="w-5 h-5" checked={sovrascrivi} onChange={(e) => setSovrascrivi(e.target.checked)} disabled={avanzamento !== null} />
              Sovrascrivi anche le immagini già presenti
            </label>
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
              {AMBITI.map(({ ambito, titolo }) => {
                const voci = (dati ?? []).filter((v) => v.ambito === ambito);
                if (voci.length === 0) return null;
                const presenti = voci.filter((v) => v.presente).length;
                const inCorso = avanzamento?.ambito === ambito;
                return (
                  <li key={ambito} className="py-3 flex flex-col gap-2">
                    <RigaAmbito titolo={titolo} voci={voci} presenti={presenti} inCorso={inCorso} disabilitato={avanzamento !== null} onImporta={() => void importa(ambito)} />
                    {inCorso && avanzamento && (
                      <div className="flex flex-col gap-1">
                        <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={avanzamento.totale} aria-valuenow={avanzamento.fatte} aria-label={`Importazione ${titolo}`}>
                          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round((avanzamento.fatte / Math.max(1, avanzamento.totale)) * 100)}%` }} />
                        </div>
                        <span className="text-[12px] text-text-muted">{avanzamento.fatte} di {avanzamento.totale}…</span>
                      </div>
                    )}
                    {ultimoEsito?.ambito === ambito && ultimoEsito.esito.fallite.length > 0 && (
                      <details className="text-[12px] text-text-secondary">
                        <summary className="cursor-pointer">{ultimoEsito.esito.fallite.length} non riuscite (tocca per i dettagli)</summary>
                        <ul className="m-0 mt-1 pl-4">
                          {ultimoEsito.esito.fallite.map((f) => (
                            <li key={f.chiave}><strong className="text-text">{f.chiave}</strong>: {f.motivo}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </PageState>
    </section>
  );
}

function RigaAmbito({ titolo, voci, presenti, inCorso, disabilitato, onImporta }: { titolo: string; voci: VoceCatalogoDto[]; presenti: number; inCorso: boolean; disabilitato: boolean; onImporta: () => void }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[160px]">
        <div className="font-semibold text-[14px]">{titolo}</div>
        <div className="text-[12px] text-text-muted">{voci.length} riferimenti · {presenti} già presenti</div>
      </div>
      <button type="button" className="btn btn-primary" disabled={disabilitato} onClick={onImporta}>
        {inCorso ? 'Importazione…' : presenti >= voci.length ? 'Reimporta' : `Importa ${voci.length - presenti}`}
      </button>
    </div>
  );
}
