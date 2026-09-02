# generatedBy: claude-fable-5-1, generatedAt: 2026-09-01
#
# Draws the cave art, the next-level signpost and the NEXT LEVEL? card, with .meta sidecars,
# Re-running mints NEW texture ids in the .meta files, so run content.py --force after it to re-point the prefabs.
# Run from the game folder:  python scripts/cave/art.py
# Pure Python 3, no packages. Every file written carries a generatedBy marker.
import sys, os, json, secrets, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import png
G = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')) + '/'
T = G + 'assets/textures/'
GEN = {'generatedBy': 'claude-fable-5-1', 'generatedAt': '2026-09-01'}
def hexid(): return secrets.token_hex(8)
ids = {}
def save(rel, px, pivot=(0.5, 0.5)):
    path = T + rel
    os.makedirs(os.path.dirname(path), exist_ok=True)
    png.write(path, px)
    i = hexid(); ids[rel] = i
    meta = {'format': 'kernel2d.asset-meta', 'version': 1, 'id': i, 'type': 'texture',
            'importSettings': {'type': 'texture', 'filter': 'nearest', 'pivot': {'x': pivot[0], 'y': pivot[1]}, 'slice': {'mode': 'single'}}, **GEN}
    open(path + '.meta', 'w', newline='\n').write(json.dumps(meta, indent=2) + '\n')
    print('wrote', rel, len(px[0]), 'x', len(px))
def grid(rows, pal, alpha=255):
    out = []
    for r in rows:
        line = []
        for ch in r:
            if ch == '.': line.append((0, 0, 0, 0))
            else:
                c = pal[ch]; line.append((c[0], c[1], c[2], alpha))
        out.append(line)
    return out

# cool slate stone
STONE = {'0': (76, 72, 98), '1': (54, 50, 72), '2': (112, 108, 140), '3': (152, 148, 176), '4': (196, 194, 220), '5': (40, 36, 56)}

cave_top = grid([
    '3333433333343333',
    '2223322222222332',
    '2222222222222222',
    '2222222222222222',
    '5555555555555555',
    '0000000000000000',
    '0001100000000000',
    '0001100000000000',
    '0000000000000000',
    '0000000001110000',
    '0000000001110000',
    '0000000000000000',
    '0000000000000000',
    '0011000000000000',
    '0011000000000000',
    '0000000000000000'], STONE)
save('tiles/cave-top.png', cave_top)

cave_fill = grid([
    '5555555555555555',
    '0000000000000000',
    '0011100000000000',
    '0011100000000000',
    '0000000000000000',
    '0000000001110000',
    '0000000001110000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000110000000000',
    '0000110000000000',
    '0000000000011100',
    '0000000000011100',
    '0000000000000000',
    '0000000000000000'], STONE)
save('tiles/cave-fill.png', cave_fill)

# background gradient 16x304, top row = top of the scene
top = (34, 28, 58); bot = (10, 8, 20)
bg = [[(round(top[0] + (bot[0] - top[0]) * y / 303), round(top[1] + (bot[1] - top[1]) * y / 303), round(top[2] + (bot[2] - top[2]) * y / 303), 255)] * 16 for y in range(304)]
save('scenery/cave-bg.png', bg)

# stalactite 16x32, two spikes hanging, alpha 0.8 like the tree
stal = grid([
    '.333322222..3222',
    '.333322222..3222',
    '..33222222..3222',
    '..33222222..3222',
    '..3322222...322.',
    '...322222...322.',
    '...322222...322.',
    '...32222....32..',
    '...32222....32..',
    '....3222....32..',
    '....3222....3...',
    '....3222....3...',
    '....322.........',
    '....322.........',
    '....322.........',
    '....32..........',
    '....32..........',
    '....32..........',
    '.....2..........',
    '.....2..........',
    '.....2..........',
    '.....2..........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'], STONE, 204)
save('scenery/stalactite.png', stal)

# stalagmite 16x16, near scenery, full opacity
stalag = grid([
    '................',
    '................',
    '................',
    '.....3..........',
    '.....32.........',
    '.....32.........',
    '....332.........',
    '....332.....3...',
    '....3322....32..',
    '....3322....32..',
    '...33222...332..',
    '...33222...332..',
    '...33222...3322.',
    '..332222...3322.',
    '..332222..33222.',
    '.3322222..33222.'], STONE)
save('scenery/stalagmite.png', stalag)

CRYS = {'a': (90, 222, 232), 'b': (190, 252, 255), 'c': (38, 150, 170), 'd': (24, 100, 118)}
crystal = grid([
    '................',
    '................',
    '.......b........',
    '......ba........',
    '......bac.......',
    '.....bbac.......',
    '.....baac....b..',
    '.....baacc..ba..',
    '..b..baacc..bac.',
    '.ba.bbaaac..bac.',
    '.bac.baaac.baac.',
    '.bac.baaac.baac.',
    '.bacbaaaacbbaacc',
    '.bacbaaaaccaaacc',
    'ddddddddddddddd.',
    '.dddddddddddddd.'], CRYS)
save('scenery/crystal.png', crystal)

