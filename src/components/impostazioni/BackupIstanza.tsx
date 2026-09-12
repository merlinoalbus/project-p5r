// ============================================================
// BackupIstanza — esportazione e ripristino dell'istanza dalle Impostazioni (Fase 15.29)
// ============================================================
//
// «Scarica» produce un file che resta sul dispositivo: l'istanza completa (dati di gioco con le immagini, partite, caratteri).
// Lo stesso file viene lasciato anche nella CARTELLA D'APPOGGIO (il NAS montato sul server), così è insieme salvato e già pronto
// per essere rimesso: «Cerca i file disponibili» elenca ciò che c'è lì e il ripristino lo legge il server, senza far passare
// centinaia di MB dal browser. «Ripristina» SOSTITUISCE l'istanza corrente: chiede conferma, e il server salva comunque una
// copia di sicurezza di ciò che c'era prima. Il solo file dei dati di gioco si scarica e si importa dalla card «Pacchetto di gioco».
// ============================================================

import { useState } from 'react';
import { getDepositoBackup, getStatoIstanza, ripristinaIstanzaDaDeposito, scaricaIstanza } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { usePartitaStore } from '../../stores/partitaStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

import { byteTesto } from '../../utils/byte';
import { BarraInvio } from './BarraInvio';
import type { DepositoFileDto } from '../../types';
import { Selettore } from '../shared/Selettore';

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
  const [deposito, setDeposito] = useState<DepositoFileDto | null>(null);
  const [fileScelto, setFileScelto] = useState('');
  // il file da ripristinare: dal dispositivo oppure dalla cartella d'appoggio
  const [dalDeposito, setDalDeposito] = useState<string | null>(null);
  const [lavoroSulServer, setLavoroSulServer] = useState(false);
  const s = stato.dati;

  const esporta = async () => {
    setOccupato(true);
    try {
      const { nome, blob, depositato } = await scaricaIstanza();
      salvaFile(nome, blob);
      notifica('success', `Istanza completa scaricata: ${nome} (${byteTesto(blob.size)})${depositato ? `, e depositata come «${depositato}» nella cartella d'appoggio` : ''}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Esportazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  /** Guarda che cosa c'è nella cartella d'appoggio del server. */
  const cercaNelDeposito = async () => {
    setOccupato(true);
    try {
      const d = await getDepositoBackup();
      setDeposito(d);
      setFileScelto(d.file[0]?.nome ?? '');
      if (d.disponibile && d.file.length === 0) notifica('info', `Nessun backup in ${d.cartella}: scarica l'istanza completa e ci finirà una copia.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Lettura della cartella d’appoggio fallita.');
    } finally {
      setOccupato(false);
    }
  };

  /** Conclude un ripristino riuscito, da qualunque parte sia arrivato il file. */
  const concludi = async (esito: Awaited<ReturnType<typeof ripristinaIstanzaDaDeposito>>) => {
    setDalDeposito(null);
    setDeposito(null);
    setFileScelto('');
    stato.imposta(esito.stato);
    // il database è cambiato sotto i piedi dell'app: partite e cache locali vanno rilette
    await usePartitaStore.getState().carica();
    notifica('success', `Istanza ripristinata dal ${esito.formato === 'istanza' ? 'backup completo' : 'database'}${esito.immagini ? `, ${esito.immagini} immagini` : ''}${esito.caratteri ? `, ${esito.caratteri} caratteri` : ''}. Copia di sicurezza: ${esito.copiaDiSicurezza}. La pagina si ricarica.`);
    // con il backup completo cambiano anche immagini e caratteri: ogni cache di pagina è da rifare, la ricarica è la via pulita
    setTimeout(() => window.location.reload(), 1500);
  };

  /** Ripristina dal file scelto nella cartella d'appoggio: lo legge il server. */
  const ripristinaDalDeposito = async () => {
    if (!dalDeposito) return;
    setOccupato(true);
    setLavoroSulServer(true);
    try {
      await concludi(await ripristinaIstanzaDaDeposito(dalDeposito));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Ripristino fallito.');
    } finally {
      setOccupato(false);
      setLavoroSulServer(false);
    }
  };

  return (
    <section className="card flex flex-col gap-3" aria-label="Backup e ripristino">
      <h2 className="m-0 text-[15px] font-semibold">Backup e ripristino</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Scarica una copia di tutto e rimettila quando vuoi, anche su un altro dispositivo. L'<strong>istanza completa</strong> contiene i dati di gioco con le
        immagini, le partite con il loro tracking e i caratteri che hai caricato. Ogni scaricamento lascia una copia anche nella <strong>cartella d'appoggio</strong>
        del server: è da lì che si ripristina, perché un file da centinaia di MB non passa dal browser. Per i soli dati di gioco c'è la card «Pacchetto di gioco».
      </p>
      {s && (
        <ul className="m-0 p-0 list-none grid gap-1 sm:grid-cols-2 text-[13px]">
          <li><strong>Dati di gioco</strong> <span className="text-text-muted">{s.database.inMemoria ? 'in memoria (nessun file)' : `${s.database.nome} · ${byteTesto(s.database.byte)} · schema ${s.versioneSchema}`}</span></li>
          <li><strong>File delle partite</strong> <span className="text-text-muted">{s.database.inMemoria ? 'in memoria (nessun file)' : `${s.databasePartite.nome} · ${byteTesto(s.databasePartite.byte)} · schema ${s.versioneSchemaPartite}`}</span></li>
          <li><strong>Partite</strong> <span className="text-text-muted">{s.partite}</span></li>
          <li><strong>Immagini nel database</strong> <span className="text-text-muted">{s.immagini.file} · {byteTesto(s.immagini.byte)}</span></li>
          <li><strong>Caratteri</strong> <span className="text-text-muted">{s.caratteri.file} · {byteTesto(s.caratteri.byte)}</span></li>
          <li><strong>Schema</strong> <span className="text-text-muted">versione {s.versioneSchema} · app {s.versioneApp}</span></li>
          <li><strong>Copie di sicurezza</strong> <span className="text-text-muted">{s.copieDiSicurezza} in data/backups</span></li>
        </ul>
      )}
      {stato.errore && <p className="m-0 text-[13px] text-error">{stato.errore}</p>}
      <div className="flex flex-wrap gap-1.5 items-center">
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Scarica l'istanza completa" dettaglio="ZIP con dati di gioco, partite e caratteri" disabled={occupato} onClick={() => void esporta()} />
      </div>
      <section className="flex flex-col gap-1.5" aria-label="Cartella d'appoggio">
        <h3 className="m-0 text-[14px]">Dalla cartella d'appoggio</h3>
        <p className="m-0 text-[12px] text-text-muted">Gli ZIP dell'istanza depositati sul server (ci finiscono gli scaricamenti): il file non passa dal browser, quindi la dimensione non è un problema. I soli dati di gioco si importano dalla card «Pacchetto di gioco».</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Cerca i file disponibili" dettaglio="guarda nella cartella d'appoggio" disabled={occupato} onClick={() => void cercaNelDeposito()} />
        </div>
        {deposito && !deposito.disponibile && <p className="m-0 text-[13px] text-warning" role="status">{deposito.motivo}</p>}
        {deposito?.disponibile && deposito.file.length === 0 && <p className="m-0 text-[13px] text-text-muted" role="status">Nessun backup in <code>{deposito.cartella}</code>.</p>}
        {deposito?.disponibile && deposito.file.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-end">
            <Selettore
              className="w-full sm:flex-1 sm:min-w-[220px]"
              etichetta={`File in ${deposito.cartella} (${deposito.file.length})`}
              valore={fileScelto}
              opzioni={deposito.file.map((f) => ({ chiave: f.nome, nome: f.nome, dettaglio: `${byteTesto(f.byte)} · ${new Date(f.modificatoIl).toLocaleString('it-IT')}` }))}
              onCambia={setFileScelto}
              disabilitato={occupato}
            />
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Ripristina il file scelto" dettaglio="sostituisce l'istanza" disabled={occupato || !fileScelto} onClick={() => setDalDeposito(fileScelto)} />
          </div>
        )}
        {lavoroSulServer && <BarraInvio avanzamento={{ byteInviati: 0, byteTotali: 0, percentuale: 100, inviato: true }} etichetta="Lavoro sul server" elaborazione="Il server sta ripristinando l’istanza dalla cartella d’appoggio" />}
      </section>
      <Modal
        titolo="Ripristinare l'istanza dalla cartella d'appoggio?"
        aperta={dalDeposito !== null}
        onChiudi={() => setDalDeposito(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDalDeposito(null)}>Annulla</button>
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void ripristinaDalDeposito()}>Sostituisci l'istanza</button>
          </>
        }
      >
        <p className="m-0 text-[14px]">
          Il file «{dalDeposito}» della cartella d'appoggio sostituirà partite, tracking e dati di questa istanza.
          Lo legge il server, quindi non viene caricato da qui. Prima della sostituzione viene salvata una copia di sicurezza in <code>data/backups</code>.
        </p>
      </Modal>
    </section>
  );
}
