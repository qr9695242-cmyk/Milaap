# Cloudinary: Frames & Rides

The app already contains real PNG artwork for all bundled **frames** and **rides/vehicles**. It can use Cloudinary as the production media layer while keeping the local PNGs as a fallback.

## 1. Create the Cloudinary upload preset

Create an **unsigned** upload preset named `milaap_decorations` (or use another name and put it in `.env.local`). Restrict it to:

- folders: `milaap/frame` and `milaap/vehicle`
- allowed format: PNG/JPEG/WebP
- a sensible maximum file size
- no transformations that remove transparency from frame images

## 2. Configure `.env.local`

Set:

```text
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=milaap_decorations
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_UPLOAD_PRESET=milaap_decorations
```

## 3. Upload every bundled asset

From `worksec/` run:

```bash
node scripts/upload-decoration-assets.mjs
```

This uploads every PNG under `public/frames` and `public/vehicles` to Cloudinary and creates `cloudinary-decoration-manifest.json` with the resulting secure URLs.

The app reads `decorationMedia` in Firestore and automatically prefers a Cloudinary URL when one exists; otherwise it falls back to the bundled local PNG.

## 4. Security

Only users with `admin` or `superadmin` role can publish/replace a frame or ride media override. Normal users can read the media but cannot change it. The Firestore rule enforces this server-side too.

**Important:** the Cloudinary upload preset is intentionally unsigned because it is used by the admin UI. Keep the preset restricted to the decoration folders and image formats. Never put a Cloudinary API secret in `NEXT_PUBLIC_*` variables or client code.
