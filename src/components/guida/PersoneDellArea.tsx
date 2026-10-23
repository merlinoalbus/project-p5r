// ============================================================
// PersoneDellArea — le Persona che si incontrano in un'area di un dedalo dei Memento, con la loro immagine (2026-10-11, 2026-10-12)
// ============================================================
//
// Richiesta dell'utente: «nel memento le persona disponibili devono essere visualizzate con le loro immagini e cliccabili... Le
// persone catturate o meno non influiscono sulla percentuale di completamento del memento.» Scelte del 2026-10-12: «Se la persona
// è catturata vale per tutte le aree e i dedali»; «La cattura o meno delle Persona puoi valutarla dal compendio»; «I timbri come
// le Persona devono essere banalmente un click». Una Persona è catturata se è registrata nel compendio della partita: il tocco
// sulla piastrella la registra; toglierla dal compendio cancella livello, bonus e abilità che vi aveva registrati, e per questo
// chiede conferma. Una Persona si incontra in più aree (migrazione 101).
// Progetto approvato (pagina per formato): debolezze e scheda del compendio stanno in un riquadro che si apre da un solo segno
// «i»; correggere, aggiungere e togliere una Persona (`ModuloPersona`) solo in «Modifica la guida»; sul telefono le piastrelle
// sono una fila che scorre di lato. Il segno della cattura è `ui/persona-catturata` di Codex, con una riserva disegnata qui.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { AssetImg } from '../shared/AssetImg';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { ModuloPersona } from './ModuloPersona';
import { SezioneDellArea } from './SezioneDellArea';
import type { PuntoInteresseDto } from '../../types';
import { elencoCanonicoNelTesto } from '../../utils/elementiGuida';

interface Props {
  /** Le voci Persona che si incontrano nell'area, nell'ordine della guida. */
  persone: PuntoInteresseDto[];
  /** Il dedalo (area della guida del Memento) in cui stanno. */
  dedalo: string;
  /** L'area del dedalo mostrata. */
  areaDedalo: { chiave: string; nome: string };
  /** Tutte le aree del dedalo, in ordine (una Persona si collega a più aree). */
  aree: ReadonlyArray<{ chiave: string; nome: string }>;
  partitaId: number | null;
  /** Le Persona registrate nel compendio della partita (id), cioè le catturate; null senza partita. */
  catturate: ReadonlySet<number> | null;
  /** «Modifica la guida» acceso: si aggiungono e si correggono le Persona. */
  modifica: boolean;
  /** Registra (o toglie) la Persona nel compendio della partita. */
  onCattura: (personaId: number, catturata: boolean) => Promise<void>;
  /** Rilegge la scheda (Persona aggiunta, corretta o eliminata). */
  onRicarica: () => Promise<void>;
}

/** Le debolezze dell'Ombra scritte dalla guida, se ci sono («-» = nessuna nota). */
const debolezze = (p: PuntoInteresseDto): string | null => {
  const d = p.dettagli.deboleA;
  return typeof d === 'string' && d.trim() && d.trim() !== '-' ? elencoCanonicoNelTesto(d.trim()) : null;
};

/** Il segno «catturata» nell'angolo della piastrella; la riserva è una spunta su un tondo verde. */
function SegnoCatturata() {
  return (
    <AssetImg nome="ui/persona-catturata" alt="" decorativa className="absolute right-0.5 top-0.5 size-5 object-contain"
      fallback={<span aria-hidden className="absolute right-0.5 top-0.5 rounded-full bg-success px-1 text-[11px] font-bold leading-[18px] text-white">✓</span>} />
  );
}

