// Google actively blocks/limits OAuth inside embedded "in-app browsers"
// (WhatsApp, Instagram, Facebook, TikTok, Snapchat, Line, etc.) and even
// where it doesn't outright block it, these webviews often partition
// storage so the redirect-back silently loses the sign-in — no error is
// ever thrown, the account just never gets created. Detect the common
// user-agent signatures so we can warn the user instead of leaving them
// stuck on a button that "does nothing."
export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly|MicroMessenger|Twitter/i.test(
    ua
  );
}
