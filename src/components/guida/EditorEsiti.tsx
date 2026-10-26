// ============================================================
// EditorEsiti — gli esiti di un'attività, nel modulo dell'attività (L13, ondata 2; solo nella preparazione, mai nel rilascio)
// ============================================================
//
// Il solo punto in cui si scrivono gli esiti (`attivita.esiti_json`): il modo (scelto da chi gioca o automatico per condizioni) e, per
// ogni esito, nome, prova (gruppo), articolo del negozio che dà prezzo e ranghi, Doti con le note, condizioni proprie e premi in parole.
// Un esito alla volta si apre per le condizioni (l'editor completo delle condizioni carica i suoi elenchi: uno solo aperto). La chiave
// nasce dal nome e non cambia più dopo il primo salvataggio (la ricevuta della spunta e l'effetto `turno` della voce la citano).
// Il modulo arriva qui solo fuori dal rilascio: `CorreggiElemento` e `AggiungiAlCatalogo` non esistono nella build di rilascio.
// ============================================================

import { useState } from 'react';
import { CampoTesto } from '../shared/Campo';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
import { CondizioniEditor } from './CondizioniEditor';
import { useCarica } from '../../hooks/useCarica';
import { getElenchiRegole } from '../../services/api';
import { CHIAVI_DOTI, nomeDote, type DoteChiave } from '../../../shared/doti';
import { SCELTE_NOTE } from '../../../shared/note';
import { LIMITI_ESITI, MODI_ESITI, chiaveEsitoDaNome, fraseDotiEsito, normalizzaEsitiAttivita, type EsitiAttivita, type EsitoAttivita } from '../../../shared/esitiAttivita';

const NOTE: Array<{ chiave: string; nome: string }> = SCELTE_NOTE.map((s) => ({ chiave: s.chiave, nome: s.simboli }));

/** Una chiave nuova dal nome, distinta da quelle già usate. */
function chiaveNuova(nome: string, usate: ReadonlySet<string>): string {
  const base = chiaveEsitoDaNome(nome);
  let k = base, i = 2;
  while (usate.has(k)) k = `${base.slice(0, 56)}-${i++}`;
  return k;
}

interface Props {
  esiti: EsitiAttivita | null;
  onCambia: (e: EsitiAttivita | null) => void;
  disabilitato?: boolean;
  /** Le chiavi già salvate: non si cambiano più (le citano ricevute ed effetti). */
  chiaviSalvate: ReadonlySet<string>;
}

