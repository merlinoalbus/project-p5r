import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIA_OGGETTO, normalizzaNomeOggetto } from '../../../shared/catalogo';
import type { CatalogoOggettoDto, PropostaAbbinamentoDto, RiferimentoOggettoDto, TipoPropostaOggetto } from '../../types';
import { useCarica } from '../../hooks/useCarica';
import { confermaAbbinamentoOggetto, getProposteOggetti, impostaLegameOggetto, scartaAbbinamentoOggetto } from '../../services/api/catalogoOggetti';
import { notifica } from '../../stores/notificationStore';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Modal } from '../shared/Modal';
import { Spinner } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { SceltaCatalogoOggetto } from './SceltaCatalogoOggetto';
import { CostoDellOggetto } from './CostoDellOggetto';
import { OggettiCollegati } from './OggettiCollegati';

const NOME_TIPO: Record<TipoPropostaOggetto, string> = { articolo: 'Listini e scambi', regalo: 'Regali', voce: 'Contenuti delle voci', ricompensa: 'Ricompense', ricetta: 'Materiali delle ricette', catalogo: 'Fusioni del catalogo' };
const CERTEZZA = { certa: 'Abbinamento certo, da confermare', probabile: 'Abbinamento probabile', 'da-verificare': 'Da verificare' } as const;
const gruppoDi = (p: PropostaAbbinamentoDto) => JSON.stringify([p.rigaTipo, p.rigaChiave, p.gruppo]);
const chiaveDi = (p: PropostaAbbinamentoDto) => JSON.stringify([p.rigaTipo, p.rigaChiave, p.gruppo, p.catalogo?.chiave ?? null]);
interface Props { onCambiato?: () => void | Promise<void> }

/** Stessa sezione nel catalogo e nelle Impostazioni, visibile soltanto con proposte pendenti. */
export function AbbinamentiDaApprovare({ onCambiato }: Props) {
  const dati = useCarica(() => getProposteOggetti(), []);
  if (dati.caricamento && !dati.dati) return <div className="flex items-center gap-2 text-[13px]" role="status"><Spinner size={16} />Caricamento delle proposte…</div>;
  if (dati.errore) return <div className="flex flex-wrap items-center gap-2 text-[13px]" role="alert"><span>{dati.errore}</span><button type="button" className="btn btn-secondary touch" onClick={() => void dati.ricarica()}>Riprova le proposte</button></div>;
  return dati.dati ? <ElencoAbbinamenti proposte={dati.dati} titolo="Da approvare" onCambiato={async () => { await dati.ricarica(); await onCambiato?.(); }} /> : null;
}

/** Le proposte sono già nel DTO della voce: nessuna richiesta per ogni riga della guida. */
export function AbbinamentiDellaVoce({ proposte, onCambiato }: Props & { proposte: readonly PropostaAbbinamentoDto[] }) {
  return <ElencoAbbinamenti proposte={proposte} titolo="Contenuto: proposta" onCambiato={onCambiato} />;
}

