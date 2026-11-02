"""Generates the Cashrow logo kit (SVG sources). PNG/ICO exports are made by export.sh."""
import json
import math
import os
import sys

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'kit')
FONT = os.path.join(HERE, 'PlusJakartaSans-ExtraBold.ttf')

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
C = {
    'cobalt600': '#3448D6',
    'cobalt700': '#2836AE',
    'cobalt100': '#DCE2FF',
    'cobalt50': '#EEF1FF',
    'marigold400': '#F6AE2D',
    'marigold100': '#FFF1D6',
    'marigold800': '#8A4D00',
    'ink900': '#0E1726',
    'slate600': '#4B5565',
    'slate500': '#626B7F',
    'line': '#E3E7EF',
    'mist': '#F5F7FB',
    'white': '#FFFFFF',
    'got600': '#0C7D56',
    'got50': '#E6F6EE',
    'gave600': '#C93139',
    'gave50': '#FDECEE',
}

# ---------------------------------------------------------------------------
# Mark: a "C" (coin / cash) cut into three ledger rows. The middle row is the
# newest entry, in marigold.
# Geometry in a 512 x 512 box.
# ---------------------------------------------------------------------------
CX = CY = 256
R = 150          # ring centre-line radius
W = 100          # ring thickness  -> outer 200, inner 100
OPEN = 44        # half-opening angle in degrees (opening faces right)
GAP = 26         # gap between rows
MID_H = 74       # height of the middle row

TOP_EDGE = CY - R - W / 2
BOTTOM_EDGE = CY + R + W / 2
MID_TOP = CY - MID_H / 2
MID_BOTTOM = CY + MID_H / 2


def ring_path():
    """Closed outline of the C (outer arc, radial end, inner arc back, radial end)."""
    ro, ri = R + W / 2, R - W / 2
    a0, a1 = math.radians(OPEN), math.radians(360 - OPEN)
    p = lambda r, a: (CX + r * math.cos(a), CY + r * math.sin(a))
    o0, o1, i1, i0 = p(ro, a0), p(ro, a1), p(ri, a1), p(ri, a0)
    f = lambda pt: f'{pt[0]:.2f} {pt[1]:.2f}'
    return (
        f'M{f(o0)}A{ro} {ro} 0 1 1 {f(o1)}'
        f'L{f(i1)}A{ri} {ri} 0 1 0 {f(i0)}Z'
    )


def mark_group(top_bottom, middle, uid, x=0, y=0, size=512):
    """SVG group for the mark placed at (x, y) with the given size."""
    s = size / 512
    path = ring_path()
    return f'''<g transform="translate({x:.2f} {y:.2f}) scale({s:.5f})">
    <defs>
      <clipPath id="{uid}-rows"><rect x="0" y="0" width="512" height="{MID_TOP - GAP:.2f}"/><rect x="0" y="{MID_BOTTOM + GAP:.2f}" width="512" height="{512 - MID_BOTTOM - GAP:.2f}"/></clipPath>
      <clipPath id="{uid}-mid"><rect x="0" y="{MID_TOP:.2f}" width="512" height="{MID_H:.2f}"/></clipPath>
    </defs>
    <path d="{path}" fill="{top_bottom}" clip-path="url(#{uid}-rows)"/>
    <path d="{path}" fill="{middle}" clip-path="url(#{uid}-mid)"/>
  </g>'''


# ---------------------------------------------------------------------------
# Wordmark: "cashrow" in Plus Jakarta Sans ExtraBold, shaped with HarfBuzz
# (real kerning), converted to paths. "cash" in ink, "row" in cobalt.
# ---------------------------------------------------------------------------
font = TTFont(FONT)
glyph_set = font.getGlyphSet()
UPM = font['head'].unitsPerEm
TRACKING = -12  # font units between letters, slightly tight for a logo
NTOS = lambda v: (f'{v:.2f}'.rstrip('0').rstrip('.')) or '0'

