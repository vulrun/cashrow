"""Builds the one-page brand guide: kit/brand-guide.html (standalone) and page/cashrow-brand.html (Artifact body)."""
import os
import re
import sys

sys.argv = [sys.argv[0], os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit')]
import build  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, 'kit')
C = build.C


def read(path):
    with open(os.path.join(KIT, path)) as fh:
        return fh.read()


def inline(svg_text, prefix, width=None, height=None, label=None, cls=None):
    """Inline an SVG: unique ids, optional size, accessible name or hidden."""
    s = re.sub(r'<title>.*?</title>\s*', '', svg_text)
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{prefix}-{m.group(1)}"', s)
    s = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{prefix}-{m.group(1)})', s)
    s = re.sub(r'\s(width|height)="[^"]*"', '', s, count=2)
    s = re.sub(r'\srole="img" aria-label="[^"]*"', '', s)
    attrs = []
    if width:
        attrs.append(f'width="{width}"')
    if height:
        attrs.append(f'height="{height}"')
    attrs.append(f'role="img" aria-label="{label}"' if label else 'aria-hidden="true" focusable="false"')
    if cls:
        attrs.append(f'class="{cls}"')
    return s.replace('<svg ', '<svg ' + ' '.join(attrs) + ' ', 1).strip()


def themed_logo():
    """Horizontal logo whose colours follow the page theme through CSS variables."""
    w, h, body = build.horizontal('color')
    for hexv, var in [(C['marigold400'], '--lg-mid'), (C['ink900'], '--lg-cash')]:
        body = body.replace(f'fill="{hexv}"', f'style="fill:var({var})"')
    # Cobalt appears in the mark rows (inside the mark group) and in the "row" letters.
    mark_end = body.index('</g>', body.index('clip-path'))
    head, tail = body[:mark_end], body[mark_end:]
    head = head.replace(f'fill="{C["cobalt600"]}"', 'style="fill:var(--lg-mark)"')
    tail = tail.replace(f'fill="{C["cobalt600"]}"', 'style="fill:var(--lg-row)"')
    return inline(build.svg(w, h, head + tail, 'Cashrow'), 'hero', label='Cashrow', cls='hero-logo')


def recolored_logo():
    s = read('svg/cashrow-logo.svg')
    s = s.replace(C['marigold400'], '#TMP').replace(C['cobalt600'], C['marigold400']).replace('#TMP', C['got600'])
    return s


GROUPS = [
    ('Brand', 'Cobalt carries the brand: logo, primary buttons, links and selection.', [
        ('Cobalt 600', 'cobalt600', 'Logo, primary buttons, links'),
        ('Cobalt 700', 'cobalt700', 'Hover and pressed, text on cobalt tints'),
        ('Cobalt 100', 'cobalt100', 'Selected borders, focus ring, “row” on dark'),
        ('Cobalt 50', 'cobalt50', 'Selected rows, soft buttons'),
    ]),
    ('Accent', 'Marigold is the new row. Use it sparingly, never as text on white.', [
        ('Marigold 400', 'marigold400', 'Logo row, highlights, badges on dark'),
        ('Marigold 100', 'marigold100', 'Highlight backgrounds'),
        ('Marigold 800', 'marigold800', 'Text on marigold tints'),
    ]),
    ('Neutrals', 'Cool greys with a slight blue bias, so they sit well next to cobalt.', [
        ('Ink 900', 'ink900', 'Main text, “cash”, dark backgrounds'),
        ('Slate 600', 'slate600', 'Secondary text'),
        ('Slate 500', 'slate500', 'Muted text, captions'),
        ('Line', 'line', 'Borders, dividers'),
        ('Mist', 'mist', 'App background'),
        ('White', 'white', 'Cards, panels'),
    ]),
    ('Money', 'Green for cash in, red for cash out. Kept apart from the brand hue on purpose.', [
        ('Got 600', 'got600', 'You got: amounts, Get cash button'),
        ('Got 50', 'got50', 'Cash-in tint'),
        ('Gave 600', 'gave600', 'You gave: amounts, Give cash button'),
        ('Gave 50', 'gave50', 'Cash-out tint'),
    ]),
]

