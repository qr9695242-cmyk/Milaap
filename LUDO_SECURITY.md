# Ludo Anti-Fraud Security

Paid Ludo is now server-authoritative.

- Browser cannot create/update/delete `ludoMatches` directly.
- Entry Coins are deducted by trusted Firebase Cloud Functions.
- Quick Match / room join is atomic, so the same seat cannot be taken twice.
- Dice is generated on the server; the browser cannot choose the dice value.
- Token moves are validated on the server against the current turn, dice and token state.
- Winner and Diamond payout are decided in the same server transaction as the winning move.
- Diamond payout is idempotent because the match becomes `finished` in the same transaction.
- Waiting-room cancellation refunds only the host and only when there is one player; join/cancel races are transaction-safe.
- Client-side `updateLudoMatch` and `awardLudoWinner` are disabled as a security guard.

## Deploy before production

1. Install Firebase Functions dependencies: `cd functions && npm install`
2. Deploy Functions and Firestore rules: `firebase deploy --only functions,firestore:rules`
3. Test with two real accounts/devices before production launch; withdrawal/cash-out is intentionally disabled in this build.

The trusted server still needs normal Firebase App Check / Auth configuration and production monitoring for the strongest protection.
