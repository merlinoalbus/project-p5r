// ============================================================
// Cestino — le aree del mondo, le infiltrazioni, le voci della guida, le planimetrie e le aree dei dedali eliminate, da rimettere o
// togliere per sempre
// ============================================================
//
// Richiesta dell'utente (2026-10-16), dopo che tre aree del Palazzo di Madarame eliminate per errore si sono dovute ricostruire a
// mano: «Cestino con ripristino», in Impostazioni, che si svuota solo a mano. Ogni elemento dice che cos'era, dove stava, quando è
// stato eliminato, che cosa si è portato via (righe per tipo, dati di gioco e partite) e quanto pesa: una planimetria ci porta
// anche le sue immagini, e il file di gioco cresce finché non si svuota.
//
// «Rimetti» lo riporta com'era. Quel che è cambiato dopo l'eliminazione resta com'è: se qualcosa non è tornato, l'esito si apre in
// una finestra e dice che cosa e perché; altrimenti basta l'avviso. «Elimina per sempre» e «Svuota il cestino» chiedono conferma.
// ============================================================

import { useState } from 'react';
import {
  eliminaDalCestinoPersonale, eliminaDalCestinoUnificato, getCestinoPersonale, getCestinoUnificato, ripristinaDalCestinoPersonale, ripristinaDalCestinoUnificato,
  svuotaCestinoPersonale, svuotaCestinoUnificato,
} from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { byteTesto } from '../../utils/byte';
import { contenutoLeggibile, descrizioneElementoCestino, motivoSaltata, NOME_TIPO_CESTINO } from '../../utils/cestino';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { EsitoRipristinoCestinoDto, VoceCestinoUnificatoDto } from '../../types';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { TitoloSezione } from '../shared/TitoloSezione';

// Costante di build, nello stesso modulo perché il bundler tolga il ramo dei contenuti (vedi utils/modalita.ts). Nel rilascio il cestino è
// SOLO quello personale (`/api/partite/cestino`): le rotte di `/impostazioni` non esistono e non devono restare nel bundle.
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
const leggiCestino = IN_RILASCIO ? getCestinoPersonale : getCestinoUnificato;
const ripristinaVoce = IN_RILASCIO ? ripristinaDalCestinoPersonale : ripristinaDalCestinoUnificato;
const eliminaVoce = IN_RILASCIO ? eliminaDalCestinoPersonale : eliminaDalCestinoUnificato;
const svuotaVoci = IN_RILASCIO ? svuotaCestinoPersonale : svuotaCestinoUnificato;

/** Data e ora di un'eliminazione, all'italiana. */
const quando = (iso: string): string => new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

/** Un elemento del cestino: che cos'era, dove, quando, che cosa si è portato via; «Rimetti» ed «Elimina per sempre». */
function ElementoCestino({ v, occupato, onRimetti, onElimina }: { v: VoceCestinoUnificatoDto; occupato: boolean; onRimetti: () => void; onElimina: () => void }) {
  // «Area di Shibuya: Sottopasso», poi «con 2 planimetrie, 14 pin e 3 immagini»: le parole di chi gioca, senza le tabelle interne (UX2-12)
  const { titolo, con } = descrizioneElementoCestino(v);
  const contenuto = contenutoLeggibile(v);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-light px-3 py-2 md:flex-row md:items-start md:justify-between" aria-label={`${NOME_TIPO_CESTINO[v.tipo]} «${v.nome}»`}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="break-words testo-14 font-semibold">{titolo}</span>
        {con && <span className="break-words testo-13 text-text-secondary">{con}</span>}
        {/* una nota del server che non è un posto (un'area fusa in un'altra) resta com'è */}
        {v.contesto && /[«»]/.test(v.contesto) && <span className="break-words testo-12 text-text-secondary">{v.contesto}</span>}
        <span className="testo-12 text-text-muted">Nel cestino dal {quando(v.eliminatoIl)} · {byteTesto(v.byte)}</span>
        {contenuto.length > 0 && <ul className="sr-only" aria-label="Che cosa si è portato via">
          {contenuto.map((c) => <li key={c.etichetta}>{c.quante.toLocaleString('it-IT')} {c.etichetta}</li>)}
        </ul>}
        {v.partite === 'mancante' && (
          <span className="testo-12 text-warning">Il file delle partite è stato sostituito dopo: si rimettono solo i dati di gioco, non le spunte.</span>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="annulla-ultimo" dimensione={20} />} titolo="Rimetti" dettaglio="com’era" disabled={occupato} onClick={onRimetti} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina per sempre" disabled={occupato} onClick={onElimina} />
      </div>
    </li>
  );
}

