# Milaap — Is session ke fixes

## Sabse zaroori: Firestore composite indexes missing thay
Ye asal wajah thi coins/rooms na dikhne ki. `where()+orderBy()` wali har
query ko composite index chahiye — jab tak wo nahi banta, wo listener
silently fail ho kar khaali result deta hai.

**Tumhara kaam:** naye deploy ke baad Admin Panel aur Rooms tab kholo,
browser console (F12) mein Firestore ka error dekho, uska "create it here"
link click karo. `firestore.indexes.json` bhi bana diya hai agar Firebase
CLI se `firebase deploy --only firestore:indexes` chalana ho (`firebase.json`
aur `.firebaserc` bhi add kar diye hain, project: milaap-ad78e).

Files: `firestore.indexes.json` (naya), `firebase.json` (naya),
`.firebaserc` (naya), `lib/rooms.js`, `lib/wallet.js`, `lib/moderation.js`
(sab mein error surfacing add ki), `app/rooms/page.js`, `app/admin/page.js`
(error banners add kiye).

## Agora "Could not connect" error
Root cause confirm nahi kar saka (console access nahi hai) — lekin sabse
zyada mumkin wajah: Agora project "App ID + Token (Secured)" mode par hai
jabke code null token ke sath join karta hai. Error message ab asal Agora
error dikhayega, generic text nahi.

**Tumhara kaam:** console.agora.io → project → Authentication check karo.
(Tumne ZEGOCLOUD ki keys bhi bheji thin — wo alag SDK hai jo apni poori UI
le leta hai, isse tumhara seat/gift/VIP UI replace ho jata — is liye abhi
Agora hi rakha hai. Confirm karo agar switch karna hai.)

Files: `app/live/[roomId]/page.js`, `app/audio-room/[roomId]/page.js`
(dono mein error message + back arrow).

## Gift-send option missing tha
`GiftBar` sirf non-host ko dikhta tha (`{!isHost && ...}`) — host test
karte waqt kabhi nazar nahi aata. Ab audio-room mein koi bhi (host ya
guest) kisi bhi doosre seated user ko gift bhej sakta hai — chip-picker se
target select hota hai.

Files: `components/GiftBar.jsx` (target picker add), `app/audio-room/[roomId]/page.js`.

## Naya logo
Uploaded PNG se icon-only crop nikaal kar teeno sizes generate kiye.
Files: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`.

## Diamond → Coin exchange (naya feature)
1 diamond = 2 coins, turant convert (real paisa nahi to admin approval
nahi chahiye). Wallet tab mein naya section.
Files: `lib/config.js`, `lib/wallet.js`, `app/wallet/page.js`.

## Back button (←) add kiya
Pehle kisi bhi nested page se wapas jaane ka koi tareeqa nahi tha.
Files: `app/vip`, `app/rewards`, `app/agency`, `app/help`, `app/family`,
`app/family/[familyId]`, `app/wallet/withdraw`, `app/wallet/recharge`,
`app/notifications`, `app/forgot-password`, `app/admin`, plus dono room
pages ke header mein.

## Verify nahi kar saka
Zip mein `node_modules` nahi tha aur sandbox mein internet nahi hai, is
liye `npm run build` nahi chala saka. Har file manually dobara check ki
hai aur bracket-balance verify kiya hai, lekin deploy se pehle apne
machine par ek dafa `npm run build` chala lena.

## Abhi baaki (12-feature list mein se)
SVIP1-10, Vehicle/Frame Collection, Rocket Reward, Friend CP, Luxury Car
Club, Room Ranking, Coin Seller Panel, Daily Treasure, Coin Animation —
in mein se koi bhi shuru nahi kiya, ye sab alag-alag bade features hain.
Batao kaunse 2-3 pehle chahiye.
