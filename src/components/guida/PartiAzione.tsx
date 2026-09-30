// ============================================================
// PartiAzione — i pezzi comuni di una riga d'azione della giornata: immagine, cartellini, scelta delle note del Confidente
// ============================================================
//
// Un'azione della guida e una cosa da fare dell'utente sono la stessa cosa (richiesta dell'utente, 2026-09-30: «devo poter
// modificare al 100% gli eventi della guida», anche quelli aggiunti): tipo, collegamento, rango atteso, note, effetti
// della spunta, stato nella partita. Le due righe (`Azione` in GiornoGuida, `VoceMia` in VociAgenda) li mostrano con
// questi stessi pezzi, e aggiungono solo ciò che è loro (correzione della guida, «La mia»).
// ============================================================

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NOME_TIPO_AZIONE, collegamentoAzione, descriviEffetti } from '../../utils/percorso';
import type { AzionePercorsoDto } from '../../types';
import { IconaCategoria } from './IconaCategoria';
import { EmblemaDungeon } from './EmblemaDungeon';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaSpillo } from '../mappe/IconaSpillo';

/** Ciò che le due righe hanno in comune. */
export type AzioneMostrata = Pick<AzionePercorsoDto, 'azione' | 'tipo' | 'riferimento' | 'riferimentoTesto' | 'rangoAtteso' | 'note' | 'produceTesto' | 'fatta' | 'effetti' | 'stato' | 'mappa'>;

/** L'immagine della riga: il ritratto del Confidente, l'emblema del Palazzo o l'icona del tipo. */
export function ImmagineAzione({ a }: { a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'riferimentoTesto'> }) {
  if (a.riferimento?.tipo === 'confidente') return <ImmagineEntita ambito="confidente" chiave={a.riferimento.chiave} etichetta={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} adatta="copri" />;
  if (a.riferimento?.tipo === 'dungeon') return <EmblemaDungeon chiave={a.riferimento.chiave} nome={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} />;
  return <IconaCategoria categoria={a.tipo} dimensione={40} />;
}

interface PropsCartellini {
  a: AzioneMostrata;
  /** Cartellini propri della riga, dopo «Sulla mappa» (Corretta, Da rivedere, La mia…). */
  propri?: ReactNode;
  onSullaMappa?: () => void;
}

/** Tipo, collegamento, «Sulla mappa», stato nella partita, rango atteso, note, effetti dichiarati o applicati. */
export function CartelliniAzione({ a, propri, onSullaMappa }: PropsCartellini) {
  const link = collegamentoAzione(a);
  const stato = a.fatta ? null : a.stato;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="chip text-[11px]">{NOME_TIPO_AZIONE[a.tipo] ?? a.tipo}</span>
      {link ? <Link to={link.href} className="chip chip--attivo no-underline text-[11px]">{link.etichetta}</Link> : a.riferimentoTesto && <span className="chip text-[11px]">{a.riferimentoTesto}</span>}
      {a.mappa && onSullaMappa && (
        <button type="button" className="chip chip--icona touch text-[11px]" onClick={onSullaMappa} aria-label={`Sulla mappa: ${a.azione.slice(0, 60)}`}>
          <IconaSpillo tipo="passaggio" dimensione={14} />Sulla mappa
        </button>
      )}
      {propri}
      {stato?.tipo === 'consigliata' && <span className="chip chip--oro text-[11px]" title={stato.motivo ?? undefined}>Consigliata{stato.motivo ? ` · ${stato.motivo}` : ''}</span>}
      {stato?.tipo === 'bloccata' && <span className="chip chip--bloccata text-[11px]" title={stato.motivo ?? undefined}>Bloccata{stato.motivo ? `: ${stato.motivo}` : ''}</span>}
      {stato?.tipo === 'neutra' && stato.motivo && <span className="text-[12px] text-text-muted">{stato.motivo}</span>}
      {a.rangoAtteso !== null && <span className="text-[12px] text-text-muted">rango atteso {a.rangoAtteso}</span>}
      {a.note && <span className="text-[12px] text-text-secondary">{a.note}</span>}
      {/* le Doti che il gioco dà si segnano a mano (scelta dell'utente, 2026-09-30): la riga le dice, la spunta non le tocca */}
      {!a.fatta && a.produceTesto?.length > 0 && <span className="text-[12px] text-text-muted" title="Che cosa dà il gioco: le Doti le segni tu nella scheda Doti, letture e turni li segna la spunta. Si cambia da «Modifica»">Il gioco dà: {a.produceTesto.join(' · ')}</span>}
      {a.fatta && a.effetti && <span className="chip chip--attivo text-[11px]" title="Effetti della spunta: togliendola si annullano i punti del Confidente e i turni; le Doti le segni tu (la spunta non le tocca), letture e visioni restano (si disfano dalla loro pagina)">{descriviEffetti(a.effetti)}</span>}
    </span>
  );
}

/** «Quante note hai ottenuto?»: ♪, ♪♪, ♪♪♪, nessun punto, annulla. */
export function SceltaNote({ occupato, onScegli, onAnnulla }: { occupato: boolean; onScegli: (note: 1 | 2 | 3 | null) => void; onAnnulla: () => void }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[12px]" role="group" aria-label="Note ottenute con il Confidente">
      <span className="text-text-secondary">Quante note hai ottenuto?</span>
      {([1, 2, 3] as const).map((n) => (
        <button key={n} type="button" className={`chip touch ${n === 2 ? 'chip--attivo' : ''}`} disabled={occupato} onClick={() => onScegli(n)} aria-label={`${n} ${n === 1 ? 'nota' : 'note'}`}>{'♪'.repeat(n)}</button>
      ))}
      <button type="button" className="chip touch" disabled={occupato} onClick={() => onScegli(null)}>Nessun punto</button>
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onAnnulla} />
    </span>
  );
}
