import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, "uploads");

function sanitizePathSegments(segments: string[]): string[] {
  return segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]+/g, "-"))
    .filter((segment) => segment !== "." && segment !== "..");
}

export async function PUT(
  request: Request,
  context: { params: { objectKey?: string[] } }
) {
  const objectKey = sanitizePathSegments(context.params.objectKey ?? []);
  if (objectKey.length < 2 || objectKey[0] !== "uploads") {
    return NextResponse.json({ message: "Invalid upload path." }, { status: 400 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      { message: `Upload exceeds max upload size (${MAX_UPLOAD_SIZE_BYTES} bytes).` },
      { status: 413 }
    );
  }

  const arrayBuffer = await request.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ message: "Upload body is empty." }, { status: 400 });
  }

  if (arrayBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      { message: `Upload exceeds max upload size (${MAX_UPLOAD_SIZE_BYTES} bytes).` },
      { status: 413 }
    );
  }

  const destinationPath = path.join(PUBLIC_ROOT, ...objectKey);
  const normalizedPath = path.normalize(destinationPath);
  if (!normalizedPath.startsWith(UPLOADS_ROOT + path.sep) && normalizedPath !== UPLOADS_ROOT) {
    return NextResponse.json({ message: "Invalid upload path." }, { status: 400 });
  }

  await mkdir(path.dirname(normalizedPath), { recursive: true });
  await writeFile(normalizedPath, Buffer.from(arrayBuffer));

  return new NextResponse(null, { status: 200 });
}
