// ============================================================
// ListinoNegozio — la merce di un negozio: filtri, articoli con la spunta «acquistato», articoli nascosti (L5 F1, estratto da NegozioPage)
// ============================================================
//
// Lo stesso listino nella pagina del negozio, nella pagina del luogo (una sezione per negozio della sede: M §4.1, D5) e, con
// `soloElenco`, negli scambi di Jose delle Richieste. Cresce con la pagina: nessuna area scorrevole annidata.
//
// Un listino corto (fino a 12 articoli) è un elenco solo, con i filtri di `FiltriArticoli`: categorie a tessere, «Per chi», stato e
// disponibilità. Un listino lungo non è un elenco e non si pagina: «che cosa sto guardando» si sceglie in un punto solo per livello.
//   1. Ricerca e, con una partita, «Acquistabili adesso | Tutti» (si apre sugli acquistabili: Untouchable ne ha 51 su 274).
//   2. Categorie a schede, una sempre scelta; all'apertura la prima che ha qualcosa di acquistabile.
//   3. Destinatari a chip, una scelta sola, dove la categoria non sta in una schermata e la divisione distribuisce davvero.
//   4. Scaffali: le fasi di vendita della scelta fatta (da quando l'articolo è in negozio), uno aperto alla volta, a partire
//      dall'ultimo già in vendita. Una scelta che sta in una schermata non ha scaffali: solo le righe.
// Con la ricerca attiva schede e chip contano i soli risultati; una categoria senza risultati è spenta.
// Chi ospita il listino gli dà una `key` col negozio e la partita: filtro e scelte sono di quel negozio in quella partita.
// ============================================================

import { useId, useMemo, useState } from 'react';
import { ArticoliTabella } from '../guida/ArticoliTabella';
import { ElementiRimossi } from '../guida/ElementiRimossi';
import { FiltriArticoli } from '../guida/FiltriArticoli';
import { IconaCategoria } from '../guida/IconaCategoria';
import { FILTRO_VUOTO, categoriePresenti, destinatariPresenti, filtraArticoli, type FiltroArticoli as Filtro } from '../../utils/articoli';
import type { ArticoloDto, NegozioDettaglioDto } from '../../types';
import { TrasformazioniDiJose } from '../catalogo/TrasformazioniDiJose';
import { FilaScorrevole } from '../shared/FilaScorrevole';
import { IconLucchettoChiuso } from '../shared/iconeGuida';
import { NOME_CATEGORIA_ARTICOLO } from '../../utils/negozi';
import { useMedia } from '../../hooks/useMedia';

type Articolo = ArticoloDto;

interface Props {
  /** Il negozio, con gli articoli e gli acquisti della partita. */
  negozio: NegozioDettaglioDto;
  partitaId: number | null;
  /** Cambia a ogni salvataggio: il blocco degli articoli nascosti si rilegge. */
  versione: number;
  /** «Modifica» di un articolo: chi ospita il listino apre il modulo del catalogo. Senza, le righe non hanno «Modifica». */
  onModifica?: (chiaveArticolo: string) => void;
  /** Un articolo cambiato (acquisto): chi ospita aggiorna il negozio in locale. */
  onCambiato: (a: Articolo) => void;
  /** Un articolo nascosto rimesso: chi ospita rilegge. */
  onRipristinato: () => void;
  /** Solo filtri ed elenco, senza le trasformazioni di Jose e senza gli articoli nascosti: il listino mostrato dentro un'altra pagina
   *  (gli scambi di Jose nelle Richieste), che per il resto rimanda alla pagina del negozio. */
  soloElenco?: boolean;
}

/** Oltre questo numero di articoli il listino non è più un elenco solo: categorie a schede, destinatari a chip, scaffali. */
const SOGLIA_GRUPPI = 12;
/**
 * Quanti articoli stanno in una schermata, nel caso peggiore (righe con la disponibilità sotto il nome): sette righe da 80 px circa
 * nei 621 px visibili a 1280×689, quattro schede da 160 px nei 752 px di un telefono a 375×812. Una scelta più lunga si divide.
 */
const CAPIENZA = { colonne: 7, telefono: 4 } as const;

