// ============================================================
// EditorDisponibilita — «Informazioni del Confidente»: note sulla disponibilità, note generali e fonti, con lo storico
// ============================================================
//
// L13 (ondata 6, lotto O6-2): un dato in un solo punto. Giorni, fasce, eccezioni e luoghi si modificano da «Modifica disponibilità»
// (l'editor strutturato, raggiungibile da qui), lo sblocco dai requisiti di rango; qui restano le note e le fonti. È la `FinestraModifica`
// comune: corpo che scorre, piè fisso, conferma prima di chiudere con modifiche non salvate. «Salva» chiede l'anteprima al server (che
// controlla che riga e storico non siano cambiati), salva nello stesso gesto e chiude; il ripristino di una versione mostra prima che cosa
// riporta. Il motivo è facoltativo: senza, lo storico registra un testo standard (`MOTIVO_NON_INDICATO`).
// ============================================================

import { useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { useCarica } from '../../hooks/useCarica';
import { anteprimaInformazioniConfidente, getInformazioniConfidente, salvaInformazioniConfidente } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { CHIUDI_SENZA_SALVARE, RIPRISTINA_CON_MODIFICHE, conferma } from '../../stores/confermaStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { COLONNE_STORICHE_CONFIDENTE, ETICHETTE_INFORMAZIONI_CONFIDENTE } from '../../../shared/disponibilitaConfidenti';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, EditorInformazioniConfidenteDto, InformazioniConfidente, InformazioniConfidenteRaw } from '../../../shared/disponibilitaConfidenti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { useIdStabili } from '../../hooks/useIdStabili';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  chiave: string;
  onChiudi: () => void;
  onSalvato: () => void | Promise<void>;
  /** Apre l'editor strutturato della disponibilità (giorni, fasce, eccezioni, luoghi); chi lo usa chiude questa finestra. */
  onApriDisponibilita?: () => void;
}

