# Milaap — Phase 1

Login/Signup + Home Screen + Profile, Firebase ke saath.

> Note: `.env.local` mein Agora App ID already daal di gayi hai.
> Firebase keys abhi khaali hain — step 3-4 follow karke wo fill karein.
> Support/payment contact `lib/config.js` mein hai (Phase 3 Wallet aur
> Help screen isko use karenge).

## Setup (apne laptop pe)

1. **Node.js install karein** (v18+): https://nodejs.org

2. **Dependencies install karein**
   ```
   npm install
   ```

3. **Firebase project banayein**
   - https://console.firebase.google.com pe jaayein → Add project
   - Build > Authentication > Get Started > Email/Password enable karein
   - Build > Firestore Database > Create database (test mode se shuru karein)
   - Project Settings > General > "Your apps" > Web app (</>) add karein
   - Config values copy karein

4. **Environment file banayein**
   ```
   cp .env.local.example .env.local
   ```
   Firebase config values `.env.local` mein paste karein.

5. **Firestore rules deploy karein** (Firebase Console > Firestore > Rules mein
   `firestore.rules` ka content paste kar dein, ya Firebase CLI use karein).

6. **Dev server chalayein**
   ```
   npm run dev
   ```
   http://localhost:3000 pe khulega.

## Ab kya kaam karta hai (Phase 2 tak)

- `/signup` — naya account banaye (Firebase Auth + Firestore user doc)
- `/login` — sign in
- `/` — Home screen (protected)
- `/profile` — user info, coins/diamonds display, sign out
- `/rooms` — Live Streams aur Audio Rooms ki list, naya room banayein
- `/live/[roomId]` — Agora video broadcast: host camera/mic publish karta
  hai, viewers dekhte hain, saath mein live chat
- `/audio-room/[roomId]` — 12-seat audio room: koi bhi seat tap karke baith
  sakta hai (mic publish hoti hai), khali chhod ke chala jaaye, saath mein
  live chat
- `/wallet` — coins/diamonds balance, recharge history
- `/wallet/recharge` — package select karke JazzCash/Easypaisa se pay karein,
  request submit hoti hai (admin approval ka wait — Phase 4 mein admin panel
  banega)
- Gift system — live/audio rooms mein niche gift bar se koi bhi gift bhej
  sakta hai; coins deduct hoke host ki diamonds mein add ho jaate hain,
  aur ek chhota "X sent Y" feed room ke upar dikhta hai
- `/vip` — VIP/SVIP tiers, lifetime recharge (Rs) ke hisaab se level
- `/family` — families ki leaderboard, naya family banayein ya join karein
- `/family/[familyId]` — members list, diamonds contribute karke family
  level up karein
- `/leaderboard` — "Top Hosts" (sabse zyada diamonds kamaane wale) aur
  "Rich List" (sabse zyada recharge karne wale)
- PK Battle — live stream ke andar host "⚔ Start PK Battle" se doosre live
  host ko challenge kar sakta hai; 3 minute ka timer, dono taraf gifts se
  score badhta hai, jyada score wala jeetta hai
- `/admin` — sirf `ADMIN_EMAILS` (lib/config.js) mein di gayi email se
  login karne par khulta hai: pending recharge requests approve/reject
  karein, live rooms force-end karein
- `/help` — WhatsApp aur email support

Frames, Vehicles/Cars, Friends/CP, aur push Notifications abhi ban nahi
paaye — original list mein the lekin app ka core loop (auth → stream →
gift → wallet → VIP → PK battle → family → admin) complete ho chuka hai.
Ye chaaron baad mein isi structure pe add ho sakte hain.

### PK Battle ka scope

Abhi PK battle sirf "gifts = score" tak simple rakha gaya hai — real
Bigo-style apps mein dono streams split-screen mein ek saath dikhti hain
(dono Agora channels ek hi UI mein). Yahan har host apni video apne room
mein dekhta hai aur sirf score bar dikhta hai — split-screen video Phase 5
mein add ho sakta hai agar chahiye ho.

### ⚠️ Wallet economy — production security note

Abhi coins/diamonds Firestore mein seedha client se update hote hain
(recharge approval + gift sending). Ye demo/testing ke liye theek hai,
lekin **real paise involve hone ki wajah se** launch se pehle ye poora
logic ek trusted backend (Firebase Cloud Functions) mein move karna
zaroori hai — warna koi bhi apna balance khud badal sakta hai. Detail
`lib/gifts.js` ke top comment mein hai.

### Agora ke baare mein zaroori baat

Abhi App ID-only mode use ho raha hai — testing ke liye theek hai, lekin
**production launch se pehle token-based auth zaroori hai**, warna koi bhi
aapki App ID se channel join kar sakta hai. Detail `lib/agora.js` ke
comments mein hai.

