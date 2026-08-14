// Granular pitch shifter (overlap-add, two crossfading grains reading a
// circular buffer at `pitchRatio` speed). This keeps voice duration/speed
// the same while raising or lowering pitch — used for the "Deep" and
// "Chipmunk" voice effects. Runs on the audio rendering thread via
// AudioWorklet, which is why it's its own module file instead of inline
// code: browsers that don't support AudioWorklet (older Safari/WebViews)
// will fail to load this and the app falls back to the plain mic track.

class PitchShifterProcessor extends AudioWorkletProcessor {
 static get parameterDescriptors() {
 return [];
 }

 constructor(options) {
 super();
 this.pitchRatio = options?.processorOptions?.pitchRatio || 1;

 this.grainSize = 4096; // samples per grain — long enough to preserve voice timbre
 this.bufferSize = this.grainSize * 4;
 this.buffer = new Float32Array(this.bufferSize);
 this.writeIndex = 0;

 // Two read heads, offset by half a grain, crossfaded with a Hann-ish
 // window so the splice between grains isn't audible as a click.
 this.readIndexA = 0;
 this.readIndexB = this.grainSize / 2;
 this.grainPhase = 0;
 }

 _window(phase) {
 // Triangular window is cheap and sounds fine for speech at this grain size.
 return 1 - Math.abs((phase / this.grainSize) * 2 - 1);
 }

 _readInterpolated(buf, index) {
 const i0 = Math.floor(index) % this.bufferSize;
 const i1 = (i0 + 1) % this.bufferSize;
 const frac = index - Math.floor(index);
 const a = buf[(i0 + this.bufferSize) % this.bufferSize];
 const b = buf[(i1 + this.bufferSize) % this.bufferSize];
 return a + (b - a) * frac;
 }

 process(inputs, outputs) {
 const input = inputs[0][0];
 const output = outputs[0][0];
 if (!input || !output) return true;

 for (let i = 0; i < input.length; i++) {
 // Write incoming audio into the circular buffer.
 this.buffer[this.writeIndex] = input[i];
 this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

 // Read both grains at the shifted rate and crossfade them.
 const wA = this._window(this.grainPhase);
 const wB = this._window((this.grainPhase + this.grainSize / 2) % this.grainSize);
 const sampleA = this._readInterpolated(this.buffer, this.readIndexA);
 const sampleB = this._readInterpolated(this.buffer, this.readIndexB);
 output[i] = sampleA * wA + sampleB * wB;

 this.readIndexA += this.pitchRatio;
 this.readIndexB += this.pitchRatio;
 this.grainPhase = (this.grainPhase + 1) % this.grainSize;

 // Keep read heads from drifting too far ahead/behind the write head.
 const drift = (this.writeIndex - this.readIndexA + this.bufferSize) % this.bufferSize;
 if (drift > this.bufferSize - this.grainSize || drift < this.grainSize) {
 this.readIndexA = (this.writeIndex - this.bufferSize / 2 + this.bufferSize) % this.bufferSize;
 this.readIndexB = (this.readIndexA + this.grainSize / 2) % this.bufferSize;
 }
 }
 return true;
 }
}

registerProcessor("pitch-shifter", PitchShifterProcessor);
