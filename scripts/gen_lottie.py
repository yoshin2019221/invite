#!/usr/bin/env python3
"""Generates the looping particle animations (Lottie JSON) used behind invite heroes.

Each file is a plain Lottie document (400x800, 30fps, 8s seamless loop) that any Lottie player can
open. Run: python3 scripts/gen_lottie.py   (writes to public/lottie/)
"""
import json, math, random, os

W, H, FR, DUR = 400, 800, 30, 240
LIN_I = {"x": [0.833], "y": [0.833]}
LIN_O = {"x": [0.167], "y": [0.167]}
POS_I = {"x": 0.833, "y": 0.833}
POS_O = {"x": 0.167, "y": 0.167}


def rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1]


def scalar(points):
    ks = []
    for n, (t, v) in enumerate(points):
        k = {"t": t, "s": [v] if not isinstance(v, list) else v}
        if n < len(points) - 1:
            k["i"] = LIN_I
            k["o"] = LIN_O
        ks.append(k)
    return {"a": 1, "k": ks}


def position(points):
    ks = []
    for n, (t, x, y) in enumerate(points):
        k = {"t": t, "s": [round(x, 1), round(y, 1), 0]}
        if n < len(points) - 1:
            k["i"] = POS_I
            k["o"] = POS_O
        ks.append(k)
    return {"a": 1, "k": ks}


def static(v):
    return {"a": 0, "k": v}


def shape(kind, size, color, outline=False):
    s = size
    if kind == "petal":
        geo = {"ty": "el", "p": static([0, 0]), "s": static([s * 0.55, s]), "nm": "petal"}
    elif kind == "confetti":
        geo = {"ty": "rc", "d": 1, "p": static([0, 0]), "s": static([s * 0.6, s * 0.28]), "r": static(1), "nm": "confetti"}
    elif kind == "sparkle":
        geo = {"ty": "sr", "sy": 1, "d": 1, "pt": static(4), "p": static([0, 0]), "r": static(0),
               "or": static(s * 0.5), "os": static(0), "ir": static(s * 0.11), "is": static(0), "nm": "sparkle"}
    else:  # bubble / dot
        geo = {"ty": "el", "p": static([0, 0]), "s": static([s, s]), "nm": "bubble"}
    items = [geo]
    if outline:
        items.append({"ty": "st", "c": static(color), "o": static(80), "w": static(1.6), "lc": 2, "lj": 2})
    items.append({"ty": "fl", "c": static(color), "o": static(18 if outline else 100), "r": 1})
    items.append({"ty": "tr", "p": static([0, 0]), "a": static([0, 0]), "s": static([100, 100]),
                  "r": static(0), "o": static(100), "sk": static(0), "sa": static(0)})
    return [{"ty": "gr", "it": items, "nm": kind}]


def layer(idx, name, shapes, ks, ip, op, st):
    return {"ddd": 0, "ind": idx, "ty": 4, "nm": name, "sr": 1, "ks": ks, "ao": 0,
            "shapes": shapes, "ip": ip, "op": op, "st": st, "bm": 0}


def base_ks(o, r, p, s):
    return {"o": o, "r": r, "p": p, "a": static([0, 0, 0]), "s": s}


