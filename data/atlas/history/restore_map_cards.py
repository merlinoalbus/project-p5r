from pathlib import Path
p=Path('C:/Repository/project-p5r-main/src/pages/MappaPage.tsx');s=p.read_text(encoding='utf8')
s=s.replace("import { IconaAzione } from '../components/shared/IconaAzione';","import { IconaAzione } from '../components/shared/IconaAzione';\nimport { NOME_TIPO_MAPPA } from '../../shared/spilli';")
a=s.index('function IndiceMappe()');b=s.index('/** Visore',a)
s=s[:a]+'''function IndiceMappe() {
  useDocumentTitle('Mappe');
  const albero = useCarica(() => getAlberoMappe(), []);
  const mappe = albero.dati ?? [];
  return <div className="flex flex-col gap-4">
    <IntestazionePagina titolo="Mappe" sottotitolo="Luoghi e planimetrie di Tokyo, Palazzi e Dedali." />
    <PageState isLoading={albero.caricamento} error={albero.errore} onRetry={albero.ricarica}>
      <ul className="m-0 p-0 list-none grid gap-3 grid-cols-1 lg:grid-cols-2 items-start" aria-label="Mappe">
        {mappe.filter(m => !m.genitore).map(radice => {
          const figli = mappe.filter(m => m.genitore === radice.chiave);
          const nome = nomePresentazioneMappa(radice);
          return <li key={radice.chiave} className="card min-w-0 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={urlMappa(radice.chiave)} className="font-display text-[20px] no-underline text-text break-words">{nome}</Link>
              <span className="chip text-[11px]">{NOME_TIPO_MAPPA[radice.tipo]}</span>
              <span className="text-[12px] text-text-muted">{radice.numeroSpilli} spilli · {figli.length} mappe</span>
            </div>
            {figli.length > 0 && <details>
              <summary className="touch cursor-pointer py-2 text-[13px] text-text-muted" aria-label={`Mostra le mappe di ${nome}`}>Luoghi e planimetrie ({figli.length})</summary>
              <AlberoLuoghi mappe={mappe} genitore={radice.chiave} espandibile />
            </details>}
          </li>;
        })}
      </ul>
    </PageState>
  </div>;
}

''' + s[b:]
Path('work/MappaPage-restored.tsx').write_text(s,encoding='utf8')
p=Path('C:/Repository/project-p5r-main/src/components/mappe/AlberoLuoghi.tsx');s=p.read_text(encoding='utf8')
s=s.replace('genitore = null }: { mappe: MappaRiassuntoDto[]; genitore?: string | null }','genitore = null, espandibile = false }: { mappe: MappaRiassuntoDto[]; genitore?: string | null; espandibile?: boolean }')
s=s.replace("mappe.find(m => m.chiave === parent)?.nome ?? parent", "(() => { const padre = mappe.find(m => m.chiave === parent); return padre ? nomePresentazioneMappa(padre) : 'luogo'; })()")
s=s.replace('{ramo(m.chiave, new Set([...antenati, m.chiave]))}', '''{espandibile && (figli.get(m.chiave)?.length ?? 0) > 0 ? <details>
        <summary className="touch cursor-pointer py-1 text-[12px] text-text-muted" aria-label={`Mostra le mappe di ${nomePresentazioneMappa(m)}`}>Luoghi e planimetrie ({figli.get(m.chiave)!.length})</summary>
        {ramo(m.chiave, new Set([...antenati, m.chiave]))}
      </details> : ramo(m.chiave, new Set([...antenati, m.chiave]))}''')
Path('work/AlberoLuoghi-restored.tsx').write_text(s,encoding='utf8')