/** Un insieme di articoli con un nome: la scelta fatta (categoria, o categoria e destinatario) oppure uno dei suoi scaffali. */
interface Gruppo { chiave: string; nome: string; articoli: Articolo[] }
/** Una categoria fra le schede: gli articoli in vista e quanti sarebbero senza il filtro di disponibilità. */
interface Scheda extends Gruppo { totale: number }

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** La condizione che dice **da quando** un articolo è in vendita: un arco della storia, una data, un intervallo di date. Le altre
 *  (giorno della settimana, rango, meteo…) dicono a quali condizioni, non in che fase. */
const condizioneDiFase = (a: Articolo) => (a.condizioni ?? []).find((c) => c.tipo === 'arco' || c.tipo === 'data' || c.tipo === 'intervallo');
/** La fase di vendita con le parole della condizione («dall'arco del Palazzo di Kaneshiro», «dal 22 dicembre»); vuoto = dall'inizio. */
const faseDi = (a: Articolo): string => condizioneDiFase(a)?.testo ?? '';
/** Il giorno d'inizio di una fase a data («12-22»), se c'è. */
const giornoDi = (a: Articolo): string | null => { const dal = (condizioneDiFase(a) as { dal?: unknown } | undefined)?.dal; return typeof dal === 'string' && /^\d{2}-\d{2}$/.test(dal) ? dal : null; };
/** Un giorno nell'anno di gioco, che va da aprile a marzo: gennaio viene dopo dicembre. */
const nellAnnoDiGioco = (giorno: string): number => { const [m, g] = giorno.split('-').map(Number); return (m < 4 ? m + 12 : m) * 100 + g; };
const acquistabile = (a: Articolo): boolean => a.disponibilita === undefined || a.disponibilita.stato === 'disponibile';

/**
 * Una scelta lunga divisa per fase di vendita: un negozio rinnova la merce a tappe, e ogni tappa è uno scaffale piccolo (Protezione di
 * Untouchable: 5 dal Palazzo di Kamoshida, 7 da Madarame, poi da 3 a 8 per tappa). Le fasi a data vanno in ordine di calendario di
 * gioco; con gli archi della storia vale l'ordine in cui le fasi compaiono nel listino. Se le date sono troppe per fare scaffali (le
 * televendite: due offerte per ogni domenica) si raggruppa per mese. Una fase (o una scelta con una fase sola) che non sta ancora in
 * una schermata si divide in parti uguali nell'ordine del listino, chiamate col primo e l'ultimo articolo: è l'ultima risorsa, per le
 * scelte che i dati non separano (le dodici cure della Clinica, tutte in vendita dall'inizio). Niente se la scelta sta nella capienza.
 */
function dividiPerFase(g: Gruppo, ordine: Map<string, number>, capienza: number): Gruppo[] {
  if (g.articoli.length <= capienza) return [];
  const tutteADate = g.articoli.every((a) => faseDi(a) === '' || giornoDi(a) !== null);
  const perMese = tutteADate && new Set(g.articoli.map(faseDi)).size > SOGLIA_GRUPPI;
  const fasi = new Map<string, { nome: string; posto: number; righe: Articolo[] }>();
  for (const a of g.articoli) {
    const fase = faseDi(a); const giorno = giornoDi(a);
    const chiave = perMese && giorno ? giorno.slice(0, 2) : fase;
    const nome = fase === '' ? 'Dall’inizio' : perMese && giorno ? maiuscola(MESI[Number(giorno.slice(0, 2)) - 1] ?? fase) : maiuscola(fase);
    const posto = fase === '' ? -1 : tutteADate && giorno ? nellAnnoDiGioco(perMese ? `${giorno.slice(0, 2)}-01` : giorno) : ordine.get(fase) ?? 0;
    const voce = fasi.get(chiave) ?? { nome, posto, righe: [] };
    voce.righe.push(a); fasi.set(chiave, voce);
  }
  const piuFasi = fasi.size > 1;
  return [...fasi.entries()].sort((x, y) => x[1].posto - y[1].posto).flatMap(([chiave, f]) => {
    const parti = Math.ceil(f.righe.length / capienza);
    if (parti === 1) return [{ chiave: `${g.chiave}#${chiave}`, nome: f.nome, articoli: f.righe }];
    const passo = Math.ceil(f.righe.length / parti);
    return Array.from({ length: parti }, (_, i) => f.righe.slice(i * passo, (i + 1) * passo)).filter((r) => r.length > 0).map((r, i) => ({
      chiave: `${g.chiave}#${chiave}#${i}`,
      nome: `${piuFasi ? `${f.nome} · ` : ''}da «${r[0].nome}» a «${r[r.length - 1].nome}»`,
      articoli: r,
    }));
  });
}

