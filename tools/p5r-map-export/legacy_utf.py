"""Lettore di archivi CPK (CRI Middleware) + decompressione CRILAYLA.

Scritto per Persona 5 Royal (PC/Steam). Nessuna dipendenza esterna oltre a
Pillow, usata solo dagli script di conversione.
"""
import struct

# ---------------------------------------------------------------- tabelle @UTF

_TYPES = {0: ('B', 1), 1: ('b', 1), 2: ('H', 2), 3: ('h', 2), 4: ('I', 4),
          5: ('i', 4), 6: ('Q', 8), 7: ('q', 8), 8: ('f', 4), 9: ('d', 8),
          0xa: ('I', 4), 0xb: ('I', 4)}


def _decrypt(buf):
    m, t = 0x655f, 0x4115
    out = bytearray(buf)
    for i in range(len(out)):
        out[i] ^= m & 0xff
        m = (m * t) & 0xffffffff
    return bytes(out)


class Utf:
    """Tabella @UTF: l'unita' di metadati usata da tutti i blocchi del CPK."""

    def __init__(self, buf):
        if buf[:4] != b'@UTF':
            buf = _decrypt(buf)
        if buf[:4] != b'@UTF':
            raise ValueError('blocco @UTF non riconosciuto')
        self.buf = buf
        rows_off, str_off, data_off, name_off = struct.unpack_from('>IIII', buf, 8)
        ncols, row_len = struct.unpack_from('>HH', buf, 24)
        nrows, = struct.unpack_from('>I', buf, 28)
        self._str = str_off + 8
        self._data = data_off + 8
        self.name = self._string(name_off)

        p = 32
        cols = []
        for _ in range(ncols):
            flags = buf[p]; p += 1
            if flags == 0:                       # forma estesa, rara
                flags = struct.unpack_from('>I', buf, p)[0] & 0xff; p += 4
            cname = self._string(struct.unpack_from('>I', buf, p)[0]); p += 4
            storage, typ, const = flags & 0xf0, flags & 0x0f, None
            if storage == 0x30:                  # valore costante per tutte le righe
                const, p = self._value(typ, p)
            cols.append((cname, typ, storage, const))

        self.rows = []
        for r in range(nrows):
            p = rows_off + 8 + r * row_len
            row = {}
            for cname, typ, storage, const in cols:
                if storage == 0x50:              # un valore per riga
                    v, p = self._value(typ, p)
                elif storage == 0x30:
                    v = const
                else:
                    v = 0
                row[cname] = v
            self.rows.append(row)

    def _string(self, off):
        s = self._str + off
        return self.buf[s:self.buf.index(b'\x00', s)].decode('utf-8', 'replace')

    def _value(self, typ, p):
        f, n = _TYPES[typ]
        v, = struct.unpack_from('>' + f, self.buf, p)
        p += n
        if typ == 0xa:
            return self._string(v), p
        if typ == 0xb:
            sz, = struct.unpack_from('>I', self.buf, p)
            return (self._data + v, sz), p + 4
        return v, p


