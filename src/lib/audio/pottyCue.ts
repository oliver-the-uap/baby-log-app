// Elimination-communication cue, synthesised at runtime (no audio file).
// A 20s buffer meant to be looped: ~10s of low rhythmic grunting (a poo cue)
// followed by ~10s of filtered-noise running water / "pss" (a wee cue).

function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

function grunt(ctx: BaseAudioContext, dest: AudioNode, start: number) {
  const dur = 0.38
  // low pitched body that drops slightly (a strain)
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(125, start)
  osc.frequency.linearRampToValueAtTime(80, start + dur)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 520
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.linearRampToValueAtTime(0.8, start + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(lp)
  lp.connect(g)
  g.connect(dest)
  osc.start(start)
  osc.stop(start + dur + 0.05)

  // a little noise for roughness
  const n = makeNoise(ctx, dur + 0.05)
  const nlp = ctx.createBiquadFilter()
  nlp.type = 'lowpass'
  nlp.frequency.value = 700
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, start)
  ng.gain.linearRampToValueAtTime(0.25, start + 0.05)
  ng.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  n.connect(nlp)
  nlp.connect(ng)
  ng.connect(dest)
  n.start(start)
  n.stop(start + dur + 0.05)
}

export async function buildCueBuffer(sampleRate = 44100): Promise<AudioBuffer> {
  const dur = 20
  const Offline =
    (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  const ctx = new Offline(1, Math.ceil(sampleRate * dur), sampleRate)
  const master = ctx.createGain()
  master.gain.value = 0.7
  master.connect(ctx.destination)

  // --- grunts, ~0.3s .. 9.6s ---
  for (let t = 0.3; t < 9.6; t += 0.95 + Math.random() * 0.5) grunt(ctx, master, t)

  // --- running water / pss, 10s .. 20s ---
  const water = makeNoise(ctx, 10)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 600
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 5500
  const wg = ctx.createGain()
  wg.gain.setValueAtTime(0.0001, 10)
  wg.gain.linearRampToValueAtTime(0.55, 10.6)
  wg.gain.setValueAtTime(0.55, 19.2)
  wg.gain.linearRampToValueAtTime(0.0001, 20)
  // gentle shimmer so it sounds like flowing water, not flat hiss
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.7
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 900
  lfo.connect(lfoGain)
  lfoGain.connect(lp.frequency)
  lfo.start(10)
  lfo.stop(20)
  water.connect(hp)
  hp.connect(lp)
  lp.connect(wg)
  wg.connect(master)
  water.start(10)
  water.stop(20)

  return await ctx.startRendering()
}
