// ============================================================
// RiepilogoPartita — dati generali della partita attiva (modificabili)
// ============================================================

import { useRef, useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { Campo, CampoTesto } from '../shared/Campo';
import { Link } from 'react-router-dom';
import { StoricoPartita } from './StoricoPartita';
import { aggiornaPartita, getSetDlc, URL_SET_DLC, type DatiPartita } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import type { Difficolta, PartitaDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const DIFFICOLTA: Array<{ v: Difficolta; l: string }> = [
  { v: 'sicura', l: 'Sicura' },
  { v: 'facile', l: 'Facile' },
  { v: 'normale', l: 'Normale' },
  { v: 'difficile', l: 'Difficile' },
  { v: 'spietata', l: 'Spietata' },
];

/** Il livello scritto nel campo come intero fra 1 e 99; `null` se il campo è vuoto o non è un numero (allora vale quello di prima, mai 0). */
function livelloValido(testo: string): number | null {
  if (testo.trim() === '') return null;
  const n = Number(testo);
  return Number.isFinite(n) ? Math.min(99, Math.max(1, Math.trunc(n))) : null;
}

/** I set di contenuti scaricabili in ordine di id, come testo confrontabile (il server li salva così). */
const listaOrdinata = (l: readonly number[]): string => [...l].sort((a, b) => a - b).join(',');

interface Props {
  partita: PartitaDto;
  /** Chiamata quando si segue un collegamento verso un'altra scheda (dentro una finestra: la chiude). */
  onNaviga?: () => void;
}

/** Modulo di modifica: nome, livello del protagonista, data di gioco, difficoltà, NG+, salvataggio di Persona 5, contenuti scaricabili
 *  posseduti, Allarme, note.
 *  Il genitore lo rimonta (prop `key`) quando la partita cambia, così lo stato locale riparte dai dati aggiornati. */
export function RiepilogoPartita({ partita, onNaviga }: Props) {
  const aggiornaLocale = usePartitaStore((s) => s.aggiornaLocale);
  const [nome, setNome] = useState(partita.nome);
  // il livello si tiene come testo mentre si scrive (un campo vuoto non vale 0) e si valida all'uscita dal campo e al salvataggio
  const [livelloTesto, setLivelloTesto] = useState(String(partita.livelloProtagonista));
  const [dataGioco, setDataGioco] = useState(partita.dataGioco ?? '');
  const [difficolta, setDifficolta] = useState<Difficolta>(partita.difficolta);
  const [ngPlus, setNgPlus] = useState(partita.nuovaPartitaPlus);
  const [allarme, setAllarme] = useState(partita.allarmeAttivo);
  const [note, setNote] = useState(partita.note);
  const [salvataggioP5, setSalvataggioP5] = useState(partita.salvataggioP5);
  const [dlc, impostaDlc] = useState<readonly number[]>(partita.dlcPosseduti);
  const [occupato, setOccupato] = useState(false);
  // i valori con cui il modulo è partito (poi, dopo ogni salvataggio, quelli salvati): «Salva» invia SOLO i campi cambiati rispetto a
  // questi. Reinviare anche gli altri riporterebbe indietro quello che nel frattempo è cambiato altrove (il giorno spostato da una spunta
  // del Diario, il livello di Joker) con i valori che il modulo si era portato dietro dall'apertura.
  const base = useRef({
    nome: partita.nome, livello: partita.livelloProtagonista, dataGioco: partita.dataGioco ?? '', difficolta: partita.difficolta, ngPlus: partita.nuovaPartitaPlus,
    allarme: partita.allarmeAttivo, note: partita.note, salvataggioP5: partita.salvataggioP5, dlc: listaOrdinata(partita.dlcPosseduti),
  });
  // i set di contenuti scaricabili del file di gioco, con le loro Persona (dato di gioco, con la cache delle letture di gioco)
  const elencoDlc = useCarica(() => getSetDlc(), [], { cacheUrl: URL_SET_DLC });
  /** Segna o toglie un set fra i posseduti (in ordine di id, come li salva il server). */
  const alternaDlc = (id: number) => impostaDlc((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id].sort((a, b) => a - b)));

  /** Salva insieme i campi del modulo (data vuota come `null`) e aggiorna la partita nello store; i contenuti scaricabili partono solo se
   *  sono cambiati, così il salvataggio degli altri campi non dipende dal loro controllo sul file di gioco. */
  const salva = async () => {
    // «Salva» resta abilitato durante il salvataggio (`aria-disabled`): un pulsante disabilitato perde il fuoco, che uscirebbe dalla
    // finestra; il secondo invio si ferma qui
    if (occupato) return;
    setOccupato(true);
    try {
      const b = base.current;
      const livello = livelloValido(livelloTesto) ?? b.livello;
      setLivelloTesto(String(livello));
      const dati: DatiPartita = {
        ...(nome !== b.nome ? { nome } : {}),
        ...(livello !== b.livello ? { livelloProtagonista: livello } : {}),
        ...(dataGioco !== b.dataGioco ? { dataGioco: dataGioco || null } : {}),
        ...(difficolta !== b.difficolta ? { difficolta } : {}),
        ...(ngPlus !== b.ngPlus ? { nuovaPartitaPlus: ngPlus } : {}),
        ...(allarme !== b.allarme ? { allarmeAttivo: allarme } : {}),
        ...(note !== b.note ? { note } : {}),
        ...(salvataggioP5 !== b.salvataggioP5 ? { salvataggioP5 } : {}),
        // i contenuti scaricabili partono solo se sono cambiati, così il salvataggio degli altri campi non dipende dal loro controllo sul file di gioco
        ...(listaOrdinata(dlc) !== b.dlc ? { dlcPosseduti: [...dlc] } : {}),
      };
      if (Object.keys(dati).length === 0) { notifica('info', 'Non ci sono modifiche da salvare.'); return; }
      const p = await aggiornaPartita(partita.id, dati);
      base.current = { nome, livello, dataGioco, difficolta, ngPlus, allarme, note, salvataggioP5, dlc: listaOrdinata(dlc) };
      aggiornaLocale(p);
      notifica('success', 'Partita aggiornata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  /** Cambia subito lo stato dell'Allarme, senza aspettare «Salva»: aggiorna il campo locale e salva
   * il solo Allarme; in caso di errore notifica e ripristina il valore di prima. */
  const cambiaAllarme = async (attivo: boolean) => {
    const prima = allarme;
    setAllarme(attivo);
    try {
      aggiornaLocale(await aggiornaPartita(partita.id, { allarmeAttivo: attivo }));
      base.current = { ...base.current, allarme: attivo };
    } catch (err) {
      // il salvataggio non è avvenuto: il pulsante torna a dire com'è davvero la partita
      setAllarme(prima);
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <form className="card flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        <label className="form-label">Nome della partita
          <input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="form-label">Livello del protagonista
            <input type="number" min={1} max={99} className="form-input" value={livelloTesto} onChange={(e) => setLivelloTesto(e.target.value)}
              onBlur={() => setLivelloTesto(String(livelloValido(livelloTesto) ?? base.current.livello))} />
          </label>
          {/* L13: la data di gioco si sceglie (mese e giorno), non si digita; si salva come «MM-GG» o `null` («nessuna») come prima */}
          <Campo etichetta="Data di gioco" senzaGruppo>
            <SelettoreData etichetta="Data di gioco" facoltativa valore={dataGioco} onCambia={setDataGioco} />
          </Campo>
          <Selettore etichettaSopra etichetta="Difficoltà" valore={difficolta} opzioni={DIFFICOLTA.map((d) => ({ chiave: d.v, nome: d.l }))} onCambia={(k) => setDifficolta(k as Difficolta)} />
        </div>
        <label className="flex items-center gap-2 testo-13 touch">
          <input type="checkbox" checked={ngPlus} onChange={(e) => setNgPlus(e.target.checked)} /> Nuova Partita +
        </label>
        {/* le impostazioni dei contenuti: le leggono la Fusione e gli effetti con condizione delle voci (lo Scaffale con lo scatolone del Leblanc) */}
        <label className="flex items-center gap-2 testo-13 touch">
          <input type="checkbox" checked={salvataggioP5} onChange={(e) => setSalvataggioP5(e.target.checked)} /> Salvataggio di Persona 5 presente
        </label>
        <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
          <legend className="form-label m-0 p-0">Contenuti scaricabili posseduti</legend>
          <span className="testo-12 text-text-secondary text-pretty">Le Persona dei set segnati entrano nella Fusione e lo Scaffale con lo scatolone del Leblanc le registra nel Compendio.</span>
          {elencoDlc.errore
            ? <p role="alert" className="m-0 testo-13">{elencoDlc.errore} <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void elencoDlc.ricarica()} /></p>
            : !elencoDlc.dati
              ? <p className="m-0 testo-13 text-text-muted">Caricamento dei contenuti…</p>
              : (
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {elencoDlc.dati.map((s) => {
                    const dentro = dlc.includes(s.id);
                    return <button key={s.id} type="button" className={`chip touch text-pretty ${dentro ? 'chip--attivo' : ''}`} aria-pressed={dentro} onClick={() => alternaDlc(s.id)}>{s.nome}</button>;
                  })}
                </div>
              )}
        </fieldset>
        <CampoTesto etichetta="Note" tipo="lungo" righe={4} valore={note} onCambia={setNote} massimo={2000} />
        <div className="flex justify-end">
          <PulsanteVisivo type="submit" tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" aria-disabled={occupato || undefined} />
        </div>
      </form>
      <div className="flex flex-col gap-3">
        <div className={`card flex flex-col gap-2 ${allarme ? 'border-primary bg-primary-bg' : ''}`}>
          <span className="form-label m-0">Stanza di Velluto</span>
          <div className="testo-13 text-text-secondary">Segna quando la Stanza è in <strong className="text-text">Allarme</strong>: le fusioni danno più skill e statistiche, ma la ghigliottina può incepparsi.</div>
          <PulsanteVisivo attivo={allarme} className="self-start" icona={<IconaAzione chiave="allarme" dimensione={24} />} titolo={allarme ? 'Allarme attivo' : 'Attiva Allarme'} dettaglio={allarme ? 'tocca per disattivare' : 'fusioni con più skill e statistiche'} onClick={() => void cambiaAllarme(!allarme)} />
        </div>
        <div className="card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="form-label m-0">Ultimi eventi</span>
            <Link to="/partita?scheda=storico" className="touch inline-flex items-center testo-12 text-primary-testo" onClick={onNaviga}>Tutto lo storico</Link>
          </div>
          <StoricoPartita key={partita.updatedAt} partitaId={partita.id} perPagina={5} compatto />
        </div>
        <div className="card testo-13 text-text-secondary flex flex-col gap-1">
          <span className="form-label m-0">Info</span>
          <span>Creata: {new Date(partita.createdAt).toLocaleString('it-IT')}</span>
          <span>Ultimo aggiornamento: {new Date(partita.updatedAt).toLocaleString('it-IT')}</span>
        </div>
      </div>
    </div>
  );
}
