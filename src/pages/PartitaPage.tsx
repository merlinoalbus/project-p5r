// ============================================================
// PartitaPage — tracking della partita attiva: riepilogo, Doti, Confidenti, scorta, compendio, storico
// ============================================================

import { Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconaAzione, IconaScheda } from '../components/shared/IconaAzione';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { dataGiocoTesto } from '../utils/dateGioco';
import { useShallow } from 'zustand/react/shallow';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState, EmptyState, Spinner } from '../components/shared/PageState';
import { ErroreInRiquadro } from '../components/shared/ErrorePagina';
import { NuovaPartitaModal } from '../components/partita/NuovaPartitaModal';
import { FinestraModificaPartita } from '../components/partita/FinestraModificaPartita';
// L5-11: «Oggi» (la scheda d'apertura) sta nel file della pagina; le altre dodici si scaricano alla prima apertura (vedi schedePartita.ts)
import {
  CicliSalvati, CompendioPersonale, ConfidentiPartita, DotiSociali, LettureEGiochi, ObiettiviPartita, PersonaDellaPartita, PianiSalvati,
  ProgressiPartita, SCHEDE_A_RICHIESTA, ScortaPersona, SquadraPartita, StoricoPartita, type ChiaveSchedaARichiesta,
} from '../components/partita/schedePartita';
import { OggiPartita } from '../components/partita/OggiPartita';
import { ScuolaOggi } from '../components/partita/ScuolaOggi';
import { DaApprovareStati } from '../components/partita/DaApprovareStati';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';

type Scheda = 'oggi' | ChiaveSchedaARichiesta;

const SCHEDE: Array<{ k: Scheda; l: string }> = [
  { k: 'oggi', l: 'Oggi' },
  { k: 'doti', l: 'Doti sociali' },
  { k: 'squadra', l: 'Denaro e squadra' },
  { k: 'confidenti', l: 'Confidenti' },
  { k: 'letture', l: 'Letture e giochi' },
  { k: 'progressi', l: 'Progressi' },
  { k: 'scorta', l: 'Scorta' },
  { k: 'compendio', l: 'Compendio personale' },
  { k: 'persona-partita', l: 'Persona della partita' },
  { k: 'obiettivi', l: 'Obiettivi' },
  { k: 'piani', l: 'Piani salvati' },
  { k: 'cicli', l: 'Cicli' },
  { k: 'storico', l: 'Storico' },
];
// «Riepilogo» non è più una scheda (richiesta dell'utente, 2026-10-25): i dati della partita si modificano dalla finestra che apre
// «Modifica» nella riga dei dati; il vecchio indirizzo `?scheda=riepilogo` (link della pagina Domande) apre quella finestra.

/** Le schede che da 1024 px riempiono l'altezza della schermata (`scheda-riempi-lg`): intestazione e fila delle schede restano ferme e scorre
 *  solo l'area dell'elenco della scheda. Sotto i 1024 px scorre la pagina. Letture e giochi (tre colonne) e, con L10-01 (schizzi approvati
 *  dall'utente il 2026-11-01), Denaro e squadra, Confidenti, Compendio personale, Persona della partita e Storico. */
const RIEMPIONO_DA_1024: ReadonlySet<Scheda> = new Set<Scheda>(['letture', 'squadra', 'confidenti', 'compendio', 'persona-partita', 'storico']);

/** Il ripiego mentre una scheda si scarica: lo spazio della scheda con l'indicatore di caricamento del tema, perché sotto la riga delle schede
 *  la pagina non si accorci e non salti (di solito non compare: il file è già scaricato in tempo morto, e cambiando scheda React tiene a
 *  schermo quella di prima finché la nuova non è pronta). */
function CaricamentoScheda() {
  return <div className="flex min-h-[40vh] flex-1 items-center justify-center"><Spinner size={36} /></div>;
}

/** Porta in memoria il file di una scheda prima del clic (passaggio del mouse, fuoco, tocco); un errore qui non conta: lo mostrerà l'apertura. */
function anticipaScheda(k: Scheda): void {
  if (k !== 'oggi') SCHEDE_A_RICHIESTA[k].precarica().catch(() => undefined);
}

