// ============================================================
// ScortaPersona — Persona possedute nella partita: aggiunta, livello, skill, statistiche, rimozione
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaPosseduta, aggiungiPosseduta, getCapienzaScorta, getPersone, getPossedute, getSkills, isApiError, rimuoviPosseduta, getCompendioPartita, registraPosseduta, urlSkills } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState, EmptyState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { ElementoChip } from '../compendio/ElementoChip';
import { StatisticheBarre } from '../compendio/StatisticheBarre';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { CHIAVI_STATISTICHE, origineStima, statisticheStimate } from '../../../shared/statistiche';
import type { CapienzaScortaDto, OsservazioneStatisticheDto, PersonaPossedutaDto, StatisticheDto } from '../../types';
import { statoIstantanea } from '../../utils/istantaneaPersona';
import { SIGLA_STATISTICA, coloreElemento } from '../../utils/elementi';
import { AssetImg } from '../shared/AssetImg';
import { slug } from '../../../shared/slug';
import { PulsanteVisivo, FrecciaApertura } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { conferma } from '../../stores/confermaStore';

interface Props {
  partitaId: number;
}

/** Scorta della partita con modifica di livello, statistiche potenziate e skill conosciute. */
export function ScortaPersona({ partitaId }: Props) {
  const { dati, inPrimoCaricamento, errore, ricarica, imposta } = useCarica(() => getPossedute(partitaId), [partitaId]);
  const [aggiunta, setAggiunta] = useState(false);
  const [modifica, setModifica] = useState<PersonaPossedutaDto | null>(null);
  /** La Persona aperta nel cassetto (per id: si legge sempre dall'elenco corrente, così livello e stato restano aggiornati). */
  const [selezionata, setSelezionata] = useState<number | null>(null);
  const scelta = useMemo(() => dati?.find((x) => x.id === selezionata) ?? null, [dati, selezionata]);
  // la capienza è un'informazione in più: se la lettura fallisce la scorta si mostra comunque, senza tacche
  const capienza = useCarica(() => getCapienzaScorta(partitaId), [partitaId]);
  const [vista, setVista] = useState<VistaScorta>(leggiVista);
  const [filtriAperti, setFiltriAperti] = useState(false);
  const cambiaVista = (parte: Partial<VistaScorta>) => {
    const nuova = { ...vista, ...parte };
    setVista(nuova);
    salvaVista(nuova);
  };
  const arcani = useMemo(() => [...new Set((dati ?? []).map((p) => p.arcanaNome))].sort((a, b) => a.localeCompare(b, 'it')), [dati]);
  const opzioniArcani = useMemo(() => arcani.map((a) => ({ chiave: a, nome: a })), [arcani]);
  /** Se l'arcano ricordato non c'è più fra le Persona, il filtro non vale (altrimenti l'elenco resterebbe vuoto senza spiegazione). */
  const arcanoValido = vista.arcano !== '' && arcani.includes(vista.arcano) ? vista.arcano : '';
  const visibili = useMemo(() => {
    const testo = vista.q.trim().toLowerCase();
    const filtrate = (dati ?? []).filter((p) =>
      (vista.presenza === 'tutte' || (vista.presenza === 'squadra' ? p.inSquadra : !p.inSquadra))
      && (arcanoValido === '' || p.arcanaNome === arcanoValido)
      && (testo === '' || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo)));
    return [...filtrate].sort((a, b) => (vista.ordine === 'arcano' ? a.arcanaNome.localeCompare(b.arcanaNome, 'it') : 0) || b.livello - a.livello || a.nomeIt.localeCompare(b.nomeIt, 'it'));
  }, [dati, vista.q, vista.presenza, vista.ordine, arcanoValido]);
  const filtriAttivi = (vista.presenza !== 'tutte' ? 1 : 0) + (arcanoValido !== '' ? 1 : 0) + (vista.ordine !== 'livello' ? 1 : 0);
  const filtroOn = vista.q.trim() !== '' || vista.presenza !== 'tutte' || arcanoValido !== '';
  /** I posti liberi mostrati in griglia: solo se la capienza è nota e nessun filtro nasconde parte della scorta. */
  const postiCapienza = capienza.dati?.capienza ?? null;
  const postiLiberi = postiCapienza !== null && !filtroOn ? Math.max(0, postiCapienza - (dati?.length ?? 0)) : 0;
  const addInTesta = postiLiberi === 0;
  const compendio = useCarica(() => getCompendioPartita(partitaId), [partitaId]);
  const istantanee = useMemo(() => new Map((compendio.dati ?? []).map((c) => [c.personaId, c])), [compendio.dati]);
  const [registrazione, setRegistrazione] = useState<number | null>(null);
  /** Registra l'esemplare nel compendio (livello, bonus, skill, tratto) e sostituisce le istantanee con quelle restituite. */
  const registra = async (p: PersonaPossedutaDto) => {
    setRegistrazione(p.id);
    try {
      compendio.imposta(await registraPosseduta(partitaId, p.id));
      notifica('success', `${p.nomeIt} registrata nel compendio al livello ${p.livello}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Registrazione fallita.');
    } finally {
      setRegistrazione(null);
    }
  };

  /** Sale di un livello: è il gesto che si fa più spesso, e finora chiedeva di aprire la modale,
   *  cambiare un numero e salvare.
   *
   *  Le statistiche mostrate restano una **stima** finché non registri i valori letti nel gioco: la
   *  regola dell'app — tre punti per livello ripartiti in proporzione alla base — non è la curva di
   *  crescita del gioco, ed è il motivo per cui su Arsene dà un +1 a Forza, Magia e Agilità dove il
   *  gioco dà altro. Quel che registri con «Modifica» è legato al **livello** a cui l'hai letto; il
   *  bonus di potenziamento resta un valore a parte e si somma dopo. */
  const [salita, setSalita] = useState<number | null>(null);
  /** Porta la Persona al livello successivo (fermandosi a 99) e la sostituisce in elenco con quella restituita. */
  const saliDiLivello = async (p: PersonaPossedutaDto) => {
    if (!dati || p.livello >= 99) return;
    setSalita(p.id);
    try {
      const agg = await aggiornaPosseduta(partitaId, p.id, { livello: p.livello + 1 });
      // dai dati correnti (forma funzionale): dopo l'`await` `dati` è quello del render, e un'altra Persona cambiata nel frattempo
      // tornerebbe indietro
      imposta((correnti) => correnti.map((x) => (x.id === p.id ? agg : x)));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salita di livello fallita.');
    } finally {
      setSalita(null);
    }
  };

  /** Toglie la Persona dalla scorta dopo conferma (la registrazione nel compendio resta) e la leva dall'elenco. */
  const rimuovi = async (p: PersonaPossedutaDto) => {
    if (!dati || !(await conferma({ titolo: 'Rimuovere dalla scorta?', testo: `${p.nomeIt} esce dalla scorta. Resta registrata nel compendio.`, etichetta: 'Rimuovi' }))) return;
    try {
      await rimuoviPosseduta(partitaId, p.id);
      setSelezionata(null);
      imposta((correnti) => correnti.filter((x) => x.id !== p.id));
      notifica('info', `${p.nomeIt} rimossa dalla scorta.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    }
  };

  return (
    <PageState isLoading={inPrimoCaricamento} error={errore} onRetry={() => void ricarica()}>
      {/* capienza in testa: quanti posti sono occupati e quando salgono (dal rango di Igor) */}
      <IntestazioneCapienza quante={dati?.length ?? 0} capienza={capienza.dati ?? null} />
      {dati && dati.length === 0 && (
        <EmptyState illustrazione="vuoto-persona" title="La scorta è vuota" hint="Aggiungi le Persona che possiedi nel gioco: livello, skill e statistiche vengono precompilati dal compendio." />
      )}
      {dati && (
        <>
          {/* senza un posto libero in griglia (capienza ignota, scorta piena, filtri attivi) il comando sta in testa */}
          {addInTesta && <div className="mb-2"><PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi Persona" onClick={() => setAggiunta(true)} /></div>}
          {dati.length > 0 && (
            <div className="scorta-strumenti">
              <CampoRicerca valore={vista.q} onCambia={(q) => cambiaVista({ q })} segnaposto="Cerca una Persona…" />
              <PulsanteVisivo tono="fantasma" compatto className="shrink-0 sm:hidden" icona={<IconaAzione chiave="filtri" dimensione={20} />} aria-expanded={filtriAperti} onClick={() => setFiltriAperti((v) => !v)}
                titolo={<>Filtri{filtriAttivi > 0 ? ` (${filtriAttivi})` : ''}<FrecciaApertura aperto={filtriAperti} /></>} />
              <div className={`${filtriAperti ? 'flex' : 'hidden'} sm:flex scorta-strumenti__filtri`}>
                <div className="flex gap-1 flex-wrap" role="group" aria-label="Presenza">
                  {FILTRI_PRESENZA.map((f) => (
                    <button key={f.k} type="button" className={`chip touch ${vista.presenza === f.k ? 'chip--attivo' : ''}`} aria-pressed={vista.presenza === f.k} onClick={() => cambiaVista({ presenza: f.k })}>{f.l}</button>
                  ))}
                </div>
                <Selettore compatto etichetta="Arcano" valore={arcanoValido} vuoto="Tutti" opzioni={opzioniArcani} ricerca="mai" onCambia={(arcano) => cambiaVista({ arcano })} />
                <Selettore compatto etichetta="Ordina per" valore={vista.ordine} opzioni={ORDINI} ricerca="mai" onCambia={(o) => cambiaVista({ ordine: o === 'arcano' ? 'arcano' : 'livello' })} />
              </div>
            </div>
          )}
          <ul className="griglia-scorta">
            {visibili.map((p) => {
              const st = statoIstantanea(p, istantanee.get(p.personaId));
              return (
                <li key={p.id} className={`riga-persona ${p.inSquadra ? '' : 'riga-persona--deposito'}`}>
                  <button type="button" className="riga-persona__scelta" aria-haspopup="dialog" onClick={() => setSelezionata(p.id)}
                    aria-label={`${p.nomeIt}, ${p.arcanaNome}, livello ${p.livello}${p.inSquadra ? '' : ', in deposito'}: apri la gestione`}>
                    {/* dentro il pulsante della riga una miniatura non interattiva (un pulsante nel pulsante non è valido): l'ingrandimento sta nel cassetto */}
                    <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={44} className="rounded" />
                    <span className="riga-persona__testo">
                      <span className="riga-persona__nome">
                        <span className="truncate">{p.nomeIt}</span>
                        <span className={`punto-stato ${p.statisticheConfermate ? 'punto-stato--reali' : 'punto-stato--stima'}`} role="img"
                          aria-label={p.statisticheConfermate ? 'Statistiche reali' : 'Statistiche stimate'}
                          title={p.statisticheConfermate ? 'Statistiche lette nel gioco a questo livello' : 'Statistiche stimate'} />
                        {st === 'aggiornata' && <span className="riga-persona__registrata" title="Registrata nel compendio"><IconaAzione chiave="registra" dimensione={14} /><span className="sr-only">Registrata nel compendio</span></span>}
                      </span>
                      <span className="riga-persona__arcano">
                        <AssetImg nome={`arcani/icona/${slug(p.arcana)}`} alt="" decorativa className="h-4 w-4 shrink-0 object-contain" fallback={null} />
                        <span className="truncate">{p.arcanaNome}{p.inSquadra ? '' : ' · in deposito'}</span>
                      </span>
                      <span className="riga-persona__skill">
                        {p.skill.map((s) => <QuadratoSkill key={s.slot} elemento={s.elemento} nome={s.nomeIt} />)}
                      </span>
                    </span>
                    <span className="riga-persona__livello"><span>{p.livello}</span><small>LIV</small></span>
                  </button>
                </li>
              );
            })}
            {Array.from({ length: postiLiberi }, (_, i) => (
              <li key={`libero-${i}`}>
                {i === 0
                  ? <button type="button" className="posto-libero posto-libero--aggiungi touch gap-2" onClick={() => setAggiunta(true)}><span className="inline-flex size-7 shrink-0" aria-hidden="true"><IconaAzione chiave="piu" dimensione={28} /></span>Aggiungi Persona</button>
                  : <span className="posto-libero">libero</span>}
              </li>
            ))}
          </ul>
          {dati.length > 0 && visibili.length === 0 && <p className="m-0 py-3 testo-13 text-text-muted">Nessuna Persona corrisponde ai filtri.</p>}
        </>
      )}

      {/* il cassetto della Persona: tutti i comandi della scheda; la finestra «Modifica» si apre sopra di lui */}
      <Modal titolo={scelta ? `${scelta.nomeIt}` : 'Persona'} aperta={scelta !== null} onChiudi={() => setSelezionata(null)} cassetto>
        {scelta && (
          <DettaglioPersona
            p={scelta}
            stato={statoIstantanea(scelta, istantanee.get(scelta.personaId))}
            inSalita={salita === scelta.id}
            inRegistrazione={registrazione === scelta.id}
            onSali={() => void saliDiLivello(scelta)}
            onRegistra={() => void registra(scelta)}
            onModifica={() => setModifica(scelta)}
            onRimuovi={() => void rimuovi(scelta)}
          />
        )}
      </Modal>

      <AggiungiPersonaModal
        aperta={aggiunta}
        onChiudi={() => setAggiunta(false)}
        onAggiunta={(p) => { if (dati) imposta((correnti) => [p, ...correnti]); else imposta([p]); setAggiunta(false); }}
        partitaId={partitaId}
      />
      {modifica && (
        <ModificaPossedutaModal
          posseduta={modifica}
          partitaId={partitaId}
          onChiudi={() => setModifica(null)}
          onSalvata={(p) => { imposta((correnti) => correnti.map((x) => (x.id === p.id ? p : x))); setModifica(null); }}
        />
      )}
    </PageState>
  );
}

// ---- Vista: ricerca, filtri e ordine, ricordati per visitatore (localStorage; la scheda funziona anche senza) ----

interface VistaScorta {
  q: string;
  presenza: 'tutte' | 'squadra' | 'deposito';
  arcano: string;
  ordine: 'livello' | 'arcano';
}

const CHIAVE_VISTA = 'p5r.scortaPersona.vista';
const VISTA_PREDEFINITA: VistaScorta = { q: '', presenza: 'tutte', arcano: '', ordine: 'livello' };
const ORDINI = [{ chiave: 'livello', nome: 'Livello' }, { chiave: 'arcano', nome: 'Arcano' }];
const FILTRI_PRESENZA: Array<{ k: VistaScorta['presenza']; l: string }> = [{ k: 'tutte', l: 'Tutte' }, { k: 'squadra', l: 'In squadra' }, { k: 'deposito', l: 'In deposito' }];

/** La vista salvata (filtro di presenza, arcano, ordine); la ricerca di testo non si ricorda. Se manca o è illeggibile, quella predefinita. */
function leggiVista(): VistaScorta {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_VISTA);
    if (grezzo) {
      const o = JSON.parse(grezzo) as Partial<Record<keyof VistaScorta, unknown>>;
      return {
        q: '',
        presenza: o.presenza === 'squadra' || o.presenza === 'deposito' ? o.presenza : 'tutte',
        arcano: typeof o.arcano === 'string' ? o.arcano : '',
        ordine: o.ordine === 'arcano' ? 'arcano' : 'livello',
      };
    }
  } catch { /* storage assente o contenuto illeggibile: vale la vista predefinita */ }
  return { ...VISTA_PREDEFINITA };
}

