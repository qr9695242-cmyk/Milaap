"use client";

import { useRef, useState } from "react";

/**
 * Hold-to-record mic button. Calls onRecorded(blob, durationSec) when the
 * user releases after recording at least 1s; recordings under 1s are
 * discarded (treated as an accidental tap).
 */
export default function VoiceRecorder({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startRef = useRef(0);

  async function startRecording() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationSec = (Date.now() - startRef.current) / 1000;
        clearInterval(timerRef.current);
        setSeconds(0);
        if (durationSec >= 1) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onRecorded?.(blob, durationSec);
        }
      };
      mediaRecorderRef.current = mr;
      startRef.current = Date.now();
      mr.start();
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Mic access ki zaroorat hai voice message bhejne ke liye.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onMouseLeave={stopRecording}
      onTouchStart={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopRecording();
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-colors ${
        recording ? "bg-neon-pink text-white animate-pulse" : "bg-panel text-mist ring-1 ring-white/10"
      } disabled:opacity-50`}
      aria-label="Hold to record voice message"
    >
      {recording ? `${seconds}s` : "🎤"}
    </button>
  );
}
