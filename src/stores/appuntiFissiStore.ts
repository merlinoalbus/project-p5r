// ============================================================
// appuntiFissiStore — gli appunti fissi del Diario, le loro categorie e lo stato della loro finestra fluttuante (2026-10-31, C7; categorie
// 2026-11-02)
// ============================================================
//
// Richiesta dell'utente: «una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati delle voci che tendono a
// ripetersi nel diario»; «deve essere possibile spostare la finestra di clipboard, ridurla a icona o riportarla a dimensione originaria»; poi
// «voglio poter raggruppare per categorie (chiudibili e apribili) gli Appunti Fissi nonchè riordinarli con click e trascina all'interno di
// gruppi o della lista di Appunti fissi».
//
//   - Appunti e categorie vengono dal server (`/api/appunti-fissi`, dati utente): qui c'è solo la copia a schermo, riletta a ogni apertura
//     della finestra e dopo un rifiuto «non c'è più» (un altro dispositivo). Mai in `localStorage`.
//   - Lo spostamento di un appunto o di una categoria si vede subito (copia a schermo riordinata), poi vale la risposta del server; se il
//     server rifiuta, si rimette la copia di prima e, se qualcosa non c'è più, si rilegge.
//   - Lo stato della finestra (chiusa, aperta, ridotta a icona) e le categorie chiuse si ricordano PER DISPOSITIVO in `localStorage`
//     (`memoriaDispositivo`): senza (finestra privata, dati bloccati) la finestra parte chiusa, le categorie aperte, e funziona lo stesso.
//     Posizione e dimensione le tiene la finestra (`FinestraAppuntiFissi`).
//   - `proposta`: un appunto da aggiungere già pronto (dal menu della voce del Diario, «Salva negli appunti fissi»): la finestra si apre con
//     il modulo d'aggiunta compilato, il titolo proposto si cambia prima di salvare.
// Solo nella preparazione: chi lo usa sta dietro la costante di build del rilascio, e il modulo esce dal bundle.
// ============================================================

import { create } from 'zustand';
import {
  creaAppuntoFisso, creaCategoriaAppunti, eliminaAppuntoFisso, eliminaCategoriaAppunti, getAppuntiFissi, isApiError, modificaAppuntoFisso,
  rinominaCategoriaAppunti, spostaAppuntoFisso, spostaCategoriaAppunti,
} from '../services/api';
import type { AppuntiFissiDto, AppuntoFissoDto, CategoriaAppuntiDto, ModificaAppuntoFisso, NuovoAppuntoFisso } from '../../shared/appuntiFissi';
import { leggiMemoria, leggiMemoriaJson, scriviMemoria, scriviMemoriaJson } from '../utils/memoriaDispositivo';

export type StatoFinestraAppunti = 'chiusa' | 'aperta' | 'ridotta';

const CHIAVE_STATO = 'p5r.appuntiFissi.stato';
const CHIAVE_CHIUSE = 'p5r.appuntiFissi.categorieChiuse';

function leggiStato(): StatoFinestraAppunti {
  const v = leggiMemoria(CHIAVE_STATO);
  return v === 'aperta' || v === 'ridotta' ? v : 'chiusa';
}
/** Ricorda lo stato della finestra; senza memoria del dispositivo la finestra riparte chiusa. */
const scriviStato = (s: StatoFinestraAppunti): void => scriviMemoria(CHIAVE_STATO, s);

/** Le categorie chiuse ricordate sul dispositivo (solo id interi positivi); senza memoria, nessuna: tutte aperte. */
function leggiChiuse(): number[] {
  const v = leggiMemoriaJson(CHIAVE_CHIUSE);
  return Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x) && (x as number) > 0))] : [];
}

/** Gli appunti di un gruppo (`categoriaId` null: la lista senza categoria), nel loro ordine. */
export const appuntiDelGruppo = (elenco: readonly AppuntoFissoDto[], categoriaId: number | null): AppuntoFissoDto[] =>
  elenco.filter((a) => a.categoriaId === categoriaId).sort((x, y) => x.ordine - y.ordine || x.id - y.id);

