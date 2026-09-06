from pathlib import Path
p=Path('C:/Repository/project-p5r-main/src/pages/EditorMappaPage.test.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("const versoA: SpilloDto = { ...nota, id: 21, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Luogo A', riferimento: { tipo: 'mappa', chiave: 'luogo-a' } };", "const versoA: SpilloDto = { ...nota, id: 21, tipo: 'passaggio', tipoNome: 'Passaggio', nome: 'Luogo A', riferimento: { tipo: 'mappa', chiave: 'luogo-a' }, dettaglio: {tipo:'mappa',mappa:{chiave:'luogo-a',nome:'Luogo A',tipo:'luogo'},immagine:{url:null,asset:null}} };")
s=s.replace("const creato: SpilloDto = { ...versoA, id: 22, nome: 'Luogo B', riferimento: { tipo: 'mappa', chiave: 'luogo-b' } };", "const creato: SpilloDto = { ...versoA, id: 22, nome: 'Luogo B', riferimento: { tipo: 'mappa', chiave: 'luogo-b' }, dettaglio: {tipo:'mappa',mappa:{chiave:'luogo-b',nome:'Luogo B',tipo:'luogo'},immagine:{url:null,asset:null}} };")
i=s.index("  it('«Nuova mappa»")
s=s[:i]+'''  it.each(['esplicita','invalidata','legacy'] as const)('albero rispetta destinazione %s e precedenza sul riferimento',async(caso)=>{
    const figli=['a','b'].map(k=>riassunto({chiave:`luogo-${k}`,nome:`Luogo ${k.toUpperCase()}`,tipo:'luogo',genitore:base.chiave}));
    const spillo:SpilloDto={...nota,riferimento:{tipo:'mappa',chiave:'luogo-a'},dettaglio:{tipo:'mappa',mappa:{chiave:'luogo-a',nome:'Luogo A',tipo:'luogo'},immagine:{url:null,asset:null}},
      destinazione:caso==='esplicita'?{mappa:'luogo-b',x:20,y:30,zoom:2}:null,destinazioneNonDisponibile:caso==='invalidata'};
    api.getMappa.mockResolvedValue({...base,figli,spilli:[spillo]});monta();
    fireEvent.click(await screen.findByRole('button',{name:'Collegamenti'}));
    const regione=within(await screen.findByRole('region',{name:'Albero delle mappe'}));
    expect(Boolean(regione.queryByRole('button',{name:'Crea passaggio verso Luogo A'}))).toBe(caso!=='legacy');
    expect(Boolean(regione.queryByRole('button',{name:'Crea passaggio verso Luogo B'}))).toBe(caso!=='esplicita');
  });

'''+s[i:]
p.write_text(s,encoding='utf-8')