/** Il nome del destinatario sul suo chip. */
const nomeDestinatario = (per: string): string => (per === 'tutti' ? 'Per tutti' : per === '' ? 'Senza destinatario' : per);

/**
 * Le scelte del listino lungo, una per livello. `destinatario` resta anche dove la categoria non ha chip (tornando sulle armi si
 * ritrova «Joker»). `ambito` dice per quale scelta, capienza e filtro vale `scaffale`: cambiato uno dei tre, lo scaffale aperto
 * torna quello proposto. `scaffale`: la chiave dello scaffale aperto, `null` se li si è chiusi tutti, vuoto se non ce ne sono.
 */
interface Scelte { categoria: string | null; destinatario: string | null; ambito: string; scaffale: string | null }
const NESSUNA_SCELTA: Scelte = { categoria: null, destinatario: null, ambito: '', scaffale: '' };
const stesseScelte = (a: Scelte, b: Scelte): boolean => a.categoria === b.categoria && a.destinatario === b.destinatario && a.ambito === b.ambito && a.scaffale === b.scaffale;

/** La voce proposta di un livello: con una partita la prima che ha qualcosa di acquistabile, altrimenti (o se nessuna ne ha) la prima. */
const proposta = <T extends Gruppo>(voci: T[], conPartita: boolean): T => (conPartita ? voci.find((v) => v.articoli.some(acquistabile)) : undefined) ?? voci[0];

interface Vista {
  /** Le categorie del listino, nell'ordine di prima comparsa, con gli articoli in vista (nessuno = scheda spenta). */
  schede: Scheda[];
  /** I destinatari della categoria scelta, se si divide per destinatario. */
  chip: Gruppo[];
  /** Ciò che si guarda: la categoria scelta, o la categoria e il destinatario. `null` se non c'è niente in vista. */
  gruppo: Gruppo | null;
  /** Gli scaffali di `gruppo`; nessuno se sta in una schermata. */
  scaffali: Gruppo[];
  /** Le scelte ricondotte a voci che esistono. */
  scelte: Scelte;
}

/**
 * La vista del listino lungo: dalle scelte tenute e dagli articoli in vista ricava schede, chip e scaffali, e riconduce ogni scelta
 * che non esiste più (la categoria rimasta senza risultati, il destinatario sparito, lo scaffale di un'altra capienza) a una valida.
 * Una scelta valida non si tocca: la proposta di un livello si fissa quando la scelta si apre, non a ogni ridisegno, così dopo un
 * acquisto lo scaffale che si sta guardando resta aperto. Rimessa in ingresso, la vista restituisce le stesse scelte.
 */
