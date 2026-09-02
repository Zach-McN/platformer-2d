---
name: game-content
description: The component vocabulary and content conventions of platformer-2d — what the generated prefabs carry, what the names mean, and the units. Consult before writing any system in src/ that reads level data, before renaming a component, or before regenerating or replacing content.
---

<!-- generatedBy: claude-fable-5, generatedAt: 2026-08-14 -->

# game-content

Knowledge true of this game only (`genre-spinup` S2). The feel numbers themselves live in
`docs/REMAKE-PARITY.md`; this file is about how the *content* carries them.

## Decisions

### T1: The component vocabulary, as generated 2026-08-14

Invented at content-generation time; the systems in `src/` are written against these names.
All speeds are **units per second** (kernel convention, TD precedent) = the parity doc's
px-per-frame × 60.

| Component | On | Meaning |
|---|---|---|
| `solid: {}` | ground, brick, ?-block, used block, pipes | collides |
| `breakable: {}` | brick | shatters on head bump |
| `bonus: { coins: 1, used: { texture } }` | ?-block | pays out, then wears the used-block texture |
| `coin: {}` | coin | pickup |
| `deadly: {}` | spike | kills on contact |
| `goal: {}` | flag top and pole | touching wins |
| `spawn: {}` + `player: { frames: { idle, walk0–3, jump, fall } }` | spawn marker | where the ninja enters, carrying all seven ninja textures |
| `walker: { unitsPerSecond, squashed: { texture } }` | walker prefabs | patrol speed (33; fast variant 36) + death art |
| `turtle: { unitsPerSecond, shell: { texture } }` | turtle prefabs | patrol speed (30; slow variant 21) + shell art |
| `grid: { tileSize: 16 }` | everything placeable | snap unit for placement |
| `screen: { anchor }` + `hud: { digits, banners }` | the coin counter (`prefabs/hud-coins.json`) | pinned top-right (kernel `screen`, `editor-kernel` D32); carries the ten digit textures and both banner textures the hud spawns |
| `screen: { anchor }` + `hint: {}` | the controls hint (`prefabs/hud-hint.json`) | pinned bottom-left; the hud removes it on the first input |
| `next: { scene, prompt: { texture } }` | the next-level marker (`prefabs/next-level.json`, 2026-09-01) | the level Y opens from the win screen, and the "NEXT LEVEL? Y YES N NO" card; hidden in play (T9) |

### T2: Per-placement speed is a prefab variant, not an override

The reference's two per-placement speed props became `walker-fast.json` and
`turtle-slow.json`. The kernel has no instance-level component override and none was
needed — the tower defense's lesson (per-placement data keeps turning out to be
per-placement placement) held on first contact with another genre.

**Amended 2026-09-01 (see T8):** the kernel *does* have a per-placement override, and
always did — a placement carrying its own `walker` stops following the prefab's. What it
lacked was a way to author one, which is what describing the component gave us. Variants
remain the right answer for a speed the level uses more than once; an override is for the
one enemy that needs to be different.

### T3: Scenery distance-fade is baked into the pixels

Cloud 0.55, hill 0.45, tree 0.8 — the reference draws them with those opacities; the
shipped PNGs carry the fade in their alpha channel instead. Alpha compositing gives
identical pixels either way, and no renderer opacity feature had to exist. **Replacing
scenery art means re-baking the fade or accepting full opacity.**

### T4: State textures ride the prefab that needs them

Walker carries its squashed frame, turtle its shell, ?-block the used-block face, spawn the
ninja's seven frames — because `textureRefsOf` walks every `texture`-named field at any
depth, so art declared this way ships with the level and is loadable before systems spawn
anything mid-run.

### T6: The screen UI is generated art in a 3×5 pixel font, on prefabs, placed last

`assets/textures/ui/` (2026-08-15): ten digits (4×6, gold), the coin-counter card
(30×12), the two banners (OUCH!/RESPAWNING… 80×28; LEVEL CLEAR!/COINS:/PRESS R… 112×40)
and the controls hint (83×40), all drawn by a throwaway generator with a 3×5 uppercase
font and the reference's gold-on-dark palette. The counter and hint are the last two
entities in `level-01.json`, so they draw over everything. Text is baked into the cards
because the kernel has no text renderer and needs none: the only text that changes (the
coin count) is composed from the digit textures at run time.

### T7: A particle is a square of solid colour, and its colour rides the prefab that throws it

