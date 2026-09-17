# vibe — editor support

Syntax highlighting for `.vibe` files, plus a context file so an LLM in your editor knows what vibe is.

## Install (VS Code, Cursor, Windsurf)

No build step. From the repo root, copy this folder into your extensions directory and restart.

**macOS / Linux**
```
cp -r vscode ~/.vscode/extensions/vibe-lang-0.1.0
```

**Windows**
```
xcopy vscode %USERPROFILE%\.vscode\extensions\vibe-lang-0.1.0 /E /I
```

For Cursor use `~/.cursor/extensions/`, for Windsurf `~/.windsurf/extensions/`.

Open `spec/examples/service_call.vibe` to check it took. You should see `obj` and `do` as declarations, `@location` distinct from `.location`, `$50` and `20:00` as literals, and `---` dimmed like a comment.

## What gets highlighted

| element | example |
|---|---|
| declarations | `obj ServiceCall`, `do dispatch`, `end`, `includes` |
| header settings | `uses ServiceCall:`, `maybe:`, `output:`, `api_key:` |
| control | `if`, `when`, `then`, `also`, `otherwise`, `for each` |
| comparisons | `is greater or equal to`, `is not in`, `is missing`, `is before` |
| declared attributes | `@location`, `@status(s)` |
| references | `.location`, `.rounded` |
| built-in objects | `http`, `Date`, `Time`, `request`, `response` |
| literals | `$50`, `20:00`, `8pm`, `2027-06-15`, `20mi`, `1...49` |
| constants | `SERVICE_AREA(s)` |
| interpolation | `{service_call.price}` inside a string |
| dividers | `---` |

Multi-word comparisons are matched longest-first, so `is not in` highlights as one operator rather than `is` plus `not in`.

`@location` and `.location` get different colors on purpose. One declares, one refers — and confusing them is the mistake vibe's ownership rules exist to prevent.

## Folding and indent

`obj`, `do`, and `starting_attributes:` fold to their `end`. Typing `end` or `otherwise` dedents automatically.

## Giving an LLM the context

Copy `spec/AGENTS.md` and `spec/vibe-spec.md` into the root of any repo with `.vibe` files in it. Most coding agents read `AGENTS.md` automatically; for Claude Code, rename it `CLAUDE.md` or add a line in your existing one pointing at it.

The instruction that matters most in there: **when the spec has no form for something, flag it rather than inventing syntax.** Without that, an agent will produce plausible-looking vibe that no implementation could ever support, and it will get copied forward as if it were real.

## Caveat

The grammar covers the spec as it stands. vibe has open questions — mixed-type lists, money precision, async, dates carrying times — and syntax for those doesn't exist yet. When it does, the grammar needs updating too.

The grammar is behind the spec in two places: it only colors `uses` and `maybe` when a colon follows (the spec dropped that colon), and it only colors the filter labels `id:`, `status:` and `end_date:`. The editor in `app/` handles both.
