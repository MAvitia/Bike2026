"""Snap trailside sights (snap: true) in sights-data.js onto the route line.

Off-trail sights (snap: false) keep their real coordinates. Reports the snap
distance so badly-guessed coordinates are easy to catch.
"""
import json
import math
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
M_PER_DEG_LAT = 111320.0

def xy(p, lat0):
    return (p[1] * M_PER_DEG_LAT * math.cos(math.radians(lat0)), p[0] * M_PER_DEG_LAT)

def nearest_on_route(p, pts):
    lat0 = p[0]
    px, py = xy(p, lat0)
    best = (1e18, None)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if (min(a[0], b[0]) - 0.03 > p[0] or max(a[0], b[0]) + 0.03 < p[0] or
                min(a[1], b[1]) - 0.04 > p[1] or max(a[1], b[1]) + 0.04 < p[1]):
            continue
        ax, ay = xy(a, lat0)
        bx, by = xy(b, lat0)
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
        d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
        if d < best[0]:
            best = (d, (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return best

src = (SITE / "route-data.js").read_text(encoding="utf-8")
route = json.loads(src[src.index("=") + 1:].rstrip().rstrip(";"))
pts = [tuple(p) for day in sorted(route, key=int) for p in route[day]]

stext = (SITE / "sights-data.js").read_text(encoding="utf-8")
anchor = stext.index("const SIGHTS")
header = stext[:anchor]
sights = json.loads(stext[stext.index("=", anchor) + 1:].rstrip().rstrip(";"))

for s in sights:
    if not s.get("snap"):
        print(f"  (off-trail)  {s['name']}")
        continue
    d, q = nearest_on_route((s["lat"], s["lng"]), pts)
    if q is None:
        print(f"  !! NO TRAIL within ~3 km of {s['name']} — coordinate likely wrong, left as-is")
        continue
    print(f"  snapped {d:6.0f} m  {s['name']}")
    s["lat"], s["lng"] = round(q[0], 5), round(q[1], 5)

out = header + "const SIGHTS = [\n"
out += ",\n".join(" " + json.dumps(s, ensure_ascii=False) for s in sights)
out += "\n];\n"
(SITE / "sights-data.js").write_text(out, encoding="utf-8")
print(f"Wrote {len(sights)} sights")
