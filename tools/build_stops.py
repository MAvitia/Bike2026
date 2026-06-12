"""Snap planned stops onto the trail and generate support-vehicle meet points.

1. Snaps every waypoint in data.js onto the route polyline (route-data.js),
   rewriting data.js so all flags sit exactly ON the trail line.
2. Queries Overpass for public roads (non-bridge) within 60 m of the trail and
   parking areas within 160 m — i.e. places a support vehicle can actually
   reach the trail. Picks one roughly every 10 miles of each riding day,
   preferring parking lots and named roads.
3. Writes website/stops-data.js with the ordered vehicle stops (trail mile,
   coordinates, access road name).
"""
import json
import math
import re
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent

M_PER_DEG_LAT = 111320.0
MI = 1609.34

ROAD_RE = "^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road)$"

# ---------- geometry ----------
def xy(p, lat0):
    """Local equirectangular projection to meters."""
    return (p[1] * M_PER_DEG_LAT * math.cos(math.radians(lat0)), p[0] * M_PER_DEG_LAT)

def seg_project(p, a, b, lat0):
    """Distance (m) from p to segment a-b, plus fraction t along the segment."""
    px, py = xy(p, lat0)
    ax, ay = xy(a, lat0)
    bx, by = xy(b, lat0)
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
    qx, qy = ax + t * dx, ay + t * dy
    return math.hypot(px - qx, py - qy), t

def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

# ---------- load route ----------
def load_route():
    src = (SITE / "route-data.js").read_text(encoding="utf-8")
    route = json.loads(src[src.index("=") + 1:].rstrip().rstrip(";"))
    pts = []          # flat [(lat,lng)]
    cum = [0.0]       # cumulative meters, len == len(pts)
    day_of = []       # day number per point
    day_bounds = {}   # day -> (start_m, end_m)
    for day in sorted(route, key=int):
        seg = [tuple(p) for p in route[day]]
        start_m = cum[-1]
        if pts and pts[-1] == seg[0]:
            seg = seg[1:]
        for p in seg:
            if pts:
                d, _ = seg_dist_simple(pts[-1], p)
                cum.append(cum[-1] + d)
            pts.append(p)
            day_of.append(int(day))
        day_bounds[int(day)] = (start_m, cum[-1])
    return pts, cum, day_of, day_bounds

def seg_dist_simple(a, b):
    lat0 = (a[0] + b[0]) / 2
    ax, ay = xy(a, lat0)
    bx, by = xy(b, lat0)
    return math.hypot(bx - ax, by - ay), None

def nearest_on_route(p, pts, cum, i0=0, i1=None):
    """Nearest point on the route polyline: (dist_m, snapped_point, mile_m)."""
    if i1 is None:
        i1 = len(pts) - 1
    lat0 = p[0]
    best = (1e18, None, None)
    for i in range(i0, i1):
        a, b = pts[i], pts[i + 1]
        # cheap bbox reject (~2 km)
        if (min(a[0], b[0]) - 0.02 > p[0] or max(a[0], b[0]) + 0.02 < p[0] or
                min(a[1], b[1]) - 0.025 > p[1] or max(a[1], b[1]) + 0.025 < p[1]):
            continue
        d, t = seg_project(p, a, b, lat0)
        if d < best[0]:
            m = cum[i] + (cum[i + 1] - cum[i]) * t
            best = (d, lerp(a, b, t), m)
    return best

# ---------- snap waypoints in data.js ----------
def snap_waypoints(pts, cum):
    path = SITE / "data.js"
    txt = path.read_text(encoding="utf-8")
    pat = re.compile(r'(\{ name: "(.*?)",\s*lat: )([\-0-9.]+)(, lng: )([\-0-9.]+)')
    snapped = {}

    def repl(m):
        name = m.group(2)
        p = (float(m.group(3)), float(m.group(5)))
        d, q, mile = nearest_on_route(p, pts, cum)
        snapped[name] = (q, mile, d)
        print(f"  {name}: moved {d:.0f} m onto trail (mile {mile/MI:.1f})")
        return f"{m.group(1)}{q[0]:.5f}{m.group(4)}{q[1]:.5f}"

    txt2 = pat.sub(repl, txt)
    path.write_text(txt2, encoding="utf-8")
    print(f"Snapped {len(snapped)} waypoints in data.js")
    return snapped

# ---------- Overpass: roads + parking near trail ----------
OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