/** Ricorda la vista; se lo storage non risponde si perde solo il ricordo. */
function salvaVista(v: VistaScorta): void {
  try {
    window.localStorage.setItem(CHIAVE_VISTA, JSON.stringify({ presenza: v.presenza, arcano: v.arcano, ordine: v.ordine }));
  } catch { /* storage pieno o bloccato */ }
}

// ---- Capienza in testa ----

/** «n / capienza» con i posti come tacche e la frase su quando la capienza sale (rango di Igor). Senza capienza nota: solo il conteggio. */
function IntestazioneCapienza({ quante, capienza }: { quante: number; capienza: CapienzaScortaDto | null }) {
  const cap = capienza?.capienza ?? null;
  const prossimo = capienza?.prossimo ?? null;
  const primoGradino = capienza?.gradini[0] ?? null;
  let frase: string | null = null;
  if (capienza) {
    if (prossimo) frase = `Sale a ${prossimo.capienza} al rango ${prossimo.rango} di Igor (ora rango ${capienza.rangoIgor}).`;
    else if (cap !== null) frase = `Capienza massima: Igor è al rango ${capienza.rangoIgor}.`;
    if (cap === null && primoGradino) frase = `Il valore di partenza non è nei dati: sale a ${primoGradino.capienza} al rango ${primoGradino.rango} di Igor (ora rango ${capienza.rangoIgor}).`;
  }
  return (
    <div className="scorta-capienza">
      <span className="scorta-capienza__numero">
        <b>{cap !== null ? `${quante} / ${cap}` : quante}</b>
        <small>Persona in scorta</small>
      </span>
      {cap !== null && (
        <span className="scorta-capienza__tacche" role="img" aria-label={`${Math.min(quante, cap)} posti occupati su ${cap}`}>
          {Array.from({ length: cap }, (_, i) => <i key={i} className={i < quante ? '' : 'scorta-capienza__vuota'} />)}
        </span>
      )}
      {frase && <small className="scorta-capienza__frase">{frase}</small>}
    </div>
  );
}

