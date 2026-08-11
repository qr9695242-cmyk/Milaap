// Milaap app — support & payment config
// Phase 3 (Wallet/Recharge) aur Help screen mein ye values use hongi.
// Yahan sirf DISPLAY ke liye numbers hain — asal payment verification
// hamesha backend/admin panel se manually confirm honi chahiye, kabhi
// bhi sirf frontend pe trust na karein.

export const SUPPORT_CONFIG = {
  supportEmail: "abdulhadi7888888@gmail.com",
  supportWhatsapp: "+923134586476", // "Help" section me dikhaya jayega
  paymentWhatsapp: "+923244996576", // Recharge confirm karne ke liye
  paymentRecipientName: "Qasim Raza",
  paymentMethods: [
    { name: "JazzCash", number: "03244996576" },
    { name: "Easypaisa", number: "03244996576" },
  ],
};

// Admin Panel access — sirf ye emails /admin khol sakte hain.
// Firestore rules mein bhi yehi list use hoti hai (firestore.rules dekhein),
// isliye dono jagah ek saath update karein agar naya admin add karna ho.
export const ADMIN_EMAILS = ["abdulhadi7888888@gmail.com"];

// Coin / Diamond economy — TikTok LIVE ke model ke hisaab se:
// viewer coins se gift bhejta hai, host ko usi gift ki ~50% value
// diamonds mein milti hai (TikTok bhi apna platform cut yahi ~50%
// coin->diamond conversion step par leta hai — cash-out step par
// koi extra fee nahi hoti). Isliye:
//   • GIFT_DIAMOND_RATE = 0.5  → 2 coins bheje = 1 diamond credit hota hai
//   • DIAMOND_WITHDRAW_RATE_RS → 1 diamond withdraw karne par host ko
//     kitne Rs milte hain (currently set to Rs 2 per diamond)
export const GIFT_DIAMOND_RATE = 0.5;
export const DIAMOND_WITHDRAW_RATE_RS = 2;
export const MIN_WITHDRAW_DIAMONDS = 1000; // TikTok jaisa hi minimum cashout threshold

// Diamond → Coin exchange (in-app only, no real money, so no admin approval
// needed — unlike recharge/withdraw). Rate is the exact inverse of
// GIFT_DIAMOND_RATE (2 coins = 1 diamond when gifting), so a host who
// converts diamonds back to coins and re-gifts them isn't gaining or
// losing extra value beyond the cut already taken at gift time.
export const DIAMOND_TO_COIN_RATE = 2;
export const MIN_EXCHANGE_DIAMONDS = 10;