blob = hb.Blob.from_file_path(FONT)
hb_face = hb.Face(blob)
hb_font = hb.Font(hb_face)


def shape(text, tt=None, hbf=None, tracking=TRACKING):
    tt, hbf = tt or font, hbf or hb_font
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    order = tt.getGlyphOrder()
    out, x = [], 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        assert name != '.notdef', f'missing glyph in {text!r}'
        out.append((name, x + pos.x_offset, pos.y_offset))
        x += pos.x_advance + tracking
    return out, x - tracking


_text_fonts = {}


def text_path(text, weight, size_px, x, baseline_y, color, tracking=0):
    """Any text outlined to a single SVG path (so it renders without the font installed)."""
    if weight not in _text_fonts:
        p = os.path.join(HERE, f'fonts/PlusJakartaSans-{weight}.ttf')
        _text_fonts[weight] = (TTFont(p), hb.Font(hb.Face(hb.Blob.from_file_path(p))))
    tt, hbf = _text_fonts[weight]
    gs = tt.getGlyphSet()
    scale = size_px / tt['head'].unitsPerEm
    glyphs, adv = shape(text, tt, hbf, tracking)
    pen = SVGPathPen(gs, ntos=NTOS)
    for name, dx, dy in glyphs:
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x + dx * scale, baseline_y - dy * scale)))
    return f'<path d="{pen.getCommands()}" fill="{color}"/>', adv * scale


def glyph_path(name, dx, dy, scale, baseline_y, ox):
    pen = SVGPathPen(glyph_set, ntos=NTOS)
    # Flip Y (font units go up) and place on the baseline.
    t = TransformPen(pen, (scale, 0, 0, -scale, ox + dx * scale, baseline_y - dy * scale))
    glyph_set[name].draw(t)
    return pen.getCommands()


GLYPHS, ADVANCE = shape('cashrow')
# Height of ascender ('h') top above baseline, in font units.
from fontTools.pens.boundsPen import BoundsPen  # noqa: E402

bp = BoundsPen(glyph_set)
glyph_set['h'].draw(bp)
ASC = bp.bounds[3]
bp = BoundsPen(glyph_set)
glyph_set['o'].draw(bp)
X_HEIGHT_OVERSHOOT_LOW = bp.bounds[1]  # tiny negative overshoot


def wordmark_paths(ox, baseline_y, cap_px, cash_color, row_color):
    """Returns SVG for the wordmark where `cap_px` is the ascender height in px."""
    scale = cap_px / ASC
    parts = []
    for i, (name, dx, dy) in enumerate(GLYPHS):
        color = cash_color if i < 4 else row_color
        parts.append(f'<path d="{glyph_path(name, dx, dy, scale, baseline_y, ox)}" fill="{color}"/>')
    width = ADVANCE * scale
    return '\n  '.join(parts), width


def svg(width, height, body, title, bg=None):
    rect = f'<rect width="{width}" height="{height}" fill="{bg}"/>\n  ' if bg else ''
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'width="{width:.0f}" height="{height:.0f}" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n  {rect}{body}\n</svg>\n'
    )


# ---------------------------------------------------------------------------
# Lockups
# ---------------------------------------------------------------------------
def horizontal(theme):
    """Mark + wordmark side by side, trimmed to the ink."""
    asc_px = 120
    mark = asc_px * 1.7            # visible ring = 0.78 x mark = ~1.33 x ascender
    s = mark / 512
    ink_left = (CX - R - W / 2) * s
    ink_right = (CX + (R + W / 2) * math.cos(math.radians(OPEN))) * s
    gap = asc_px * 0.36
    top = TOP_EDGE * s
    bottom = BOTTOM_EDGE * s
    # Optical alignment: centre the lowercase + ascender block on the mark.
    baseline = (top + bottom) / 2 + asc_px * 0.47
    colors = {
        'color': (C['cobalt600'], C['marigold400'], C['ink900'], C['cobalt600']),
        'reversed': (C['white'], C['marigold400'], C['white'], C['cobalt100']),
        'mono-ink': (C['ink900'], C['ink900'], C['ink900'], C['ink900']),
        'mono-white': (C['white'], C['white'], C['white'], C['white']),
    }[theme]
    m = mark_group(colors[0], colors[1], f'h-{theme}', x=0, y=0, size=mark)
    words, w = wordmark_paths(ink_right + gap, baseline, asc_px, colors[2], colors[3])
    width = ink_right + gap + w - ink_left
    body = f'<g transform="translate({-ink_left:.2f} {-top:.2f})">\n  {m}\n  {words}\n  </g>'
    return width, bottom - top, body