/** La copia a schermo dopo aver spostato l'appunto `id` nel gruppo `a` al posto `indice` (contato dopo averlo tolto): come fa il server. */
function spostato(elenco: readonly AppuntoFissoDto[], id: number, a: number | null, indice: number): AppuntoFissoDto[] {
  const mosso = elenco.find((x) => x.id === id);
  if (!mosso) return [...elenco];
  const partenza = appuntiDelGruppo(elenco, mosso.categoriaId).filter((x) => x.id !== id);
  const arrivo = a === mosso.categoriaId ? [...partenza] : appuntiDelGruppo(elenco, a);
  arrivo.splice(Math.min(indice, arrivo.length), 0, { ...mosso, categoriaId: a });
  const nuovi = new Map<number, AppuntoFissoDto>();
  partenza.forEach((x, i) => nuovi.set(x.id, { ...x, ordine: i }));
  arrivo.forEach((x, i) => nuovi.set(x.id, { ...x, ordine: i }));
  return elenco.map((x) => nuovi.get(x.id) ?? x);
}

interface StatoAppuntiFissi {
  stato: StatoFinestraAppunti;
  elenco: AppuntoFissoDto[] | null;
  categorie: CategoriaAppuntiDto[] | null;
  caricamento: boolean;
  errore: string | null;
  /** Gli id delle categorie chiuse su questo dispositivo. */
  chiuse: number[];
  /** Un appunto da aggiungere già compilato (dal Diario); `n` cambia a ogni proposta, così il modulo si rimonta anche con lo stesso testo. */
  proposta: (NuovoAppuntoFisso & { n: number }) | null;
  apri: () => void;
  chiudi: () => void;
  /** La chiusura chiesta da fuori (il pulsante della barra superiore): la fa la finestra, che prima chiede delle bozze non salvate. Cambia a ogni richiesta. */
  richiestaChiusura: number;
  chiediChiusura: () => void;
  riduci: () => void;
  /** Apre la finestra con il modulo d'aggiunta compilato. */
  proponi: (p: NuovoAppuntoFisso) => void;
  togliProposta: () => void;
  carica: () => Promise<void>;
  aggiungi: (d: NuovoAppuntoFisso) => Promise<AppuntoFissoDto>;
  modifica: (id: number, d: ModificaAppuntoFisso) => Promise<AppuntoFissoDto>;
  elimina: (id: number) => Promise<void>;
  /** Sposta un appunto nel gruppo `categoriaId` (null: senza categoria) al posto `indice`, contato dopo averlo tolto dal suo. */
  sposta: (id: number, categoriaId: number | null, indice: number) => Promise<void>;
  /** Apre o chiude una categoria (ricordato sul dispositivo); con `aperta` la mette in quello stato. */
  alterna: (categoriaId: number, aperta?: boolean) => void;
  aggiungiCategoria: (nome: string) => Promise<CategoriaAppuntiDto>;
  rinominaCategoria: (id: number, nome: string) => Promise<CategoriaAppuntiDto>;
  eliminaCategoria: (id: number) => Promise<void>;
  spostaCategoria: (id: number, indice: number) => Promise<void>;
}

let progressivo = 0;

