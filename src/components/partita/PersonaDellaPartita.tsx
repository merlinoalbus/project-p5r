// ============================================================
// PersonaDellaPartita — ogni Persona del gioco con il suo stato nella partita: in scorta, registrata nel compendio personale
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompendioPartita, getPersone, getPossedute, registraPosseduta, urlPersone } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { piatto } from '../../utils/testo';
import { statoIstantanea } from '../../utils/istantaneaPersona';
import type { PersonaPossedutaDto } from '../../types';

interface Props {
  partitaId: number;
}

/** Quante righe mostrare per volta: «Mostra altre» ne aggiunge altrettante (260 Persona in tutto). */
const PASSO = 50;

const FILTRO_SCORTA = [
  { chiave: 'tutte', nome: 'Tutte' },
  { chiave: 'in-scorta', nome: 'In scorta' },
  { chiave: 'fuori-scorta', nome: 'Non in scorta' },
];
const FILTRO_REGISTRAZIONE = [
  { chiave: 'tutte', nome: 'Tutte' },
  { chiave: 'registrate', nome: 'Registrate' },
  { chiave: 'non-registrate', nome: 'Non registrate' },
  { chiave: 'da-aggiornare', nome: 'Registrazione da aggiornare' },
];

/**
 * Vista unica di scorta e compendio personale: per ogni Persona dice se è in scorta (con il livello dell'esemplare), se è registrata
 * nel compendio (con il livello registrato) e se la registrazione è più vecchia dell'esemplare, con «Registra» accanto in quel caso
 * (la stessa registrazione della scheda «Scorta»). Ricerca per nome o arcano, filtri per arcano, scorta e registrazione.
 */
