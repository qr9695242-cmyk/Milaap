# Ludo Gameplay Fix — 2026-08-16

- Fixed dice state so a rolled 1–6 is explicitly required before a token can move.
- Fixed the home-token exit rule: a token on home (-1) can leave only on a 6.
- Added clear highlighting/pulsing to legal tokens after a dice roll.
- Prevented clicks on another player's tokens during the active turn.
- Fixed turn handling after a move: 6 keeps the same player's turn; other rolls advance to the next player.
- Kept exact-finish behavior for the final home path.
- Kept opponent cutting and safe-cell behavior.
- Improved messages so players know exactly what to tap after rolling a 6.
