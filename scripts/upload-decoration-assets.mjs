/**
 * Bulk-upload the bundled frame/vehicle artwork to Cloudinary.
 *
 * Required environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_UPLOAD_PRESET   (unsigned preset restricted to image/png + folders)
 *
 * The script writes the returned secure URLs to Firestore decorationMedia,
 * so the app automatically switches from /public assets to Cloudinary media.
 *
 * Run from worksec/:
 *   node scripts/upload-decoration-assets.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const preset = process.env.CLOUDINARY_UPLOAD_PRESET;
if (!cloud || !preset) {
  console.error("Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET");
  process.exit(1);
}

async function upload(filePath, folder, publicId) {
  const body = new FormData();
  const bytes = await fs.readFile(filePath);
  body.append("file", new Blob([bytes], { type: "image/png" }), path.basename(filePath));
  body.append("upload_preset", preset);
  body.append("folder", folder);
  body.append("public_id", publicId);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST", body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${publicId}: ${data?.error?.message || res.statusText}`);
  return data.secure_url;
}

const targets = [
  ["frames", "frame"],
  ["vehicles", "vehicle"],
];
const manifest = [];
for (const [dir, type] of targets) {
  const full = path.join(ROOT, "public", dir);
  const files = (await fs.readdir(full)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  for (const file of files) {
    const id = path.basename(file, ".png");
    const url = await upload(path.join(full, file), `milaap/${type}`, id);
    manifest.push({ type, id, image: url, source: `/` + dir + `/` + file });
    console.log(`${type}/${id} -> ${url}`);
  }
}
await fs.writeFile(path.join(ROOT, "cloudinary-decoration-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Uploaded ${manifest.length} assets. Manifest saved to cloudinary-decoration-manifest.json`);
