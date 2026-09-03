# generatedBy: claude-fable-5-1, generatedAt: 2026-09-02
#
# Draws the fire bar's flame — one 16-pixel fireball in the game's palette — with its .meta
# sidecar, the same way scripts/cave/art.py drew the cave. Re-running mints a NEW texture id in
# the .meta, so the prefab that points at it must be re-pointed afterwards (the editor's texture
# picker on the part does that; or edit prefabs/fire-bar.json).
# Run from the game folder:  python scripts/firebar/art.py
# Pure Python 3, no packages. Every file written carries a generatedBy marker.
import sys, os, json, secrets
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'cave'))
import png
G = os.path.normpath(os.path.join(HERE, '..', '..')) + '/'
T = G + 'assets/textures/'
GEN = {'generatedBy': 'claude-fable-5-1', 'generatedAt': '2026-09-02'}
def hexid(): return secrets.token_hex(8)

def save(rel, px, pivot=(0.5, 0.5)):
    path = T + rel
    os.makedirs(os.path.dirname(path), exist_ok=True)
    png.write(path, px)
    i = hexid()
    meta = {'format': 'kernel2d.asset-meta', 'version': 1, 'id': i, 'type': 'texture',
            'importSettings': {'type': 'texture', 'filter': 'nearest',
                               'pivot': {'x': pivot[0], 'y': pivot[1]},
                               'slice': {'mode': 'single'}}, **GEN}
    open(path + '.meta', 'w', newline='\n').write(json.dumps(meta, indent=2) + '\n')
    print('wrote', rel, len(px[0]), 'x', len(px), 'id', i)

def grid(rows, pal):
    out = []
    for r in rows:
        line = []
        for ch in r:
            if ch == '.': line.append((0, 0, 0, 0))
            else:
                c = pal[ch]; line.append((c[0], c[1], c[2], 255))
        out.append(line)
    return out

# A fireball: a hot white core, yellow, orange, a red rim — round, so it reads the same at
# every angle the arm turns it to.
FIRE = {'w': (255, 244, 214), 'y': (255, 214, 64), 'o': (255, 140, 32), 'r': (208, 56, 24)}
fire = grid([
    '................',
    '................',
    '......rrrr......',
    '....rrooooorr...',
    '...rooooyyoor...',
    '...royyyyyyor...',
    '..rooyywwyyoor..',
    '..royywwwwyyor..',
    '..royywwwwyyor..',
    '..rooyywwyyoor..',
    '...royyyyyyor...',
    '...rooyyyyoor...',
    '....rroooorr....',
    '......rrrr......',
    '................',
    '................'], FIRE)
save('tiles/fire.png', fire)