/** L'editor degli esiti: vuoto offre «Aggiungi gli esiti»; con esiti, il modo e l'elenco con un esito aperto alla volta. */
export function EditorEsiti({ esiti, onCambia, disabilitato, chiaviSalvate }: Props) {
  const [aperto, setAperto] = useState<string | null>(null);
  const articoli = useCarica(async () => (await getElenchiRegole()).articoli ?? [], []);
  const elenco = esiti?.esiti ?? [];
  const valido = esiti === null || normalizzaEsitiAttivita(esiti) !== null;
  const cambiaEsito = (i: number, e: Partial<EsitoAttivita>) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => (j === i ? { ...x, ...e } : x)) });
  const aggiungi = () => {
    const nome = `Esito ${elenco.length + 1}`;
    const chiave = chiaveNuova(nome, new Set(elenco.map((e) => e.chiave)));
    const nuovo: EsitoAttivita = { chiave, nome, gruppo: null, articolo: null, condizioni: [], doti: [], premi: null };
    onCambia({ modo: esiti?.modo ?? 'scelta', esiti: [...elenco, nuovo] });
    setAperto(chiave);
  };
  const rinomina = (i: number, nome: string) => {
    const e = elenco[i]!;
    // finché non è salvata, la chiave segue il nome; dopo resta quella
    const chiave = chiaviSalvate.has(e.chiave) ? e.chiave : chiaveNuova(nome || 'esito', new Set(elenco.filter((_, j) => j !== i).map((x) => x.chiave)));
    if (aperto === e.chiave) setAperto(chiave);
    cambiaEsito(i, { nome, chiave });
  };
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3" aria-label="Esiti dell’attività">
      <strong className="testo-14">Esiti scelti alla spunta</strong>
      <p className="m-0 testo-13 text-text-secondary">Per le attività il cui risultato cambia (una sfida vinta o persa, i colpi riusciti, il giorno della settimana): chi gioca sceglie l’esito alla spunta del Diario e al + del contatore, e le Doti dell’esito diventano il promemoria «Applica». Prezzo e ranghi di una sfida stanno nell’articolo del negozio: qui si cita l’articolo.</p>
      {esiti && <Selettore etichetta="Come si decide l’esito" valore={esiti.modo} ricerca="mai" disabilitato={disabilitato} opzioni={MODI_ESITI.map((m) => ({ chiave: m.chiave, nome: m.nome }))} onCambia={(modo) => onCambia({ ...esiti, modo: modo === 'automatico' ? 'automatico' : 'scelta' })} />}
      {!valido && <p role="alert" className="m-0 testo-13 text-error-testo">Gli esiti non sono ancora validi: ogni esito ha un nome, chiavi distinte, al più {LIMITI_ESITI.doti} Doti diverse; nel modo automatico ogni esito ha una condizione o un articolo.</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {elenco.map((e, i) => {
          const qui = aperto === e.chiave;
          return (
            // la chiave di React è la posizione: la chiave dell'esito segue il nome mentre si scrive, e il campo non deve perdere il fuoco
            <li key={i} className="flex min-w-0 flex-col gap-2 border-b border-border pb-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 testo-13"><strong>{e.nome}</strong> · <TestoNote testo={fraseDotiEsito(e.doti)} />{e.gruppo ? ` · ${e.gruppo}` : ''}</span>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={qui ? 'chiudi' : 'modifica'} dimensione={20} />} titolo={qui ? 'Chiudi' : 'Modifica'} aria-expanded={qui} disabled={disabilitato} onClick={() => setAperto(qui ? null : e.chiave)} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={disabilitato}
                  onClick={() => { const resto = elenco.filter((_, j) => j !== i); onCambia(resto.length ? { ...esiti!, esiti: resto } : null); }} />
              </span>
              {qui && (
                <div className="griglia-campi">
                  <CampoTesto etichetta="Nome dell’esito" valore={e.nome} massimo={LIMITI_ESITI.nome} disabilitato={disabilitato} onCambia={(v) => rinomina(i, v)} />
                  <CampoTesto etichetta="Prova (gruppo)" valore={e.gruppo ?? ''} massimo={LIMITI_ESITI.gruppo} aiuto="Per esempio «Comet Burger»: raggruppa gli esiti nella scelta" disabilitato={disabilitato} onCambia={(v) => cambiaEsito(i, { gruppo: v.trim() ? v : null })} />
                  <div className="campo campo--largo">
                    <Selettore etichetta="Articolo che si paga per tentare" valore={e.articolo ?? ''} vuoto="Nessun articolo" disabilitato={disabilitato || articoli.caricamento}
                      opzioni={(articoli.dati ?? []).map((a) => ({ chiave: a.chiave, nome: `${a.nome}${a.gruppo ? ` · ${a.gruppo}` : ''}` }))} onCambia={(v) => cambiaEsito(i, { articolo: v || null })} />
                  </div>
                  <div className="campo campo--largo flex flex-col gap-1.5">
                    <span className="testo-13 text-text-secondary">Doti che l’esito dà</span>
                    {e.doti.map((d, k) => (
                      <span key={d.dote} className="flex flex-wrap items-end gap-2">
                        <Selettore compatto etichetta="Dote" valore={d.dote} ricerca="mai" disabilitato={disabilitato}
                          opzioni={CHIAVI_DOTI.filter((c) => c === d.dote || !e.doti.some((x) => x.dote === c)).map((c) => ({ chiave: c, nome: nomeDote(c) }))}
                          onCambia={(v) => cambiaEsito(i, { doti: e.doti.map((x, j) => (j === k ? { ...x, dote: v as DoteChiave } : x)) })} />
                        <Selettore compatto etichetta="Note" valore={String(d.note)} ricerca="mai" disabilitato={disabilitato} opzioni={NOTE}
                          onCambia={(v) => cambiaEsito(i, { doti: e.doti.map((x, j) => (j === k ? { ...x, note: (Number(v) as 1 | 2 | 3) } : x)) })} />
                        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli la Dote" disabled={disabilitato} onClick={() => cambiaEsito(i, { doti: e.doti.filter((_, j) => j !== k) })} />
                      </span>
                    ))}
                    {e.doti.length < LIMITI_ESITI.doti && (
                      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote" disabled={disabilitato}
                        onClick={() => { const libera = CHIAVI_DOTI.find((c) => !e.doti.some((x) => x.dote === c)); if (libera) cambiaEsito(i, { doti: [...e.doti, { dote: libera, note: 1 }] }); }} />
                    )}
                  </div>
                  <CampoTesto etichetta="Premi non ancora modellati" tipo="lungo" valore={e.premi ?? ''} massimo={LIMITI_ESITI.premi} aiuto="Oggetti che l’app non ha come dato (un distintivo, dei panini): restano parole" disabilitato={disabilitato} onCambia={(v) => cambiaEsito(i, { premi: v.trim() ? v : null })} />
                  <div className="campo campo--largo">
                    <CondizioniEditor condizioni={e.condizioni} massimo={10} disabilitato={disabilitato} onCambia={(c) => cambiaEsito(i, { condizioni: c })} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {elenco.length < LIMITI_ESITI.esiti && (
        <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={elenco.length ? 'Aggiungi un esito' : 'Aggiungi gli esiti'} disabled={disabilitato} onClick={aggiungi} />
      )}
    </section>
  );
}
