// ============================================================
// SceltaRegalo — la finestra unica «Regala» (R10-18): si sceglie l'oggetto del catalogo, l'azione fa il resto
// ============================================================
//
// Una sola azione: dà i punti al Confidente (la base della reazione con i moltiplicatori, dove il rango li conta), registra la consegna per
// chiave del catalogo e, se serve, segna anche l'acquisto. Sostituisce «Regalo» di Partita › Confidenti (+50 senza dire quale oggetto) e
// «Regalo consegnato» della scheda (consegna senza punti). L13 (decisione 18): con l'acquisto segnato il prezzo si scala da solo dal saldo, mai
// sotto zero, e togliendo il regalo torna. La logica è nel server (`POST /partite/:id/regali`): qui si scelgono solo i dati.
//
// Ondata 5 (decisione 21 dell'utente; censimento RG-09, RG-10, RG-17, RG-18, D2, D3):
//   - si sceglie fra tutti gli oggetti regalo, raggruppati per reazione: i graditi del Confidente (+3, +2) e tutti gli altri, che valgono +1
//     («ogni regalo garantisce almeno 1 punto»; le righe dell'elenco a +1 stanno con loro: revisione dei lotti D e D2);
//   - lo stesso oggetto si può ridare: la consegna di prima si ricorda, non si blocca;
//   - le copie possedute (comprate, ricevute o dentro un set) si usano prima di ricomprare: con una copia l'acquisto non è proposto di
//     partenza; senza, «Segna anche comprato» crea la copia che il regalo usa;
//   - un Confidente non ancora incontrato (rango 0) non riceve regali; la Cartolina si spedisce, mai a chi è al rango massimo.
// ============================================================

import { useMemo, useState } from 'react';
import type { ConfidentePartitaDto, EsitoRegaloDto, OffertaOggettoDto, RegaloConfidenteDto } from '../../types';
import { getConfidenteDettaglio, getConfidentiPartita } from '../../services/api';
import { regalaOggetto } from '../../services/api/partite';
import { getCatalogoOggetti, getOggettoCatalogo } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { anteprimaPunti, formattaPunti, formattaYen } from '../../utils/punti';
import { AVVISO_CARTOLINA, CARTOLINA, REAZIONE_CARTOLINA, REAZIONE_FUORI_ELENCO, eGradito, testoReazione } from '../../../shared/regali';
import type { ReazioneRegalo } from '../../../shared/puntiConfidenti';
import { Modal } from '../shared/Modal';
import { Selettore, type OpzioneSelettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  partita: number;
  confidente: string;
  nomeConfidente: string;
  /** I regali dell'elenco del Confidente (dalla sua scheda), con la reazione; se assenti li legge la finestra. */
  regali?: RegaloConfidenteDto[];
  /** Le sole chiavi fra cui scegliere, se chi apre già le conosce (la scheda dell'oggetto); senza, tutti gli oggetti regalo. */
  ammessi?: readonly string[];
  /** Lo stato del Confidente nella partita; se assente (undefined) lo legge la finestra. */
  stato?: ConfidentePartitaDto | null;
  /** I moltiplicatori dei punti scelti da chi apre; senza, il bonus dell'arcano segue la scorta. */
  bonusArcano?: boolean;
  invito?: boolean;
  /** L'oggetto già scelto (un regalo toccato in elenco, la scheda dell'oggetto). */
  oggettoIniziale?: string;
  onChiudi: () => void;
  onFatto: (esito: EsitoRegaloDto) => void;
}

/** Identifica un'offerta (articolo e sede) nel selettore. */
const chiaveOfferta = (o: OffertaOggettoDto) => `${o.articolo}|${o.sedeChiave ?? ''}`;

/** Dove si compra un'offerta, in una riga. */
function etichettaOfferta(o: OffertaOggettoDto): string {
  const dove = o.sedeNome && o.sedeNome !== o.negozioNome ? `${o.negozioNome} (${o.sedeNome})` : o.negozioNome;
  return `${dove}${o.prezzo !== null ? ` · ${o.prezzo === 0 ? 'Gratis' : formattaYen(o.prezzo)}` : ''}`;
}

