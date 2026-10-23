// ============================================================
// 164 — collegamento fra gli eventi del calendario e le voci del Diario (L9 R9-20, blocco G)
// ============================================================
//
// Decisione dell'utente del 24/10: i 173 eventi di `evento_calendario` restano eventi del calendario, collegati per chiave alle voci del Diario;
// non diventano voci. La tabella `evento_calendario_voce (evento_id, voce_uid, certezza)` ha chiave primaria sui due campi e chiavi esterne verso
// `evento_calendario(id)` e `voce_giornata(uid)` (cancellando l'uno o l'altra il collegamento sparisce, mai il contrario).
// Si inseriscono SOLO le 134 righe di certezza C del documento lotti/L9/G-collegamenti-calendario-2026-10-24.md §5; le 24 righe D restano nel
// documento. Ogni uid è riverificato sull'istanza: se la voce o l'evento non esistono la riga si salta, e il conteggio con gli uid saltati va in
// `dati_guida` (chiave `audit-164-collegamenti-eventi-voci`). Nessuna colonna di `voce_giornata` o di `evento_calendario` cambia.
// Idempotente: INSERT OR IGNORE; l'audit si scrive una volta sola (la seconda esecuzione non cambia nulla).
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-164-collegamenti-eventi-voci';

/** [evento_id, voce_uid]: le 134 righe di certezza C. */
const CERTI: ReadonlyArray<readonly [number, string]> = [
  [3, '5468ac4fdc0b91a78724f26822793b6d'], [5, 'f3d6ddf19b62f76616e3de65ac00f2b9'], [5, '2b0913043ec28f94fdb613548cd98aee'], [6, 'e4290542b3376439f92c71b76e18b64e'],
  [7, '13c631e03c8cb988f4d6da57c7b52e92'], [8, '6fd5031403067e22f9306de902cf57a6'], [9, '3a1bfca2ba3cc6ff5f08759d30014ee1'], [9, 'facb16e6353e1aa8b09790829685812f'],
  [10, '92228393531757698705e5c4c07c725e'], [11, 'e560e452e9081157593f26ccb2a06659'], [11, 'cf1e3b48a741a17e529f490a149efdeb'], [12, '402239f2465b3a075aa7271a6e5f2093'],
  [13, 'a513390589dcbc75a7ae4ef1aa798d06'], [13, '21aecf2c73015fb8f81eca38a7ac87dd'], [14, 'cdc7e3a818e612b94efe7853135f7617'], [15, '78a1b1f072a57b097259cbc977e2b7fd'],
  [15, '23414c504a833d3582e1a4bcad3ea47e'], [16, '092c31deecc05e43e861a03d539002f9'], [16, 'a15b63cdc169d4f9b2635f12c46748ce'], [19, '2aa7cc676b5ef4ff3cf4b148e45c0452'],
  [22, 'eff8f776cfb0355518a8e3af546c3fc7'], [23, 'c4bd6486ad6185335b41f2b2aba3ef27'], [24, '419ee48be0f88671ae34670067e3e306'], [24, '82a5443617ef8b45dbddce7a2e54fb91'],
  [24, '3ad902f09ee84978956f10b5a8c89137'], [25, 'e7adb0bcac77591a2d811cc5cce4519d'], [26, '21884ede0c011dee7ebfff5917c8642b'], [26, '39965e251eb93ff3da77b9e0c67bd556'],
  [27, '5f54d08040ddd8c0ac272b8c63627e64'], [28, 'b290d874136ed3f703a16ec39c190797'], [29, '0a169ae427234850192ffd1e6098202d'], [31, '3fb31dded3f9581173037ce9d1ec9535'],
  [31, '445731a85c54f6d1fa541f10ee8c64d1'], [33, 'c7c5fd272c9fb5fe8c4153a035c1631b'], [34, 'f58564c458cdfd51c93c52ddf35a160b'], [35, '59f76d129dd269dd17302431f261d7b8'],
  [36, 'fa2b6c8b9e1397c05ed9ce3c042ca299'], [37, 'b9371f8061aedd71262a200b98d18bd0'], [39, '010c2a0fb7b8ae58b6ac05bbb7ed4e64'], [42, '165b8cb392fae0bd067b6ba34b87a8fb'],
  [43, '57f605b58bd16697c586d852e287c986'], [45, 'dfcba17bb113c896146fbf39ee939c37'], [48, '8d4502a1aa7d55ea54495c46fc2e749f'], [49, '8d4502a1aa7d55ea54495c46fc2e749f'],
  [50, '4237a148aa6029905fb12f288af31b03'], [50, 'b6371951de612d94b6b45001f4e94fa4'], [51, '65fdbeab5101e6068310fea982553d22'], [53, '5e221a9726928b41f8a6daf4163fca67'],
  [54, '5796b127c3400b50853375829f8cf548'], [55, '5fa87613387914bfcd9c03f664602169'], [57, '84db8c1baa769193694985b0d8778ced'], [58, 'd64fa904303311103b323170025c343d'],
  [59, 'b9e2763b0f65697c7f0b28dc24c3487c'], [61, 'e1b37c4d04e08d26194da318f408fe78'], [62, '5b09fca76ba29be46db7e39a1450c89f'], [63, '8d32076e68235ebef75b89f6c0f0c6e4'],
  [65, '73978284d2d06bab2f0cda159e2ebda8'], [70, '982f84d182714307b09917e309444dd3'], [72, 'ac258051782e4ec99dc9ab4ac25df650'], [73, '242f337cff122dfb7ef5248efbcdcde6'],
  [74, 'a809b0fe42fa0d6407fab55d67299110'], [75, 'ab2cb32eb1b00dd9204b4a6555dc3f62'], [76, 'f5e781ca22e5ea7a33e5fcf4872f0108'], [76, '62284ab35f052e4dc2bb16daf3b09233'],
  [78, '3ebaf3766c968bbc52093d6f5045c4d2'], [81, '2788df0d25525508cdbdf7df908f0547'], [83, '1439b52c0b0f488b0997039e99d72787'], [86, '75c3a10b599608ec8b2ac4fe60ba6d72'],
  [88, 'c5596e1777497f5d762376c3f8721b7f'], [89, 'af278bbbe5e4fe6bacae57de3cfe48bf'], [90, 'f8842f2591b4685fd9655865e42a5be7'], [90, 'bf9ce33524dfda248b64bd8a9c44f570'],
  [91, 'ce581865deadf1178883f9ae46ae54d8'], [92, 'eeb54034359694941a6857a68255500f'], [93, 'f50cabbdbbd50127c8fc452c682dbe8a'], [95, 'fd2a7b29e9906cabc4d03848d332d5ba'],
  [98, 'aac6fc28c5821e70e4bbfc0e191869b3'], [98, 'd82f0870a6f2a0dc8f1806b8eab75f21'], [99, 'a0228dec7261c99151c28e96823afc62'], [102, '8742bcf962a80c28b81ab272ee5d5014'],
  [103, 'c66a02b66d02f21793e1f8e0d2f08798'], [104, '59dd32bc41f9611e11b2dd613b846f7c'], [104, '9682093aba1354f8705db26fb13d89b4'], [105, 'ec7d9d6c95f57a5f6a7a8d46b78d3f61'],
  [109, 'a33b29352f63dc0e9067493ec2ce28b0'], [110, 'c0e19947d961b4e0be4899315b4d9756'], [111, '1fe5e5e780b422e040df68a2d389b575'], [113, '325d5a62f6bf94b2d72009dd36d8e166'],
  [114, '9e5deb62f9607d21dbed9c1cee020619'], [114, '942fd4aa49a56c4bf913d1ac6c41b5fa'], [115, '7dd92df212b81bb87aba6e7a2fa8c874'], [115, '34df97d6a9671520b4c4ff874db16953'],
  [118, 'd381722e6b831f73ad4af0730fba2781'], [120, 'd26ea0495813e93e62e5940a9912c419'], [121, '3a614840b721ed10d2848b469ae3de0f'], [122, 'ebe00e6b2fe3f80a827f88f5503165fc'],
  [122, '7c0814176b193cad29d15ec00ffe891c'], [124, 'dece90bfb20d9d3328f2a6b0ca417590'], [125, '279e78034182988c357f4f0b8eeae12c'], [127, '5b5061191658e83df6da93c38b4cffdf'],
  [128, '589d82e823703ee879d72f974fd51139'], [129, '7e3a008d1230fb8106094cb8d3d374bb'], [131, '527cf9832e94e93e855436191e06f8b6'], [134, '746682faca7287278d592da846383d15'],
  [135, 'b7122251a674682657fe627319d36d91'], [140, '98bedf2016c6b2d5e66550b2cdd49ad8'], [141, 'a0d782331afa7582175440de0d45d966'], [142, '8af7b81be0611ac9f25e26ab32c1f8c5'],
  [143, '967b7b1f9e03f04a65130ebc5d213f18'], [145, '29ce4ebf3003f64dbcfd12c804b203b7'], [145, 'a65f9e31d7fbb8ad707ecae6f06082db'], [148, 'a7407ed3a16409c9a6abe4cc4edfc223'],
  [150, '09e38fddc12a2cce9d5abec6ffc6e7aa'], [151, '481b85503f2b06e8cd30259dceb9f74c'], [152, 'cdf1af20cff42ec521e2b4620f6f84a3'], [157, 'ca52617259cbf6097134496547f55792'],
  [159, 'cf66b722af0a5fb76d1906e89b66bb64'], [162, '3db90a97fcbc510f8fb97ca5aa142dd2'], [162, 'c3aff3d5cc749a1452814d60bd576b83'], [162, 'ccbbc79f7f8ecf2423794dc9e9683cc6'],
  [162, '525ed37ba675f84dee6178c4e473365e'], [164, '04d94d621b62115d8ac2128f25e0a198'], [165, 'b9dc3d420258d1607347842e7d755c92'], [166, '68250d6bd39d47f0edd98f5fc2ce324f'],
  [167, '28f29d549a88ebd24e361f72ae1080a7'], [168, '7d032c61ed3ce190fd94579fe53b2103'], [169, '4d86dfe0bb70820516c9a02f85dac668'], [169, '7759dd7222bb6b9e70b72653ab90d470'],
  [170, '2192f1235ff43a2d9ef2253190770a2d'], [171, '024d22c82c828c8f7b657672827456fb'], [171, 'be499cea1de9be10f9aff901301cdd7c'], [172, 'a2d18f766a73721e1ca0685a789ba325'],
  [173, '94483bd6b69211bb7a1de34394deb5bf'], [173, '3034e42cb18ccc64670f68f115b108b8'],
];

