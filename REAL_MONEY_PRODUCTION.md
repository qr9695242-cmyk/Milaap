# Milaap Real-Money Production Foundation

This build hardens the cash-out side of Milaap without turning purchased/game Coins into withdrawable cash.

## Included
- Server-authoritative withdrawal request via Firebase Callable Functions.
- KYC gate: only `users/{uid}.kycStatus == "verified"` can request cash-out.
- Separate `withdrawableDiamonds` balance; it is reserved atomically when a withdrawal is submitted.
- Minimum withdrawal: 1,000 Diamonds.
- Reference value: 1 Diamond = Rs. 4.
- Withdrawal history in `withdrawalRequests`.
- Immutable server ledger in `walletLedger`.
- Admin-only approve/reject callable functions.
- Rejected withdrawals automatically release Diamonds back to the eligible balance.
- Client Firestore writes to withdrawal/ledger collections are blocked.

## Manual payout mode
- No JazzCash, Easypaisa or bank payout API is connected.
- Admin manually sends the approved amount from the business/personal payout channel allowed by the operator.
- Admin records the payment transaction/reference ID in `/admin/withdrawals` and marks the request `paid`.
- Never store or ask users for OTPs, PINs, passwords or secret wallet credentials.

## Important launch requirement
This is the secure application foundation, not a licensed payment gateway. Before taking real customer money, connect a supported payment provider and complete the required business/KYC/AML, tax, consumer-protection, age, and app-store/legal checks for the countries where Milaap will operate.

The existing Ludo/game Coins remain virtual game currency. This build does **not** create a cash payout from wagered game entries.

## Deploy
1. Install dependencies in both the root project and `functions/`.
2. Deploy Functions and Firestore rules from the Firebase project directory.
3. Set `kycStatus` to `verified` only from a trusted admin/KYC process.
4. This build is intentionally manual-only. If automatic payouts are added later, use a server-side provider integration and never put secret API keys in Next.js client code.
