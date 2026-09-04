// ============================================================
// DungeonDettaglioPage — scheda di un Palazzo/Dedalo: aree, punti di interesse con stato per partita, mappa interattiva (Fase 7.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDungeon, impostaMarcatore, impostaStatoPunto, scaricaPianta, urlImmagine } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { segnaImmaginePresente } from '../components/shared/immaginiCache';
import { IconChevronLeft } from '../components/shared/icons';
import { MappaInterattiva } from '../components/guida/MappaInterattiva';
import { COLORE_TIPO, NOME_TIPO } from '../utils/dungeon';
import type { AreaDungeonDto, PuntoInteresseDto, StatoPunto } from '../types';

const TIPI = Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][];

function Dettagli({ d }: { d: Record<string, unknown> }) {
  const voci = Object.entries(d).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
  if (voci.length === 0) return null;
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
      {voci.map(([k, v]) => (
        <div key={k} className="contents"><dt className="text-text-muted capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt><dd className="m-0">{Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
      ))}
    </dl>
  );
}

export function DungeonDettaglioPage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDungeon(chiave, partitaId ?? undefined), [chiave, partitaId]);
  useDocumentTitle(dati.dati ? dati.dati.nome : 'Dungeon');
  const d = dati.dati;
  const areaChiave = params.get('area') ?? d?.aree[0]?.chiave ?? null;
  const area: AreaDungeonDto | null = useMemo(() => d?.aree.find((a) => a.chiave === areaChiave) ?? d?.aree[0] ?? null, [d, areaChiave]);
  const [filtro, setFiltro] = useState<Set<PuntoInteresseDto['tipo']>>(new Set());
  const [mostraGestiti, setMostraGestiti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [posizionamento, setPosizionamento] = useState(false);
  const [mappaVersione, setMappaVersione] = useState(0);
  // Pianta pubblicata dalla guida ma non ancora nell'istanza: viene scaricata appena l'area è aperta (una richiesta per area)
  const download = useCarica(() => (area && !area.mappa && area.pianta ? scaricaPianta(area.chiave).then((r) => { segnaImmaginePresente('mappa', r.area); return r; }) : Promise.resolve(null)), [area?.chiave, area?.mappa, area?.pianta?.url]);
  const scaricata = !!area && !!download.dati && download.dati.area === area.chiave;
  const mappaPronta = !!area && (area.mappa || mappaVersione > 0 || scaricata);
  // Credito della fonte davvero usata: quella registrata nell'immagine, oppure quella appena scaricata (principale o alternativa)
  const fonteUsata = area?.piantaScaricata ?? (scaricata && download.dati && area?.pianta
    ? { url: download.dati.url, fonte: download.dati.fonte, pagina: download.dati.url === area.pianta.url ? area.pianta.pagina : (area.pianta.alternative.find((x) => x.url === download.dati?.url)?.pagina ?? null) }
    : null);

  const puntiVisibili = useMemo(() => (area?.punti ?? []).filter((p) => (filtro.size === 0 || filtro.has(p.tipo)) && (mostraGestiti || !p.stato)), [area, filtro, mostraGestiti]);
  const gestitiArea = (area?.punti ?? []).filter((p) => p.stato).length;

  const aggiornaPunto = (nuovo: PuntoInteresseDto) => {
    if (!d) return;
    dati.imposta({ ...d, aree: d.aree.map((a) => ({ ...a, punti: a.punti.map((p) => (p.chiave === nuovo.chiave ? nuovo : p)) })) });
  };
  const cambiaStato = async (p: PuntoInteresseDto, stato: StatoPunto | null) => {
    if (!partitaId) return;
    try {
      aggiornaPunto(await impostaStatoPunto(partitaId, p.chiave, stato));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };
  const posiziona = async (puntoChiave: string, x: number, y: number) => {
    const p = area?.punti.find((q) => q.chiave === puntoChiave);
    if (!p) return;
    try {
      const m = await impostaMarcatore(puntoChiave, { x, y });
      aggiornaPunto({ ...p, marcatore: m });
      notifica('success', `Spillo di «${p.nome}» posizionato.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Posizionamento fallito.');
    }
  };
  const rimuoviSpillo = async (p: PuntoInteresseDto) => {
    try {
      await impostaMarcatore(p.chiave, null);
      aggiornaPunto({ ...p, marcatore: null });
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.');
    }
  };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && area && (
        <div className="flex flex-col gap-4">
          <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>
          <div className="card flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="m-0 text-2xl font-bold">{d.nome}</h1>
              {d.sovrano && <span className="chip">{d.sovrano}</span>}
              {d.arcanaSovranoNome && <span className="chip chip--attivo">{d.arcanaSovranoNome}</span>}
              {d.livelloConsigliato && <span className="chip">Livello {d.livelloConsigliato}</span>}
            </div>
            <div className="text-[13px] text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
              {d.date.sblocco && <span><strong className="text-text">Sblocco:</strong> {d.date.sblocco}</span>}
              {d.date.scadenza && <span><strong className="text-text">Scadenza:</strong> {d.date.scadenza}</span>}
              {d.date.furtoConsigliato && <span><strong className="text-text">Furto consigliato:</strong> {d.date.furtoConsigliato}</span>}
              <span>{d.aree.length} aree · {d.punti} punti di interesse · {d.esauribili} esauribili{d.gestiti !== null ? ` · ${d.gestiti} gestiti nella partita` : ''}</span>
            </div>
            {d.note && <p className="m-0 text-[12px] text-text-muted whitespace-pre-wrap">{d.note}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Aree">
            {d.aree.map((a) => (
              <button key={a.chiave} type="button" role="tab" className={`chip touch ${a.chiave === area.chiave ? 'chip--attivo' : ''}`} aria-selected={a.chiave === area.chiave} onClick={() => { setParams({ area: a.chiave }); setSelezionato(null); }} title={a.descrizione}>
                {a.ordine + 1}. {a.nome}{a.mappa ? ' 🗺' : ''}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
            <section className="card flex flex-col gap-2">
              <h2 className="m-0 text-[15px] font-semibold">{area.nome}</h2>
              {area.descrizione && <p className="m-0 text-[13px] text-text-secondary">{area.descrizione}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <ImmagineEntita key={`${area.chiave}-${mappaVersione}-${scaricata ? 's' : 'n'}`} ambito="mappa" chiave={area.chiave} etichetta={`Mappa: ${area.nome}`} dimensione={96} forma="orizzontale" modificabile />
                <span className="text-[12px] text-text-muted flex-1 min-w-[200px]">
                  {fonteUsata ? (
                    <>
                      Pianta scaricata da <a href={fonteUsata.pagina ?? fonteUsata.url} target="_blank" rel="noreferrer" className="text-primary">{fonteUsata.fonte}</a>{area.pianta && fonteUsata.url === area.pianta.url && area.pianta.copertura === 'dungeon' ? ' (pianta dell’intero piano)' : ''}{area.pianta && fonteUsata.url !== area.pianta.url ? ' (fonte alternativa: la principale non era raggiungibile)' : ''}, nella tua istanza. Puoi sostituirla con una tua immagine; gli spilli si spostano in modalità «posiziona».
                    </>
                  ) : area.mappa && !area.pianta ? (
                    <>Immagine della pianta importata da te. Gli spilli si spostano in modalità «posiziona».</>
                  ) : area.mappa ? (
                    <>Immagine della pianta importata da te (la guida <a href={area.pianta!.pagina ?? area.pianta!.url} target="_blank" rel="noreferrer" className="text-primary">{area.pianta!.fonte}</a> ne pubblica una). Gli spilli si spostano in modalità «posiziona».</>
                  ) : area.pianta ? (
                    <>
                      Pianta dalla guida <a href={area.pianta.pagina ?? area.pianta.url} target="_blank" rel="noreferrer" className="text-primary">{area.pianta.fonte}</a>{area.pianta.copertura === 'dungeon' ? ' (pianta dell’intero piano)' : ''}, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}{download.errore ? '. Scaricamento non riuscito: riprova o importa un’immagine tua.' : '.'} Puoi sostituirla con una tua immagine; gli spilli si spostano in modalità «posiziona».
                    </>
                  ) : (
                    <>Nessuna pianta pubblicata per quest’area{area.piantaAssente ? `: ${area.piantaAssente}` : ''}. Puoi importare una tua immagine (file o URL); resta nella tua istanza.</>
                  )}
                </span>
                {download.errore && area.pianta && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void download.ricarica()}>Riprova</button>}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMappaVersione((v) => v + 1)}>Ricarica mappa</button>
              </div>
              {mappaPronta ? (
                <MappaInterattiva
                  key={`${area.chiave}-${mappaVersione}-${scaricata ? download.dati?.byte ?? 0 : 0}`}
                  src={`${urlImmagine('mappa', area.chiave)}?v=${mappaVersione}-${scaricata ? download.dati?.byte ?? 0 : 0}`}
                  punti={area.punti.filter((p) => filtro.size === 0 || filtro.has(p.tipo))}
                  selezionato={selezionato}
                  onSeleziona={setSelezionato}
                  posizionamento={posizionamento}
                  onPosiziona={(k, x, y) => void posiziona(k, x, y)}
                  mostraGestiti={mostraGestiti}
                />
              ) : (
                <p className="m-0 text-[13px] text-text-muted">{download.caricamento ? 'Scaricamento della pianta in corso…' : 'Nessuna mappa per quest’area: l’elenco dei punti resta comunque disponibile.'}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <button type="button" className={`chip touch ${posizionamento ? 'chip--attivo' : ''}`} onClick={() => setPosizionamento((v) => !v)} aria-pressed={posizionamento} disabled={!mappaPronta}>Modalità posiziona spilli</button>
                <button type="button" className={`chip touch ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Mostra anche i gestiti ({gestitiArea})</button>
                {selezionato && <span className="text-text-muted">Selezionato: {area.punti.find((p) => p.chiave === selezionato)?.nome}</span>}
              </div>
            </section>

            <aside className="card flex flex-col gap-2">
              <div className="flex flex-wrap gap-1" aria-label="Filtri per tipo">
                {TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
                  <button key={tp} type="button" className={`chip touch text-[11px] ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />{NOME_TIPO[tp]} ({area.punti.filter((p) => p.tipo === tp).length})
                  </button>
                ))}
                {filtro.size > 0 && <button type="button" className="chip touch text-[11px]" onClick={() => setFiltro(new Set())}>Tutti</button>}
              </div>
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light max-h-[70vh] overflow-y-auto" aria-label={`Punti di interesse di ${area.nome}`}>
                {puntiVisibili.length === 0 && <li className="py-2 text-[13px] text-text-muted">Nessun punto con questi filtri{!mostraGestiti && gestitiArea > 0 ? ` (${gestitiArea} gestiti nascosti)` : ''}.</li>}
                {puntiVisibili.map((p) => (
                  <li key={p.chiave} className={`py-2 flex flex-col gap-1 text-[13px] rounded-md px-1 ${p.chiave === selezionato ? 'bg-primary-bg' : ''} ${p.stato ? 'opacity-60' : ''}`}>
                    <button type="button" className="text-left flex items-start gap-2 touch" onClick={() => setSelezionato(p.chiave === selezionato ? null : p.chiave)} aria-expanded={p.chiave === selezionato}>
                      <span className="mt-1 inline-block w-3 h-3 rounded-full shrink-0" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold">{p.nome}</span>
                        <span className="text-[12px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.esauribile ? ' · esauribile' : ''}{p.marcatore ? ' · 📍' : ''}{p.stato ? ` · ${p.stato}` : ''}</span>
                      </span>
                    </button>
                    {p.chiave === selezionato && (
                      <div className="flex flex-col gap-1.5 pl-5">
                        {p.descrizione && <p className="m-0 text-text-secondary">{p.descrizione}</p>}
                        <Dettagli d={p.dettagli} />
                        {p.fonte && <a href={p.fonte} target="_blank" rel="noreferrer" className="text-[12px] text-primary">fonte</a>}
                        <div className="flex flex-wrap gap-1.5">
                          {partitaId && p.stato !== 'ottenuto' && <button type="button" className="btn btn-primary btn-sm" onClick={() => void cambiaStato(p, 'ottenuto')}>Ottenuto</button>}
                          {partitaId && p.esauribile && p.stato !== 'esaurito' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void cambiaStato(p, 'esaurito')}>Esaurito</button>}
                          {partitaId && p.stato && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void cambiaStato(p, null)}>Riapri</button>}
                          {p.marcatore && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void rimuoviSpillo(p)}>Togli spillo</button>}
                          {!p.marcatore && mappaPronta && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPosizionamento(true)}>Posiziona sulla mappa</button>}
                        </div>
                        {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare i punti ottenuti.</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
          {d.fonti.length > 0 && <p className="m-0 text-[12px] text-text-muted">Fonti: {d.fonti.map((f, i) => <a key={i} href={f} target="_blank" rel="noreferrer" className="text-primary">{new URL(f).hostname}{i < d.fonti.length - 1 ? ', ' : ''}</a>)}</p>}
        </div>
      )}
    </PageState>
  );
}
