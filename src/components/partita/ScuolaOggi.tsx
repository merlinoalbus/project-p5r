// ============================================================
// ScuolaOggi — scorciatoie del giorno corrente: domande in classe, esame e cruciverba (con la risposta)
// ============================================================
//
// I dati arrivano dagli elenchi completi già esposti dalla Guida (`/compendio/domande`, `/compendio/cruciverba`):
// il filtro per il giorno di gioco della partita resta qui, così non c'è una seconda verità sul server.
// I pulsanti compaiono solo quando per oggi c'è davvero qualcosa: niente finestre vuote.
// ============================================================

import { useMemo, useState } from 'react';
import { useCarica } from '../../hooks/useCarica';
import { getCruciverba, getDomande } from '../../services/api';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { DataP5 } from '../shared/DataP5';
import { dataGiocoTesto } from '../../utils/dateGioco';
import type { CruciverbaDto, DomandaDto, PartitaDto } from '../../types';

type Finestra = 'classe' | 'esame' | 'cruciverba';

interface DomandaEsame {
  esame: string;
  ordine: number;
  domanda: string;
  risposta: string;
}

/** Pulsanti del giorno corrente della partita: domande in classe, domande d'esame, cruciverba. */
export function ScuolaOggi({ partita }: { partita: PartitaDto }) {
  const [aperta, setAperta] = useState<Finestra | null>(null);
  const domande = useCarica(() => getDomande(partita.id), [partita.id]);
  const cruciverba = useCarica(() => getCruciverba(partita.id), [partita.id]);
  const oggi = partita.dataGioco;

  const inClasse: DomandaDto[] = useMemo(
    () => (oggi ? (domande.dati?.domande ?? []).filter((d) => d.data === oggi && d.tipo !== 'esame-medio' && d.tipo !== 'esame-finale') : []),
    [domande.dati, oggi],
  );

  // Le domande d'esame stanno sia nell'elenco generale (tipo `esame-*`, con la risposta) sia dentro gli esami:
  // si uniscono per testo così la finestra non ripete la stessa domanda due volte.
  const dEsame: DomandaEsame[] = useMemo(() => {
    if (!oggi) return [];
    const fuse = new Map<string, DomandaEsame>();
    for (const e of domande.dati?.esami ?? []) {
      for (const q of e.domande) if (q.data === oggi) fuse.set(q.domanda.trim().toLowerCase(), { esame: e.nome, ordine: q.ordine, domanda: q.domanda, risposta: q.risposta });
    }
    for (const d of domande.dati?.domande ?? []) {
      if (d.data !== oggi || (d.tipo !== 'esame-medio' && d.tipo !== 'esame-finale')) continue;
      const chiave = d.domanda.trim().toLowerCase();
      if (fuse.has(chiave)) continue;
      const esame = (domande.dati?.esami ?? []).find((e) => e.date.includes(oggi));
      fuse.set(chiave, { esame: esame?.nome ?? (d.tipo === 'esame-finale' ? 'Esame finale' : 'Esame'), ordine: 0, domanda: d.domanda, risposta: d.risposte.map((r) => r.testo).join(' → ') });
    }
    return [...fuse.values()].sort((a, b) => a.ordine - b.ordine);
  }, [domande.dati, oggi]);

  const cruciOggi: CruciverbaDto | null = useMemo(
    () => (oggi ? (cruciverba.dati?.cruciverba ?? []).find((c) => c.giorno === oggi) ?? null : null),
    [cruciverba.dati, oggi],
  );

  if (!oggi) return null;
  const niente = inClasse.length === 0 && dEsame.length === 0 && !cruciOggi;
  const dataTesto = dataGiocoTesto(oggi);

  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-label={`Scuola del ${dataTesto}`}>
      {inClasse.length > 0 && (
        <PulsanteVisivo compatto icona={<IconaAzione chiave="piano" dimensione={20} />} titolo="Domande in classe" dettaglio={`${inClasse.length} oggi`} onClick={() => setAperta('classe')} aria-label={`Domande in classe del ${dataTesto}: ${inClasse.length}`} />
      )}
      {dEsame.length > 0 && (
        <PulsanteVisivo compatto icona={<IconaAzione chiave="esame-primo" dimensione={20} />} titolo="Esame" dettaglio={`${dEsame.length} domande`} onClick={() => setAperta('esame')} aria-label={`Domande d’esame del ${dataTesto}: ${dEsame.length}`} />
      )}
      {cruciOggi && (
        <PulsanteVisivo compatto attivo={cruciOggi.fatto} icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Cruciverba" dettaglio={cruciOggi.fatto ? 'risolto' : 'risposta pronta'} onClick={() => setAperta('cruciverba')} aria-label={`Cruciverba del ${dataTesto}`} />
      )}
      {niente && !domande.caricamento && !cruciverba.caricamento && (
        <span className="text-[12px] text-text-muted">Oggi nessuna domanda in classe né cruciverba.</span>
      )}

      <Modal titolo={`Domande in classe · ${dataTesto}`} aperta={aperta === 'classe'} onChiudi={() => setAperta(null)} larga>
        <ElencoDomande domande={inClasse} data={oggi} />
      </Modal>
      <Modal titolo={`Esame · ${dataTesto}`} aperta={aperta === 'esame'} onChiudi={() => setAperta(null)} larga>
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {dEsame.map((q) => (
            <li key={q.domanda} className="card flex flex-col gap-1 py-2">
              <span className="text-[11px] uppercase tracking-[.06em] text-text-muted">{q.esame}{q.ordine > 0 ? ` · domanda ${q.ordine}` : ''}</span>
              <p className="m-0 text-[14px]">{q.domanda}</p>
              <p className="m-0 font-display uppercase text-[18px] leading-none text-primary">{q.risposta}</p>
            </li>
          ))}
        </ul>
      </Modal>
      <Modal titolo={`Cruciverba · ${dataTesto}`} aperta={aperta === 'cruciverba'} onChiudi={() => setAperta(null)}>
        {cruciOggi && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <DataP5 data={cruciOggi.giorno} compatta />
              {cruciOggi.fatto && <span className="chip chip--attivo">Risolto</span>}
            </div>
            <p className="m-0 text-[14px] text-text-secondary">{cruciOggi.indizio}</p>
            <p className="m-0 font-display uppercase text-[26px] leading-none text-primary">{cruciOggi.risposta}</p>
            {cruciOggi.rispostaEn && <p className="m-0 text-[12px] text-text-muted">In inglese: {cruciOggi.rispostaEn}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Elenco delle domande con la risposta corretta in evidenza (più passi per le domande a catena). */
function ElencoDomande({ domande, data }: { domande: DomandaDto[]; data: string }) {
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-2">
      {domande.map((d) => (
        <li key={d.id} className="card flex flex-col gap-1 py-2">
          <span className="text-[11px] uppercase tracking-[.06em] text-text-muted">{d.chi}{d.data !== data ? ` · ${d.data}` : ''}</span>
          <p className="m-0 text-[14px]">{d.domanda}</p>
          <ol className="m-0 pl-4 flex flex-col gap-0.5">
            {d.risposte.map((r) => (
              <li key={`${r.ordine ?? 0}-${r.testo}`} className="font-display uppercase text-[17px] leading-tight text-primary">{r.testo}</li>
            ))}
          </ol>
          {d.ricompensa && <span className="text-[12px] text-text-secondary">{d.ricompensa}</span>}
        </li>
      ))}
    </ul>
  );
}