function componi(p: { visibili: Articolo[]; senzaDisponibilita: Articolo[]; categorie: Array<{ chiave: string }>; scelte: Scelte; conPartita: boolean; capienza: number; ordineFasi: Map<string, number>; ambitoFiltro: string }): Vista {
  const perCategoria = new Map<string, Articolo[]>();
  for (const a of p.visibili) { const righe = perCategoria.get(a.categoria); if (righe) righe.push(a); else perCategoria.set(a.categoria, [a]); }
  const totali = new Map<string, number>();
  for (const a of p.senzaDisponibilita) totali.set(a.categoria, (totali.get(a.categoria) ?? 0) + 1);
  const schede = p.categorie.map((c) => ({ chiave: c.chiave, nome: NOME_CATEGORIA_ARTICOLO[c.chiave] ?? c.chiave, articoli: perCategoria.get(c.chiave) ?? [], totale: totali.get(c.chiave) ?? 0 }));
  const conArticoli = schede.filter((s) => s.articoli.length > 0);
  if (conArticoli.length === 0) return { schede, chip: [], gruppo: null, scaffali: [], scelte: p.scelte };
  const categoria = conArticoli.find((s) => s.chiave === p.scelte.categoria) ?? proposta(conArticoli, p.conPartita);
  const perDestinatario = new Map<string, Articolo[]>();
  for (const a of categoria.articoli) { const righe = perDestinatario.get(a.per ?? ''); if (righe) righe.push(a); else perDestinatario.set(a.per ?? '', [a]); }
  // i chip servono se la categoria non sta in una schermata e la divisione distribuisce davvero: con un destinatario che tiene quasi
  // tutto (Protezione: 59 «per tutti» su 61) darebbe un chip grande quanto la categoria e altri da una riga
  const piuGrande = Math.max(...[...perDestinatario.values()].map((r) => r.length));
  const chip = categoria.articoli.length > p.capienza && perDestinatario.size > 1 && piuGrande <= categoria.articoli.length * 0.8
    ? [...perDestinatario.entries()].map(([per, articoli]) => ({ chiave: per, nome: nomeDestinatario(per), articoli }))
    : [];
  const destinatario = chip.length === 0 ? null : chip.find((c) => c.chiave === p.scelte.destinatario) ?? proposta(chip, p.conPartita);
  const gruppo: Gruppo = destinatario ? { chiave: `${categoria.chiave}/${destinatario.chiave}`, nome: destinatario.nome, articoli: destinatario.articoli } : categoria;
  const scaffali = dividiPerFase(gruppo, p.ordineFasi, p.capienza);
  const ambito = `${gruppo.chiave}|${p.capienza}|${p.ambitoFiltro}`;
  // lo scaffale tenuto vale se è di questo ambito e c'è ancora (o se li si è chiusi tutti); altrimenti si propone l'ultimo già in
  // vendita, cioè la merce più nuova che si può comprare adesso (senza partita, il primo)
  const tenuto = p.scelte.ambito === ambito && (p.scelte.scaffale === null || scaffali.some((s) => s.chiave === p.scelte.scaffale));
  const ultimoInVendita = (p.conPartita ? [...scaffali].reverse().find((s) => s.articoli.some(acquistabile)) : undefined) ?? scaffali[0];
  const scaffale = scaffali.length === 0 ? '' : tenuto ? p.scelte.scaffale : ultimoInVendita.chiave;
  return { schede, chip, gruppo, scaffali, scelte: { categoria: categoria.chiave, destinatario: destinatario ? destinatario.chiave : p.scelte.destinatario, ambito, scaffale } };
}

