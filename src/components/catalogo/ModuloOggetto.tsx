import { useId, useState, type FormEvent } from 'react';
import { CATEGORIE_OGGETTO, CATEGORIA_OGGETTO, eCategoriaOggetto, type CategoriaOggetto } from '../../../shared/catalogo';
import type { CatalogoOggettoDto, DatiNuovoOggettoDto } from '../../types';
import { aggiornaOggettoCatalogo, creaOggettoCatalogo } from '../../services/api/catalogoOggetti';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';

interface Props { oggetto?: CatalogoOggettoDto; onChiudi: () => void; onSalvato: (oggetto: CatalogoOggettoDto) => void }

/** Si corregge l'identità, non la copia del listino: qui non esiste un campo prezzo. */
export function ModuloOggetto({ oggetto, onChiudi, onSalvato }: Props) {
  const id = useId();
  const [categoria, setCategoria] = useState<CategoriaOggetto>(oggetto?.categoria ?? 'altro');
  const [nome, setNome] = useState(oggetto?.nome ?? '');
  const [sottocategoria, setSottocategoria] = useState(oggetto?.sottocategoria ?? '');
  const [originale, setOriginale] = useState(oggetto?.nomeOriginale ?? '');
  const [altri, setAltri] = useState(oggetto?.nomiAltri.join('\n') ?? '');
  const [effetto, setEffetto] = useState(oggetto?.effetto ?? '');
  const [descrizione, setDescrizione] = useState(oggetto?.descrizione ?? '');
  const [statistiche, setStatistiche] = useState(typeof oggetto?.statistiche?.testo === 'string' ? oggetto.statistiche.testo : '');
  const [per, setPer] = useState(typeof oggetto?.statistiche?.per === 'string' ? oggetto.statistiche.per : '');
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const equipaggiamento = CATEGORIA_OGGETTO[categoria].gruppo === 'equipaggiamento';
  const salva = async (e: FormEvent) => {
    e.preventDefault();
    if (occupato) return;
    const alias = [...new Set(altri.split('\n').map((n) => n.trim()).filter(Boolean))];
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
  return <Modal aperta larga titolo={oggetto ? `Modifica «${oggetto.nome}»` : 'Nuovo oggetto'} onChiudi={() => { if (!occupato) onChiudi(); }}
    azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button><button type="submit" form={id} className="btn btn-primary touch" disabled={occupato || !nome.trim()}>{occupato ? 'Salvataggio…' : 'Salva'}</button></>}>
    <form id={id} onSubmit={(e) => void salva(e)} className="flex flex-col gap-3">
      {errore && <p role="alert" className="m-0 text-[13px] text-error">{errore}</p>}
      <fieldset disabled={occupato} className="m-0 grid min-w-0 grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2">
        <label className="editor-mappa__campo sm:col-span-2">Nome<input className="form-input" value={nome} required maxLength={300} onChange={(e) => setNome(e.target.value)} /></label>
        <Selettore etichetta="Categoria" valore={categoria} disabilitato={occupato} opzioni={CATEGORIE_OGGETTO.map((k) => ({ chiave: k, nome: CATEGORIA_OGGETTO[k].nome }))} onCambia={(v) => { if (eCategoriaOggetto(v)) setCategoria(v); }} />
        <label className="editor-mappa__campo">Sottocategoria<input className="form-input" value={sottocategoria} maxLength={100} onChange={(e) => setSottocategoria(e.target.value)} /></label>
        <label className="editor-mappa__campo sm:col-span-2">Nome originale<input className="form-input" value={originale} maxLength={300} onChange={(e) => setOriginale(e.target.value)} /></label>
        <label className="editor-mappa__campo sm:col-span-2">Altri nomi, uno per riga<textarea className="form-input" rows={3} value={altri} onChange={(e) => setAltri(e.target.value)} /></label>
        <label className="editor-mappa__campo sm:col-span-2">Che cosa fa<textarea className="form-input" rows={3} maxLength={6000} value={effetto} onChange={(e) => setEffetto(e.target.value)} /></label>
        <label className="editor-mappa__campo sm:col-span-2">Descrizione<textarea className="form-input" rows={4} maxLength={20000} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} /></label>
        {equipaggiamento && <>
          <label className="editor-mappa__campo">Per chi<input className="form-input" value={per} maxLength={300} onChange={(e) => setPer(e.target.value)} /></label>
          <label className="editor-mappa__campo">Statistiche<input className="form-input" value={statistiche} maxLength={2000} onChange={(e) => setStatistiche(e.target.value)} /></label>
        </>}
      </fieldset>
      <p className="m-0 text-[12px] text-text-muted">Il prezzo e la disponibilità si modificano nel negozio. Rinominare l’oggetto non cambia la sua chiave né i progressi già registrati.</p>
    </form>
  </Modal>;
}