export const migration164: Migration = {
  id: 164, name: 'collegamenti_eventi_voci',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS main.evento_calendario_voce (
      evento_id INTEGER NOT NULL REFERENCES evento_calendario(id) ON DELETE CASCADE,
      voce_uid  TEXT NOT NULL REFERENCES voce_giornata(uid) ON DELETE CASCADE,
      certezza  TEXT NOT NULL CHECK (certezza IN ('C', 'D')),
      PRIMARY KEY (evento_id, voce_uid)
    );
    CREATE INDEX IF NOT EXISTS main.idx_evento_calendario_voce_voce ON evento_calendario_voce(voce_uid)`);
    const evento = db.prepare('SELECT 1 FROM main.evento_calendario WHERE id = ?');
    const voce = db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?');
    const inserisci = db.prepare("INSERT OR IGNORE INTO main.evento_calendario_voce (evento_id, voce_uid, certezza) VALUES (?, ?, 'C')");
    const saltate: Array<{ eventoId: number; uid: string; motivo: string }> = [];
    let inserite = 0;
    for (const [eventoId, uid] of CERTI) {
      if (!evento.get(eventoId)) { saltate.push({ eventoId, uid, motivo: 'evento assente' }); continue; }
      if (!voce.get(uid)) { saltate.push({ eventoId, uid, motivo: 'voce assente' }); continue; }
      inserite += inserisci.run(eventoId, uid).changes;
    }
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(AUDIT, JSON.stringify({
      data: '2026-10-24', fonte: 'lotti/L9/G-collegamenti-calendario-2026-10-24.md §5', proposte: CERTI.length, inserite, saltate: saltate.length, uidSaltati: saltate,
    }));
  },
};