export function PersonaDellaPartita({ partitaId }: Props) {
  const tutte = useCarica(() => getPersone(), [], { cacheUrl: urlPersone() });
  const possedute = useCarica(() => getPossedute(partitaId), [partitaId]);
  const compendio = useCarica(() => getCompendioPartita(partitaId), [partitaId]);
  const [q, setQ] = useState('');
  const [arcano, setArcano] = useState('');
  const [scorta, setScorta] = useState('tutte');
  const [registrazione, setRegistrazione] = useState('tutte');
  const [quante, setQuante] = useState(PASSO);
  const [occupata, setOccupata] = useState<number | null>(null);

  const postedutaPer = useMemo(() => new Map((possedute.dati ?? []).map((p) => [p.personaId, p])), [possedute.dati]);
  const istantaneaPer = useMemo(() => new Map((compendio.dati ?? []).map((c) => [c.personaId, c])), [compendio.dati]);

  /** Stato di registrazione di una Persona: registrata (aggiornata o no rispetto all'esemplare in scorta) oppure no. */
  const statoDi = (personaId: number): { registrata: boolean; datata: boolean } => {
    const c = istantaneaPer.get(personaId);
    const registrata = !!c && c.registrata;
    const esemplare = postedutaPer.get(personaId);
    return { registrata, datata: registrata && !!esemplare && (c?.livelloRegistrato == null || statoIstantanea(esemplare, c) === 'da-aggiornare') };
  };

  const arcani = useMemo(() => {
    const nomi = new Map<string, string>();
    for (const p of tutte.dati ?? []) nomi.set(p.arcana, p.arcanaNome);
    return [...nomi.entries()].map(([chiave, nome]) => ({ chiave, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }, [tutte.dati]);

  const lista = useMemo(() => {
    const testo = piatto(q.trim());
    return (tutte.dati ?? []).filter((p) => {
      if (testo && !piatto(p.nome).includes(testo) && !piatto(p.nomeIt).includes(testo) && !piatto(p.arcanaNome).includes(testo)) return false;
      if (arcano && p.arcana !== arcano) return false;
      const inScorta = postedutaPer.has(p.id);
      if (scorta === 'in-scorta' && !inScorta) return false;
      if (scorta === 'fuori-scorta' && inScorta) return false;
      const c = istantaneaPer.get(p.id);
      const registrata = !!c && c.registrata;
      const esemplare = postedutaPer.get(p.id);
      // registrata senza livello (la riga c'è ma non porta la fotografia): come per la Scorta, «Registrazione da aggiornare» con «Registra»
      const datata = registrata && !!esemplare && (c?.livelloRegistrato == null || statoIstantanea(esemplare, c) === 'da-aggiornare');
      if (registrazione === 'registrate' && !registrata) return false;
      if (registrazione === 'non-registrate' && registrata) return false;
      if (registrazione === 'da-aggiornare' && !datata) return false;
      return true;
    });
  }, [tutte.dati, q, arcano, scorta, registrazione, postedutaPer, istantaneaPer]);

  /** Registra nel compendio l'esemplare in scorta (stessa strada di «Registra» nella scheda Scorta) e sostituisce le istantanee con quelle restituite. */
  const registra = async (e: PersonaPossedutaDto) => {
    setOccupata(e.id);
    try {
      compendio.imposta(await registraPosseduta(partitaId, e.id));
      notifica('success', `${e.nomeIt} registrata nel compendio al livello ${e.livello}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Registrazione fallita.');
    } finally {
      setOccupata(null);
    }
  };

  const totale = tutte.dati?.length ?? 0;
  const inScortaN = possedute.dati?.length ?? 0;
  const registrateN = (compendio.dati ?? []).filter((c) => c.registrata).length;
  const visibili = lista.slice(0, quante);

  return (
    <PageState
      isLoading={tutte.inPrimoCaricamento || possedute.inPrimoCaricamento || compendio.inPrimoCaricamento}
      error={tutte.errore ?? possedute.errore ?? compendio.errore}
      onRetry={() => { void tutte.ricarica(); void possedute.ricarica(); void compendio.ricarica(); }}
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="chip">{inScortaN} in scorta</span>
        <span className="chip">{registrateN} registrate su {totale}</span>
        <CampoRicerca valore={q} onCambia={(v) => { setQ(v); setQuante(PASSO); }} segnaposto="Cerca Persona…" />
      </div>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <Selettore compatto etichetta="Arcano" valore={arcano} vuoto="Tutti gli arcani" opzioni={arcani} onCambia={(k) => { setArcano(k); setQuante(PASSO); }} />
        <Selettore compatto etichetta="Scorta" valore={scorta} opzioni={FILTRO_SCORTA} ricerca="mai" onCambia={(k) => { setScorta(k); setQuante(PASSO); }} />
        <Selettore compatto etichetta="Compendio personale" valore={registrazione} opzioni={FILTRO_REGISTRAZIONE} ricerca="mai" onCambia={(k) => { setRegistrazione(k); setQuante(PASSO); }} />
        <span className="testo-13 text-text-muted">{lista.length} Persona</span>
      </div>
      {lista.length === 0 ? (
        <p className="card testo-13 text-text-muted m-0">Nessuna Persona corrisponde ai filtri.</p>
      ) : (
        <ul className="m-0 p-0 list-none card py-0 divide-y divide-border-light">
          {visibili.map((p) => {
            const esemplare = postedutaPer.get(p.id);
            const c = istantaneaPer.get(p.id);
            const { registrata, datata } = statoDi(p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 py-1 flex-wrap">
                <span className="w-9 text-right testo-12 text-text-muted" title="Livello base">Liv. {p.livello}</span>
                <Link to={`/compendio/persona/${p.id}`} className="touch flex items-center font-semibold no-underline text-text hover:text-primary-testo flex-1 min-w-[140px]">
                  {p.nomeIt}{p.nomeIt !== p.nome && <span className="testo-12 font-normal text-text-muted"> {p.nome}</span>}
                </Link>
                <span className="chip">{p.arcanaNome}</span>
                {esemplare
                  ? <span className="chip chip--attivo" title={esemplare.inSquadra ? 'È nella tua scorta' : 'È nella tua scorta, in deposito'}>In scorta · Liv. {esemplare.livello}</span>
                  : <span className="chip" title="Non è nella tua scorta">Non in scorta</span>}
                {registrata
                  ? <span className="chip chip--attivo" title="Registrata nel compendio personale">{c?.livelloRegistrato != null ? `Registrata nel compendio · Liv. ${c.livelloRegistrato}` : 'Registrata nel compendio'}</span>
                  : <span className="chip" title="Non registrata nel compendio personale">Non registrata</span>}
                {datata && <span className="chip" title="L'esemplare in scorta è cambiato dopo la registrazione: livello, abilità, bonus o tratto sono diversi">Registrazione da aggiornare</span>}
                {esemplare && (!registrata || datata) && (
                  <PulsanteVisivo compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Registra" dettaglio={registrata ? 'aggiorna il compendio' : 'nel compendio'} disabled={occupata === esemplare.id} onClick={() => void registra(esemplare)} title="Salva nel compendio livello, bonus, skill e tratto di questo esemplare: l'evocazione dal Registro li ripristina" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {lista.length > visibili.length && (
        <div className="flex justify-center mt-3">
          <PulsanteVisivo icona={<IconaAzione chiave="carica-altri" dimensione={22} />} titolo={<>Mostra altre ({lista.length - visibili.length})</>} onClick={() => setQuante((n) => n + PASSO)} />
        </div>
      )}
    </PageState>
  );
}
