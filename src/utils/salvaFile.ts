// ============================================================
// salvaFile — consegna al browser un file da scaricare
// ============================================================
//
// Era scritta due volte, uguale, in Backup e in Pacchetto di gioco (rilievo R2‴ della verifica completa).
// ============================================================

/** Fa scaricare `blob` con il nome `nome`; l'indirizzo temporaneo si libera poco dopo, a scaricamento avviato. */
export function salvaFile(nome: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