/** Legge il proprio endpoint: rimane accessibile anche quando il dettaglio non riesce a decodificare un vecchio JSON. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor non esiste; la condizione è costante di build, `EditorDisponibilitaReale` esce dal bundle
export const EditorDisponibilita: StrumentoDiModifica<typeof EditorDisponibilitaReale> = IN_RILASCIO ? NienteInRilascio : EditorDisponibilitaReale;
function EditorDisponibilitaReale({ chiave, onChiudi, onSalvato, onApriDisponibilita }: Props) {
  const dati = useCarica(() => getInformazioniConfidente(chiave), [chiave]);
  const c = dati.dati;
  // il modulo si monta quando i dati ci sono: i valori iniziali sono quelli letti (e si rimonta dopo «rileggi», con la chiave)
  const [versioneLetta, setVersioneLetta] = useState(0);
  const titolo = `Informazioni di ${c?.confidente.nome ?? chiave}`;
  if (!c) {
    return <FinestraModifica titolo={titolo} onChiudi={onChiudi} onSalva={() => undefined} salvabile={false} caricamento={dati.caricamento} erroreCaricamento={dati.caricamento ? null : dati.errore ?? 'Informazioni non disponibili.'}>{null}</FinestraModifica>;
  }
  return <ModuloInformazioni key={`${c.revisioneAttesa}:${versioneLetta}`} chiave={chiave} titolo={titolo} c={c} onChiudi={onChiudi} onApriDisponibilita={onApriDisponibilita}
    onSalvato={async () => { await onSalvato(); onChiudi(); }}
    onRileggi={async () => { await dati.ricarica(); setVersioneLetta((v) => v + 1); }} />;
}

const vuote = (): InformazioniConfidente => ({ note: '', noteGenerali: '', fonti: [] });
const ugualiElenchi = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function ModuloInformazioni({ chiave, titolo, c, onChiudi, onSalvato, onRileggi, onApriDisponibilita }: {
  chiave: string; titolo: string; c: EditorInformazioniConfidenteDto; onChiudi: () => void;
  onSalvato: () => Promise<void>; onRileggi: () => Promise<void>; onApriDisponibilita?: () => void;
}) {
  const nuova = c.correnteRaw === null;
  const fontiIlleggibili = !nuova && c.valori.fonti === undefined;
  const iniziali: InformazioniConfidente = nuova ? vuote() : { note: c.valori.note ?? '', noteGenerali: c.valori.noteGenerali ?? '', fonti: c.valori.fonti ?? [] };
  const [modalita, setModalita] = useState<'modifica' | 'storico'>('modifica');
  const [valori, setValori] = useState<InformazioniConfidente>(iniziali);
  // le fonti si tolgono una per una: la chiave di riga è un id stabile, non l'indice (`useIdStabili`)
  const chiaviFonti = useIdStabili(valori.fonti.length);
  const [fontiToccate, setFontiToccate] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [versione, setVersione] = useState<number | null>(null);
  const [ripristino, setRipristino] = useState<{ versione: number; anteprima: AnteprimaInformazioniConfidenteDto } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // solo i campi cambiati (le fonti illeggibili si riscrivono solo se l'utente le ha toccate)
  const patch: Partial<InformazioniConfidente> = {};
  if (valori.note !== iniziali.note) patch.note = valori.note;
  if (valori.noteGenerali !== iniziali.noteGenerali) patch.noteGenerali = valori.noteGenerali;
  if (!ugualiElenchi(valori.fonti, iniziali.fonti) || (fontiIlleggibili && fontiToccate)) patch.fonti = valori.fonti;
  const modificata = nuova ? JSON.stringify(valori) !== JSON.stringify(vuote()) : Object.keys(patch).length > 0;
  // anche passando allo storico la bozza resta in memoria: chiudere o ripristinare da lì la perderebbe
  const sporca = modificata || motivo.trim() !== '';
  useBozzaSporca('editor-disponibilita', `informazioni di ${c.confidente.nome}`, sporca);

  const cambiaFonti = (fonti: string[]) => { setValori((v) => ({ ...v, fonti })); setFontiToccate(true); setErrore(null); };
  const cambiaModalita = (m: typeof modalita) => { setModalita(m); setErrore(null); };

  /** Anteprima (il server rifiuta se riga o storico sono cambiati) e salvataggio nello stesso gesto, con lo stesso identificativo. */
  const esegui = async (azione: AzioneInformazioniConfidente, anteprimaGiaFatta?: AnteprimaInformazioniConfidenteDto) => {
    setOccupato(true); setErrore(null);
    try {
      const anteprima = anteprimaGiaFatta ?? await anteprimaInformazioniConfidente(chiave, azione);
      const esito = await salvaInformazioniConfidente(chiave, { ...azione, anteprimaAttesa: anteprima.anteprimaAttesa, operazioneId: crypto.randomUUID() });
      notifica('success', esito.esito === 'gia-eseguita' ? `Operazione già eseguita (versione ${esito.versione}).`
        : esito.esito === 'invariata' ? 'Informazioni già coincidenti: nessuna modifica.' : 'Informazioni aggiornate.');
      await onSalvato();
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  const salva = async () => {
    if (occupato) return;
    if (modalita === 'storico') {
      if (!ripristino || (sporca && !(await conferma(RIPRISTINA_CON_MODIFICHE)))) return;
      void esegui({ azione: 'ripristina-versione', versione: ripristino.versione, revisioneAttesa: c.revisioneAttesa }, ripristino.anteprima);
      return;
    }
    // un motivo vuoto non si manda: lo storico registra il testo standard
    const conMotivo = motivo.trim() ? { motivo } : {};
    void esegui(nuova ? { azione: 'crea-informazioni', valori, ...conMotivo, revisioneAttesa: c.revisioneAttesa }
      : { azione: 'modifica-manuale', valori: patch, ...conMotivo, revisioneAttesa: c.revisioneAttesa });
  };
  /** Rilegge dal server: il modulo riparte dai valori letti, quindi una bozza si perde solo dopo la conferma. */
  const rileggi = async () => {
    if (sporca && !(await conferma({ titolo: 'Rileggere senza salvare?', testo: 'Ci sono modifiche non salvate: rileggendo si perdono.', etichetta: 'Rileggi comunque', icona: 'ricalcola' }))) return;
    await onRileggi();
  };
  /** Sceglie una versione e chiede subito al server che cosa riporterebbe il ripristino. */
  const scegliVersione = async (v: number | null) => {
    setVersione(v); setRipristino(null); setErrore(null);
    if (v === null) return;
    setOccupato(true);
    try { setRipristino({ versione: v, anteprima: await anteprimaInformazioniConfidente(chiave, { azione: 'ripristina-versione', versione: v, revisioneAttesa: c.revisioneAttesa }) }); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Anteprima non disponibile.'); }
    finally { setOccupato(false); }
  };
  const apriDisponibilita = async () => {
    if (!onApriDisponibilita || occupato) return;
    if (sporca && !(await conferma(CHIUDI_SENZA_SALVARE))) return;
    onApriDisponibilita();
  };

  const salvabile = modalita === 'storico'
    ? !!ripristino && ripristino.versione === versione && ripristino.anteprima.campiCambiati.length > 0
    : modificata;
  const scelta = c.versioni.find((v) => v.id === versione);

  return (
    <FinestraModifica titolo={titolo} onChiudi={onChiudi} onSalva={salva} salvabile={salvabile} occupato={occupato} sporca={sporca} errore={errore && `${errore} La bozza resta disponibile.`}
      titoloSalva={modalita === 'storico' ? 'Ripristina' : nuova ? 'Crea' : 'Salva'}
      azioniExtra={<PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Rileggi" disabled={occupato} onClick={() => void rileggi()} />}>
      <div className="flex flex-col gap-3 min-w-0 testo-13">
        {c.errori.length > 0 && <ul className="m-0 pl-5 text-warning">{c.errori.map((e) => <li key={e}>{e}</li>)}</ul>}
        {/* il rimando: quando e dove si incontra ha una sola sede, l'editor strutturato */}
        {onApriDisponibilita && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-secondary">Giorni, fasce, eccezioni e luoghi:</span>
            <PulsanteVisivo compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Modifica disponibilità" disabled={occupato} onClick={() => void apriDisponibilita()} />
          </div>
        )}
        {c.versioni.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Che cosa fare">
            <PulsanteVisivo attivo={modalita === 'modifica'} compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" disabled={occupato} onClick={() => cambiaModalita('modifica')} />
            <PulsanteVisivo attivo={modalita === 'storico'} compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Storico e ripristino" disabled={occupato} onClick={() => cambiaModalita('storico')} />
          </div>
        )}

        {modalita === 'modifica' && (
          <SezioneCampi titolo={nuova ? 'Nuove informazioni' : 'Informazioni'}>
            <CampoTesto tipo="lungo" righe={3} etichetta={ETICHETTE_INFORMAZIONI_CONFIDENTE.note} valore={valori.note} disabilitato={occupato} massimo={4000}
              onCambia={(note) => { setValori((v) => ({ ...v, note })); setErrore(null); }} />
            <CampoTesto tipo="lungo" righe={3} etichetta={ETICHETTE_INFORMAZIONI_CONFIDENTE.noteGenerali} valore={valori.noteGenerali} disabilitato={occupato} massimo={4000}
              onCambia={(noteGenerali) => { setValori((v) => ({ ...v, noteGenerali })); setErrore(null); }} />
            <fieldset className="campo campo--largo m-0 flex flex-col gap-2 border-0 p-0 min-w-0" disabled={occupato}>
              <legend className="campo__etichetta p-0">{ETICHETTE_INFORMAZIONI_CONFIDENTE.fonti}</legend>
              {fontiIlleggibili && !fontiToccate && (
                <p className="m-0 text-warning break-words">Elenco salvato illeggibile: <span className="font-mono">{c.correnteRaw?.fonti_json}</span>. Resta com’è finché non aggiungi o togli una fonte qui sotto.</p>
              )}
              {valori.fonti.length === 0 && <span className="text-text-muted">Nessuna fonte.</span>}
              {valori.fonti.map((f, i) => (
                <div key={chiaviFonti.ids[i]} className="flex min-w-0 items-center gap-2">
                  <input className="form-input min-w-0 flex-1" aria-label={`Fonte ${i + 1}`} value={f} maxLength={600}
                    onChange={(e) => cambiaFonti(valori.fonti.map((x, j) => (j === i ? e.target.value : x)))} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la fonte ${i + 1}`}
                    onClick={() => { chiaviFonti.togli(i); cambiaFonti(valori.fonti.filter((_, j) => j !== i)); }} />
                </div>
              ))}
              <PulsanteVisivo compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una fonte" onClick={() => cambiaFonti([...valori.fonti, ''])} />
            </fieldset>
            <CampoTesto tipo="lungo" etichetta="Motivo della modifica" valore={motivo} disabilitato={occupato} massimo={1000}
              aiuto="Facoltativo. Resta nello storico, con i valori di prima." onCambia={(m) => { setMotivo(m); setErrore(null); }} />
          </SezioneCampi>
        )}

        {modalita === 'storico' && (
          <>
            <p className="m-0 text-text-secondary">Il ripristino riporta le note e le fonti della versione scelta e aggiunge una revisione: le versioni precedenti restano.</p>
            <Selettore etichettaSopra etichetta="Versione da ripristinare" valore={versione === null ? '' : String(versione)} disabilitato={occupato} vuoto="Scegli una versione"
              opzioni={c.versioni.map((v) => ({ chiave: String(v.id), nome: `Versione ${v.id} · ${v.azione}`, dettaglio: v.data ? v.data.slice(0, 10) : 'iniziale' }))}
              onCambia={(v) => void scegliVersione(v === '' ? null : Number(v))} />
            {scelta && (
              <section className="flex flex-col gap-2 min-w-0" aria-label={`Versione ${scelta.id}`}>
                <p className="m-0">{scelta.motivo}</p>
                {scelta.errori.map((e) => <p key={e} className="m-0 text-warning" role="alert">{e}</p>)}
                <ValoriVersione raw={scelta.raw} />
                {ripristino?.versione === scelta.id && (
                  <>
                    <ul className="m-0 pl-5">{ripristino.anteprima.avvertenze.map((a) => <li key={a}>{a}</li>)}</ul>
                    <p className="m-0 font-semibold">{ripristino.anteprima.campiCambiati.length === 0 ? 'Coincide con le informazioni di adesso: niente da ripristinare.'
                      : `Cambiano: ${ripristino.anteprima.campiCambiati.map((k) => ETICHETTE_INFORMAZIONI_CONFIDENTE[k].toLowerCase()).join(', ')}.`}</p>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </FinestraModifica>
  );
}

/** I campi di una versione: le note e le fonti (che il ripristino riporta) e, a parte, la prosa di prima che non si modifica più da qui. */
function ValoriVersione({ raw }: { raw: InformazioniConfidenteRaw }) {
  const storiche = COLONNE_STORICHE_CONFIDENTE.filter(({ colonna }) => raw[colonna] !== '' && raw[colonna] !== '[]');
  return (
    <dl className="m-0 flex flex-col gap-2 testo-12 min-w-0">
      {([['note', 'note'], ['noteGenerali', 'note_generali'], ['fonti', 'fonti_json']] as const).map(([campo, colonna]) => (
        <div key={campo}><dt className="font-semibold">{ETICHETTE_INFORMAZIONI_CONFIDENTE[campo]}</dt><dd className="m-0 whitespace-pre-wrap break-words">{raw[colonna] && raw[colonna] !== '[]' ? raw[colonna] : 'Vuoto'}</dd></div>
      ))}
      {storiche.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <dt className="font-semibold">Non più modificabili da qui (non si ripristinano)</dt>
          {storiche.map(({ colonna, etichetta }) => <dd key={colonna} className="m-0 whitespace-pre-wrap break-words text-text-secondary"><span className="font-semibold">{etichetta}:</span> {raw[colonna]}</dd>)}
        </div>
      )}
    </dl>
  );
}
