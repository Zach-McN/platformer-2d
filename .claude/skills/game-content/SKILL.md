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

### T2: Per-placement speed is a prefab variant, not an override

The reference's two per-placement speed props became `walker-fast.json` and
`turtle-slow.json`. The kernel has no instance-level component override and none was
needed — the tower defense's lesson (per-placement data keeps turning out to be
per-placement placement) held on first contact with another genre.

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

### T5: Draw order is scene list order, in the reference's passes

Far scenery (clouds, hills) → near scenery (trees, bushes, grass, fences) → gameplay
tiles → spawn and enemies. Adjacency variants (ground top/fill, pipe top/body, flag
top/pole) are separate prefabs picked at generation time; an author extending the level
picks the variant by eye.

## Gotchas

### TG1: The sky is nobody's yet

The reference paints a vertical sky gradient (#6fb9ff → #b8e6ff) behind everything. The
scene has no background — the viewport shows the editor's dark ground. Unresolved on
purpose; it belongs to the systems/presentation phase, and the parity doc lists it.

## Contracts

- Every content file was generated from the running reference (`docs/reference/`): art via
  each sprite canvas's own `toDataURL`, the level from its `LEVEL_DATA`, coordinates
  converted to the kernel's y-up scene space. The `generatedBy` marker on each file is the
  record; the generator itself was a scratchpad throwaway (`genre-spinup` S6).
- `docs/REMAKE-PARITY.md` — the numbers every system must hit.
