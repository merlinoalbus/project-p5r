// ============================================================
// PersoneDellArea — le Persona di un'area di un dedalo dei Memento, con la loro immagine (2026-10-11)
// ============================================================
//
// Richiesta dell'utente: «nel memento le persona disponibili devono essere visualizzate con le loro immagini e cliccabili nella
// parte alta del memento. Le persone catturate o meno non influiscono sulla percentuale di completamento del memento.» Scelte:
// «Il tocco segna catturata» (la scheda del compendio si apre da un collegamento piccolo) e «In cima a ogni area».
// Ogni Persona è una piastrella: immagine dal compendio, nome della Persona e dell'Ombra, debolezze; il tocco alterna catturata
// (lo stato «Ottenuto» della voce, che `contaNelDedalo` lascia fuori dal conto). Sotto, «Scheda» e «Modifica» (ModuloPersona);
// in fondo «Aggiungi una Persona».
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { ModuloPersona } from './ModuloPersona';
import type { PuntoInteresseDto, StatoPunto } from '../../types';

interface Props {
  /** Le voci Persona dell'area, nell'ordine della guida. */
  persone: PuntoInteresseDto[];
  /** Il dedalo (area della guida del Memento) in cui stanno. */
  dedalo: string;
  /** L'area del dedalo e le altre dello stesso dedalo. */
  areaDedalo: { chiave: string; nome: string; altre: ReadonlyArray<{ chiave: string; nome: string }> };
  partitaId: number | null;
  /** Salva lo stato della voce nella partita; vero se è andato a buon fine. */
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  /** Rilegge la scheda (Persona aggiunta, corretta, spostata o eliminata). */
  onRicarica: () => Promise<void>;
}

/** Le debolezze dell'Ombra scritte dalla guida, se ci sono («-» = nessuna nota). */
const debolezze = (p: PuntoInteresseDto): string | null => {
  const d = p.dettagli.deboleA;
  return typeof d === 'string' && d.trim() && d.trim() !== '-' ? d.trim() : null;
};

/** La griglia delle Persona dell'area, il conto delle catturate e i comandi per aggiungerne, correggerle e toglierle. */
export function PersoneDellArea({ persone, dedalo, areaDedalo, partitaId, cambiaStato, onRicarica }: Props) {
  /** La voce aperta nel modulo (null = nuova), o nessun modulo. */
  const [modulo, setModulo] = useState<{ voce: PuntoInteresseDto | null } | null>(null);
  const [occupata, setOccupata] = useState<string | null>(null);
  const catturate = persone.filter((p) => p.stato !== null).length;
  /** Alterna catturata / non catturata (un tocco per volta). */
  const alterna = async (p: PuntoInteresseDto) => {
    if (!partitaId || occupata) return;
    setOccupata(p.chiave);
    try { await cambiaStato(p, p.stato ? null : 'ottenuto'); } finally { setOccupata(null); }
  };
  return (
    <section className="flex flex-col gap-1.5" aria-label={`Persona di ${areaDedalo.nome}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <strong className="text-[13px]">Persona · {persone.length}</strong>
        <span className="text-[11px] text-text-muted">{partitaId ? `${catturate} catturate · ` : ''}non contano nel completamento</span>
      </div>
      {persone.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna Persona in quest’area.</p>}
      {persone.length > 0 && (
        <ul className="persone-dell-area m-0 grid list-none gap-1 p-0" aria-label={`Persona che si incontrano in ${areaDedalo.nome}`}>
          {persone.map((p) => {
            const presa = p.stato !== null;
            const nomePersona = p.persona?.nomeIt ?? p.nome;
            const deboli = debolezze(p);
            return (
              <li key={p.chiave} className={`flex min-w-0 flex-col rounded-md border ${presa ? 'border-success bg-success/10' : 'border-border-light bg-white/[0.02]'}`}>
                <button type="button" className="touch relative flex min-w-0 flex-col items-center gap-1 px-1 pt-1.5 pb-1 text-center disabled:cursor-default"
                  aria-pressed={presa} disabled={!partitaId || occupata === p.chiave}
                  aria-label={`${nomePersona}${p.persona && p.nome !== nomePersona ? ` (${p.nome})` : ''}: ${presa ? 'catturata' : 'da catturare'}`}
                  title={partitaId ? (presa ? 'Catturata: tocca per toglierla' : 'Tocca quando l’hai catturata') : 'Attiva una partita per segnare le catture'}
                  onClick={() => void alterna(p)}>
                  <AnteprimaPersona nome={p.persona?.nome ?? p.nome} etichetta={nomePersona} dimensione={64} contieni className="rounded" />
                  {presa && <span className="absolute right-1 top-1 rounded-full bg-success px-1 text-[11px] font-bold leading-[18px] text-white" aria-hidden="true">✓</span>}
                  <span className="w-full break-words text-[12px] font-semibold leading-tight">{nomePersona}</span>
                  {p.persona && p.nome !== nomePersona && <span className="w-full break-words text-[10px] leading-tight text-text-muted">{p.nome}</span>}
                  {deboli && <span className="w-full break-words text-[10px] leading-tight text-text-secondary">debole: {deboli}</span>}
                </button>
                <div className="mt-auto flex items-center justify-center border-t border-border-light">
                  {p.persona && (
                    <Link to={`/compendio/persona/${p.persona.id}`} className="touch inline-flex min-w-[44px] items-center justify-center text-text-muted hover:text-text" aria-label={`Scheda di ${nomePersona}`} title="Scheda del compendio">
                      <IconaAzione chiave="scheda" dimensione={18} />
                    </Link>
                  )}
                  <button type="button" className="touch inline-flex min-w-[44px] items-center justify-center text-text-muted hover:text-text" aria-label={`Modifica: ${nomePersona}`} title="Modifica" onClick={() => setModulo({ voce: p })}>
                    <IconaAzione chiave="modifica" dimensione={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Persona" aria-label={`Aggiungi una Persona in ${areaDedalo.nome}`} onClick={() => setModulo({ voce: null })} />
      {modulo && <ModuloPersona voce={modulo.voce} dedalo={dedalo} areaDedalo={areaDedalo} onChiudi={() => setModulo(null)} onCambiata={onRicarica} />}
    </section>
  );
}
