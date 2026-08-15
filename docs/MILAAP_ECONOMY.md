# Milaap Virtual Economy

## Important
TikTok does not publish one universal fixed Coin→Diamond→cash conversion table. TikTok states that viewers buy Coins to send Gifts and that Diamonds are rewards; exact pricing/rewards can vary. Milaap therefore uses the following **TikTok-style internal economy**, not a claim of TikTok's official rates.

## Core rates
- Gift earning: **50,000 Coins spent = 1 Diamond earned by host**.
- Diamond cash reference: **1 Diamond = Rs. 1**.
- Internal exchange: **1 Diamond = 25,000 Coins**. This is intentionally lower than the 50,000-coin earning rate so exchanging Diamonds back to Coins creates a 50% sink and cannot create an infinite coin/diamond loop.
- Cash withdrawal source: **Diamonds only**.
- Minimum exchange: **10 Diamonds**.

## Recharge packages
| Price | Base Coins | Bonus | Total Coins |
|---:|---:|---:|---:|
| Rs. 1,000 | 3,200,000 | 320,000 | 3,520,000 |
| Rs. 5,000 | 16,000,000 | 2,000,000 | 18,000,000 |
| Rs. 12,000 | 38,400,000 | 5,800,000 | 44,200,000 |
| Rs. 25,000 | 80,000,000 | 13,600,000 | 93,600,000 |
| Rs. 40,000 | 128,000,000 | 24,000,000 | 152,000,000 |

## Game / match entries
- Free
- 200,000 Coins
- 500,000 Coins
- 1,000,000 Coins
- 2,000,000 Coins
- 5,000,000 Coins

For a 2-player coin match, the winner receives the opponent's stake; a draw has no transfer. Skill mini-games return the paid entry plus a capped score bonus; free games can award a capped virtual-coin reward.

## Recharge
Current Milaap recharge packages remain in `lib/wallet.js`; changing purchase pricing does not automatically change Gift/Exchange/Withdrawal rates.

## Levels
- Gift Level: 200 levels based on lifetime Coins gifted.
- VIP: 200 levels based on lifetime recharge Rs.
- Host Level: 8 levels based on Diamonds received.
- Family Level: 5 levels based on family Diamonds.

All economy values should be changed through the centralized config rather than hard-coded in individual game pages.
