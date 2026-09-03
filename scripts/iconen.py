#!/usr/bin/env python3
"""
Genereert de app-iconen uit dezelfde tekening als public/favicon.svg.

Met de hand gemaakte PNG's lopen uit de pas zodra het palet verandert -- precies
wat er gebeurde toen de app naar de clubkleuren ging. Dit script is de enige
bron: pas het palet hieronder aan en draai `python3 scripts/iconen.py`.

Geen afhankelijkheden; een PNG is een handvol zlib-blokken.
"""
import struct
import zlib

MARINE = (0x08, 0x15, 0x2C)
GEEL = (0xFF, 0xD4, 0x00)
GROEN = (0x4A, 0xDE, 0x80)


def teken(maat: int) -> bytes:
    """Het veldje uit de favicon, geschaald naar `maat` pixels."""
    s = maat / 64  # de tekening is op een raster van 64 gedefinieerd
    beeld = [[MARINE] * maat for _ in range(maat)]

    def rect(x0, y0, x1, y1, kleur):
        for y in range(max(0, int(y0 * s)), min(maat, int(y1 * s))):
            for x in range(max(0, int(x0 * s)), min(maat, int(x1 * s))):
                beeld[y][x] = kleur

    def cirkel(cx, cy, r, kleur):
        cx, cy, r = cx * s, cy * s, r * s
        for y in range(max(0, int(cy - r)), min(maat, int(cy + r) + 1)):
            for x in range(max(0, int(cx - r)), min(maat, int(cx + r) + 1)):
                if (x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2 <= r * r:
                    beeld[y][x] = kleur

    dik = max(1, round(2 * s))
    # Speelveld: rechthoek met een middenlijn.
    rect(10, 8, 54, 8 + dik / s, GEEL)
    rect(10, 56 - dik / s, 54, 56, GEEL)
    rect(10, 8, 10 + dik / s, 56, GEEL)
    rect(54 - dik / s, 8, 54, 56, GEEL)
    rect(10, 32 - dik / (2 * s), 54, 32 + dik / (2 * s), GEEL)
    # Twee speelsters: eentje eruit, eentje erin.
    cirkel(24, 20, 5, GEEL)
    cirkel(40, 44, 5, GROEN)

    rijen = b''.join(
        b'\x00' + bytes(k for pixel in rij for k in pixel) for rij in beeld
    )
    return rijen


def png(maat: int) -> bytes:
    def blok(soort: bytes, data: bytes) -> bytes:
        return (
            struct.pack('>I', len(data))
            + soort
            + data
            + struct.pack('>I', zlib.crc32(soort + data) & 0xFFFFFFFF)
        )

    kop = struct.pack('>IIBBBBB', maat, maat, 8, 2, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + blok(b'IHDR', kop)
        + blok(b'IDAT', zlib.compress(teken(maat), 9))
        + blok(b'IEND', b'')
    )


if __name__ == '__main__':
    for maat in (192, 512):
        pad = f'public/icon-{maat}.png'
        with open(pad, 'wb') as bestand:
            bestand.write(png(maat))
        print(f'{pad} geschreven')
