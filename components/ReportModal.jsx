"use client";

import { useState } from "react";
import { REPORT_REASONS, URGENT_REPORT_REASONS, reportUser } from "@/lib/block";
import { useAuth } from "@/lib/AuthContext";
import { SUPPORT_CONFIG } from "@/lib/config";

export default function ReportModal({ target, onClose }) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isUrgent = URGENT_REPORT_REASONS.includes(reason);

  const submit = async () => {
    setSending(true);
    try {
      await reportUser({
        reporterUid: user.uid,
        reporterName: profile?.displayName || "User",
        target,
        reason,
        details,
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-panel2 p-5 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="py-4 text-center">
            <p className="font-display text-sm font-bold text-ink">Report sent</p>
            <p className="mt-1 text-xs text-mist">
              Our team will review {target.displayName || "this user"}'s account.
            </p>
            <button onClick={onClose} className="mt-4 w-full rounded-full bg-white/10 py-2 text-sm text-ink">
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="font-display text-sm font-bold text-ink">
              Report {target.displayName || "user"}
            </p>
            <div className="mt-3 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-ink/90">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-neon-violet"
                  />
                  {r}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Extra details (optional)"
              rows={3}
              className="mt-3 w-full rounded-lg bg-panel px-3 py-2 text-sm text-ink ring-1 ring-white/10 placeholder:text-mist"
            />
            {isUrgent && (
              <div className="mt-3 rounded-lg bg-neon-pink/10 p-3 ring-1 ring-neon-pink/30">
                <p className="text-xs font-semibold text-neon-pink">
                  Ye serious hai — sirf report submit karne ke ilawa, humari team ko turant WhatsApp par bhi batayein.
                </p>
                <a
                  href={`https://wa.me/${SUPPORT_CONFIG.supportWhatsapp.replace("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                >
                  WhatsApp: {SUPPORT_CONFIG.supportWhatsapp}
                </a>
                <p className="mt-1 text-[10px] text-mist">
                  Agar kisi ki jaan ya safety ko turant khatra hai, to sabse pehle apni local police (helpline 15) ko contact karein.
                </p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full bg-white/10 py-2 text-sm text-ink">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={sending}
                className="flex-1 rounded-full bg-neon-pink py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {sending ? "Sending…" : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
