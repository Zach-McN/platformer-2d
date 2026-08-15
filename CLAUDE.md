<!-- generatedBy: claude-fable-5, generatedAt: 2026-08-14 -->

# CLAUDE.md — platformer-2d

This folder is a **game**, not an application. The application is `kernel-2d`, two folders
up; this is a document it opens. Nothing here is an engine, a dependency or a build — it is
the game as text, plus the game's own code.

The human opens it by double-clicking `Open editor.cmd` in this folder. The same
thing, from `kernel-2d/`, which is what a session uses:

```bash
npm run editor -- ../games/platformer-2d
```

## What this game is

A 1:1 remake of the reference game in `docs/reference/pixel-platformer-game.html` — a
single-level pixel platformer. Two documents govern it, and they answer different
questions:

- **`docs/GENRE-SPEC.md`** — the fence: what the game *is* and which nouns justify
  building anything. The human's document. **While it carries its DRAFT banner, nothing is
  built against it.**
- **`docs/REMAKE-PARITY.md`** — the 1:1 contract: what the remake must *feel* like, down
  to the numbers. AI-maintained, checkable, and not open to reinterpretation — a session
  that wants to deviate from it stops and asks.

The reference HTML itself is never edited, by anyone.

## The fence

**Nothing gets built here unless a noun in `docs/GENRE-SPEC.md` justifies it** — game code,
editor tools, data formats, and anything proposed for promotion into the kernel
(`genre-spinup` G5). A session that wants to build something and cannot point at a noun
stops and asks. The way to widen the fence is to change the spec first, deliberately, not
to build past it and retrofit the noun.

The spec's **Not in this game** section is what makes the remake 1:1. Something missing
because it is listed there is not a gap, and finding it absent is not a reason to add it.

## Who owns what

| | Owner |
|---|---|
| `src/` — components and systems | AI |
| `assets/`, `scenes/`, `prefabs/`, `data/` | The human |
| `project.json` | Either; it is written by the editor |
| `Open editor.cmd` | Neither; the kernel generates it. Regenerate, never edit |
| `docs/GENRE-SPEC.md` | The human (a draft until Zach approves it) |
| `docs/REMAKE-PARITY.md` | AI |
| `docs/reference/` | Nobody edits it. It is the target |

AI may author content in the human's folders — including generated art — under the marking
rules in the kernel's `CLAUDE.md`: every AI-authored file carries `generatedBy` and a date,
conforms to the same schemas as hand-authored content, and **a file without that marker is
treated as human-authored and is never modified or deleted**. Ask instead.

Whether a generated piece ships or gets replaced is the human's call, made per piece.

## What runs today

The level opens and draws in the editor — all 242 entities of it, generated 1:1 from the
reference — but nothing moves: `src/` is empty. The component vocabulary the content
carries is in `.claude/skills/game-content/`. The build order ahead: systems in `src/`,
then the screen-anchored UI work — which touches the kernel and is its own session — then
the parity pass.

`package.json`, `tsconfig.json` and `vitest.config.ts` deliberately do not exist yet: a
game folder gets its own test runner the first time its own code has logic in it
(`genre-spinup` S5), pinned to the kernel's versions, with fixtures as entity lists rather
than files. When they arrive, code here names the kernel by a package, never by a path:

```ts
import type { Entity, System } from 'kernel-2d/runtime'
```

and typechecking (`npx tsc --noEmit -p ../games/platformer-2d/tsconfig.json`, run from
`kernel-2d`) joins the definition of done for any session touching `src/`.

**Components are this game's to invent.** The level format carries components the kernel
has never heard of; a system reading them is not a kernel change and must not become one.

## This game's own skills

`.claude/skills/` is for knowledge true of *this game only* — its feel constants'
provenance, invariants its level holds, how its enemy chain works (`genre-spinup` S2).
Same three registers as the shared library, same earned-never-invented standard.

Knowledge that would be true of any platformer, or of any game on this kernel, goes in
`gamedev-skills` — and only once a second game has proved the general part general.

## Session conduct

The kernel's `CLAUDE.md` governs: one feature per session, stop and ask when a rule blocks
the work, dependencies proposed rather than added, report in designer language, commit
before and after. The definition of done there applies to work in this folder too.
