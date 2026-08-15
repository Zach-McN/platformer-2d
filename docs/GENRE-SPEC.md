<!-- generatedBy: claude-fable-5, generatedAt: 2026-08-14 — DRAFT, see banner below -->

# Genre Spec — Pixel Platformer

> **DRAFT — awaiting Zach's approval.** Drafted by Claude from the reference game
> (`docs/reference/pixel-platformer-game.html`), which is Zach's design statement. This
> becomes the human's document the moment Zach has read it: edit anything, then delete
> this banner and the marker comment at the top — an unmarked file is human-owned and no
> session will modify it again. Until the banner is gone, nothing is built against this spec.

## What this document is for

This is the fence. Nothing gets built unless a noun in this document justifies it — game
code, editor tools, and kernel promotions (`genre-spinup` G5). If a session wants to build
something and cannot point at a noun below, the answer is no, and the way to change that is
to add the noun here, deliberately, as a decision.

This game is also a **remake**: the reference game in `docs/reference/` is the exact target,
and `docs/REMAKE-PARITY.md` is the checkable list of what "exact" means. This spec says what
the game *is*; the parity document says what it must *feel like*, down to the numbers.

---

## What the game is

A pixel-art platformer, one screen tall, scrolling sideways. You are a ninja. Run, sprint
and jump through a hand-built level: collect coins, stomp enemies, bump blocks from below,
stay off the spikes and out of the pits, and touch the flag at the far end to clear it.

Death is cheap — you respawn at the start and keep your coins. The level is the puzzle and
the run is the fun. One level for now; more levels later is a deliberate spec change, not a
gap.

## What the player does

- **Move** left and right. Movement accelerates and skids rather than snapping — momentum
  is part of the feel.
- **Sprint** (Shift). Faster on the ground, and running jumps carry further.
- **Jump** (Space). Taller if the key is held; a released key cuts the rise short. A brief
  moment of grace to jump just after running off a ledge.
- **Stomp** enemies by landing on them; the bounce is part of the reward.
- **Bump blocks** from below: ?-blocks pay a coin, bricks shatter.
- **Reach the flag.** That is winning.
- **Restart** (R) any time. **Mute** (M). On a touch screen, on-screen buttons replace the keys.

---

## The nouns

Every entry here is a thing a future session is allowed to build. Nothing else is.

### The level

- **Level** — one tile grid plus a spawn point. The unit of play. This game has one.
- **Tile grid** — 16-pixel square tiles; the level is one screen tall and as wide as it
  needs to be.
- **Ground** — solid earth. Shows a grassy top face where exposed, plain fill below.
- **Brick** — solid. Bumped from below it bursts into shards and is gone — and anything
  standing on it is knocked flying.
- **?-block** — solid. Bumped from below it releases one coin (which pops up, spins, and
  falls back in) and becomes a **used block**: still solid, spent, inert.
- **Pipe** — a solid obstacle with a cap and a body. It goes nowhere; there is no warping.
- **Coin** — a floating pickup, collected on touch with a sparkle. The level's optional
  treasure — coins are never required to win.
- **Spike** — kills the ninja on contact.
- **Flag** — a pole with a banner at the far end of the level. Touching it wins.
- **Pit** — a gap with no floor. Falling in kills.
- **Spawn** — where the ninja starts, and returns to after dying.
- **Scenery** — cloud, hill, tree, bush, grass tuft, fence. Looks nice, never solid, never
  interactive. Clouds, hills and trees are bigger than one tile and sit faded behind the
  action — hills and clouds furthest back, the rest just behind the gameplay.

### The ninja

- **Momentum** — acceleration, friction, a sprint that changes both speed and jump reach.
- **Variable jump** — held is taller, released is cut short, plus the ledge-grace moment.
- **Stomp bounce** — killing an enemy from above bounces the ninja back up.
- **Death and respawn** — spikes, enemy side-contact, and pits kill. A brief "OUCH!"
  banner, then respawn at the spawn point. Coins survive death; only restarting resets them.
- **Squash and stretch** — the ninja stretches in flight, squashes on hard landings, and
  leans into a sprint. Presentation, but load-bearing presentation: it is most of the feel.

### The enemies

- **Walker** — patrols the ground, turns at walls and at ledges. Each placed walker has its
  own walking speed (the level has a slow one and a fast one). Stomp squashes it; touching
  it from the side kills you.
- **Turtle** — patrols like the walker, but stomping it tucks it into its **shell**. A
  shell that is stomped or touched gets **kicked**: it slides fast, bounces off walls,
  ignores ledges, kills every other enemy it hits, and kills you on side contact. Stomping
  a sliding shell stops it back into a resting shell.
- **Knock-out** — breaking a brick under an enemy's feet sends it tumbling off the screen.

### The run

- **Coin counter** — pinned to the top-right corner of the screen, counting up live as you
  play.
- **Banner** — a centered message over the action: "OUCH!" when you die, "LEVEL CLEAR!"
  with your coin total when you win.
- **Controls hint** — a corner card listing the keys; it fades away once you start playing.
- **Touch controls** — move/sprint/jump buttons that appear on touch screens.
- **Sound effects** — synthesized chip sounds: jump, coin, bump, break, stomp, hurt, and a
  little win fanfare. Mute toggles them.
- **Camera** — follows the ninja smoothly, side to side only.

---

## Consequences worth knowing

The coin counter, the banner and the hint are the first nouns on this kernel that live on
the **screen** rather than in the world, and they are alive *during* play — the tower
defense's trick of hanging its readouts on the pause never applies here, because a
platformer is never paused. These three nouns are the justification for screen-anchored UI
work, and the list is deliberately this short: three, no more.

The walker and the turtle are the whole bestiary, and their difference is behavioral (the
shell), not statistical. A third enemy would need a new *behavior* to justify it, named
here first.

## Not in this game

Cut on purpose. Finding one of these missing is not a gap to fill. This list is what makes
the remake 1:1 — the reference game has none of them either.

- **Power-ups:** mushrooms, size changes, fire flowers, invincibility stars. No held items —
  the ninja cannot pick up or carry a shell.
- **Run structure:** score, lives, game-over, timers, checkpoints beyond the single spawn
  point.
- **World count:** more levels, a level select, functioning warp pipes, hidden blocks,
  secret areas. One level. (More later is a spec change made here first.)
- **Movement:** wall-jump, crouch, swim, climb, ladders, double jump.
- **World machinery:** moving platforms, one-way platforms, water, lava, conveyors.
- **Enemies:** anything beyond the walker and the turtle. No projectiles, no bosses, no
  flying.
- **Music.** Sound effects only, all synthesized. No audio files.
- **Parallax** — scenery fades into the distance but does not move at its own speed.

## Left to build sessions

Genuinely open, and fine to decide while building: how tiles, prefabs and the level are
structured on disk; how the two walker speeds are expressed (two prefab variants is the
expected answer); what the kernel's screen-anchored UI primitive looks like; how the sprite
sheet is sliced into individual textures; exact system boundaries in `src/`.

Not open: the feel numbers. Those are fixed by `docs/REMAKE-PARITY.md`.
