import { NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

// Server-only secrets — never prefix these with NEXT_PUBLIC_, and never
// send the certificate to the browser. Add both to .env.local (App ID can
// reuse the existing public one, Certificate must be added fresh, and this
// file only runs on the server so it's safe to read it here):
//
//   AGORA_APP_ID=<same value as NEXT_PUBLIC_AGORA_APP_ID>
//   AGORA_APP_CERTIFICATE=<Primary Certificate from Agora Console>
const APP_ID = process.env.AGORA_APP_ID || process.env.NEXT_PUBLIC_AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const TOKEN_EXPIRE_SECONDS = 24 * 60 * 60; // 24 hours

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const uid = searchParams.get("uid"); // Firebase uid string, used as Agora "account"

  if (!channel || !uid) {
    return NextResponse.json(
      { error: "channel and uid query params are required" },
      { status: 400 }
    );
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    return NextResponse.json(
      {
        error:
          "AGORA_APP_ID / AGORA_APP_CERTIFICATE not configured on the server. Add them to .env.local (no NEXT_PUBLIC_ prefix on the certificate).",
      },
      { status: 500 }
    );
  }

  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithAccount(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      uid,
      RtcRole.PUBLISHER,
      expireAt
    );

    return NextResponse.json({ token, expireAt });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Token generation failed" },
      { status: 500 }
    );
  }
}
