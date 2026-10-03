"""Synthesise the documentary sound bed: drone score, impacts, typewriter keys.

Writes public/score.wav (44.1 kHz stereo). The narration is mixed separately in
the composition; this bed stays roughly 20 dB under the voice and ducks under it.
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
TOTAL = 165.3 + 5.0
N = int(TOTAL * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def env(points):
    """piecewise-linear envelope from [(time, gain), ...]"""
    ts, gs = zip(*points)
    return np.interp(t, ts, gs)


L = np.zeros(N)
R = np.zeros(N)

# --- drone: D minor-ish pad, slowly detuned, with a slow swell per section
def pad(freqs, gain_env, detune=0.6):
    out_l = np.zeros(N)
    out_r = np.zeros(N)
    for i, f in enumerate(freqs):
        lfo = 1 + 0.002 * np.sin(2 * np.pi * (0.05 + 0.013 * i) * t)
        ph = 2 * np.pi * np.cumsum(f * lfo) / SR
        ph2 = 2 * np.pi * np.cumsum((f + detune) * lfo) / SR
        tone = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)
        tone2 = np.sin(ph2) + 0.35 * np.sin(2 * ph2)
        out_l += tone / len(freqs)
        out_r += tone2 / len(freqs)
    return lp(out_l, 900) * gain_env, lp(out_r, 900) * gain_env


sections = env([(0, 0.0), (1.5, 0.5), (14.5, 0.55), (15.5, 0.4), (45, 0.5), (46, 0.7), (67, 0.75),
                (82, 0.6), (83.5, 0.85), (111, 0.8), (121.5, 0.95), (132, 0.7), (138, 0.95),
                (153, 0.8), (158, 1.0), (165.5, 1.1), (TOTAL - 0.5, 0.0), (TOTAL, 0.0)])
dl, dr = pad([73.42, 110.0, 146.83], sections)
L += dl * 0.09
R += dr * 0.09

# second voice: minor third that enters for the tense middle and the finale
tense = env([(0, 0), (45, 0), (48, 0.6), (82, 0.5), (110, 0.3), (121, 0.7), (153, 0.4), (158, 0.8),
             (166, 0.9), (TOTAL - 0.3, 0), (TOTAL, 0)])
tl, tr = pad([174.61, 220.0], tense, detune=0.9)
L += tl * 0.045
R += tr * 0.045

# room tone / tape hiss
hiss = lp(hp(rng.standard_normal(N), 300), 6000) * 0.0035
L += hiss
R += np.roll(hiss, 997)

# --- heartbeat pulse during the copying sequence and the trial
def pulse(at_times, gain=0.18):
    out = np.zeros(N)
    k = int(0.35 * SR)
    tt = np.arange(k) / SR
    thump = np.sin(2 * np.pi * 52 * tt * (1 - 0.3 * tt)) * np.exp(-tt * 14)
    for a in at_times:
        i = int(a * SR)
        if i + k < N:
            out[i:i + k] += thump * gain
            j = i + int(0.22 * SR)
            if j + k < N:
                out[j:j + k] += thump * gain * 0.55
    return out

beats = list(np.arange(46.0, 66.5, 1.05)) + list(np.arange(132.3, 145.8, 0.95))
pl = pulse(beats)
L += pl
R += pl

# --- impacts (low boom + noise burst) on the big beats
def impact(at, gain=0.5):
    k = int(3.0 * SR)
    tt = np.arange(k) / SR
    boom = np.sin(2 * np.pi * 38 * tt * (1 - 0.15 * tt)) * np.exp(-tt * 2.2)
    noise = lp(rng.standard_normal(k), 2500) * np.exp(-tt * 9) * 0.5
    x = (boom + noise) * gain
    i = int(at * SR)
    e = min(N, i + k)
    L[i:e] += x[: e - i]
    R[i:e] += x[: e - i] * 0.95

for a, g in [(3.12, 0.55), (15.3, 0.25), (83.5, 0.4), (101.4, 0.45), (122.2, 0.4), (124.6, 0.5),
             (140.3, 0.3), (146.2, 0.35), (151.3, 0.55), (165.9, 0.45)]:
    impact(a, g)

# --- reverse swells into the big moments
def swell(end, length=2.5, gain=0.12):
    k = int(length * SR)
    x = bp(rng.standard_normal(k), 200, 3000) * np.linspace(0, 1, k) ** 3 * gain
    i = int((end - length) * SR)
    L[i:i + k] += x
    R[i:i + k] += x[::-1] * 0 + x

for e in [83.45, 122.15, 165.85]:
    swell(e)

# --- typewriter keys for typed on-screen text
def keys(start, chars, cps):
    k = int(0.04 * SR)
    tt = np.arange(k) / SR
    for c in range(chars):
        i = int((start + c / cps + rng.uniform(-0.012, 0.012)) * SR)
        click = hp(rng.standard_normal(k), 1800) * np.exp(-tt * 160) * rng.uniform(0.05, 0.08)
        if i + k < N:
            pan = rng.uniform(0.7, 1.0)
            L[i:i + k] += click * pan
            R[i:i + k] += click * (1.7 - pan)

keys(23.0, len("United States – Vietnam Relations"), 26)
keys(83.5, len("Sunday, June 13, 1971"), 22)
keys(122.2, len("June 30, 1971"), 22)
keys(146.2, len("May 11, 1973"), 22)

# --- duck the music bed under the voice (keep transient SFX mostly intact)
voice = json.load(open(os.path.join(ROOT, "data", "transcript.json")))
speaking = np.zeros(N)
for seg in voice:
    for w in seg["words"]:
        a, b = int(w["s"] * SR), int(min(w["e"], w["s"] + 0.8) * SR)
        speaking[a:b] = 1
speaking = lp(speaking, 3, 1)
duck = 1 - 0.35 * np.clip(speaking, 0, 1)
L *= duck
R *= duck

mix = np.stack([L, R], axis=1)
mix /= max(1e-6, np.abs(mix).max()) / 0.5  # peak at -6 dBFS before the voice
wavfile.write(os.path.join(ROOT, "public", "score.wav"), SR, (mix * 32767).astype(np.int16))
print("score.wav written", mix.shape)
