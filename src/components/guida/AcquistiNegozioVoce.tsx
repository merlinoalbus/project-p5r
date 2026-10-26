// ============================================================
// AcquistiNegozioVoce — «Acquisti da questo negozio» (con il nome del negozio come dettaglio): gli articoli comprati in una voce d'acquisto, con le copie e il totale (L13, ondata 4a)
// ============================================================
//
// Richiesta dell'utente: «come faccio a comprare più oggetti in una voce di acquisto da 1 negozio?». In una voce di tipo Acquisto collegata a
// un negozio, un solo elenco: una riga per articolo (l'articolo, scelto fra quelli DEL negozio, e le copie), con Su / Giù e «Togli»; sotto,
// «Aggiungi articolo» propone solo gli articoli del negozio (scegliere uno già in elenco ne aggiunge una copia, senza una seconda riga); in
// fondo il totale, «Totale ¥900» (dal 2026-10-25: gli articoli e le copie sono già le righe dell'elenco). Gli articoli restano effetti «articolo» della
// voce (lo stesso formato di sempre, nessun dato nuovo): questo elenco ne è la vista per il negozio, e l'elenco degli effetti non li ripete.
// Un articolo di un altro negozio resta nell'elenco degli effetti, dove si vede e si toglie.
//
// L13 (decisione 4, 2026-10-26: «tv shopping con due prodotti da scegliere gestito malissimo... non posso effettivamente scegliere»): gli
// articoli che il catalogo dichiara alternativi fra loro (Set A o Set B: «non insieme a») stanno in un riquadro a parte, «Alla spunta ne
// scegli uno, o nessuno», con nome, prezzo e contenuto, senza totale (sommarli sarebbe un acquisto che il gioco non permette). Un articolo
// che ha un'alternativa non ancora nella voce offre «Aggiungi l'alternativa». «Aggiungi articolo» mette per primi gli articoli del giorno
// della voce. Nella voce non si dichiara niente: le alternative le dice il catalogo, la scelta si fa alla spunta.
// ============================================================

import { contoArticoli, fondiArticoliUguali, gruppiAlternativi, QUANTITA_MASSIMA_EFFETTO, type EffettoVoce } from '../../../shared/effettiVoce';
import { testoContenuto } from '../../../shared/riepilogoEffetti';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CampoQuantita } from './CampiEffettoVoce';
import { conCorrente, opzioniArticoli, type ElenchiVoce } from '../../utils/opzioniEffetti';
import type { CampiStrutturati } from '../../utils/azioneStrutturata';
import type { NomiEffetti, RigaEffetto } from '../../utils/effettoAutomatico';
import { eArticoloDelNegozio } from '../../utils/effettiDellaVoce';

type Articolo = Extract<EffettoVoce, { tipo: 'articolo' }>;

/** L'articolo con le copie (1 = sottintesa, non si scrive: una sola forma per lo stesso effetto). */
const articolo = (chiave: string, quantita: number): Articolo => (quantita > 1 ? { tipo: 'articolo', articolo: chiave, quantita } : { tipo: 'articolo', articolo: chiave });

const yen = (n: number) => `¥${n.toLocaleString('it-IT')}`;

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
  nomi: NomiEffetti;
  negozio: string;
  nomeNegozio: string | null;
}