def stacked(theme='color'):
    asc_px = 96
    mark = 300
    s = mark / 512
    _, w = wordmark_paths(0, 0, asc_px, C['ink900'], C['cobalt600'])
    ring_h = (BOTTOM_EDGE - TOP_EDGE) * s
    ink_l = (CX - R - W / 2) * s
    ink_r = (CX + (R + W / 2) * math.cos(math.radians(OPEN))) * s
    width = max(w, ink_r - ink_l)
    # Centre the C's ink (not its box) over the wordmark.
    mx = width / 2 - (ink_l + ink_r) / 2
    my = -TOP_EDGE * s
    baseline = ring_h + 40 + asc_px
    m = mark_group(C['cobalt600'], C['marigold400'], 'st', x=mx, y=my, size=mark)
    words, w = wordmark_paths((width - w) / 2, baseline, asc_px, C['ink900'], C['cobalt600'])
    return width, baseline + 4, f'{m}\n  {words}'


def mark_only(theme):
    colors = {
        'color': (C['cobalt600'], C['marigold400']),
        'reversed': (C['white'], C['marigold400']),
        'mono': (C['ink900'], C['ink900']),
    }[theme]
    return mark_group(colors[0], colors[1], f'm-{theme}')


def app_icon(size=1024, maskable=False, mark_ratio=None):
    """Cobalt tile with a white mark and marigold middle row."""
    radius = 0 if maskable else size * 0.225
    # Maskable icons must keep content inside the central 80% circle.
    mark_size = size * (mark_ratio or (0.56 if maskable else 0.68))
    off = (size - mark_size) / 2
    # Optical centring: the C's opening is on the right, so nudge it right a little.
    nudge = mark_size * 0.035
    tile = f'<rect width="{size}" height="{size}" rx="{radius:.1f}" fill="{C["cobalt600"]}"/>'
    m = mark_group(C['white'], C['marigold400'], f'icon{size}{int(maskable)}', x=off + nudge, y=off, size=mark_size)
    return f'{tile}\n  {m}'


def favicon():
    """Same as the app icon, tuned for 16-48 px: thicker rows read better small."""
    global GAP, MID_H
    saved = GAP, MID_H
    GAP, MID_H = 34, 84
    body = app_icon(512, mark_ratio=0.86)
    GAP, MID_H = saved
    return body


def social_preview():
    """1280 x 640 image for GitHub / link previews. All text is outlined."""
    w, h = 1280, 640
    lw, lh, logo = horizontal('reversed')
    scale = 560 / lw
    lx, ly = 112, 200
    line1, _ = text_path('Cash in, cash out. One row at a time.', 'SemiBold', 38, lx, ly + lh * scale + 92, C['cobalt100'])
    line2, _ = text_path('A free cash book for every party, in your own Google Sheet.', 'Medium', 27, lx, ly + lh * scale + 140, C['white'])
    # Big cropped mark on the right as a brand graphic.
    big = mark_group(C['cobalt600'], C['marigold400'], 'sp', x=840, y=-60, size=760)
    body = (
        f'<rect width="{w}" height="{h}" fill="{C["ink900"]}"/>\n'
        f'  <g opacity="0.9">{big}</g>\n'
        f'  <g transform="translate({lx} {ly}) scale({scale:.4f})">{logo}</g>\n'
        f'  {line1}\n  <g opacity="0.62">{line2}</g>\n'
        f'  <rect x="{lx}" y="{h - 84}" width="88" height="10" rx="5" fill="{C["marigold400"]}"/>'
    )
    return w, h, body


