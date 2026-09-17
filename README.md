# vibe

A programming language optimized for reading, and the tools around it.

vibe is written for the person reading code six months later. It is meant for jamming on logic with AI: sketch rules in vibe, hand them to a model, and get working code back (or the reverse).

## What's in here

| Folder | What it is |
|---|---|
| [`spec/`](spec/) | The language. [`vibe-spec.md`](spec/vibe-spec.md) is the only authority on syntax. [`AGENTS.md`](spec/AGENTS.md) tells coding agents how to work with `.vibe` files. [`examples/`](spec/examples/) holds worked examples. |
| [`skill/`](skill/) | A Claude skill, `vibe-translate`, that turns code into vibe and vibe into code using the spec. |
| [`app/`](app/) | **just vibin'** — a small offline editor (installable web app) with vibe syntax coloring, projects and folders, and one-click sharing with an AI. |
| [`vscode/`](vscode/) | Syntax coloring for VS Code, Cursor and Windsurf. |

## Run just vibin'

Needs [Node.js](https://nodejs.org).

```bash
node serve.mjs
```

Open http://localhost:5317 in Chrome. To install it as an app, click the install icon at the right end of the address bar.

Pages are saved in the browser. Use **☰ → Back up everything** now and then.

## Use the Claude skill

Link the skill into your Claude skills folder so edits here apply right away:

```bash
ln -s "$(pwd)/skill" ~/.claude/skills/vibe-translate
```

Then ask Claude to translate code into vibe, or a `.vibe` file into code. The skill reads the spec from `spec/`, or from this repo on GitHub if the local copy isn't there.

## Use the VS Code coloring

```bash
cp -r vscode ~/.vscode/extensions/vibe-lang-0.1.0
```

Restart the editor. See [`vscode/README.md`](vscode/README.md).

## Changing the language

1. Edit [`spec/vibe-spec.md`](spec/vibe-spec.md) and the examples that use the changed form.
2. Update the coloring in [`app/highlight.js`](app/highlight.js) and [`vscode/syntaxes/vibe.tmLanguage.json`](vscode/syntaxes/vibe.tmLanguage.json) if the change affects how code looks.
3. Record anything left undecided under **Known open questions** at the bottom of the spec.
