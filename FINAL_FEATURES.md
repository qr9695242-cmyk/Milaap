# Milaap Premium 2026 — Final Build Feature Inventory

This package is the consolidated project from the latest supplied Milaap build and requested changes.

## Core social
- Home / Live / Chat / Games / Me navigation
- Live rooms with real-time room chat, gifts, seats, follows, notifications
- 1-to-1 messages with text and voice notes
- Live/audio match lobby with six tables, six seats per table
- Notifications and unread indicators
- Profiles, friends/connections, family, VIP, levels, medal, gold mine, invite, store, items

## Games
- 18-game premium catalog UI
- Ludo: 2-player and 4-player real-time matchmaking paths
- Ludo Quick Match / room-code flow
- Ludo entry/reward rules configured in the project
- Carrom and other game lobbies are present in the catalog; non-Ludo games use lobby/premium-game screens unless a dedicated engine exists.

## Economy
- 18 coin recharge packages
- 18 premium gifts
- High-value gift/coin tiers
- Ludo conversion rules in the Ludo flow
- Withdrawal/cash-out is intentionally disabled and no withdrawal UI is provided.

## Decorations
- 100 frame assets
- 100 vehicle/ride assets
- Premium decoration catalog and Cloudinary upload tooling
- Profile/room decoration components

## Security
- Firestore rules and Ludo security files included
- Server-authoritative Ludo functions are included
- Duplicate settlement protections are included in the Ludo flow
- Withdrawal/cash-out disabled

## Important production note
Before launch, configure Firebase, Cloudinary, Agora, App Check/auth, and production Firestore indexes/rules. Real payment processing should be verified server-side; never credit coins solely from a client payment callback.
