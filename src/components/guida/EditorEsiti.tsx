// ============================================================
// EditorEsiti — gli esiti di un'attività, nel modulo dell'attività (L13, ondata 2; solo nella preparazione, mai nel rilascio)
// ============================================================
//
// Il solo punto in cui si scrivono gli esiti (`attivita.esiti_json`): il modo (scelto da chi gioca o automatico per condizioni) e, per
// ogni esito, nome, prova (gruppo), articolo del negozio che dà prezzo e ranghi, Doti con le note, condizioni proprie e premi in parole.
// Un esito alla volta si apre per le condizioni (l'editor completo delle condizioni carica i suoi elenchi: uno solo aperto). La chiave
// nasce dal nome e non cambia più dopo il primo salvataggio (la ricevuta della spunta e l'effetto `turno` della voce la citano).
// Il modulo arriva qui solo fuori dal rilascio: `CorreggiElemento` e `AggiungiAlCatalogo` non esistono nella build di rilascio.
// Ondata 5 (lotto G): un esito può dire il trofeo che fa ottenere («Vinto» all'estrazione della lotteria → «Soldi facili»): registrando il
// turno con quell'esito il trofeo si segna da solo, e togliendolo torna com'era. E gli oggetti del catalogo che dà, con le copie (la Comet
// Burger vinta → «Distintivo numero due» e 3 «Big Bang Burger»): registrando il turno entrano fra quelli ottenuti, togliendolo se ne vanno.
// Ondata 5 (lotto F-bis): e gli oggetti che CONSUMA (concimare la pianta → 1 «Bionutrienti»): registrando il turno escono dalle copie possedute.
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
import { LIMITI_ESITI, MODI_ESITI, chiaveEsitoDaNome, fraseDotiEsito, normalizzaEsitiAttivita, type EsitiAttivita, type EsitoAttivita, type OggettoEsito } from '../../../shared/esitiAttivita';
import { SceltaNelCatalogo } from '../catalogo/SceltaCatalogoOggetto';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { CampoQuantita } from './CampiEffettoVoce';

const NOTE: Array<{ chiave: string; nome: string }> = SCELTE_NOTE.map((s) => ({ chiave: s.chiave, nome: s.simboli }));

/**
 * Ondata 5 (lotto G): gli oggetti del catalogo che l'esito dà (la Comet Burger vinta → «Distintivo numero due» e 3 «Big Bang Burger»), con le
 * copie. Il catalogo si legge una volta sola, solo con l'esito aperto; un oggetto già nell'elenco non si propone di nuovo.
 * Ondata 5 (lotto F-bis): lo stesso editor per gli oggetti che l'esito CONSUMA (il concime, i materiali della fabbricazione), con il suo titolo.
 * Il pulsante «Togli» dice quale oggetto toglie (con più oggetti, nomi accessibili distinti).
 */
