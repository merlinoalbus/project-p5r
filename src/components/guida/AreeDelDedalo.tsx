// ============================================================
// AreeDelDedalo — un dedalo dei Memento: le sue aree, un'area per volta, con i suoi quattro elementi (099, 2026-10-12)
// ============================================================
//
// Richiesta dell'utente (2026-10-11): aree in ogni dedalo, ogni elemento con uno stato; un'area è completata quando lo sono tutti
// i suoi elementi, il dedalo quando lo sono tutte le sue aree. Richiesta del 2026-10-12: la pagina di prima era «disfunzionale»
// («pulsanti sparsi in vari punti... un'organizzazione visiva poco efficace e confusionaria»); «in ogni memento ci sono diverse
// aree... e per ogni area ci sono 4 elementi: Timbri raccolti..., Persone che puoi incontrare... Richieste e eventi di trama».
// Progetto approvato («Approvo»):
//   - in cima la scheda del dedalo: disegno del dedalo, nome (sul telefono una tendina con tutti i dedali), il conto per elemento
//     («Timbri 3/8 · Richieste 1/5 · Trama 1/4 · Persona 3/18 catturate»), la barra e l'interruttore «Gioca» / «Modifica la
//     guida» (sul telefono nel menu ⋯, con il pozzo);
//   - le aree come schede («Area 2 · 2/6», ✓ se completata), un'area per volta; sul telefono le schede restano in vista
//     scorrendo;
//   - nell'area, in quest'ordine: Timbri (su tutta la larghezza), Persona, Richieste, Trama; Persona a sinistra e
//     Richieste con Trama a destra da 1280 px (fra 1024 e 1279 non c'era posto: una colonna);
//   - in «Gioca» solo i comandi per segnare; in «Modifica la guida» anche riordinare, correggere, aggiungere ed eliminare aree,
//     Richieste, Persona e voci, le Richieste da collocare e le Persona senza area.
// L'area aperta sta nell'indirizzo (`zona`); senza, la prima non completata.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from '../scheda/routerScheda';
import { creaAreaDedalo, eliminaAreaDedalo, aggiornaAreaDedalo, spostaAreaDedalo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import { FilaScorrevole } from '../shared/FilaScorrevole';
import { TestoRipiegabile } from '../shared/TestoRipiegabile';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { SpuntaCompletata, TestoCompletata } from './SpuntaCompletata';
import { ModuloRichiesta } from './ModuloRichiesta';
import { ModuloPersona } from './ModuloPersona';
import { PersoneDellArea } from './PersoneDellArea';
import { ArchivioDelPalazzo } from './ArchivioDelPalazzo';
import { TimbriDellArea } from './TimbriDellArea';
import { ElencoRichieste, DA_COLLOCARE } from './ElencoRichieste';
import { TramaDellArea } from './TramaDellArea';
import { SezioneDellArea } from './SezioneDellArea';
import { urlStratoDedalo } from '../mappe/stratiMemento';
import { contiDelDedalo } from '../../utils/dedali';
import { NEL_CESTINO } from '../../utils/cestino';
import type { AreaDedaloDto, AreaDungeonDto, PuntoInteresseDto, StatoPunto, StatoRichiesta } from '../../types';

type Dedalo = AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> };

interface Props {
  /** Il dedalo (l'area dei Memento) con le sue aree e le sue voci. */
  dedalo: Dedalo;
  /** Tutti i dedali, per la tendina del telefono. */
  dedali: ReadonlyArray<AreaDungeonDto>;
  onScegliDedalo: (chiave: string) => void;
  /** Apre il pozzo dei Memento (sul telefono, dal menu ⋯). */
  onApriPozzo: () => void;
  partitaId: number | null;
  /** «Modifica la guida» acceso. */
  modifica: boolean;
  onModifica: (acceso: boolean) => void;
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  /** I timbri raccolti in un'area sono cambiati (dalla risposta del server). */
  onTimbri: (areaDedalo: string, raccolti: number) => void;
  /** Lo stato di una Richiesta nella partita è cambiato (dalla risposta del server). */
  onRichiesta: (chiave: string, stato: StatoRichiesta | null) => void;
  /** Le Persona registrate nel compendio della partita (id): le catturate (2026-10-12); null senza partita. */
  catturate: ReadonlySet<number> | null;
  /** Registra (o toglie) una Persona nel compendio della partita. */
  onCattura: (personaId: number, catturata: boolean, ombra?: string) => Promise<void>;
  /** Rilegge la scheda (area aggiunta, corretta, spostata o eliminata; Richiesta collocata; voci cambiate). */
  onRicarica: () => Promise<void>;
}