def overpass(q, tries=6):
    data = urllib.parse.urlencode({"data": q}).encode()
    for k in range(tries):
        url = OVERPASS_SERVERS[k % len(OVERPASS_SERVERS)]
        req = urllib.request.Request(url, data=data,
                                     headers={"User-Agent": "biketrip-stop-builder/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except Exception as e:
            if k == tries - 1:
                raise
            wait = 20 + 20 * k
            print(f"  overpass retry in {wait}s ({e})")
            time.sleep(wait)

def fetch_access_candidates(pts, cum):
    """Return [(mile_m, trail_pt, label, kind)] of vehicle-reachable spots."""
    stride = 2
    chunk = 150  # sampled points per query
    sampled = list(range(0, len(pts), stride))
    if sampled[-1] != len(pts) - 1:
        sampled.append(len(pts) - 1)
    cache = HERE / ".cache"
    cache.mkdir(exist_ok=True)
    cands = []
    for s in range(0, len(sampled) - 1, chunk):
        idxs = sampled[s:s + chunk + 1]
        nchunk = s // chunk + 1
        cfile = cache / f"chunk_{nchunk}.json"
        if cfile.exists():
            print(f"  chunk {nchunk}: cached")
            res = json.loads(cfile.read_text(encoding="utf-8"))
        else:
            coords = ",".join(f"{pts[i][0]:.5f},{pts[i][1]:.5f}" for i in idxs)
            q = (f'[out:json][timeout:180];('
                 f'way[highway~"{ROAD_RE}"][bridge!~"."][access!~"^(private|no)$"]'
                 f'(around:60,{coords});'
                 f'node[amenity=parking][access!~"^(private|no)$"](around:160,{coords});'
                 f'way[amenity=parking][access!~"^(private|no)$"](around:160,{coords});'
                 f');out tags geom;')
            print(f"  overpass chunk {nchunk}/{(len(sampled) - 2) // chunk + 1}...")
            res = overpass(q)
            cfile.write_text(json.dumps(res), encoding="utf-8")
            time.sleep(8)
        i0, i1 = idxs[0], idxs[-1]
        for el in res.get("elements", []):
            tags = el.get("tags", {})
            if el["type"] == "node":
                geom = [(el["lat"], el["lon"])]
            else:
                geom = [(g["lat"], g["lon"]) for g in el.get("geometry", [])]
            if not geom:
                continue
            is_parking = tags.get("amenity") == "parking"
            limit = 170 if is_parking else 70
            best = (1e18, None, None)
            for g in geom[::max(1, len(geom) // 60)]:
                d, qpt, mile = nearest_on_route(g, pts, cum, max(0, i0 - 2), min(len(pts) - 1, i1 + 2))
                if d < best[0]:
                    best = (d, qpt, mile)
            if best[1] is None or best[0] > limit:
                continue
            name = tags.get("name", "")
            if is_parking:
                label = name or "Parking area"
            else:
                label = name or tags.get("ref", "") or "Road crossing"
            cands.append((best[2], best[1], label, "parking" if is_parking else "road"))
    print(f"  {len(cands)} access candidates")
    return cands

# ---------- pick stops every ~10 miles ----------
def pick_stops(cands, day_bounds):
    cands.sort(key=lambda c: c[0])
    stops = []
    for day in sorted(day_bounds):
        d0, d1 = day_bounds[day]
        target = d0 + 10 * MI
        last = d0
        while target < d1 - 4 * MI:
            window = [c for c in cands
                      if abs(c[0] - target) <= 4 * MI and c[0] > last + 5 * MI and c[0] < d1 - 2 * MI]
            if not window:
                target += 10 * MI
                continue
            def score(c):
                s = abs(c[0] - target) / MI
                if c[3] == "parking":
                    s -= 1.5
                if c[2] not in ("Road crossing", "Parking area"):
                    s -= 0.75
                return s
            best = min(window, key=score)
            stops.append({"day": day, "mile": best[0], "pt": best[1],
                          "label": best[2], "kind": best[3]})
            last = best[0]
            target = best[0] + 10 * MI
    return stops

def main():
    pts, cum, day_of, day_bounds = load_route()
    print(f"Route: {len(pts)} pts, {cum[-1]/MI:.1f} mi total")

    print("Snapping waypoints onto the trail...")
    snap_waypoints(pts, cum)

    print("Fetching vehicle access points from Overpass...")
    cands = fetch_access_candidates(pts, cum)

    stops = pick_stops(cands, day_bounds)
    out = []
    for s in stops:
        d0, _ = day_bounds[s["day"]]
        out.append({
            "day": s["day"],
            "tripMile": round(s["mile"] / MI, 1),
            "dayMile": round((s["mile"] - d0) / MI, 1),
            "lat": round(s["pt"][0], 5),
            "lng": round(s["pt"][1], 5),
            "name": s["label"],
            "kind": s["kind"],
        })
        print(f"  Day {s['day']} mile {out[-1]['dayMile']:5.1f} (trip {out[-1]['tripMile']:5.1f}) "
              f"[{s['kind']:7s}] {s['label']}")

    js = ("/* Auto-generated by tools/build_stops.py from OpenStreetMap data.\n"
          " * Support-vehicle meet points: spots every ~10 mi where a public road or\n"
          " * parking area touches the GAP / C&O trail. Do not edit by hand. */\n"
          "const VEHICLE_STOPS = ")
    js += json.dumps(out, indent=1) + ";\n"
    (SITE / "stops-data.js").write_text(js, encoding="utf-8")
    print(f"Wrote {SITE / 'stops-data.js'} ({len(stops)} stops)")

if __name__ == "__main__":
    main()
