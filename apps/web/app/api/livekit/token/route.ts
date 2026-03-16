import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedApiRequest, toApiAuthErrorResponse } from "@/lib/serverAuth";

type LivekitTokenRequestBody = {
  roomId?: unknown;
  roomName?: unknown;
  identity?: unknown;
  name?: unknown;
};

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${header}.${encodedPayload}.${signature}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedApiRequest(request);
  } catch (error) {
    return toApiAuthErrorResponse(error);
  }

  let body: LivekitTokenRequestBody;
  try {
    body = (await request.json()) as LivekitTokenRequestBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const roomId = asString(body.roomId);
  const roomName = asString(body.roomName) || roomId;
  const identity = asString(body.identity);
  const name = asString(body.name) || identity;

  if (!roomId || !roomName || !identity || !name) {
    return NextResponse.json(
      {
        message: "roomId, roomName, identity, and name are required."
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY ?? "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? "devsecret";
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880";
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ message: "LiveKit credentials are missing." }, { status: 503 });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + 60 * 60;

  const token = signJwt(
    {
      iss: apiKey,
      sub: identity,
      name,
      nbf: nowSeconds,
      exp: expiresAtSeconds,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true
      },
      metadata: JSON.stringify({
        roomId
      })
    },
    apiSecret
  );

  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/livekit/token",
    token,
    url: livekitUrl,
    roomName,
    identity,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
  });
}