/** Una skill come piccolo quadrato con l'icona e il colore dell'elemento (il nome sta nel titolo). */
function QuadratoSkill({ elemento, nome }: { elemento: string; nome: string }) {
  const colore = coloreElemento(elemento);
  return (
    <span className="quadrato-skill" title={nome} style={{ borderColor: colore, background: `color-mix(in srgb, ${colore} 18%, transparent)` }}>
      <AssetImg nome={`elementi/${elemento}`} alt="" decorativa className="w-3.5 h-3.5 object-contain" fallback={<span className="inline-block w-2 h-2 rounded-full" style={{ background: colore }} aria-hidden="true" />} />
      <span className="sr-only">{nome}</span>
    </span>
  );
}

// ---- Cassetto: tutti i comandi e le informazioni della Persona ----

interface PropsDettaglio {
  p: PersonaPossedutaDto;
  stato: ReturnType<typeof statoIstantanea>;
  inSalita: boolean;
  inRegistrazione: boolean;
  onSali: () => void;
  onRegistra: () => void;
  onModifica: () => void;
  onRimuovi: () => void;
}

/** Il contenuto del cassetto: testata con livello, comandi (Livello +, Registra, Modifica, Rimuovi), cartellini di stato, skill, tratto e statistiche. */
function DettaglioPersona({ p, stato, inSalita, inRegistrazione, onSali, onRegistra, onModifica, onRimuovi }: PropsDettaglio) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-3">
        <ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={64} />
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <Link to={`/compendio/persona/${p.personaId}`} className="font-semibold testo-17 no-underline text-text hover:text-primary-testo">{p.nomeIt}</Link>
          {p.nomeIt !== p.nome && <span className="testo-12 text-text-muted">{p.nome}</span>}
          <span className="testo-13 text-text-secondary">{p.arcanaNome} · {p.inSquadra ? 'in squadra' : 'in deposito'}</span>
        </div>
        <div className="riga-persona__livello riga-persona__livello--grande" title="Livello"><span>{p.livello}</span><small>LIV</small></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Livello"
          disabled={inSalita || p.livello >= 99} onClick={onSali}
          aria-label={`Sali di livello: ${p.nomeIt} al livello ${p.livello + 1}`}
          title={`Porta ${p.nomeIt} al livello ${p.livello + 1}. Le statistiche restano una stima: registra con «Modifica» quelle lette nel gioco`} />
        {stato !== 'aggiornata' && (
          <PulsanteVisivo compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Registra" dettaglio={stato === 'assente' ? 'nel compendio' : 'aggiorna il compendio'} disabled={inRegistrazione} onClick={onRegistra} title="Salva nel compendio livello, bonus, skill e tratto di questo esemplare: l'evocazione dal Registro li ripristina" />
        )}
        <PulsanteVisivo compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={onModifica} />
        <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi" onClick={onRimuovi} />
      </div>

      <div className="flex flex-wrap gap-1">
        {p.statisticheConfermate
          ? <span className="chip chip--attivo" title="Statistiche lette nel gioco a questo livello">Valori reali</span>
          : p.origineStima === 'osservate' && p.osservate
            ? <span className="chip" title={`Stima dai valori reali registrati al livello ${p.osservate.livello}: ${descriviOsservate(p.osservate)}`}>Stima dal liv. {p.osservate.livello}</span>
            : <span className="chip" title={p.osservate ? `Stima dalla base del dataset: il livello ${p.livello} è sotto quello dei valori reali registrati (${p.osservate.livello})` : 'Stima dalla base del dataset: registra i valori letti nel gioco con «Modifica»'}>Stima</span>}
        {!p.statisticheBase && <span className="chip chip--attivo" title={descriviBonus(p.bonus)}>Bonus {totaleBonus(p.bonus) > 0 ? '+' : ''}{totaleBonus(p.bonus)}</span>}
        {stato === 'aggiornata' && <span className="chip" title="Il compendio conserva questa versione">Registrata</span>}
        {!p.inSquadra && <span className="chip">In deposito</span>}
      </div>

      <section className="flex flex-col gap-1">
        <span className="etichetta-campo-confidente">Skill</span>
        <div className="flex flex-wrap gap-1">
          {p.skill.map((s) => (
            <Link key={s.slot} to={`/skill/${s.id}`} className="no-underline" title={s.effettoNome}>
              <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo />
            </Link>
          ))}
          {p.skill.length === 0 && <span className="testo-12 text-text-muted">Nessuna skill registrata.</span>}
        </div>
      </section>

      {p.tratto && (
        <section className="flex flex-col gap-1">
          <span className="etichetta-campo-confidente">Tratto</span>
          <div className="testo-12 text-text-secondary"><strong className="text-text">{p.tratto.nomeIt}</strong> — {p.tratto.effettoNome}</div>
        </section>
      )}

      <section className="flex flex-col gap-1">
        <span className="etichetta-campo-confidente">Statistiche al livello {p.livello} {p.statisticheConfermate ? '(valori reali letti nel gioco)' : `(${p.origineStima === 'osservate' && p.osservate ? `stima dai valori reali del livello ${p.osservate.livello}` : 'stima del livello'}${p.statisticheBase ? '' : ` più bonus ${descriviBonus(p.bonus)}`})`}</span>
        <StatisticheBarre statistiche={p.statistiche} base={p.statisticheStimate} compatta />
      </section>
      {p.note && <p className="m-0 testo-12 text-text-secondary whitespace-pre-wrap">{p.note}</p>}
    </div>
  );
}

