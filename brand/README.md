# Cashrow brand kit

Open [brand-guide.html](brand-guide.html) in a browser for the visual version of this page.

The mark is a **C** for cash, cut into three ledger rows. The middle row, in marigold, is the newest entry.
The wordmark is **cashrow** in Plus Jakarta Sans ExtraBold, with **cash** in ink and **row** in cobalt.

## Colours

### Brand

| Token | Hex | Use |
| --- | --- | --- |
| Cobalt 600 | `#3448D6` | Primary: logo, buttons, links, active states |
| Cobalt 700 | `#2836AE` | Hover and pressed, text on cobalt tints |
| Cobalt 100 | `#DCE2FF` | Selected borders, focus ring, "row" on dark backgrounds |
| Cobalt 50 | `#EEF1FF` | Selected rows, soft buttons |

### Accent

| Token | Hex | Use |
| --- | --- | --- |
| Marigold 400 | `#F6AE2D` | The logo's middle row, highlights, badges on dark or cobalt. Never text on white. |
| Marigold 100 | `#FFF1D6` | Highlight backgrounds |
| Marigold 800 | `#8A4D00` | Text on marigold tints |

### Neutrals

| Token | Hex | Use |
| --- | --- | --- |
| Ink 900 | `#0E1726` | Main text, "cash" in the wordmark, dark backgrounds |
| Slate 600 | `#4B5565` | Secondary text |
| Slate 500 | `#626B7F` | Muted text, captions |
| Line | `#E3E7EF` | Borders, dividers |
| Mist | `#F5F7FB` | App background |
| White | `#FFFFFF` | Cards, panels |

### Money (semantic)

| Token | Hex | Use |
| --- | --- | --- |
| Got 600 | `#0C7D56` | Cash in (**You got**): amounts, solid buttons |
| Got 50 | `#E6F6EE` | Cash in tint |
| Gave 600 | `#C93139` | Cash out (**You gave**): amounts, solid buttons |
| Gave 50 | `#FDECEE` | Cash out tint |

Cobalt is kept clear of green and red so the brand never reads as "in" or "out".

### Contrast (WCAG 2.x)

| Pair | Ratio | |
| --- | --- | --- |
| Ink 900 on White | 17.96 | AAA |
| Cobalt 600 on White | 6.90 | AA |
| White on Cobalt 600 | 6.90 | AA |
| Cobalt 700 on Cobalt 50 | 8.37 | AAA |
| Slate 600 on White | 7.54 | AAA |
| Slate 500 on White / on Cobalt 50 | 5.35 / 4.75 | AA |
| Got 600 on White / on Got 50 | 5.14 / 4.60 | AA |
| Gave 600 on White / on Gave 50 | 5.27 / 4.62 | AA |
| Marigold 800 on Marigold 100 | 5.98 | AA |
| Marigold 400 on Ink 900 | 9.42 | AAA |
| Marigold 400 on White | 1.91 | Decoration only |

Tokens ship as CSS variables (`tokens/colors.css`), Tailwind v4 theme colours (`tokens/tailwind.css`) and JSON
(`tokens/colors.json`).

## Files

```
svg/                      Vector masters. Use these wherever SVG works.
  cashrow-logo.svg              Primary horizontal logo (light backgrounds)
  cashrow-logo-reversed.svg     For ink or dark backgrounds
  cashrow-logo-mono-ink.svg     One colour, ink
  cashrow-logo-mono-white.svg   One colour, white (on cobalt or photos)
  cashrow-logo-stacked.svg      Mark above wordmark, for square spaces
  cashrow-wordmark.svg          Wordmark only
  cashrow-mark*.svg             Mark only: colour, reversed, mono
  cashrow-app-icon.svg          Rounded tile, 1024
  cashrow-app-icon-maskable.svg Full-bleed tile with safe-zone padding (Android/PWA)
  apple-touch-icon.svg          Full-bleed tile for iOS (iOS rounds the corners)
  cashrow-avatar.svg            Square tile for profile pictures that crop to a circle
  favicon.svg                   Tile tuned for 16-48 px
png/logo, png/mark        PNG exports, transparent background, sized by height
app-icons/                favicon.ico (16/32/48), favicon.svg, favicon-*.png, icon-192/512/1024.png,
                          icon-maskable-192/512.png, apple-touch-icon.png (180), avatar-500.png,
                          site.webmanifest
social/                   1280 x 640 preview for GitHub (Settings > General > Social preview) and link cards
tokens/                   colors.css, tailwind.css, colors.json
brand-guide.html          One-page visual guide (open in a browser)
source/                   Scripts that generate everything above
```

## Using it in the web app

The Cashrow app already uses this kit: `public/` holds copies of the files in `app-icons/`, the colours
are tokens in `src/index.css`, and `src/components/brand/Logo.tsx` draws the mark. If you change the kit,
copy `app-icons/*` into `public/` again. In `index.html`:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#FFFFFF" />
```

## Rules

- **Clear space:** keep at least the height of the marigold row (about a quarter of the mark's height) empty
  on every side.
- **Minimum size:** horizontal logo 24 px tall on screen (16 mm in print); mark alone 16 px.
- Use the colour logo on White, Mist or Cobalt 50. On Ink use the reversed logo; on Cobalt use mono white or
  the app icon.
- Don't recolour the rows, swap the order of the colours, add shadows or outlines, stretch, rotate, or retype
  the wordmark in another font.
- Marigold is a highlight. Keep it to the logo's row, small badges and accents, never body text on white.

## Typeface

[Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (SIL Open Font License 1.1).
The wordmark is converted to outlines, so the font doesn't need to be installed to use the logo. For UI
text, use weights 500-800 from Google Fonts or `@fontsource/plus-jakarta-sans`.

## Regenerating

`source/build.py` draws the SVGs (mark geometry, wordmark shaping, palette), `source/export.py` renders PNG,
ICO, manifest and tokens, and `source/brand_page.py` writes `brand-guide.html`. They need Python 3 with
`fonttools`, `uharfbuzz` and `Pillow`, plus `rsvg-convert`, and Plus Jakarta Sans as TTF:
`PlusJakartaSans-ExtraBold.ttf` next to the scripts and Medium, SemiBold and ExtraBold in `source/fonts/`.
From `brand/source/`, run `python3 export.py && python3 brand_page.py`; output goes to `brand/source/kit/`.
