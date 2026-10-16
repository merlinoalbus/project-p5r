// ============================================================
// GuidaDellArea — la guida di un'area del Palazzo, modificabile e collegata ai pin (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Mi serve la possibilità di modificare proprio la guida così da poter modificare/aggiornare, aggiungere, rimuovere le
// voci della guida o correggerli agganciandoli ad elementi della mappa.» Ogni voce si corregge (nome, tipo, esauribile,
// descrizione), si sposta su e giù, si elimina; in fondo se ne aggiunge una. E si collega ai pin delle planimetrie del
// Palazzo **scegliendoli sulla mappa, dentro la voce stessa** («deve essere contestuale al punto dove si fa questa
// associazione»): «Collega pin» apre lì sotto la planimetria in modalità scelta, un tocco collega, un altro scollega.
// Una voce collegata ha lo stato dei suoi pin (lo dice il server); i punti non vengono riconciliati in automatico:
// «lascia i punti come sono... li sistemo io via via a mano». Per questo la riga dice «da collegare» quando la voce è di
// un tipo che un pin può rappresentare e non ne ha ancora.
// Dal 2026-10-14 («come faccio a spostare più voci del palazzo insieme?») «Sposta voci in un’altra area» apre la scelta: le voci
// dell'area diventano righe da spuntare e «Sposta in…» le manda insieme in fondo a un'altra area del Palazzo (`SpostaVociInArea`).
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { collegaPinAlPunto, creaPunto, eliminaPunto, aggiornaPunto as salvaPunto, spostaPunto } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { COLORE_TIPO, NOME_TIPO } from '../../utils/dungeon';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { puntoDaCollegare, puntoDescrittivo, puntoEnigma } from '../../../shared/spilli';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto } from '../../types';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { DettagliPunto } from './DettagliPunto';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { MappaIncorporata } from '../mappe/MappaIncorporata';
import { SpostaVociInArea } from './SpostaVociInArea';
import { NEL_CESTINO } from '../../utils/cestino';

const TIPI = Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][];
/** I limiti dell'altezza della mappa di scelta: 220 è il minimo del visore incorporato (`.visore-mappa--incorporato`), sopra i 460 non serve. */
const ALTEZZA_MINIMA = 220;
const ALTEZZA_MASSIMA = 460;

/** Il contenitore che scorre attorno all'elemento (la colonna della scheda, o l'area di lettura sul telefono). */
function contenitoreCheScorre(el: HTMLElement): HTMLElement | null {
  for (let e = el.parentElement; e; e = e.parentElement) {
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight) return e;
  }
  return null;
}

interface Props {
  area: AreaDungeonDto;
  /** Le planimetrie del Palazzo: fra queste si sceglie quella su cui toccare i pin (prima quelle dell'area). */
  planimetrie: DungeonDettaglioDto['planimetrie'];
  partitaId: number | null;
  /** La planimetria che la pagina sta mostrando: se è dell'area, la scelta parte da lì. */
  mappaAperta: string | null;
  /** Salva lo stato della voce nella partita; vero se è andato a buon fine. */
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  /** Una voce cambiata dal server (collegamento, correzione): la pagina la sostituisce senza ricaricare. */
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  /** Rilegge la scheda del Palazzo (ordine cambiato, voce aggiunta o tolta, stati uniti da un collegamento). */
  onRicarica: () => Promise<void>;
  /** Nei dedali dei Memento (099): l'area del dedalo di cui si mostrano le voci (`area.punti` le ha già filtrate) e le altre aree
   *  dello stesso dedalo, dove una voce si può spostare. Lì ogni voce ha uno stato, e i tipi sono Persona e Trama (2026-10-11). */
  areaDedalo?: { chiave: string; nome: string; altre: ReadonlyArray<{ chiave: string; nome: string }> };
  /** Nei Palazzi (2026-10-12): le aree del Palazzo, in ordine di guida, dove una voce si può spostare («Area del Palazzo»). */
  areePalazzo?: ReadonlyArray<{ chiave: string; nome: string; ordine: number }>;
}

/**
 * La guida di un'area, a scomparsa (aperta all'inizio): conteggi di voci, segnate e «da collegare», filtri per tipo e
 * «Anche le segnate» (le voci con uno stato restano nascoste salvo quella aperta), l'elenco delle voci con i passi
 * degli Enigmi annidati sotto il loro Enigma, e in fondo «Aggiungi una voce». Ogni voce si apre con un tocco: stato
 * nella partita, pin collegati, spostamento, correzione o eliminazione e la scelta dei pin sulla mappa, il cui riquadro
 * viene misurato per stare tutto nello spazio visibile e portato in vista. Ogni modifica fa rileggere la scheda.
 */