interface Conferma { proposta: PropostaAbbinamentoDto; oggetto: RiferimentoOggettoDto | null; scarta: boolean }
function ElencoAbbinamenti({ proposte, titolo, onCambiato }: Props & { proposte: readonly PropostaAbbinamentoDto[]; titolo: string }) {
  const [aperto, setAperto] = useState(false);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [alternativa, setAlternativa] = useState<string | null>(null);
  const [scelta, setScelta] = useState<CatalogoOggettoDto | null>(null);
  const [conferma, setConferma] = useState<Conferma | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [quantitaMateriale, setQuantitaMateriale] = useState('');
  const richiedeQuantita = !!conferma && !conferma.scarta && ['ricetta', 'voce'].includes(conferma.proposta.rigaTipo) && conferma.proposta.quantita === null;
  const quantitaValida = /^\d+$/.test(quantitaMateriale) && Number.isSafeInteger(Number(quantitaMateriale)) && Number(quantitaMateriale) > 0 && Number(quantitaMateriale) <= 999999;
  const [gestite, setGestite] = useState<{ fonte: readonly PropostaAbbinamentoDto[]; chiavi: Set<string> }>({ fonte: proposte, chiavi: new Set() });
  // Una nuova lettura del server è autorevole, anche dopo il ripristino di una fusione dal cestino.
  const pendenti = useMemo(() => proposte.filter((p) => p.stato === 'da-approvare' && !(gestite.fonte === proposte && gestite.chiavi.has(chiaveDi(p)))), [proposte, gestite]);
  const tipi = [...new Set(pendenti.map((p) => p.rigaTipo))];
  const tipoAttivo = tipi.some((t) => t === tipo) ? tipo : '';
  const alternativePerGruppo = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of pendenti) n.set(gruppoDi(p), (n.get(gruppoDi(p)) ?? 0) + 1);
    return n;
  }, [pendenti]);
  const gruppi = useMemo(() => {
    const cerca = normalizzaNomeOggetto(q);
    const out = new Map<TipoPropostaOggetto, PropostaAbbinamentoDto[]>();
    for (const p of pendenti) {
      if (tipoAttivo && p.rigaTipo !== tipoAttivo) continue;
      if (cerca && !normalizzaNomeOggetto(`${p.rigaNome} ${p.testoAttuale} ${p.catalogo?.nome ?? ''} ${p.motivo} ${p.nota ?? ''} ${p.modifica?.nomeOfferta ?? ''} ${p.modifica?.notaOfferta ?? ''} ${p.modifica?.ricevuti?.map((r) => r.nome).join(' ') ?? ''}`).includes(cerca)) continue;
      const v = out.get(p.rigaTipo) ?? []; v.push(p); out.set(p.rigaTipo, v);
    }
    return [...out];
  }, [pendenti, q, tipoAttivo]);
  const esegui = async () => {
    if (!conferma || occupato) return;
    const { proposta: p, oggetto, scarta } = conferma;
    if (!scarta && (!oggetto || (richiedeQuantita && !quantitaValida))) return;
    const corpo = { riga_tipo: p.rigaTipo, riga_chiave: p.rigaChiave, gruppo: p.gruppo, catalogo_chiave: p.catalogo?.chiave ?? null };
    setOccupato(true); setErrore(null);
    try {
      if (scarta) await scartaAbbinamentoOggetto(corpo);
      else if (oggetto!.chiave === p.catalogo?.chiave && !richiedeQuantita) await confermaAbbinamentoOggetto(corpo);
      else {
        // La quantità della proposta (anche null per la resa ignota di una ricetta) resta al server.
        await impostaLegameOggetto({ ...corpo, catalogo_chiave: oggetto!.chiave, proposta_catalogo_chiave: p.catalogo?.chiave ?? null,
          ...(richiedeQuantita ? { quantita: Number(quantitaMateriale) } : {}) });
      }
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Proposta non aggiornata.'); setOccupato(false); return;
    }
    // Confermare risolve soltanto le alternative dello stesso contenuto, non gli altri gruppi della voce.
    setGestite((prima) => ({ fonte: proposte, chiavi: new Set([...(prima.fonte === proposte ? prima.chiavi : []), ...pendenti.filter((x) => scarta ? chiaveDi(x) === chiaveDi(p) : gruppoDi(x) === gruppoDi(p)).map(chiaveDi)]) }));
    setConferma(null); setAlternativa(null); setScelta(null);
    notifica('success', scarta ? 'Proposta scartata: i dati originali restano invariati.' : p.rigaTipo === 'catalogo' ? 'Oggetti uniti. Puoi annullare la fusione dal Cestino.' : 'Proposta applicata.');
    try { await onCambiato?.(); }
    catch { notifica('warning', 'Operazione salvata. Ricarica la vista per leggere i dati aggiornati.'); }
    finally { setOccupato(false); }
  };
  if (!pendenti.length && !conferma) return null;
  return <section className="flex min-w-0 flex-col gap-3" aria-label={titolo}>
    <button type="button" className="chip touch self-start" disabled={occupato} aria-expanded={aperto} onClick={() => setAperto((v) => !v)}>{titolo} · {pendenti.length}</button>
    {aperto && <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 text-[13px] text-text-secondary">Ogni gesto riguarda una sola proposta. Confermare un contenuto non modifica il testo della guida né segna la voce come raccolta. Scartare conserva i dati attuali. Se la fonte è cambiata, la conferma si ferma: scarta la proposta e usa i comandi di collegamento nella fonte per una correzione manuale. «Scegli un altro oggetto» resta una conferma della proposta e applica lo stesso controllo.</p>
      {(pendenti.length > 1 || q || tipo) && <div className="flex min-w-0 flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-64"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca una voce, un oggetto o un motivo…" /></div>
        <Selettore etichetta="Tipo di proposta" valore={tipoAttivo} vuoto="Tutti" opzioni={tipi.map((k) => ({ chiave: k, nome: NOME_TIPO[k] }))} onCambia={setTipo} />
      </div>}
      {gruppi.map(([t, righe]) => <div key={t} className="flex min-w-0 flex-col gap-2">
        <h3 className="m-0 text-[15px] font-semibold">{NOME_TIPO[t]}</h3>
        {righe.map((p) => {
          const k = chiaveDi(p);
          const altro = alternativa === k;
          const oggetto = altro && scelta ? scelta : p.catalogo;
          const fusione = p.rigaTipo === 'catalogo';
          const nascondi = p.modifica?.azione === 'nascondi';
          const alternative = alternativePerGruppo.get(gruppoDi(p)) ?? 1;
          return <article key={k} className="card flex min-w-0 flex-col gap-2">
            <h4 className="m-0 break-words text-[14px] font-semibold">{p.rigaNome}</h4>
            <span className="text-[12px] text-text-muted">{CERTEZZA[p.certezza]}</span>
            {alternative > 1 && <span className="text-[12px] text-text-muted">Una delle {alternative} alternative per questo contenuto</span>}
            <details><summary className="touch text-[13px]">Testo e dati attuali</summary><p className="m-0 whitespace-pre-wrap break-words text-[13px]">{p.testoAttuale || 'Nessun testo aggiuntivo.'}</p></details>
            <p className="m-0 break-words text-[13px]">{fusione ? 'Unisci in: ' : nascondi ? 'Oggetto dell’offerta da nascondere: ' : p.modifica?.ruolo === 'costo' || p.modifica?.ricevuti ? 'Oggetto da cedere: ' : 'Oggetto proposto: '}
              {oggetto ? <Link className="touch inline-flex max-w-full items-center font-semibold" to={oggetto.casa}>{oggetto.nome}</Link> : <span>Nessun candidato: scegli l’oggetto da collegare.</span>}
              {!altro && p.categoria && <span className="text-text-muted"> · {CATEGORIA_OGGETTO[p.categoria].nome}</span>}
            </p>
            <EffettiDellaProposta proposta={p} />
            <p className="m-0 whitespace-pre-wrap break-words text-[13px]">{p.motivo}</p>
            {p.nota && <p className="m-0 whitespace-pre-wrap break-words text-[12px] text-text-secondary">{p.nota}</p>}
            {altro && p.modifica?.ricevuti === undefined && <SceltaCatalogoOggetto valore={scelta?.chiave ?? ''} disabilitato={occupato} escludi={fusione ? [p.rigaChiave] : undefined}
              etichetta="Scegli l’oggetto corretto" onScegli={setScelta} />}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`btn touch ${fusione ? 'btn-danger' : 'btn-primary'}`} disabled={occupato || !oggetto || (altro && !scelta)}
                onClick={() => { setErrore(null); setQuantitaMateriale(''); setConferma({ proposta: p, oggetto, scarta: false }); }}>{fusione ? 'Unisci gli oggetti…' : nascondi ? 'Conferma nascondimento…' : 'Conferma…'}</button>
              {!nascondi && p.modifica?.ricevuti === undefined && <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => { setAlternativa(altro ? null : k); setScelta(null); }}>{altro ? 'Annulla la scelta' : 'Scegli un altro oggetto'}</button>}
              <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => { setErrore(null); setConferma({ proposta: p, oggetto: p.catalogo, scarta: true }); }}>Scarta…</button>
            </div>
          </article>;
        })}
      </div>)}
      {!gruppi.length && <p role="status" className="m-0 text-[13px]">Nessuna proposta con questi filtri.</p>}
    </div>}
    {conferma && <Modal aperta larga titolo={conferma.scarta ? 'Scarta la proposta' : conferma.proposta.rigaTipo === 'catalogo' ? 'Conferma la fusione' : 'Conferma la modifica'} onChiudi={() => { if (!occupato) setConferma(null); }}
      azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => setConferma(null)}>Annulla</button><button type="button" className="btn btn-primary touch" disabled={occupato || (richiedeQuantita && !quantitaValida)} onClick={() => void esegui()}>{occupato ? 'Salvataggio…' : conferma.scarta ? 'Scarta proposta' : 'Conferma'}</button></>}>
      <div className="flex min-w-0 flex-col gap-3 text-[13px]">
        {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
        <p className="m-0 break-words"><strong>{conferma.proposta.rigaNome}</strong></p>
        {conferma.scarta ? <p className="m-0">Scarti questa proposta, non le altre alternative. Il testo e i collegamenti attuali non cambiano.</p>
          : <><p className="m-0 break-words">{conferma.proposta.rigaTipo === 'catalogo' ? 'Destinazione della fusione' : 'Oggetto scelto'}: <strong>{conferma.oggetto?.nome}</strong></p>
            <EffettiDellaProposta proposta={conferma.proposta} />
            {richiedeQuantita && <label className="flex flex-col gap-1">Quantità da collegare<input className="input touch" type="number" min={1} max={999999} step={1} value={quantitaMateriale} onChange={(e) => setQuantitaMateriale(e.target.value)} /><span className="text-text-secondary">La fonte non la indica: serve una quantità verificata per collegare l’oggetto.</span></label>}
            {conferma.proposta.rigaTipo === 'catalogo' && <p className="m-0 text-warning">I collegamenti passano all’oggetto scelto e l’identità di origine viene rimossa. La fusione si può annullare dal Cestino nelle Impostazioni; nessuna fusione avviene aprendo questa finestra.</p>}
            <p className="m-0">Le altre alternative dello stesso gruppo saranno scartate. {conferma.proposta.rigaTipo === 'catalogo'
              ? 'La fusione trasferisce i riferimenti dell’identità di origine; non segna raccolte, acquisti o letture.'
              : 'Gli altri gruppi, il testo originale e l’avanzamento restano invariati.'}</p>
          </>}
      </div>
    </Modal>}
  </section>;
}