/** Pagina della partita attiva con schede; senza partite propone la creazione. */
export function PartitaPage() {
  useDocumentTitle('Partita');
  const { attiva, caricamento, caricata, errore, carica } = usePartitaStore(useShallow((s) => ({ attiva: s.attiva, caricamento: s.caricamento, caricata: s.caricata, errore: s.errore, carica: s.carica })));
  const [nuova, setNuova] = useState(false);
  const [params, setParams] = useSearchParams();
  // le piastrelle delle schede sono basse a ogni larghezza, con icona (22 px) e nome affiancati (`.fila-schede-partita`)
  const richiesta = params.get('scheda');
  const scheda: Scheda = SCHEDE.some((s) => s.k === richiesta) ? (richiesta as Scheda) : 'oggi';
  // finestra dei dati della partita: aperta anche dal vecchio indirizzo della scheda «Riepilogo»
  const [modifica, setModifica] = useState(richiesta === 'riepilogo');
  // il giorno mostrato dalla scheda «Oggi» (null a scheda chiusa): senza, vale la data di gioco della partita
  const [giornoOggi, setGiornoOggi] = useState<string | null>(null);
  const giornoScuola = (scheda === 'oggi' ? giornoOggi : null) ?? attiva?.dataGioco ?? null;

  // finché l'elenco delle partite non è arrivato (anche prima che la lettura parta) non si dice «Nessuna partita attiva» (L1-07)
  return (
    <PageState isLoading={!caricata && (caricamento || !errore)} error={attiva ? null : errore} onRetry={() => void carica()}>
      {!attiva ? (
        <EmptyState
          livello={1}
          title="Nessuna partita attiva"
          hint="Crea la tua prima partita: potrai tracciare Doti sociali, Confidenti, Persona possedute e compendio. Puoi gestire più partite e passare dall'una all'altra dalla barra in alto."
          action={<PulsanteVisivo tono="primario" icona={<IconaScheda chiave="nuova-partita" dimensione={22} />} titolo="Crea partita" onClick={() => setNuova(true)} />}
        />
      ) : (
        <div className={`flex flex-col gap-0 max-sm:-mt-3 md:gap-1.5 ${scheda === 'oggi' || scheda === 'doti' ? 'scheda-riempi md:min-h-0' : RIEMPIONO_DA_1024.has(scheda) ? 'scheda-riempi-lg lg:min-h-0' : ''}`}>
          {/* i dati della partita stanno nella riga del titolo (a destra, o sotto sul telefono): con le schede su una riga sola
              l'intestazione resta entro il 30% dell'altezza (progetto dei Confidenti approvato il 2026-10-24) */}
          <IntestazionePagina titolo={attiva.nome} compatta azioniInRiga azioniAccanto className="intestazione--partita pt-0" azioni={
            <FilaScorrevole className="fila-scorrevole--sempre fila-dati-partita items-center min-w-0" role="group" aria-label="Dati e scorciatoie della partita">
              {/* per primo: sul telefono e sul tablet la fila scorre, e in fondo «Modifica» restava fuori schermo */}
              <PulsanteVisivo id="modifica-dati-partita" tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica"
                aria-label="Modifica i dati della partita" onClick={() => setModifica(true)} />
              {/* L13 (decisione 19): gli effetti delle voci già spuntate mai applicati, da approvare; c'è solo se ce ne sono. Subito dopo «Modifica»
                  (revisione R8): sul telefono la fila scorre, e dopo i dati restava fuori schermo */}
              <DaApprovareStati key={attiva.id} partitaId={attiva.id} />
              <span className="chip">Liv. {attiva.livelloProtagonista}</span>
              {/* la data in forma italiana («9 aprile»), come nel resto dell'app: «04-09» si leggeva «4 settembre» (lotto C) */}
              {attiva.dataGioco && <span className="chip">{dataGiocoTesto(attiva.dataGioco)}</span>}
              {attiva.nuovaPartitaPlus && <span className="chip">NG+</span>}
              {attiva.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
              {/* le scorciatoie della scuola seguono il giorno guardato nella scheda «Oggi» (scelta dell'utente, 2026-10-11); la chiave
                  resta sulla data di gioco: scorrere i giorni filtra gli elenchi già caricati, non li rilegge */}
              <ScuolaOggi key={`${attiva.id}-${attiva.dataGioco ?? ''}`} partita={attiva} giorno={giornoScuola} />
            </FilaScorrevole>
          } />
          {/* una riga sola che scorre anche su tablet e desktop: a capo le piastrelle di `SCHEDE` facevano due righe e l'intestazione superava il 30% */}
          <FilaScorrevole role="group" aria-label="Schede della partita" className="fila-scorrevole--sempre fila-schede-partita">
            {SCHEDE.map((s) => (
              // Prima l'immagine, poi la parola: l'icona (22 px) è il segno che si riconosce da lontano,
              // con il nome accanto (`.fila-schede-partita` in src/tailwind.css). Resta scritto: un'icona
              // sola non dice «Piani salvati» a nessuno la prima volta.
              <button key={s.k} type="button" className={`piastrella-scheda touch ${scheda === s.k ? 'piastrella-scheda--attiva' : ''}`} onClick={() => setParams({ scheda: s.k })} onPointerEnter={() => anticipaScheda(s.k)} onFocus={() => anticipaScheda(s.k)} onTouchStart={() => anticipaScheda(s.k)} aria-pressed={scheda === s.k} title={s.l}>
                <IconaScheda chiave={s.k} dimensione={22} />
                <span>{s.l}</span>
              </button>
            ))}
          </FilaScorrevole>
          <FinestraModificaPartita partita={attiva} aperta={modifica} onChiudi={() => {
            setModifica(false);
            // aperta dal vecchio indirizzo non c'è un pulsante da cui è partita: il fuoco va su «Modifica», non in cima al documento
            if (richiesta === 'riepilogo') { setParams({ scheda: 'oggi' }, { replace: true }); requestAnimationFrame(() => document.getElementById('modifica-dati-partita')?.focus()); }
          }} />
          {/* Un solo `Suspense` per tutte le schede, sempre montato: cambiando scheda React tiene a schermo quella di prima finché la nuova non è
              scaricata (la navigazione è una transizione), senza ripiego e senza salti. Il ripiego compare solo se la pagina si apre già su una scheda
              non ancora scaricata. L'errore di una scheda (un file sparito dopo un rilascio) resta nel suo riquadro, con la riga delle schede
              sopra; la `key` lo azzera passando a un'altra scheda. «Oggi» non cambia: nessun riquadro, il suo errore va alla pagina come prima. */}
          <Suspense fallback={<CaricamentoScheda />}>
            {scheda === 'oggi' && <div className="md:flex-1 md:min-h-0 riempi-figli"><OggiPartita key={attiva.id} partita={attiva} riempi onGiorno={setGiornoOggi} /></div>}
            {scheda !== 'oggi' && (
              <ErroreInRiquadro key={scheda}>
                {scheda === 'doti' && <div className="md:flex-1 md:min-h-0 riempi-figli"><DotiSociali.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {/* L10-01: da 1024 px queste schede riempiono l'altezza (il contenitore passa l'altezza al figlio, `riempi-figli-lg`) */}
                {scheda === 'squadra' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><SquadraPartita.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {scheda === 'confidenti' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><ConfidentiPartita.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {scheda === 'letture' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><LettureEGiochi.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {scheda === 'progressi' && <ProgressiPartita.Componente key={attiva.id} partitaId={attiva.id} />}
                {scheda === 'scorta' && <ScortaPersona.Componente key={attiva.id} partitaId={attiva.id} />}
                {scheda === 'compendio' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><CompendioPersonale.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {scheda === 'persona-partita' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><PersonaDellaPartita.Componente key={attiva.id} partitaId={attiva.id} /></div>}
                {scheda === 'obiettivi' && <ObiettiviPartita.Componente key={attiva.id} partitaId={attiva.id} />}
                {scheda === 'piani' && <PianiSalvati.Componente key={attiva.id} partitaId={attiva.id} />}
                {scheda === 'cicli' && <CicliSalvati.Componente key={attiva.id} partitaId={attiva.id} />}
                {scheda === 'storico' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><StoricoPartita.Componente key={attiva.id} partitaId={attiva.id} /></div>}
              </ErroreInRiquadro>
            )}
          </Suspense>
        </div>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </PageState>
  );
}