export function GuidaDellArea({ area, planimetrie, partitaId, mappaAperta, cambiaStato, onPuntoAggiornato, onRicarica, areaDedalo, areePalazzo }: Props) {
  /** Una voce descrittiva si legge e basta; nelle aree dei dedali non ce ne sono (099, scelta dell'utente: «Tutti con stato»). */
  const descrittiva = (p: PuntoInteresseDto) => puntoDescrittivo(p.tipo, p.areaDedalo);
  /** Il nome di quel che la guida mostra: l'area del dedalo o l'area del Palazzo. */
  const nomeArea = areaDedalo?.nome ?? area.nome;
  /** I tipi che una voce può avere qui (2026-10-11): fuori dai dedali tutti tranne Trama, che è solo dei Memento (lo stesso
   *  controllo lo fa il server). Nei dedali qui c'è solo la Trama, «unico tipo», e il tipo non si sceglie: le Persona hanno la
   *  loro sezione in cima all'area (`PersoneDellArea`), con la Persona scelta dal compendio. */
  const tipiAmmessi: PuntoInteresseDto['tipo'][] = areaDedalo ? ['trama'] : TIPI.filter((t) => t !== 'trama');
  const [filtro, setFiltro] = useState<Set<PuntoInteresseDto['tipo']>>(new Set());
  const [mostraGestiti, setMostraGestiti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  /** Il modulo della voce nuova: in fondo all'area, o in fondo ai passi di un Enigma (`contenitore`, 095). */
  const [nuovoPunto, setNuovoPunto] = useState<{ nome: string; tipo: PuntoInteresseDto['tipo']; contenitore: string | null } | null>(null);
  /** La voce a cui si stanno collegando i pin, e su quale planimetria. */
  const [collegando, setCollegando] = useState<{ punto: string; mappa: string | null; ricerca: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  /** Le voci scelte per spostarle insieme in un'altra area del Palazzo (2026-10-14), legate all'area in cui si è aperta la scelta:
   *  cambiando area la scelta non vale più. `spostando`: la finestra dell'area d'arrivo è aperta. */
  const [scelta, setScelta] = useState<{ area: string; chiavi: Set<string> } | null>(null);
  const [spostando, setSpostando] = useState(false);
  const scelte = scelta && scelta.area === area.chiave ? scelta.chiavi : null;
  /** Aggiunge o toglie voci dalla scelta. */
  const scegli = (chiavi: string[], dentro: boolean) => setScelta((s) => {
    const n = new Set(s && s.area === area.chiave ? s.chiavi : []);
    for (const c of chiavi) { if (dentro) n.add(c); else n.delete(c); }
    return { area: area.chiave, chiavi: n };
  });
  // La mappa di scelta si apre in fondo alla voce, spesso sotto il bordo della colonna che scorre. **Si misura** lo spazio
  // che il contenitore che scorre mostra davvero, si tolgono i comandi della scelta e lì sta la mappa, tutta; poi la si porta
  // in vista. Una formula sull'altezza della finestra non basta: a 1366×657 la colonna parte a 274 px, a 1024×690 a 305,
  // sul telefono scorre la pagina (verifica nel browser, 2026-10-01). Si rimisura quando la finestra cambia misura.
  const riquadroScelta = useRef<HTMLDivElement | null>(null);
  const puntoInScelta = collegando?.punto ?? null;
  const [altezzaScelta, setAltezzaScelta] = useState(300);
  useLayoutEffect(() => {
    if (!puntoInScelta) return;
    /** Altezza della mappa = spazio visibile del contenitore che scorre (o della finestra) meno i comandi della scelta, entro i limiti. */
    const misura = () => {
      const box = riquadroScelta.current;
      if (!box) return;
      const contenitore = contenitoreCheScorre(box);
      const visibile = contenitore ? contenitore.clientHeight : window.innerHeight;
      const mappa = box.querySelector<HTMLElement>('[data-mappa-scelta]');
      const comandi = box.getBoundingClientRect().height - (mappa?.getBoundingClientRect().height ?? 0);
      setAltezzaScelta(Math.max(ALTEZZA_MINIMA, Math.min(ALTEZZA_MASSIMA, Math.floor(visibile - comandi - 8))));
    };
    misura();
    window.addEventListener('resize', misura);
    return () => window.removeEventListener('resize', misura);
  }, [puntoInScelta]);
  useEffect(() => { if (puntoInScelta) riquadroScelta.current?.scrollIntoView?.({ block: 'nearest' }); }, [puntoInScelta, altezzaScelta]);

  // I passi di ogni Enigma (095), nel loro ordine: stanno dentro l'Enigma, non nell'elenco dell'area.
  const passiPer = useMemo(() => {
    const m = new Map<string, PuntoInteresseDto[]>();
    for (const p of area.punti) if (p.contenitore) m.set(p.contenitore, [...(m.get(p.contenitore) ?? []), p]);
    return m;
  }, [area]);
  /** Una voce si vede se passa il filtro per tipo (nessun filtro = tutti) e se non è segnata, salvo con «Anche le segnate» o se è quella aperta. */
  const voceVisibile = (p: PuntoInteresseDto) => (filtro.size === 0 || filtro.has(p.tipo)) && (mostraGestiti || !p.stato || p.chiave === selezionato);
  // in cima le voci fuori da ogni Enigma; un Enigma si vede anche quando i filtri prendono solo qualche suo passo
  const vociDellArea = area.punti.filter((p) => !p.contenitore);
  // (una nota descrittiva fra i passi non ha stato: senza filtri non basta a tenere in vista un Enigma segnato — rilievo del validatore)
  const puntiVisibili = vociDellArea.filter((p) => voceVisibile(p) || (passiPer.get(p.chiave) ?? []).some((x) => voceVisibile(x) && (filtro.size > 0 || !descrittiva(x))));
  const gestitiArea = area.punti.filter((p) => p.stato && !descrittiva(p)).length;
  /** Spostare più voci insieme (2026-10-14): nei Palazzi con più aree, se l'area ha voci; nei dedali no (lì si cambia l'area del dedalo). */
  const spostaInsieme = !areaDedalo && !!areePalazzo && areePalazzo.length > 1 && vociDellArea.length > 0;
  const tutteScelte = !!scelte && puntiVisibili.length > 0 && puntiVisibili.every((p) => scelte.has(p.chiave));
  // La voce da portare in vista dopo un «Ottenuto»/«Esaurito»: si scorre al primo disegno in cui c'è, già aperta, e poi basta.
  const daMostrare = useRef<string | null>(null);
  useEffect(() => {
    if (!daMostrare.current) return;
    const chiave = daMostrare.current;
    const voce = [...document.querySelectorAll<HTMLElement>('[data-voce]')].find((e) => e.dataset.voce === chiave);
    if (!voce) return;
    daMostrare.current = null;
    voce.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
  /**
   * «Ottenuto» o «Esaurito» (richiesta dell'utente, 2026-10-04: «quando clicco su Ottenuto deve chiudersi l'elemento corrente e
   * nascondersi, andando all'elemento successivo»; anche Esaurito, scelta sua). Salvato lo stato, la voce si chiude — e, segnata,
   * esce dall'elenco salvo «Anche le segnate» — e si apre la voce successiva da segnare: la prima dopo di lei nell'ordine
   * dell'elenco (le voci e, dentro un Enigma, i suoi passi), che passa i filtri, non è segnata e non è descrittiva. I passi
   * dell'Enigma che si sta segnando si saltano: segnandolo si segnano anche loro. Senza una voce successiva non si apre niente;
   * se il salvataggio non riesce la voce resta aperta.
   */
  const segnaEPassaOltre = async (p: PuntoInteresseDto, stato: StatoPunto) => {
    const ordine = vociDellArea.flatMap((v) => [v, ...(passiPer.get(v.chiave) ?? [])]);
    const dopo = ordine.slice(ordine.indexOf(p) + 1);
    const successiva = dopo.find((q) => !q.stato && !descrittiva(q) && q.contenitore !== p.chiave && (filtro.size === 0 || filtro.has(q.tipo))) ?? null;
    if (!(await cambiaStato(p, stato))) return;
    setCollegando(null);
    setSelezionato(successiva?.chiave ?? null);
    daMostrare.current = successiva?.chiave ?? null;
  };
  // un Enigma coi suoi passi non ha pin suoi (stanno sui passi): non è «da collegare»
  const daCollegare = area.punti.filter((p) => puntoDaCollegare(p.tipo) && p.pin.length === 0 && !passiPer.has(p.chiave)).length;
  // gli Enigmi dell'area che possono accogliere passi (non sono a loro volta passi)
  const enigmi = vociDellArea.filter((p) => puntoEnigma(p.tipo));
  // le planimetrie dell'area prima, poi il resto del Palazzo
  const opzioniMappa = useMemo(() => {
    const dellArea = new Set(area.mappe.map((m) => m.chiave));
    return [...planimetrie].sort((a, b) => Number(dellArea.has(b.chiave)) - Number(dellArea.has(a.chiave)))
      .map((p) => ({ chiave: p.chiave, nome: nomeSenzaPalazzo(p.nome), dettaglio: dellArea.has(p.chiave) ? 'di quest’area' : undefined }));
  }, [planimetrie, area.mappe]);
  /** La planimetria da cui parte la scelta dei pin di una voce. */
  const mappaIniziale = (p: PuntoInteresseDto): string | null => {
    const dellArea = area.mappe.map((m) => m.chiave);
    // dove sta già un suo pin, altrimenti la planimetria aperta (se è dell'area), altrimenti la prima dell'area o del Palazzo
    return p.pin[0]?.mappa ?? (mappaAperta && dellArea.includes(mappaAperta) ? mappaAperta : dellArea[0] ?? planimetrie[0]?.chiave ?? null);
  };

  /** Sposta la voce di un posto (su o giù) fra le sue sorelle e rilegge la scheda; l'errore va in notifica. */
  const sposta = async (p: PuntoInteresseDto, verso: -1 | 1) => {
    setOccupato(true);
    try { await spostaPunto(p.chiave, verso); await onRicarica(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Spostamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  /** Collega il pin alla voce o, se è già collegato, lo scollega; poi rilegge la scheda e notifica. */
  const scegliPin = async (p: PuntoInteresseDto, spilloId: number, nome: string) => {
    const collegato = p.pin.some((x) => x.id === spilloId);
    setOccupato(true);
    try {
      // La risposta dice i pin della voce ma non lo stato nella partita, che il collegamento può cambiare (gli stati si
      // uniscono): si rilegge la scheda con la partita, e con lei voce, raccolta, anello e visore (rilievo della revisione).
      await collegaPinAlPunto(p.chiave, spilloId, !collegato);
      await onRicarica();
      notifica('success', collegato ? `«${nome}» scollegato da «${p.nome}».` : `«${nome}» collegato a «${p.nome}».`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Collegamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  /** Chiude la scelta dei pin e rilegge la scheda. */
  const fineCollegamento = async () => { setCollegando(null); await onRicarica(); };

  /** Il modulo della voce nuova: in fondo all'area o, con `contenitore`, in fondo ai passi di un Enigma (095). */
  const moduloNuovaVoce = (n: { nome: string; tipo: PuntoInteresseDto['tipo']; contenitore: string | null }) => (
    <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
      onSubmit={(e) => { e.preventDefault(); const nome = n.nome.trim(); if (!nome) return; void creaPunto(area.chiave, { nome, tipo: n.tipo, ...(n.contenitore ? { contenitore: n.contenitore } : areaDedalo ? { areaDedalo: areaDedalo.chiave } : {}) }).then(async (nuovo) => { setNuovoPunto(null); await onRicarica(); setSelezionato(nuovo.chiave); notifica('success', n.contenitore ? `Passo «${nome}» aggiunto all’Enigma.` : `Voce «${nome}» aggiunta a ${nomeArea}.`); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Voce non aggiunta.')); }}>
      <CampoCorrezione etichetta={n.contenitore ? 'Nuovo passo' : areaDedalo ? 'Nuova voce di Trama' : 'Nuova voce'} valore={n.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => setNuovoPunto({ ...n, nome: v })} />
      {/* con un tipo solo (Trama, nei dedali) non c'è niente da scegliere */}
      {tipiAmmessi.length > 1 && <span className="min-w-[150px]">
        <Selettore etichetta="Tipo" valore={n.tipo} opzioni={tipiAmmessi.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => setNuovoPunto({ ...n, tipo: v as PuntoInteresseDto['tipo'] })} />
      </span>}
      <div className="flex gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!n.nome.trim()} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuovoPunto(null)} />
      </div>
    </form>
  );

  /** Una voce della guida, fra le sue `fratelli` (le voci dell'area, o i passi dello stesso Enigma): riga, scheda aperta e, per un
   *  Enigma, i suoi passi dentro di lui (095). */
  const riga = (p: PuntoInteresseDto, fratelli: PuntoInteresseDto[]) => {
    const indice = fratelli.indexOf(p);
    const aperto = p.chiave === selezionato;
    const scelta = collegando?.punto === p.chiave ? collegando : null;
    const passi = passiPer.get(p.chiave) ?? [];
    const conPassi = passi.length > 0;
    // l'Enigma è risolto quando i passi che si segnano sono fatti: qui quanti
    const passiDaSegnare = passi.filter((x) => !descrittiva(x));
    const passiFatti = passiDaSegnare.filter((x) => x.stato).length;
    const puoAccogliere = puntoEnigma(p.tipo) && !p.contenitore;
    // gli Enigmi di cui la voce può diventare un passo (non sé stessa; un Enigma coi suoi passi non entra in un altro; un Enigma con
    // pin non accoglie passi, come dice il server)
    const enigmiPossibili = conPassi ? [] : enigmi.filter((e) => e.chiave !== p.chiave && (e.pin.length === 0 || e.chiave === p.contenitore));
    return (
      <li key={p.chiave} data-voce={p.chiave} className={`flex flex-col gap-1 rounded-md px-1 py-2 text-[13px] ${aperto ? 'bg-primary-bg' : ''}`}>
        <button type="button" className={`touch flex items-start gap-2 text-left ${p.stato && !aperto ? 'opacity-60' : ''}`} onClick={() => { setSelezionato(aperto ? null : p.chiave); if (aperto) setCollegando(null); }} aria-expanded={aperto}>
          <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{p.nome}</span>
            <span className="text-[12px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.esauribile ? ' · esauribile' : ''}{p.stato ? ` · ${p.stato}` : ''}{passiDaSegnare.length > 0 ? ` · ${passiFatti}/${passiDaSegnare.length} passi` : ''}</span>
          </span>
          {p.pin.length > 0
            ? <span className="chip chip--icona shrink-0 text-[11px]" title={p.pin.map((x) => `${x.nome} (${nomeSenzaPalazzo(x.mappaNome)})`).join(', ')}><IconaAzione chiave="posizione" dimensione={14} />{p.pin.length === 1 ? '1 pin' : `${p.pin.length} pin`}</span>
            : puntoDaCollegare(p.tipo) && !conPassi && <span className="chip shrink-0 text-[11px] text-text-muted">da collegare</span>}
        </button>
        {aperto && (
          <div className="flex flex-col gap-1.5 pl-5">
            {p.descrizione && <p className="m-0 whitespace-pre-wrap text-text-secondary">{p.descrizione}</p>}
            <DettagliPunto d={p.dettagli} />
            {conPassi && <p className="m-0 text-[11px] text-text-muted">Risolto quando i suoi passi sono fatti: segnarlo li segna tutti, riaprirlo li riapre. I pin stanno sui passi.</p>}
            {p.pin.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Pin collegati a ${p.nome}`}>
                {p.pin.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 text-[12px]">
                    <IconaAzione chiave="posizione" dimensione={16} />
                    <span className="min-w-0 flex-1">{x.nome} <span className="text-text-muted">· {nomeSenzaPalazzo(x.mappaNome)}</span></span>
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={18} />} titolo="Scollega" aria-label={`Scollega ${x.nome} da ${p.nome}`} disabled={occupato} onClick={() => void scegliPin(p, x.id, x.nome)} />
                  </li>
                ))}
              </ul>
            )}
            {/* una voce descrittiva (solo «Altro») si legge e basta: niente stato, niente pin (scelta dell'utente) */}
            {descrittiva(p)
              ? <p className="m-0 text-[11px] text-text-muted">Voce descrittiva: si legge, non si segna e non ha pin.</p>
              : <div className="flex flex-wrap items-center gap-1.5">
                {partitaId && p.stato !== 'ottenuto' && <button type="button" className="btn btn-primary btn-sm touch" onClick={() => void segnaEPassaOltre(p, 'ottenuto')}>Ottenuto</button>}
                {partitaId && p.esauribile && p.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void segnaEPassaOltre(p, 'esaurito')} />}
                {partitaId && p.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void cambiaStato(p, null)} />}
              </div>}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* nei dedali niente pin da collegare: i piani si generano a caso (2026-10-11) */}
              {!areaDedalo && !descrittiva(p) && !conPassi && <PulsanteVisivo tono={scelta ? 'primario' : 'secondario'} compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo={scelta ? 'Chiudi la mappa' : 'Collega pin'}
                aria-expanded={!!scelta} disabled={planimetrie.length === 0}
                onClick={() => (scelta ? void fineCollegamento() : setCollegando({ punto: p.chiave, mappa: mappaIniziale(p), ricerca: '' }))} />}
              {puoAccogliere && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un passo" aria-label={`Aggiungi un passo a ${p.nome}`}
                disabled={p.pin.length > 0} title={p.pin.length > 0 ? 'Scollega prima i pin dell’Enigma: i pin stanno sui passi' : undefined}
                onClick={() => setNuovoPunto({ nome: '', tipo: 'meccanismo', contenitore: p.chiave })} />}
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su: ${p.nome}`} disabled={occupato || indice <= 0} onClick={() => void sposta(p, -1)} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù: ${p.nome}`} disabled={occupato || indice >= fratelli.length - 1} onClick={() => void sposta(p, 1)} />
              <CorrezioneGuida key={p.chiave} cosa={`la voce «${p.nome}»`} compatto etichetta="Modifica"
                iniziale={() => ({ nome: p.nome, descrizione: p.descrizione, tipo: p.tipo as string, esauribile: p.esauribile ? 'sì' : 'no', contenitore: p.contenitore ?? '', areaDedalo: p.areaDedalo ?? '', area: area.chiave })}
                onSalva={async (b) => {
                  // un'altra area del Palazzo (2026-10-12): solo per una voce fuori da ogni Enigma, come l'area del dedalo
                  const altrove = !!areePalazzo && !b.contenitore && b.area !== area.chiave ? areePalazzo.find((a) => a.chiave === b.area) ?? null : null;
                  onPuntoAggiornato(await salvaPunto(p.chiave, { nome: b.nome, descrizione: b.descrizione, tipo: b.tipo as PuntoInteresseDto['tipo'], esauribile: b.esauribile === 'sì', ...(b.contenitore !== (p.contenitore ?? '') ? { contenitore: b.contenitore || null } : {}),
                  // un'altra area del dedalo (099): solo per una voce fuori da ogni Enigma (un passo sta nell'area del suo Enigma)
                  ...(areaDedalo && !b.contenitore && b.areaDedalo && b.areaDedalo !== (p.areaDedalo ?? '') ? { areaDedalo: b.areaDedalo } : {}),
                  ...(altrove ? { area: altrove.chiave } : {}) }));
                  if (altrove) { setSelezionato(null); notifica('success', `«${b.nome.trim() || p.nome}» spostata in ${altrove.ordine + 1}. ${altrove.nome}${conPassi ? ', con i suoi passi' : ''}.`); }
                  await onRicarica(); }}
                elimina={{ avviso: `${conPassi ? 'Se ne va dalla guida per tutte le partite, con quel che ne avevano segnato. I suoi passi restano, voci dell’area con il loro stato.' : 'Se ne va dalla guida per tutte le partite, con quel che ne avevano segnato. I pin collegati restano sulla mappa, col loro «raccolto».'} ${NEL_CESTINO}`, onElimina: async () => { await eliminaPunto(p.chiave); setSelezionato(null); setCollegando(null); await onRicarica(); } }}>
                {(b, cambia) => <>
                  <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => cambia({ nome: v })} />
                  {tipiAmmessi.length > 1 && <span className="min-w-[150px]">
                    {/* un Enigma coi suoi passi resta un Enigma: il server lo rifiuta, qui non lo si offre */}
                    <Selettore etichetta="Tipo" valore={b.tipo} opzioni={(conPassi ? tipiAmmessi.filter(puntoEnigma) : tipiAmmessi).map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => cambia({ tipo: v })} />
                  </span>}
                  {(enigmiPossibili.length > 0 || p.contenitore) && <span className="min-w-[180px]">
                    <Selettore etichetta="Passo di" valore={b.contenitore} opzioni={[{ chiave: '', nome: '— nessun Enigma (voce dell’area) —' }, ...enigmiPossibili.map((e) => ({ chiave: e.chiave, nome: e.nome }))]} onCambia={(v) => cambia({ contenitore: v })} />
                  </span>}
                  {/* l'area del dedalo (099): una voce fuori da ogni Enigma passa in un'altra area dello stesso dedalo, coi passi se è un Enigma */}
                  {areaDedalo && areaDedalo.altre.length > 0 && !b.contenitore && <span className="min-w-[180px]">
                    <Selettore etichetta="Area del dedalo" valore={b.areaDedalo} opzioni={[{ chiave: areaDedalo.chiave, nome: areaDedalo.nome, dettaglio: 'questa' }, ...areaDedalo.altre.map((a) => ({ chiave: a.chiave, nome: a.nome }))]} onCambia={(v) => cambia({ areaDedalo: v })} />
                  </span>}
                  {/* l'area del Palazzo (2026-10-12): una voce fuori da ogni Enigma passa in fondo a un'altra area, coi passi se è un Enigma */}
                  {areePalazzo && areePalazzo.length > 1 && !b.contenitore && <span className="min-w-[200px]">
                    <Selettore etichetta="Area del Palazzo" valore={b.area} opzioni={[...areePalazzo].sort((x, y) => x.ordine - y.ordine).map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}`, dettaglio: a.chiave === area.chiave ? 'questa' : undefined }))} onCambia={(v) => cambia({ area: v })} />
                  </span>}
                  <label className="touch flex items-center gap-1.5 text-[12px]">
                    <input type="checkbox" className="h-5 w-5" checked={b.esauribile === 'sì'} onChange={(e) => cambia({ esauribile: e.target.checked ? 'sì' : 'no' })} />Esauribile
                  </label>
                  <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.punto.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                </>}
              </CorrezioneGuida>
            </div>
            {scelta && (
              <div ref={riquadroScelta} className="scelta-pin" role="group" aria-label={`Scelta dei pin per ${p.nome}`}>
                <p className="m-0 text-[11px] leading-tight" title="Tocca un pin sulla mappa per collegarlo alla voce, toccalo di nuovo per scollegarlo">Tocca i pin da collegare · <strong>{p.pin.length === 1 ? '1 collegato' : `${p.pin.length} collegati`}</strong></p>
                <Selettore etichetta="Planimetria" valore={scelta.mappa ?? ''} opzioni={opzioniMappa}
                  onCambia={(k) => setCollegando({ ...scelta, mappa: k })} />
                <div className="flex items-center gap-1.5">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Cerca un pin sulla mappa</span>
                    <input type="search" className="form-input" placeholder="Cerca un pin…" value={scelta.ricerca} onChange={(e) => setCollegando({ ...scelta, ricerca: e.target.value })} />
                  </label>
                  <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Fatto" onClick={() => void fineCollegamento()} />
                </div>
                {scelta.mappa && <div data-mappa-scelta style={{ height: altezzaScelta }}>
                  <MappaIncorporata key={scelta.mappa} chiave={scelta.mappa} partitaId={partitaId} conEditor={false} altezza={altezzaScelta}
                    scelta={{ titolo: p.nome, scelti: new Set(p.pin.map((x) => x.id)), occupato, ricerca: scelta.ricerca, onScegli: (s) => void scegliPin(p, s.id, s.nome) }} />
                </div>}
              </div>
            )}
          </div>
        )}
        {/* i passi dell'Enigma, dentro di lui: ognuno è una voce vera, coi suoi pin e il suo stato */}
        {puoAccogliere && (conPassi || nuovoPunto?.contenitore === p.chiave) && (
          <div className="ml-5 mt-1 flex flex-col gap-1 border-l-2 border-border-light pl-2">
            <p className="m-0 text-[11px] text-text-muted">Passi dell’Enigma</p>
            <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`Passi di ${p.nome}`}>
              {passi.filter(voceVisibile).map((x) => riga(x, passi))}
            </ul>
            {nuovoPunto?.contenitore === p.chiave && moduloNuovaVoce(nuovoPunto)}
          </div>
        )}
      </li>
    );
  };

  return (
    <details className="text-[12px]" open aria-label={`Guida di ${nomeArea}`}>
      <summary className="touch cursor-pointer text-text-muted">
        {areaDedalo ? 'Trama' : 'Guida dell’area'} · {area.punti.length === 1 ? '1 voce' : `${area.punti.length} voci`}{gestitiArea > 0 ? ` (${gestitiArea} segnate)` : ''}{daCollegare > 0 ? ` · ${daCollegare} da collegare` : ''}
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <p className="m-0 text-[11px] text-text-muted">
          {areaDedalo
            ? 'Le voci di Trama si segnano e sono elementi dell’area: l’area è completata quando lo sono tutti i suoi elementi.'
            : 'Una voce collegata ai pin ha il loro stato; le altre si segnano qui e non contano nella percentuale, che misura le planimetrie.'}
        </p>
        {area.punti.length > 0 && (gestitiArea > 0 || !areaDedalo) && (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={areaDedalo ? 'Filtri' : 'Filtri per tipo'}>
            {/* con un tipo solo (Trama, nei dedali) i filtri per tipo non servono: resta «Anche le segnate» */}
            {!areaDedalo && TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
              <button key={tp} type="button" className={`chip touch text-[11px] ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />{NOME_TIPO[tp]} ({area.punti.filter((p) => p.tipo === tp).length})
              </button>
            ))}
            {filtro.size > 0 && <button type="button" className="chip touch text-[11px]" onClick={() => setFiltro(new Set())}>Tutti</button>}
            {gestitiArea > 0 && <button type="button" className={`chip touch text-[11px] ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Anche le segnate ({gestitiArea})</button>}
          </div>
        )}
        {/* più voci insieme in un'altra area del Palazzo (2026-10-14): fuori dalla scelta un comando solo; nella scelta la barra, che
            resta in vista scorrendo, col conto e i comandi */}
        {spostaInsieme && !scelte && (
          <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta voci in un’altra area"
            aria-label="Scegli voci da spostare in un’altra area del Palazzo" disabled={occupato}
            onClick={() => { setSelezionato(null); setCollegando(null); setNuovoPunto(null); setScelta({ area: area.chiave, chiavi: new Set() }); }} />
        )}
        {scelte && (
          <section className="@container card sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2" aria-label="Sposta voci in un’altra area">
            {/* la guida sta in una colonna anche stretta (308 px a 1280): conta la larghezza della barra, non della finestra. I comandi
                non si restringono mai; sotto i 32rem «Fine» sta accanto al conto e «Tutte» / «Sposta in…» prendono la riga sotto, così
                la barra fissa resta di due righe; sopra, una riga sola */}
            <span className="min-w-0 flex-1 text-[13px]"><strong>{scelte.size === 0 ? 'Scegli le voci' : scelte.size === 1 ? '1 voce scelta' : `${scelte.size} voci scelte`}</strong>
              <span className="text-text-muted"> · da spostare in un’altra area</span></span>
            <div className="order-last flex basis-full gap-2 @lg:order-none @lg:basis-auto">
              {puntiVisibili.length > 0 && <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave={tutteScelte ? 'deseleziona' : 'seleziona'} dimensione={20} />} titolo={tutteScelte ? 'Nessuna' : 'Tutte'}
                aria-label={tutteScelte ? 'Togli dalla scelta tutte le voci in elenco' : 'Scegli tutte le voci in elenco'} onClick={() => scegli(puntiVisibili.map((p) => p.chiave), !tutteScelte)} />}
              <PulsanteVisivo tono="primario" compatto className="shrink-0" icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta in…" disabled={scelte.size === 0} onClick={() => setSpostando(true)} />
            </div>
            <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Fine" aria-label="Esci dalla scelta" onClick={() => setScelta(null)} />
          </section>
        )}
        <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={scelte ? `Voci di ${nomeArea} da scegliere` : `Voci della guida di ${nomeArea}`}>
          {area.punti.length === 0 && <li className="py-2 text-[13px] text-text-muted">{areaDedalo ? 'Quest’area non ha ancora voci: aggiungile qui sotto.' : 'La guida non ha voci per quest’area: aggiungile qui sotto.'}</li>}
          {area.punti.length > 0 && puntiVisibili.length === 0 && <li className="py-2 text-[13px] text-text-muted">Nessuna voce con questi filtri{!mostraGestiti && gestitiArea > 0 ? ` (${gestitiArea} segnate nascoste)` : ''}.</li>}
          {/* nella scelta le voci sono righe da spuntare (i passi seguono il loro Enigma e non si scelgono): niente scheda né gesti */}
          {scelte
            ? puntiVisibili.map((p) => {
              const passi = passiPer.get(p.chiave)?.length ?? 0;
              return (
                <li key={p.chiave}>
                  <label className="touch flex cursor-pointer items-start gap-2.5 px-1 py-1.5 text-[13px]">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={scelte.has(p.chiave)} onChange={(e) => scegli([p.chiave], e.target.checked)} />
                    <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.nome}</span>
                      <span className="text-[12px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.stato ? ` · ${p.stato}` : ''}{passi > 0 ? ` · con ${passi === 1 ? '1 passo' : `${passi} passi`}` : ''}{p.pin.length > 0 ? ` · ${p.pin.length} pin` : ''}</span>
                    </span>
                  </label>
                </li>
              );
            })
            : puntiVisibili.map((p) => riga(p, vociDellArea))}
        </ul>
        {spostando && scelte && areePalazzo && (
          <SpostaVociInArea voci={vociDellArea.filter((p) => scelte.has(p.chiave))} passi={vociDellArea.filter((p) => scelte.has(p.chiave)).reduce((n, p) => n + (passiPer.get(p.chiave)?.length ?? 0), 0)}
            area={areePalazzo.find((a) => a.chiave === area.chiave) ?? { chiave: area.chiave, nome: area.nome, ordine: area.ordine }} aree={areePalazzo}
            onChiudi={() => setSpostando(false)} onFatto={async () => { setScelta(null); await onRicarica(); }} />
        )}
        {/* La guida non ha trascritto tutto: quel che manca si aggiunge qui, dove lo si è cercato; poi si sposta dove va. */}
        {scelte ? null : nuovoPunto && !nuovoPunto.contenitore
          ? moduloNuovaVoce(nuovoPunto)
          : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una voce" className="self-start" aria-label={areaDedalo ? `Aggiungi una voce di Trama in ${nomeArea}` : undefined} onClick={() => setNuovoPunto({ nome: '', tipo: areaDedalo ? 'trama' : 'altro', contenitore: null })} />}
      </div>
    </details>
  );
}