/** Gli articoli comprati dal negozio della voce: vedi l'intestazione del file. */
export function AcquistiNegozioVoce({ valore, onCambia, elenchi, nomi, negozio, nomeNegozio }: Props) {
  const righe = valore.effettiVoce ?? [];
  /** I posti (nella lista completa degli effetti) degli articoli di questo negozio, nel loro ordine. */
  const posti = righe.map((r, i) => (eArticoloDelNegozio(r, negozio) ? i : -1)).filter((i) => i >= 0);
  const opzioni = opzioniArticoli(elenchi.effetti, negozio, elenchi.giorno);
  const imposta = (effettiVoce: RigaEffetto[]) => onCambia({ ...valore, effettiVoce });
  /** Cambia l'articolo o le copie di una riga; se l'articolo scelto c'è già in un'altra riga le due si fondono (copie sommate), come in «Aggiungi articolo»: mai due righe dello stesso articolo. */
  const cambia = (i: number, e: Articolo) => imposta(fondiArticoliUguali(righe.map((r, j) => (j === i ? { ...r, effetto: e } : r))));
  /** Scambia l'articolo al posto `k` dell'elenco con quello prima (-1) o dopo (+1): l'ordine in cui la spunta li segna. */
  const sposta = (k: number, verso: -1 | 1) => {
    const a = posti[k]!, b = posti[k + verso];
    if (b === undefined) return;
    const nuove = [...righe];
    [nuove[a], nuove[b]] = [nuove[b]!, nuove[a]!];
    imposta(nuove);
  };
  const aggiungi = (chiave: string) => {
    if (!chiave) return;
    const gia = posti.find((i) => (righe[i]!.effetto as Articolo).articolo === chiave);
    if (gia !== undefined) {
      const e = righe[gia]!.effetto as Articolo;
      cambia(gia, articolo(chiave, Math.min(QUANTITA_MASSIMA_EFFETTO, (e.quantita ?? 1) + 1)));
      return;
    }
    imposta([...righe, { uid: null, effetto: articolo(chiave, 1) }]);
  };
  // L13 (decisione 4): i gruppi di articoli alternativi fra quelli della voce (lo stesso calcolo del riepilogo e della spunta)
  const chiavi = posti.map((i) => (righe[i]!.effetto as Articolo).articolo);
  const gruppi = gruppiAlternativi(chiavi, (k) => nomi.articoli.get(k)?.incompatibili);
  const inGruppo = new Set(gruppi.flat());
  // 2026-10-25 (richiesta dell'utente: «formattarlo in modo adeguato, per tutti gli acquisti»): il totale è un dato (`contoArticoli`, lo stesso
  // conto del riepilogo «Il gioco dà» della voce) e si scrive «Totale ¥N»; gli articoli con copie e prezzo sono già le righe qui sopra.
  // Gli articoli alternativi non entrano nel totale: se ne compra uno, o nessuno
  const conto = contoArticoli(posti.map((i) => righe[i]!.effetto), (k) => nomi.articoli.get(k), inGruppo);
  const ordinari = posti.filter((i) => !inGruppo.has((righe[i]!.effetto as Articolo).articolo));

  /** Una riga dell'elenco: `k` è la sua posizione fra gli articoli del negozio (per Su e Giù), `alternativa` se sta in un gruppo. */
  const riga = (i: number, alternativa: boolean) => {
    const k = posti.indexOf(i);
    const e = righe[i]!.effetto as Articolo;
    const a = nomi.articoli.get(e.articolo);
    const q = e.quantita ?? 1;
    const contenuto = testoContenuto(a?.contenuto);
    // le alternative dichiarate dal catalogo che la voce non ha ancora: si aggiungono con un tocco
    const mancanti = (a?.incompatibili ?? []).filter((x) => !chiavi.includes(x) && !nomi.articoli.get(x)?.nascosto && nomi.articoli.has(x));
    const nome = a?.nome ?? 'Articolo non più nel negozio';
    return (
      <li key={righe[i]!.uid ?? `nuovo-${i}`} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-bg-tertiary p-2">
        <span className="flex min-w-0 flex-wrap items-end gap-2">
          {alternativa ? (
            <span className="flex min-h-11 min-w-[12rem] flex-1 flex-col justify-center">
              <span className="testo-13 font-semibold break-words text-pretty">{nome}</span>
            </span>
          ) : (
            <Selettore etichettaSopra className="min-w-[12rem] flex-1" etichetta={`Articolo ${k + 1}`} valore={e.articolo} opzioni={conCorrente(opzioni, e.articolo, a?.nascosto ? `${nome} (non più nel negozio)` : nome)}
              onCambia={(v) => { if (v) cambia(i, articolo(v, q)); }} />
          )}
          <CampoQuantita valore={q} onCambia={(n) => cambia(i, articolo(e.articolo, n))} />
          <span className="min-h-11 flex items-center testo-13 text-text-secondary tabular-nums" aria-label={`Prezzo: ${a?.prezzo != null ? yen(a.prezzo * q) : 'senza prezzo'}`}>{a?.prezzo != null ? yen(a.prezzo * q) : '—'}</span>
          <span className="flex gap-1">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su: ${nome}`} disabled={k === 0} onClick={() => sposta(k, -1)} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù: ${nome}`} disabled={k === posti.length - 1} onClick={() => sposta(k, 1)} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli: ${nome}`} onClick={() => imposta(righe.filter((_, j) => j !== i))} />
          </span>
        </span>
        {contenuto && <span className="testo-12 text-text-secondary break-words text-pretty">{contenuto}</span>}
        {mancanti.map((x) => {
          const alt = nomi.articoli.get(x)!;
          return (
            <span key={x} className="flex">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="piu" dimensione={20} />}
                titolo={`Aggiungi l’alternativa: ${alt.nome}${alt.prezzo != null ? ` · ${yen(alt.prezzo)}` : ''}`} onClick={() => aggiungi(x)} />
            </span>
          );
        })}
      </li>
    );
  };

  return (
    <section className="flex flex-col gap-2" aria-labelledby="acquisti-negozio-titolo">
      <div className="flex min-w-0 flex-col">
        <h4 id="acquisti-negozio-titolo" className="m-0 testo-13 font-semibold">Acquisti da questo negozio</h4>
        {nomeNegozio && <span className="testo-12 break-words text-text-muted">{nomeNegozio}</span>}
      </div>
      {posti.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessun articolo: la voce resta un promemoria dell’acquisto. Aggiungi gli articoli per segnarli comprati alla spunta.</p>}
      {ordinari.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={`Articoli comprati da ${nomeNegozio ?? 'questo negozio'}`}>
          {ordinari.map((i) => riga(i, false))}
        </ol>
      )}
      {gruppi.map((membri, g) => {
        const idTitolo = `acquisti-negozio-scelta-${g}`;
        return (
          <section key={membri.join('|')} aria-labelledby={idTitolo} className="flex flex-col gap-1.5 rounded-md border border-dashed border-border p-2">
            <h5 id={idTitolo} className="m-0 testo-13 font-semibold text-pretty">Alla spunta ne scegli uno, o nessuno</h5>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {posti.filter((i) => membri.includes((righe[i]!.effetto as Articolo).articolo)).map((i) => riga(i, true))}
            </ol>
          </section>
        );
      })}
      {righe.length < 100 && (
        <Selettore etichettaSopra etichetta="Aggiungi articolo" valore="" vuoto={opzioni.length ? 'Scegli un articolo del negozio' : 'Il negozio non ha articoli nel catalogo'} opzioni={opzioni}
          disabilitato={opzioni.length === 0} onCambia={aggiungi} />
      )}
      {conto && conto.totale !== null && (
        <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border pt-1 testo-13">
          <strong>Totale</strong>
          <strong className="tabular-nums">{yen(conto.totale)}{conto.senzaPrezzo ? ` (più ${conto.senzaPrezzo} senza prezzo)` : ''}</strong>
        </p>
      )}
    </section>
  );
}
