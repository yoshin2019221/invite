import { compressImage } from "@/lib/image";
import { getBrowserClient } from "@/lib/supabase/browser";

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/invite-photos/${path}`;
}

// Compresses a photo, uploads it straight to storage and returns its storage path.
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compressImage(file);
  const res = await fetch("/api/v1/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg" }),
  });
  if (!res.ok) throw new Error("upload url failed");
  const { path, token } = (await res.json()) as { path: string; token: string };
  const { error } = await getBrowserClient()
    .storage.from("invite-photos")
    .uploadToSignedUrl(path, token, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}
