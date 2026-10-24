// ============================================================
// DettaglioConfidente — tutti i comandi del Confidente scelto nella scheda «Confidenti» della partita
// ============================================================
//
// Il flusso di una salita di rango: apro il Confidente → vedo rango, punti mancanti e requisiti → leggo le risposte migliori del prossimo
// dialogo (subito sotto le note ♪) → registro note, regalo, uscita → salgo di rango con «+». Questo componente è solo presentazione: le
// azioni (salva, annulla ultimo, conferma, note, regalo…) restano in `ConfidentiPartita`, che le passa in `azioni`. Sta nel pannello
// fisso a destra (da 1024 px) o nel foglio che si apre toccando una riga (sotto i 1024 px).
// ============================================================

import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AnelloAvanzamento } from '../shared/AnelloAvanzamento';
import { IconaAzione } from '../shared/IconaAzione';
import { IconMaschera } from '../shared/iconeGuida';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { TargaSuggerito } from '../shared/Suggerito';
import { SemaforiRango } from './SemaforiRango';
import { RisposteMigliori } from './RisposteMigliori';
import { InfoSalitaRango } from './InfoSalitaRango';
import { aPuntiDi } from './regoleConfidente';
import { slug } from '../../../shared/slug';
import { formattaPunti } from '../../utils/punti';
import type { ConfidentePartitaDto } from '../../types';

/** Le azioni che il pannello può chiedere; la logica (e le notifiche) sta in `ConfidentiPartita`. */
export interface AzioniConfidente {
  cambiaRango: (rango: number) => void;
  /** «Segna comunque»: porta al rango bloccato saltando i requisiti. */
  forzaRango: (rango: number) => void;
  conferma: (rango: number, indice: number, confermato: boolean) => void;
  correggi: (rango: number) => void;
  nota: (n: 1 | 2 | 3) => void;
  regala: () => void;
  regalo: () => void;
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
  /** Anteprima dei punti: stessa regola del server, col bonus arcano e l'invito scelti. */
  anteprima: (cosa: { noteRisposta?: 1 | 2 | 3; regalo?: boolean; uscita?: boolean }) => number;
  azioni: AzioniConfidente;
}