MUSH = {'p': (146, 110, 232), 'q': (206, 184, 255), 'r': (224, 214, 244), 's': (178, 166, 206), 'w': (246, 246, 255), 'k': (88, 60, 150)}
mush = grid([
    '................',
    '................',
    '................',
    '....qqqqq.......',
    '...qpwppwq......',
    '..qppppppppq....',
    '..kppwpppppk....',
    '..kkkkkkkkkk.q..',
    '.....rrr....qpq.',
    '.....rsr...qpwpq',
    '.....rsr...kkkkk',
    '.....rsr....rsr.',
    '.....rsr....rsr.',
    '....rrsrr...rsr.',
    '....rrsrr..rrsrr',
    '................'], MUSH)
save('scenery/mushroom.png', mush)

# far pillar 32x64, alpha 0.45 like the hill
FAR = {'0': (96, 92, 118), '1': (122, 118, 148), '2': (70, 66, 88)}
rows = []
for y in range(64):
    w = 16 + int(3 * math.cos(y / 6.0)) + (4 if y < 4 or y > 58 else 0)
    l = (32 - w) // 2
    rows.append('.' * l + '1' * 3 + '0' * (w - 6) + '2' * 3 + '.' * (32 - l - w))
save('scenery/cave-pillar.png', grid(rows, FAR, 115))

# far boulder 64x48, alpha 0.45, a mound like the hill
rows = []
for y in range(48):
    t = y / 47.0
    half = int(32 * math.sqrt(max(0.0, 1 - (1 - t) ** 2)))
    l = 32 - half; r = 32 + half
    line = ['.'] * 64
    for x in range(l, r):
        line[x] = '1' if (x - l) < 3 or y < 3 else ('2' if (r - x) <= 3 else '0')
    rows.append(''.join(line))
save('scenery/boulder.png', grid(rows, FAR, 115))

# next-level marker 16x16: a signpost with a green arrow, editor-only
MARK = {'p': (125, 74, 5), 'b': (216, 177, 131), 'e': (195, 154, 99), 'g': (63, 174, 77), 'h': (127, 221, 138)}
mark = grid([
    '................',
    '.bbbbbbbbbbbbbe.',
    '.b...........be.',
    '.b...gg......be.',
    '.b...gggg....be.',
    '.bhgggggggg..be.',
    '.bhgggggggggbbe.',
    '.b...gggg....be.',
    '.b...gg......be.',
    '.bbbbbbbbbbbbbe.',
    '.eeeeeeeeeeeeee.',
    '.......pp.......',
    '.......pp.......',
    '.......pp.......',
    '.......pp.......',
    '.......pp.......'], MARK)
save('markers/next-level.png', mark)

# the prompt card, in the banner's own 3x5 font, read back out of banner-clear.png
w, h, bpx = png.read(T + 'ui/banner-clear.png')
CARD_COLOURS = {(22, 25, 36), (58, 64, 84)}
def glyph_at(x, y):
    return [''.join('1' if bpx[y + r][x + c][:3] not in CARD_COLOURS else '.' for c in range(3)) for r in range(5)]
font = {}
for ch, x in zip('PRESS R TO PLAY AGAIN', range(14, 14 + 4 * 21, 4)):
    if ch != ' ': font[ch] = glyph_at(x, 30)
for ch, x in zip('LEVEL CLEAR!', range(9, 9 + 8 * 12, 8)):
    if ch != ' ':
        font[ch] = [''.join('1' if bpx[4 + 2 * r][x + 2 * c][:3] == (130, 220, 120) else '.' for c in range(3)) for r in range(5)]
font['X'] = ['1.1', '1.1', '.1.', '1.1', '1.1']
font['?'] = ['111', '..1', '.11', '...', '.1.']
font[' '] = ['...'] * 5
for k in 'NEXTLVY?SO': print(k, font[k])
DARK = (22, 25, 36, 220); EDGE = (58, 64, 84, 220); GREEN = (130, 220, 120, 255); GREY = (170, 178, 196, 255); WHITE = (240, 244, 250, 255)
CW, CH = 112, 24
card = [[DARK] * CW for _ in range(CH)]
for x in range(CW): card[0][x] = EDGE; card[CH - 1][x] = EDGE
for y in range(CH): card[y][0] = EDGE; card[y][CW - 1] = EDGE
for (x, y) in [(0, 0), (CW - 1, 0), (0, CH - 1), (CW - 1, CH - 1)]: card[y][x] = (0, 0, 0, 0)
def text(s, x, y, scale, color):
    for ch in s:
        g = font[ch]
        for r in range(5):
            for c in range(3):
                if g[r][c] == '1':
                    for dy in range(scale):
                        for dx in range(scale): card[y + r * scale + dy][x + c * scale + dx] = color
        x += 4 * scale
    return x
title = 'NEXT LEVEL?'; tw = len(title) * 8 - 2
text(title, (CW - tw) // 2, 4, 2, GREEN)
line = [('Y', WHITE), (' YES', GREY), ('    ', GREY), ('N', WHITE), (' NO', GREY)]
lw = sum(len(s) for s, _ in line) * 4 - 1
x = (CW - lw) // 2
for s, col in line: x = text(s, x, 16, 1, col)
save('ui/prompt-next.png', card)
