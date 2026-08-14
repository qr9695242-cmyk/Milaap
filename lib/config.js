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
export const DIAMOND_TO_COIN_RATE = 15000;
export const MIN_EXCHANGE_DIAMONDS = 10;
export const MIN_WITHDRAWAL_DIAMONDS = 500;
export const DIAMOND_CASH_RUPEES = 4; // private admin payout calculation; never shown on the public wallet UI.