CONTRAST = [
    ('ink900', 'white', 17.96, 'AAA'),
    ('white', 'cobalt600', 6.90, 'AA'),
    ('cobalt700', 'cobalt50', 8.37, 'AAA'),
    ('slate500', 'white', 5.35, 'AA'),
    ('slate500', 'cobalt50', 4.75, 'AA'),
    ('got600', 'got50', 4.60, 'AA'),
    ('gave600', 'gave50', 4.62, 'AA'),
    ('marigold800', 'marigold100', 5.98, 'AA'),
    ('marigold400', 'ink900', 9.42, 'AAA'),
]
NAMES = {k: n for _, _, items in GROUPS for n, k, _ in items}


def swatches():
    out = []
    for title, note, items in GROUPS:
        cards = []
        for name, key, use in items:
            hexv = C[key]
            cards.append(
                f'<li class="swatch"><span class="chip" style="background:{hexv}"></span>'
                f'<span class="sw-body"><span class="sw-name">{name}</span>'
                f'<button type="button" class="hex" data-hex="{hexv}" aria-label="Copy {name} hex {hexv}">{hexv}</button>'
                f'<span class="sw-use">{use}</span></span></li>'
            )
        out.append(
            f'<div class="group"><div class="group-head"><h3>{title}</h3><p>{note}</p></div>'
            f'<ul class="swatches" role="list">{"".join(cards)}</ul></div>'
        )
    return '\n'.join(out)


def contrast_rows():
    rows = []
    for fg, bg, ratio, level in CONTRAST:
        rows.append(
            f'<tr><td><span class="sample" style="color:{C[fg]};background:{C[bg]}">Aa ₹12,500</span></td>'
            f'<td>{NAMES[fg]} on {NAMES[bg]}</td><td class="num">{ratio:.2f}</td>'
            f'<td><span class="level">{level}</span></td></tr>'
        )
    return '\n'.join(rows)


def page(full):
    logo_color = inline(read('svg/cashrow-logo.svg'), 'l1', label='Cashrow logo')
    logo_demo = inline(read('svg/cashrow-logo.svg'), 'l6', label='Cashrow')
    logo_rev = inline(read('svg/cashrow-logo-reversed.svg'), 'l2', label='Cashrow logo, reversed')
    logo_mw = inline(read('svg/cashrow-logo-mono-white.svg'), 'l3', label='Cashrow logo, white')
    logo_mi = inline(read('svg/cashrow-logo-mono-ink.svg'), 'l4', label='Cashrow logo, ink')
    stacked = inline(read('svg/cashrow-logo-stacked.svg'), 'l5', label='Cashrow stacked logo')
    mark_big = inline(read('svg/cashrow-mark.svg').replace(f'fill="{C["cobalt600"]}"', 'style="fill:var(--lg-mark)"').replace(f'fill="{C["marigold400"]}"', 'style="fill:var(--lg-mid)"'), 'm1', label='Cashrow mark')
    icon = inline(read('svg/cashrow-app-icon.svg'), 'i1', label='App icon')
    maskable = inline(read('svg/cashrow-app-icon-maskable.svg'), 'i2', label='Maskable app icon')
    fav = [inline(read('svg/favicon.svg'), f'f{n}', width=n, height=n, label=f'Favicon at {n} pixels') for n in (16, 32, 48)]
    avatar = inline(read('svg/cashrow-avatar.svg'), 'i3', label='Profile avatar')
    social = inline(read('social/cashrow-social-preview.svg'), 'sp', label='Social preview image')
    dont_stretch = inline(read('svg/cashrow-logo.svg'), 'd1')
    dont_recolor = inline(recolored_logo(), 'd2')
    dont_contrast = inline(read('svg/cashrow-logo.svg'), 'd3')
    dont_effects = inline(read('svg/cashrow-logo.svg'), 'd4')
    clear = inline(read('svg/cashrow-logo.svg'), 'c1', label='Cashrow logo with clear space')

    hex_list = ' · '.join(f'{n} {C[k]}' for n, k in [('Cobalt', 'cobalt600'), ('Marigold', 'marigold400'), ('Ink', 'ink900')])

    style = STYLE
    body = BODY.format(
        hero_logo=themed_logo(), logo_color=logo_color, logo_demo=logo_demo, logo_rev=logo_rev, logo_mw=logo_mw, logo_mi=logo_mi,
        stacked=stacked, mark_big=mark_big, icon=icon, maskable=maskable, fav16=fav[0], fav32=fav[1], fav48=fav[2],
        avatar=avatar, social=social, swatches=swatches(), contrast=contrast_rows(), dont_stretch=dont_stretch,
        dont_recolor=dont_recolor, dont_contrast=dont_contrast, dont_effects=dont_effects, clear=clear,
        hex_list=hex_list, **{k: v for k, v in C.items()},
    )
    head = (
        '<title>Cashrow Brand Kit</title>\n'
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">\n'
        f'<style>{style}</style>\n'
    )
    html = head + body + SCRIPT
    if full:
        html = (
            '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + '</head>\n<body>\n' + body + SCRIPT + '</body>\n</html>\n'
        )
    return html


