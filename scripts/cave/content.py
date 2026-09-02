# generatedBy: claude-fable-5-1, generatedAt: 2026-09-01
#
# Writes the cave prefabs, the next-level prefab and component description, and generates
# scenes/level-02.json from the placement table below; adds the Next level marker to level 1 if absent.
# Run from the game folder:  python scripts/cave/content.py
# Pure Python 3, no packages. Every file written carries a generatedBy marker.

import json, os, secrets, sys
# Re-running rewrites prefabs, components/next.json and scenes/level-02.json with fresh prefab ids and
# the layout below — which throws away any edits Zach made to them in the editor. Say so:
if '--force' not in sys.argv:
    raise SystemExit('this rewrites level-02 and the cave prefabs from scratch; pass --force if that is what you want')

HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')) + '/'
GEN = {'generatedBy': 'claude-fable-5-1', 'generatedAt': '2026-09-01'}
def hexid(): return secrets.token_hex(8)
def dump(path, doc):
    open(G + path, 'w', newline='\n').write(json.dumps(doc, indent=2) + '\n')
def tex(rel): return {'texture': {'id': meta_id(rel), 'path': 'assets/textures/' + rel}}
def meta_id(rel):
    return json.load(open(G + 'assets/textures/' + rel + '.meta'))['id']

# ---- prefabs
prefabs = {}
def prefab(file, name, components):
    doc = {'format': 'kernel2d.prefab', 'version': 1, 'id': hexid(), 'name': name, 'components': components, **GEN}
    dump('prefabs/' + file, doc)
    prefabs[file] = doc['id']
    print('prefab', file, doc['id'])
GRID = {'grid': {'tileSize': 16}}
prefab('cave-top.json', 'Cave floor', {'sprite': tex('tiles/cave-top.png'), **GRID, 'solid': {}})
prefab('cave-fill.json', 'Cave rock', {'sprite': tex('tiles/cave-fill.png'), **GRID, 'solid': {}})
prefab('cave-dark.json', 'Cave dark', {'sprite': tex('scenery/cave-bg.png'), **GRID})
prefab('scenery-stalactite.json', 'Stalactite', {'sprite': tex('scenery/stalactite.png'), **GRID})
prefab('scenery-stalagmite.json', 'Stalagmite', {'sprite': tex('scenery/stalagmite.png'), **GRID})
prefab('scenery-crystal.json', 'Crystal', {'sprite': tex('scenery/crystal.png'), **GRID})
prefab('scenery-mushroom.json', 'Mushroom', {'sprite': tex('scenery/mushroom.png'), **GRID})
prefab('scenery-cave-pillar.json', 'Cave pillar', {'sprite': tex('scenery/cave-pillar.png'), **GRID})
prefab('scenery-boulder.json', 'Boulder', {'sprite': tex('scenery/boulder.png'), **GRID})
prefab('next-level.json', 'Next level', {
    'sprite': tex('markers/next-level.png'), **GRID,
    'next': {'scene': 'scenes/level-02.json'},
})

# ---- the Inspector's description of `next`
dump('components/next.json', {
    'format': 'kernel2d.component', 'version': 1, 'type': 'next', 'title': 'Next level',
    'note': 'Placed anywhere in a level, this marker is invisible in play and makes the win screen ask "Next level?" â€” Y goes to the level named here, N restarts this one. A level without one just wins.',
    'addable': True,
    'fields': [
        {'kind': 'scene', 'key': 'scene', 'label': 'Level', 'title': 'The level Y opens from this one\'s win screen.'},
    ],
    **GEN,
})

# ---- existing prefab ids, by file
existing = {}
for f in os.listdir(G + 'prefabs'):
    if f.endswith('.json'):
        existing[f] = json.load(open(G + 'prefabs/' + f))['id']

def ref(file):
    return {'prefab': {'source': {'id': existing[file], 'path': 'prefabs/' + file}}}
def ent(name, file, x, y, sx=1, sy=1):
    return {'id': hexid(), 'name': name, 'transform': {'x': x, 'y': y, 'rotation': 0, 'scaleX': sx, 'scaleY': sy}, 'components': ref(file)}
def cell(c, r): return (c * 16 + 8, r * 16 + 8)

# ---- level 2: the cave. Row 18 at the top, row 0 at the bottom; 64 columns.
grid = {}
def put(ch, c, r): grid[(c, r)] = ch
def run(ch, c0, c1, r):
    for c in range(c0, c1 + 1): put(ch, c, r)
# the cave: ceiling, floor with three pits, stepping platforms up to the roof coins
run('=', 0, 63, 18)
for c in (2, 7, 13, 19, 26, 33, 39, 45, 51, 57, 62): put('v', c, 17)
for c in range(64):
    if c in (15, 16, 17, 27, 28, 29, 48, 49, 50): continue
    put('#', c, 2); put('=', c, 1); put('=', c, 0)