/** Il gruppo dell'oggetto nel selettore: i graditi del Confidente per reazione (+3, +2), poi tutti gli altri regali a +1 (anche le righe
 *  dell'elenco a +1, che valgono quanto ogni altro regalo: revisione dei lotti D e D2), poi la Cartolina da spedire. */
function gruppo(chiave: string, inElenco: ReazioneRegalo | undefined, nomeConfidente: string): string {
  if (chiave === CARTOLINA) return `Da spedire · ${testoReazione(REAZIONE_CARTOLINA)}`;
  return inElenco !== undefined && eGradito(inElenco) ? `Graditi a ${nomeConfidente} · ${testoReazione(inElenco)}` : `Altri regali · ${testoReazione(REAZIONE_FUORI_ELENCO)}`;
}

/** «Regala a …»: scelta dell'oggetto fra tutti i regali, reazione e punti previsti, copia posseduta o acquisto da segnare insieme. */
export function SceltaRegalo({ partita, confidente, nomeConfidente, regali, ammessi, stato, bonusArcano, invito = false, oggettoIniziale = '', onChiudi, onFatto }: Props) {
  const dettaglio = useCarica(() => (regali ? Promise.resolve(null) : getConfidenteDettaglio(confidente)), [confidente, !!regali]);
  const catalogo = useCarica(() => getCatalogoOggetti({ categoria: 'regalo' }), []);
  const lettoStato = useCarica(() => (stato !== undefined ? Promise.resolve(null) : getConfidentiPartita(partita).then((l) => l.find((c) => c.chiave === confidente) ?? null)), [partita, confidente, stato !== undefined]);
  const sc = stato !== undefined ? stato : lettoStato.dati;
  const elenco = regali ?? dettaglio.dati?.regali;
  /** Revisione dei lotti D e D2: reazione, gruppo e punti dipendono dall'elenco del Confidente e dal suo stato nella partita. Finché non sono
   *  arrivati (o se la lettura è fallita) la finestra non mostra un'anteprima e non conferma: altrimenti direbbe +1 a un oggetto gradito a +3. */
  const pronto = elenco !== undefined && (stato !== undefined || (!lettoStato.inPrimoCaricamento && !lettoStato.errore));
  /** La reazione di ogni oggetto dell'elenco del Confidente (la più alta, se l'oggetto vi compare due volte). */
  const reazioni = useMemo(() => {
    const m = new Map<string, ReazioneRegalo>();
    for (const g of elenco ?? []) if (g.catalogo && g.reazione !== null) m.set(g.catalogo.chiave, Math.max(m.get(g.catalogo.chiave) ?? 0, g.reazione) as ReazioneRegalo);
    return m;
  }, [elenco]);
  const opzioni = useMemo((): OpzioneSelettore[] => {
    const nomi = new Map<string, string>();
    for (const o of catalogo.dati ?? []) nomi.set(o.chiave, o.nome);
    for (const g of elenco ?? []) if (g.catalogo && !nomi.has(g.catalogo.chiave)) nomi.set(g.catalogo.chiave, g.catalogo.nome);
    // l'ordine segue i gruppi: i graditi dalla reazione più alta, poi gli altri a +1 (in elenco o no, insieme per nome), poi la Cartolina
    const ordine = (k: string) => { const r = reazioni.get(k); return k === CARTOLINA ? -1 : r !== undefined && eGradito(r) ? r : 0; };
    return [...nomi].filter(([k]) => !ammessi || ammessi.includes(k))
      .sort(([a, na], [b, nb]) => ordine(b) - ordine(a) || na.localeCompare(nb, 'it'))
      .map(([k, nome]) => ({ chiave: k, nome, gruppo: gruppo(k, reazioni.get(k), nomeConfidente) }));
  }, [catalogo.dati, elenco, reazioni, ammessi, nomeConfidente]);

  const [chiave, setChiave] = useState(oggettoIniziale);
  const [vuoleAcquisto, setVuoleAcquisto] = useState<boolean | null>(null);
  const [offertaScelta, setOffertaScelta] = useState('');
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState('');
  const oggetto = useCarica(() => (chiave ? getOggettoCatalogo(chiave, partita) : Promise.resolve(null)), [chiave, partita]);

  const cartolina = chiave === CARTOLINA;
  const reazione: ReazioneRegalo = cartolina ? REAZIONE_CARTOLINA : reazioni.get(chiave) ?? REAZIONE_FUORI_ELENCO;
  const giaRegalato = chiave !== '' && (sc?.regaliFattiCatalogo ?? []).includes(chiave);
  /** Quante volte è già stato dato a questo Confidente (dalle consegne della partita), per dirlo solo quando sono più di una. */
  const volte = chiave === '' ? 0 : (sc?.consegne ?? []).filter((x) => x.catalogo === chiave).length;
  const copie = oggetto.dati?.partita?.copie;
  const conCopia = (copie?.disponibili ?? 0) > 0;
  const offerte = oggetto.dati?.inVendita ?? [];
  // si propone di segnare comprata solo un'offerta che c'è adesso: una non disponibile farebbe fallire l'azione (409)
  const acquistabili = offerte.filter((o) => o.disponibileOggi !== false);
  const offerta = acquistabili.find((o) => chiaveOfferta(o) === offertaScelta) ?? acquistabili[0];
  // con una copia posseduta il regalo usa quella: l'acquisto si segna solo se lo si chiede
  const segna = (vuoleAcquisto ?? !conCopia) && !!offerta;

  const nonIncontrato = !!sc && sc.rango === 0;
  const cartolinaAlMassimo = cartolina && !!sc && sc.rango >= 10;
  const conPunti = !!sc && sc.rango > 0 && sc.rango < 10 && (sc.puntiNecessari ?? 0) > 0;
  const bonus = bonusArcano ?? sc?.personaArcanoInScorta ?? false;
  // il piazzamento agli esami lo dà la partita (stesso calcolo del server), non una scelta di questa finestra
  const piazzamento = sc?.piazzamentoEsame?.piazzamento ?? null;
  const punti = anteprimaPunti({ confidente, regalo: true, reazioneRegalo: reazione, bonusArcano: bonus, invito, piazzamento });
  const valido = pronto && chiave !== '' && opzioni.some((o) => o.chiave === chiave) && !oggetto.caricamento && !nonIncontrato && !cartolinaAlMassimo;

  const scegli = (k: string) => { setChiave(k); setVuoleAcquisto(null); setOffertaScelta(''); setErrore(''); };
  const regala = async () => {
    if (!valido || occupato) return;
    setOccupato(true); setErrore('');
    try {
      const esito = await regalaOggetto(partita, {
        confidente, catalogo: chiave, bonusArcano: bonus, ...(invito ? { invito } : {}),
        ...(segna && offerta ? { acquisto: { articolo: offerta.articolo, ...(offerta.sedeChiave ? { sede: offerta.sedeChiave } : {}) } } : {}),
      });
      onFatto(esito);
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Regalo non registrato.'); }
    finally { setOccupato(false); }
  };
  const erroreElenco = dettaglio.errore ?? catalogo.errore ?? (stato === undefined ? lettoStato.errore : null);
  const inCaricamento = catalogo.caricamento || (!pronto && !erroreElenco);

  return <Modal aperta titolo={cartolina ? `Spedisci la Cartolina a ${nomeConfidente}` : `Regala a ${nomeConfidente}`} onChiudi={() => { if (!occupato) onChiudi(); }}
    azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="regalo" dimensione={22} />} titolo={occupato ? 'Registrazione…' : cartolina ? 'Spedisci' : 'Regala'} disabled={occupato || !valido} onClick={() => void regala()} /></>}>
    <div className="flex min-w-0 flex-col gap-3">
      {nonIncontrato && <p role="status" className="m-0 testo-13">{nomeConfidente} non è ancora stato incontrato: si regala durante un ritrovo.</p>}
      <Selettore etichetta="Regalo" valore={chiave} opzioni={opzioni} ricerca="sempre" onCambia={scegli}
        disabilitato={occupato || inCaricamento || !pronto || nonIncontrato} segnaposto={inCaricamento ? 'Caricamento dei regali…' : 'Cerca per nome'} />
      {erroreElenco && <p role="alert" className="m-0 testo-13">{erroreElenco}</p>}
      {pronto && chiave !== '' && !nonIncontrato && (
        <p className="m-0 testo-13 text-text-secondary text-pretty" role="status">
          <strong className="text-text tabular-nums">Reazione {testoReazione(reazione)}</strong>
          {conPunti
            ? <> · dà <strong className="text-text tabular-nums">+{formattaPunti(punti)} punti</strong> a {nomeConfidente}{bonus || (piazzamento && piazzamento !== 'altro') || invito ? ' con i moltiplicatori attivi' : ''}.</>
            : <> · al rango attuale di {nomeConfidente} i punti non contano: si registra solo {cartolina ? 'la spedizione' : 'la consegna'}.</>}
        </p>
      )}
      {pronto && cartolina && <p className="m-0 testo-12 text-text-muted text-pretty">{cartolinaAlMassimo ? `${nomeConfidente} è al rango massimo: la Cartolina non si spedisce.` : `${AVVISO_CARTOLINA} Con la pioggia non si spedisce.`}</p>}
      {giaRegalato && !nonIncontrato && <p className="m-0 testo-12 text-text-muted tabular-nums">{cartolina ? 'Già spedita' : 'Già regalato'} a {nomeConfidente} in questa partita{volte > 1 ? ` (${volte} volte)` : ''}: si può {cartolina ? 'rispedire' : 'ridare'}.</p>}
      {chiave !== '' && oggetto.errore && <p role="alert" className="m-0 testo-13">{oggetto.errore}</p>}
      {valido && conCopia && copie && (
        <p className="m-0 testo-12 text-text-muted tabular-nums">{copie.disponibili === 1 ? 'Hai una copia di questo oggetto: il regalo usa quella.' : `Hai ${copie.disponibili} copie di questo oggetto: il regalo ne usa una.`}</p>
      )}
      {valido && !conCopia && offerte.length > 0 && acquistabili.length === 0 && (
        <p className="m-0 testo-12 text-text-muted">Adesso non è in vendita in nessun negozio: potrai segnarlo dai Negozi.</p>
      )}
      {valido && acquistabili.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="touch flex items-center gap-2 testo-13">
            <input type="checkbox" className="h-5 w-5" checked={segna} disabled={occupato} onChange={(e) => setVuoleAcquisto(e.target.checked)} />
            <span>{conCopia ? 'Compra una copia nuova' : 'Segna anche comprato'}</span>
          </label>
          {segna && acquistabili.length > 1 && (
            <Selettore etichetta="Dove l’hai comprato" valore={chiaveOfferta(offerta!)} disabilitato={occupato} ricerca="mai"
              opzioni={acquistabili.map((o) => ({ chiave: chiaveOfferta(o), nome: etichettaOfferta(o) }))} onCambia={setOffertaScelta} />
          )}
          {segna && acquistabili.length === 1 && <span className="testo-12 text-text-muted">{etichettaOfferta(offerta!)}</span>}
          {/* L13 (decisione 18): la frase dice che cosa farà davvero il prezzo; la consegna di prima, tolta e ridata nello stesso momento di gioco,
              aveva il prezzo già nel saldo (`regaliYenGiaNelSaldo`, dal server) */}
          {segna && offerta?.prezzo ? <span className="testo-12 text-text-muted tabular-nums text-pretty">{sc?.regaliYenGiaNelSaldo?.includes(chiave)
            ? `Il prezzo (${formattaYen(offerta.prezzo)}) era già nel saldo: questo regalo era stato dato in questo momento del gioco prima che gli yen si muovessero da soli, e ridandolo non si scala.`
            : `Regalando, ${formattaYen(offerta.prezzo)} si scalano da soli dal saldo della squadra, mai sotto zero (il regalo si registra anche se il saldo non basta); togliendo il regalo tornano.`}</span> : null}
        </div>
      )}
      {errore && <p role="alert" className="m-0 testo-13">{errore}</p>}
    </div>
  </Modal>;
}
