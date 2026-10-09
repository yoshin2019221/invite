import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient, PHOTO_BUCKET } from "@/lib/supabase/admin";

const bodySchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

// Returns a one-time signed URL so the browser can upload a photo straight to storage.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const path = `drafts/${crypto.randomUUID()}.${EXTENSIONS[parsed.data.contentType]}`;
  const { data, error } = await getAdminClient()
    .storage.from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("signed upload failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token });
}
