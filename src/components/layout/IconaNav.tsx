// ============================================================
// IconaNav — icona di una voce di navigazione: asset predefinito con riserva sull'icona SVG
// ============================================================

import { AssetImg } from '../shared/AssetImg';
import { useAsset } from '../../stores/assetStore';
import type { VoceNav } from './navigazione';

/** Usa `ui/nav-<chiave>-attiva` quando la voce è attiva e l'asset esiste, altrimenti `ui/nav-<chiave>`, altrimenti l'SVG. */
export function IconaNav({ voce, attiva }: { voce: VoceNav; attiva: boolean }) {
  const urlAttiva = useAsset(`${voce.asset}-attiva`);
  const nome = attiva && urlAttiva ? `${voce.asset}-attiva` : voce.asset;
  return <AssetImg nome={nome} alt="" decorativa className="w-5 h-5 object-contain" fallback={voce.icon} />;
}
