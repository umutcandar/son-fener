// Procedural cues. Nothing here is a recording; the samples are built in the browser.
const RATE = 22050;

export function synthSamples(kind, frames = 1400) {
  const out = new Float32Array(frames);
  const tone = (i, freq, amp, decay) => Math.sin((2 * Math.PI * freq * i) / RATE) * amp * Math.exp(-i / (RATE * decay));
  for (let i = 0; i < frames; i++) {
    if (kind === 'tap') out[i] = tone(i, 480, 0.22, 0.045) + tone(i, 720, 0.08, 0.03);
    else if (kind === 'upgrade') out[i] = tone(i, 196 + i * 0.35, 0.2, 0.28) + tone(i, 392, 0.06, 0.2);
    else if (kind === 'collect') out[i] = tone(i, 620, 0.16, 0.12) + tone(i, 930, 0.08, 0.09);
    else if (kind === 'town') out[i] = tone(i, 98, 0.16, 3.2) * (0.65 + 0.35 * Math.sin(i / 900)) + tone(i, 147, 0.06, 3.2);
    else if (kind === 'battle-1') out[i] = tone(i, 73, 0.2, 1.4) * (i % 420 < 70 ? 1 : 0.22) + tone(i, 110, 0.05, 1.4);
    else if (kind === 'battle-2') out[i] = tone(i, 65, 0.2, 1.4) * (i % 360 < 90 ? 1 : 0.2) + tone(i, 196, 0.04, 0.8);
    else if (kind === 'battle-3') out[i] = tone(i, 82, 0.16, 1.6) * (i % 500 < 60 ? 1 : 0.18) + tone(i, 523, 0.03, 0.4) * (i % 500 < 40 ? 1 : 0);
    else out[i] = tone(i, 73, 0.18, 1.2) * (i % 400 < 80 ? 1 : 0.25);
  }
  return out;
}

export function createMixer() {
  let ctx = null, muted = false, scene = 'town', loop = null, loopKind = '';
  const ensure = () => {
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const stopLoop = () => { loop?.stop(); loop = null; loopKind = ''; };
  const startLoop = kind => {
    if (muted || loopKind === kind) return;
    const audio = ensure();
    if (!audio) return;
    stopLoop();
    const samples = synthSamples(kind, RATE * 4);
    const buffer = audio.createBuffer(1, samples.length, RATE);
    buffer.getChannelData(0).set(samples);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = audio.createGain();
    gain.gain.value = kind.startsWith('battle') ? 0.18 : 0.12;
    source.connect(gain).connect(audio.destination);
    source.start();
    loop = source;
    loopKind = kind;
  };
  return {
    setMuted(value) {
      muted = !!value;
      if (muted) stopLoop();
      else startLoop(scene);
    },
    resume() { if (!muted) ensure(); },
    scene(kind) {
      scene = kind || 'town';
      if (!muted) startLoop(scene);
    },
    play(kind) {
      if (muted) return;
      const audio = ensure();
      if (!audio) return;
      const samples = synthSamples(kind, 1800);
      const buffer = audio.createBuffer(1, samples.length, RATE);
      buffer.getChannelData(0).set(samples);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      const gain = audio.createGain();
      gain.gain.value = 0.35;
      source.connect(gain).connect(audio.destination);
      source.start();
    },
  };
}
