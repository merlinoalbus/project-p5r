// ============================================================
// BackupIstanza — esportazione e ripristino dell'istanza dalle Impostazioni (Fase 15.29)
// ============================================================
//
// «Scarica» produce un file che resta sul dispositivo: il solo database oppure l'istanza completa (database, immagini
// caricate, caratteri). «Ripristina da file» SOSTITUISCE l'istanza corrente: chiede conferma, e il server salva comunque
// una copia di sicurezza di ciò che c'era prima.
// ============================================================

import { useRef, useState, type ChangeEvent } from 'react';
import { getStatoIstanza, ripristinaIstanza, scaricaDatabase, scaricaIstanza } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Dimensione leggibile (l'istanza sta nell'ordine dei MB). */
function byteTesto(byte: number): string {
  if (byte <= 0) return '—';
  if (byte < 1024) return `${byte} byte`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toLocaleString('it-IT', { maximumFractionDigits: 0 })} kB`;
  return `${(byte / (1024 * 1024)).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`;
}

function salvaFile(nome: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupIstanza() {
  const stato = useCarica(() => getStatoIstanza(), []);
  const [occupato, setOccupato] = useState(false);
  const [daRipristinare, setDaRipristinare] = useState<File | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const s = stato.dati;

  const esporta = async (tutta: boolean) => {
    setOccupato(true);
    try {
      const { nome, blob } = tutta ? await scaricaIstanza() : await scaricaDatabase();
      salvaFile(nome, blob);
      notifica('success', `${tutta ? 'Istanza completa' : 'Database'} scaricato: ${nome} (${byteTesto(blob.size)}).`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Esportazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const ripristina = async () => {
    if (!daRipristinare) return;
    setOccupato(true);
    try {
      const esito = await ripristinaIstanza(daRipristinare);
      setDaRipristinare(null);
      stato.imposta(esito.stato);
      // il database è cambiato sotto i piedi dell'app: partite e cache locali vanno rilette
      await usePartitaStore.getState().carica();
      notifica('success', `Istanza ripristinata dal ${esito.formato === 'istanza' ? 'backup completo' : 'database'}${esito.immagini ? `, ${esito.immagini} immagini` : ''}${esito.caratteri ? `, ${esito.caratteri} caratteri` : ''}. Copia di sicurezza: ${esito.copiaDiSicurezza}. La pagina si ricarica.`);
      // con il backup completo cambiano anche immagini e caratteri: ogni cache di pagina è da rifare, la ricarica è la via pulita
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Ripristino fallito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <section className="card flex flex-col gap-3" aria-label="Backup e ripristino">
      <h2 className="m-0 text-[15px] font-semibold">Backup e ripristino</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Scarica una copia dei tuoi dati e rimettila quando vuoi, anche su un altro dispositivo. Il <strong>database</strong> contiene partite, tracking e catalogo;
        l'<strong>istanza completa</strong> aggiunge le immagini e i caratteri che hai caricato, che vivono come file e non dentro il database.
      </p>
      {s && (
        <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2 text-[13px]">
          <li><strong>Database</strong> <span className="text-text-muted">{s.database.inMemoria ? 'in memoria (nessun file)' : `${s.database.nome} · ${byteTesto(s.database.byte)}`}</span></li>
          <li><strong>Partite</strong> <span className="text-text-muted">{s.partite}</span></li>
          <li><strong>Immagini caricate</strong> <span className="text-text-muted">{s.immagini.file} · {byteTesto(s.immagini.byte)}</span></li>
          <li><strong>Caratteri</strong> <span className="text-text-muted">{s.caratteri.file} · {byteTesto(s.caratteri.byte)}</span></li>
          <li><strong>Schema</strong> <span className="text-text-muted">versione {s.versioneSchema} · app {s.versioneApp}</span></li>
          <li><strong>Copie di sicurezza</strong> <span className="text-text-muted">{s.copieDiSicurezza} in data/backups</span></li>
        </ul>
      )}
      {stato.errore && <p className="m-0 text-[13px] text-error">{stato.errore}</p>}
      <div className="flex flex-wrap gap-1.5 items-center">
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Scarica l'istanza completa" dettaglio="ZIP con database, immagini e caratteri" disabled={occupato} onClick={() => void esporta(true)} />
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Scarica solo il database" dettaglio="file .db" disabled={occupato} onClick={() => void esporta(false)} />
        <input ref={input} type="file" accept=".db,.zip,application/zip,application/octet-stream" className="sr-only" aria-label="File di backup da ripristinare"
          onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setDaRipristinare(f); e.target.value = ''; }} />
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Ripristina da file" dettaglio="sostituisce l'istanza" disabled={occupato} onClick={() => input.current?.click()} />
      </div>
      <Modal
        titolo="Ripristinare l'istanza?"
        aperta={daRipristinare !== null}
        onChiudi={() => setDaRipristinare(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDaRipristinare(null)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void ripristina()}>Sostituisci l'istanza</button>
          </>
        }
      >
        <p className="m-0 text-[14px]">
          Il file «{daRipristinare?.name}» ({byteTesto(daRipristinare?.size ?? 0)}) sostituirà partite, tracking e dati di questa istanza.
          Prima della sostituzione il server salva una copia di sicurezza di ciò che c'è ora in <code>data/backups</code>; se il ripristino non riesce, l'istanza torna com'era.
        </p>
      </Modal>
    </section>
  );
}
