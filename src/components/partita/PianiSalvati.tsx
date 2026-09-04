// ============================================================
// PianiSalvati — piani di fusione salvati della partita con avanzamento sulla scorta attuale (Fase 5.3)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { aggiornaPianoSalvato, eliminaPianoSalvato, getPianiSalvati, getPossedute } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { EmptyState, Spinner } from '../shared/PageState';
import { AlberoPiano } from '../fusione/AlberoPiano';
import { EseguiFusioneModal } from '../fusione/EseguiFusioneModal';
import { formattaYen } from '../../utils/punti';
import type { PianoSalvatoDto } from '../../types';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconAlbero, IconCestino, IconMatita, IconRicalcola } from '../shared/iconeGuida';

interface Props {
  partitaId: number;
}

/** Scheda di un piano salvato: intestazione, avanzamento, passi eseguibili adesso e albero a richiesta. */
function SchedaPiano({ piano, inScorta, possedutaDi, partitaId, onCambiaTitolo, onElimina, onEseguito }: { piano: PianoSalvatoDto; inScorta: Set<number>; possedutaDi: Map<number, number>; partitaId: number; onCambiaTitolo: (titolo: string) => void; onElimina: () => void; onEseguito: () => void }) {
  const [aperto, setAperto] = useState(false);
  const [passoInEsecuzione, setPassoInEsecuzione] = useState<number | null>(null);
  const [titolo, setTitolo] = useState(piano.titolo);
  const [modificaTitolo, setModificaTitolo] = useState(false);
  const av = piano.avanzamento;
  return (
    <article className={`card flex flex-col gap-2 ${av.completato ? 'border-primary' : ''}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <ImmagineEntita ambito="persona" chiave={piano.nome} etichetta={piano.nomeIt} dimensione={72} adatta="copri" />
        <Link to={`/compendio/persona/${piano.personaId}`} className="font-display uppercase text-[20px] leading-none text-text no-underline hover:text-primary">{piano.nomeIt}</Link>
        <span className="text-[12px] text-text-muted">{piano.arcanaNome} · livello {piano.livello}</span>
        {modificaTitolo ? (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); onCambiaTitolo(titolo); setModificaTitolo(false); }}>
            <input className="form-input h-9 w-[180px]" value={titolo} onChange={(e) => setTitolo(e.target.value)} maxLength={80} aria-label="Titolo del piano" />
            <button type="submit" className="btn btn-primary btn-sm">Ok</button>
          </form>
        ) : (
          <button type="button" className="chip chip--icona touch" onClick={() => setModificaTitolo(true)} title="Rinomina">{piano.titolo || 'Senza titolo'}<IconMatita size={13} /></button>
        )}
        {piano.obiettivoId && <Link to="/partita?scheda=obiettivi" className="chip no-underline" title={`Obiettivo ${piano.obiettivoStato ?? ''}`}>Obiettivo{piano.obiettivoStato === 'raggiunto' ? ' raggiunto' : ''}</Link>}
        <span className="ml-auto font-black tabular-nums">{formattaYen(piano.costo)}</span>
      </div>
      <div className="text-[13px] text-text-secondary flex flex-wrap gap-x-3 gap-y-1">
        <span>{piano.piano.fusioni} {piano.piano.fusioni === 1 ? 'fusione' : 'fusioni'} · profondità {piano.piano.profondita}</span>
        <span>Foglie in scorta: <strong className="text-text">{av.foglieInScorta}/{av.foglie}</strong></span>
        <span>Fusioni fatte: <strong className="text-text">{av.fusioniFatte}/{av.fusioni}</strong></span>
        {piano.skill.length > 0 && <span>Skill: {piano.skill.map((s) => s.nomeIt).join(', ')}</span>}
        <span className="text-text-muted">salvato il {new Date(piano.createdAt).toLocaleDateString('it-IT')}</span>
      </div>
      {av.completato ? (
        <div className="chip chip--attivo self-start">Completato: {piano.nomeIt} è nella scorta</div>
      ) : av.passi.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="text-[12px] uppercase tracking-wide text-text-muted">Passi eseguibili adesso</div>
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Passi eseguibili">
            {av.passi.map((p, i) => (
              <li key={i} className="text-[13px] flex flex-wrap items-center gap-1.5">
                {p.ingredienti.map((ing, j) => <span key={j} className="chip chip--attivo">{ing.nomeIt}</span>)}
                <span aria-hidden="true">→</span>
                <Link to={p.ingredienti.length === 2 ? `/fusione?vista=calcolatore&a=${p.ingredienti[0].id}&b=${p.ingredienti[1].id}` : `/fusione?vista=ricette&ricette=${p.risultato.id}`} className="chip no-underline font-semibold">{p.risultato.nomeIt}</Link>
                <span className="text-[12px] text-text-muted">fusione {p.tipo === 'speciale' ? 'speciale' : p.tipo === 'stesso-arcano' ? 'stesso arcano' : p.tipo === 'tesoro' ? 'con Demone del Tesoro' : 'normale'}{p.skillPortate.length ? ` · eredita ${p.skillPortate.map((s) => s.nomeIt).join(', ')}` : ''}</span>
                {p.ingredienti.every((ing) => possedutaDi.has(ing.id)) && <button type="button" className="btn btn-primary btn-sm" onClick={() => setPassoInEsecuzione(i)}>Esegui</button>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-[13px] text-text-muted">Nessun passo eseguibile adesso: procurati le foglie mancanti (dal Registro o catturandole).</div>
      )}
      {piano.note && <div className="text-[13px] text-text-secondary">{piano.note}</div>}
      <div className="flex flex-wrap gap-1.5">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconAlbero size={20} />} titolo={aperto ? 'Nascondi albero' : 'Mostra albero'} onClick={() => setAperto((a) => !a)} aria-expanded={aperto} />
        <CollegamentoVisivo to={`/fusione?vista=piani&piani=${piano.personaId}${piano.skill.length ? `&skill=${piano.skill.map((s) => s.id).join(',')}` : ''}`} tono="fantasma" compatto icona={<IconRicalcola size={20} />} titolo="Ricalcola" />
        <PulsanteVisivo tono="pericolo" compatto icona={<IconCestino size={20} />} titolo="Elimina" onClick={onElimina} />
      </div>
      {aperto && <AlberoPiano radice={piano.piano.radice} inScorta={inScorta} />}
      {passoInEsecuzione !== null && av.passi[passoInEsecuzione] && (
        <EseguiFusioneModal
          partitaId={partitaId}
          possedutaIds={av.passi[passoInEsecuzione].ingredienti.map((ing) => possedutaDi.get(ing.id)!)}
          risultatoId={av.passi[passoInEsecuzione].risultato.id}
          onChiudi={() => setPassoInEsecuzione(null)}
          onEseguita={() => { setPassoInEsecuzione(null); onEseguito(); }}
        />
      )}
    </article>
  );
}

export function PianiSalvati({ partitaId }: Props) {
  const [params] = useSearchParams();
  const obiettivoParam = Number(params.get('obiettivo'));
  const obiettivoId = Number.isInteger(obiettivoParam) && obiettivoParam > 0 ? obiettivoParam : undefined;
  const lista = useCarica(() => getPianiSalvati(partitaId, obiettivoId), [partitaId, obiettivoId]);
  const scorta = useCarica(() => getPossedute(partitaId), [partitaId]);
  const inScorta = useMemo(() => new Set((scorta.dati ?? []).map((p) => p.personaId)), [scorta.dati]);
  const possedutaDi = useMemo(() => new Map((scorta.dati ?? []).map((p) => [p.personaId, p.id])), [scorta.dati]);

  const rinomina = async (p: PianoSalvatoDto, titolo: string) => {
    try {
      const agg = await aggiornaPianoSalvato(partitaId, p.id, { nome: titolo });
      lista.imposta((lista.dati ?? []).map((x) => (x.id === p.id ? agg : x)));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    }
  };
  const elimina = async (p: PianoSalvatoDto) => {
    if (!window.confirm(`Eliminare il piano «${p.titolo || p.nomeIt}»?`)) return;
    try {
      await eliminaPianoSalvato(partitaId, p.id);
      lista.imposta((lista.dati ?? []).filter((x) => x.id !== p.id));
      notifica('info', 'Piano eliminato.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-text-secondary">
        I piani salvati dalla vista «Piano di fusione» restano qui con l'avanzamento ricalcolato sulla scorta di adesso: foglie già possedute, fusioni già fatte e passi eseguibili subito.
        {obiettivoId && <> Filtro: solo i piani dell'obiettivo. <Link to="/partita?scheda=piani" className="text-primary">Tutti i piani</Link></>}
      </p>
      {lista.errore && <div className="text-[13px] text-error">{lista.errore} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void lista.ricarica()}>Riprova</button></div>}
      {!lista.dati && !lista.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {lista.dati && lista.dati.length === 0 && (
        <EmptyState illustrazione="vuoto-piani" title="Nessun piano salvato" hint="Calcola un piano nella pagina Fusione («Piano di fusione») e premi «Salva piano»." action={<Link to="/fusione?vista=piani" className="btn btn-primary no-underline">Vai ai piani di fusione</Link>} />
      )}
      {lista.dati && lista.dati.length > 0 && (
        <div className="flex flex-col gap-3">
          {lista.dati.map((p) => <SchedaPiano key={p.id} piano={p} inScorta={inScorta} possedutaDi={possedutaDi} partitaId={partitaId} onCambiaTitolo={(t) => void rinomina(p, t)} onElimina={() => void elimina(p)} onEseguito={() => { void lista.ricarica(); void scorta.ricarica(); }} />)}
        </div>
      )}
    </div>
  );
}