def moving_particle(rng, idx, kind, color, size, direction, sway, spin, outline=False):
    """A particle crossing the frame once per loop. Its phase is baked into the keyframes (no layer
    time offsets), and the wrap-around jump happens while it is fully transparent."""
    x0 = rng.uniform(20, W - 20)
    k = rng.randint(1, DUR - 2)  # how far into its journey it is at frame 0
    phase = rng.uniform(0, math.tau)
    amp = rng.uniform(*sway)
    tw = DUR - k  # frame at which it wraps back to the start
    times = sorted({0, tw - 1, tw, DUR} | {round(DUR * n / 12) for n in range(13)})
    pts, ops, rots, scs = [], [], [], []
    for t in times:
        u = 1.0 if t == tw - 1 else 0.0 if t == tw else ((t + k) / DUR) % 1.0
        if t == DUR:
            u = ((DUR + k) / DUR) % 1.0
        y = (-50 + (H + 100) * u) if direction == "down" else (H + 50 - (H + 100) * u)
        x = x0 + amp * math.sin(phase + u * math.tau * 1.5)
        pts.append((t, x, y))
        edge = u < 0.03 or u > 0.97
        ops.append((t, 0 if edge else (100 if kind != "bubble" else 85)))
        rots.append((t, spin * u))
        sy = 100 if kind not in ("petal", "confetti") else 100 - 70 * abs(math.sin(phase + u * math.tau * 3))
        scs.append((t, [100, sy, 100]))
    sc_keys = []
    for n, (t, v) in enumerate(scs):
        kf = {"t": t, "s": v}
        if n < len(scs) - 1:
            kf["i"] = {"x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833]}
            kf["o"] = {"x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167]}
        sc_keys.append(kf)
    ks = base_ks(scalar(ops), scalar(rots), position(pts), {"a": 1, "k": sc_keys})
    return [layer(0, f"{kind}{idx}", shape(kind, size, color, outline), ks, 0, DUR, 0)]


def twinkle(rng, idx, color, size):
    x, y = rng.uniform(25, W - 25), rng.uniform(40, H - 40)
    period = rng.choice([40, 48, 60, 80])
    off = rng.randint(0, period - 1)
    drift = rng.uniform(-25, -8)
    ops, scs, pts = [], [], []
    for t in range(0, DUR + 1, 8):
        w = max(0.0, math.sin(math.pi * (((t + off) % period) / period))) ** 2
        ops.append((t, round(100 * w)))
        scs.append((t, [round(30 + 90 * w)] * 2 + [100]))
        pts.append((t, x, y + drift * (t / DUR)))
    # drift would jump at the loop point, so drift back over the same duration
    pts = [(t, x, y + drift * (1 - abs(2 * t / DUR - 1))) for t, _, _ in pts]
    sc_keys = []
    for n, (t, v) in enumerate(scs):
        kf = {"t": t, "s": v}
        if n < len(scs) - 1:
            kf["i"] = {"x": [0.833] * 3, "y": [0.833] * 3}
            kf["o"] = {"x": [0.167] * 3, "y": [0.167] * 3}
        sc_keys.append(kf)
    ks = base_ks(scalar(ops), static(0), position(pts), {"a": 1, "k": sc_keys})
    return [layer(0, f"sparkle{idx}", shape("sparkle", size, color), ks, 0, DUR, 0)]


def build(name, seed, recipe):
    rng = random.Random(seed)
    layers = []
    for r in recipe:
        for i in range(r["count"]):
            color = rgb(rng.choice(r["colors"]))
            size = rng.uniform(*r["size"])
            if r["kind"] == "sparkle":
                layers += twinkle(rng, len(layers), color, size)
            else:
                layers += moving_particle(rng, len(layers), r["kind"], color, size, r.get("dir", "down"),
                                          r.get("sway", (10, 40)), rng.choice([-1, 1]) * rng.uniform(*r.get("spin", (120, 420))),
                                          r.get("outline", False))
    for n, l in enumerate(layers):
        l["ind"] = n + 1
    doc = {"v": "5.7.0", "fr": FR, "ip": 0, "op": DUR, "w": W, "h": H, "nm": name, "ddd": 0, "assets": [], "layers": layers}
    return doc


RECIPES = {
    "gold-sparkles": (1, [{"kind": "sparkle", "count": 22, "size": (10, 26), "colors": ["#f3e2b3", "#e6c98a", "#fff3cf", "#d9b36a"]}]),
    "rose-petals": (2, [{"kind": "petal", "count": 16, "size": (14, 24), "colors": ["#f0b8bb", "#e8a3a8", "#f6d3cf", "#fbe4df"], "sway": (14, 46)},
                        {"kind": "sparkle", "count": 6, "size": (10, 16), "colors": ["#fff3e0"]}]),
    "marigold-petals": (3, [{"kind": "petal", "count": 18, "size": (14, 26), "colors": ["#f5a623", "#e8870e", "#f9c74f", "#d9480f"], "sway": (14, 50)}]),
    "warm-embers": (4, [{"kind": "bubble", "count": 18, "size": (4, 9), "colors": ["#ffd27a", "#ffb347", "#ff9a3c"], "dir": "up", "sway": (8, 28), "spin": (0, 1)},
                        {"kind": "sparkle", "count": 8, "size": (10, 18), "colors": ["#ffe6a8", "#ffd27a"]}]),
    "confetti": (5, [{"kind": "confetti", "count": 26, "size": (12, 22), "colors": ["#ff5a7a", "#ffc828", "#2547d0", "#ff8fb8", "#25b7a8"], "sway": (10, 36), "spin": (240, 720)}]),
    "soft-bubbles": (6, [{"kind": "bubble", "count": 14, "size": (16, 46), "colors": ["#ffffff", "#bcd7ea", "#f7c9b6"], "dir": "up", "sway": (10, 30), "spin": (0, 1), "outline": True},
                         {"kind": "sparkle", "count": 8, "size": (10, 18), "colors": ["#ffffff", "#f7e3c8"]}]),
    "party-glitter": (7, [{"kind": "confetti", "count": 14, "size": (10, 18), "colors": ["#e6c27a", "#c2307a", "#f3e2b3"], "sway": (8, 30), "spin": (240, 640)},
                          {"kind": "sparkle", "count": 14, "size": (10, 24), "colors": ["#f3e2b3", "#e6c27a", "#ff7ab8"]}]),
}

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "public", "lottie")
    os.makedirs(out, exist_ok=True)
    for name, (seed, recipe) in RECIPES.items():
        doc = build(name, seed, recipe)
        path = os.path.join(out, f"{name}.json")
        with open(path, "w") as f:
            json.dump(doc, f, separators=(",", ":"))
        print(name, len(doc["layers"]), "layers", os.path.getsize(path) // 1024, "KB")