def write(path, content):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as fh:
        fh.write(content)


def main():
    for theme, name in [
        ('color', 'cashrow-logo'),
        ('reversed', 'cashrow-logo-reversed'),
        ('mono-ink', 'cashrow-logo-mono-ink'),
        ('mono-white', 'cashrow-logo-mono-white'),
    ]:
        w, h, body = horizontal(theme)
        write(f'svg/{name}.svg', svg(w, h, body, 'Cashrow'))

    w, h, body = stacked()
    write('svg/cashrow-logo-stacked.svg', svg(w, h, body, 'Cashrow'))

    s = 512
    top, bottom = TOP_EDGE, BOTTOM_EDGE
    left, right = CX - R - W / 2, CX + R + W / 2
    for theme in ['color', 'reversed', 'mono']:
        body = f'<g transform="translate({-left:.2f} {-top:.2f})">{mark_only(theme)}</g>'
        write(f'svg/cashrow-mark{"" if theme == "color" else "-" + theme}.svg', svg(right - left, bottom - top, body, 'Cashrow mark'))

    words, ww = wordmark_paths(0, 120, 120, C['ink900'], C['cobalt600'])
    write('svg/cashrow-wordmark.svg', svg(ww, 124, words, 'Cashrow'))

    write('svg/cashrow-app-icon.svg', svg(1024, 1024, app_icon(1024), 'Cashrow'))
    write('svg/cashrow-app-icon-maskable.svg', svg(1024, 1024, app_icon(1024, maskable=True), 'Cashrow'))
    write('svg/favicon.svg', svg(512, 512, favicon(), 'Cashrow'))

    w, h, body = social_preview()
    write('svg/cashrow-social-preview.svg', svg(w, h, body, 'Cashrow'))

    # Tokens
    names = {
        'cobalt600': ('brand', 'Cobalt 600', 'Primary: buttons, links, logo'),
        'cobalt700': ('brand', 'Cobalt 700', 'Hover, pressed, text on cobalt tints'),
        'cobalt100': ('brand', 'Cobalt 100', 'Selected borders, focus ring'),
        'cobalt50': ('brand', 'Cobalt 50', 'Selected rows, soft buttons'),
        'marigold400': ('accent', 'Marigold 400', 'Logo "new row", highlights, badges on dark'),
        'marigold100': ('accent', 'Marigold 100', 'Highlight backgrounds'),
        'marigold800': ('accent', 'Marigold 800', 'Text on marigold tints'),
        'ink900': ('neutral', 'Ink 900', 'Main text, dark backgrounds'),
        'slate600': ('neutral', 'Slate 600', 'Secondary text'),
        'slate500': ('neutral', 'Slate 500', 'Muted text, captions'),
        'line': ('neutral', 'Line', 'Borders, dividers'),
        'mist': ('neutral', 'Mist', 'App background'),
        'white': ('neutral', 'White', 'Cards, panels'),
        'got600': ('semantic', 'Got 600', 'Cash in (You got): text, solid buttons'),
        'got50': ('semantic', 'Got 50', 'Cash in tint'),
        'gave600': ('semantic', 'Gave 600', 'Cash out (You gave): text, solid buttons'),
        'gave50': ('semantic', 'Gave 50', 'Cash out tint'),
    }
    tokens = [
        {'token': k, 'group': g, 'name': n, 'hex': C[k], 'use': u} for k, (g, n, u) in names.items()
    ]
    write('tokens/colors.json', json.dumps(tokens, indent=2) + '\n')
    css = ':root {\n' + '\n'.join(
        f'  --cr-{t["name"].lower().replace(" ", "-")}: {t["hex"]}; /* {t["use"]} */' for t in tokens
    ) + '\n}\n'
    write('tokens/colors.css', css)
    print('ok', OUT)


if __name__ == '__main__':
    main()