STYLE = r'''
/* Layout: a brand book. Section label column on the left, specimens on the right; one column on phones. */
:root {
  --bg: #F5F7FB; --surface: #FFFFFF; --fg: #0E1726; --muted: #4B5565; --faint: #667085;
  --line: #E3E7EF; --accent: #3448D6; --accent-soft: #EEF1FF; --warn: #C93139;
  --lg-mark: #3448D6; --lg-mid: #F6AE2D; --lg-cash: #0E1726; --lg-row: #3448D6; --tile-edge: transparent;
  --font: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0B1220; --surface: #121B2D; --fg: #EEF1FF; --muted: #AEB7C8; --faint: #8C97AB;
    --line: #222D44; --accent: #9AA8FF; --accent-soft: #1A2547; --warn: #FF8A8F;
    --lg-mark: #FFFFFF; --lg-mid: #F6AE2D; --lg-cash: #FFFFFF; --lg-row: #DCE2FF; --tile-edge: #2A3550;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0B1220; --surface: #121B2D; --fg: #EEF1FF; --muted: #AEB7C8; --faint: #8C97AB;
  --line: #222D44; --accent: #9AA8FF; --accent-soft: #1A2547; --warn: #FF8A8F;
  --lg-mark: #FFFFFF; --lg-mid: #F6AE2D; --lg-cash: #FFFFFF; --lg-row: #DCE2FF; --tile-edge: #2A3550;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 15px; line-height: 1.55; margin: 0; }
.wrap { max-width: 1120px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2, h3 { text-wrap: balance; margin: 0; }
p { margin: 0; }
svg { display: block; max-width: 100%; height: auto; }

.hero { padding-block: 56px 40px; display: grid; gap: 28px; border-bottom: 1px solid var(--line); }
.hero-logo { width: min(420px, 100%); }
.hero h1 { font-size: clamp(26px, 3.4vw, 36px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; max-width: 22ch; }
.hero p { color: var(--muted); max-width: 62ch; font-size: 16px; }
.hero .key { display: flex; flex-wrap: wrap; gap: 8px 18px; font-family: var(--mono); font-size: 13px; color: var(--muted); }
.hero .key span { display: inline-flex; align-items: center; gap: 8px; }
.hero .key i { width: 14px; height: 14px; border-radius: 4px; display: inline-block; box-shadow: inset 0 0 0 1px var(--line); }

section { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 32px; padding-block: 48px; border-bottom: 1px solid var(--line); }
section > header h2 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
section > header p { color: var(--muted); margin-top: 8px; font-size: 14px; max-width: 34ch; }
.label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }

.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.tile { border-radius: 16px; padding: 36px 28px; display: grid; gap: 18px; align-content: space-between; min-height: 168px; border: 1px solid transparent; }
.tile svg { width: min(300px, 100%); }
.tile .label { color: inherit; }
.tile.wide { grid-column: 1 / -1; }
.t-white { background: #FFFFFF; border-color: var(--line); color: #4B5565; }
.t-ink { background: #0E1726; color: #AEB7C8; border-color: var(--tile-edge); }
.t-cobalt { background: #3448D6; color: #DCE2FF; }
.t-mist { background: #EEF1FF; color: #2836AE; }
.t-stacked { justify-items: center; text-align: center; }
.t-stacked svg { width: min(220px, 70%); }

.anatomy { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 32px; align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 32px; }
.anatomy ol { margin: 0; padding: 0; list-style: none; display: grid; gap: 16px; counter-reset: a; }
.anatomy li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; }
.anatomy li::before { counter-increment: a; content: counter(a); width: 26px; height: 26px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 800; font-size: 13px; display: grid; place-items: center; }
.anatomy b { display: block; font-weight: 700; }
.anatomy span { color: var(--muted); font-size: 14px; }

.group { display: grid; gap: 14px; }
.group + .group { margin-top: 32px; }
.group-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; }
.group-head h3 { font-size: 15px; font-weight: 800; }
.group-head p { color: var(--muted); font-size: 13.5px; }
.swatches { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 12px; }
.swatch { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: grid; grid-template-rows: 84px auto; }
.chip { display: block; border-bottom: 1px solid var(--line); }
.sw-body { padding: 12px 14px 14px; display: grid; gap: 2px; align-content: start; }
.sw-name { font-weight: 700; font-size: 14px; }
.hex { justify-self: start; font-family: var(--mono); font-size: 13px; color: var(--accent); background: none; border: 0; padding: 2px 0; cursor: pointer; border-radius: 4px; }
.hex:hover { text-decoration: underline; }
.hex:focus-visible, .copy-all:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.hex.copied::after { content: "  copied"; color: var(--faint); font-family: var(--font); font-size: 12px; }
.sw-use { color: var(--muted); font-size: 12.5px; line-height: 1.4; margin-top: 4px; }
.copy-all { margin-top: 18px; font: 600 13px var(--font); color: var(--accent); background: var(--accent-soft); border: 0; border-radius: 10px; padding: 9px 14px; cursor: pointer; }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; }
table { border-collapse: collapse; width: 100%; min-width: 460px; font-size: 14px; }
th, td { text-align: left; padding: 11px 16px; border-bottom: 1px solid var(--line); }
tr:last-child td { border-bottom: 0; }
th { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
td.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.sample { display: inline-block; padding: 6px 10px; border-radius: 8px; font-weight: 700; font-variant-numeric: tabular-nums; border: 1px solid rgba(127, 127, 127, 0.18); }
.level { font-size: 12px; font-weight: 700; color: var(--accent); background: var(--accent-soft); padding: 2px 8px; border-radius: 999px; }

/* Specimen of the palette in the product. Fixed light colours: it shows the app, not the page theme. */
.demo { background: #F5F7FB; border: 1px solid var(--line); border-radius: 16px; padding: 22px; color: #0E1726; display: grid; gap: 14px; }
.demo-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.demo-bar svg { width: 132px; }
.demo-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.btn { font: 700 13.5px var(--font); border-radius: 10px; padding: 9px 14px; color: #FFFFFF; display: inline-flex; align-items: center; gap: 6px; }
.btn-cobalt { background: #3448D6; } .btn-got { background: #0C7D56; } .btn-gave { background: #C93139; }
.card { background: #FFFFFF; border: 1px solid #E3E7EF; border-radius: 14px; }
.totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.totals div { padding: 14px 18px; display: grid; gap: 2px; }
.totals div + div { border-left: 1px solid #E3E7EF; }
.totals small { color: #667085; font-size: 12.5px; font-weight: 600; }
.totals strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.rows { list-style: none; margin: 0; padding: 0; }
.rows li { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 16px; border-top: 1px solid #E3E7EF; }
.rows li:first-child { border-top: 0; }
.avatar { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-weight: 800; font-size: 13px; background: #EEF1FF; color: #2836AE; }
.who b { display: block; font-size: 14px; }
.who small { color: #667085; font-size: 12.5px; }
.amt { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; font-size: 14.5px; }
.amt small { display: block; font-size: 11.5px; font-weight: 600; }
.got { color: #0C7D56; } .gave { color: #C93139; }
.new { background: #FFF1D6; color: #8A4D00; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 999px; margin-left: 6px; vertical-align: 1px; }
.rows li.is-new { background: linear-gradient(90deg, rgba(246, 174, 45, 0.16), rgba(246, 174, 45, 0) 60%); }

.icons { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.icon-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: grid; gap: 14px; justify-items: center; text-align: center; align-content: start; }
.icon-card svg { width: 104px; }
.icon-card small { color: var(--muted); font-size: 12.5px; line-height: 1.4; }
.mask { position: relative; width: 104px; }
.mask::after { content: ""; position: absolute; inset: 10%; border-radius: 50%; border: 1.5px dashed #F6AE2D; }
.round svg { border-radius: 50%; }
.favs { display: flex; align-items: flex-end; gap: 16px; min-height: 104px; }
.favs svg { width: auto; }
.social { margin-top: 14px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
.social svg { width: 100%; }

.rules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.rule { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: grid; gap: 10px; }
.rule h3 { font-size: 15px; font-weight: 800; }
.rule p { color: var(--muted); font-size: 14px; }
.clear { background: #FFFFFF; border-radius: 10px; padding: 18px; display: grid; place-items: center; }
.clear div { outline: 1.5px dashed #F6AE2D; outline-offset: 0; padding: 14px; }
.clear svg { width: 190px; }
.donts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.dont { display: grid; gap: 8px; }
.dont .box { border-radius: 12px; height: 96px; display: grid; place-items: center; padding: 14px; overflow: hidden; background: #FFFFFF; border: 1px solid var(--line); }
.dont .box svg { width: 100%; max-width: 150px; }
.dont p { font-size: 13px; color: var(--muted); }
.dont p b { color: var(--warn); }
.d-stretch svg { transform: scaleX(1.25) scaleY(0.8); max-width: 112px !important; }
.d-contrast { background: #2836AE !important; border-color: #2836AE !important; }
.d-effects svg { filter: drop-shadow(3px 4px 0 #F6AE2D) drop-shadow(0 0 6px rgba(14, 23, 38, 0.45)); }

.files { font-family: var(--mono); font-size: 13px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; overflow-x: auto; white-space: pre; line-height: 1.7; color: var(--muted); }
.files b { color: var(--fg); font-weight: 500; }
footer { padding-block: 32px 48px; color: var(--faint); font-size: 13px; }
footer a { color: var(--accent); }

@media (max-width: 860px) {
  section { grid-template-columns: minmax(0, 1fr); gap: 20px; padding-block: 36px; }
  section > header p { max-width: 60ch; }
  .anatomy { grid-template-columns: minmax(0, 1fr); }
  .anatomy svg { width: 200px; }
  .donts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .icons { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .tiles, .rules { grid-template-columns: minmax(0, 1fr); }
  .tile { padding: 28px 20px; min-height: 0; }
  .totals strong { font-size: 17px; }
}
@media (prefers-reduced-motion: no-preference) {
  .hex { transition: color 0.15s; }
}
'''

