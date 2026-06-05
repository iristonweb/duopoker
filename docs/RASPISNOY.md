# Raspisnoy mode (v1 — simplified)

DuoPoker ships **Raspisnoy v1** as a distinct five-card duel. Full draw/open-hand Raspisnoy is planned for a later release.

## Rules (implemented)

| Rule | Value |
|------|--------|
| Hole cards | 5 private cards per player |
| Community board | None |
| Forced bet | Ante per player (`max(1, min(smallBlind, bigBlind))`) into the pot |
| Betting streets | One round (`PREFLOP`) |
| Actions | fold, check, call, bet, raise (same as Hold'em) |
| Showdown | Best standard 5-card poker hand from the five hole cards |
| Players | 2–6 |

## Not in v1 (future draw poker)

- Open / face-up cards
- Discard and draw rounds
- Multi-street draw sequences

Lobby copy and table UI reflect v1 (no community card area for Raspisnoy).

## Engine entry points

- Deal & antes: `startNewHand` in `packages/game-engine/src/holdem-table.ts`
- Showdown: `resolveShowdownRaspisnoy` → shared side-pot / split logic via `pot-calculator.ts`
