from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

repo = Path(__file__).resolve().parents[1]
public = repo / 'public'
public.mkdir(exist_ok=True)

svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Dad's Bitcoin favicon">
  <defs>
    <radialGradient id="bg" cx="35%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#24103f"/>
      <stop offset="48%" stop-color="#090019"/>
      <stop offset="100%" stop-color="#020006"/>
    </radialGradient>
    <linearGradient id="coin" x1="120" y1="90" x2="390" y2="420" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff1a6"/>
      <stop offset="45%" stop-color="#f5c518"/>
      <stop offset="100%" stop-color="#b86b00"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.00 0 0 0 0 0.96 0 0 0 0 0.83 0 0 0 .85 0" result="cyan"/>
      <feMerge><feMergeNode in="cyan"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M84 386 C148 334 211 381 270 326 C329 271 361 294 428 250" fill="none" stroke="#c084fc" stroke-width="20" stroke-linecap="round" opacity=".45"/>
  <path d="M70 142 C136 189 190 129 250 174 C306 216 354 175 442 117" fill="none" stroke="#00f5d4" stroke-width="18" stroke-linecap="round" opacity=".55"/>
  <circle cx="256" cy="256" r="154" fill="none" stroke="#00f5d4" stroke-width="18" opacity=".92" filter="url(#glow)"/>
  <circle cx="256" cy="256" r="124" fill="url(#coin)" stroke="#fff0a6" stroke-width="10"/>
  <circle cx="256" cy="256" r="92" fill="none" stroke="#8c4d00" stroke-width="7" opacity=".5"/>
  <rect x="216" y="148" width="16" height="216" rx="6" fill="#fff4b8"/>
  <rect x="238" y="148" width="16" height="216" rx="6" fill="#fff4b8"/>
  <text x="268" y="320" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="172" font-weight="900" fill="#190707" stroke="#fff4b8" stroke-width="5">B</text>
</svg>
'''
(public / 'favicon.svg').write_text(svg)

font_candidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial Bold.ttf',
]
font_path = next((p for p in font_candidates if Path(p).exists()), None)

def font(size: int):
    if font_path:
        return ImageFont.truetype(font_path, size)
    return ImageFont.load_default()

def render(size: int) -> Image.Image:
    scale = size / 512
    img = Image.new('RGBA', (size, size), (7, 0, 20, 255))
    px = img.load()

    for y in range(size):
        for x in range(size):
            dx = (x - size * .35) / (size * .85)
            dy = (y - size * .25) / (size * .85)
            dist = min(1, math.sqrt(dx * dx + dy * dy))
            if dist < .48:
                t = dist / .48
                c0, c1 = (36, 16, 63), (9, 0, 25)
            else:
                t = (dist - .48) / .52
                c0, c1 = (9, 0, 25), (2, 0, 6)
            px[x, y] = tuple(int(c0[i] * (1 - t) + c1[i] * t) for i in range(3)) + (255,)

    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(112 * scale), fill=255)
    img.putalpha(mask)

    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    ring = [int(102 * scale), int(102 * scale), int(410 * scale), int(410 * scale)]
    gd.ellipse(ring, outline=(0, 245, 212, 180), width=max(2, int(26 * scale)))
    glow = glow.filter(ImageFilter.GaussianBlur(max(1, int(12 * scale))))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)

    d.arc([int(48 * scale), int(72 * scale), int(470 * scale), int(340 * scale)], 194, 340, fill=(0, 245, 212, 145), width=max(1, int(16 * scale)))
    d.arc([int(42 * scale), int(180 * scale), int(465 * scale), int(490 * scale)], 198, 340, fill=(192, 132, 252, 120), width=max(1, int(18 * scale)))
    d.ellipse(ring, outline=(0, 245, 212, 235), width=max(2, int(18 * scale)))

    coin = [int(132 * scale), int(132 * scale), int(380 * scale), int(380 * scale)]
    d.ellipse(coin, fill=(245, 197, 24, 255), outline=(255, 240, 166, 255), width=max(2, int(10 * scale)))
    inner = [int(164 * scale), int(164 * scale), int(348 * scale), int(348 * scale)]
    d.ellipse(inner, outline=(140, 77, 0, 135), width=max(1, int(7 * scale)))

    # Draw a simplified Bitcoin mark manually: a bold B plus vertical bars.
    # This stays recognizable at 16px/32px better than relying on the ₿ glyph.
    f = font(int(170 * scale))
    text = 'B'
    stroke = max(1, int(5 * scale))
    box = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
    tw, th = box[2] - box[0], box[3] - box[1]
    x = (size - tw) / 2 - box[0] + int(8 * scale)
    y = (size - th) / 2 - box[1] + int(7 * scale)

    bar_w = max(1, int(13 * scale))
    bar_x1 = int(213 * scale)
    bar_x2 = int(234 * scale)
    for bx in (bar_x1, bar_x2):
        d.rounded_rectangle(
            [bx, int(151 * scale), bx + bar_w, int(361 * scale)],
            radius=max(1, int(5 * scale)),
            fill=(255, 244, 184, 255),
        )
        inset = max(0, int(3 * scale))
        inner_left = bx + inset
        inner_right = bx + bar_w - inset
        if inner_right >= inner_left:
            d.rounded_rectangle(
                [inner_left, int(158 * scale), inner_right, int(354 * scale)],
                radius=max(0, int(3 * scale)),
                fill=(93, 47, 0, 255),
            )

    d.text((x, y), text, font=f, fill=(24, 7, 7, 255), stroke_width=stroke, stroke_fill=(255, 244, 184, 255))
    return img

for name, size in [
    ('favicon-16x16.png', 16),
    ('favicon-32x32.png', 32),
    ('favicon-192x192.png', 192),
    ('apple-touch-icon.png', 180),
    ('favicon-512x512.png', 512),
]:
    render(size).save(public / name)

render(512).save(public / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

(public / 'site.webmanifest').write_text('''{
  "name": "Dad's Bitcoin",
  "short_name": "Dad BTC",
  "icons": [
    { "src": "/favicon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#070014",
  "background_color": "#070014",
  "display": "standalone"
}
''')

print('created favicon assets in', public)
for p in sorted(public.iterdir()):
    print(p.name, p.stat().st_size)
