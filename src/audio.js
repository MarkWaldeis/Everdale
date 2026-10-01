// Procedural Everdale-style ambience: soft wind bed + occasional bird chirps.
// No audio assets — everything is synthesized with WebAudio.
export function createAmbientAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let started = false;
  let stopped = false;

  function startWind() {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      // Brown-ish noise: integrate white noise for a soft rumble.
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      channel[i] = last * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    // Slow swell so the wind breathes instead of sitting flat.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.16;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function chirp(now, baseFreq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.1 + Math.random() * 0.5), now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.14);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function birdPhrase() {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const base = 1800 + Math.random() * 1400;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i += 1) {
      chirp(now + i * (0.16 + Math.random() * 0.06), base * (0.95 + Math.random() * 0.15));
    }
  }

  function scheduleBird() {
    if (stopped) return;
    const delay = 2600 + Math.random() * 7000;
    window.setTimeout(() => {
      birdPhrase();
      scheduleBird();
    }, delay);
  }

  function start() {
    if (started || stopped) return;
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    startWind();
    scheduleBird();
    started = true;
  }

  return {
    start,
    setMuted(value) {
      muted = Boolean(value);
      if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, ctx.currentTime + 0.25);
      }
    },
    getMuted: () => muted,
    isRunning: () => started,
    stop() {
      stopped = true;
      ctx?.close?.();
      ctx = null;
      started = false;
    },
  };
}
