// ============================================================
// ScuolaOggi — scorciatoie della scuola: domande in classe, esame e cruciverba del giorno (con la risposta) e le pagine intere della Guida
// ============================================================
//
// I dati arrivano dagli elenchi completi già esposti dalla Guida (`/compendio/domande`, `/compendio/cruciverba`):
// il filtro per giorno resta qui, così non c'è una seconda verità sul server. Il giorno è quello che si sta guardando
// nella scheda «Oggi» (`giorno`), e senza di esso la data di gioco della partita.
// I pulsanti del giorno compaiono solo quando quel giorno c'è davvero qualcosa: niente finestre vuote. I due collegamenti
// alle pagine della Guida («Domande e risposte», «Cruciverba») ci sono sempre: l'accesso non dipende dal giorno.
// ============================================================

import { useMemo, useState } from 'react';
import { useCarica } from '../../hooks/useCarica';
import { getCruciverba, getDomande } from '../../services/api';
import { Modal } from '../shared/Modal';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
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

interface Props {
  partita: PartitaDto;
  /** Giorno di gioco (MM-GG) di cui mostrare le scorciatoie: quello della scheda «Oggi»; assente o `null` = la data di gioco della partita. */
  giorno?: string | null;
}

/** Collegamenti fissi alle pagine della Guida e pulsanti del giorno: domande in classe, domande d'esame, cruciverba. */
export function ScuolaOggi({ partita, giorno: giornoVisto }: Props) {
  const [aperta, setAperta] = useState<Finestra | null>(null);
  const domande = useCarica(() => getDomande(partita.id), [partita.id]);
  const cruciverba = useCarica(() => getCruciverba(partita.id), [partita.id]);
  const giorno = giornoVisto ?? partita.dataGioco;
  // cambiando giorno la finestra aperta si chiude (senza rimontare il componente, che rileggerebbe gli elenchi)
  const [giornoPrima, setGiornoPrima] = useState(giorno);
  if (giornoPrima !== giorno) {
    setGiornoPrima(giorno);
    setAperta(null);
  }

  const inClasse: DomandaDto[] = useMemo(
    () => (giorno ? (domande.dati?.domande ?? []).filter((d) => d.data === giorno && d.tipo !== 'esame-medio' && d.tipo !== 'esame-finale') : []),
    [domande.dati, giorno],
  );

  // Le domande d'esame stanno in due elenchi diversi e NON sono le stesse: dentro `esami` c'è una voce per ogni domanda,
  // numerata; nell'elenco generale c'è una sola voce riassuntiva della giornata («Serie di domande su…») con tutte le
  // risposte in fila. Si usano quindi le domande dell'esame quando ci sono, e il riassunto solo come ripiego.
  const dEsame: DomandaEsame[] = useMemo(() => {
    if (!giorno) return [];
    const granulari: DomandaEsame[] = [];
    for (const e of domande.dati?.esami ?? []) {
      for (const q of e.domande) if (q.data === giorno) granulari.push({ esame: e.nome, ordine: q.ordine, domanda: q.domanda, risposta: q.risposta });
    }
    if (granulari.length > 0) return [...granulari].sort((a, b) => a.ordine - b.ordine);
    const riassunti: DomandaEsame[] = [];
    for (const d of domande.dati?.domande ?? []) {
      if (d.data !== giorno || (d.tipo !== 'esame-medio' && d.tipo !== 'esame-finale')) continue;
      const esame = (domande.dati?.esami ?? []).find((e) => e.date.includes(giorno));
      riassunti.push({ esame: esame?.nome ?? (d.tipo === 'esame-finale' ? 'Esame finale' : 'Esame'), ordine: riassunti.length + 1, domanda: d.domanda, risposta: d.risposte.map((r) => r.testo).join(' → ') });
    }
    return riassunti;
  }, [domande.dati, giorno]);

  const cruciOggi: CruciverbaDto | null = useMemo(
    () => (giorno ? (cruciverba.dati?.cruciverba ?? []).find((c) => c.giorno === giorno) ?? null : null),
    [cruciverba.dati, giorno],
  );

  // sempre presenti, anche senza data di gioco: le pagine intere della Guida, con tutte le date
  const collegamenti = (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Scuola nella Guida">
      <CollegamentoVisivo to="/guida/domande" tono="fantasma" compatto icona={<IconaAzione chiave="piano" dimensione={20} />} titolo="Domande e risposte" dettaglio="tutte" aria-label="Domande e risposte: tutte le date nella Guida" />
      <CollegamentoVisivo to="/guida/cruciverba" tono="fantasma" compatto icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Cruciverba" dettaglio="tutti" aria-label="Cruciverba: tutti i giorni nella Guida" />
    </div>
  );
  if (!giorno) return collegamenti;
  const niente = inClasse.length === 0 && dEsame.length === 0 && !cruciOggi;
  const dataTesto = dataGiocoTesto(giorno);
  // «Oggi» solo quando il giorno guardato è la data di gioco; per un altro giorno si scrive la data
  const quando = giorno === partita.dataGioco ? 'Oggi' : `Il ${dataTesto}`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {collegamenti}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={`Scuola del ${dataTesto}`}>
        {inClasse.length > 0 && (
          <PulsanteVisivo compatto icona={<IconaAzione chiave="piano" dimensione={20} />} titolo="Domande in classe" dettaglio={`${inClasse.length} ${giorno === partita.dataGioco ? 'oggi' : 'quel giorno'}`} onClick={() => setAperta('classe')} aria-label={`Domande in classe del ${dataTesto}: ${inClasse.length}`} />
        )}
        {dEsame.length > 0 && (
          <PulsanteVisivo compatto icona={<IconaAzione chiave="esame-primo" dimensione={20} />} titolo="Esame" dettaglio={`${dEsame.length} domande`} onClick={() => setAperta('esame')} aria-label={`Domande d’esame del ${dataTesto}: ${dEsame.length}`} />
        )}
        {cruciOggi && (
          <PulsanteVisivo compatto attivo={cruciOggi.fatto} icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Cruciverba" dettaglio={cruciOggi.fatto ? 'risolto' : 'risposta pronta'} onClick={() => setAperta('cruciverba')} aria-label={`Cruciverba del ${dataTesto}`} />
        )}
        {niente && !domande.caricamento && !cruciverba.caricamento && (
          <span className="text-[12px] text-text-muted">{quando} nessuna domanda in classe né cruciverba.</span>
        )}
      </div>

      <Modal titolo={`Domande in classe · ${dataTesto}`} aperta={aperta === 'classe'} onChiudi={() => setAperta(null)} larga>
        <ElencoDomande domande={inClasse} data={giorno} />
      </Modal>
      <Modal titolo={`Esame · ${dataTesto}`} aperta={aperta === 'esame'} onChiudi={() => setAperta(null)} larga>
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {dEsame.map((q) => (
            <li key={q.domanda} className="card flex flex-col gap-1 py-2">
              <span className="text-[11px] uppercase tracking-[.06em] text-text-muted">{q.esame}{q.ordine > 0 ? ` · domanda ${q.ordine}` : ''}</span>
              <p className="m-0 text-[14px]">{q.domanda}</p>
              <p className="m-0 font-display uppercase text-[18px] leading-none text-primary-testo">{q.risposta}</p>
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
            <p className="m-0 font-display uppercase text-[26px] leading-none text-primary-testo">{cruciOggi.risposta}</p>
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
              <li key={`${r.ordine ?? 0}-${r.testo}`} className="font-display uppercase text-[17px] leading-tight text-primary-testo">{r.testo}</li>
            ))}
          </ol>
          {d.ricompensa && <span className="text-[12px] text-text-secondary">{d.ricompensa}</span>}
        </li>
      ))}
    </ul>
  );
}
