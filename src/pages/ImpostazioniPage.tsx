// ============================================================
// ImpostazioniPage — partite, traduzioni, immagini degli Arcani, cestino, informazioni
// ============================================================

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useConfigStore } from '../stores/configStore';
import { useGlossarioStore } from '../stores/glossarioStore';
import { GestionePartite } from '../components/impostazioni/GestionePartite';
import { TraduzioniEditor } from '../components/impostazioni/TraduzioniEditor';
import { CaratteriEditor } from '../components/impostazioni/CaratteriEditor';
import { ImmaginiCaricate } from '../components/impostazioni/ImmaginiCaricate';
import { BackupIstanza } from '../components/impostazioni/BackupIstanza';
import { PacchettoGioco } from '../components/impostazioni/PacchettoGioco';
import { MieiDati } from '../components/impostazioni/MieiDati';
import { Cestino } from '../components/impostazioni/Cestino';
import { NascostiDallaGuida } from '../components/impostazioni/NascostiDallaGuida';
import { GestiPartita } from '../components/partita/GestiPartita';
import { RimozioniConservate } from '../components/impostazioni/RimozioniConservate';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import { useAssetStore } from '../stores/assetStore';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { SoloPreparazione } from '../components/shared/SoloPreparazione';

/**
 * «Prepara edizione» (L12, passi 7 e 9). Il componente si carica a richiesta e SOLO nella preparazione: con `VITE_MODALITA=rilascio` Vite sostituisce
 * la costante, la condizione è statica e l'import dinamico esce dal bundle di rilascio (con lui il testo delle rotte dell'edizione).
 */
