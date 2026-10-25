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
// «i»; correggere, aggiungere e togliere una Persona (`ModuloPersona`) solo in «Modifica la guida».
// L8: la piastrella, l'avviso di rimozione e le debolezze (dal compendio, mai dal testo della guida) sono quelli di tutte le viste
// (`PiastrelleCattura`, `InfoOmbraPersona`); la griglia è adattiva a ogni larghezza, da 88 px, senza scorrimento orizzontale (R8-30).
// ============================================================

import { useState } from 'react';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { ModuloPersona } from './ModuloPersona';
import { SezioneDellArea } from './SezioneDellArea';
import { AvvisoTogliPersona, PiastrelleCattura } from './PiastrelleCattura';
import { InfoOmbraPersona } from './InfoOmbraPersona';
import { comePiastrella } from '../../utils/piastrelleCattura';
import type { PuntoInteresseDto } from '../../types';

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
  /** Registra (o toglie) la Persona nel compendio della partita; `ombra` è l'Ombra dell'incontro (il server controlla che sia catturabile). */
  onCattura: (personaId: number, catturata: boolean, ombra?: string) => Promise<void>;
  /** Rilegge la scheda (Persona aggiunta, corretta o eliminata). */
  onRicarica: () => Promise<void>;
}

/** Le piastrelle delle Persona dell'area, il conto delle catturate, il riquadro «i» e, in «Modifica la guida», i comandi. */
export function PersoneDellArea({ persone, dedalo, areaDedalo, aree, partitaId, catturate, modifica, onCattura, onRicarica }: Props) {
  /** La voce aperta nel modulo (null = nuova), o nessun modulo. */
  const [modulo, setModulo] = useState<{ voce: PuntoInteresseDto | null } | null>(null);
  /** La Persona catturata che si sta per togliere dal compendio (chiede conferma). */
  const [daTogliere, setDaTogliere] = useState<PuntoInteresseDto | null>(null);
  /** La Persona di cui è aperto il riquadro «i». */
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupata, setOccupata] = useState<number | null>(null);
  /** Vero se la Persona della voce è registrata nel compendio della partita. */
  const presa = (p: PuntoInteresseDto) => !!p.persona && !!catturate?.has(p.persona.id);
  const quante = persone.filter(presa).length;
  /** Registra o toglie la Persona della voce; una sola alla volta. */
  const cattura = async (p: PuntoInteresseDto, catturata: boolean) => {
    if (!partitaId || !p.persona || occupata !== null) return;
    setOccupata(p.persona.id);
    try { await onCattura(p.persona.id, catturata, catturata ? p.ombra?.chiave : undefined); setDaTogliere(null); } finally { setOccupata(null); }
  };
  const info = persone.find((p) => p.chiave === aperta) ?? null;
  const nomeDi = (p: PuntoInteresseDto) => p.persona?.nomeIt ?? p.nome;
  return (
    <SezioneDellArea chiave="persona" titolo="Persona" conto={partitaId ? `${quante}/${persone.length} catturate` : String(persone.length)} nota="non contano nel completamento"
      azioni={modifica ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" aria-label={`Aggiungi una Persona in ${areaDedalo.nome}`} onClick={() => setModulo({ voce: null })} /> : undefined}>
      {persone.length === 0 && <p className="m-0 testo-12 text-text-muted">Nessuna Persona in quest’area.</p>}
      {persone.length > 0 && (
        <PiastrelleCattura aria-label={`Persona che si incontrano in ${areaDedalo.nome}`} voci={persone.map(comePiastrella)} partitaId={partitaId} catturate={catturate} occupata={occupata}
          apertaChiave={aperta} onInfo={setAperta}
          onTocca={(v, catturata) => { const p = persone.find((x) => x.chiave === v.chiave); if (!p) return; if (catturata) void cattura(p, true); else setDaTogliere(p); }} />
      )}
      {info && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-white/[0.03] px-2.5 py-2 testo-12" aria-label={`Dettagli di ${nomeDi(info)}`}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <strong className="testo-13">{nomeDi(info)}</strong>
            {/* il nome dell'Ombra è quello dell'entità Ombra (R8-03), non il testo della voce */}
            {info.persona && (info.ombra?.nome ?? info.nome) !== nomeDi(info) && <span className="text-text-muted">Ombra: {info.ombra?.nome ?? info.nome}</span>}
            {info.persona && <span className="text-text-muted">{presa(info) ? 'catturata' : 'non ancora catturata'}</span>}
          </div>
          <InfoOmbraPersona ombra={info.ombra?.chiave ?? null} personaId={info.persona?.id ?? null} partitaId={partitaId} />
          {info.descrizione && <span className="whitespace-pre-wrap text-text-muted">{info.descrizione}</span>}
          <div className="flex flex-wrap gap-1.5">
            {modifica && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica: ${nomeDi(info)}`} onClick={() => setModulo({ voce: info })} />}
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={() => setAperta(null)} />
          </div>
        </section>
      )}
      {daTogliere?.persona && (
        <AvvisoTogliPersona nome={daTogliere.persona.nomeIt} occupato={occupata !== null} onConferma={() => void cattura(daTogliere, false)} onAnnulla={() => setDaTogliere(null)} />
      )}
      {modulo && <ModuloPersona voce={modulo.voce} dedalo={dedalo} areaIniziale={areaDedalo.chiave} aree={aree} onChiudi={() => setModulo(null)} onCambiata={onRicarica} />}
    </SezioneDellArea>
  );
}
