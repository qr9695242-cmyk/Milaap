Merged update based on the user's original Milaap-main-no-ludo(1).zip.

Preserved:
- Original website structure, pages, Firebase files, roles, admin/agency/family/room systems and existing games.

Added/updated:
- Ludo page + Ludo art.
- Local Ludo 2/4 players.
- Online Ludo 2-player virtual Coin mode.
- Ludo text chat.
- Game screen shortcut to Profile Diamonds.
- Shared virtual game entry levels: 200,000 / 500,000 / 1,000,000 / 2,000,000 / 5,000,000 Coins.
- Same entry levels in GameWalletControls-backed games and the Archery/Carrom/dynamic game stake selectors.
- Withdrawal request UI at /withdrawal.
- Wallet page at /wallet.
- Display conversion: 50,000 Coins = 1 Diamond; 1 Diamond = Rs. 1 reference value.

Important:
The withdrawal page is a request/UI flow. Actual cash payout requires an authorized
payment provider and server-side verification. This update does not turn wagered
game entries into cashable Diamonds or implement a house-edge wagering payout system.

- Unified virtual economy: 200 gift Coins = 1 Diamond; 1 Diamond = Rs. 1 reference; 1 Diamond = 25,000 Coins internal exchange; game/match stakes = 200K/500K/1M/2M/5M Coins.
- Level thresholds are now coherent across Gift (200), VIP (200), Host (8) and Family (5) ladders.