### Firestore index

`/rooms` list query (`status == "live"` + `orderBy(createdAt)`) ke liye
Firestore ek **composite index** maangega. Jab pehli baar `/rooms` page
kholenge aur console mein error aaye, uss error mein diya gaya link click
kar dein — Firebase khud index bana dega (1-2 min lagte hain).

## Phase 4B — Social Layer (Follow, Search, Presence, Block/Report, Notifications)

Naye features, koi naya external account/API key nahi chahiye — sab
Firestore + existing Firebase Auth pe bane hain:

- **User Search** (`/search`) — `lib/search.js`, name-prefix match. Naye
  users ka `displayNameLower` field auto-set hota hai (`lib/AuthContext.js`);
  purane accounts bhi pehli baar login pe khud-ba-khud backfill ho jaate hain.
- **Follow / Following** — `lib/follow.js`. Har profile pe Follow button
  (`components/FollowButton.jsx`), followers/following count profile pe
  aur `/u/{uid}/connections` pe list.
- **Public Profile** — `/u/{uid}` — kisi bhi user ka profile dekhne ke liye.
  Apna khud ka uid daalne pe `/profile` pe redirect ho jata hai.
- **Real-time Online Status** — `lib/presence.js`. Har 30s heartbeat likha
  jata hai; ~45s se purana ho to offline maana jata hai. Ye Firestore-based
  "best effort" presence hai — asal Realtime-Database `onDisconnect()` jitna
  turant/accurate nahi (tab band karne ke ~45s baad tak online dikh sakta hai).
- **Block & Report** — `lib/block.js`. Kisi profile ke ⋮ menu se block ya
  report kar sakte hain. Blocked list `/blocked` pe manage hoti hai. Reports
  sirf Firestore mein `status: pending` ke sath log hote hain — Admin Panel
  mein inhe review karne ka UI abhi nahi bana (agla step ho sakta hai).
- **In-app Notifications** — `lib/notifications.js`, bell icon home/profile
  header mein. Abhi sirf "naya follower" event bhejta hai; gift/PK/family
  jaisi jagah pe `createNotification()` call add karke aur events wire
  kiye ja sakte hain. **Push notifications (phone lock screen pe) alag
  cheez hain** — unke liye Firebase Cloud Messaging VAPID key aur service
  worker chahiye, ye is batch mein include nahi.

### ⚠️ Deploy karna zaroori hai

`firestore.rules` update hui hai (naye `follows`, `blocks`, `reports`,
`notifications` collections + `users` doc pe counter-update rule). Firebase
console ya CLI (`firebase deploy --only firestore:rules`) se naya rules
file deploy kiye bina ye saare features permission-denied error denge.

### Naye Firestore composite index

`/u/{uid}/connections` (followers/following list) query
(`where(followingId==uid) + orderBy(createdAt)`, aur wohi followerId ke
sath) ke liye Firestore composite index maangega — pehli baar khulne pe
console error mein diya link click kar dein, jaisa `/rooms` ke liye upar
bataya gaya hai.

## Phase 5 — Host Level, VIP Badges, Rewards, Agency, Roles, Analytics, Theme

Naya external account/API key nahi chahiye — sab existing Firebase pe bana hai.

- **Host Level System** (`lib/hostLevel.js`) — lifetime diamonds ke hisaab se
  8 levels (Rising → Legend). Badge `components/HostLevelBadge.jsx` profile,
  leaderboard, agency, aur user-row pe dikhta hai.
- **VIP Badge** (`components/VipBadge.jsx`) — pehle se maujood VIP tiers
  (`lib/vip.js`) ko ab ek chhota badge bhi milta hai jo profile/leaderboard
  pe show hota hai.
- **Daily Rewards / Lucky Box / Spin Wheel** (`lib/rewards.js`,
  `/rewards`) — daily check-in (7-day streak, missed day pe reset), coins
  se Lucky Box open karna, ya Spin Wheel ghumana — dono weighted-random
  prizes (coins/diamonds/jackpot) dete hain.
- **Agency Panel** (`lib/agency.js`, `/agency`) — koi bhi agency bana sakta
  hai (6-character invite code milta hai), hosts us code se join karke
  agency ka hissa ban sakte hain; leader ko members ki diamonds-earning
  roster dikhti hai.
- **Super Admin Roles & Permissions** (`lib/roles.js`) — `ADMIN_EMAILS`
  (lib/config.js) ab **superadmin** tier hai; superadmin Admin Panel se
  kisi bhi user ko **admin** (recharge approval, room force-end, analytics)
  ya **moderator** (sirf reports triage) role de sakta hai. Reports ab
  Admin Panel mein directly review/resolve ho sakte hain.