// ---- Modale: aggiunta dal compendio ----

/**
 * Finestra «Aggiungi Persona alla scorta»: carica il compendio solo quando è aperta, filtra per nome, nome italiano o arcano
 * (escluse le rare, al più 40 risultati) e aggiunge con un tocco; una Persona già posseduta diventa un avviso, non un errore.
 */
function AggiungiPersonaModal({ aperta, onChiudi, onAggiunta, partitaId }: { aperta: boolean; onChiudi: () => void; onAggiunta: (p: PersonaPossedutaDto) => void; partitaId: number }) {
  const { dati } = useCarica(() => (aperta ? getPersone() : Promise.resolve([])), [aperta]);
  const [q, setQ] = useState('');
  const [occupato, setOccupato] = useState<number | null>(null);
  const filtrate = useMemo(() => {
    const testo = q.trim().toLowerCase();
    return (dati ?? []).filter((p) => !p.rara && (!testo || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))).slice(0, 40);
  }, [dati, q]);

  /** Aggiunge la Persona alla scorta e la passa a `onAggiunta`; se è già posseduta lo segnala come avviso. */
  const aggiungi = async (personaId: number, nome: string) => {
    setOccupato(personaId);
    try {
      const p = await aggiungiPosseduta(partitaId, personaId);
      notifica('success', `${nome} aggiunta alla scorta.`);
      onAggiunta(p);
    } catch (err) {
      if (isApiError(err, 'persona-gia-posseduta')) notifica('warning', `${nome} è già nella scorta.`);
      else notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(null);
    }
  };

  return (
    <Modal titolo="Aggiungi Persona alla scorta" aperta={aperta} onChiudi={onChiudi}>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca nel compendio…" autoFocus />
      <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light max-h-[50vh] area-scorrevole">
        {filtrate.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <span className="w-9 text-right testo-12 text-text-muted">Liv. {p.livello}</span>
            <span className="font-semibold flex-1">{p.nomeIt}{p.nomeIt !== p.nome && <span className="testo-12 font-normal text-text-muted"> {p.nome}</span>}</span>
            <span className="chip">{p.arcanaNome}</span>
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato === p.id} onClick={() => void aggiungi(p.id, p.nomeIt)} />
          </li>
        ))}
        {dati && filtrate.length === 0 && <li className="py-3 testo-13 text-text-muted">Nessuna Persona trovata.</li>}
      </ul>
    </Modal>
  );
}

