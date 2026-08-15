# Milaap Economy Audit — 2026-08-15

Single source of truth:
- Recharge: 5 requested packages in lib/wallet.js.
- Gifts: 50,000 spent Coins = 1 host Diamond in lib/config.js + lib/gifts.js.
- Exchange: 1 Diamond = 25,000 Coins.
- Withdrawal: 1 Diamond = Rs. 1.
- Withdrawal remains admin-reviewed; KYC is not required by the current UI.
- Game/Ludo stakes remain centralized through MILAAP_ECONOMY.gameStakes.
- VIP, Gift and Host levels continue to use lifetime recharge/gift/diamond counters; no duplicated rate constants were introduced.
- User wallet does not expose the admin exchange-rate setting as a policy banner; admin settings remain in /admin/diamond-settings.