- **Analytics Dashboard** (`lib/analytics.js`, `/admin/analytics`) — total
  users, aaj ke naye users, live rooms, pending/approved recharges, total
  revenue (Rs), families, aur pending reports — sab ek jagah, admin/superadmin
  ke liye.
- **Dark/Light Theme Switch** (`lib/ThemeContext.js`,
  `components/ThemeToggle.jsx`) — toggle button home/profile header pe;
  preference `localStorage` mein save hoti hai. Poore app ka color system
  ab CSS variables (`app/globals.css`) se aata hai, isliye purane pages
  bhi bina extra kaam ke theme switch pe repaint ho jaate hain.

### ⚠️ Deploy karna zaroori hai (Phase 5)

`firestore.rules` phir se update hui hai (naye `agencies`, `rewardStatus`,
`luckyBoxLog`, `spinWheelLog` collections + `users` doc pe role-change
protection + reports ab `isModerator()` se triage hote hain). Deploy kiye
bina naye features permission-denied denge:
```
firebase deploy --only firestore:rules
```

### Naye Firestore composite index

`/agency` page ka members list query (`where(agencyId==id) + orderBy(diamonds
desc)`) ke liye Firestore composite index maangega — pehli baar khulne pe
console error mein diya gaya link click kar dein (jaisa `/rooms` aur
`/u/{uid}/connections` ke liye upar bataya gaya hai).

### Kisi ko admin/moderator banana

1. Superadmin (`ADMIN_EMAILS` wali email se) login karke `/admin` kholein.
2. Us user ka UID copy karein (unke public profile URL `/u/<uid>` se milta
   hai).
3. "Manage Team Roles" section mein UID paste karke role select karein →
   **Update Role**.

## Phase 6 (baaki bacha hua — external accounts/credentials chahiye)

Google Login, Phone Number Login (OTP), Push Notifications (Firebase
Cloud Messaging VAPID key + service worker), Coins Purchase Payment
Gateway (JazzCash/Easypaisa/Stripe API integration), Video Upload/Short
Videos (storage + transcoding), Multi-Guest Live (4/6/9 seats — split
Agora channels), Live Stream Recording, Share Live Link (deep link/OG
tags). In sabke liye pehle respective service pe account banana/API keys
lena hoga — jab ready hon, batayein, isi structure pe wire kar denge.

## GitHub + Vercel Deployment

1. GitHub pe naya repo banayein, phir:
   ```
   git init
   git add .
   git commit -m "Phase 1: auth, home, profile"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. https://vercel.com pe GitHub se login karein → "Import Project" → apna repo select karein
   > ⚠️ Agar aapke GitHub repo ka structure `live-app/` folder ke andar hai
   > (jaisa is zip mein hai — repo root pe `live-app/`, uske andar
   > `package.json`), to **Root Directory** field mein `live-app` type
   > karna zaroori hai (Vercel import screen pe hi dikhta hai, ya baad mein
   > Settings → General → Root Directory se). Agar yeh set nahi hua to build
   > `package.json` nahi dhoondh payega aur site pe `404: NOT_FOUND` aayega.
3. Environment Variables tab mein `.env.local` ki saari values daal dein
4. Deploy — Vercel automatically Next.js detect kar lega

## Next Phases

- ~~**Phase 2** — Agora Live Streaming, Audio Rooms (12 seats), Live Chat~~ ✅ done
- ~~**Phase 3** — Wallet, Gift System, Coins, Easypaisa/JazzCash Recharge~~ ✅ done
- ~~**Phase 4** — VIP/SVIP, PK Battle, Family System, Admin Panel~~ ✅ done
- ~~**Phase 4B** — Follow/Following, User Search, Online Status, Block & Report, Notifications~~ ✅ done
- **Phase 5** — baaki missing list se: Host Level System, VIP Badge, Daily
  Tasks/Rewards, Lucky Box, Spin Wheel, Agency Panel, Super Admin Roles,
  Analytics Dashboard, Dark/Light Theme (koi external account nahi chahiye).
  Uske baad: Google Login, Phone OTP, Push Notifications (Firebase setup
  chahiye) aur Payment Gateway, Video Upload, Multi-Guest Live, Stream
  Recording (external accounts/credentials + zyada dev time chahiye).

## Admin access

`/admin` sirf us email se khulta hai jo `lib/config.js` ke `ADMIN_EMAILS`
array mein hai (`abdulhadi7888888@gmail.com`). Firebase mein isi email se
signup karke login karein. Naya admin add karna ho to **do jagah** update
karein: `lib/config.js` ka `ADMIN_EMAILS` aur `firestore.rules` ka
`isAdmin()` function.
