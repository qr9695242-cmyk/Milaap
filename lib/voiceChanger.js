// In-call voice changer. Runs entirely client-side on the raw mic stream
// *before* it gets handed to Agora as a custom audio track, so every preset
// works the same regardless of who's listening.

export const VOICE_CHANGER_PRESETS = [
  { id: "original", label: "Original", emoji: "🎙️" },
  { id: "deep", label: "Deep", emoji: "🧔" },
  { id: "chipmunk", label: "Chipmunk", emoji: "🐿️" },
  { id: "robot", label: "Robot", emoji: "🤖" },
  { id: "cave", label: "Cave", emoji: "🕳️" },
];

const PRESET_PARAMS = {
  original: { pitch: 1.0, robot: false, echo: false },
  deep: { pitch: 0.78, robot: false, echo: false },
  chipmunk: { pitch: 1.45, robot: false, echo: false },
  robot: { pitch: 0.92, robot: true, echo: false },
  cave: { pitch: 1.0, robot: false, echo: true },
};

/**
 * Builds the processing graph for one raw MediaStream (from getUserMedia)
 * and returns a MediaStreamTrack you can pass to createCustomAudioTrack,
 * plus a setPreset() you can call any time — including mid-call — without
 * re-publishing anything.
 */
export async function createVoiceChanger(rawStream) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextCtor();
  await ctx.audioWorklet.addModule("/worklets/pitch-processor.js");

  const source = ctx.createMediaStreamSource(rawStream);
  const pitchNode = new AudioWorkletNode(ctx, "pitch-processor");

  // --- Robot: ring modulation. ringGain's base gain + an audio-rate
  // oscillator summed into its `gain` AudioParam multiplies the signal by
  // a bipolar sine wave, which is the classic ring-mod "robot" sound.
  // Bypassed (base=1, mod=0) for every other preset.
  const ringGain = ctx.createGain();
  const ringOsc = ctx.createOscillator();
  ringOsc.frequency.value = 45;
  const ringModAmount = ctx.createGain();
  ringModAmount.gain.value = 0;
  ringOsc.connect(ringModAmount);
  ringModAmount.connect(ringGain.gain);
  ringGain.gain.value = 1;
  ringOsc.start();

  // --- Cave/echo: simple feedback delay, mixed in only for the echo preset.
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.18;
  const feedback = ctx.createGain();
  feedback.gain.value = 0;
  const wet = ctx.createGain();
  wet.gain.value = 0;
  const dry = ctx.createGain();
  dry.gain.value = 1;

  const dest = ctx.createMediaStreamDestination();

  source.connect(pitchNode);
  pitchNode.connect(ringGain);
  ringGain.connect(dry);
  dry.connect(dest);
  ringGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(dest);

  function setPreset(id) {
    const p = PRESET_PARAMS[id] || PRESET_PARAMS.original;
    const t = ctx.currentTime;
    pitchNode.port.postMessage({ type: "pitch", value: p.pitch });
    ringGain.gain.setTargetAtTime(p.robot ? 0 : 1, t, 0.02);
    ringModAmount.gain.setTargetAtTime(p.robot ? 1 : 0, t, 0.02);
    wet.gain.setTargetAtTime(p.echo ? 0.35 : 0, t, 0.02);
    feedback.gain.setTargetAtTime(p.echo ? 0.3 : 0, t, 0.02);
  }

  setPreset("original");

  function dispose() {
    try {
      ringOsc.stop();
    } catch {
      /* already stopped */
    }
    for (const node of [source, pitchNode, ringGain, ringModAmount, dry, delay, feedback, wet]) {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    ctx.close().catch(() => {});
  }

  return {
    outputTrack: dest.stream.getAudioTracks()[0],
    setPreset,
    dispose,
  };
}
