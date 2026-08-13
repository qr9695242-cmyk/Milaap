// Voice Changer — mic effects a user can buy with coins and apply live in
// audio-room / live rooms. Mirrors the exact pattern lib/decorations.js
// uses for frames/vehicles (catalog as data, purchase/equip as Firestore
// transactions on the user's own doc), so it plugs into the existing shop
// conventions instead of inventing a new one.
//
// User doc fields used:
//   ownedVoiceEffects:   string[]  — effect ids the user has bought (or been given)
//   equippedVoiceEffect: string | null  — currently active effect ("deep" etc.), null = Original
//
// Pricing: Original is free. Deep starts at 18,000,000 coins, and each
// effect after it is 50% more than the one before — tune COIN prices
// below any time.
export const VOICE_EFFECT_CATALOG = [
  { id: "original", name: "Original", emoji: "🎙️", priceCoins: 0, free: true },
  { id: "deep", name: "Deep", emoji: "🕳️", priceCoins: 18000000 },
  { id: "chipmunk", name: "Chipmunk", emoji: "🐿️", priceCoins: 27000000 },
  { id: "robot", name: "Robot", emoji: "🤖", priceCoins: 40500000 },
  { id: "cave", name: "Cave", emoji: "🌌", priceCoins: 60750000 },
];

export function findVoiceEffect(effectId) {
  return VOICE_EFFECT_CATALOG.find((e) => e.id === effectId) || VOICE_EFFECT_CATALOG[0];
}

import { doc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

/** Buys an effect with coins (transaction on the user's own doc). Call equipVoiceEffect after to switch to it. */
export async function purchaseVoiceEffect(uid, effectId) {
  const item = findVoiceEffect(effectId);
  if (!item || item.id === "original") return; // nothing to buy

  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");
    const data = snap.data();
    const owned = data.ownedVoiceEffects || [];
    if (owned.includes(effectId)) return; // already owned — nothing to charge

    const coins = data.coins || 0;
    if (coins < item.priceCoins) throw new Error("Not enough coins");

    tx.update(userRef, {
      ownedVoiceEffects: [...owned, effectId],
      coins: coins - item.priceCoins,
    });
  });
}

/** Switches to an already-owned (or free) effect. */
export async function equipVoiceEffect(uid, effectId) {
  const item = findVoiceEffect(effectId);
  if (!item) throw new Error("Effect not found");

  const userRef = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error("Profile not found");
    const data = snap.data();
    const owned = data.ownedVoiceEffects || [];
    if (!item.free && !owned.includes(effectId)) throw new Error("You don't own this voice effect yet");

    tx.update(userRef, { equippedVoiceEffect: item.free ? null : effectId });
  });
}

// ── Live audio processing ───────────────────────────────────────────
// Runs the mic MediaStreamTrack through a Web Audio graph and hands back
// a new processed MediaStreamTrack that gets published to Agora instead
// of the raw mic track. Everything here is feature-detected — on a device
// or browser that can't do it (no AudioContext, no AudioWorklet, autoplay
// policy blocks it, etc.) `applyVoiceEffect` throws, and the caller falls
// back to the plain mic track and shows "Voice effects unavailable on
// this device — using standard mic."

let sharedCtx = null;
function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("Web Audio API not supported on this device");
  if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctx();
  return sharedCtx;
}

let workletReady = null;
async function ensurePitchWorklet(ctx) {
  if (!ctx.audioWorklet) throw new Error("AudioWorklet not supported on this device");
  if (!workletReady) {
    workletReady = ctx.audioWorklet.addModule("/voice-worklet.js");
  }
  await workletReady;
}

/** Ring-modulator "robot" voice: multiplies the signal by a low-frequency carrier tone. */
function buildRobotGraph(ctx, source) {
  const carrier = ctx.createOscillator();
  carrier.frequency.value = 45; // Hz — classic robotic buzz
  carrier.start();

  const modulated = ctx.createGain();
  modulated.gain.value = 0; // base is 0; the carrier drives it up/down every sample
  source.connect(modulated);
  carrier.connect(modulated.gain);

  const output = ctx.createGain();
  output.gain.value = 1;
  modulated.connect(output);
  return { output, cleanup: () => carrier.stop() };
}

/** Algorithmic reverb + echo tail for a "cave" voice. */
function buildCaveGraph(ctx, source) {
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulseResponse(ctx, 2.5, 3);

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.28;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  delay.connect(feedback);
  feedback.connect(delay);

  const dry = ctx.createGain();
  dry.gain.value = 0.6;
  const wet = ctx.createGain();
  wet.gain.value = 0.7;

  source.connect(dry);
  source.connect(convolver);
  convolver.connect(delay);
  delay.connect(wet);

  const output = ctx.createGain();
  dry.connect(output);
  wet.connect(output);
  return { output, cleanup: () => {} };
}

function makeImpulseResponse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

/** Pitch-shifted "deep" (lower) or "chipmunk" (higher) voice via a granular AudioWorklet. */
async function buildPitchGraph(ctx, source, semitones) {
  await ensurePitchWorklet(ctx);
  const node = new AudioWorkletNode(ctx, "pitch-shifter", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: { pitchRatio: Math.pow(2, semitones / 12) },
  });
  source.connect(node);
  return { output: node, cleanup: () => node.disconnect() };
}

/**
 * Takes a raw mic MediaStreamTrack + effect id, returns
 * { track, stop } where `track` is what you publish instead of the raw
 * mic track, and `stop()` tears down the audio graph when you're done
 * (call it whenever you stop publishing / unmount).
 * Throws if the effect (or Web Audio generally) isn't supported — catch
 * this and fall back to the original track.
 */
export async function applyVoiceEffect(micTrack, effectId) {
  if (!effectId || effectId === "original") return { track: micTrack, stop: () => {} };

  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(new MediaStream([micTrack]));
  const dest = ctx.createMediaStreamDestination();

  let graph;
  if (effectId === "robot") graph = buildRobotGraph(ctx, source);
  else if (effectId === "cave") graph = buildCaveGraph(ctx, source);
  else if (effectId === "deep") graph = await buildPitchGraph(ctx, source, -5);
  else if (effectId === "chipmunk") graph = await buildPitchGraph(ctx, source, 7);
  else throw new Error(`Unknown voice effect: ${effectId}`);

  graph.output.connect(dest);

  const processedTrack = dest.stream.getAudioTracks()[0];
  return {
    track: processedTrack,
    stop: () => {
      try {
        graph.cleanup();
        source.disconnect();
        dest.disconnect();
      } catch (e) {
        // already torn down — ignore
      }
    },
  };
}