put('S', 1, 3); put('x', 3, 3); put('m', 5, 3)
run('#', 6, 8, 5); put('o', 6, 7); put('o', 7, 8); put('o', 8, 7)
put('w', 11, 3); put('B', 11, 6); put('?', 12, 6); put('B', 13, 6); put('u', 14, 3)
put('u', 19, 3); put('T', 23, 3)
run('#', 20, 22, 5); put('o', 21, 7)
run('#', 24, 26, 8); put('o', 24, 10); put('o', 25, 11); put('o', 26, 10)
run('#', 28, 32, 11); put('o', 28, 13); put('o', 30, 14); put('o', 32, 13)
put('m', 31, 3); run('^', 33, 34, 3)
put('w', 37, 3); run('B', 36, 38, 6); put('o', 37, 8)
put('x', 40, 3); put('B', 40, 6); put('?', 41, 6); put('B', 42, 6); put('u', 42, 3); put('W', 44, 3)
run('#', 44, 47, 5); put('o', 45, 7); put('o', 46, 7)
run('#', 50, 52, 8); put('o', 50, 10); put('o', 51, 11); put('o', 52, 10)
run('#', 54, 56, 11); put('o', 54, 13); put('o', 55, 15); put('o', 56, 13)
put('m', 51, 3); put('t', 53, 3); run('^', 56, 58, 3); run('#', 55, 58, 5); put('u', 60, 3)
put('F', 61, 9); run('f', 61, 61, 3)
for r in range(3, 9): put('f', 61, r)
for r in range(18, -1, -1): print('%2d ' % r + ''.join(grid.get((c, r), '.') for c in range(64)))
print('   ' + ''.join(str(c % 10) for c in range(64)))

far, near, tiles, coins, deadly, goal, spawn, enemies = [], [], [], [], [], [], [], []
counts = {}
def add(bucket, name, file, c, r, x=None, y=None):
    counts[name] = counts.get(name, 0) + 1
    px, py = cell(c, r)
    bucket.append(ent(name, file, px if x is None else x, py if y is None else y))

for (c, r), ch in sorted(grid.items(), key=lambda kv: (-kv[0][1], kv[0][0])):
    if ch == '#': add(tiles, 'Cave floor', 'cave-top.json', c, r)
    elif ch == '=': add(tiles, 'Cave rock', 'cave-fill.json', c, r)
    elif ch == 'B': add(tiles, 'Brick', 'brick.json', c, r)
    elif ch == '?': add(tiles, '? Block', 'quest-block.json', c, r)
    elif ch == 'o': add(coins, 'Coin', 'coin.json', c, r)
    elif ch == '^': add(deadly, 'Spike', 'spike.json', c, r)
    elif ch == 'F': add(goal, 'Flag', 'flag-top.json', c, r)
    elif ch == 'f': add(goal, 'Flag pole', 'flag-pole.json', c, r)
    elif ch == 'S': add(spawn, 'Spawn', 'spawn.json', c, r)
    elif ch == 'w': add(enemies, 'Walker', 'walker.json', c, r)
    elif ch == 'W': add(enemies, 'Walker (fast)', 'walker-fast.json', c, r)
    elif ch == 't': add(enemies, 'Turtle', 'turtle.json', c, r)
    elif ch == 'T': add(enemies, 'Turtle (slow)', 'turtle-slow.json', c, r)
    elif ch == 'v': add(near, 'Stalactite', 'scenery-stalactite.json', c, r, y=18 * 16 - 16)  # hangs from the ceiling's underside
    elif ch == 'm': add(near, 'Stalagmite', 'scenery-stalagmite.json', c, r)
    elif ch == 'x': add(near, 'Crystal', 'scenery-crystal.json', c, r)
    elif ch == 'u': add(near, 'Mushroom', 'scenery-mushroom.json', c, r)
    else: raise SystemExit('unknown ' + ch)

# far scenery: pillars and boulders standing on the floor, drawn faded behind everything
for c in (5, 22, 41, 57):
    add(far, 'Cave pillar', 'scenery-cave-pillar.json', c, 0, x=c * 16 + 8, y=3 * 16 + 32)   # 64 tall, base on the floor top
for c in (12, 35, 52):
    add(far, 'Boulder', 'scenery-boulder.json', c, 0, x=c * 16 + 8, y=3 * 16 + 24)          # 48 tall, base on the floor top

entities = [ent('Cave dark', 'cave-dark.json', 512, 152, sx=64)] + far + near + tiles + coins + deadly + goal + spawn + enemies
entities.append(ent('Coin counter', 'hud-coins.json', -19, -10))
entities.append(ent('Controls hint', 'hud-hint.json', 46, 24))
dump('scenes/level-02.json', {'format': 'kernel2d.scene', 'version': 1, 'entities': entities, **GEN})
print('level-02 entities', len(entities), counts)

# ---- the prompt card rides the coin counter with the other banners
hud = json.load(open(G + 'prefabs/hud-coins.json'))
hud['components']['hud']['banners']['next'] = tex('ui/prompt-next.png')
dump('prefabs/hud-coins.json', hud)

# ---- level 1 gains the marker, placed on the ground just past the flag
path = G + 'scenes/level-01.json'
raw = open(path).read()
doc = json.loads(raw)
assert json.dumps(doc, indent=2) + '\n' == raw, 'level-01 is not in the formatting the editor writes; refusing to rewrite it'
if not any(e['name'] == 'Next level' for e in doc['entities']):
    at = next(i for i, e in enumerate(doc['entities']) if e['name'] == 'Spawn') + 1
    x, y = cell(61, 3)
    doc['entities'].insert(at, ent('Next level', 'next-level.json', x, y))
    dump('scenes/level-01.json', doc)
    print('level-01: Next level marker added after Spawn')
