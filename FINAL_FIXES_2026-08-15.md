# Milaap Final Fixes

- Wallet now has Wallet / Purchase / Exchange / Withdrawal tabs in one place.
- User-facing coin/diamond/rupee conversion banners were removed; conversion settings remain in Admin.
- Diamond -> Coin exchange uses the admin-controlled exchange rate, defaulting to 25,000 Coins per Diamond.
- Withdrawal is now a real Firestore transaction: Diamonds are reserved immediately and a pending withdrawal request is created.
- Withdrawal supports JazzCash, Easypaisa and Bank, with no KYC gate.
- Withdrawal form uses the user's live Diamond balance instead of a hard-coded example balance.
- Admin can see pending withdrawals and Approve/Reject them; Reject refunds the reserved Diamonds.
- Withdrawal cash value is stored at Rs. 1 per Diamond.
- Mobile withdrawal UI uses a dark high-contrast layout so text is visible.
- Vehicle entrance effects now use a full-phone overlay for both video and image vehicles, instead of only a small room popup/bar.
- Ludo local play now enforces the active player's color, prevents moving another player's token, and prevents rolling twice before moving.
- Existing Firebase room/gift/game systems were preserved rather than removed.
