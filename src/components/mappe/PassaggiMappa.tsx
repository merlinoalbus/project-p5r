// ============================================================
// PassaggiMappa — da qui si va a, e da dove si arriva qui
// ============================================================
//
// La scheda «Collegamenti» dell'editor mostrava solo l'albero, che dice chi contiene chi: genitore
// e mappe figlie. Ma in città ci si sposta di lato — dal Sottopasso alla Banchina, che sono due
// luoghi di Shibuya allo stesso livello — e i treni collegano addirittura quartieri diversi: su
// ventiquattro spilli che portano a un'altra mappa, sedici non puntavano a una figlia e quindi non
// comparivano da nessuna parte. Chi cura l'atlante aggiungeva un passaggio e non lo ritrovava
// nell'elenco che usava per spostarsi (richiesta dell'utente, 2026-09-13).
//
// Qui i collegamenti si leggono per quello che sono — un grafo, non un albero — e in tutte e due
// le direzioni: le vie d'uscita di questa mappa e gli spilli di altre mappe che portano qui. Un
// passaggio senza ritorno si vede subito; il ritorno si crea dalla mappa che lo deve portare,
// cioè aprendo l'altra e usando il suo elenco «da dove si arriva qui».
// ============================================================

import type { MappaDto, MappaRiassuntoDto, SpilloDto } from '../../types';
import { arrivoSpillo } from '../../utils/navigazioneMappa';
import { nomePresentazioneMappa } from '../../utils/presentazioneMappa';
import { DEFINIZIONI_SPILLO } from '../../../shared/spilli';
import { IconaSpillo } from './IconaSpillo';

/** Che rapporto ha la mappa d'arrivo con questa: è l'informazione che dava l'albero e che qui non
 * va persa — una figlia si raggiunge anche scendendo, una sorella o un altro quartiere solo di qui. */
function parentela(mappa: MappaDto, chiave: string): string {
  if (chiave === mappa.genitore) return 'la mappa che contiene questa';
  if (mappa.figli.some((f) => f.chiave === chiave)) return 'contenuta in questa';
  return 'allo stesso livello o altrove';
}

export function PassaggiMappa({ mappa, albero, occupato, onVai, onCreaPassaggio }: {
  mappa: MappaDto;
  /** Serve solo per dare un nome alle mappe d'arrivo che lo spillo non porta con sé. */
  albero: MappaRiassuntoDto[];
  occupato: boolean;
  onVai: (chiave: string) => void;
  /** Crea uno spillo passaggio **da questa mappa** verso quella indicata. */
  onCreaPassaggio: (chiave: string) => void;
}) {
  const nomeDi = (chiave: string, dallaDestinazione?: string) => {
    const m = albero.find((x) => x.chiave === chiave);
    return m ? nomePresentazioneMappa(m) : dallaDestinazione ?? chiave;
  };
  const uscite = mappa.spilli
    .map((s) => ({ spillo: s, arrivo: arrivoSpillo(s) }))
    .filter((v): v is { spillo: SpilloDto; arrivo: NonNullable<ReturnType<typeof arrivoSpillo>> } => v.arrivo !== null);
  // due spilli verso la stessa mappa non sono un errore di per sé (due ingressi diversi), ma quando
  // hanno anche lo stesso nome sono quasi sempre una copia rimasta lì: vale la pena dirlo.
  const quanti = new Map<string, number>();
  for (const u of uscite) { const k = `${u.arrivo.mappa}|${u.spillo.nome}`; quanti.set(k, (quanti.get(k) ?? 0) + 1); }
  const arriviDa = new Set(mappa.arrivi.map((a) => a.mappa));
  const usciteVerso = new Set(uscite.map((u) => u.arrivo.mappa));

  return (
    <section className="visore-mappa__sezione" aria-label="Passaggi da e verso questa mappa">
      <h3 className="visore-mappa__intestazione">Passaggi</h3>
      <p className="m-0 text-[12px] text-text-muted">Dove portano gli spilli di spostamento di questa mappa, e quali spilli di altre mappe portano qui. Toccandone uno si apre l’altra mappa, sempre in modifica.</p>

      <h4 className="m-0 text-[12px] uppercase tracking-wide text-text-secondary">Da qui si va a</h4>
      {uscite.length === 0
        ? <p className="m-0 text-[12px] text-text-secondary">Nessuno spillo di spostamento: da questa mappa non si esce.</p>
        : <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Passaggi in uscita">
            {uscite.map(({ spillo: s, arrivo }) => {
              const nome = nomeDi(arrivo.mappa, s.destinazioneNomi?.mappa);
              return (
                <li key={s.id} className="flex flex-col">
                  <button type="button" className="visore-mappa__figlia touch" onClick={() => onVai(arrivo.mappa)} aria-label={`Apri ${nome}, dove porta «${s.nome}»`}>
                    <IconaSpillo tipo={s.tipo} dimensione={18} />
                    <span className="flex-1 min-w-0 truncate">{s.nome} → {nome}</span>
                    <span className="text-[11px] text-text-muted">{DEFINIZIONI_SPILLO[s.tipo].nome}</span>
                  </button>
                  <span className="text-[11px] text-text-muted">{parentela(mappa, arrivo.mappa)}{arrivo.spillo ? ` · allo spillo «${s.destinazioneNomi?.spillo ?? 'indicato'}»` : ''}</span>
                  {(quanti.get(`${arrivo.mappa}|${s.nome}`) ?? 0) > 1 && <span className="editor-mappa__senza-passaggio">Due spilli «{s.nome}» portano alla stessa mappa.</span>}
                  {!arriviDa.has(arrivo.mappa) && <span className="editor-mappa__senza-passaggio">Di là non si torna: il ritorno si crea da «{nome}», che lo deve portare.</span>}
                </li>
              );
            })}
          </ul>}

      <h4 className="m-0 text-[12px] uppercase tracking-wide text-text-secondary">Da dove si arriva qui</h4>
      {mappa.arrivi.length === 0
        ? <p className="m-0 text-[12px] text-text-secondary">Nessuno spillo di altre mappe porta qui: ci si arriva solo dall’albero.</p>
        : <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Passaggi in entrata">
            {mappa.arrivi.map((a) => (
              <li key={a.spilloId} className="flex flex-col">
                <button type="button" className="visore-mappa__figlia touch" onClick={() => onVai(a.mappa)} aria-label={`Apri ${a.mappaNome}, da cui porta «${a.nome}»`}>
                  <IconaSpillo tipo={a.tipo} dimensione={18} />
                  <span className="flex-1 min-w-0 truncate">{a.mappaNome} → {a.nome}</span>
                  <span className="text-[11px] text-text-muted">{DEFINIZIONI_SPILLO[a.tipo].nome}</span>
                </button>
                {!usciteVerso.has(a.mappa) && (
                  <div className="editor-mappa__senza-passaggio">
                    <span className="flex-1 min-w-0">Da qui non si torna là.</span>
                    <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => onCreaPassaggio(a.mappa)} aria-label={`Crea il passaggio verso ${a.mappaNome}`}>Crea il passaggio</button>
                  </div>
                )}
              </li>
            ))}
          </ul>}
    </section>
  );
}
