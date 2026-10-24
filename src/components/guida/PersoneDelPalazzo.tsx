// ============================================================
// PersoneDelPalazzo — le Persona che si catturano in un'infiltrazione di un Palazzo, con la piastrella dei Memento (L8, R8-12, R8-29)
// ============================================================
//
// Una voce Persona di un Palazzo collegata a un'Ombra non ha più uno stato suo: è catturata se la sua Persona è registrata nel compendio della
// partita, come nei dedali dei Memento, e si cattura con un tocco sulla stessa piastrella. Non conta nel completamento del Palazzo (carattere
// nullo, L4). Le voci Persona che non sono Ombre (le due narrative di Kamoshida) restano righe della guida come le altre.
// ============================================================

import { useState } from 'react';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { SezioneDellArea } from './SezioneDellArea';
import { AvvisoTogliPersona, PiastrelleCattura } from './PiastrelleCattura';
import { InfoOmbraPersona } from './InfoOmbraPersona';
import { comePiastrella } from '../../utils/piastrelleCattura';
import type { PuntoInteresseDto } from '../../types';

interface Props {
  persone: PuntoInteresseDto[];
  /** Il nome dell'infiltrazione, per le etichette. */
  nomeArea: string;
  partitaId: number | null;
  catturate: ReadonlySet<number> | null;
  onCattura: (personaId: number, catturata: boolean, ombra?: string) => Promise<void>;
}

/** Le piastrelle di cattura di un'infiltrazione, il conto delle catturate, il riquadro «i» con le debolezze del compendio. */
export function PersoneDelPalazzo({ persone, nomeArea, partitaId, catturate, onCattura }: Props) {
  const [daTogliere, setDaTogliere] = useState<PuntoInteresseDto | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupata, setOccupata] = useState<number | null>(null);
  const presa = (p: PuntoInteresseDto) => !!p.persona && !!catturate?.has(p.persona.id);
  const quante = persone.filter(presa).length;
  const nomeDi = (p: PuntoInteresseDto) => p.persona?.nomeIt ?? p.nome;
  const cattura = async (p: PuntoInteresseDto, catturata: boolean) => {
    if (!partitaId || !p.persona || occupata !== null) return;
    setOccupata(p.persona.id);
    try { await onCattura(p.persona.id, catturata, catturata ? p.ombra?.chiave : undefined); setDaTogliere(null); } finally { setOccupata(null); }
  };
  const info = persone.find((p) => p.chiave === aperta) ?? null;
  return (
    <SezioneDellArea chiave="persona" titolo="Persona" conto={partitaId ? `${quante}/${persone.length} catturate` : String(persone.length)} nota="non contano nel completamento">
      <PiastrelleCattura aria-label={`Persona che si incontrano in ${nomeArea}`} voci={persone.map(comePiastrella)} partitaId={partitaId} catturate={catturate} occupata={occupata}
        apertaChiave={aperta} onInfo={setAperta}
        onTocca={(v, catturata) => { const p = persone.find((x) => x.chiave === v.chiave); if (!p) return; if (catturata) void cattura(p, true); else setDaTogliere(p); }} />
      {info && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-white/[0.03] px-2.5 py-2 text-[12px]" aria-label={`Dettagli di ${nomeDi(info)}`}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-[13px]">{nomeDi(info)}</strong>
            {info.persona && (info.ombra?.nome ?? info.nome) !== nomeDi(info) && <span className="text-text-muted">Ombra: {info.ombra?.nome ?? info.nome}</span>}
            {info.persona && <span className="text-text-muted">{presa(info) ? 'catturata' : 'non ancora catturata'}</span>}
          </div>
          <InfoOmbraPersona ombra={info.ombra?.chiave ?? null} personaId={info.persona?.id ?? null} partitaId={partitaId} />
          {info.descrizione && <span className="whitespace-pre-wrap text-text-muted">{info.descrizione}</span>}
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={() => setAperta(null)} />
          </div>
        </section>
      )}
      {daTogliere?.persona && (
        <AvvisoTogliPersona nome={daTogliere.persona.nomeIt} occupato={occupata !== null} onConferma={() => void cattura(daTogliere, false)} onAnnulla={() => setDaTogliere(null)} />
      )}
    </SezioneDellArea>
  );
}