function EffettiDellaProposta({ proposta: p }: { proposta: PropostaAbbinamentoDto }) {
  const quantita = ['voce', 'ricompensa', 'ricetta'].includes(p.rigaTipo) || p.modifica?.ruolo === 'costo';
  return <div className="flex flex-col gap-1 text-[13px]">
    {quantita && <span>{p.quantita === null ? 'Quantità non indicata dalla guida' : `Quantità: ${p.quantita}`}</span>}
    {p.modifica?.azione === 'nascondi' && <span className="text-warning">Questa conferma nasconde l’offerta; non elimina l’oggetto del catalogo.</span>}
    {p.modifica?.azione === 'crea' && <span>Questa conferma aggiunge l’offerta al listino.</span>}
    {p.modifica?.nomeOfferta && <strong>{p.modifica.nomeOfferta}</strong>}
    {p.modifica?.costo && <CostoDellOggetto costo={p.modifica.costo} prezzo={null} />}
    {p.modifica?.ricevuti && <><span>Risultati collegati del baratto (eventuali alternative sono indicate nella nota):</span><OggettiCollegati oggetti={p.modifica.ricevuti} /></>}
    {p.modifica?.notaOfferta && <p className="m-0 whitespace-pre-line">{p.modifica.notaOfferta}</p>}
    {p.modifica?.prezzo !== undefined && <span>Prezzo proposto: {p.modifica.prezzo.toLocaleString('it-IT')} ¥</span>}
    {p.modifica?.condizioniTesto && <span>Condizioni proposte: {p.modifica.condizioniTesto.length ? p.modifica.condizioniTesto.join(' · ') : 'Nessuna condizione'}</span>}
  </div>;
}
