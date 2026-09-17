# vibe files in this repo

Files ending in `.vibe` are written in vibe, a language optimized for reading. They are notes about logic — sketches, guards, pricing rules — meant to be turned into working code, or produced from working code so a person can follow it.

## Before touching a `.vibe` file

Read `vibe-spec.md` in this directory. It is the only authority on vibe syntax.

Do not write vibe from memory or from what reads well in the moment. vibe reads like English, so invented syntax looks correct and slides past unnoticed. `is due before`, `.isEven`, and `the total of` all read beautifully and none of them are in the language.

## Two laws behind every rule

**Verbose is fine. Readability wins.** Extra lines are cheap, ambiguity is expensive.

**Nothing floats.** Every value has an owner. Every value produced goes somewhere by name on the same line.

## Turning a `.vibe` file into code

Default to TypeScript unless told otherwise. Preserve what vibe made explicit rather than collapsing it:

- `attr_can_be_read` becomes `readonly` or a getter, not a public mutable field
- `if failed` and `if refused` stay two branches — check `response.ok` separately from the try/catch
- `maybe` with a `starter_value:` becomes a default parameter
- `output:` becomes a return; a method without it returns void and mutates
- Date and time attributes stay separate

## Turning code into a `.vibe` file

Reshape rather than mirror:

- An early `return` inside a guard is almost always an `otherwise`
- A chain of `if/else if` over one field is a `when` table
- A counting loop is usually `any`, `every`, or a filter plus `.count`
- Null and undefined checks are both `is missing`
- `fetch()` becomes an `http` block, and the two failure modes split
- A loose function taking three or more arguments is usually a missing object — house it rather than using `any.`

## When the spec does not cover something

**Stop and say so. Do not improvise syntax.**

vibe is young and has known holes, listed at the bottom of the spec. Real code will hit them. A single invented keyword that reads well gets copied forward and treated as real.

Mark gaps so they cannot be mistaken for working vibe:

```
# GAP: the source awaits three fetches in parallel.
# vibe has no concept for concurrency — every call waits.
# Translated as three sequential http blocks, which changes the timing.
```
