import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuthenticatedApiRequest, toApiAuthErrorResponse } from "@/lib/serverAuth";

type PresignUploadBody = {
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
};

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const PRESIGN_EXPIRY_SECONDS = 15 * 60;
const R2_REGION = "auto";
const R2_SERVICE = "s3";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodePath(value: string): string {
  return value
    .split("/")
    .map((part) => encodeRfc3986(part))
    .join("/");
}

function toQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(params[key] ?? "")}`)
    .join("&");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function hmacSha256(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.split("/").pop() ?? fileName;
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 120);
  return cleaned || "upload.bin";
}

function toPublicObjectUrl(objectKey: string): string | undefined {
  const configured = asString(process.env.R2_PUBLIC_URL ?? "");
  if (!configured) {
    return undefined;
  }
  const normalized = configured.replace(/\/+$/, "");
  return `${normalized}/${encodePath(objectKey)}`;
}

function createPresignedUploadUrl(input: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  contentType: string;
  objectKey: string;
  expiresInSeconds: number;
}): string {
  const host = `${input.accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const canonicalUri = `/${encodePath(input.bucketName)}/${encodePath(input.objectKey)}`;
  const signedHeaders = "content-type;host";

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": signedHeaders
  };

  const canonicalHeaders = `content-type:${input.contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    toQueryString(queryParams),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmacSha256(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, R2_REGION);
  const kService = hmacSha256(kRegion, R2_SERVICE);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

  const fullQuery = `${toQueryString(queryParams)}&X-Amz-Signature=${signature}`;
  return `https://${host}${canonicalUri}?${fullQuery}`;
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedApiRequest(request);
  } catch (error) {
    return toApiAuthErrorResponse(error);
  }

  let body: PresignUploadBody;
  try {
    body = (await request.json()) as PresignUploadBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const fileName = sanitizeFileName(asString(body.fileName));
  const contentType = asString(body.contentType) || "application/octet-stream";
  const sizeBytes = typeof body.sizeBytes === "number" ? Math.trunc(body.sizeBytes) : Number.NaN;

  if (sizeBytes <= 0 || !Number.isFinite(sizeBytes)) {
    return NextResponse.json({ message: "sizeBytes must be a positive integer." }, { status: 400 });
  }

  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      {
        message: `sizeBytes exceeds max upload size (${MAX_UPLOAD_SIZE_BYTES} bytes).`
      },
      { status: 413 }
    );
  }

  const accountId = asString(process.env.R2_ACCOUNT_ID ?? "");
  const accessKeyId = asString(process.env.R2_ACCESS_KEY_ID ?? "");
  const secretAccessKey = asString(process.env.R2_SECRET_ACCESS_KEY ?? "");
  const bucketName = asString(process.env.R2_BUCKET_NAME ?? "houseplan-uploads");
  const datePrefix = new Date().toISOString().slice(0, 10);
  const objectKey = `uploads/${datePrefix}/${randomUUID()}-${fileName}`;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return NextResponse.json(
      {
        ok: true,
        endpoint: "POST /api/upload/presign",
        method: "PUT",
        uploadUrl: `/api/upload/local/${encodePath(objectKey)}`,
        objectKey,
        contentType,
        sizeBytes,
        expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
        requiredHeaders: {
          "content-type": contentType
        },
        publicUrl: `/${encodePath(objectKey)}`
      }
    );
  }

  const uploadUrl = createPresignedUploadUrl({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    contentType,
    objectKey,
    expiresInSeconds: PRESIGN_EXPIRY_SECONDS
  });

  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/upload/presign",
    method: "PUT",
    uploadUrl,
    objectKey,
    contentType,
    sizeBytes,
    expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
    requiredHeaders: {
      "content-type": contentType
    },
    publicUrl: toPublicObjectUrl(objectKey)
  });
}
