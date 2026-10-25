// ============================================================
// NegozioPage — scheda di un negozio: sede, orari, gestore/Confidente, programma punti, articoli con filtri e spunta «acquistato», rimossi
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questi sono quelli di react-router-dom, tranne dentro il pannello
import { useParams } from '../components/scheda/routerScheda';
import { Navigate } from '../components/scheda/NavigateScheda';
import { getElementoCatalogo, getNegozio } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ListinoNegozio } from '../components/negozi/ListinoNegozio';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import type { ElementoCatalogoDto } from '../types';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { urlLuogo } from '../utils/citta';
import { PulsanteGuidaQuiz } from '../components/guida/GuidaQuiz';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';

/**
 * Scheda di un negozio presa dalla chiave nell'URL: carica il negozio per la partita attiva
 * (ricaricando al cambio di giorno, fascia o meteo) e mostra intestazione, sede, orari, gestore,
 * programma punti, requisiti se non è disponibile, i comandi per aggiungere un articolo o
 * correggere il negozio, e a due colonne la mappa e la merce con i filtri, la spunta
 * «acquistato» (che aggiorna anche il conteggio) e gli articoli nascosti di questo negozio.
 */
export function NegozioPage() {
  const { chiave = '' } = useParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // giorno corrente e fascia della giornata decidono la disponibilità: al cambio si ricarica
  const momento = `${attiva?.dataGioco ?? ''}|${attiva?.fasciaGioco ?? ''}|${attiva?.meteoOra ?? ''}`;
  const dati = useCarica(() => getNegozio(chiave, partitaId ?? undefined), [chiave, partitaId, momento]);
  const n = dati.dati;
  useDocumentTitle(n?.nome ?? 'Negozio');
  // aggiunte dell'utente al catalogo: nuovo articolo di questo negozio, o correzione del negozio stesso (16.1)
  const [modulo, setModulo] = useState<'articolo' | 'negozio' | null>(null);
  const [elementoArticolo, setElementoArticolo] = useState<ElementoCatalogoDto | null>(null);
  const [elementoNegozio, setElementoNegozio] = useState<ElementoCatalogoDto | null>(null);
  // Ogni salvataggio (anche «Nascondi») ricarica la scheda e, con questa, il blocco «Rimossi».
  const [versione, setVersione] = useState(0);
  /** Dopo un salvataggio dal modulo: lo chiude, fa rileggere il blocco «Rimossi» e ricarica la scheda. */
  const salvato = () => { setModulo(null); setVersione((v) => v + 1); void dati.ricarica(); };
  /** Carica dal catalogo l'articolo da correggere e apre il modulo su di lui; se il caricamento fallisce lo notifica. */
  const apriArticolo = (chiaveArticolo: string) => {
    void getElementoCatalogo('articolo', chiaveArticolo).then((e) => { setElementoArticolo(e); setModulo('articolo'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.'));
  };
  // L5 (F4, R5-10): un negozio con una sede vive nella pagina del suo luogo, nella sua sezione (`#negozio-<chiave>`): ogni collegamento
  // di prima ci arriva da qui; i negozi senza sede (Tanaka, TV, il Palazzo di Niijima) restano in questa pagina
  if (n?.sedeCasa) return <Navigate to={n.sedeCasa} replace />;
  return (
    <PageState isLoading={dati.caricamento && !n} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {n && (
        <div className="negozio-pagina flex flex-col gap-3">
          {/* Lotto B: l'intestazione comune delle schede; «Aggiungi un articolo» e «Correggi il negozio» nel menu «Modifica ⋯» */}
          <IntestazioneScheda ripiego="/guida/negozi" titolo={n.nome}
            chip={<>
              <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
              {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
              <ChipDisponibilita disponibilita={n.disponibilita} />
            </>}
            azioni={<MenuModifica cosa={`il negozio «${n.nome}»`}>
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi un articolo" dettaglio="a questo negozio" onClick={() => { setElementoArticolo(null); setModulo('articolo'); }} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Correggi il negozio" onClick={() => { void getElementoCatalogo('negozio', chiave).then((e) => { setElementoNegozio(e); setModulo('negozio'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.')); }} />
            </MenuModifica>}>
            {/* Sede, orari, gestore, programma punti: tutto ciò che il negozio è. Lo sblocco della merce
                sta sugli articoli, e la fonte non è un dato del gioco. */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 testo-13 text-text-secondary">
              {/* La sede apre la pagina del quartiere con il luogo evidenziato (`#luogo-…`); senza quartiere
                  resta l'indicazione testuale («Online, dal laptop di Leblanc»). */}
              {(n.sedeChiave || n.luogoChiave || n.luogo) && <span><strong className="text-text">Dove:</strong> {n.sedeChiave && n.luogoChiave ? <Link to={urlLuogo(n.sedeChiave)}>{n.sedeNome ?? n.sedeChiave}</Link> : null}{n.sedeChiave && n.luogoChiave ? ' · ' : ''}{n.luogoChiave && <Link to={`/guida/citta/${n.luogoChiave}`}>{n.quartiereNome ?? n.luogoChiave}</Link>}{n.luogo && !n.sedeChiave ? `${n.luogoChiave ? ' · ' : ''}${n.luogo}` : ''}</span>}
              <span><strong className="text-text">Orari:</strong> {n.orariTesto}</span>
              {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
              {/* la guida del quiz dei lavori che si fanno qui (il Triple Seven): in oro se oggi, nella partita, c'è il quiz */}
              {n.quiz.map((q) => <PulsanteGuidaQuiz key={q.attivita} voce={q} />)}
              {n.programmaPunti && <span><strong className="text-text">Programma punti:</strong> {n.programmaPunti.nome} ({n.programmaPunti.unita}{n.programmaPunti.calcolo === 'rango-cliente' ? ', dal rango cliente' : ', si segnano a mano'})</span>}
            </div>
            <p className="m-0 testo-12 text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
          </IntestazioneScheda>
          {/* i requisiti mancanti fuori dall'intestazione, che resta entro il 30% della schermata (LAY3-5): possono essere lunghi */}
          {n.disponibilita && n.disponibilita.stato !== 'disponibile' && n.disponibilita.requisiti.length > 0 && (
            <section className="card flex min-w-0 flex-col gap-1" aria-label="Requisiti del negozio">
              <TitoloSezione>Per sbloccarlo</TitoloSezione>
              <ul className="m-0 pl-4 testo-13 text-text-secondary">{n.disponibilita.requisiti.map((r, i) => <li key={i}>{r.testo} — {r.dettaglio}</li>)}</ul>
            </section>
          )}
          {modulo === 'articolo' && <ModuloCatalogo tipo="articolo" elemento={elementoArticolo} negozioChiave={chiave} onChiudi={() => setModulo(null)} onSalvato={salvato} />}
          {modulo === 'negozio' && elementoNegozio && <ModuloCatalogo tipo="negozio" elemento={elementoNegozio} onChiudi={() => setModulo(null)} onSalvato={salvato} />}
          {n.note && <section className="card flex min-w-0 flex-col gap-1" aria-label="Note del negozio">
            <TitoloSezione>Note del negozio</TitoloSezione>
            <TestoRipiegabile key={n.chiave} testo={n.note} massimo={140} className="min-w-0 whitespace-pre-line break-words testo-13 text-text-secondary" />
          </section>}
          {/* Due colonne su schermo largo: la mappa da una parte, la merce dall'altra; sotto i 1024 px una colonna. */}
          <div className="negozio-corpo">
            <div className="negozio-mappa">
              <DoveSiTrova tipo="negozio" chiave={n.chiave} altezza="var(--altezza-tela-negozio)" />
            </div>
            <div className="negozio-merce">
              {/* L5: lo stesso listino della pagina del luogo */}
              <ListinoNegozio negozio={n} partitaId={partitaId} versione={versione} onModifica={apriArticolo} onRipristinato={() => void dati.ricarica()}
                onCambiato={(a) => dati.imposta((attuale) => ({ ...attuale, articoliElenco: attuale.articoliElenco.map((x) => (x.chiave === a.chiave ? a : x)), acquistati: attuale.articoliElenco.filter((x) => (x.chiave === a.chiave ? a.acquistato : x.acquistato)).length }))} />
            </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