/** Le piastrelle delle Persona dell'area, il conto delle catturate, il riquadro «i» e, in «Modifica la guida», i comandi. */
export function PersoneDellArea({ persone, dedalo, areaDedalo, aree, partitaId, catturate, modifica, onCattura, onRicarica }: Props) {
  /** La voce aperta nel modulo (null = nuova), o nessun modulo. */
  const [modulo, setModulo] = useState<{ voce: PuntoInteresseDto | null } | null>(null);
  /** La Persona catturata che si sta per togliere dal compendio (chiede conferma). */
  const [daTogliere, setDaTogliere] = useState<PuntoInteresseDto | null>(null);
  /** La Persona di cui è aperto il riquadro «i». */
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupata, setOccupata] = useState<string | null>(null);
  /** Vero se la Persona della voce è registrata nel compendio della partita. */
  const presa = (p: PuntoInteresseDto) => !!p.persona && !!catturate?.has(p.persona.id);
  const quante = persone.filter(presa).length;
  /** Registra o toglie la Persona della voce; una sola alla volta. */
  const cattura = async (p: PuntoInteresseDto, catturata: boolean) => {
    if (!partitaId || !p.persona || occupata) return;
    setOccupata(p.chiave);
    try { await onCattura(p.persona.id, catturata); setDaTogliere(null); } finally { setOccupata(null); }
  };
  const info = persone.find((p) => p.chiave === aperta) ?? null;
  const nomeDi = (p: PuntoInteresseDto) => p.persona?.nomeIt ?? p.nome;
  return (
    <SezioneDellArea chiave="persona" titolo="Persona" conto={partitaId ? `${quante}/${persone.length} catturate` : String(persone.length)} nota="non contano nel completamento"
      azioni={modifica ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" aria-label={`Aggiungi una Persona in ${areaDedalo.nome}`} onClick={() => setModulo({ voce: null })} /> : undefined}>
      {persone.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna Persona in quest’area.</p>}
      {persone.length > 0 && (
        // da 768 px una griglia; sotto, una fila che scorre di lato (progetto approvato)
        <ul className="area-scorrevole-x m-0 flex list-none gap-1 p-0 pb-1 md:grid md:grid-cols-[repeat(auto-fill,minmax(84px,1fr))] md:overflow-visible md:pb-0" aria-label={`Persona che si incontrano in ${areaDedalo.nome}`}>
          {persone.map((p) => {
            const catturata = presa(p);
            const nome = nomeDi(p);
            return (
              <li key={p.chiave} className={`relative flex w-[84px] shrink-0 flex-col rounded-md border md:w-auto ${catturata ? 'border-success bg-success/10' : 'border-border-light bg-white/[0.02]'} ${aperta === p.chiave ? 'ring-2 ring-primary/60' : ''}`}>
                <button type="button" className="touch relative flex min-w-0 flex-col items-center gap-1 px-1 pt-1.5 pb-1 text-center disabled:cursor-default"
                  aria-pressed={catturata} disabled={!partitaId || !p.persona || occupata === p.chiave}
                  aria-label={`${nome}${p.persona && p.nome !== nome ? ` (${p.nome})` : ''}: ${catturata ? 'catturata' : 'da catturare'}`}
                  title={!partitaId ? 'Attiva una partita per segnare le catture' : !p.persona ? 'Scegli la Persona del compendio («Modifica la guida») per segnarla' : catturata ? 'Nel compendio della partita: tocca per toglierla' : 'Tocca quando l’hai catturata: entra nel compendio della partita'}
                  onClick={() => (catturata ? setDaTogliere(p) : void cattura(p, true))}>
                  <AnteprimaPersona nome={p.persona?.nome ?? p.nome} etichetta={nome} dimensione={48} contieni className="rounded" />
                  {catturata && <SegnoCatturata />}
                  <span className="w-full break-words text-[11px] font-semibold leading-tight">{nome}</span>
                </button>
                <button type="button" className={`touch mt-auto inline-flex items-center justify-center border-t border-border-light text-[12px] font-bold italic ${aperta === p.chiave ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                  aria-expanded={aperta === p.chiave} aria-label={`Dettagli di ${nome}`} title="Debolezze e scheda del compendio" onClick={() => setAperta(aperta === p.chiave ? null : p.chiave)}>
                  i
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {info && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-white/[0.03] px-2.5 py-2 text-[12px]" aria-label={`Dettagli di ${nomeDi(info)}`}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-[13px]">{nomeDi(info)}</strong>
            {info.persona && info.nome !== nomeDi(info) && <span className="text-text-muted">Ombra: {info.nome}</span>}
            {info.persona && <span className="text-text-muted">{presa(info) ? 'catturata' : 'non ancora catturata'}</span>}
          </div>
          <span className="text-text-secondary">Debole a: {debolezze(info) ?? 'la guida non lo dice'}</span>
          {info.descrizione && <span className="whitespace-pre-wrap text-text-muted">{info.descrizione}</span>}
          <div className="flex flex-wrap gap-1.5">
            {info.persona && <Link to={`/compendio/persona/${info.persona.id}`} className="btn btn-ghost btn-sm touch">Scheda del compendio</Link>}
            {modifica && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica: ${nomeDi(info)}`} onClick={() => setModulo({ voce: info })} />}
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={() => setAperta(null)} />
          </div>
        </section>
      )}
      {daTogliere?.persona && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 px-2.5 py-2 text-[12px]" aria-label="Conferma: togliere la Persona dal compendio">
          <span>{daTogliere.persona.nomeIt} esce dal compendio della partita, in tutte le aree e in tutti i dedali, con il livello, i bonus e le abilità che vi aveva registrati.</span>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli dal compendio" disabled={!!occupata} onClick={() => void cattura(daTogliere, false)} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" disabled={!!occupata} onClick={() => setDaTogliere(null)} />
          </div>
        </section>
      )}
      {modulo && <ModuloPersona voce={modulo.voce} dedalo={dedalo} areaIniziale={areaDedalo.chiave} aree={aree} onChiudi={() => setModulo(null)} onCambiata={onRicarica} />}
    </SezioneDellArea>
  );
}
