// Translation strings for the app's language switcher (lib/LanguageContext.js).
// Keep keys flat and short — dot-free, so `t("nav.home")`-style nesting
// isn't needed; components just call t("home").
//
// Scope note: this seeds the highest-traffic surfaces (bottom nav, Help
// page, common actions) as the foundation. The rest of the app's ~40
// pages are still hardcoded Urdu/English strings — extending coverage is
// just adding more keys here and swapping `"literal text"` for `t("key")`
// in a given component, same pattern as the ones already converted.
export const LOCALES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

export const TRANSLATIONS = {
  en: {
    nav_home: "Home",
    nav_live: "Live",
    nav_chat: "Chat",
    nav_games: "Games",
    nav_me: "Me",

    help_title: "Help & Support",
    help_subtitle: "Contact us for any issue.",
    help_whatsapp: "WhatsApp Support",
    help_email: "Email Support",
    help_chat: "Chat",
    help_safety_title: "Safety & Legal Contact",
    help_safety_subtitle:
      "For illegal activity, threats, or child-safety issues, this address/number reaches our team and, if needed, local authorities.",
    help_address: "Registered Address",
    help_emergency_title: "Emergency danger?",
    help_emergency_body:
      "If someone's life or safety is in immediate danger, contact your local police first — our support team can't respond fast enough for that.",

    login_title: "Welcome back",
    login_email: "Email",
    login_password: "Password",
    login_button: "Log In",
    login_no_account: "Don't have an account?",
    login_signup_link: "Sign up",

    signup_title: "Create your account",
    signup_button: "Sign Up",
    signup_have_account: "Already have an account?",
    signup_login_link: "Log in",

    profile_language: "Language",
    profile_edit: "Edit Profile",
    profile_wallet: "Wallet",
    profile_help: "Help & Support",
    profile_logout: "Log Out",

    common_cancel: "Cancel",
    common_save: "Save",
    common_close: "Close",
    common_loading: "Loading…",
    common_coins: "coins",
  },
  ur: {
    nav_home: "ہوم",
    nav_live: "لائیو",
    nav_chat: "چیٹ",
    nav_games: "گیمز",
    nav_me: "میں",

    help_title: "مدد اور سپورٹ",
    help_subtitle: "کسی بھی مسئلے کے لیے ہم سے رابطہ کریں۔",
    help_whatsapp: "واٹس ایپ سپورٹ",
    help_email: "ای میل سپورٹ",
    help_chat: "چیٹ",
    help_safety_title: "حفاظت اور قانونی رابطہ",
    help_safety_subtitle:
      "غیر قانونی سرگرمی، دھمکیوں، یا بچوں کی حفاظت سے متعلق مسئلے کے لیے، اس پتے/نمبر پر ہماری ٹیم اور، اگر ضرورت ہو، مقامی حکام تک رسائی ہو سکتی ہے۔",
    help_address: "رجسٹرڈ پتہ",
    help_emergency_title: "فوری خطرہ؟",
    help_emergency_body:
      "اگر کسی کی جان یا حفاظت کو فوری خطرہ ہے، تو سب سے پہلے اپنی مقامی پولیس سے رابطہ کریں — ہماری سپورٹ ٹیم اتنی جلدی جواب نہیں دے سکتی۔",

    login_title: "خوش آمدید",
    login_email: "ای میل",
    login_password: "پاس ورڈ",
    login_button: "لاگ ان",
    login_no_account: "اکاؤنٹ نہیں ہے؟",
    login_signup_link: "سائن اپ کریں",

    signup_title: "اپنا اکاؤنٹ بنائیں",
    signup_button: "سائن اپ",
    signup_have_account: "پہلے سے اکاؤنٹ ہے؟",
    signup_login_link: "لاگ ان کریں",

    profile_language: "زبان",
    profile_edit: "پروفائل میں ترمیم",
    profile_wallet: "والیٹ",
    profile_help: "مدد اور سپورٹ",
    profile_logout: "لاگ آؤٹ",

    common_cancel: "منسوخ کریں",
    common_save: "محفوظ کریں",
    common_close: "بند کریں",
    common_loading: "لوڈ ہو رہا ہے…",
    common_coins: "کوائنز",
  },
  ar: {
    nav_home: "الرئيسية",
    nav_live: "بث مباشر",
    nav_chat: "الدردشة",
    nav_games: "الألعاب",
    nav_me: "حسابي",

    help_title: "المساعدة والدعم",
    help_subtitle: "تواصل معنا لأي مشكلة.",
    help_whatsapp: "دعم واتساب",
    help_email: "دعم البريد الإلكتروني",
    help_chat: "محادثة",
    help_safety_title: "السلامة والتواصل القانوني",
    help_safety_subtitle:
      "بخصوص الأنشطة غير القانونية أو التهديدات أو قضايا سلامة الأطفال، يمكن الوصول إلى فريقنا وعند الحاجة السلطات المحلية عبر هذا العنوان/الرقم.",
    help_address: "العنوان المسجل",
    help_emergency_title: "خطر طارئ؟",
    help_emergency_body:
      "إذا كانت حياة أو سلامة أحدهم في خطر فوري، تواصل مع الشرطة المحلية أولاً — فريق الدعم لدينا لا يستطيع الاستجابة بالسرعة الكافية لذلك.",

    login_title: "مرحبًا بعودتك",
    login_email: "البريد الإلكتروني",
    login_password: "كلمة المرور",
    login_button: "تسجيل الدخول",
    login_no_account: "ليس لديك حساب؟",
    login_signup_link: "إنشاء حساب",

    signup_title: "أنشئ حسابك",
    signup_button: "إنشاء حساب",
    signup_have_account: "لديك حساب بالفعل؟",
    signup_login_link: "تسجيل الدخول",

    profile_language: "اللغة",
    profile_edit: "تعديل الملف الشخصي",
    profile_wallet: "المحفظة",
    profile_help: "المساعدة والدعم",
    profile_logout: "تسجيل الخروج",

    common_cancel: "إلغاء",
    common_save: "حفظ",
    common_close: "إغلاق",
    common_loading: "جارٍ التحميل…",
    common_coins: "عملات",
  },
};

export function translate(locale, key) {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