function OggettiDellEsito({ oggetti, titolo, disabilitato, onCambia }: { oggetti: readonly OggettoEsito[]; titolo: string; disabilitato?: boolean; onCambia: (o: OggettoEsito[]) => void }) {
  const catalogo = useCarica(() => getCatalogoOggetti(), []);
  const stato = { oggetti: catalogo.dati, caricamento: catalogo.caricamento, errore: catalogo.errore, onRicarica: () => void catalogo.ricarica() };
  const scelti = oggetti.map((o) => o.oggetto);
  // revisione finale UX (A3): con più oggetti ogni «Togli» dice quale oggetto toglie (il nome del catalogo, o la chiave finché non è letto);
  // vale per entrambi gli elenchi (oggetti dati e consumati, lotto F-bis): il testo visibile resta corto, il nome accessibile lo contiene
  const nomeDi = (chiave: string) => catalogo.dati?.find((c) => c.chiave === chiave)?.nome ?? chiave;
  return (
    <div className="campo campo--largo flex flex-col gap-1.5">
      <span className="testo-13 text-text-secondary">{titolo}</span>
      {oggetti.map((o, k) => (
        <span key={o.oggetto} className="flex flex-wrap items-end gap-2">
          <span className="min-w-[12rem] flex-1">
            <SceltaNelCatalogo {...stato} etichetta="Oggetto" valore={o.oggetto} escludi={scelti.filter((c) => c !== o.oggetto)} disabilitato={disabilitato}
              onScegli={(c) => onCambia(oggetti.map((x, j) => (j === k ? { ...x, oggetto: c.chiave } : x)))} />
          </span>
          <CampoQuantita valore={o.quantita} disabilitato={disabilitato} onCambia={(q) => onCambia(oggetti.map((x, j) => (j === k ? { ...x, quantita: Math.min(LIMITI_ESITI.quantita, q) } : x)))} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli l’oggetto" aria-label={`Togli l’oggetto ${nomeDi(o.oggetto)}`} disabled={disabilitato} onClick={() => onCambia(oggetti.filter((_, j) => j !== k))} />
        </span>
      ))}
      {oggetti.length < LIMITI_ESITI.oggetti && (
        <SceltaNelCatalogo {...stato} etichetta={oggetti.length ? 'Aggiungi un altro oggetto' : 'Aggiungi un oggetto'} valore="" escludi={scelti} disabilitato={disabilitato}
          onScegli={(c) => onCambia([...oggetti, { oggetto: c.chiave, quantita: 1 }])} />
      )}
    </div>
  );
}

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
  const elenchi = useCarica(async () => { const e = await getElenchiRegole(); return { articoli: e.articoli ?? [], trofei: e.trofei ?? [] }; }, []);
  const nomeTrofeo = (chiave: string): string => elenchi.dati?.trofei.find((t) => t.chiave === chiave)?.nome ?? 'Trofeo non più nell’elenco';
  const elenco = esiti?.esiti ?? [];
  // «nessuna Dote» si dice solo se qualche esito ne dà (l'estrazione della lotteria non ne dà: la frase non informerebbe)
  const conDoti = elenco.some((e) => e.doti.length > 0);
  const valido = esiti === null || normalizzaEsitiAttivita(esiti) !== null;
  const cambiaEsito = (i: number, e: Partial<EsitoAttivita>) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => (j === i ? { ...x, ...e } : x)) });
  // il trofeo è facoltativo: «nessuno» toglie il campo (gli esiti senza trofeo restano come prima)
  const cambiaTrofeo = (i: number, trofeo: string) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => {
    if (j !== i) return x;
    const resto: EsitoAttivita = { ...x };
    delete resto.trofeo;
    return trofeo ? { ...resto, trofeo } : resto;
  }) });
  // gli oggetti sono facoltativi come il trofeo: un elenco vuoto toglie il campo (gli esiti senza oggetti restano come prima)
  const cambiaOggetti = (i: number, oggetti: OggettoEsito[]) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => {
    if (j !== i) return x;
    const resto: EsitoAttivita = { ...x };
    delete resto.oggetti;
    return oggetti.length ? { ...resto, oggetti } : resto;
  }) });
  // Ondata 5 (lotto F-bis): gli oggetti consumati, facoltativi come quelli dati
  const cambiaConsuma = (i: number, consuma: OggettoEsito[]) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => {
    if (j !== i) return x;
    const resto: EsitoAttivita = { ...x };
    delete resto.consuma;
    return consuma.length ? { ...resto, consuma } : resto;
  }) });
  // 2026-10-27: la versione con il bonus è facoltativa come il trofeo: «Nessuna» toglie il campo
  const cambiaBonusDi = (i: number, bonusDi: string) => esiti && onCambia({ ...esiti, esiti: elenco.map((x, j) => {
    if (j !== i) return x;
    const resto: EsitoAttivita = { ...x };
    delete resto.bonusDi;
    return bonusDi ? { ...resto, bonusDi } : resto;
  }) });
  /** Togliendo un esito, le versioni con il bonus che lo citavano tornano esiti a sé (nessun riferimento resta a un esito che non c'è). */
  const togliEsito = (i: number) => {
    const via = elenco[i]!.chiave;
    const resto = elenco.filter((_, j) => j !== i).map((x) => { if (x.bonusDi !== via) return x; const y: EsitoAttivita = { ...x }; delete y.bonusDi; return y; });
    onCambia(resto.length ? { ...esiti!, esiti: resto } : null);
  };
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
      <p className="m-0 testo-13 text-text-secondary">Per le attività il cui risultato cambia (una sfida vinta o persa, i colpi riusciti, il giorno della settimana): chi gioca sceglie l’esito alla spunta del Diario e al + del contatore, e le Doti dell’esito diventano il promemoria «Applica». Prezzo e ranghi di una sfida stanno nell’articolo del negozio: qui si cita l’articolo. Il trofeo e gli oggetti di un esito (la lotteria vinta, i distintivi delle sfide) si segnano da soli registrando il turno.</p>
      {esiti && <Selettore etichetta="Come si decide l’esito" valore={esiti.modo} ricerca="mai" disabilitato={disabilitato} opzioni={MODI_ESITI.map((m) => ({ chiave: m.chiave, nome: m.nome }))} onCambia={(modo) => onCambia({ ...esiti, modo: modo === 'automatico' ? 'automatico' : 'scelta' })} />}
      {!valido && <p role="alert" className="m-0 testo-13 text-error-testo">Gli esiti non sono ancora validi: ogni esito ha un nome, chiavi distinte, al più {LIMITI_ESITI.doti} Doti diverse; nel modo automatico ogni esito ha una condizione o un articolo; le versioni con il bonus valgono solo nel modo «scelta», una per esito base.</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {elenco.map((e, i) => {
          const qui = aperto === e.chiave;
          return (
            // la chiave di React è la posizione: la chiave dell'esito segue il nome mentre si scrive, e il campo non deve perdere il fuoco
            <li key={i} className="flex min-w-0 flex-col gap-2 border-b border-border pb-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 testo-13"><strong>{e.nome}</strong>{conDoti ? <> · <TestoNote testo={fraseDotiEsito(e.doti)} /></> : null}{e.gruppo ? ` · ${e.gruppo}` : ''}{e.trofeo ? ` · trofeo «${nomeTrofeo(e.trofeo)}»` : ''}{e.oggetti?.length ? ` · ${e.oggetti.length === 1 ? '1 oggetto' : `${e.oggetti.length} oggetti`}` : ''}{e.consuma?.length ? ` · ne consuma ${e.consuma.length === 1 ? '1' : e.consuma.length}` : ''}{e.bonusDi ? ` · con il bonus di «${elenco.find((x) => x.chiave === e.bonusDi)?.nome ?? 'esito non più nell’elenco'}»` : ''}</span>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={qui ? 'chiudi' : 'modifica'} dimensione={20} />} titolo={qui ? 'Chiudi' : 'Modifica'} aria-expanded={qui} disabled={disabilitato} onClick={() => setAperto(qui ? null : e.chiave)} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={disabilitato}
                  onClick={() => togliEsito(i)} />
              </span>
              {qui && (
                <div className="griglia-campi">
                  <CampoTesto etichetta="Nome dell’esito" valore={e.nome} massimo={LIMITI_ESITI.nome} disabilitato={disabilitato} onCambia={(v) => rinomina(i, v)} />
                  <CampoTesto etichetta="Prova (gruppo)" valore={e.gruppo ?? ''} massimo={LIMITI_ESITI.gruppo} aiuto="Per esempio «Comet Burger»: raggruppa gli esiti nella scelta" disabilitato={disabilitato} onCambia={(v) => cambiaEsito(i, { gruppo: v.trim() ? v : null })} />
                  {/* 2026-10-27: la versione con il bonus di un altro esito (la fabbricazione: «Grimaldello · con il bonus»): nella voce si sceglie lo
                      strumento e la quantità, alla spunta solo «Bonus» sì/no. Solo nel modo «scelta» e fra gli esiti che non sono già versioni con il bonus */}
                  {esiti?.modo === 'scelta' && !elenco.some((x) => x.bonusDi === e.chiave) && (
                    <div className="campo campo--largo">
                      <Selettore etichetta="Versione con il bonus di" valore={e.bonusDi ?? ''} vuoto="Nessuna: esito a sé" disabilitato={disabilitato}
                        opzioni={elenco.filter((x) => x.chiave !== e.chiave && !x.bonusDi && !elenco.some((y) => y.bonusDi === x.chiave && y.chiave !== e.chiave)).map((x) => ({ chiave: x.chiave, nome: x.nome }))}
                        onCambia={(v) => cambiaBonusDi(i, v)} />
                    </div>
                  )}
                  <div className="campo campo--largo">
                    <Selettore etichetta="Articolo che l’esito fa pagare" valore={e.articolo ?? ''} vuoto="Nessun articolo" disabilitato={disabilitato || elenchi.caricamento}
                      opzioni={(elenchi.dati?.articoli ?? []).map((a) => ({ chiave: a.chiave, nome: `${a.nome}${a.gruppo ? ` · ${a.gruppo}` : ''}` }))} onCambia={(v) => cambiaEsito(i, { articolo: v || null })} />
                  </div>
                  <div className="campo campo--largo">
                    <Selettore etichetta="Trofeo che l’esito fa ottenere" valore={e.trofeo ?? ''} vuoto="Nessun trofeo" disabilitato={disabilitato || elenchi.caricamento}
                      opzioni={[...(elenchi.dati?.trofei ?? []), ...(e.trofeo && !elenchi.dati?.trofei.some((t) => t.chiave === e.trofeo) ? [{ chiave: e.trofeo, nome: 'Trofeo non più nell’elenco' }] : [])]}
                      onCambia={(v) => cambiaTrofeo(i, v)} />
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
                  <OggettiDellEsito oggetti={e.oggetti ?? []} titolo="Oggetti che l’esito dà (entrano fra quelli ottenuti nella partita)" disabilitato={disabilitato} onCambia={(o) => cambiaOggetti(i, o)} />
                  <OggettiDellEsito oggetti={e.consuma ?? []} titolo="Oggetti che l’esito consuma (escono dalle copie possedute; il prezzo non si paga di nuovo)" disabilitato={disabilitato} onCambia={(o) => cambiaConsuma(i, o)} />
                  <CampoTesto etichetta="Altri premi, in parole" tipo="lungo" valore={e.premi ?? ''} massimo={LIMITI_ESITI.premi} aiuto="Solo ciò che non è un oggetto del catalogo: gli oggetti si scelgono qui sopra" disabilitato={disabilitato} onCambia={(v) => cambiaEsito(i, { premi: v.trim() ? v : null })} />
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
