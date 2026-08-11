"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/lib/AuthContext";
import FramedAvatar from "@/components/FramedAvatar";

export default function EditProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile?.displayName) setName(profile.displayName);
    if (profile?.bio !== undefined) setBio(profile.bio || "");
    if (profile?.gender !== undefined) setGender(profile.gender || "");
  }, [profile?.displayName, profile?.bio, profile?.gender]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void">
        <p className="text-mist text-sm">Loading…</p>
      </main>
    );
  }

  const currentPhoto = previewUrl || profile?.photoURL || profile?.avatar || "";

  function pickImage() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Sirf image file upload karein.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image 8MB se choti honi chahiye.");
      return;
    }

    setError("");
    setSaved(false);
    setPreviewUrl(URL.createObjectURL(file)); // instant local preview
    setUploading(true);
    try {
      // Upload the avatar directly to Cloudinary. The unsigned preset is
      // public by design; Firestore still controls which user's profile URL
      // is saved by this authenticated client.
      const { url: downloadUrl } = await uploadToCloudinary(
        file,
        `milaap/avatars/${user.uid}`
      );

      // Save immediately so a picture change is never lost even if the
      // user leaves before hitting "Save" on the name field below.
      await setDoc(
        doc(db, "users", user.uid),
        { photoURL: downloadUrl, avatar: downloadUrl },
        { merge: true }
      );
      setPreviewUrl(downloadUrl);
    } catch (err) {
      console.error("[profile/edit] avatar upload failed:", err);
      setError("Photo upload nahi ho saki. Dobara try karein.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Naam khali nahi ho sakta.");
      return;
    }
    if (bio.length > 150) {
      setError("Bio 150 characters se choti honi chahiye.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: trimmed,
          displayNameLower: trimmed.toLowerCase(),
          bio: bio.trim(),
          gender,
        },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("[profile/edit] save failed:", err);
      setError("Save nahi ho saka. Internet check karein aur dobara try karein.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-void px-5 pb-16 pt-6">
      <Link href="/profile" className="text-lg text-ink/80">←</Link>
      <h1 className="mt-2 font-display text-2xl font-black text-ink">Edit Profile</h1>

      <section className="mt-6 flex flex-col items-center">
        <button onClick={pickImage} className="relative" disabled={uploading}>
          <FramedAvatar
            frameId={profile?.equippedFrame}
            name={name || profile?.displayName}
            photoURL={currentPhoto}
            size={96}
          />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-glow-gradient text-sm shadow-glow">
            {uploading ? "…" : "✎"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={pickImage}
          disabled={uploading}
          className="mt-3 text-xs font-semibold text-neon-violet disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Change Photo"}
        </button>
      </section>

      <section className="mt-8">
        <label className="text-xs text-mist">Display Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          className="mt-1 w-full rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
        />
      </section>

      <section className="mt-6">
        <label className="text-xs text-mist">Gender</label>
        <div className="mt-1 flex gap-2">
          {[
            { id: "male", label: "♂ Male" },
            { id: "female", label: "♀ Female" },
            { id: "other", label: "Prefer not to say" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGender(opt.id)}
              className={`flex-1 rounded-full py-2.5 text-xs font-semibold ring-1 transition ${
                gender === opt.id
                  ? "bg-glow-gradient text-ink ring-transparent"
                  : "bg-panel text-mist ring-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-mist">Bio</label>
          <span className="text-[10px] text-mist">{bio.length}/150</span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 150))}
          maxLength={150}
          rows={3}
          placeholder="Tell people a bit about yourself…"
          className="mt-1 w-full resize-none rounded-lg bg-panel px-4 py-3 text-sm text-ink outline-none ring-1 ring-white/10 focus:ring-neon-violet"
        />
      </section>

      {error && <p className="mt-4 text-center text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSaveName}
        disabled={saving || uploading}
        className="mt-6 w-full rounded-full bg-glow-gradient py-3 text-sm font-semibold text-ink shadow-glow disabled:opacity-60"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
      </button>
      <p className="mt-2 text-center text-[11px] text-mist">
        Photo turant save ho jati hai jab upload complete ho. Naam, gender, aur
        bio change karne ke baad "Save Changes" dabana zaroori hai.
      </p>
    </main>
  );
}
