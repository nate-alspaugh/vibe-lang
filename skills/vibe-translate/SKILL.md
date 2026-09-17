---
name: vibe-translate
description: Translate code into vibe (a programming language optimized for reading) or translate vibe into working code, following the vibe spec exactly. Use when the user asks to convert, translate, port or rewrite code "into vibe", "as vibe", "to .vibe", or to turn a .vibe file into TypeScript, Rust or another language, or pastes code next to a vibe file and asks how it would look on the other side.
argument-hint: <code, file, or .vibe file to translate — and the direction if it isn't obvious>
---

# vibe-translate

Translate between vibe and ordinary code without inventing a single piece of syntax.
vibe reads like English, so made-up forms look right and slip through. The spec is the only authority.

**Target:** $ARGUMENTS

## 1 · Load the rules first

Read both files in full before writing any vibe or any code. Do not work from memory — the language changes often.

| File | Local path (this repo) | If the local file is missing |
|---|---|---|
| The spec | `../../spec/vibe-spec.md` from this skill's folder | https://raw.githubusercontent.com/nate-alspaugh/vibe-lang/main/spec/vibe-spec.md |
| Agent rules | `../../spec/AGENTS.md` | https://raw.githubusercontent.com/nate-alspaugh/vibe-lang/main/spec/AGENTS.md |

Worked examples live in `../../spec/examples/`. Read the one closest to the task (database calls, dates and times, objects and methods) and copy its shapes.

If the spec and this skill ever disagree, the spec wins. Say so in the reply.

## 2 · Pick the direction

- **Code → vibe:** the user gives TypeScript, JavaScript, Python, SQL or similar.
- **vibe → code:** the user gives a `.vibe` file. Default target is TypeScript unless they name another language.
- Unclear → ask one short question before translating.

## 3 · Code → vibe

Reshape the logic into vibe's forms instead of mirroring the source line by line.

1. **Find the objects first.** Group data and the functions that touch it into `obj` blocks. A loose function taking three or more arguments is a missing object — house it rather than reaching for `any`.
2. **Write every constructor completely.** Every attribute in `attr_can_be_used` / `attr_can_be_read` gets a line in `starting_attributes`: a value (`@status => "Open"`), a declaration (`@status(s) are [...]`, `@case(s) are []`), or an empty slot filled from outside (`@id` or `@id Number`).
3. **Headers:** `uses Owner .field, .field` and `uses any.value` — no colon on `uses` or `maybe`. Settings keep theirs: `starter_value:`, `output:`, `filter(s):`.
4. **Branches:** an `if/else if` chain over one field is a `when` table. Independent checks that can each say no are guards — stacked `if`s with **no** `otherwise`, and the answer set to its default on its own line above them.
5. **Math:** two values per expression at most; longer math breaks into lines. Copy a value before mutating it.
6. **Loops and searches:** counting loops usually become `every … where` plus `.count`, or `first` / `any`.
7. **Network and database:** `fetch` becomes an `http` block; queries become `db.find` / `db.save` / `db.delete`. Keep `if failed` (never reached) and `if refused` (server said no) as two branches. Filter rows are settings: `status: "Active"`, `end_date: start...finish` — never `is` inside a filter.
8. **Relationships:** only one side holds the real object; the other holds ids.
9. **Null and undefined** checks both become `is missing`.

## 4 · vibe → code

Keep what vibe made explicit instead of collapsing it:

| vibe | In the code |
|---|---|
| `attr_can_be_read` | `readonly` field or getter |
| `attr_can_be_used` | writable field |
| `@id` / `@id Number` with no value | optional field, assigned on first save |
| `maybe any.x` + `starter_value:` | default parameter |
| `output:` | return value; no `output:` means it returns nothing and changes state |
| `if failed` / `if refused` | separate network-error and non-OK-response branches |
| `filter(s):` rows | a query filter that runs in the database, never fetch-then-filter |
| guards with no `otherwise` | sequential checks that can only turn the answer off |
| `Time.now` / `DateTime.now` | UTC values; `.in("Zone")` is an explicit conversion |

## 5 · When the spec has no form for something

**Stop and mark it. Never invent syntax.** Put a comment in the vibe output so the gap can't be mistaken for working vibe:

```
# GAP: the source awaits three fetches in parallel.
# vibe has no concept for concurrency — every call waits.
# Translated as three sequential http blocks, which changes the timing.
```

Check the "Known open questions" list at the bottom of the spec first — many gaps are already recorded there.

## 6 · Before replying

- [ ] Every keyword and form used appears in the spec (search the spec for anything you're unsure of).
- [ ] Every declared attribute has a line in its constructor.
- [ ] No colon after `uses` / `maybe`; no `is` inside `filter(s):`.
- [ ] No `otherwise` on a guard.
- [ ] Gaps are marked with `# GAP:` and listed in the reply.

Reply with the translation, then a short list of **choices made** (where the source could map more than one way) and **gaps found**.
