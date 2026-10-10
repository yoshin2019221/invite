#!/usr/bin/env python3
"""Synthesizes short ambient loops (placeholder music) -> public/audio/*.mp3. Needs numpy + ffmpeg.
These are simple generated pads/plucks, not recordings; swap the files for licensed tracks any time."""
import numpy as np, subprocess, os, wave

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(OUT, exist_ok=True)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def pluck(freq, dur, amp=0.3, decay=3.0):
    t = np.arange(int(SR * dur)) / SR
    s = sum(np.sin(2 * np.pi * freq * k * t) / k ** 1.6 for k in (1, 2, 3, 4))
    return amp * s * np.exp(-decay * t) * np.minimum(1, t * 200)

def pad(freq, dur, amp=0.12):
    t = np.arange(int(SR * dur)) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 1.003 * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t)
    env = np.minimum(1, np.minimum(t / 1.2, (dur - t) / 1.2))
    return amp * s * env

def render(name, scale, bpm, bass, seed, bars=8):
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    total = bars * 4 * beat
    buf = np.zeros(int(SR * (total + 3)))
    def put(sig, at):
        i = int(at * SR); buf[i:i + len(sig)] += sig[:len(buf) - i]
    for b in range(bars):
        root = bass[b % len(bass)]
        for m in (root, root + 7, root + 12):
            put(pad(hz(m), 4 * beat + 1.2), b * 4 * beat)
    n = 0
    for step in range(bars * 8):
        if rng.random() < 0.7:
            note = scale[rng.integers(len(scale))] + (12 if rng.random() < 0.3 else 0)
            put(pluck(hz(note), 2.2), step * beat / 2)
    # wrap the tail onto the start for a seamless loop
    n = int(SR * total)
    loop = buf[:n].copy(); tail = buf[n:]; loop[:len(tail)] += tail[:n]
    loop /= max(1e-6, np.abs(loop).max()) * 1.25
    return loop

SETS = {
    "ambient-royal": dict(scale=[62, 64, 66, 69, 71, 74], bpm=66, bass=[50, 55, 50, 57], seed=1),
    "ambient-sitar": dict(scale=[60, 62, 63, 67, 68, 72], bpm=72, bass=[48, 53, 48, 55], seed=2),
    "ambient-playful": dict(scale=[67, 69, 71, 74, 76, 79], bpm=96, bass=[55, 60, 62, 55], seed=3),
    "ambient-soft": dict(scale=[65, 67, 69, 72, 74, 77], bpm=60, bass=[53, 58, 55, 60], seed=4),
}
for name, kw in SETS.items():
    y = render(name, **kw)
    wav = os.path.join(OUT, name + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "64k", os.path.join(OUT, name + ".mp3")], check=True)
    os.remove(wav)
    print(name, os.path.getsize(os.path.join(OUT, name + ".mp3")) // 1024, "KB")
