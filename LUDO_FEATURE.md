# Milaap Ludo Feature

This feature adds a real, playable 2–4 player Ludo mode using Firebase Firestore for live match state.

## Included
- Real dice rolls and turn handling
- Four tokens per player
- Six-to-enter rule
- Token movement and home lane
- Capture on non-safe cells
- Extra turn on six or capture
- 2–4 player live matches
- Shareable Firestore match ID
- Winner detection
- Non-redeemable virtual points/rewards: 40,000 / 100,000 / 250,000 / 500,000
- Match history
- Ludo leaderboard
- Automatic virtual reward credit after a finished match
- Ludo entry point on the Milaap home screen

## Important economy rule
Ludo points/coins in this implementation are virtual and non-redeemable. There is no Ludo stake, cash prize, cash-out, or transfer of player funds in this feature.

## Firebase deploy
Deploy the updated rules and indexes with the Firebase CLI from this project:

`firebase deploy --only firestore:rules,firestore:indexes`

The app needs the same Firebase environment variables already used by Milaap.
