import { NextResponse } from "next/server";

export async function POST() {
  const hasR2 =
    Boolean(process.env.R2_ACCOUNT_ID) &&
    Boolean(process.env.R2_ACCESS_KEY_ID) &&
    Boolean(process.env.R2_SECRET_ACCESS_KEY);

  if (!hasR2) {
    return NextResponse.json(
      {
        ok: false,
        placeholder: true,
        endpoint: "POST /api/upload/presign",
        message: "R2 credentials are missing in environment variables."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    placeholder: true,
    endpoint: "POST /api/upload/presign",
    url: "https://example-presigned-url.invalid"
  });
}
