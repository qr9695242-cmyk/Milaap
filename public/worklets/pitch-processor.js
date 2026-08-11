// Real-time pitch shifter for the in-call voice changer.
//
// Technique: granular time-domain resampling. Incoming audio is written
// into a ring buffer; two overlapping "grains" read back out of that
// buffer at `pitch` speed (0.5 = an octave down, 2.0 = an octave up),
// each windowed with a triangular envelope and cross-faded together so
// there's no audible seam where one grain ends and the next begins.
// Each grain re-syncs to a fixed delay behind the live write head every
// time it restarts, so playback never drifts into not-yet-written audio
// even after minutes of continuous use.
class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pitch = 1.0;

    this.bufferSize = Math.floor(sampleRate * 1.0); // 1s ring buffer
    this.ring = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    this.grainSamples = Math.floor(sampleRate * 0.06); // 60ms grains
    this.delaySamples = this.grainSamples * 3;

    this.grains = [
      { pos: 0, phase: 0 },
      { pos: 0, phase: Math.floor(this.grainSamples / 2) },
    ];
    for (const g of this.grains) {
      g.pos = this._wrap(this.writeIndex - this.delaySamples);
    }

    this.port.onmessage = (e) => {
      if (e.data?.type === "pitch") {
        const v = Number(e.data.value);
        if (Number.isFinite(v) && v > 0) this.pitch = v;
      }
    };
  }

  _wrap(i) {
    const n = this.bufferSize;
    return ((i % n) + n) % n;
  }

  _readInterp(idx) {
    const i0 = Math.floor(idx);
    const i1 = i0 + 1;
    const frac = idx - i0;
    const a = this.ring[this._wrap(i0)];
    const b = this.ring[this._wrap(i1)];
    return a + (b - a) * frac;
  }

  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0];
    const output = outputs[0][0];
    if (!output) return true;

    for (let i = 0; i < output.length; i++) {
      this.ring[this.writeIndex] = input ? input[i] : 0;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

      let mixed = 0;
      for (const g of this.grains) {
        const env = 1 - Math.abs((g.phase / this.grainSamples) * 2 - 1);
        mixed += this._readInterp(g.pos) * env;

        g.pos += this.pitch;
        g.phase += 1;
        if (g.phase >= this.grainSamples) {
          g.phase = 0;
          g.pos = this._wrap(this.writeIndex - this.delaySamples);
        }
      }
      output[i] = mixed * 0.8; // headroom for the two overlapping grains
    }
    return true;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
