import { useState } from 'react';
import { CATEGORIE_OGGETTO, CATEGORIA_OGGETTO, eCategoriaOggetto, type CategoriaOggetto } from '../../../shared/catalogo';
import type { CatalogoOggettoDto, DatiNuovoOggettoDto } from '../../types';
import { aggiornaOggettoCatalogo, creaOggettoCatalogo } from '../../services/api/catalogoOggetti';
import { Selettore } from '../shared/Selettore';
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { CampoElenco } from '../guida/moduli/campi';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props { oggetto?: CatalogoOggettoDto; onChiudi: () => void; onSalvato: (oggetto: CatalogoOggettoDto) => void }

/** Si corregge l'identità, non la copia del listino: qui non esiste un campo prezzo. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloOggettoReale` esce dal bundle
export const ModuloOggetto: StrumentoDiModifica<typeof ModuloOggettoReale> = IN_RILASCIO ? NienteInRilascio : ModuloOggettoReale;
function ModuloOggettoReale({ oggetto, onChiudi, onSalvato }: Props) {
  const [categoria, setCategoria] = useState<CategoriaOggetto>(oggetto?.categoria ?? 'altro');
  const [nome, setNome] = useState(oggetto?.nome ?? '');
  const [sottocategoria, setSottocategoria] = useState(oggetto?.sottocategoria ?? '');
  const [originale, setOriginale] = useState(oggetto?.nomeOriginale ?? '');
  // gli altri nomi sono un elenco di voci (una riga a campo, «Aggiungi» / «Togli»): niente più testo da separare a capo
  const [altri, setAltri] = useState<string[]>(oggetto?.nomiAltri ?? []);
  const [effetto, setEffetto] = useState(oggetto?.effetto ?? '');
  const [descrizione, setDescrizione] = useState(oggetto?.descrizione ?? '');
  const [statistiche, setStatistiche] = useState(typeof oggetto?.statistiche?.testo === 'string' ? oggetto.statistiche.testo : '');
  const [per, setPer] = useState(typeof oggetto?.statistiche?.per === 'string' ? oggetto.statistiche.per : '');
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  // i campi com'erano all'apertura: se sono cambiati e non salvati la bozza è sporca (per «Aggiorna» e la chiusura della scheda del browser)
  const statoModulo = JSON.stringify({ categoria, nome, sottocategoria, originale, altri, effetto, descrizione, statistiche, per });
  const [statoIniziale] = useState(statoModulo);
  useBozzaSporca('modulo-oggetto', oggetto ? `modifica di «${oggetto.nome}»` : 'nuovo oggetto', statoModulo !== statoIniziale);
  const equipaggiamento = CATEGORIA_OGGETTO[categoria].gruppo === 'equipaggiamento';
  const salva = async () => {
    if (occupato) return;
    const alias = [...new Set(altri.map((n) => n.trim()).filter(Boolean))];
    const campi: DatiNuovoOggettoDto = { categoria, nome: nome.trim(), sottocategoria: sottocategoria.trim() || null,
      nomeOriginale: originale.trim() || null, nomiAltri: alias, effetto: effetto.trim(), descrizione: descrizione.trim() };
    // Non si riscrivono effetti strutturati/sessioni della lettura né altri attributi non editati.
    if (equipaggiamento && (statistiche !== (oggetto?.statistiche?.testo ?? '') || per !== (oggetto?.statistiche?.per ?? ''))) {
      campi.statistiche = { ...oggetto?.statistiche, testo: statistiche.trim() || null, per: per.trim() || null };
    }
    const patch = oggetto ? Object.fromEntries(Object.entries(campi).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(oggetto[k as keyof CatalogoOggettoDto]))) as Partial<DatiNuovoOggettoDto> : campi;
    if (oggetto && !Object.keys(patch).length) { onChiudi(); return; }
    setOccupato(true); setErrore(null);
    try { onSalvato(oggetto ? await aggiornaOggettoCatalogo(oggetto.chiave, patch) : await creaOggettoCatalogo(campi)); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Oggetto non salvato.'); }
    finally { setOccupato(false); }
  };
  return <FinestraModifica titolo={oggetto ? `Modifica «${oggetto.nome}»` : 'Nuovo oggetto'} onChiudi={onChiudi} onSalva={salva} titoloSalva={occupato ? 'Salvataggio…' : 'Salva'}
    salvabile={!!nome.trim()} occupato={occupato} sporca={statoModulo !== statoIniziale}>
    {errore && <p role="alert" className="m-0 testo-13 text-error-testo">{errore}</p>}
    <SezioneCampi titolo="L’oggetto">
      <CampoTesto etichetta="Nome" obbligatorio largo valore={nome} massimo={300} onCambia={setNome} disabilitato={occupato} />
      <Selettore etichettaSopra etichetta="Categoria" valore={categoria} disabilitato={occupato} opzioni={CATEGORIE_OGGETTO.map((k) => ({ chiave: k, nome: CATEGORIA_OGGETTO[k].nome }))} onCambia={(v) => { if (eCategoriaOggetto(v)) setCategoria(v); }} />
      <CampoTesto etichetta="Sottocategoria" valore={sottocategoria} massimo={100} onCambia={setSottocategoria} disabilitato={occupato} />
      <CampoTesto etichetta="Nome originale" largo valore={originale} massimo={300} onCambia={setOriginale} disabilitato={occupato} />
      <CampoElenco etichetta="Altri nomi" voci={altri} lungo={false} max={300} onCambia={setAltri} disabilitato={occupato} />
    </SezioneCampi>
    <SezioneCampi titolo="Che cosa è e che cosa fa">
      <CampoTesto etichetta="Che cosa fa" tipo="lungo" righe={3} valore={effetto} massimo={6000} onCambia={setEffetto} disabilitato={occupato} />
      <CampoTesto etichetta="Descrizione" tipo="lungo" righe={4} valore={descrizione} massimo={20000} onCambia={setDescrizione} disabilitato={occupato} />
      {equipaggiamento && <>
        <CampoTesto etichetta="Per chi" valore={per} massimo={300} onCambia={setPer} disabilitato={occupato} />
        <CampoTesto etichetta="Statistiche" valore={statistiche} massimo={2000} onCambia={setStatistiche} disabilitato={occupato} />
      </>}
    </SezioneCampi>
    <p className="m-0 testo-12 text-text-muted">Il prezzo e la disponibilità si modificano nel negozio. Rinominare l’oggetto non cambia la sua chiave né i progressi già registrati.</p>
  </FinestraModifica>;
}
