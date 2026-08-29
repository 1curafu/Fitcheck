# Fitcheck — logo assets (mark 1c, "f + check")

Grotesque `f` with a rust check in a soft-square tile. Drawn as pure geometry on a
32-unit grid — **no font dependency**, so every file renders identically everywhere.

## Colours
| Role | Hex |
|---|---|
| Tile | `#161517` |
| Canvas / on-light tile | `#0E0E10` |
| `f` (cream) | `#EDE6D8` |
| Check (rust) | `#B86A47` |
| Tile hairline | `#EDE6D8` @ 14% |

## Files

**Vector**
| File | Use |
|---|---|
| `fitcheck-mark.svg` | Primary mark, dark tile + hairline. Default everywhere. |
| `fitcheck-mark-on-light.svg` | For cream/white backgrounds (solid `#0E0E10` tile, no hairline). |
| `fitcheck-mark-bare.svg` | No tile — mark only, transparent. For tight UI slots. |
| `fitcheck-mark-mono.svg` | Single-colour, inherits `currentColor`. One-colour print, embroidery, watermarks. |
| `favicon.svg` | 16px-optimised: full-bleed tile, heavier strokes (2.9/3.1). |
| `fitcheck-lockup-dark.svg` | Mark + `fitcheck` wordmark, cream — dark backgrounds. |
| `fitcheck-lockup-light.svg` | Same, dark text — light backgrounds. |

**Raster**
| File | Use |
|---|---|
| `favicon-16.png` `favicon-32.png` `favicon-48.png` | Legacy favicon / ICO source |
| `apple-touch-icon-180.png` | iOS home screen (opaque, as required) |
| `icon-192.png` `icon-512.png` | PWA manifest |
| `icon-512-maskable.png` | Android adaptive — 20% safe-zone padding |
| `icon-1024.png` | App store / OG source |

## HTML

```html
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0E0E10">
```

## manifest.webmanifest

```json
{
  "name": "Fitcheck",
  "short_name": "Fitcheck",
  "background_color": "#0E0E10",
  "theme_color": "#0E0E10",
  "display": "standalone",
  "icons": [
    { "src": "/brand/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/brand/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/brand/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Inline (React / any JSX)

```jsx
<svg viewBox="0 0 32 32" width="28" height="28" role="img" aria-label="Fitcheck">
  <rect x="1.6" y="1.6" width="28.8" height="28.8" rx="8.4" fill="#161517"/>
  <rect x="1.6" y="1.6" width="28.8" height="28.8" rx="8.4" fill="none"
        stroke="#EDE6D8" strokeOpacity=".14" strokeWidth="1"/>
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.2 24V9.6C9.2 7.6 10.7 6 12.8 6h3.4" stroke="#EDE6D8" strokeWidth="2.1"/>
    <path d="M6.9 14.4h7.4" stroke="#EDE6D8" strokeWidth="2.1"/>
    <path d="m19.4 18.6 2.9 3 4.1-6.6" stroke="#B86A47" strokeWidth="2.4"/>
  </g>
</svg>
```

## Rules

- **Clear space** — keep at least 25% of the tile's width free on all sides.
- **Minimum size** — 16px for `favicon.svg`, 20px for `fitcheck-mark.svg`, 96px wide for the lockups.
- Never recolour the check to anything but rust `#B86A47`; never fill the tile with rust.
- Never add a drop shadow, gradient, or outer glow.
- Don't stretch — scale uniformly.

## Two notes

1. **Lockups use live text** for the `fitcheck` wordmark (`Libre Caslon Text`, falling back to
   Georgia). If a viewer has neither font the letterforms shift. For print or a locked-down
   asset, open a lockup in a vector editor and convert the text to outlines — the mark itself
   needs no such step.
2. **No `.ico`** — modern browsers take `favicon.svg` + the PNGs. If you need one for old IE,
   generate it from `favicon-16/32/48.png`.
