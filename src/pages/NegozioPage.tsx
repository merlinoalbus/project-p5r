// ============================================================
// NegozioPage — scheda di un negozio: sede, orari, gestore/Confidente, programma punti, articoli con filtri e spunta «acquistato», rimossi
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getElementoCatalogo, getNegozio } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_TIPO_NEGOZIO } from '../utils/negozi';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ElementiRimossi } from '../components/guida/ElementiRimossi';
import { FiltriArticoli } from '../components/guida/FiltriArticoli';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { FILTRO_VUOTO, categoriePresenti, destinatariPresenti, filtraArticoli, type FiltroArticoli as Filtro } from '../utils/articoli';
import type { ElementoCatalogoDto } from '../types';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';
import { ancoraLuogo } from '../utils/citta';

export function NegozioPage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // giorno corrente e fascia della giornata decidono la disponibilità: al cambio si ricarica
  const momento = `${attiva?.dataGioco ?? ''}|${attiva?.fasciaGioco ?? ''}`;
  const dati = useCarica(() => getNegozio(chiave, partitaId ?? undefined), [chiave, partitaId, momento]);
  const n = dati.dati;
  useDocumentTitle(n?.nome ?? 'Negozio');
  const [filtro, setFiltro] = useState<Filtro>({ ...FILTRO_VUOTO });
  // aggiunte dell'utente al catalogo: nuovo articolo di questo negozio, o correzione del negozio stesso (16.1)
  const [modulo, setModulo] = useState<'articolo' | 'negozio' | null>(null);
  const [elementoArticolo, setElementoArticolo] = useState<ElementoCatalogoDto | null>(null);
  const [elementoNegozio, setElementoNegozio] = useState<ElementoCatalogoDto | null>(null);
  // Ogni salvataggio (anche «Nascondi») ricarica la scheda e, con questa, il blocco «Rimossi».
  const [versione, setVersione] = useState(0);
  const salvato = () => { setModulo(null); setVersione((v) => v + 1); void dati.ricarica(); };
  const articoli = useMemo(() => n?.articoliElenco ?? [], [n]);
  const categorie = useMemo(() => categoriePresenti(articoli), [articoli]);
  const destinatari = useMemo(() => destinatariPresenti(articoli), [articoli]);
  // Anche un articolo non ancora acquistabile resta consultabile con condizioni e semaforo.
  const visibili = useMemo(() => filtraArticoli(articoli, filtro, partitaId !== null), [articoli, filtro, partitaId]);
  const apriArticolo = (chiaveArticolo: string) => {
    void getElementoCatalogo('articolo', chiaveArticolo).then((e) => { setElementoArticolo(e); setModulo('articolo'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.'));
  };
  return (
    <PageState isLoading={dati.caricamento && !n} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {n && (
        <div className="negozio-pagina flex flex-col gap-3">
          <button type="button" className="btn btn-ghost btn-sm self-start touch" onClick={() => navigate('/guida/negozi')}><IconChevronLeft size={16} /> Negozi</button>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="titolo-display m-0">{n.nome}</h1>
              <span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span>
              {n.confidente && <Link to={`/confidenti/${n.confidente.chiave}`} className="chip chip--attivo no-underline">{n.confidente.nome}</Link>}
              <ChipDisponibilita disponibilita={n.disponibilita} />
            </div>
            {/* Sede, orari, gestore, programma punti: tutto ciò che il negozio è. Lo sblocco della merce
                sta sugli articoli, e la fonte non è un dato del gioco. */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-text-secondary">
              {/* La sede apre la pagina del quartiere con il luogo evidenziato (`#luogo-…`); senza quartiere
                  resta l'indicazione testuale («Online, dal laptop di Leblanc»). */}
              {(n.sedeChiave || n.luogoChiave || n.luogo) && <span><strong className="text-text">Dove:</strong> {n.sedeChiave && n.luogoChiave ? <Link to={`/guida/citta/${n.luogoChiave}#${ancoraLuogo(n.sedeChiave)}`}>{n.sedeNome ?? n.sedeChiave}</Link> : null}{n.sedeChiave && n.luogoChiave ? ' · ' : ''}{n.luogoChiave && <Link to={`/guida/citta/${n.luogoChiave}`}>{n.quartiereNome ?? n.luogoChiave}</Link>}{n.luogo && !n.sedeChiave ? `${n.luogoChiave ? ' · ' : ''}${n.luogo}` : ''}</span>}
              <span><strong className="text-text">Orari:</strong> {n.orariTesto}</span>
              {n.gestore && <span><strong className="text-text">Gestore:</strong> {n.gestore}</span>}
              {n.programmaPunti && <span><strong className="text-text">Programma punti:</strong> {n.programmaPunti.nome} ({n.programmaPunti.unita}{n.programmaPunti.calcolo === 'rango-cliente' ? ', dal rango cliente' : ', si segnano a mano'})</span>}
            </div>
            {n.disponibilita && n.disponibilita.stato !== 'disponibile' && n.disponibilita.requisiti.length > 0 && (
              <ul className="m-0 pl-4 text-[13px] text-text-secondary">{n.disponibilita.requisiti.map((r, i) => <li key={i}>{r.testo} — {r.dettaglio}</li>)}</ul>
            )}
            {n.note && <p className="m-0 text-[13px] text-text-secondary">{n.note}</p>}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi un articolo" dettaglio="a questo negozio" onClick={() => { setElementoArticolo(null); setModulo('articolo'); }} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Correggi il negozio" onClick={() => { void getElementoCatalogo('negozio', chiave).then((e) => { setElementoNegozio(e); setModulo('negozio'); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Caricamento fallito.')); }} />
            </div>
            {modulo === 'articolo' && <ModuloCatalogo tipo="articolo" elemento={elementoArticolo} negozioChiave={chiave} onChiudi={() => setModulo(null)} onSalvato={salvato} />}
            {modulo === 'negozio' && elementoNegozio && <ModuloCatalogo tipo="negozio" elemento={elementoNegozio} onChiudi={() => setModulo(null)} onSalvato={salvato} />}
            <p className="m-0 text-[12px] text-text-muted">{n.articoli} articoli{n.verificati < n.articoli ? ` (${n.articoli - n.verificati} da fonte secondaria)` : ''}{partitaId ? ` · ${n.acquistati} acquistati nella partita «${attiva?.nome}»` : ' · attiva una partita per segnare gli acquisti'}.</p>
          </div>
          {/* Due colonne su schermo largo: la mappa da una parte, la merce dall'altra; sotto i 1024 px una colonna. */}
          <div className="negozio-corpo">
            <div className="negozio-mappa">
              <DoveSiTrova tipo="negozio" chiave={n.chiave} altezza="var(--altezza-tela-negozio)" />
            </div>
            <div className="negozio-merce">
              {articoli.length > 0 && (
                <FiltriArticoli filtro={filtro} onCambia={setFiltro} categorie={categorie} destinatari={destinatari} conPartita={partitaId !== null} />
              )}
              {articoli.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessun articolo acquistabile confermato per questo luogo.</p>
                : <div className="negozio-elenco"><ArticoliTabella onModifica={(a) => apriArticolo(a.chiave)} articoli={visibili} partitaId={partitaId} onCambiato={(a) => dati.imposta({ ...n, articoliElenco: n.articoliElenco.map((x) => (x.chiave === a.chiave ? a : x)), acquistati: n.articoliElenco.filter((x) => (x.chiave === a.chiave ? a.acquistato : x.acquistato)).length })} /></div>}
              {/* Gli articoli nascosti di questo negozio, con il ripristino in un tocco: la pagina «Rimossi» li ha tutti. */}
              <ElementiRimossi tipo="articolo" negozio={chiave} versione={versione} onRipristinato={() => void dati.ricarica()} />
            </div>
          </div>
        </div>
      )}
    </PageState>
  );
}