const PreparaEdizione = import.meta.env.VITE_MODALITA === 'rilascio'
  ? null
  : lazy(() => import('../components/impostazioni/PreparaEdizione').then((m) => ({ default: m.PreparaEdizione })));

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Impostazioni dell'app. */
export function ImpostazioniPage() {
  useDocumentTitle('Impostazioni');
  const config = useConfigStore((s) => s.config);
  const glossario = useGlossarioStore((s) => s.glossario);
  const ricaricaGlossario = useGlossarioStore((s) => s.ricarica);
  const graficaPredefinita = usePreferenzeStore((s) => s.graficaPredefinita);
  const impostaGrafica = usePreferenzeStore((s) => s.impostaGraficaPredefinita);
  const manifest = useAssetStore((s) => s.manifest);
  // `?traduzione=<ambito>&q=<testo>`: l'editor delle traduzioni si apre già su quell'ambito e filtrato su quel testo (per esempio dalla scheda di una skill)
  const [parametri] = useSearchParams();
  const traduzioneAmbito = parametri.get('traduzione') ?? undefined;
  const traduzioneQ = parametri.get('q') ?? undefined;

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Impostazioni" sottotitolo={IN_RILASCIO
        ? 'Le tue partite, la grafica predefinita e il cestino delle tue partite.'
        : 'Partite, grafica predefinita, caratteri, immagini, traduzioni, cestino, pacchetto di gioco, backup della tua istanza e documentazione delle API.'} />
      <GestionePartite />
      <section className="card flex flex-col gap-3">
        <TitoloSezione>Grafica</TitoloSezione>
        <label className="flex items-start gap-3 cursor-pointer">
          <span className="touch flex items-center justify-center shrink-0">
            <input type="checkbox" className="w-6 h-6" checked={graficaPredefinita} onChange={(e) => impostaGrafica(e.target.checked)} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-semibold testo-14">Usa la grafica predefinita in stile Persona 5 Royal</span>
            <span className="testo-13 text-text-secondary">
              Carte degli Arcani, ritratti dei Confidenti, icone e sfondi inclusi nell'app (cartella <code>public/asset</code>). Le immagini che carichi tu hanno sempre la precedenza; se un elemento grafico manca, l'app mostra il testo. La scelta vale per questo dispositivo.
            </span>
            <span className="testo-12 text-text-muted">
              {manifest === null ? 'Elenco degli asset in caricamento…' : manifest.totale === 0 ? 'Nessun asset predefinito incluso in questa versione: l\'app usa i segnaposto testuali.' : `${manifest.totale} asset predefiniti disponibili.`}
            </span>
          </span>
        </label>
      </section>
      {/* L12 (passo 8): nel rilascio (sola lettura) restano solo le partite dell'utente, la grafica locale, il cestino personale e le informazioni; tutto il resto
          (caratteri, immagini, traduzioni, righe nascoste della guida, pacchetto, backup, documentazione delle API) è presente solo nella preparazione.
          `IN_RILASCIO` è una costante di build: nel bundle di rilascio questi componenti e le chiamate all'API che usano non ci sono. */}
      {!IN_RILASCIO && <CaratteriEditor />}
      {!IN_RILASCIO && <section className="card flex flex-col gap-3">
        <TitoloSezione>Immagini degli Arcani</TitoloSezione>
        <p className="m-0 testo-13 text-text-secondary">Tocca una carta per sostituirla con un tuo file: le immagini caricate hanno la precedenza sulla grafica predefinita e vengono usate nel compendio e nei Confidenti.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {glossario?.arcani.map((a) => (
            <div key={a.chiave} className="flex flex-col items-center gap-1">
              <ImmagineEntita ambito="arcana" chiave={a.chiave} etichetta={a.nome} dimensione={88} forma="carta" modificabile />
              <span className="testo-12 text-text-secondary">{a.nome}</span>
              <span className="flex items-center gap-1 testo-12 text-text-muted">
                {a.numero === null ? 'Senza numero' : `Numero ${a.numero}`}
                <ModificaGuida tipo="arcana" chiave={a.chiave} cosa={`l’Arcano «${a.nome}»`} soloIcona onSalvato={() => void ricaricaGlossario()} />
              </span>
            </div>
          ))}
        </div>
      </section>}
      {!IN_RILASCIO && <ImmaginiCaricate />}
      {!IN_RILASCIO && <TraduzioniEditor ambitoIniziale={traduzioneAmbito} qIniziale={traduzioneQ} />}
      {!IN_RILASCIO && <MieiDati />}
      {/* Il cestino c'è in entrambe le istanze: nella preparazione è quello unificato (contenuti e partite), nel rilascio solo quello personale,
          sotto `/api/partite/cestino` (L12, passo 3). Le righe nascoste dalla guida (`NascostiDallaGuida`) restano dell'autore. */}
      <Cestino />
      {!IN_RILASCIO && <NascostiDallaGuida />}
      <GestiPartita />
      {!IN_RILASCIO && <RimozioniConservate />}
      {!IN_RILASCIO && <PacchettoGioco />}
      {/* L12: «Prepara edizione» esiste solo nella preparazione (capacità `importaEsporta`) */}
      {!IN_RILASCIO && PreparaEdizione && (
        <SoloPreparazione funzione="importaEsporta">
          <Suspense fallback={null}><PreparaEdizione /></Suspense>
        </SoloPreparazione>
      )}
      {!IN_RILASCIO && <BackupIstanza />}
      {!IN_RILASCIO && <section className="card flex flex-col gap-3" aria-labelledby="titolo-documentazione-api">
        <TitoloSezione id="titolo-documentazione-api">Documentazione delle API</TitoloSezione>
        <p className="m-0 testo-13 text-text-secondary">
          Tutte le rotte del server, con parametri, corpi e risposte descritti in italiano (OpenAPI 3.1). La pagina si apre in una nuova
          scheda e funziona anche senza internet; «Prova» è attivo solo per le letture, perché parla con i dati veri di questa istanza.
        </p>
        <div className="flex flex-wrap gap-2">
          {/* `target` diverso da _self: React Router lascia il collegamento al browser, che apre la pagina del server */}
          <CollegamentoVisivo to="/api/docs" target="_blank" rel="noopener" tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri la documentazione" dettaglio="Swagger, nuova scheda" />
          <CollegamentoVisivo to="/api/openapi.json" target="_blank" rel="noopener" tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Documento OpenAPI" dettaglio="JSON" />
        </div>
      </section>}
      <section className="card testo-13 text-text-secondary">
        <TitoloSezione className="mb-1">Informazioni</TitoloSezione>
        <div>Versione app {config?.appVersion} — {config?.gioco}</div>
        <div>Dati del compendio derivati da chinhodado/persona5_calculator (Apache-2.0) con verifica su aqiu384/megaten-fusion-tool (Unlicense). Persona 5 Royal è di ATLUS/SEGA.</div>
      </section>
    </div>
  );
}
