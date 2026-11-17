'use client';
// Պարզ ձայնային էֆեկտներ Web Audio-ով (առանց ֆայլերի)
let ctx;
export const isMuted = () => { try { return localStorage.getItem('kayts-mute') === '1'; } catch { return false; } };
export const setMuted = (m) => { try { localStorage.setItem('kayts-mute', m ? '1' : '0'); } catch {} };

function tone(freq, dur = 0.12, type = 'sine', when = 0, vol = 0.18) {
  if (isMuted() || typeof window === 'undefined') return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  } catch {}
}
export const sfx = {
  join: () => { tone(660, .1); tone(880, .12, 'sine', .08); },
  tick: () => tone(1200, .04, 'square', 0, .05),
  tap: () => tone(520, .08, 'triangle'),
  correct: () => [523, 659, 784].forEach((f, i) => tone(f, .18, 'triangle', i * .1)),
  wrong: () => { tone(220, .3, 'sawtooth', 0, .12); tone(180, .35, 'sawtooth', .15, .12); },
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, .15, 'square', i * .09, .08)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', i * .14)),
};
