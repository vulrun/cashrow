"""Exports PNG / ICO / manifest files from the SVG sources in kit/svg."""
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

sys.argv = [sys.argv[0], os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit')]
import build  # noqa: E402  (regenerates nothing on import; main() is guarded)

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.join(HERE, 'kit')
SVG = os.path.join(KIT, 'svg')


def png(src, dst, width=None, height=None, bg=None):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ['rsvg-convert', src, '-o', dst]
    if width:
        cmd += ['-w', str(width)]
    if height:
        cmd += ['-h', str(height)]
    if bg:
        cmd += ['-b', bg]
    subprocess.run(cmd, check=True)


def main():
    build.main()

    # Extra icon sources: full-bleed square for iOS (it applies its own rounded mask).
    build.write('svg/apple-touch-icon.svg', build.svg(1024, 1024, build.app_icon(1024, maskable=True, mark_ratio=0.64), 'Cashrow'))
    # Square tile without rounded corners, for avatars (GitHub org, social profiles) that crop to a circle.
    build.write('svg/cashrow-avatar.svg', build.svg(1024, 1024, build.app_icon(1024, maskable=True, mark_ratio=0.6), 'Cashrow'))

    out = lambda *p: os.path.join(KIT, *p)
    s = lambda name: os.path.join(SVG, name)

    # Logos: height-based sizes so lockups line up in docs.
    for name in ['cashrow-logo', 'cashrow-logo-reversed', 'cashrow-logo-mono-ink', 'cashrow-logo-mono-white']:
        for h in (64, 128, 256):
            png(s(f'{name}.svg'), out('png', 'logo', f'{name}-{h}h.png'), height=h)
    for h in (256, 512):
        png(s('cashrow-logo-stacked.svg'), out('png', 'logo', f'cashrow-logo-stacked-{h}h.png'), height=h)
    png(s('cashrow-wordmark.svg'), out('png', 'logo', 'cashrow-wordmark-128h.png'), height=128)

    for name in ['cashrow-mark', 'cashrow-mark-reversed', 'cashrow-mark-mono']:
        for h in (128, 512):
            png(s(f'{name}.svg'), out('png', 'mark', f'{name}-{h}.png'), height=h)

    # App and web icons.
    icons = out('app-icons')
    for size in (1024, 512, 192):
        png(s('cashrow-app-icon.svg'), os.path.join(icons, f'icon-{size}.png'), width=size)
    for size in (512, 192):
        png(s('cashrow-app-icon-maskable.svg'), os.path.join(icons, f'icon-maskable-{size}.png'), width=size)
    png(s('apple-touch-icon.svg'), os.path.join(icons, 'apple-touch-icon.png'), width=180)
    png(s('cashrow-avatar.svg'), os.path.join(icons, 'avatar-500.png'), width=500)
    for size in (16, 32, 48):
        png(s('favicon.svg'), os.path.join(icons, f'favicon-{size}.png'), width=size)
    shutil.copy(s('favicon.svg'), os.path.join(icons, 'favicon.svg'))
    # Multi-size .ico, each size rendered from the SVG (not downscaled from one bitmap).
    frames = [Image.open(os.path.join(icons, f'favicon-{n}.png')).convert('RGBA') for n in (16, 32, 48)]
    frames[-1].save(os.path.join(icons, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[:-1])

    manifest = {
        'name': 'Cashrow',
        'short_name': 'Cashrow',
        'description': 'A cash book for every party, stored in your own Google Sheet.',
        'start_url': '.',
        'display': 'standalone',
        'background_color': build.C['mist'],
        'theme_color': build.C['cobalt600'],
        'icons': [
            {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icon-maskable-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
            {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }
    with open(os.path.join(icons, 'site.webmanifest'), 'w') as fh:
        fh.write(json.dumps(manifest, indent=2) + '\n')

    # Social preview (GitHub: Settings > General > Social preview, 1280 x 640).
    png(s('cashrow-social-preview.svg'), out('social', 'cashrow-social-preview.png'), width=1280)
    shutil.move(s('cashrow-social-preview.svg'), out('social', 'cashrow-social-preview.svg'))
    # Tailwind CSS v4 theme tokens (utilities like bg-cobalt-600, text-got-600).
    tw = {
        'cobalt-50': 'cobalt50', 'cobalt-100': 'cobalt100', 'cobalt-600': 'cobalt600', 'cobalt-700': 'cobalt700',
        'marigold-100': 'marigold100', 'marigold-400': 'marigold400', 'marigold-800': 'marigold800',
        'ink-900': 'ink900', 'slate-600': 'slate600', 'slate-500': 'slate500', 'line': 'line', 'mist': 'mist',
        'got-50': 'got50', 'got-600': 'got600', 'gave-50': 'gave50', 'gave-600': 'gave600',
    }
    lines = ['/* Cashrow colour tokens for Tailwind CSS v4. Import after "tailwindcss". */', '@theme {']
    lines += [f'  --color-{k}: {build.C[v]};' for k, v in tw.items()]
    lines += ['}', '']
    with open(out('tokens', 'tailwind.css'), 'w') as fh:
        fh.write('\n'.join(lines))
    print('exported')


if __name__ == '__main__':
    main()
