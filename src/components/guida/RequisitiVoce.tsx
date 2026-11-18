// ============================================================
// RequisitiVoce — l'elenco «In scorta» di una voce del Diario: una fila di chip interruttore, uno per requisito (arcano o Persona specifica)
// ============================================================
//
// Una voce può chiedere di avere in scorta certe Persona (`AzionePercorsoDto.requisiti`, scelti nell'editor della voce). La casella di ogni
// requisito è della partita ed è un promemoria manuale: non legge né scrive la scorta. La prima spunta della voce è consentita solo con tutte le
// caselle spuntate (la casella di completamento resta spenta, e il server risponde comunque 409 `requisiti-incompleti`); l'annullo è libero.
// Una chiamata per cambio, senza ottimismo: il chip cambia quando il server ha risposto; mentre una richiesta è in corso il chip è appena
// attenuato (resta col fuoco, il tocco è ignorato). Finché la voce non è fatta la fila è sempre in vista, con il contatore «n/N» e una barra
// sottile che a N/N si fa verde («pronta»); a voce fatta si riduce a una riga (figure in miniatura e «N/N») che si apre dal tocco (la voce si
// rimonta quando cambia `fatta`, vedi `Azione`). Senza partita i chip si leggono soltanto. Chip da 44 px (`.touch`), testo da 12 px.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { impostaRequisitoVoce } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { chiaveRequisito, type RequisitoVoceDto } from '../../../shared/requisitiVoce';
import type { AzionePercorsoDto } from '../../types';
import { IconGiu } from '../shared/iconeGuida';
import { IconaArcano } from '../shared/IconaArcano';
import { idContatoreScorta, nomeRequisito } from '../../utils/requisitiVoce';

interface Props {
  a: AzionePercorsoDto;
  partitaId: number | null;
  /** La voce aggiornata dal server (dopo ogni cambio di casella). */
  onCambiata: (a: AzionePercorsoDto) => void;
}

/** Il segno di spunta del chip: compare con un piccolo rimbalzo (movimento ridotto: nessuna transizione, regola globale). */
function SegnoSpunta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 8" /></svg>
  );
}

/** L'elenco «In scorta» della voce (solo per le voci che hanno requisiti). */
export function RequisitiVoce({ a, partitaId, onCambiata }: Props) {
  const [occupate, setOccupate] = useState<ReadonlySet<string>>(new Set());
  const [aperta, setAperta] = useState(!a.fatta);
  const vivo = useRef(true);
  // le richieste partono una alla volta, in ordine: ogni risposta contiene gli effetti di tutte le precedenti, quindi con due caselle toccate di
  // seguito la voce mostrata è sempre quella più recente e nessuna risposta può riportarla indietro
  const coda = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const requisiti = a.requisiti;
  if (!requisiti?.length) return null;
  const conCaselle = partitaId !== null;
  const totale = requisiti.length;
  const fatti = requisiti.filter((r) => r.fatto === true).length;
  const pronta = conCaselle && fatti === totale;
  const cambia = async (r: RequisitoVoceDto, fatto: boolean) => {
    if (partitaId === null) return;
    const chiave = chiaveRequisito(r.arcana, r.persona);
    if (occupate.has(chiave)) return;
    setOccupate((s) => new Set(s).add(chiave));
    const richiesta = async () => {
      try {
        const agg = await impostaRequisitoVoce(partitaId, a.uid, r.arcana, r.persona, fatto);
        if (vivo.current) onCambiata(agg);
      } catch (err) {
        if (vivo.current) notifica('error', err instanceof Error ? err.message : 'Casella non aggiornata.');
      } finally {
        if (vivo.current) setOccupate((s) => { const n = new Set(s); n.delete(chiave); return n; });
      }
    };
    coda.current = coda.current.then(richiesta);
    await coda.current;
  };
  const conta = (
    // il contatore per la casella di completamento (`aria-describedby`): il suo nome non cambia, la descrizione dice quante caselle sono spuntate
    <span id={idContatoreScorta(a.uid)} className="scorta-voce__conta">
      <span className="sr-only">In scorta: </span>{conCaselle ? `${fatti}/${totale}` : totale}
      {pronta && <span className="sr-only"> pronta</span>}
    </span>
  );
  const titolo = <span className="scorta-voce__titolo">In scorta</span>;
  const testata = conCaselle && !a.fatta
    ? (
      <div className="scorta-voce__testata">
        {titolo}{conta}
        <div className="scorta-voce__barra" role="progressbar" aria-label="Persone in scorta" aria-valuemin={0} aria-valuemax={totale} aria-valuenow={fatti} aria-valuetext={`${fatti} su ${totale}`}>
          <span style={{ width: `${(fatti / totale) * 100}%` }} />
        </div>
      </div>
    )
    : conCaselle
      // a voce fatta: una riga con le figure in miniatura e «N/N», che apre e chiude la fila
      ? (
        <button type="button" className="scorta-voce__testata" aria-expanded={aperta} title={aperta ? 'Chiudi: In scorta' : 'Apri: In scorta'} onClick={() => setAperta((v) => !v)}>
          {titolo}{conta}
          {!aperta && <span className="scorta-voce__riepilogo" aria-hidden="true">{requisiti.map((r) => <IconaArcano key={chiaveRequisito(r.arcana, r.persona)} arcana={r.arcana} dimensione={20} />)}</span>}
          <span className="scorta-voce__freccia" aria-hidden="true"><IconGiu size={18} /></span>
        </button>
      )
      : <div className="scorta-voce__testata">{titolo}{conta}</div>;
  return (
    <section className={`scorta-voce ${pronta ? 'scorta-voce--pronta' : ''}`} aria-label="In scorta">
      {testata}
      {(aperta || !a.fatta || !conCaselle) && (
        <ul className="scorta-chips">
          {requisiti.map((r) => {
            const chiave = chiaveRequisito(r.arcana, r.persona);
            const spuntato = r.fatto === true;
            const nome = nomeRequisito(r);
            const contenuto = (
              <>
                <IconaArcano arcana={r.arcana} dimensione={24} />
                <span className="scorta-chip__nome">{r.arcanaNome}{r.personaNome && <span className="scorta-chip__persona"> · {r.personaNome}</span>}</span>
                {conCaselle && <span className="scorta-chip__segno" aria-hidden="true"><SegnoSpunta /></span>}
              </>
            );
            return (
              <li key={chiave}>
                {conCaselle
                  ? (
                    <label className={`scorta-chip touch ${spuntato ? 'scorta-chip--spuntato' : ''} ${occupate.has(chiave) ? 'scorta-chip--occupato' : ''}`} title={nome}>
                      <input type="checkbox" className="sr-only" checked={spuntato} aria-label={nome} aria-busy={occupate.has(chiave) || undefined}
                        onChange={(e) => void cambia(r, e.target.checked)} />
                      {contenuto}
                    </label>
                  )
                  : <span className="scorta-chip scorta-chip--lettura touch" title={nome}>{contenuto}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
