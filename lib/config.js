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
// diamonds milte hain is rate par — 200 coins ka gift = 1 diamond.
export const GIFT_DIAMOND_RATE = 1 / 200; // 200 coins spent → 1 diamond earned

// Diamond → Coin exchange (in-app only, no real money, so no admin approval
// needed — unlike recharge). Host apne earned diamonds ko wapas coins mein
// convert kar sakta hai is rate par — 1 diamond = 50 coins.
export const DIAMOND_TO_COIN_RATE = 50;
export const MIN_EXCHANGE_DIAMONDS = 10;

// ── First Recharge Benefit (one-time welcome bundle) ───────────────────
// Har naye user ko Wallet khulte hi ek limited-time "Recharge Benefit"
// popup dikhta hai (ek hi baar claim ho sakta hai, phir hamesha ke liye
// gayab). Countdown khatam ho jaye ya user claim kar le, dono soorat mein
// dobara nahi dikhta. Normal recharge packages (lib/wallet.js) ke muqable
// yahan bohot zyada coins milte hain — isi liye ye ek "welcome bonus" hai.
export const FIRST_RECHARGE_OFFER = {
  id: "first-offer",
  priceRs: 800,
  coins: 6000000, // total coins is bundle mein
  durationMs: 24 * 60 * 60 * 1000, // 24 ghante ka countdown
  // Sirf visual breakdown — grid mein dikhane ke liye, sab isi ek purchase
  // ka hissa hain (inka total = coins).
  tiles: [
    { label: "Welcome Gift", tag: "x500,000", coins: 500000 },
    { label: "Bonus Coins", tag: "x3,500,000", coins: 3500000 },
    { label: "Instant Coins", tag: "x800,000", coins: 800000 },
    { label: "VIP Boost", tag: "x1,200,000", coins: 1200000 },
  ],
};
