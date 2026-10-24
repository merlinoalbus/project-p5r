// ============================================================
// TraduzioniEditor — consultazione e modifica delle rese italiane
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { aggiornaTraduzione, getAmbitiTraduzioni, getTraduzioni, ripristinaTraduzione } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import type { TraduzioneDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const NOMI_AMBITO: Record<string, string> = {
  arcana: 'Arcani', elementoSkill: 'Elementi delle skill', elementoAffinita: 'Elementi delle affinità', affinita: 'Codici di affinità',
  tipoEredita: 'Tipi di eredità', colonnaEredita: 'Colonne di eredità', statistica: 'Statistiche', tipoOggetto: 'Categorie di oggetti',
  vincoloOggetto: 'Vincoli degli oggetti', areaMementos: 'Dedali dei Memento', doteSociale: 'Doti sociali', notaPersona: 'Note delle Persona',
  fonteEsclusiva: 'Fonti esclusive', effettoSkill: 'Effetti delle skill', descrizioneOggetto: 'Descrizioni degli oggetti',
  negoziazione: 'Titoli di negoziazione', fonteCarta: 'Fonti delle carte abilità',
  skill: 'Nomi delle skill', persona: 'Nomi delle Persona', oggetto: 'Nomi dell’equipaggiamento', termine: 'Termini di gioco',
};

interface PropsTraduzioniEditor {
  /** Ambito e testo di partenza (da un collegamento, per esempio quello della scheda di una skill): l'editor si apre già filtrato e la pagina scorre fino a qui. */
  ambitoIniziale?: string;
  qIniziale?: string;
}

/** Editor: scegli l'ambito, cerca, modifica in linea, ripristina il testo del seed. */
export function TraduzioniEditor({ ambitoIniziale, qIniziale }: PropsTraduzioniEditor = {}) {
  const ambiti = useCarica(() => getAmbitiTraduzioni(), []);
  const [ambito, setAmbito] = useState(ambitoIniziale ?? 'arcana');
  const [q, setQ] = useState(qIniziale ?? '');
  // Con un filtro di partenza la pagina scorre fino a qui. Le sezioni sopra si caricano dopo e spostano la pagina: finché l'utente non scorre da sé
  // o non passano alcuni secondi, a ogni cambio di altezza si scorre di nuovo alla sezione (stesso criterio di «Nascosti dalla guida»).
  const sezione = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sezione.current;
    if (!ambitoIniziale || !el) return;
    const vai = () => el.scrollIntoView?.({ block: 'start' });
    vai();
    let attivo = true;
    const basta = () => { attivo = false; osservatore?.disconnect(); };
    const osservatore = typeof ResizeObserver === 'function' && el.parentElement ? new ResizeObserver(() => { if (attivo) vai(); }) : null;
    if (el.parentElement) osservatore?.observe(el.parentElement);
    const fine = window.setTimeout(basta, 4000);
    const eventi = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const e of eventi) window.addEventListener(e, basta, { passive: true, once: true });
    return () => { window.clearTimeout(fine); basta(); for (const e of eventi) window.removeEventListener(e, basta); };
  }, [ambitoIniziale, qIniziale]);
  const [soloUtente, setSoloUtente] = useState(false);
  const voci = useCarica(() => getTraduzioni({ ambito, q: q.trim() || undefined, soloUtente: soloUtente || undefined }), [ambito, q, soloUtente]);
  const [inModifica, setInModifica] = useState<TraduzioneDto | null>(null);
  const [testo, setTesto] = useState('');
  const [testoNuovo, setTestoNuovo] = useState('');
  const ricaricaGlossario = useGlossarioStore((s) => s.ricarica);
  // Se l'indirizzo cambia mentre l'editor è già aperto (un altro collegamento «Modifica la traduzione»), il filtro si riapplica
  // (si aggiusta lo stato durante il render, confrontando con l'indirizzo già applicato: niente effetto con setState)
  const [indirizzoApplicato, setIndirizzoApplicato] = useState(`${ambitoIniziale ?? ''}|${qIniziale ?? ''}`);
  if (indirizzoApplicato !== `${ambitoIniziale ?? ''}|${qIniziale ?? ''}`) {
    setIndirizzoApplicato(`${ambitoIniziale ?? ''}|${qIniziale ?? ''}`);
    if (ambitoIniziale) {
      setAmbito(ambitoIniziale);
      setQ(qIniziale ?? '');
      setSoloUtente(false);
      setInModifica(null);
      setTestoNuovo('');
    }
  }
  // Il testo cercato dal collegamento non ha ancora una riga di traduzione (solo per gli effetti delle skill, dove il server ne crea una al primo salvataggio):
  // l'editor mostra la voce «nessuna resa» con il campo già pronto per scriverla
  const mancante: TraduzioneDto | null = ambitoIniziale === 'effettoSkill' && qIniziale && ambito === ambitoIniziale && q === qIniziale && !soloUtente
    && voci.dati && !voci.caricamento && !voci.dati.some((v) => v.chiave === qIniziale)
    ? { ambito, chiave: qIniziale, testo: '', extra: null, fonte: 'seed', updatedAt: '' }
    : null;

  /**
   * Salva il testo `nuovo` della voce o, se manca, la riporta al testo del seed; poi sostituisce la voce
   * nell'elenco, chiude la modifica e ricarica glossario e conteggi degli ambiti.
   */
  const applica = async (t: TraduzioneDto, nuovo?: string) => {
    try {
      const agg = nuovo === undefined ? await ripristinaTraduzione(t.ambito, t.chiave) : await aggiornaTraduzione(t.ambito, t.chiave, nuovo);
      // dai dati correnti (forma funzionale): la risposta arriva dopo un `await`, e un'altra voce salvata nel frattempo si perderebbe
      // una riga creata da te (non esisteva nella guida) con «Ripristina» sparisce; una scritta per la prima volta si aggiunge all'elenco
      voci.imposta((correnti) => (agg.rimossa
        ? correnti.filter((v) => v.chiave !== agg.chiave)
        : correnti.some((v) => v.chiave === agg.chiave) ? correnti.map((v) => (v.chiave === agg.chiave ? agg : v)) : [...correnti, agg]));
      setInModifica(null);
      setTestoNuovo('');
      void ricaricaGlossario();
      void ambiti.ricarica();
      notifica('success', agg.rimossa ? 'Resa tolta: il testo torna senza traduzione.' : nuovo === undefined ? 'Testo del seed ripristinato.' : 'Traduzione salvata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    }
  };

  return (
    <section ref={sezione} id="traduzioni" className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Traduzioni</h2>
      <p className="m-0 text-[13px] text-text-secondary">Le rese italiane dei termini di gioco. Le voci modificate da te non vengono mai sovrascritte dagli aggiornamenti del dataset; "Ripristina" riporta il testo del seed.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Selettore compatto className="min-w-[220px]" etichetta="Ambito" valore={ambito} opzioni={(ambiti.dati ?? []).map((a) => ({ chiave: a.ambito, nome: NOMI_AMBITO[a.ambito] ?? a.ambito, dettaglio: `${a.voci}${a.modificate ? `, ${a.modificate} mod.` : ''}` }))} onCambia={setAmbito} />
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca chiave o testo…" />
        <button type="button" className={`chip touch ${soloUtente ? 'chip--attivo' : ''}`} onClick={() => setSoloUtente((v) => !v)} aria-pressed={soloUtente}>Solo modificate</button>
      </div>
      <PageState isLoading={voci.caricamento} error={voci.errore} onRetry={() => void voci.ricarica()}>
        <ul className="m-0 p-0 list-none divide-y divide-border-light max-h-[60vh] area-scorrevole">
          {mancante && (
            <li className="py-2 flex flex-col gap-1" aria-label="Testo senza resa italiana">
              <div className="text-[12px] text-text-muted break-words">{mancante.chiave}</div>
              <div className="flex gap-2 items-start flex-wrap">
                <span className="chip">nessuna resa</span>
                <textarea className="form-input min-h-[44px] flex-1 min-w-[200px]" aria-label="Resa italiana" placeholder="Scrivi la resa italiana…" value={testoNuovo} onChange={(e) => setTestoNuovo(e.target.value)} autoFocus />
                <button type="button" className="btn btn-primary btn-sm touch" disabled={!testoNuovo.trim()} onClick={() => void applica(mancante, testoNuovo.trim())}>Salva</button>
              </div>
            </li>
          )}
          {(voci.dati ?? []).map((t) => (
            <li key={t.chiave} className="py-2 flex flex-col gap-1">
              <div className="text-[12px] text-text-muted break-words">{t.chiave}</div>
              {inModifica?.chiave === t.chiave ? (
                <div className="flex gap-2 items-start">
                  <textarea className="form-input min-h-[44px]" value={testo} onChange={(e) => setTesto(e.target.value)} autoFocus />
                  <button type="button" className="btn btn-primary btn-sm" disabled={!testo.trim()} onClick={() => void applica(t, testo.trim())}>Salva</button>
                  <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setInModifica(null)} />
                </div>
              ) : (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="flex-1 text-[14px]">{t.testo}</span>
                  {t.fonte === 'utente' && <span className="chip chip--attivo">modificata</span>}
                  <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={() => { setInModifica(t); setTesto(t.testo); }} />
                  {t.fonte === 'utente' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Ripristina" onClick={() => void applica(t)} />}
                </div>
              )}
            </li>
          ))}
          {voci.dati && voci.dati.length === 0 && !mancante && <li className="py-3 text-[13px] text-text-muted">Nessuna voce.</li>}
        </ul>
      </PageState>
    </section>
  );
}
