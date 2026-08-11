// Uploads a file straight to Cloudinary from the browser using an
// "unsigned" upload preset — no server secret needed for this to work,
// which keeps it as simple as the old Firebase Storage call it replaces.
//
// Setup (one-time, in the Cloudinary dashboard):
//   1. Settings → Upload → Add upload preset
//   2. Signing mode: "Unsigned"
//   3. Copy the preset name + your Cloud name into .env.local:
//        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
//        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset-name
//
// Unsigned presets are public by design (they ship in client JS for every
// app that uses this pattern) — anyone with the preset name can upload TO
// your account. To keep that from being abused, set a folder, file size
// limit, and allowed formats on the preset itself in the Cloudinary
// dashboard, and consider restricting who can trigger this call in the
// app (see the note in lib/decorations.js).

// Cloudinary cloud name and unsigned upload preset are public client-side values.
// Defaults are included so the app works even if these NEXT_PUBLIC env vars are
// not configured yet. They can still be overridden by environment variables.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "hvna6ugg";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "milaap_upload";

/**
 * Uploads a File/Blob to Cloudinary and returns { url, isVideo }.
 * `folder` groups uploads in the Cloudinary media library (e.g. "decorations/vehicle").
 */
export async function uploadToCloudinary(file, folder) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local"
    );
  }

  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  // Cloudinary uses the "video" resource type for audio uploads as well.
  const resourceType = isVideo || isAudio ? "video" : "image";

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  if (folder) form.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error?.message || "Cloudinary upload failed");
  }

  const data = await res.json();
  return { url: data.secure_url, isVideo };
}
