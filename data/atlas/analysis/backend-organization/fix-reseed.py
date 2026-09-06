from pathlib import Path
p=Path(r'C:/Repository/project-p5r-main/server/services/mappe/mappeService.ts')
s=p.read_text(encoding='utf-8')
s=s.replace("opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente' } = {}", "opz: { sovrascrivi?: boolean; origine?: 'seed' | 'utente'; pacchettiSeed?: readonly EsportazioneMappeDto[] } = {}",1)
needle="    const arrivi: Array<{id:number; valore:DestinazioneSpillo|null|undefined; invalidata:boolean}> = [];"
insert='''    // Uno spostamento conserva l'identità originale, non la mappa corrente.
    // Il fallback richiede una sola sorgente nell'intero seed e un solo erede utente.
    const identitaSpostate = new Set<string>();
    if (origine === 'seed' && !opz.sovrascrivi) {
      const occorrenze = new Map<string, number>();
      for (const pacco of opz.pacchettiSeed ?? [pacchetto]) for (const mappa of pacco.mappe) for (const s of mappa.spilli ?? []) {
        const riferimento = s.riferimento?.tipo === 'mappa' ? { ...s.riferimento, chiave: idMappa(s.riferimento.chiave) } : s.riferimento ?? null;
        const identita = identitaSpillo({ tipo:s.tipo, nome:s.nome, x:Math.min(100,Math.max(0,s.x)), y:Math.min(100,Math.max(0,s.y)), riferimento });
        occorrenze.set(identita, (occorrenze.get(identita) ?? 0) + 1);
      }
      const eredi = prepared("SELECT seed_identita_json FROM spillo WHERE origine='utente' AND seed_identita_json IS NOT NULL GROUP BY seed_identita_json HAVING COUNT(*)=1").all() as Array<{seed_identita_json:string}>;
      for (const r of eredi) if (occorrenze.get(r.seed_identita_json) === 1) identitaSpostate.add(r.seed_identita_json);
    }
'''
assert needle in s
s=s.replace(needle,insert+needle,1)
s=s.replace("if (identitaUtente.has(identitaSpillo({ tipo: s.tipo, nome: s.nome, x, y, riferimento: s.riferimento ?? null }))) continue;", "const identita = identitaSpillo({ tipo: s.tipo, nome: s.nome, x, y, riferimento: s.riferimento ?? null });\n        if (identitaUtente.has(identita) || identitaSpostate.has(identita)) continue;",1)
p.write_text(s,encoding='utf-8')
p=Path(r'C:/Repository/project-p5r-main/server/services/seed/caricaSeed.ts');s=p.read_text(encoding='utf-8')
a="    if (seed.mappeEditor.mappe.length > 0) importaMappe(seed.mappeEditor, { origine: 'seed' });\n    for (const pacchetto of seed.mappeExtra) if (pacchetto.mappe.length > 0) importaMappe(pacchetto, { origine: 'seed' });"
b="    const pacchettiSeed = [seed.mappeEditor, ...seed.mappeExtra];\n    for (const pacchetto of pacchettiSeed) if (pacchetto.mappe.length > 0) importaMappe(pacchetto, { origine: 'seed', pacchettiSeed });"
assert a in s;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
