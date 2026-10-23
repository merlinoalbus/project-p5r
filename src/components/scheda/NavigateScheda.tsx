// ============================================================
// NavigateScheda — il `Navigate` di react-router che, dentro il pannello della scheda, resta nel pannello (R10-27)
// ============================================================

import { useContext, useEffect } from 'react';
import { Navigate as NavigateReale, type NavigateProps } from 'react-router-dom';
import { SchedaCorrenteContext } from './contestoScheda';

/** Il reindirizzamento di una pagina: dentro il pannello sostituisce la scheda mostrata, fuori è il `Navigate` di react-router. */
export function Navigate(props: NavigateProps) {
  const scheda = useContext(SchedaCorrenteContext);
  const naviga = scheda?.naviga;
  const { to, replace, state } = props;
  useEffect(() => {
    if (naviga) naviga(to, { replace, state });
  }, [naviga, to, replace, state]);
  return naviga ? null : <NavigateReale {...props} />;
}
