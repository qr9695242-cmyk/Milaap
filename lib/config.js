// Milaap app — support & payment config
// Phase 3 (Wallet/Recharge) aur Help screen mein ye values use hongi.
// Yahan sirf DISPLAY ke liye numbers hain — asal payment verification
// hamesha backend/admin panel se manually confirm honi chahiye, kabhi
// bhi sirf frontend pe trust na karein.

export const SUPPORT_CONFIG = {
 supportEmail: "abdulhadi7888888@gmail.com",
 supportWhatsapp: "+923134586476", // "Help" section me dikhaya jayega
 paymentWhatsapp: "+923134586476", // Recharge confirm karne ke liye
 paymentRecipientName: "Qasim Raza",
 supportAddress: "Hafeez Road, Munshi Hospital, Lahore",
 paymentMethods: [
 { name: "JazzCash", number: "03244996576" },
 { name: "Easypaisa", number: "03244996576" },
 ],
};

// Admin Panel access — sirf ye emails /admin khol sakte hain.
// Firestore rules mein bhi yehi list use hoti hai (firestore.rules dekhein
// -> isSuperAdmin()), isliye dono jagah ek saath update karein agar naya
// admin add karna ho.
export const ADMIN_EMAILS = ["abdulhadi7888888@gmail.com"];

// Coin / Diamond economy — in-app only.
// Jab koi gift bheja jaata hai: gifter coins kharch karta hai, host ko
// diamonds milte hain is rate par — 50,000 coins ka gift spend = 1 diamond.
export const GIFT_DIAMOND_RATE = 1 / 50000; // 50,000 gift coins spent → 1 host Diamond earned

// Diamond → Coin exchange (in-app only, , so no admin approval
// needed — unlike recharge). Host apne earned diamonds ko wapas coins mein
// convert kar sakta hai is rate par — 1 diamond = 25,000 coins.
export const DIAMOND_TO_COIN_RATE = 25000; // 1 Diamond → 25,000 Coins (internal exchange; 50% of gift-earning rate)
export const MIN_EXCHANGE_DIAMONDS = 10;
export const PURCHASE_RUPEES_PER_PACK = 150;
export const PURCHASE_COINS_PER_PACK = 160;
export const PURCHASE_MIN_CUSTOM_RS = 500;
export const PURCHASE_COINS_PER_RUPEE = PURCHASE_COINS_PER_PACK / PURCHASE_RUPEES_PER_PACK;

// Unified Milaap virtual economy. These values are intentionally centralized so
// gifts, matches, games, wallet exchange and cash-out use one consistent rate.
// TikTok does not publish one universal fixed Coin→Diamond→cash table; its
// pricing/rewards can vary by region and product. These are Milaap's own
// TikTok-style settings, not a claim that they are TikTok's official rates.
export const MILAAP_ECONOMY = {
  giftCoinsPerDiamond: 50000,
  exchangeCoinsPerDiamond: 25000,
  rupeesPerDiamond: 1,
  gameStakes: [0, 200000, 500000, 1000000, 2000000, 5000000],
  matchWinner: "opponent_stake",
  matchDraw: "refund",
  cashableSource: "gift_diamonds_only",
};


// ── First Recharge Benefit (one-time welcome bundle) ───────────────────
// Har naye user ko Wallet khulte hi ek limited-time "Recharge Benefit"
// popup dikhta hai (ek hi baar claim ho sakta hai, phir hamesha ke liye
// gayab). Countdown khatam ho jaye ya user claim kar le, dono soorat mein
// dobara nahi dikhta. Normal recharge packages (lib/wallet.js) ke muqable
// yahan public recharge economy ke saath aligned welcome package hai.
export const FIRST_RECHARGE_OFFER = {
 id: "first-offer",
 priceRs: 1000,
 coins: 1067,
 durationMs: 24 * 60 * 60 * 1000,
 tiles: [
  { label: "Coins", tag: "x1,067", coins: 1067 },
 ],
};
