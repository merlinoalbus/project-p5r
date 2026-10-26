// ============================================================
// DettaglioConfidente — la vista «Level up» del cassetto del Confidente nella scheda «Confidenti» della partita
// ============================================================
//
// Progetto approvato dall'utente (2026-10-24, tavole 3 e 4 del canvas). Gerarchia: chi è (ritratto grande, nome, carta dell'arcano in
// miniatura) → a che rango sta (targa: − RANGO N +, barra dei punti, quanto manca) → che cosa serve per salire («Verso il rango N+1»:
// requisiti, moltiplicatori) → le risposte migliori dell'evento → la registrazione (Risposta ♪ / ♪♪ / ♪♪♪, Regala, Uscita, Annulla
// ultimo) → il resto (prossima abilità, regali graditi, sblocco, note). Quando il cassetto è largo abbastanza (`.dettaglio-confidente__colonne`,
// container query) le risposte stanno nella colonna destra accanto al level up; in una colonna sola (telefono) stanno subito prima delle
// note ♪: prima si legge la risposta, poi si registra.
//
// Stati della targa: in corso (barra e «mancano»); Pronto (soglia raggiunta: il + diventa «Sali al rango N+1»); Bloccato (il + è spento,
// accanto «Segna comunque»); solo trama / senza punti (testo breve); MAX. Dopo una salita (`appenaSalito`) le risposte mostrate sono quelle
// dell'evento appena giocato: le note che dà si registrano subito e valgono già verso il rango successivo.
// Questo componente è solo presentazione: le azioni restano in `ConfidentiPartita`, che le passa in `azioni`.
// ============================================================

import type { ReactNode } from 'react';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AnelloAvanzamento } from '../shared/AnelloAvanzamento';
import { IconaAzione } from '../shared/IconaAzione';
import { IconMaschera } from '../shared/iconeGuida';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { TargaSuggerito } from '../shared/Suggerito';
import { SemaforiRango } from './SemaforiRango';
import { RisposteMigliori } from './RisposteMigliori';
import { InfoSalitaRango } from './InfoSalitaRango';
import { aPuntiDi, sogliaRaggiunta } from './regoleConfidente';
import { slug } from '../../../shared/slug';
import { formattaPunti } from '../../utils/punti';
import { noteAParole, simboliNote } from '../../../shared/note';
import type { ConfidentePartitaDto } from '../../types';

/** Le azioni che il dettaglio può chiedere; la logica (e le notifiche) sta in `ConfidentiPartita`. */
export interface AzioniConfidente {
  cambiaRango: (rango: number) => void;
  /** «Segna comunque»: porta al rango bloccato saltando i requisiti. */
  forzaRango: (rango: number) => void;
  conferma: (rango: number, indice: number, confermato: boolean) => void;
  /** «Correggi» un requisito: apre la scheda completa nel cassetto sui requisiti di quel rango. */
  correggi: (rango: number) => void;
  /** Passa alla vista «Scheda completa» del cassetto (le informazioni non portano mai fuori). */
  apriScheda: () => void;
  nota: (n: 1 | 2 | 3) => void;
  regala: () => void;
  uscita: () => void;
  annullaUltimo: () => void;
  sbloccato: () => void;
  apriNote: () => void;
  bonus: (valore: boolean) => void;
}

interface Props {
  c: ConfidentePartitaDto;
  occupato: boolean;
  bonus: boolean;
  /** L'ultima azione annullabile (punti dell'incremento, oppure il regalo con la sua consegna). */
  ultimo?: { punti: number; regalo?: string };
  oggi: boolean;
  motivoOggi?: string | null;
  /** Il rango attuale è stato appena raggiunto in questo cassetto: le risposte sono quelle dell'evento appena giocato. */
  appenaSalito: boolean;
  /** Anteprima dei punti: stessa regola del server, col bonus arcano e l'invito scelti. */
  anteprima: (cosa: { noteRisposta?: 1 | 2 | 3; regalo?: boolean; uscita?: boolean }) => number;
  /** I moltiplicatori della partita (esami, invito SMS): valgono per tutti, si scelgono qui accanto al bonus dell'arcano. */
  moltiplicatori?: ReactNode;
  azioni: AzioniConfidente;
}