/** Che cosa non è tornato com'era dopo un ripristino, per tabella e motivo. */
function EsitoRipristino({ esito }: { esito: EsitoRipristinoCestinoDto }) {
  return (
    <div className="flex flex-col gap-2 testo-13">
      <p className="m-0">«{esito.nome}»: di nuovo al suo posto, con {esito.rimesse.toLocaleString('it-IT')} righe rimesse com’erano.</p>
      {esito.partiteMancanti && <p className="m-0 text-warning">Il file delle partite è stato sostituito dopo l’eliminazione: le spunte e gli stati delle partite non sono tornati.</p>}
      {([
        { titolo: 'Quel che hai cambiato dopo l’eliminazione non è stato sovrascritto:', righe: esito.saltate.filter((s) => s.motivo !== 'colonna-rimossa' && s.motivo !== 'tabella-rimossa') },
        { titolo: 'Quel che l’app non conserva più non è tornato:', righe: esito.saltate.filter((s) => s.motivo === 'colonna-rimossa' || s.motivo === 'tabella-rimossa') },
      ]).filter((g) => g.righe.length > 0).map((g) => (
        <div key={g.titolo} className="flex flex-col gap-2">
          <p className="m-0">{g.titolo}</p>
          <ul className="m-0 flex flex-col gap-1 pl-4">
            {g.righe.map((s) => (
              <li key={`${s.tabella}|${s.motivo}`}>
                <span className="font-semibold">{s.quante.toLocaleString('it-IT')} {s.etichetta}</span> {motivoSaltata(s.motivo, s.quante)}
                {s.colonne && s.colonne.length > 0 && <span className="block testo-12 text-text-muted">dato non conservato: {s.colonne.map((c) => <code key={c}>{c} </code>)}</span>}
                {s.sostituitaDa && <span className="block testo-12 text-text-muted">ora: {s.sostituitaDa}</span>}
                {s.esempi.length > 0 && <span className="block break-words testo-12 text-text-muted">{s.esempi.join(', ')}{s.quante > s.esempi.length ? ', …' : ''}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** La sezione «Cestino» delle Impostazioni. */
export function Cestino() {
  const elenco = useCarica(() => leggiCestino(), []);
  const [occupato, setOccupato] = useState(false);
  const [daEliminare, setDaEliminare] = useState<VoceCestinoUnificatoDto | null>(null);
  const [svuotare, setSvuotare] = useState(false);
  const [esito, setEsito] = useState<EsitoRipristinoCestinoDto | null>(null);
  const voci = elenco.dati ?? [];
  const peso = voci.reduce((somma, v) => somma + v.byte, 0);

  /** Esegue un'operazione con i comandi bloccati, poi rilegge il cestino (anche dopo un errore: un altro dispositivo può averlo cambiato). */
  const esegui = async (azione: () => Promise<void>) => {
    setOccupato(true);
    try { await azione(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); } finally {
      await elenco.ricarica();
      setOccupato(false);
    }
  };
  const rimetti = (v: VoceCestinoUnificatoDto) => esegui(async () => {
    const e = await ripristinaVoce(v);
    if (e.saltate.length > 0 || e.partiteMancanti) setEsito(e);
    else notifica('success', `Di nuovo al suo posto: «${v.nome}».`);
    useSuggerimentiStore.getState().invalida();
    await usePartitaStore.getState().carica();
  });
  const elimina = (v: VoceCestinoUnificatoDto) => esegui(async () => {
    setDaEliminare(null);
    await eliminaVoce(v);
    notifica('success', `Eliminazione definitiva dal cestino: «${v.nome}».`);
  });
  const svuota = () => esegui(async () => {
    setSvuotare(false);
    const { eliminati } = await svuotaVoci();
    notifica('success', eliminati === 1 ? 'Cestino svuotato: tolto per sempre 1 elemento.' : `Cestino svuotato: tolti per sempre ${eliminati} elementi.`);
  });

  return (
    <section className="card flex flex-col gap-3" aria-labelledby="titolo-cestino">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <TitoloSezione id="titolo-cestino">Cestino</TitoloSezione>
          <p className="m-0 testo-13 text-text-secondary">
            {IN_RILASCIO
              ? 'Le partite e le singole fonti d’acquisto eliminate, con tutto quel che si sono portate via. «Rimetti» le riporta com’erano; quel che hai cambiato dopo resta com’è. Il cestino si svuota solo a mano.'
              /* le aree del mondo ci finiscono da L2 (UX2-12) */
              : 'Le aree dei quartieri e della città, le planimetrie, le infiltrazioni dei Palazzi, le voci della guida e le aree dei dedali eliminate, le partite e le singole fonti d’acquisto, con tutto quel che si sono portate via (pin e segni delle partite compresi). «Rimetti» le riporta com’erano; quel che hai cambiato dopo resta com’è. Il cestino si svuota solo a mano: aree e planimetrie ci portano anche le loro immagini.'}
          </p>
          {voci.length > 0 && <span className="testo-12 text-text-muted">{voci.length === 1 ? '1 elemento' : `${voci.length} elementi`} · {byteTesto(peso)}</span>}
        </div>
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Svuota il cestino" disabled={occupato || voci.length === 0} onClick={() => setSvuotare(true)} />
      </div>
      {elenco.errore && <p className="m-0 testo-13 text-error-testo" role="alert">{elenco.errore}</p>}
      {elenco.caricamento && !elenco.dati && <p className="m-0 testo-13 text-text-muted">Caricamento del cestino…</p>}
      {elenco.dati && voci.length === 0 && <p className="m-0 testo-13 text-text-muted">Il cestino è vuoto.</p>}
      {voci.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Elementi del cestino">
          {voci.map((v) => <ElementoCestino key={v.id === null ? `utente:${v.riferimento.uid}` : `gioco:${v.id}`} v={v} occupato={occupato} onRimetti={() => void rimetti(v)} onElimina={() => setDaEliminare(v)} />)}
        </ul>
      )}

      <Modal titolo="Togliere per sempre dal cestino?" aperta={daEliminare !== null} onChiudi={() => setDaEliminare(null)}
        azioni={<>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setDaEliminare(null)} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina per sempre" disabled={occupato} onClick={() => { if (daEliminare) void elimina(daEliminare); }} />
        </>}>
        {daEliminare && <p className="m-0 testo-13">{NOME_TIPO_CESTINO[daEliminare.tipo]} «{daEliminare.nome}»: non si potrà più rimettere. I dati di gioco e le partite di adesso non cambiano.</p>}
      </Modal>
      <Modal titolo="Svuotare il cestino?" aperta={svuotare} onChiudi={() => setSvuotare(false)}
        azioni={<>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setSvuotare(false)} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Svuota il cestino" disabled={occupato} onClick={() => void svuota()} />
        </>}>
        <p className="m-0 testo-13">
          {voci.length === 1 ? 'L’elemento nel cestino' : `Tutti i ${voci.length} elementi nel cestino`} ({byteTesto(peso)}) se ne vanno per sempre: non si potranno più
          rimettere. I dati di gioco e le partite di adesso non cambiano.
        </p>
      </Modal>
      <Modal titolo="Esito del ripristino" aperta={esito !== null} onChiudi={() => setEsito(null)}
        azioni={<PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={() => setEsito(null)} />}>
        {esito && <EsitoRipristino esito={esito} />}
      </Modal>
    </section>
  );
}