/** Il pannello (o il corpo del foglio) di un Confidente: testata, rango, requisiti, punti e risposte migliori, regalo e uscita, note. */
export function DettaglioConfidente({ c, occupato: occ, bonus, ultimo, oggi, motivoOggi, anteprima, azioni }: Props) {
  const aPunti = aPuntiDi(c);
  const quota = aPunti ? Math.min(1, c.punti / (c.puntiNecessari ?? 1)) : c.rango === 10 ? 1 : 0;
  const semaforo = c.rango < 10 ? c.semafori[0] : undefined;
  // il blocco e i semafori dicono lo stesso rango: i motivi stanno già nei semafori, non si ripetono in elenco
  const motiviNeiSemafori = !!c.bloccato && semaforo?.rango === c.bloccato.rango;
  const valoreRegalo = formattaPunti(anteprima({ regalo: true }));
  return (
    <div className="dettaglio-confidente" data-confidente={c.chiave}>
      {/* testata: ritratto con anello del rango, nome, arcano, collegamenti raggruppati */}
      <header className="flex gap-3">
        <div className="relative shrink-0 self-start">
          <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={72} forma="carta" adatta="copri" modificabile />
          <div className="poster__rango poster__rango--piccolo">
            <AnelloAvanzamento quota={quota} dimensione={46} spessore={3} etichetta={aPunti ? `Progresso di ${c.nome} verso il rango ${c.rango + 1}` : undefined}>
              <AssetImg
                nome={c.rango === 0 ? null : c.rango === 10 ? 'ui/rango-max' : `ui/rango-${c.rango}`}
                alt={c.rango === 10 ? 'Rango MAX' : `Rango ${c.rango}`}
                className="h-8 w-8 object-contain"
                fallback={<span className={`font-display text-[20px] leading-none tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>}
              />
            </AnelloAvanzamento>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h3 className="m-0 font-display uppercase text-[24px] leading-none tracking-wide break-words">{c.nome}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="chip">{c.arcanaNome}</span>
            {oggi && <TargaSuggerito motivo={motivoOggi} compatta />}
            {c.regaliFatti.length > 0 && <span className="text-[12px] text-text-muted">{c.regaliFatti.length} {c.regaliFatti.length === 1 ? 'regalo consegnato' : 'regali consegnati'}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(c.chiave)}`} tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda" aria-label={`Scheda di ${c.nome}: risposte migliori, abilità, regali`} />
            <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(c.chiave)}?informazioni=1`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Informazioni" aria-label={`Modifica le informazioni di ${c.nome}`} />
          </div>
        </div>
      </header>

      {/* rango − / + e stato del passaggio */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] uppercase tracking-wide text-text-muted flex-1">Rango {c.rango === 10 ? 'MAX' : c.rango}</span>
        <button type="button" className="btn btn-secondary btn-sm touch w-12" disabled={occ || c.rango === 0} onClick={() => azioni.cambiaRango(c.rango - 1)} aria-label={`Rango di ${c.nome} meno uno`}>−</button>
        <button type="button" className="btn btn-primary btn-sm touch w-12" disabled={occ || c.rango === 10 || !!c.bloccato} title={c.bloccato ? `Bloccato: ${c.bloccato.motivi.join(' · ')}` : undefined} onClick={() => azioni.cambiaRango(c.rango + 1)} aria-label={`Rango di ${c.nome} più uno${c.bloccato ? ' (bloccato dai requisiti)' : ''}`}>+</button>
      </div>

      {c.rango === 0 && <p className="m-0 text-[13px] text-text-muted">Non ancora avviato: porta il rango a 1 quando lo incontri in gioco.</p>}
      {c.rango > 0 && c.rango < 10 && c.puntiNecessari === 0 && <p className="m-0 text-[13px] text-text-muted">Il rango {c.rango + 1} non dipende dai punti: niente note da contare.</p>}
      {c.rango > 0 && c.rango < 10 && c.puntiNecessari === null && <p className="m-0 text-[13px] text-text-muted">Solo trama: niente note da contare.</p>}
      {c.rango === 10 && <p className="m-0 text-[13px] text-text-muted">Rango massimo raggiunto.</p>}

      {/* blocco dei requisiti: la targa e «Segna comunque», i semafori del rango successivo */}
      {c.bloccato && (
        <div className="blocco-confidente" role="status">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip chip--icona chip--bloccata text-[11px]"><IconaAzione chiave="bloccato" dimensione={14} />Bloccato · rango {c.bloccato.rango}</span>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="attiva" dimensione={20} />} titolo="Segna comunque" dettaglio={`rango ${c.bloccato.rango}`} disabled={occ}
              onClick={() => azioni.forzaRango(c.bloccato!.rango)}
              aria-label={`${c.nome}: segna comunque il rango ${c.bloccato.rango} nonostante i requisiti`} />
          </div>
          {!motiviNeiSemafori && <ul className="m-0 pl-4 text-[12px] text-text-secondary">{c.bloccato.motivi.map((m) => <li key={m}>{m}</li>)}</ul>}
        </div>
      )}
      {semaforo && (
        <SemaforiRango semafori={semaforo} compatto occupato={occ} onConferma={(rango, r, confermato) => azioni.conferma(rango, r.indice, confermato)} onCorreggi={(rango) => azioni.correggi(rango)} />
      )}

      {/* punti verso il rango successivo e note della risposta */}
      {aPunti && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[13px] flex-wrap">
            <span className="text-text-muted">Punti verso il rango {c.rango + 1}:</span>
            <strong className="tabular-nums font-display text-[18px] leading-none">{formattaPunti(c.punti)}</strong>
            <span className="text-text-secondary">/ {c.puntiNecessari} — {c.mancanti === 0 ? <strong className="text-primary">soglia raggiunta</strong> : <>mancano <strong className="text-text">{formattaPunti(c.mancanti ?? 0)}</strong></>}</span>
          </div>
          <PulsanteVisivo
            attivo={bonus}
            compatto
            className="self-start"
            icona={<AssetImg nome={`arcani/icona/${slug(c.arcana)}`} alt="" decorativa className="h-6 w-6 object-contain" fallback={<IconMaschera size={20} />} />}
            titolo={`Persona ${c.arcanaNome}`}
            dettaglio={c.personaArcanoInScorta ? '×1,5 · in scorta' : '×1,5 · attiva a mano'}
            onClick={() => azioni.bonus(!bonus)}
            title={c.personaArcanoInScorta ? `Nella scorta c'è una Persona ${c.arcanaNome}: bonus ×1,5 attivo` : `Nessuna Persona ${c.arcanaNome} in scorta: attiva il bonus a mano se la possiedi`}
          />
          <div className="flex flex-wrap gap-1.5">
            {([1, 2, 3] as const).map((n) => {
              const valore = anteprima({ noteRisposta: n });
              return (
                <button key={n} type="button" className="btn btn-primary btn-sm touch flex-1 min-w-[72px]" disabled={occ} onClick={() => azioni.nota(n)} aria-label={`${c.nome}: risposta da ${n} ${n === 1 ? 'nota' : 'note'} (${formattaPunti(valore)} punti)`}>
                  <span aria-hidden="true">{'♪'.repeat(n)}</span> <span className="text-[12px] opacity-90">+{formattaPunti(valore)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* le risposte migliori del prossimo dialogo, subito sotto le note */}
      <RisposteMigliori chiave={c.chiave} nome={c.nome} rango={c.rango} />

      {aPunti && (
        <div className="flex flex-wrap gap-1.5">
          {/* con regali collegati al catalogo «Regala» apre la finestra unica (oggetto → punti, consegna, acquisto);
              senza, resta il regalo con i punti subito, come prima: nessuna capacità si perde */}
          {c.haRegaliCatalogo
            ? <PulsanteVisivo className="flex-1 min-w-[120px]" icona={<IconaAzione chiave="regalo" dimensione={24} />} titolo="Regala" dettaglio={`+${valoreRegalo} punti`} disabled={occ} onClick={azioni.regala} aria-label={`${c.nome}: regala un oggetto (${valoreRegalo} punti)`} />
            : <PulsanteVisivo className="flex-1 min-w-[120px]" icona={<IconaAzione chiave="regalo" dimensione={24} />} titolo="Regalo" dettaglio={`+${valoreRegalo} punti`} disabled={occ} onClick={azioni.regalo} aria-label={`${c.nome}: regalo gradito (${valoreRegalo} punti)`} />}
          <PulsanteVisivo className="flex-1 min-w-[120px]" icona={<IconaAzione chiave="uscita" dimensione={24} />} titolo="Uscita" dettaglio={`+${formattaPunti(anteprima({ uscita: true }))} punti`} disabled={occ} onClick={azioni.uscita} aria-label={`${c.nome}: uscita insieme (${formattaPunti(anteprima({ uscita: true }))} punti)`} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla-ultimo" dimensione={20} />} titolo={`Annulla ultimo${ultimo ? ` (${ultimo.regalo ? 'regalo ' : ''}−${formattaPunti(ultimo.punti)})` : ''}`} disabled={occ || !ultimo} onClick={azioni.annullaUltimo} aria-label={`${c.nome}: annulla ${ultimo?.regalo ? 'l\'ultimo regalo' : 'l\'ultimo incremento'}`} />
        </div>
      )}

      <InfoSalitaRango c={c} />

      {/* «Sbloccato» è un comando solo a rango 0: dal rango 1 il Confidente è sbloccato di fatto */}
      {c.rango === 0 && (
        <PulsanteVisivo className="self-start" attivo={c.sbloccato} compatto icona={c.sbloccato ? <IconaAzione chiave="sbloccato" dimensione={20} /> : <IconaAzione chiave="bloccato" dimensione={20} />} titolo={c.sbloccato ? 'Sbloccato' : c.bloccato ? 'Bloccato' : 'Da sbloccare'} dettaglio={c.bloccato ? 'requisiti mancanti' : 'quando lo incontri in gioco'} disabled={occ || (!c.sbloccato && !!c.bloccato)} onClick={azioni.sbloccato} aria-label={`${c.nome}: ${c.sbloccato ? 'sbloccato' : c.bloccato ? 'bloccato dai requisiti' : 'da sbloccare quando lo incontri'}`} />
      )}

      <div className="flex flex-col gap-1">
        <PulsanteVisivo className="self-start" tono="fantasma" compatto icona={<IconaAzione chiave="note" dimensione={20} />} titolo={c.note ? 'Note' : 'Aggiungi note'} onClick={azioni.apriNote} />
        {c.note && <p className="m-0 text-[12px] text-text-secondary whitespace-pre-wrap line-clamp-3">{c.note}</p>}
      </div>
    </div>
  );
}