`assets/textures/fx/` (2026-08-15): eight PNGs. Seven are a filled square of one colour at the exact size the reference draws it — sparkle cream and gold at 2×2, four puffs at 3×3 (each enemy's stomp colour and its *darker* knock-out colour, which is a distinction easy to miss and named in §7), the brick's dust at 2×2. The eighth is `coin-flash.png`, a 15×15 cream cross one pixel thick, scaled from nothing to full over a spent pop-coin's last 14 frames — the remake's stand-in for two rectangles the reference draws in screen space, and the only piece of art here that is an approximation rather than a match. There is nothing to draw: the reference fills a rectangle in a colour, so the art *is* the colour and the size, and at scale 1 a 2×2 PNG is 2×2 scene units because the grid is 16 on both sides.

Each hangs on the prefab that throws it, which is T4 applied again: `coin` carries `sparkle: { cream, gold }`, `breakable` carries `dust`, and both patrol components carry `puff` and `knockPuff`. So the level ships the art it can possibly need, loaded before any of it is spawned mid-run — and a prefab that carries none simply throws none, which is how a test asks for a coin with no sparkle.

**Fade is not baked into these**, unlike the scenery's (T3): a particle's faintness changes every frame, so it is the kernel's `opacity` (`editor-kernel` D34) rather than a ladder of pre-faded pixels. Which means these five files stay five files however many fade steps a particle passes through.

### T8: Enemy speed is authored in the Inspector, via `components/`

`components/walker.json` and `components/turtle.json` (2026-09-01) describe the one field
worth a human's hands — `unitsPerSecond` — so selecting a walker or a turtle in a level
gives a **Speed** box beside Position. Nothing about the prefabs, the level or
`src/systems/enemies.ts` changed to earn that; the kernel reads the description and draws
what it says.

Only the speed is described. The rest of what these components carry (`squashed`, `shell`,
`puff`, `knockPuff`) is nested `{ texture }` objects, and the description format's fields
are flat — and it allows one texture-keyed asset field per component, which four nested
ones could not be. Those keys are untouched by the panel: `ComponentFields` spreads rather
than replaces, so a placement given its own speed keeps every key the description never
mentions.

`min` is **1**, not 0, because `roles.ts` reads a rate of `<= 0` as "no component at all" —
an enemy typed down to zero would stop being an enemy and start being a sprite, silently.
The panel is not allowed to write a value its own system discards.

**Add on a placed enemy copies the prefab's whole component, and it has to** (kernel fix,
2026-09-01, `editor-ui` U47). Before that it wrote `{ unitsPerSecond: 33 }` alone, and a
placement's own component beats the prefab's *whole* — so the first walker given its own
speed lost its `squashed` art and the first turtle its `shell`: the stomp still happened in
the state machine and nothing changed on screen. A placement given its own speed **before
that fix** is still missing those keys in the level file: press Remove on it (it goes back to
inheriting) and Add again (it now copies), then retype the speed.

### T9: Level 2 is the same vocabulary under a cave palette, and "where next" is a placed marker

`scenes/level-02.json` (2026-09-01) was generated from a 64×19 placement script the same
way level 1 was from `LEVEL_DATA` — every entity a prefab reference on the 16-grid, in T5's
draw order: backdrop first, far scenery, near scenery, tiles, coins, spikes, flag, spawn,
enemies, counter and hint last. Nothing in `src/` knows there is a second level; the cave is
ten new prefabs and eleven PNGs in the existing style, and every gameplay noun is level 1's
prefab reused.

- **Cave floor / cave rock** (`prefabs/cave-top.json`, `cave-fill.json`) are `solid` twins of
  ground top/fill in a slate palette, and the level has a solid **ceiling row** of cave rock
  at row 18 — the first level with a roof, which the tile system needed nothing for: a
  ceiling is a solid the head bumps, and the bump thuds like any block (`ninja.ts`).
- **Cave dark** (`scenery/cave-bg.png`, 16×304) is the sky's shape exactly (TG1): sized to the
  level's height, scaled 64 wide, first in the list. The fit and the framing read the drawn
  extent, so a backdrop must stay level-sized.
- **Scenery fades are baked** as T3 says: stalactite at 0.8 like the tree, cave pillar and
  boulder at 0.45 like the hill; stalagmite, crystal and mushroom at 1 like the bush. The
  stalactite is 16×32 and placed with its centre 16 below the ceiling's underside (y 272),
  so it hangs from the rock rather than floating in it.
- **The next-level marker** (`prefabs/next-level.json`, `components/next.json`) is the spawn
  marker's pattern for the *end* of a level: editor furniture carrying run-time data. It
  wears a signpost in the editor, carries `next: { scene, prompt: { texture } }`, and the hud
  hides it the moment play starts (`game-code` C11). The scene is a **`scene` field**, keyed
  `scene` because `text-formats` T20 walks for that key — so an export ships level 2
  because level 1 points at it, with no export change. The prompt card rides the marker
  (T4) so it is loaded with the level. `addable` is false for T8's reason: the component
  carries a nested texture the panel cannot author, so a placement gets it whole from the
  prefab or not at all.
- **Level 1 gained one entity** — a Next level marker on the ground past the flag, at
  (61, 3) — and nothing else; its layout and Zach's own placements are untouched.