/** L'etichetta della scheda di un'area: nome e, con una partita, «fatti/totale» o la ✓. */
function etichettaArea(a: AreaDedaloDto): string {
  if (a.completata) return a.nome;
  return a.elementi.fatti === null ? `${a.nome} · ${a.elementi.totale}` : `${a.nome} · ${a.elementi.fatti}/${a.elementi.totale}`;
}

/** Il dedalo: scheda in cima, schede delle aree, l'area aperta coi suoi quattro elementi e, in «Modifica la guida», gli attrezzi. */
export function AreeDelDedalo({ dedalo, dedali, onScegliDedalo, onApriPozzo, partitaId, modifica, onModifica, cambiaStato, onPuntoAggiornato, onTimbri, onRichiesta, catturate, onCattura, onRicarica }: Props) {
  const { aree, daCollocare, obiettivi, completato } = dedalo.dedalo;
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState(false);
  const [occupata, setOccupata] = useState<string | null>(null);
  const [nuova, setNuova] = useState<string | null>(null);
  /** La Richiesta aperta nel modulo (`chiave` null = nuova, nell'area `area`), o nessun modulo. */
  const [modulo, setModulo] = useState<{ chiave: string | null; area: string | null } | null>(null);
  /** La Persona senza area aperta nel modulo. */
  const [personaSenzaArea, setPersonaSenzaArea] = useState<PuntoInteresseDto | null>(null);
  const chiesta = params.get('zona');
  const area = aree.find((a) => a.chiave === chiesta) ?? aree.find((a) => a.completata !== true) ?? aree[0] ?? null;
  /** Apre un'area mettendola nell'indirizzo (il dedalo resta). */
  const scegliArea = (k: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('zona', k); return n; }, { replace: true });
  /** Esegue un'operazione tenendo occupata la chiave; l'errore va in notifica. */
  const esegui = async (k: string, fai: () => Promise<unknown>, errore: string) => {
    setOccupata(k);
    try { await fai(); } catch (err) { notifica('error', err instanceof Error ? err.message : errore); } finally { setOccupata(null); }
  };
  const conti = contiDelDedalo(dedalo, catturate);
  const fatti = obiettivi.fatti ?? 0;
  const quota = partitaId && obiettivi.totale > 0 ? fatti / obiettivi.totale : null;
  const elencoAree = aree.map((x) => ({ chiave: x.chiave, nome: x.nome }));
  const senzaArea = dedalo.punti.filter((p) => p.tipo === 'persona' && p.areeDedalo.length === 0);
  /** Il conto di un elemento per la riga della scheda: «fatti/totale» con la partita, il totale senza. */
  const conto = (c: { fatti: number; totale: number }) => (partitaId ? `${c.fatti}/${c.totale}` : `${c.totale}`);

  /** L'interruttore «Gioca» / «Modifica la guida». */
  const interruttore = (
    <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-border" role="group" aria-label="Modalità della pagina">
      <button type="button" className={`touch px-3 text-[12px] ${!modifica ? 'bg-primary/25 font-semibold text-text' : 'text-text-muted hover:text-text'}`} aria-pressed={!modifica} onClick={() => onModifica(false)}>Gioca</button>
      <button type="button" className={`touch border-l border-border px-3 text-[12px] ${modifica ? 'bg-primary/25 font-semibold text-text' : 'text-text-muted hover:text-text'}`} aria-pressed={modifica} onClick={() => onModifica(true)}>Modifica la guida</button>
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col gap-2.5" role="group" aria-label={dedalo.nome}>
      {/* ---- La scheda del dedalo ---- */}
      <section className="card flex flex-col gap-2 p-2.5" aria-label={`Scheda di ${dedalo.nome}`}>
        <div className="flex items-center gap-2.5">
          {/* il pezzo con cui il gioco disegna il dedalo nel pozzo: una miniatura (2026-10-11); sul telefono non c'è posto */}
          <span className="hidden h-[52px] shrink-0 items-center justify-center overflow-hidden rounded bg-[#8d0012] p-0.5 md:flex" style={{ aspectRatio: '936 / 1086' }}>
            <img src={urlStratoDedalo(dedalo.ordine)} alt={`${dedalo.nome}, come lo disegna il gioco`} className="max-h-full max-w-full object-contain" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="m-0 hidden min-w-0 font-display text-[19px] uppercase leading-none md:block">{dedalo.nome}{completato && <>{' '}<SpuntaCompletata dimensione={15} /><TestoCompletata /></>}</h2>
              <span className="min-w-0 flex-1 md:hidden">
                <Selettore compatto etichetta="Dedalo" valore={dedalo.chiave} ricerca="mai"
                  opzioni={dedali.map((x) => ({ chiave: x.chiave, nome: `${x.ordine + 1}. ${x.nome}`, dettaglio: x.dedalo?.completato ? 'completato' : x.dedalo && x.dedalo.obiettivi.fatti !== null && x.dedalo.obiettivi.totale > 0 ? `${Math.round((x.dedalo.obiettivi.fatti / x.dedalo.obiettivi.totale) * 100)}%` : undefined }))}
                  onCambia={onScegliDedalo} />
              </span>
              {quota !== null && <span className="shrink-0 font-display text-[17px] tabular-nums leading-none">{Math.round(quota * 100)}%</span>}
              <span className="hidden md:inline-flex">{interruttore}</span>
              <button type="button" className="btn btn-ghost touch shrink-0 !px-2.5 md:hidden" aria-expanded={menu} aria-label="Altri comandi" onClick={() => setMenu((m) => !m)}>⋯</button>
            </div>
            <span className="text-[12px] tabular-nums text-text-secondary">
              Timbri {conto(conti.timbri)}{conti.timbri.daImpostare > 0 ? ` (${conti.timbri.daImpostare} ${conti.timbri.daImpostare === 1 ? 'area' : 'aree'} senza totale)` : ''} · Richieste {conto(conti.richieste)} · Trama {conto(conti.trama)} · Persona {partitaId ? `${conti.persona.fatti}/${conti.persona.totale} catturate` : conti.persona.totale}
            </span>
            {quota !== null && (
              <span className="visore-mappa__progresso h-1.5" role="progressbar" aria-label={`Elementi di ${dedalo.nome}`} aria-valuemin={0} aria-valuemax={obiettivi.totale} aria-valuenow={fatti}>
                <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round(quota * 100)}%` }} />
              </span>
            )}
          </div>
        </div>
        {/* sul telefono: il menu ⋯ con l'interruttore e il pozzo */}
        {menu && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border-light pt-2 md:hidden">
            {interruttore}
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Pozzo dei Memento" onClick={() => { setMenu(false); onApriPozzo(); }} />
          </div>
        )}
        {/* i dettagli della guida in una piega: lo spazio va all'area */}
        {dedalo.descrizione && (
          <details className="text-[12px]">
            <summary className="touch cursor-pointer text-text-muted">Dettagli del dedalo dalla guida</summary>
            <p className="m-0 whitespace-pre-wrap pt-1 text-text-secondary">{dedalo.descrizione}</p>
          </details>
        )}
        {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare timbri, catture, Richieste e Trama.</span>}
      </section>

      {/* ---- Le schede delle aree: restano in vista scorrendo (sul telefono e sul tablet scorre la pagina, che ha 16 px di
          margine; da 1024 px la colonna del dedalo, che ne ha 8) ---- */}
      {aree.length > 0 && (
        <div className="sticky top-[-16px] z-10 -mx-1 bg-bg-secondary px-1 py-1.5 lg:top-[-8px]">
          {/* da tastiera come vuole il ruolo: Tab entra sulla scheda aperta, frecce, Inizio e Fine passano alle altre */}
          <FilaScorrevole role="tablist" aria-label={`Aree di ${dedalo.nome}`} className="fila-scorrevole--sempre items-center"
            onKeyDown={(e) => {
              const i = aree.findIndex((a) => a.chiave === area?.chiave);
              const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? aree.length - 1 : null;
              if (n === null) return;
              e.preventDefault();
              const k = aree[(n + aree.length) % aree.length].chiave;
              scegliArea(k);
              document.getElementById(`scheda-${k}`)?.focus();
            }}>
            {aree.map((a) => (
              <button key={a.chiave} type="button" role="tab" aria-selected={a.chiave === area?.chiave} tabIndex={a.chiave === area?.chiave ? 0 : -1} id={`scheda-${a.chiave}`} aria-controls={`area-${a.chiave}`}
                className={`chip touch shrink-0 ${a.chiave === area?.chiave ? 'chip--attivo' : ''} ${a.completata ? 'chip--icona' : ''}`} onClick={() => scegliArea(a.chiave)}>
                {a.completata && <SpuntaCompletata />}{etichettaArea(a)}{a.completata && <TestoCompletata />}
              </button>
            ))}
          </FilaScorrevole>
        </div>
      )}
      {aree.length === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">Questo dedalo non ha ancora aree{modifica ? ': aggiungine una qui sotto.' : ': si aggiungono in «Modifica la guida».'}</p>}

      {/* ---- L'area aperta ---- */}
      {area && (
        <div role="tabpanel" id={`area-${area.chiave}`} aria-labelledby={`scheda-${area.chiave}`} className="flex min-w-0 flex-col gap-2.5">
          {(area.descrizione || modifica) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {area.descrizione && <TestoRipiegabile testo={area.descrizione} massimo={140} className="min-w-0 flex-1 basis-60 text-[12px] text-text-secondary" />}
              {modifica && (() => {
                const i = aree.findIndex((x) => x.chiave === area.chiave);
                return <>
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta prima l’area ${area.nome}`} disabled={occupata === area.chiave || i === 0}
                    onClick={() => void esegui(area.chiave, async () => { await spostaAreaDedalo(area.chiave, -1); await onRicarica(); }, 'Spostamento non riuscito.')} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta dopo l’area ${area.nome}`} disabled={occupata === area.chiave || i === aree.length - 1}
                    onClick={() => void esegui(area.chiave, async () => { await spostaAreaDedalo(area.chiave, 1); await onRicarica(); }, 'Spostamento non riuscito.')} />
                  <CorrezioneGuida key={area.chiave} cosa={`l’area «${area.nome}»`} compatto etichetta="Modifica area"
                    iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
                    onSalva={async (b) => { await aggiornaAreaDedalo(area.chiave, { nome: b.nome, descrizione: b.descrizione }); await onRicarica(); }}
                    elimina={{ avviso: `Se ne va per tutte le partite: le sue voci di Trama con quel che ne avevano segnato, e i suoi timbri. Le sue Richieste restano nel dedalo, da collocare; le Persona perdono solo questa area. ${NEL_CESTINO}`, onElimina: async () => { await eliminaAreaDedalo(area.chiave); setParams((p) => { const n = new URLSearchParams(p); n.delete('zona'); return n; }, { replace: true }); await onRicarica(); } }}>
                    {(b, cambia) => <>
                      <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.areaDedalo.nome} onCambia={(v) => cambia({ nome: v })} />
                      <CampoCorrezione etichetta="Dettagli dell’area" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.areaDedalo.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                    </>}
                  </CorrezioneGuida>
                </>;
              })()}
            </div>
          )}
          <TimbriDellArea key={`timbri-${area.chiave}`} area={area} partitaId={partitaId} modifica={modifica} onTimbri={onTimbri} onRicarica={onRicarica} />
          {/* Persona a sinistra, Richieste e Trama a destra (progetto approvato) da 1280 px: fra 1024 e 1279 la colonna del dedalo, accanto
              al menu e al binario, è larga circa 500 px (misurato a 1024×690) e le due colonne vi stavano strette; sotto, una colonna */}
          <div className="grid grid-cols-1 items-start gap-2.5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <PersoneDellArea key={`persone-${area.chiave}`} persone={dedalo.punti.filter((p) => p.tipo === 'persona' && p.areeDedalo.includes(area.chiave))} dedalo={dedalo.chiave}
              areaDedalo={{ chiave: area.chiave, nome: area.nome }} aree={elencoAree} partitaId={partitaId} catturate={catturate} modifica={modifica} onCattura={onCattura} onRicarica={onRicarica} />
            <div className="flex min-w-0 flex-col gap-2.5">
              <SezioneDellArea chiave="richieste" titolo="Richieste" conto={partitaId ? `${area.richieste.filter((r) => r.stato === 'completata').length}/${area.richieste.length}` : String(area.richieste.length)}
                azioni={modifica ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" aria-label={`Aggiungi una Richiesta in ${area.nome}`} onClick={() => setModulo({ chiave: null, area: area.chiave })} /> : undefined}>
                {area.richieste.length === 0
                  ? <p className="m-0 text-[12px] text-text-muted">Nessuna Richiesta in quest’area.</p>
                  : <ElencoRichieste richieste={area.richieste} dedalo={dedalo.chiave} area={area.chiave} aree={elencoAree} partitaId={partitaId} modifica={modifica}
                      onRichiesta={onRichiesta} onModifica={(k) => setModulo({ chiave: k, area: null })} onRicarica={onRicarica} />}
              </SezioneDellArea>
              {(() => {
                const voci = dedalo.punti.filter((p) => p.tipo !== 'persona' && p.areaDedalo === area.chiave);
                return (
                  <SezioneDellArea chiave="trama" titolo="Trama" conto={partitaId ? `${voci.filter((p) => !!p.stato).length}/${voci.length}` : String(voci.length)}>
                    <TramaDellArea dedalo={{ ...dedalo, punti: voci }} areaDedalo={{ chiave: area.chiave, nome: area.nome, altre: elencoAree.filter((x) => x.chiave !== area.chiave) }}
                      partitaId={partitaId} modifica={modifica} cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} />
                  </SezioneDellArea>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* L8 (B7): il Palazzo confluito in questo dedalo (Iweleth): le sue planimetrie come archivio in sola lettura */}
      {dedalo.archivio && <ArchivioDelPalazzo archivio={dedalo.archivio} onSalvato={onRicarica} />}

      {/* ---- Gli attrezzi del dedalo, in «Modifica la guida» ---- */}
      {!modifica && daCollocare.length > 0 && <p className="m-0 text-[11px] text-text-muted">{daCollocare.length === 1 ? '1 Richiesta del dedalo non sta' : `${daCollocare.length} Richieste del dedalo non stanno`} in nessuna area e non {daCollocare.length === 1 ? 'conta' : 'contano'}: si colloca in «Modifica la guida».</p>}
      {modifica && (
        <section className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border-light p-2.5" aria-label={`Attrezzi di ${dedalo.nome}`}>
          {daCollocare.length > 0 && (
            <SezioneDellArea chiave="richieste" titolo="Richieste da collocare" conto={String(daCollocare.length)} nota="non contano finché non stanno in un’area">
              <ElencoRichieste richieste={daCollocare} dedalo={dedalo.chiave} area={DA_COLLOCARE} aree={elencoAree} partitaId={partitaId} modifica
                onRichiesta={onRichiesta} onModifica={(k) => setModulo({ chiave: k, area: null })} onRicarica={onRicarica} />
            </SezioneDellArea>
          )}
          {senzaArea.length > 0 && (
            <SezioneDellArea chiave="persona" titolo="Persona senza area" conto={String(senzaArea.length)} nota="non si vedono in nessuna area: sceglile">
              <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
                {senzaArea.map((p) => (
                  <li key={p.chiave} className="flex flex-wrap items-center gap-2 py-1 text-[13px]">
                    <span className="min-w-0 flex-1">{p.persona?.nomeIt ?? p.nome}{p.persona && p.nome !== p.persona.nomeIt ? <span className="text-text-muted"> ({p.nome})</span> : null}</span>
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica: ${p.persona?.nomeIt ?? p.nome}`} onClick={() => setPersonaSenzaArea(p)} />
                  </li>
                ))}
              </ul>
            </SezioneDellArea>
          )}
          {nuova === null
            ? <div className="flex flex-wrap gap-1.5">
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un’area" onClick={() => setNuova('')} />
                {/* anche in un dedalo senza aree: nasce nel dedalo, e l'area la si sceglie nel modulo (o resta da collocare) */}
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Richiesta" aria-label={`Aggiungi una Richiesta in ${dedalo.nome}`} onClick={() => setModulo({ chiave: null, area: null })} />
              </div>
            : (
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const nome = nuova.trim(); if (!nome) return; void esegui('nuova', async () => { const creata = await creaAreaDedalo(dedalo.chiave, { nome }); setNuova(null); await onRicarica(); scegliArea(creata.chiave); notifica('success', `Area «${nome}» aggiunta a ${dedalo.nome}.`); }, 'Area non aggiunta.'); }}>
                <CampoCorrezione etichetta="Nuova area" valore={nuova} massimo={LIMITI_GUIDA.areaDedalo.nome} onCambia={setNuova} />
                <div className="flex gap-1.5">
                  <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!nuova.trim() || occupata === 'nuova'} />
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuova(null)} />
                </div>
              </form>
            )}
        </section>
      )}
      {/* il modulo della Richiesta: correggerne una, o aggiungerne una nell'area scelta (2026-10-11, «In entrambi i posti») */}
      {modulo && <ModuloRichiesta chiave={modulo.chiave} iniziale={{ dedalo: dedalo.chiave, areaDedalo: modulo.area }} onChiudi={() => setModulo(null)} onCambiata={onRicarica} />}
      {personaSenzaArea && <ModuloPersona voce={personaSenzaArea} dedalo={dedalo.chiave} areaIniziale={aree[0]?.chiave ?? ''} aree={elencoAree} onChiudi={() => setPersonaSenzaArea(null)} onCambiata={onRicarica} />}
    </div>
  );
}
