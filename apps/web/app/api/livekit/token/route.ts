import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.LIVEKIT_API_KEY ?? "devkey";
  return NextResponse.json({
    ok: true,
    placeholder: true,
    endpoint: "POST /api/livekit/token",
    token: "placeholder-livekit-token",
    apiKey
  });
}