// `@__PURE__`: lo store non ha effetti alla creazione, quindi nel bundle di rilascio, dove nessuno lo usa (i suoi utenti stanno dietro la
// costante di build), esce con le chiamate all'API che importa (lo controlla `scripts/verifica-bundle-rilascio.ts`)
export const useAppuntiFissiStore = /* @__PURE__ */ create<StatoAppuntiFissi>((set, get) => {
  const imposta = (stato: StatoFinestraAppunti) => { scriviStato(stato); set({ stato }); };
  const impostaChiuse = (chiuse: number[]) => { scriviMemoriaJson(CHIAVE_CHIUSE, chiuse); set({ chiuse }); };
  /** Dopo un rifiuto perché l'appunto o la categoria non sono più quelli a schermo (un altro dispositivo), si rilegge. */
  const rileggiSeCambiato = (err: unknown) => {
    if (isApiError(err, 'appunto-non-trovato') || isApiError(err, 'categoria-non-trovata')) void get().carica();
  };
  /** La risposta del server con tutto l'elenco: le categorie chiuse che non ci sono più si dimenticano. */
  const metti = (d: AppuntiFissiDto) => {
    set({ elenco: d.appunti, categorie: d.categorie });
    const esistenti = new Set(d.categorie.map((c) => c.id));
    const chiuse = get().chiuse;
    if (chiuse.some((id) => !esistenti.has(id))) impostaChiuse(chiuse.filter((id) => esistenti.has(id)));
  };
  return {
    stato: leggiStato(),
    elenco: null,
    categorie: null,
    caricamento: false,
    errore: null,
    chiuse: leggiChiuse(),
    proposta: null,
    apri: () => imposta('aperta'),
    chiudi: () => { imposta('chiusa'); set({ proposta: null }); },
    richiestaChiusura: 0,
    chiediChiusura: () => set((s) => ({ richiestaChiusura: s.richiestaChiusura + 1 })),
    riduci: () => imposta('ridotta'),
    proponi: (p) => { progressivo += 1; set({ proposta: { ...p, n: progressivo } }); imposta('aperta'); },
    togliProposta: () => set({ proposta: null }),
    carica: async () => {
      set({ caricamento: true, errore: null });
      try {
        metti(await getAppuntiFissi());
        set({ caricamento: false });
      } catch (err) {
        set({ caricamento: false, errore: err instanceof Error && err.message ? err.message : 'Appunti fissi non letti.' });
      }
    },
    aggiungi: async (d) => {
      try {
        const nuovo = await creaAppuntoFisso(d);
        set((s) => ({ elenco: [...(s.elenco ?? []).filter((a) => a.id !== nuovo.id), nuovo] }));
        return nuovo;
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    modifica: async (id, d) => {
      try {
        const agg = await modificaAppuntoFisso(id, d);
        set((s) => {
          const elenco = s.elenco ?? [];
          const prima = elenco.find((a) => a.id === id);
          // cambiando categoria va in fondo al gruppo d'arrivo e quello di partenza si ricompatta, come fa il server (`spostato`)
          const mossi = prima && agg.categoriaId !== prima.categoriaId ? spostato(elenco, id, agg.categoriaId, Number.MAX_SAFE_INTEGER) : elenco;
          return { elenco: mossi.map((a) => (a.id === id ? { ...agg, ordine: a.ordine } : a)) };
        });
        return agg;
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    elimina: async (id) => {
      try {
        await eliminaAppuntoFisso(id);
        set((s) => {
          const via = (s.elenco ?? []).find((a) => a.id === id);
          const resto = (s.elenco ?? []).filter((a) => a.id !== id);
          if (!via) return { elenco: resto };
          const posti = new Map(appuntiDelGruppo(resto, via.categoriaId).map((a, i) => [a.id, i]));
          return { elenco: resto.map((a) => { const p = posti.get(a.id); return p === undefined ? a : { ...a, ordine: p }; }) };
        });
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    sposta: async (id, categoriaId, indice) => {
      const elenco = get().elenco;
      if (!elenco) return;
      set({ elenco: spostato(elenco, id, categoriaId, indice) });
      try {
        metti(await spostaAppuntoFisso(id, { categoriaId, indice }));
      } catch (err) {
        // il server non l'ha fatto: si rimette la copia di prima e, se qualcosa non c'è più, si rilegge
        set({ elenco });
        rileggiSeCambiato(err);
        throw err;
      }
    },
    alterna: (categoriaId, aperta) => {
      const chiuse = get().chiuse;
      const chiusa = chiuse.includes(categoriaId);
      const vuoleChiusa = aperta === undefined ? !chiusa : !aperta;
      if (vuoleChiusa === chiusa) return;
      impostaChiuse(vuoleChiusa ? [...chiuse, categoriaId] : chiuse.filter((x) => x !== categoriaId));
    },
    aggiungiCategoria: async (nome) => {
      const nuova = await creaCategoriaAppunti(nome);
      set((s) => ({ categorie: [...(s.categorie ?? []).filter((c) => c.id !== nuova.id), nuova] }));
      return nuova;
    },
    rinominaCategoria: async (id, nome) => {
      try {
        const agg = await rinominaCategoriaAppunti(id, nome);
        set((s) => ({ categorie: (s.categorie ?? []).map((c) => (c.id === id ? agg : c)) }));
        return agg;
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    eliminaCategoria: async (id) => {
      try {
        metti(await eliminaCategoriaAppunti(id));
      } catch (err) { rileggiSeCambiato(err); throw err; }
    },
    spostaCategoria: async (id, indice) => {
      const categorie = get().categorie;
      if (!categorie) return;
      const resto = categorie.filter((c) => c.id !== id);
      const mossa = categorie.find((c) => c.id === id);
      if (!mossa) return;
      resto.splice(Math.min(indice, resto.length), 0, mossa);
      set({ categorie: resto.map((c, i) => ({ ...c, ordine: i })) });
      try {
        metti(await spostaCategoriaAppunti(id, indice));
      } catch (err) { set({ categorie }); rileggiSeCambiato(err); throw err; }
    },
  };
});
