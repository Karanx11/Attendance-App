/**
 * A short, pleasant "shift complete" chime synthesized with the Web Audio API —
 * no audio asset, works offline. Browsers require a user gesture before audio
 * can play, so call `primeAudio()` on any interaction to unlock the context.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as WebkitWindow).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    return ctx
  } catch {
    return null
  }
}

/** Resume the audio context after a user gesture so later playback isn't blocked. */
export function primeAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

/** Play a rising three-note chime. */
export function playChime(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const start = c.currentTime + 0.02
  const notes = [880, 1108.73, 1318.51] // A5, C#6, E6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(c.destination)

    const t = start + i * 0.18
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    osc.start(t)
    osc.stop(t + 0.6)
  })
}
