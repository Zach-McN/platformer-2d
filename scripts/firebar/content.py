# generatedBy: claude-fable-5-1, generatedAt: 2026-09-02
#
# Writes prefabs/fire-bar.json: a used block with an arm that turns and three flames riding
# the arm — the spec's *Fire bar*, as one prefab with parts (editor-kernel D25). The block's
# texture and the flame's are read from their .meta files, so re-running art.py and then this
# re-points the prefab. Refuses to overwrite an existing prefab without --force, because the
# editor's Parts section is where it is meant to be tuned afterwards.
# Run from the game folder:  python scripts/firebar/content.py [--force]
import sys, os, json, secrets
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.normpath(os.path.join(HERE, '..', '..')) + '/'
GEN = {'generatedBy': 'claude-fable-5-1', 'generatedAt': '2026-09-02'}
def hexid(): return secrets.token_hex(8)

def texture(rel):
    meta = json.load(open(G + 'assets/textures/' + rel + '.meta', encoding='utf-8'))
    return {'texture': {'id': meta['id'], 'path': 'assets/textures/' + rel}}

OUT = G + 'prefabs/fire-bar.json'
if os.path.exists(OUT) and '--force' not in sys.argv:
    print('prefabs/fire-bar.json exists; pass --force to rewrite it (the editor is where it is tuned)')
    sys.exit(1)

block = texture('tiles/used-block.png')
fire = texture('tiles/fire.png')
prefab = {
    'format': 'kernel2d.prefab',
    'version': 1,
    'id': hexid(),
    'name': 'Fire bar',
    'components': {'sprite': block, 'grid': {'tileSize': 16}, 'solid': {}},
    'children': [
        {'id': 'arm', 'name': 'Arm',
         'transform': {'x': 0, 'y': 0, 'rotation': 0, 'scaleX': 1, 'scaleY': 1},
         'components': {'spin': {'degreesPerSecond': 90}}},
    ] + [
        {'id': f'fire{n}', 'name': f'Fire {n}',
         'transform': {'x': 16 * n, 'y': 0, 'rotation': 0, 'scaleX': 1, 'scaleY': 1},
         'parent': 'arm',
         'components': {'sprite': fire, 'deadly': {}}}
        for n in (1, 2, 3)
    ],
    **GEN,
}
open(OUT, 'w', encoding='utf-8', newline='\n').write(json.dumps(prefab, indent=2) + '\n')
print('wrote prefabs/fire-bar.json id', prefab['id'])