/** La vista «Level up»: testata con la targa del rango, «Verso il rango N+1», risposte migliori, registrazione dei punti, il resto. */
export function DettaglioConfidente({ c, occupato: occ, bonus, ultimo, oggi, motivoOggi, appenaSalito, anteprima, moltiplicatori, azioni }: Props) {
  const aPunti = aPuntiDi(c);
  const pronto = sogliaRaggiunta(c) && !c.bloccato;
  const quota = aPunti ? Math.min(1, c.punti / (c.puntiNecessari ?? 1)) : c.rango === 10 ? 1 : 0;
  const semaforo = c.rango < 10 ? c.semafori[0] : undefined;
  // il blocco e i semafori dicono lo stesso rango: i motivi stanno già nei semafori, non si ripetono in elenco
  const motiviNeiSemafori = !!c.bloccato && semaforo?.rango === c.bloccato.rango;
  const valoreRegalo = formattaPunti(anteprima({ regalo: true }));
  const prossimo = c.rango + 1;
  return (
    <div className="dettaglio-confidente" data-confidente={c.chiave}>
      {/* testata: ritratto grande, nome, carta dell'arcano in miniatura, targa del rango */}
      {/* la filigrana dell'arcano resta dentro la testata (`overflow-hidden` qui, non sul contenitore: nel cassetto lo farebbe restringere) */}
      {/* griglia della testata: ritratto e nome sopra; la targa accanto al ritratto nel cassetto largo, sotto a tutta larghezza in quello stretto */}
      <header className="testata-confidente relative overflow-hidden">
        <AssetImg nome={`arcani/${slug(c.arcana)}-senza-testo`} alt="" decorativa dimensione={96} className="poster__filigrana" fallback={null} />
        <div className="testata-confidente__ritratto">
          <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={96} forma="carta" adatta="copri" modificabile />
        </div>
        <div className="testata-confidente__info flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="m-0 min-w-0 font-display uppercase testo-28 leading-none tracking-wide break-words">{c.nome}</h3>
            {oggi && <TargaSuggerito motivo={motivoOggi} compatta />}
          </div>
          <div className="flex items-center gap-2">
            <AssetImg nome={`arcani/${slug(c.arcana)}`} alt={`Carta dell'arcano ${c.arcanaNome}`} dimensione={34} className="carta-arcano-mini" fallback={<IconMaschera size={20} />} />
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-display uppercase testo-16 leading-none tracking-wide">{c.arcanaNome}</span>
              {c.regaliFatti.length > 0 && <span className="testo-12 text-text-muted">{c.regaliFatti.length} {c.regaliFatti.length === 1 ? 'regalo consegnato' : 'regali consegnati'}</span>}
            </div>
          </div>
        </div>
          {/* la targa del rango: − e + ai lati del numero, la barra e quanto manca accanto; lo stato cambia il comando giusto */}
          <div className={`targa-rango testata-confidente__targa ${pronto ? 'targa-rango--pronto' : ''} ${c.bloccato ? 'targa-rango--bloccato' : ''}`}>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" className="btn btn-secondary btn-sm touch w-11" disabled={occ || c.rango === 0} onClick={() => azioni.cambiaRango(c.rango - 1)} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
              <div className="flex flex-col items-center gap-0.5 leading-none">
                <span className="testo-12 font-bold uppercase tracking-[.14em] text-text-secondary">Rango</span>
                <AnelloAvanzamento quota={quota} dimensione={62} spessore={4} etichetta={aPunti ? `Progresso di ${c.nome} verso il rango ${prossimo}` : undefined}>
                  <AssetImg
                    nome={c.rango === 0 ? null : c.rango === 10 ? 'ui/rango-max' : `ui/rango-${c.rango}`}
                    alt={c.rango === 10 ? 'Rango MAX' : `Rango ${c.rango}`}
                    className="h-11 w-11 object-contain"
                    fallback={<span className={`font-display testo-28 leading-none tabular-nums ${c.rango === 10 ? 'text-primary-testo' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>}
                  />
                </AnelloAvanzamento>
              </div>
              {!pronto && <button type="button" className="btn btn-primary btn-sm touch w-11" disabled={occ || c.rango === 10 || !!c.bloccato} title={c.bloccato ? `Bloccato: ${c.bloccato.motivi.join(' · ')}` : undefined} onClick={() => azioni.cambiaRango(prossimo)} aria-label={`Rango di ${c.nome} più uno${c.bloccato ? ' (bloccato dai requisiti)' : ''}`}>+</button>}
            </div>
            <div className="targa-rango__info flex flex-col gap-1">
              {aPunti && (
                <span className="targa-rango__barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(quota * 100)} aria-label={`Punti di ${c.nome} verso il rango ${prossimo}`}>
                  <span style={{ width: `${Math.round(quota * 100)}%` }} />
                </span>
              )}
              <span className="testo-13 leading-tight">
                {c.bloccato ? <span className="text-text-secondary">Bloccato: il rango {c.bloccato.rango} {c.bloccato.motivi[0] ? `— ${c.bloccato.motivi[0]}` : 'ha requisiti mancanti'}</span>
                  : aPunti ? (
                    <>
                      <strong className="tabular-nums font-display testo-18">{formattaPunti(c.punti)}</strong>
                      <span className="text-text-secondary"> / {c.puntiNecessari} verso il {prossimo}</span>
                      {' · '}
                      {c.mancanti === 0 ? <strong className="text-primary-testo">soglia raggiunta</strong> : <span className="text-text-secondary">mancano <strong className="text-text">{formattaPunti(c.mancanti ?? 0)}</strong></span>}
                    </>
                  ) : (
                    <span className="text-text-secondary">
                      {c.rango === 10 ? 'Rango massimo raggiunto'
                        : c.rango === 0 ? 'Da avviare: porta il rango a 1 quando lo incontri'
                          : c.puntiNecessari === null ? 'Solo trama: si sale con la storia, senza punti'
                            : `Il rango ${prossimo} non dipende dai punti`}
                    </span>
                  )}
              </span>
            </div>
            {pronto && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="su" dimensione={22} />} titolo={<>Sali al rango {prossimo}</>} className="shrink-0" disabled={occ} onClick={() => azioni.cambiaRango(prossimo)} aria-label={`${c.nome}: sali al rango ${prossimo}`} />}
            {c.bloccato && (
              <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="attiva" dimensione={20} />} titolo="Segna comunque" dettaglio={`rango ${c.bloccato.rango}`} disabled={occ}
                onClick={() => azioni.forzaRango(c.bloccato!.rango)}
                aria-label={`${c.nome}: segna comunque il rango ${c.bloccato.rango} nonostante i requisiti`} />
            )}
          </div>
      </header>

      <div className="dettaglio-confidente__colonne">
        {/* che cosa serve per salire: requisiti del prossimo rango e moltiplicatori dei punti */}
        <div className="dettaglio-confidente__testa">
          {c.rango < 10 && (semaforo || aPunti || (c.bloccato && !motiviNeiSemafori)) && <h4 className="titolo-sezione-confidente">Verso il rango {prossimo}</h4>}
          {c.bloccato && !motiviNeiSemafori && <ul className="m-0 pl-4 testo-12 text-text-secondary">{c.bloccato.motivi.map((m) => <li key={m}>{m}</li>)}</ul>}
          {semaforo && (
            <SemaforiRango semafori={semaforo} compatto occupato={occ} onConferma={(rango, r, confermato) => azioni.conferma(rango, r.indice, confermato)} onCorreggi={(rango) => azioni.correggi(rango)} />
          )}
          {aPunti && (
            <div className="flex flex-col gap-1">
              <span className="etichetta-campo-confidente">Moltiplicatori</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Moltiplicatori dei punti">
                <PulsanteVisivo
                  attivo={bonus}
                  compatto
                  icona={<AssetImg nome={`arcani/icona/${slug(c.arcana)}`} alt="" decorativa dimensione={24} quadrata className="h-6 w-6 object-contain" fallback={<IconMaschera size={20} />} />}
                  titolo={`Persona ${c.arcanaNome}`}
                  dettaglio={c.personaArcanoInScorta ? '×1,5 · in scorta' : '×1,5 · attiva a mano'}
                  onClick={() => azioni.bonus(!bonus)}
                  title={c.personaArcanoInScorta ? `Nella scorta c'è una Persona ${c.arcanaNome}: bonus ×1,5 attivo` : `Nessuna Persona ${c.arcanaNome} in scorta: attiva il bonus a mano se la possiedi`}
                />
                {moltiplicatori}
              </div>
            </div>
          )}
        </div>

        {/* le risposte migliori dell'evento: il prossimo, o quello appena giocato dopo una salita */}
        <div className="dettaglio-confidente__risposte">
          <RisposteMigliori chiave={c.chiave} nome={c.nome} rangoEvento={appenaSalito ? c.rango : prossimo} appenaGiocato={appenaSalito} />
        </div>

        {/* la registrazione: note della risposta (pulsanti della loro misura), regalo, uscita, annulla */}
        {aPunti && (
          <div className="dettaglio-confidente__registra">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Note della risposta">
              <span className="etichetta-campo-confidente w-[68px]">Risposta</span>
              {([1, 2, 3] as const).map((n) => {
                const valore = anteprima({ noteRisposta: n });
                return (
                  <button key={n} type="button" className="btn btn-primary btn-sm touch w-[76px]" disabled={occ} onClick={() => azioni.nota(n)} aria-label={`${c.nome}: risposta da ${noteAParole(n)} (${formattaPunti(valore)} punti)`}>
                    <span aria-hidden="true">{simboliNote(n)}</span> <span className="testo-12 opacity-90">+{formattaPunti(valore)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* ondata 5 (RG-10, RG-11): «Regala» apre la finestra unica (un qualunque oggetto regalo → reazione, punti, consegna, copia o
                  acquisto) e c'è solo per chi riceve regali: per Yoshida, Mishima, Morgana, Igor, Gemelle e Sae nessun pulsante */}
              {c.regalabile && <PulsanteVisivo compatto icona={<IconaAzione chiave="regalo" dimensione={24} />} titolo="Regala" dettaglio={`+${valoreRegalo} punti`} disabled={occ} onClick={azioni.regala} aria-label={`${c.nome}: regala un oggetto (${valoreRegalo} punti)`} />}
              <PulsanteVisivo compatto icona={<IconaAzione chiave="uscita" dimensione={24} />} titolo="Uscita" dettaglio={`+${formattaPunti(anteprima({ uscita: true }))} punti`} disabled={occ} onClick={azioni.uscita} aria-label={`${c.nome}: uscita insieme (${formattaPunti(anteprima({ uscita: true }))} punti)`} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla-ultimo" dimensione={20} />} titolo={`Annulla ultimo${ultimo ? ` (${ultimo.regalo ? 'regalo ' : ''}−${formattaPunti(ultimo.punti)})` : ''}`} disabled={occ || !ultimo} onClick={azioni.annullaUltimo} aria-label={`${c.nome}: annulla ${ultimo?.regalo ? 'l\'ultimo regalo' : 'l\'ultimo incremento'}`} />
            </div>
          </div>
        )}

        {/* il resto: prossima abilità e regali graditi, sblocco (solo a rango 0), note */}
        <div className="dettaglio-confidente__altro">
          <InfoSalitaRango c={c} onApriScheda={azioni.apriScheda} />
          {c.rango === 0 && (
            <PulsanteVisivo className="self-start" attivo={c.sbloccato} compatto icona={c.sbloccato ? <IconaAzione chiave="sbloccato" dimensione={20} /> : <IconaAzione chiave="bloccato" dimensione={20} />} titolo={c.sbloccato ? 'Sbloccato' : c.bloccato ? 'Bloccato' : 'Da sbloccare'} dettaglio={c.bloccato ? 'requisiti mancanti' : 'quando lo incontri in gioco'} disabled={occ || (!c.sbloccato && !!c.bloccato)} onClick={azioni.sbloccato} aria-label={`${c.nome}: ${c.sbloccato ? 'sbloccato' : c.bloccato ? 'bloccato dai requisiti' : 'da sbloccare quando lo incontri'}`} />
          )}
          <div className="flex flex-col gap-1">
            <PulsanteVisivo className="self-start" tono="fantasma" compatto icona={<IconaAzione chiave="note" dimensione={20} />} titolo={c.note ? 'Note' : 'Aggiungi note'} onClick={azioni.apriNote} />
            {c.note && <p className="m-0 testo-12 text-text-secondary whitespace-pre-wrap line-clamp-3">{c.note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
