// ============================================================
// reteInterna — gli indirizzi IP che uno scarico chiesto dall'utente non deve raggiungere (L9-02, SSRF)
// ============================================================
//
// «Scarica da URL» fa fare al server una richiesta verso un indirizzo scelto da chi usa l'app. Senza filtro, un indirizzo come
// `http://127.0.0.1:3101/…`, `http://169.254.169.254/…` (i metadati di un cloud), un nome che risolve nella rete di Docker o il NAS di
// casa diventano raggiungibili attraverso il server. Qui sta l'elenco dei blocchi vietati, IPv4 e IPv6, dai registri degli indirizzi a uso
// speciale dell'IANA: si controlla l'indirizzo VERO a cui ci si connette, dopo la risoluzione DNS (`scaricaDaUrl.ts`), mai il nome.
//
// Le forme IPv6 che contengono un IPv4 (`::ffff:a.b.c.d`, `::a.b.c.d`, NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, Teredo `2001::/32`) sono
// vietate per intero: un nome pubblico non le restituisce, e controllarne solo la parte IPv4 lascerebbe strade di traverso.
// ============================================================

import { BlockList, isIP } from 'node:net';

/**
 * Due elenchi separati, uno per famiglia. Con un elenco solo, `BlockList` confronta un indirizzo IPv4 anche con le regole IPv6, e la regola
 * `::ffff:0:0/96` (IPv4 mappato) copre allora ogni indirizzo IPv4, pubblici compresi: misurato, `8.8.8.8` risultava vietato.
 */
const VIETATI_IPV4 = new BlockList();
const VIETATI_IPV6 = new BlockList();

/** [rete, prefisso, che cosa è] per IPv4. */
const BLOCCHI_IPV4: ReadonlyArray<readonly [string, number, string]> = [
  ['0.0.0.0', 8, 'questa rete'],
  ['10.0.0.0', 8, 'rete privata'],
  ['100.64.0.0', 10, 'rete condivisa del gestore (CGNAT)'],
  ['127.0.0.0', 8, 'loopback'],
  ['169.254.0.0', 16, 'link-local (compresi i metadati del cloud, 169.254.169.254)'],
  ['172.16.0.0', 12, 'rete privata (compresa la rete di Docker)'],
  ['192.0.0.0', 24, 'assegnazioni di protocollo IETF'],
  ['192.0.2.0', 24, 'documentazione'],
  ['192.88.99.0', 24, 'relay 6to4'],
  ['192.168.0.0', 16, 'rete privata'],
  ['198.18.0.0', 15, 'prove di prestazione'],
  ['198.51.100.0', 24, 'documentazione'],
  ['203.0.113.0', 24, 'documentazione'],
  ['224.0.0.0', 4, 'multicast'],
  ['240.0.0.0', 4, 'riservata (con il broadcast 255.255.255.255)'],
];

/** [rete, prefisso, che cosa è] per IPv6. */
const BLOCCHI_IPV6: ReadonlyArray<readonly [string, number, string]> = [
  ['::', 96, 'non specificato, loopback e IPv4 compatibile'],
  ['::ffff:0:0', 96, 'IPv4 mappato in IPv6'],
  ['64:ff9b::', 96, 'NAT64'],
  ['64:ff9b:1::', 48, 'NAT64 locale'],
  ['100::', 64, 'scarto'],
  ['2001::', 23, 'assegnazioni di protocollo IETF (compreso Teredo)'],
  ['2001:db8::', 32, 'documentazione'],
  ['2002::', 16, '6to4'],
  ['fc00::', 7, 'rete locale unica (compresi i metadati del cloud in IPv6)'],
  ['fe80::', 10, 'link-local'],
  ['fec0::', 10, 'site-local'],
  ['ff00::', 8, 'multicast'],
];

for (const [rete, prefisso] of BLOCCHI_IPV4) VIETATI_IPV4.addSubnet(rete, prefisso, 'ipv4');
for (const [rete, prefisso] of BLOCCHI_IPV6) VIETATI_IPV6.addSubnet(rete, prefisso, 'ipv6');

/**
 * Vero se `ip` (un indirizzo IPv4 o IPv6 letterale, anche fra parentesi quadre come in un URL) è in un blocco vietato. Un testo che non è
 * un indirizzo IP vale come vietato: chi chiama passa solo indirizzi già risolti, e nel dubbio non ci si connette.
 */
export function indirizzoInterno(ip: string): boolean {
  const nudo = ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip;
  // la zona di un indirizzo IPv6 link-local (`fe80::1%eth0`) non fa parte dell'indirizzo
  const senzaZona = nudo.includes('%') ? nudo.slice(0, nudo.indexOf('%')) : nudo;
  const famiglia = isIP(senzaZona);
  if (famiglia === 0) return true;
  return famiglia === 4 ? VIETATI_IPV4.check(senzaZona, 'ipv4') : VIETATI_IPV6.check(senzaZona, 'ipv6');
}
