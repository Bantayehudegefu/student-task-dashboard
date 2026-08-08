/* ==========================================================================
   TASKIFY — Sound
   Generates ambient background sound (rain, river, forest, ocean waves)
   entirely with the Web Audio API — no audio files to download or bundle,
   so the app keeps working when opened straight from disk.
   ========================================================================== */

window.Taskify = window.Taskify || {};

Taskify.Sound = (function () {
  let ctx = null;
  let masterGain = null;
  let activeNodes = [];
  let currentType = "none";

  function ensureContext() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function makeNoiseBuffer(context) {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function stop() {
    activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect && node.disconnect();
      } catch (e) {
        /* already stopped */
      }
    });
    activeNodes = [];
    currentType = "none";
  }

  function buildRain(context) {
    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 1800;

    const gain = context.createGain();
    gain.gain.value = 0.5;

    noise.connect(highpass).connect(gain).connect(masterGain);
    noise.start();
    return [noise, highpass, gain];
  }

  function buildRiver(context) {
    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;

    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 500;
    bandpass.Q.value = 0.6;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2200;

    const gain = context.createGain();
    gain.gain.value = 0.6;

    noise.connect(bandpass).connect(lowpass).connect(gain).connect(masterGain);
    noise.start();
    return [noise, bandpass, lowpass, gain];
  }

  function buildForest(context) {
    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;

    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900;
    bandpass.Q.value = 0.4;

    const gain = context.createGain();
    gain.gain.value = 0.25;

    // Gentle breeze-like amplitude drift
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();

    noise.connect(bandpass).connect(gain).connect(masterGain);
    noise.start();
    return [noise, bandpass, gain, lfo, lfoGain];
  }

  function buildOcean(context) {
    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;

    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 700;

    const gain = context.createGain();
    gain.gain.value = 0.5;

    // Slow swelling wave rhythm
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();

    noise.connect(lowpass).connect(gain).connect(masterGain);
    noise.start();
    return [noise, lowpass, gain, lfo, lfoGain];
  }

  const BUILDERS = {
    rain: buildRain,
    river: buildRiver,
    forest: buildForest,
    ocean: buildOcean,
  };

  function play(type, volume) {
    stop();
    if (!type || type === "none") return;
    const context = ensureContext();
    if (typeof volume === "number") masterGain.gain.value = volume;
    const builder = BUILDERS[type];
    if (!builder) return;
    activeNodes = builder(context);
    currentType = type;
  }

  function setVolume(volume) {
    if (masterGain) masterGain.gain.value = volume;
  }

  return { play, stop, setVolume, getCurrentType: () => currentType };
})();