BODY = '''
<div class="wrap">
  <div class="hero">
    {hero_logo}
    <h1>Cash in, cash out. One row at a time.</h1>
    <p>The Cashrow mark is a <strong>C</strong> for cash, cut into three ledger rows. The marigold middle row is the newest entry. The wordmark is Plus Jakarta Sans ExtraBold: <strong>cash</strong> in ink, <strong>row</strong> in cobalt.</p>
    <div class="key" aria-label="Core colours">
      <span><i style="background:{cobalt600}"></i>Cobalt {cobalt600}</span>
      <span><i style="background:{marigold400}"></i>Marigold {marigold400}</span>
      <span><i style="background:{ink900}"></i>Ink {ink900}</span>
      <span><i style="background:{got600}"></i>Got {got600}</span>
      <span><i style="background:{gave600}"></i>Gave {gave600}</span>
    </div>
  </div>

  <section aria-labelledby="s-logo">
    <header><h2 id="s-logo">Logo</h2><p>Use the colour logo on light backgrounds. Switch to reversed on ink and to mono white on cobalt or photos.</p></header>
    <div class="tiles">
      <div class="tile t-white">{logo_color}<span class="label">Primary · on white or mist</span></div>
      <div class="tile t-ink">{logo_rev}<span class="label">Reversed · on ink</span></div>
      <div class="tile t-cobalt">{logo_mw}<span class="label">Mono white · on cobalt</span></div>
      <div class="tile t-mist">{logo_mi}<span class="label">Mono ink · one-colour print</span></div>
      <div class="tile t-white t-stacked wide">{stacked}<span class="label">Stacked · square spaces, splash screens</span></div>
    </div>
  </section>

  <section aria-labelledby="s-mark">
    <header><h2 id="s-mark">Mark</h2><p>The mark works alone wherever the name is already clear: app icon, favicon, avatar.</p></header>
    <div class="anatomy">
      {mark_big}
      <ol>
        <li><div><b>A C for cash</b><span>A thick ring, open to the right like a coin with a slot, reads as C at any size.</span></div></li>
        <li><div><b>Three ledger rows</b><span>Two horizontal cuts turn the ring into rows of a cash book. The cuts stay open down to 16 px.</span></div></li>
        <li><div><b>The newest row</b><span>The middle row is marigold: the entry you just added. It is the only warm colour in the logo.</span></div></li>
      </ol>
    </div>
  </section>

  <section aria-labelledby="s-colour">
    <header><h2 id="s-colour">Colour</h2><p>Seventeen tokens in four groups. Select a hex code to copy it.</p></header>
    <div>
      {swatches}
      <button type="button" class="copy-all" id="copy-all">Copy all as CSS variables</button>
    </div>
  </section>

  <section aria-labelledby="s-contrast">
    <header><h2 id="s-contrast">Contrast</h2><p>Every text pairing passes WCAG AA. Marigold on white (1.91) is for shapes only.</p></header>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Sample</th><th scope="col">Pair</th><th scope="col">Ratio</th><th scope="col">WCAG</th></tr></thead>
        <tbody>{contrast}</tbody>
      </table>
    </div>
  </section>

  <section aria-labelledby="s-use">
    <header><h2 id="s-use">In the app</h2><p>Cobalt for the frame and actions, green and red only for money, marigold for what just changed.</p></header>
    <div class="demo" aria-label="Example of the palette in the Cashrow app">
      <div class="demo-bar">
        {logo_demo}
        <div class="demo-btns"><span class="btn btn-gave">Give cash</span><span class="btn btn-got">Get cash</span><span class="btn btn-cobalt">Add party</span></div>
      </div>
      <div class="card totals">
        <div><small>You got</small><strong class="got">₹38,450</strong></div>
        <div><small>You gave</small><strong class="gave">₹12,900</strong></div>
      </div>
      <ul class="card rows" role="list">
        <li class="is-new"><span class="avatar">RT</span><span class="who"><b>Ravi Traders <span class="new">NEW</span></b><small>Today · Cheque 004512</small></span><span class="amt got">₹12,500<small>You got</small></span></li>
        <li><span class="avatar">MS</span><span class="who"><b>Meena Stores</b><small>Yesterday · Stock refill</small></span><span class="amt gave">₹4,200<small>You gave</small></span></li>
        <li><span class="avatar">AK</span><span class="who"><b>Arjun Kirana</b><small>28 Oct · UPI</small></span><span class="amt got">₹9,750<small>You got</small></span></li>
      </ul>
    </div>
  </section>

  <section aria-labelledby="s-icons">
    <header><h2 id="s-icons">Icons</h2><p>One cobalt tile for every platform. The favicon has thicker rows so it stays legible at 16 px.</p></header>
    <div>
      <div class="icons">
        <div class="icon-card">{icon}<small>App icon<br>1024, 512, 192</small></div>
        <div class="icon-card"><div class="mask">{maskable}</div><small>Maskable (Android)<br>dashed: safe zone</small></div>
        <div class="icon-card round">{avatar}<small>Avatar<br>circle crop</small></div>
        <div class="icon-card"><div class="favs">{fav16}{fav32}{fav48}</div><small>Favicon at real size<br>16, 32, 48</small></div>
      </div>
      <div class="social">{social}</div>
    </div>
  </section>

  <section aria-labelledby="s-rules">
    <header><h2 id="s-rules">Rules</h2><p>Keep the logo clear, legible and in its own colours.</p></header>
    <div>
      <div class="rules">
        <div class="rule"><div class="clear"><div>{clear}</div></div><h3>Clear space</h3><p>Leave at least the height of the marigold row empty on every side.</p></div>
        <div class="rule"><h3>Minimum size</h3><p>Horizontal logo: 24 px tall on screen, 16 mm in print. Mark alone: 16 px. Below that, use the favicon.</p><h3>Backgrounds</h3><p>Colour logo on white, mist or cobalt 50. Reversed on ink. Mono white on cobalt and photos.</p></div>
      </div>
      <div class="donts">
        <div class="dont"><div class="box d-stretch">{dont_stretch}</div><p><b>Don’t</b> stretch or squash it.</p></div>
        <div class="dont"><div class="box">{dont_recolor}</div><p><b>Don’t</b> recolour the rows.</p></div>
        <div class="dont"><div class="box d-contrast">{dont_contrast}</div><p><b>Don’t</b> put the colour logo on cobalt.</p></div>
        <div class="dont"><div class="box d-effects">{dont_effects}</div><p><b>Don’t</b> add shadows or outlines.</p></div>
      </div>
    </div>
  </section>

  <section aria-labelledby="s-files">
    <header><h2 id="s-files">Files</h2><p>Everything lives in the <strong>brand/</strong> folder of the Cashrow repository.</p></header>
    <div class="files"><b>svg/</b>          vector masters: logo, reversed, mono, stacked, wordmark, mark, icons
<b>png/</b>          logo at 64 / 128 / 256 px tall, mark at 128 / 512
<b>app-icons/</b>    favicon.ico + .svg, icon 192 / 512 / 1024, maskable, apple-touch-icon, site.webmanifest
<b>social/</b>       1280 × 640 preview for GitHub and link cards
<b>tokens/</b>       colors.css, tailwind.css (v4 @theme), colors.json
<b>source/</b>       scripts that regenerate the kit</div>
  </section>

  <footer>Cashrow brand kit · <a href="https://github.com/vulrun/cashrow">github.com/vulrun/cashrow</a> · typeface Plus Jakarta Sans (SIL Open Font License)</footer>
</div>
'''