- **The prompt card** (`ui/prompt-next.png`, 112×24) is drawn in the banner's own 3×5 font,
  read back out of `banner-clear.png` pixel by pixel rather than from a font file that no
  longer exists (T6's generator was a throwaway). The two glyphs the banners never used — X
  and ? — were drawn to match. **The card is the banner's width so it reads as one screen.**

Level 2 is content, not contract: `docs/REMAKE-PARITY.md` scopes itself to level 1, and
the cave's layout is the spec's (*Level 2 — the cave*) and Zach's to change in the editor.

### T5: Draw order is scene list order, in the reference's passes

Far scenery (clouds, hills) → near scenery (trees, bushes, grass, fences) → gameplay
tiles → spawn and enemies. Adjacency variants (ground top/fill, pipe top/body, flag
top/pole) are separate prefabs picked at generation time; an author extending the level
picks the variant by eye.

## Gotchas

### TG1: ~~The sky is nobody's yet~~ — resolved: the sky is content, the level's first entity

The reference paints a vertical sky gradient (#6fb9ff → #b8e6ff) behind everything, and
the systems phase answered it with no kernel change: `assets/textures/scenery/sky.png`
(16×304, the gradient over exactly the level's 19-tile height), `prefabs/sky.json`, and a
`Sky` entity **first in the scene list** — first is rearmost (T5), and the reference's
screen-fixed gradient and a level-spanning one are identical pixels because the viewport
always spans the level's full height. **The sky is sized to the level exactly, and that
is load-bearing**: framing and the export's fit read the drawn extent, so an oversized
backdrop would change what "frame the level" means. `genre-spinup` S9 records the general
form. _[resolved 2026-08-15, systems phase]_

### TG2: A generated PNG can be born corrupt and still load, and only a mid-run texture hides it that long

`assets/textures/enemies/shell.png` was malformed from the day it was generated: its pixel
chunk declared one byte fewer than it carried, so the chunk's checksum failed and no
decoder could read the picture. **Chromium does not report that as an error** — the image
loads, answers 16×16, and draws nothing, which the game's renderer puts on screen as a
black box. So the editor showed no broken-asset warning anywhere, and the fault only
appeared in play, at the instant a stomp swapped the turtle to its shell.

It survived the whole systems phase because **a texture that is only worn mid-run is a
texture nobody has looked at**: T4 gets the shell loaded with the level, not looked at, and
the turtle chain is several deliberate keystrokes into the level. The cheapest way to see
one of these is to make it happen on purpose — move the spawn over the enemy so the first
fall triggers it.

**Fix:** redrawn 16×16 from the reference's own `CACHE.shell` rectangles, in draw order,
with the kernel's `scripts/sample/png.ts` encoder rather than the browser-extraction path
that produced the original (see the Contract below) — that encoder writes one pixel chunk
and checksums it correctly. Every other PNG in this game, in tower-defense and in the
kernel's fixtures was checked the same way and is intact; this was the only casualty.
**Anything generated by a hand-rolled or scraped image pipeline is worth a checksum pass
before it is committed**, because the failure is silent at every stage until it is on
screen. _[earned 2026-08-15, the black shell]_

### TG3: ~~A described component's fields appear on a placement, never on the prefab~~ — resolved 2026-09-01

Describing `walker` put a **Speed** box on every walker *in the level*. Opening
`prefabs/walker.json` itself still says "This prefab also carries grid, walker, which this
editor has no controls for" — the prefab panel has no fields for a described component at
all. `ComponentFields` is wired to scene documents and finds its target by entity id
(`editor/panels/EntityInspector.tsx` renders it; `PrefabInspector.tsx` does not), so
authoring a described field is a per-placement act by construction.

The consequence for whoever is holding the level: **there is no way to retune every walker
at once from a panel.** Pressing Add on one walker gives that one its own speed and detaches
it from the prefab, which is right for one enemy and wrong for a global change. Changing
what every walker does still means editing the prefab file's number by hand, or a second
prefab variant (T2).

`kernel-2d/docs/using-the-editor.md` reads as though it covers this and does not: its "A
prefab's is inherited" line is written from the placement's side and never says the prefab's
own panel is blank. Worth fixing there if a session is in the kernel anyway.

**Resolved the same day** (`editor-ui` U47, third amendment): the prefab panel draws the
same fields now, so `prefabs/walker.json` has a Speed box that reaches every walker not
given its own, and a placed walker shows the prefab's speed as text before Add. Two dials:
the prefab for all of them, a placement for one. What stands from the above is the reason
it was a gap — the fields were wired to scene documents and entity ids — and that the
fix was a `target` rather than a second renderer.
_[earned 2026-09-01, describing walker and turtle]_

## Contracts

- Every content file was generated from the running reference (`docs/reference/`): art via
  each sprite canvas's own `toDataURL`, the level from its `LEVEL_DATA`, coordinates
  converted to the kernel's y-up scene space. The `generatedBy` marker on each file is the
  record; the generator itself was a scratchpad throwaway (`genre-spinup` S6).
- `docs/REMAKE-PARITY.md` — the numbers every system must hit.