/** Filtri, tabella degli articoli e articoli nascosti di un negozio. */
export function ListinoNegozio({ negozio, partitaId, versione, onModifica, onCambiato, onRipristinato, soloElenco }: Props) {
  const modifica = onModifica ? (a: Articolo) => onModifica(a.chiave) : undefined;
  const articoli = useMemo(() => negozio.articoliElenco ?? [], [negozio]);
  const conPartita = partitaId !== null;
  // Lungo o corto lo dice il listino intero, non ciò che resta dopo un filtro: i comandi non cambiano sotto le dita mentre si cerca.
  const lungo = articoli.length > SOGLIA_GRUPPI;
  // Un listino lungo si apre sugli articoli acquistabili adesso (Untouchable: 51 su 274): gli altri restano a un tocco, con «Tutti».
  // Uno corto si vede tutto, come sempre.
  const [filtro, setFiltro] = useState<Filtro>(() => ({ ...FILTRO_VUOTO, disponibilita: conPartita && lungo ? 'disponibili' : 'tutti' }));
  const categorie = useMemo(() => categoriePresenti(articoli), [articoli]);
  const destinatari = useMemo(() => destinatariPresenti(articoli), [articoli]);
  // nel listino lungo categoria e destinatario si scelgono con schede e chip, mai col filtro
  const filtroInUso = useMemo(() => (lungo ? { ...filtro, categorie: [], per: '' } : filtro), [filtro, lungo]);
  // Anche un articolo non ancora acquistabile resta consultabile con condizioni e semaforo.
  const visibili = useMemo(() => filtraArticoli(articoli, filtroInUso, conPartita), [articoli, filtroInUso, conPartita]);
  const senzaDisponibilita = useMemo(() => filtraArticoli(articoli, { ...filtroInUso, disponibilita: 'tutti' }, conPartita), [articoli, filtroInUso, conPartita]);
  const idElenco = useId();
  // sul telefono gli articoli sono schede, più alte delle righe: in una schermata ne stanno meno (stessa soglia del resto dell'app)
  const telefono = useMedia('(max-width: 767px)');
  const capienza = telefono ? CAPIENZA.telefono : CAPIENZA.colonne;
  const soloAcquistabili = conPartita && filtro.disponibilita === 'disponibili';
  // l'ordine delle fasi è quello in cui compaiono nel listino intero, uguale in ogni scelta
  const ordineFasi = useMemo(() => { const m = new Map<string, number>(); for (const a of articoli) if (!m.has(faseDi(a))) m.set(faseDi(a), m.size); return m; }, [articoli]);
  const [scelte, setScelte] = useState<Scelte>(NESSUNA_SCELTA);
  const ambitoFiltro = `${filtro.q.trim()}|${filtro.stato}|${filtro.disponibilita}`;
  const vista = useMemo(
    () => (lungo ? componi({ visibili, senzaDisponibilita, categorie, scelte, conPartita, capienza, ordineFasi, ambitoFiltro }) : null),
    [lungo, visibili, senzaDisponibilita, categorie, scelte, conPartita, capienza, ordineFasi, ambitoFiltro],
  );
  // Le scelte ricondotte si tengono nello stato (aggiornamento durante il disegno, che React rifà subito e una volta sola: la vista
  // delle scelte ricondotte restituisce le stesse): da qui in poi sono fisse finché restano valide.
  if (vista && !stesseScelte(vista.scelte, scelte)) setScelte(vista.scelte);

  const righe = (r: Articolo[]) => <ArticoliTabella onModifica={modifica} articoli={r} partitaId={partitaId} onCambiato={onCambiato} onContenutoCambiato={soloElenco ? undefined : onRipristinato} />;
  // Il conteggio di una voce, per chi non lo vede: «27 acquistabili adesso su 178» quando si guardano solo gli acquistabili
  const conteggioDetto = (n: number, totale: number) => (soloAcquistabili && totale !== n ? `, ${n} acquistabili adesso su ${totale}` : `, ${n} ${n === 1 ? 'articolo' : 'articoli'}`);
  const idScaffale = (i: number) => `${idElenco}-scaffale-${i}`;

  return (
    <>
      {!soloElenco && <TrasformazioniDiJose trasformazioni={negozio.trasformazioni ?? []} onModificata={onRipristinato} />}
      {articoli.length > 0 && (lungo
        ? <FiltriArticoli listino filtro={filtro} onCambia={setFiltro} conPartita={conPartita} />
        : <FiltriArticoli filtro={filtro} onCambia={setFiltro} categorie={categorie} destinatari={destinatari} conPartita={conPartita} />
      )}
      {/* guardando solo gli acquistabili, quanti sono sul totale */}
      {soloAcquistabili && visibili.length > 0 && visibili.length !== senzaDisponibilita.length && (
        <p className="m-0 testo-13 text-text-secondary">{visibili.length} di {senzaDisponibilita.length} acquistabili adesso.</p>
      )}
      {articoli.length === 0 ? <p className="m-0 testo-13 text-text-muted">Nessun articolo acquistabile confermato per questo luogo.</p>
        : visibili.length === 0 && soloAcquistabili && senzaDisponibilita.length > 0 ? (
          <p className="m-0 flex flex-wrap items-center gap-2 testo-13 text-text-secondary">
            Niente di acquistabile adesso: {senzaDisponibilita.length} {senzaDisponibilita.length === 1 ? 'articolo non acquistabile' : 'articoli non acquistabili'}.
            <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setFiltro({ ...filtro, disponibilita: 'tutti' })}>Mostrali</button>
          </p>
        ) : !vista ? <div className="negozio-elenco">{righe(visibili)}</div>
        : !vista.gruppo ? (
          // la ricerca (o lo stato d'acquisto) non trova niente: nel listino lungo l'azzeramento sta accanto al messaggio
          <p className="m-0 flex flex-wrap items-center gap-2 testo-13 text-text-secondary">
            Nessun articolo con questi filtri.
            <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setFiltro({ ...filtro, q: '', stato: 'tutti' })}>Azzera i filtri</button>
          </p>
        ) : (
          <>
            {vista.schede.length > 1 && (
              <FilaScorrevole role="group" aria-label="Categorie" className="listino-categorie">
                {vista.schede.map((s) => {
                  const scelta = s.chiave === vista.scelte.categoria;
                  return (
                    <button key={s.chiave} type="button" className={`selettore-icone__tessera touch ${scelta ? 'selettore-icone__tessera--attiva' : ''}`}
                      aria-pressed={scelta} disabled={s.articoli.length === 0} onClick={() => setScelte({ ...scelte, categoria: s.chiave })}>
                      <span className="selettore-icone__icona" aria-hidden="true"><IconaCategoria categoria={s.chiave} dimensione={24} /></span>
                      <span className="selettore-icone__nome">{s.nome} <span className="listino-conteggio" aria-hidden="true">{s.articoli.length}</span><span className="sr-only">{conteggioDetto(s.articoli.length, s.totale)}</span></span>
                    </button>
                  );
                })}
              </FilaScorrevole>
            )}
            {vista.chip.length > 0 && (
              <FilaScorrevole role="group" aria-label="Destinatari" className="fila-scorrevole--sempre listino-destinatari">
                {vista.chip.map((c) => {
                  const scelto = c.chiave === vista.scelte.destinatario;
                  return (
                    <button key={c.chiave} type="button" className={`chip touch ${scelto ? 'chip--attivo' : ''}`} aria-pressed={scelto} onClick={() => setScelte({ ...scelte, destinatario: c.chiave })}>
                      {c.nome} <span className="listino-conteggio" aria-hidden="true">{c.articoli.length}</span><span className="sr-only">{conteggioDetto(c.articoli.length, c.articoli.length)}</span>
                    </button>
                  );
                })}
              </FilaScorrevole>
            )}
            {/* col destinatario scelto da un chip la riga non lo ripete; dove non ci sono chip («Solo donne» fra le protezioni) resta */}
            <div className={`negozio-elenco listino-gruppi ${vista.chip.length > 0 ? 'listino-gruppi--destinatario' : ''}`}>
              {vista.scaffali.length === 0 ? righe(vista.gruppo.articoli) : vista.scaffali.map((s, i) => {
                const aperto = vista.scelte.scaffale === s.chiave;
                // uno scaffale senza niente di acquistabile lo dice: il nome dice quando, questo dice che non è adesso (non ancora, o non più)
                const nonAdesso = conPartita && !s.articoli.some(acquistabile);
                return (
                  <div key={s.chiave} className="listino-gruppo">
                    <button type="button" className="listino-gruppo__testata touch" aria-expanded={aperto} aria-controls={aperto ? idScaffale(i) : undefined}
                      onClick={() => setScelte({ ...scelte, scaffale: aperto ? null : s.chiave })}>
                      <span className="listino-gruppo__freccia" aria-hidden="true">{aperto ? '▾' : '▸'}</span>
                      <span className="listino-gruppo__nome">{s.nome}</span>
                      {nonAdesso && <span className="listino-gruppo__nota"><IconLucchettoChiuso size={14} aria-hidden="true" /> non adesso</span>}
                      <span className="listino-conteggio listino-gruppo__conteggio" aria-hidden="true">{s.articoli.length}</span>
                      <span className="sr-only">{`, ${s.articoli.length} ${s.articoli.length === 1 ? 'articolo' : 'articoli'}`}</span>
                    </button>
                    {aperto && <div id={idScaffale(i)} className="listino-gruppo__corpo">{righe(s.articoli)}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      {/* Gli articoli nascosti di questo negozio, con il ripristino in un tocco: la pagina «Rimossi» li ha tutti. */}
      {!soloElenco && <ElementiRimossi tipo="articolo" negozio={negozio.chiave} versione={versione} onRipristinato={onRipristinato} />}
    </>
  );
}