SCRIPT = '''
<script>
(function () {
  function copy(text, el) {
    var done = function () {
      if (!el) return;
      el.classList.add('copied');
      setTimeout(function () { el.classList.remove('copied'); }, 1400);
    };
    try {
      navigator.clipboard.writeText(text).then(done, function () { select(el); });
    } catch (e) { select(el); }
  }
  function select(el) {
    if (!el) return;
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  document.querySelectorAll('.hex').forEach(function (b) {
    b.addEventListener('click', function () { copy(b.dataset.hex, b); });
  });
  var all = document.getElementById('copy-all');
  if (all) all.addEventListener('click', function () {
    var lines = [':root {'];
    document.querySelectorAll('.swatch').forEach(function (s) {
      var name = s.querySelector('.sw-name').textContent.toLowerCase().replace(/\\s+/g, '-');
      lines.push('  --cr-' + name + ': ' + s.querySelector('.hex').dataset.hex + ';');
    });
    lines.push('}');
    var text = lines.join('\\n');
    try {
      navigator.clipboard.writeText(text).then(function () {
        all.textContent = 'Copied ' + (lines.length - 2) + ' variables';
        setTimeout(function () { all.textContent = 'Copy all as CSS variables'; }, 1600);
      }, function () { all.textContent = 'Copy blocked: use tokens/colors.css'; });
    } catch (e) { all.textContent = 'Copy blocked: use tokens/colors.css'; }
  });
})();
</script>
'''


def main():
    os.makedirs(os.path.join(HERE, 'page'), exist_ok=True)
    with open(os.path.join(KIT, 'brand-guide.html'), 'w') as fh:
        fh.write(page(full=True))
    with open(os.path.join(HERE, 'page', 'cashrow-brand.html'), 'w') as fh:
        fh.write(page(full=False))
    print('pages written')


if __name__ == '__main__':
    main()