// ---- Modale: modifica livello, statistiche, skill, squadra, note ----

/**
 * Finestra di modifica di una Persona posseduta: livello, presenza in squadra, note, bonus alle statistiche, valori reali letti
 * nel gioco (o il loro oblio) e skill, cercate nel catalogo escludendo i tratti e quelle già presenti. Tutto si salva insieme.
 */
function ModificaPossedutaModal({ posseduta, partitaId, onChiudi, onSalvata }: { posseduta: PersonaPossedutaDto; partitaId: number; onChiudi: () => void; onSalvata: (p: PersonaPossedutaDto) => void }) {
  const { dati: tutteSkill } = useCarica(() => getSkills(), [], { cacheUrl: urlSkills() });
  const [livello, setLivello] = useState(posseduta.livello);
  const [inSquadra, setInSquadra] = useState(posseduta.inSquadra);
  const [note, setNote] = useState(posseduta.note);
  const [bonus, setBonus] = useState<StatisticheDto>(posseduta.bonus);
  // valori reali letti nel gioco (15.26): `reali` = quelli scritti in questa finestra (null = non toccati); «dimentica» annulla quelli registrati
  const [reali, setReali] = useState<OsservazioneStatisticheDto | null>(null);
  const [dimentica, setDimentica] = useState(false);
  const osservate = reali ?? (dimentica ? null : posseduta.osservate);
  const origine = origineStima(osservate, livello);
  const stimate = statisticheStimate(posseduta.statisticheBaseLivello, posseduta.livelloBase, osservate, livello);
  const effettive = Object.fromEntries(CHIAVI_STATISTICHE.map((k) => [k, Math.min(99, Math.max(1, stimate[k] + bonus[k]))])) as unknown as StatisticheDto;
  /** Il valore da mostrare nella casella «reale»: quello scritto in questa finestra se è del livello corrente, altrimenti il valore effettivo stimato. */
  const realeMostrato = (k: keyof StatisticheDto) => (reali && reali.livello === livello ? reali[k] : effettive[k]);
  // scrivere un valore reale registra tutti e cinque i valori al livello corrente e azzera i bonus (i valori reali li comprendono già)
  const impostaReale = (k: keyof StatisticheDto, valore: number) => {
    const partenza: OsservazioneStatisticheDto = reali && reali.livello === livello ? reali : { livello, ...effettive };
    setReali({ ...partenza, [k]: Math.min(99, Math.max(1, Math.round(valore) || 1)) });
    setBonus({ forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 });
    setDimentica(false);
  };
  const [skillIds, setSkillIds] = useState<number[]>(posseduta.skill.map((s) => s.id));
  const [ricerca, setRicerca] = useState('');
  const [occupato, setOccupato] = useState(false);

  const candidate = useMemo(() => {
    const testo = ricerca.trim().toLowerCase();
    if (!testo || !tutteSkill) return [];
    return tutteSkill.filter((s) => s.elemento !== 'trait' && !skillIds.includes(s.id) && (s.nome.toLowerCase().includes(testo) || s.nomeIt.toLowerCase().includes(testo))).slice(0, 8);
  }, [ricerca, tutteSkill, skillIds]);

  /** Salva livello, squadra, note, skill e bonus; invia anche i valori reali scritti qui, oppure
   * `null` se si è scelto di dimenticare quelli registrati, altrimenti li lascia invariati. */
  const salva = async () => {
    setOccupato(true);
    try {
      const p = await aggiornaPosseduta(partitaId, posseduta.id, {
        livello, inSquadra, note, skillIds, bonus,
        ...(reali ? { osservate: reali } : dimentica ? { osservate: null } : {}),
      });
      notifica('success', 'Persona aggiornata.');
      onSalvata(p);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  /** La skill con quell'id dal catalogo completo, o in mancanza fra quelle della Persona; `null` se sconosciuta. */
  const nomeSkill = (id: number) => tutteSkill?.find((s) => s.id === id) ?? posseduta.skill.find((s) => s.id === id) ?? null;

  return (
    <Modal
      titolo={`${posseduta.nome} — modifica`}
      aperta
      onChiudi={onChiudi}
      larga
      azioni={
        <>
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato} onClick={() => void salva()} />
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <label className="form-label">Livello
            <input type="number" min={1} max={99} className="form-input mt-1" value={livello} onFocus={(e) => e.target.select()} onChange={(e) => setLivello(Math.min(99, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="flex items-center gap-2 testo-13 touch">
            <input type="checkbox" checked={inSquadra} onChange={(e) => setInSquadra(e.target.checked)} /> In squadra (non in deposito)
          </label>
          <div className="flex flex-col gap-1">
            <span className="form-label m-0">Valori reali nel gioco al livello {livello}</span>
            <div className="grid grid-cols-5 gap-1">
              {CHIAVI_STATISTICHE.map((k) => (
                <label key={k} className="testo-12 text-text-muted text-center">
                  {SIGLA_STATISTICA[k]}
                  <input type="number" min={1} max={99} className="form-input form-input--compatto min-h-[44px] mt-1 px-1 text-center w-full" value={realeMostrato(k)} onFocus={(e) => e.target.select()} onChange={(e) => impostaReale(k, Number(e.target.value))} aria-label={`${SIGLA_STATISTICA[k]} reale`} />
                </label>
              ))}
            </div>
            <p className="m-0 testo-12 text-text-muted">
              {reali
                ? `Registrerai i valori letti nel gioco al livello ${reali.livello}: da qui in su la stima riparte da questi e i bonus ripartono da zero, perché i valori reali li comprendono già.`
                : osservate
                  ? `Valori reali registrati al livello ${osservate.livello} (${descriviOsservate(osservate)}). ${origine === 'osservate' ? 'La stima riparte da questi valori.' : 'Sotto quel livello la stima usa la base del dataset.'}`
                  : 'Scrivi ciò che leggi nella scheda della Persona: nel gioco la crescita ha una ripartizione propria di ogni Persona che l\'app non conosce e stima.'}
            </p>
            {posseduta.osservate && !dimentica && !reali && (
              <div className="flex justify-end">
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Dimentica i valori reali" dettaglio="torna alla stima dalla base" onClick={() => setDimentica(true)} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-label m-0">Bonus per statistica (Potenziamento, Addestramento, Isolamento, Forca)</span>
            <div className="grid grid-cols-5 gap-1">
              {CHIAVI_STATISTICHE.map((k) => (
                <label key={k} className="testo-12 text-text-muted text-center">
                  {SIGLA_STATISTICA[k]} <span className="text-text-secondary">({stimate[k]})</span>
                  <input type="number" min={-99} max={99} className="form-input form-input--compatto min-h-[44px] mt-1 px-1 text-center w-full" value={bonus[k]} onFocus={(e) => e.target.select()} onChange={(e) => setBonus({ ...bonus, [k]: Math.max(-99, Math.min(99, Number(e.target.value) || 0)) })} aria-label={`Bonus ${SIGLA_STATISTICA[k]}`} />
                  <span className="block testo-12 font-semibold text-text mt-0.5">= {effettive[k]}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Azzera i bonus" disabled={CHIAVI_STATISTICHE.every((k) => bonus[k] === 0)} onClick={() => setBonus({ forza: 0, magia: 0, resistenza: 0, agilita: 0, fortuna: 0 })} />
            </div>
          </div>
          <StatisticheBarre
            statistiche={effettive}
            base={stimate}
            didascalia={`Stima al livello ${livello} ${origine === 'osservate' && osservate ? `dai valori reali registrati al livello ${osservate.livello}` : `dalla base di livello ${posseduta.livelloBase}`} (+3 punti per livello) più i bonus: i bonus restano quando la Persona sale di livello.`}
          />
          <label className="form-label">Note
            <textarea className="form-input mt-1 min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="form-label">Skill conosciute ({skillIds.length}/8)</span>
          <ul className="m-0 p-0 list-none flex flex-col gap-1">
            {skillIds.map((id, i) => {
              const s = nomeSkill(id);
              return (
                <li key={id} className="flex items-center gap-2 testo-13">
                  <span className="w-5 text-text-muted">{i + 1}.</span>
                  {s ? <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo /> : <span>#{id}</span>}
                  <span className="flex-1 text-text-secondary truncate">{s?.effettoNome}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSkillIds(skillIds.filter((x) => x !== id))} aria-label="Rimuovi skill">×</button>
                </li>
              );
            })}
          </ul>
          {skillIds.length < 8 && (
            <div className="relative">
              <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Aggiungi una skill…" />
              {candidate.length > 0 && (
                <ul className="m-0 p-0 list-none absolute z-10 left-0 right-0 mt-1 card p-1 max-h-[220px] area-scorrevole shadow-lg">
                  {candidate.map((s) => (
                    <li key={s.id}>
                      {/* `touch`: con il solo `py-2` la voce restava a 42 px — sfuggita alla prima
                          passata statica, che guardava le caselle di spunta e non tutti i comandi. */}
                      <button type="button" className="touch w-full text-left flex items-center gap-2 px-2 py-2 rounded-md hover:bg-bg-tertiary bg-transparent border-none text-text cursor-pointer" onClick={() => { setSkillIds([...skillIds, s.id]); setRicerca(''); }}>
                        <ElementoChip elemento={s.elemento} nome={s.nomeIt} piccolo />
                        <span className="testo-12 text-text-secondary truncate">{s.effettoNome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---- Aiuti: bonus e istantanea del compendio ----

/** La somma dei bonus sulle cinque statistiche. */
function totaleBonus(b: StatisticheDto): number {
  return CHIAVI_STATISTICHE.reduce((acc, k) => acc + b[k], 0);
}

/** I bonus diversi da zero come «FR +2 · MA -1» (sigle dell'app); «nessuno» se sono tutti a zero. */
function descriviBonus(b: StatisticheDto): string {
  return CHIAVI_STATISTICHE.filter((k) => b[k] !== 0).map((k) => `${SIGLA_STATISTICA[k]} ${b[k] > 0 ? '+' : ''}${b[k]}`).join(' · ') || 'nessuno';
}

/** I cinque valori reali registrati, sigla e valore, separati da « · ». */
function descriviOsservate(o: OsservazioneStatisticheDto): string {
  return CHIAVI_STATISTICHE.map((k) => `${SIGLA_STATISTICA[k]} ${o[k]}`).join(' · ');
}
