# vibe

A programming language optimized for reading, plus the Claude skills for working with it.

vibe is written for the person reading code six months later. It is meant for jamming on logic with AI: sketch rules in vibe, hand them to a model, and get working code back (or the reverse).

## What's in here

| Folder | What it is |
|---|---|
| [`spec/`](spec/) | The language. [`vibe-spec.md`](spec/vibe-spec.md) is the only authority on syntax. [`AGENTS.md`](spec/AGENTS.md) tells coding agents how to work with `.vibe` files. [`examples/`](spec/examples/) holds worked examples. |
| [`skills/`](skills/) | Claude skills for vibe. |

### Skills

| Skill | What it does |
|---|---|
| [`vibe-translate`](skills/vibe-translate/SKILL.md) | Turns code into vibe and vibe into code, following the spec and flagging gaps instead of inventing syntax. |

## Install a skill

Link it into your Claude skills folder so edits here apply right away:

```bash
ln -s "$(pwd)/skills/vibe-translate" ~/.claude/skills/vibe-translate
```

Then ask Claude to translate code into vibe, or a `.vibe` file into code. The skill reads the spec from `spec/`, or from this repo on GitHub if the local copy isn't there.

## Give an AI the rules

Copy [`spec/vibe-spec.md`](spec/vibe-spec.md) and [`spec/AGENTS.md`](spec/AGENTS.md) into any project with `.vibe` files. Most coding agents read `AGENTS.md` automatically.

## Changing the language

1. Edit [`spec/vibe-spec.md`](spec/vibe-spec.md) and the examples that use the changed form.
2. Update any skill that spells out the changed rule.
3. Record anything left undecided under **Known open questions** at the bottom of the spec.
