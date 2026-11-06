# Presentation

Slides for the take-home walkthrough, built with [Slidev](https://sli.dev).

The animations replay the real scheduling logic from `../visualiser/src/lib/schedule/`, so the slides stay in step with the code that is tested against `solution/scheduler.py`.

## Run it

```console
$ pnpm install
$ pnpm dev
```

Open http://localhost:3030. Arrow keys step through each slide's animation, and `/presenter` opens presenter mode.

## Layout

- `slides.md`: the deck
- `components/`: animated slide pieces (`Timeline`, `Sweep`, `CodeSweep`, `Paging`, `People`)
- `global-bottom.vue`: the footer shown on every slide
