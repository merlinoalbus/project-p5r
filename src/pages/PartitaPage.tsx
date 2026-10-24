// ============================================================
// PartitaPage — tracking della partita attiva: riepilogo, Doti, Confidenti, scorta, compendio, storico
// ============================================================

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconaScheda } from '../components/shared/IconaAzione';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useShallow } from 'zustand/react/shallow';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState, EmptyState } from '../components/shared/PageState';
import { NuovaPartitaModal } from '../components/partita/NuovaPartitaModal';
import { RiepilogoPartita } from '../components/partita/RiepilogoPartita';
import { SquadraPartita } from '../components/partita/SquadraPartita';
import { DotiSociali } from '../components/partita/DotiSociali';
import { ConfidentiPartita } from '../components/partita/ConfidentiPartita';
import { ScortaPersona } from '../components/partita/ScortaPersona';
import { CompendioPersonale } from '../components/partita/CompendioPersonale';
import { PersonaDellaPartita } from '../components/partita/PersonaDellaPartita';
import { StoricoPartita } from '../components/partita/StoricoPartita';
import { ObiettiviPartita } from '../components/partita/ObiettiviPartita';
import { PianiSalvati } from '../components/partita/PianiSalvati';
import { CicliSalvati } from '../components/partita/CicliSalvati';
import { LettureEGiochi } from '../components/partita/LettureEGiochi';
import { ProgressiPartita } from '../components/partita/ProgressiPartita';
import { OggiPartita } from '../components/partita/OggiPartita';
import { ScuolaOggi } from '../components/partita/ScuolaOggi';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';

type Scheda = 'oggi' | 'riepilogo' | 'doti' | 'squadra' | 'confidenti' | 'letture' | 'progressi' | 'scorta' | 'compendio' | 'persona-partita' | 'obiettivi' | 'piani' | 'cicli' | 'storico';

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
  { k: 'riepilogo', l: 'Riepilogo' },
];

/** Pagina della partita attiva con schede; senza partite propone la creazione. */
export function PartitaPage() {
  useDocumentTitle('Partita');
  const { attiva, caricamento, caricata, errore, carica } = usePartitaStore(useShallow((s) => ({ attiva: s.attiva, caricamento: s.caricamento, caricata: s.caricata, errore: s.errore, carica: s.carica })));
  const [nuova, setNuova] = useState(false);
  const [params, setParams] = useSearchParams();
  // da 768 px le piastrelle delle schede sono basse, con icona e nome affiancati (`.fila-schede-partita`): l'icona scende a 22 px
  const richiesta = params.get('scheda');
  const scheda: Scheda = SCHEDE.some((s) => s.k === richiesta) ? (richiesta as Scheda) : 'oggi';
  // il giorno mostrato dalla scheda «Oggi» (null a scheda chiusa): senza, vale la data di gioco della partita
  const [giornoOggi, setGiornoOggi] = useState<string | null>(null);
  const giornoScuola = (scheda === 'oggi' ? giornoOggi : null) ?? attiva?.dataGioco ?? null;

  return (
    <PageState isLoading={caricamento && !caricata} error={errore} onRetry={() => void carica()}>
      {!attiva ? (
        <EmptyState
          title="Nessuna partita attiva"
          hint="Crea la tua prima partita: potrai tracciare Doti sociali, Confidenti, Persona possedute e compendio. Puoi gestire più partite e passare dall'una all'altra dalla barra in alto."
          action={<button type="button" className="btn btn-primary" onClick={() => setNuova(true)}>Crea partita</button>}
        />
      ) : (
        <div className={`flex flex-col gap-0.5 md:gap-2 ${scheda === 'oggi' || scheda === 'doti' ? 'scheda-riempi md:min-h-0' : scheda === 'letture' ? 'scheda-riempi-lg lg:min-h-0' : ''}`}>
          {/* i dati della partita stanno nella riga del titolo (a destra, o sotto sul telefono): con le schede su una riga sola
              l'intestazione resta entro il 30% dell'altezza (progetto dei Confidenti approvato il 2026-10-24) */}
          <IntestazionePagina titolo={attiva.nome} compatta azioniInRiga azioniAccanto className="intestazione--partita pt-0" azioni={
            <FilaScorrevole className="fila-scorrevole--sempre fila-dati-partita items-center min-w-0" role="group" aria-label="Dati e scorciatoie della partita">
              <span className="chip">Liv. {attiva.livelloProtagonista}</span>
              {attiva.dataGioco && <span className="chip">{attiva.dataGioco}</span>}
              {attiva.nuovaPartitaPlus && <span className="chip">NG+</span>}
              {attiva.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
              {/* le scorciatoie della scuola seguono il giorno guardato nella scheda «Oggi» (scelta dell'utente, 2026-10-11); la chiave
                  resta sulla data di gioco: scorrere i giorni filtra gli elenchi già caricati, non li rilegge */}
              <ScuolaOggi key={`${attiva.id}-${attiva.dataGioco ?? ''}`} partita={attiva} giorno={giornoScuola} />
            </FilaScorrevole>
          } />
          {/* una riga sola che scorre anche su tablet e desktop: a capo le 15 piastrelle facevano due righe e l'intestazione superava il 30% */}
          <FilaScorrevole role="tablist" aria-label="Schede della partita" className="fila-scorrevole--sempre fila-schede-partita">
            {SCHEDE.map((s) => (
              // Prima l'immagine, poi la parola: erano pastiglie di testo con un'iconcina da 16 px
              // accanto, e in dieci schede si leggevano tutte uguali. Ora l'icona e' il segno che
              // si riconosce da lontano — 28 px — e l'etichetta sta sotto, piu' piccola. Resta
              // scritta: un'icona sola non dice «Piani salvati» a nessuno la prima volta.
              <button key={s.k} type="button" className={`piastrella-scheda touch ${scheda === s.k ? 'piastrella-scheda--attiva' : ''}`} onClick={() => setParams({ scheda: s.k })} aria-pressed={scheda === s.k} title={s.l}>
                <IconaScheda chiave={s.k} dimensione={22} />
                <span>{s.l}</span>
              </button>
            ))}
          </FilaScorrevole>
          {scheda === 'oggi' && <div className="md:flex-1 md:min-h-0 riempi-figli"><OggiPartita key={attiva.id} partita={attiva} riempi onGiorno={setGiornoOggi} /></div>}
          {scheda === 'riepilogo' && <RiepilogoPartita key={attiva.id} partita={attiva} />}
          {scheda === 'doti' && <div className="md:flex-1 md:min-h-0 riempi-figli"><DotiSociali partitaId={attiva.id} /></div>}
          {scheda === 'squadra' && <SquadraPartita key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'confidenti' && <ConfidentiPartita partitaId={attiva.id} />}
          {scheda === 'letture' && <div className="lg:flex-1 lg:min-h-0 riempi-figli-lg"><LettureEGiochi key={attiva.id} partitaId={attiva.id} /></div>}
          {scheda === 'progressi' && <ProgressiPartita key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'scorta' && <ScortaPersona partitaId={attiva.id} />}
          {scheda === 'compendio' && <CompendioPersonale partitaId={attiva.id} />}
          {scheda === 'persona-partita' && <PersonaDellaPartita key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'obiettivi' && <ObiettiviPartita key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'piani' && <PianiSalvati key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'cicli' && <CicliSalvati key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'storico' && <StoricoPartita key={attiva.id} partitaId={attiva.id} />}
        </div>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </PageState>
  );
}
