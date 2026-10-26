// ============================================================
// ForcaIsolamento — calcolatori della Forca (Potenziamento) e dell'Isolamento (incenso) sulla scorta della partita
// ============================================================

import { useMemo, useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { eseguiIsolamento, getIncensiIsolamento, getPossedute, getSuggerimentoIsolamento } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { EseguiForcaModal } from './EseguiForcaModal';
import { NOMI_STATISTICHE, type ChiaveStatistica } from '../../../shared/statistiche';
import { useCarica } from '../../hooks/useCarica';
import { Spinner } from '../shared/PageState';
import { FORCA_INCIDENTE_BONUS, INCENSI, ISOLAMENTO_AVVISO, giorniIsolamento, guadagnoIncenso, moltiplicatoreForca, tierResistenza } from '../../../shared/bonusVelluto';
import type { PersonaPossedutaDto, PersonaRiassuntoDto, VellutoDto } from '../../types';
import { SelettorePosseduta } from './SelettorePosseduta';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';

interface Props {
  persone: PersonaRiassuntoDto[];
  partitaId: number | null;
  velluto: VellutoDto | null;
}

/** Forca: scegli il ricevente nella scorta; i sacrifici possibili (scorta) sono ordinati per moltiplicatore EXP. */
function Forca({ scorta, persone, velluto, partitaId, onScortaCambiata }: { scorta: PersonaPossedutaDto[]; persone: PersonaRiassuntoDto[]; velluto: VellutoDto | null; partitaId: number; onScortaCambiata: () => void }) {
  const [riceventeId, setRiceventeId] = useState<number | null>(null);
  const [sacrificioId, setSacrificioId] = useState<number | null>(null);
  const ricevente = scorta.find((p) => p.id === riceventeId) ?? null;
  /** Rango del Confidente dell'arcano indicato secondo i dati del Velluto della partita (0 se assenti). */
  const rangoDi = (arcana: string) => velluto?.arcani.find((a) => a.arcana === arcana)?.rango ?? 0;
  const igorMax = rangoDi('Fool') >= 10;
  const allarme = velluto?.allarmeAttivo ?? false;
  const candidati = useMemo(() => {
    if (!ricevente) return [];
    /** Stessa lettura del rango di sopra, definita dentro il memo così che il calcolo dei candidati usi solo le dipendenze dichiarate (fra cui `velluto`). */
    const rangoDi = (arcana: string) => velluto?.arcani.find((a) => a.arcana === arcana)?.rango ?? 0;
    const igorMax = rangoDi('Fool') >= 10;
    const allarme = velluto?.allarmeAttivo ?? false;
    return scorta
      .filter((p) => p.id !== ricevente.id)
      .map((p) => {
        const info = persone.find((x) => x.id === p.personaId);
        const esito = moltiplicatoreForca({
          rangoConfidente: rangoDi(ricevente.arcana), igorMax, stessaArcana: p.arcana === ricevente.arcana, tesoro: info?.rara ?? false, allarme, penalitaLivello: p.livello > ricevente.livello,
        });
        return { p, esito };
      })
      .sort((a, b) => b.esito.moltiplicatore - a.esito.moltiplicatore || b.p.livello - a.p.livello);
  }, [ricevente, scorta, persone, velluto]);

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 testo-15 font-semibold">Forca (Potenziamento)</h2>
      <p className="m-0 testo-13 text-text-secondary">Sacrifica una Persona per dare EXP a un'altra. L'EXP di base dipende dal livello del sacrificio; qui vedi i moltiplicatori: rango del Confidente dell'arcano del ricevente (Igor al massimo aumenta), stesso arcano ×1,5, Demone del Tesoro ×3/×5, Allarme 2/3/5/7, sacrificio di livello superiore ×0,5. Una skill trasferita a caso (1–3 con l'Allarme); un uso al giorno per Persona (nessun limite con l'Allarme).</p>
      {scorta.length < 2 ? (
        <p className="m-0 testo-13 text-text-muted">Servono almeno due Persona nella scorta della partita attiva.</p>
      ) : (
        <>
          <SelettorePosseduta etichetta="Persona ricevente" persone={scorta} sceltaId={riceventeId} onScegli={setRiceventeId} />
          {ricevente && (
            <>
              <div className="testo-12 text-text-muted">Confidente {ricevente.arcanaNome}: rango {rangoDi(ricevente.arcana)}{igorMax ? ' · Igor al massimo' : ''}{allarme ? ' · Allarme attivo' : ''}</div>
              <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label="Sacrifici possibili">
                {candidati.map(({ p, esito }) => (
                  <li key={p.id} className="py-2 flex flex-col gap-0.5 testo-13">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={40} />
                      <span className="font-display uppercase testo-17 leading-none">{p.nomeIt}</span>
                      <span className="text-text-muted">{p.arcanaNome} · livello {p.livello}</span>
                      {p.carica && <span className="chip" title="Creata durante l'Allarme: alla Forca provoca un incidente garantito con +10 punti">gialla</span>}
                      <span className="ml-auto chip chip--attivo font-black tabular-nums">EXP ×{esito.moltiplicatore.toLocaleString('it-IT')}</span>
                      <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esegui" dimensione={20} />} titolo="Esegui" onClick={() => setSacrificioId(p.id)} />
                    </div>
                    <div className="testo-12 text-text-muted">
                      {esito.fattori.length === 0 ? 'Nessun bonus' : esito.fattori.map((f) => `${f.nome} ×${f.valore.toLocaleString('it-IT')}`).join(' · ')}
                      {esito.interpolato && ' · rango intermedio: valore stimato'} · skill trasferite: {esito.skillTrasferite}
                    </div>
                  </li>
                ))}
              </ul>
              {allarme && <p className="m-0 testo-12 text-warning">Con l'Allarme un incidente azzera l'EXP ma garantisce +{FORCA_INCIDENTE_BONUS.sacrificioNormale} punti statistica (+{FORCA_INCIDENTE_BONUS.unaPersonaCarica}/+{FORCA_INCIDENTE_BONUS.entrambeCariche} con Persona «cariche»).</p>}
              {sacrificioId !== null && (() => {
                const c = candidati.find((x) => x.p.id === sacrificioId);
                return c ? (
                  <EseguiForcaModal partitaId={partitaId} ricevente={ricevente} sacrificio={c.p} stima={c.esito} allarme={allarme} onChiudi={() => setSacrificioId(null)} onEseguita={() => { setSacrificioId(null); onScortaCambiata(); }} />
                ) : null;
              })()}
            </>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Isolamento: Persona (scorta), incenso, giorni → punti stimati e resistenza ottenuta. Ondata 5 (lotto F-bis): l'incenso è un oggetto del catalogo
 * (`GET …/velluto/incensi`): le statistiche sono quelle del suo nome, il prezzo è quello dell'offerta (Mantra Ganda in yen, Jose in fiori) e
 * registrando l'Isolamento una copia esce da quelle possedute; le copie che la partita ha si vedono nella scelta.
 */
function Isolamento({ scorta, velluto, partitaId, onScortaCambiata }: { scorta: PersonaPossedutaDto[]; velluto: VellutoDto | null; partitaId: number; onScortaCambiata: () => void }) {
  const [possedutaId, setPossedutaId] = useState<number | null>(null);
  const incensi = useCarica(() => getIncensiIsolamento(partitaId), [partitaId]);
  const [oggettoScelto, setOggettoScelto] = useState<string | null>(null);
  const [giorni, setGiorni] = useState(4);
  const persona = scorta.find((p) => p.id === possedutaId) ?? null;
  const elenco = incensi.dati ?? [];
  const scelto = elenco.find((i) => i.oggetto === oggettoScelto) ?? elenco[0] ?? null;
  const incenso = scelto ? INCENSI.find((i) => i.chiave === scelto.incenso) ?? null : null;
  const allarme = velluto?.allarmeAttivo ?? false;
  const rangoGemelle = velluto?.gemelle.rango ?? 0;
  const guadagno = incenso ? guadagnoIncenso(incenso, giorni, allarme) : { applicazioni: 0, puntiPerStatistica: 0, totale: 0 };
  const statScelte: ChiaveStatistica[] = scelto ? [...scelto.statistiche] : [];
  const [occupato, setOccupato] = useState(false);
  const suggerimento = useCarica(() => (persona ? getSuggerimentoIsolamento(partitaId, persona.id) : Promise.resolve(null)), [partitaId, persona?.id, persona?.livello]);
  /**
   * Registra l'isolamento della Persona scelta con l'incenso del catalogo e i giorni indicati (le statistiche sono quelle dell'incenso); a buon
   * fine notifica i punti guadagnati e l'eventuale skill appresa, fa ricaricare la scorta e le copie degli incensi, altrimenti notifica l'errore.
   */
  const registra = async () => {
    if (!persona || !scelto) return;
    setOccupato(true);
    try {
      const esito = await eseguiIsolamento(partitaId, { possedutaId: persona.id, oggetto: scelto.oggetto, giorni });
      notifica('success', `${persona.nomeIt}: +${esito.guadagno.puntiPerStatistica} a ${statScelte.map((k) => NOMI_STATISTICHE[k]).join(', ')}${esito.skillAppresa ? `, appresa ${esito.skillAppresa.nomeIt}` : ''}; usata una copia di ${scelto.nome}.`);
      onScortaCambiata();
      void incensi.ricarica();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Registrazione fallita.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 testo-15 font-semibold">Isolamento (addestramento)</h2>
      <p className="m-0 testo-13 text-text-secondary">Sbloccato al rango 3 delle Gemelle. La Persona in isolamento impara una skill di resistenza contro la sua debolezza (il tier dipende dal suo livello al deposito) e, bruciando un incenso, guadagna statistiche ogni 2 giorni (raddoppiate durante l'Allarme). Attenzione: avviso al giorno {ISOLAMENTO_AVVISO.giornoAvviso}, perdita al giorno {ISOLAMENTO_AVVISO.giornoPerdita}.</p>
      {rangoGemelle < 3 && <p className="m-0 testo-12 text-warning">Gemelle al rango {rangoGemelle}: l'Isolamento non è ancora sbloccato nella partita attiva.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-3"><SelettorePosseduta etichetta="Persona da isolare" persone={scorta} sceltaId={possedutaId} onScegli={setPossedutaId} /></div>
        <div className="form-label">
          <Selettore etichettaSopra etichetta="Incenso" valore={scelto?.oggetto ?? ''} disabilitato={incensi.caricamento && !incensi.dati}
            opzioni={elenco.map((i) => ({ chiave: i.oggetto, nome: i.nome, dettaglio: [i.dove[0] ?? 'tesoro dei Palazzi', i.disponibili > 0 ? `${i.disponibili} ${i.disponibili === 1 ? 'copia' : 'copie'}` : null].filter(Boolean).join(' · ') }))}
            onCambia={setOggettoScelto} />
        </div>
        <label className="form-label">Giorni
          <input type="number" min={1} max={ISOLAMENTO_AVVISO.giornoPerdita - 1} className="form-input" value={giorni} onChange={(e) => setGiorni(Math.min(ISOLAMENTO_AVVISO.giornoPerdita - 1, Math.max(1, Number(e.target.value) || 1)))} aria-label="Giorni di isolamento" />
        </label>
      </div>
      <div className="testo-13 flex flex-col gap-1">
        <div>Durata dell'addestramento al rango {rangoGemelle} delle Gemelle: <strong>{giorniIsolamento(rangoGemelle)} giorni</strong>{rangoGemelle < 3 ? ' (una volta sbloccato)' : ''}.</div>
        {incensi.errore && <div role="alert" className="text-error-testo">Gli incensi non si sono caricati: {incensi.errore}</div>}
        {scelto && incenso && (
          <div>«{scelto.nome}» per {giorni} giorni{allarme ? ' con Allarme' : ''}: <strong className="tabular-nums">{guadagno.applicazioni}</strong> applicazioni → <strong className="tabular-nums">+{guadagno.puntiPerStatistica}</strong> per statistica interessata ({incenso.statistiche === 1 ? 'una statistica' : `${incenso.statistiche} statistiche`}, totale +{guadagno.totale}).
            {scelto.dove.length > 0 && <span className="text-text-muted"> Si compra: {scelto.dove.join('; ')}.</span>}
            {/* le copie si dicono solo se la partita ne ha, o se non ne ha e l'Isolamento ne userebbe una che l'app non conosce */}
            <span className={scelto.disponibili > 0 ? 'text-text-muted' : 'text-warning'}> {scelto.disponibili > 0 ? `Ne hai ${scelto.disponibili}: registrando ne usi una.` : 'Nella partita non risulta nessuna copia: registrando, l’uso si segna comunque.'}</span>
          </div>
        )}
        {persona && (
          <div>
            {persona.nomeIt} (livello {persona.livello}): resistenza ottenuta di tier <strong>{tierResistenza(persona.livello).skill}</strong>
            {tierResistenza(persona.livello).livelloMax !== null && <span className="text-text-muted"> · dal livello {tierResistenza(persona.livello).livelloMax! + 1} il tier successivo</span>}
            {persona.livello < 34 && <span className="text-warning"> · sotto il livello 34 la debolezza non viene coperta (solo schivata)</span>}
          </div>
        )}
        {persona && suggerimento.dati && (
          <div>Skill di resistenza prevista: <strong>{suggerimento.dati.skill ? suggerimento.dati.skill.nomeIt : 'nessuna nel dataset'}</strong>{suggerimento.dati.elementoNome ? ` (debolezza: ${suggerimento.dati.elementoNome})` : ' (nessuna debolezza)'}.</div>
        )}
        {statScelte.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="testo-12 text-text-muted">Statistiche dell’incenso:</span>
            {statScelte.map((k) => <span key={k} className="chip">{NOMI_STATISTICHE[k]}</span>)}
          </div>
        )}
        {persona && (
          <div className="flex items-center gap-2 flex-wrap">
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={<>Registra l'isolamento su {persona.nomeIt}</>} disabled={occupato || !scelto || rangoGemelle < 3} onClick={() => void registra()} />
          </div>
        )}
      </div>
    </section>
  );
}

/** Vista «Forca e Isolamento». */
export function ForcaIsolamento({ persone, partitaId, velluto }: Props) {
  const scorta = useCarica(() => (partitaId ? getPossedute(partitaId) : Promise.resolve([] as PersonaPossedutaDto[])), [partitaId]);
  if (!partitaId) return <p className="m-0 testo-13 text-text-muted">Serve una partita attiva con Persona nella scorta.</p>;
  if (!scorta.dati) return <div className="flex justify-center py-6"><Spinner /></div>;
  return (
    <div className="flex flex-col gap-3">
      <Forca scorta={scorta.dati} persone={persone} velluto={velluto} partitaId={partitaId} onScortaCambiata={() => void scorta.ricarica()} />
      <Isolamento scorta={scorta.dati} velluto={velluto} partitaId={partitaId} onScortaCambiata={() => void scorta.ricarica()} />
    </div>
  );
}
