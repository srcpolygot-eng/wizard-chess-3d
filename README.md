# Wizard Chess 3D

A cinematic 3D chess experience set inside a Gothic cathedral, built with React + Three.js.

## Modes

- **Main menu** — Gothic sanctum panel matching the in-game checkmate banner
- **Single Player** — vs AI (Easy / Medium / Hard), choose White or Black
- **1 v 1 Local** — hot-seat on the same device; camera follows the side to move

## Upgrades (this build)

- **Modular engine** — pure chess logic extracted to `src/engine/chess/` (moves, AI, notation)
- **AI difficulty** — Easy (random) · Medium (tactical heuristic) · Hard (minimax + alpha-beta)
- **Undo** — undoes your move + AI reply in single-player
- **Captured pieces tray** — shows actual piece glyphs, not just counts
- **Last-move highlight** — golden squares after each move
- **Check indicator** — status pill pulses when the side to move is in check

## Project structure

```
src/
  App.tsx                 # React shell + HUD
  main.tsx
  styles.css
  wizardChessEngine.js    # Scene, animation, UI wiring
  engine/
    index.js
    constants.js
    chess/
      moves.js            # Pure move generation & check detection
      ai.js               # Easy / Medium / Hard AI
      notation.js         # SAN / UCI / castling parser
public/assets/glb/        # Cathedral + piece GLBs (base64 gzip)
```

## Run locally

```bash
npm install
npm run dev
```

Optional: set `GEMINI_API_KEY` in `.env.local` for AI Studio features.

## Controls

| Input | Action |
|-------|--------|
| Click piece | Select / move |
| Left-drag | Orbit |
| Right-drag | Pan |
| Scroll | Zoom |
| WASD + R/F | Fly camera |
| H | Hide / show UI |
| Undo | Take back last ply (×2 in single-player) |

## AI difficulties

| Level | Behaviour |
|-------|-----------|
| Easy | Random legal move |
| Medium | Material, center, hanging-piece heuristic |
| Hard | Minimax depth 2–3 with alpha-beta pruning |

Difficulty is persisted in `localStorage` (`wizard_chess_ai_diff`).
