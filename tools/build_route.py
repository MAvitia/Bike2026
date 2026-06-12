"""Build a high-resolution GAP + C&O route polyline from OpenStreetMap data.

Fetches the official OSM route relations for the Great Allegheny Passage and
the C&O Canal Towpath, builds a graph of the trail, snaps the trip waypoints
onto it, and routes between consecutive waypoints with Dijkstra so the result
follows the actual trail (never roads). Output: website/route-data.js
"""
import json
import math
import heapq
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent

RELATION_IDS = [
    2962355,   # Great Allegheny Passage (Pennsylvania)
    1369277,   # Great Allegheny Passage (Maryland)
    1392951,   # Chesapeake and Ohio Canal Towpath (Maryland)
    9773990,   # Chesapeake & Ohio Canal Trail (DC)
]
SKIP_ROLES = re.compile(r"alternat|excursion|approach|connection", re.I)

R_EARTH = 6371000.0

def hav(a, b):
    la1, lo1 = a
    la2, lo2 = b
    dla = math.radians(la2 - la1)
    dlo = math.radians(lo2 - lo1)
    s = (math.sin(dla / 2) ** 2 +
         math.cos(math.radians(la1)) * math.cos(math.radians(la2)) * math.sin(dlo / 2) ** 2)
    return 2 * R_EARTH * math.asin(math.sqrt(s))

def overpass(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=data,
                                 headers={"User-Agent": "biketrip-route-builder/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)

def fetch_ways():
    ids = ",".join(str(i) for i in RELATION_IDS)
    q = f"[out:json][timeout:300];relation(id:{ids});out geom;"
    print("Fetching trail geometry from Overpass...")
    res = overpass(q)
    ways = []
    for rel in res["elements"]:
        for m in rel.get("members", []):
            if m["type"] != "way" or "geometry" not in m:
                continue
            if SKIP_ROLES.search(m.get("role", "") or ""):
                continue
            pts = [(g["lat"], g["lon"]) for g in m["geometry"]]
            if len(pts) >= 2:
                ways.append(pts)
    print(f"  {len(ways)} ways")
    return ways

# ---------- graph ----------
def key(p):
    return (round(p[0], 7), round(p[1], 7))

def build_graph(ways):
    adj = {}
    def add(a, b):
        d = hav(a, b)
        adj.setdefault(a, {})
        adj.setdefault(b, {})
        if d < adj[a].get(b, 1e18):
            adj[a][b] = d
            adj[b][a] = d
    endpoints = []
    for pts in ways:
        ks = [key(p) for p in pts]
        for a, b in zip(ks, ks[1:]):
            if a != b:
                add(a, b)
        endpoints.append(ks[0])
        endpoints.append(ks[-1])
    print(f"  {len(adj)} graph nodes")
    return adj, endpoints

def components(adj):
    comp = {}
    c = 0
    for start in adj:
        if start in comp:
            continue
        stack = [start]
        comp[start] = c
        while stack:
            n = stack.pop()
            for m in adj[n]:
                if m not in comp:
                    comp[m] = c
                    stack.append(m)
        c += 1
    print(f"  {c} connected components")
    return comp

def bridge_components(adj, endpoints, comp, max_gap=400.0):
    """Join nearby disconnected pieces (small data gaps, GAP<->C&O junction)."""
    eps = sorted(set(endpoints))
    added = True
    while added:
        added = False
        best = {}
        for i, a in enumerate(eps):
            for b in eps[i + 1:]:
                ca, cb = comp[a], comp[b]
                if ca == cb:
                    continue
                if abs(a[0] - b[0]) > 0.01 or abs(a[1] - b[1]) > 0.01:
                    continue
                d = hav(a, b)
                if d <= max_gap:
                    k = (min(ca, cb), max(ca, cb))
                    if d < best.get(k, (1e18, None, None))[0]:
                        best[k] = (d, a, b)
        for d, a, b in best.values():
            adj[a][b] = d * 2.0  # slight penalty so real trail wins when both exist
            adj[b][a] = d * 2.0
            ca, cb = comp[a], comp[b]
            for n, c in comp.items():
                if c == cb:
                    comp[n] = ca
            print(f"  bridged {d:.0f} m gap near {a[0]:.4f},{a[1]:.4f}")
            added = True

def nearest_node(adj, p):
    best, bd = None, 1e18
    for n in adj:
        d = (n[0] - p[0]) ** 2 + (n[1] - p[1]) ** 2
        if d < bd:
            bd, best = d, n
    return best

def dijkstra(adj, src, dst):
    dist = {src: 0.0}
    prev = {}
    pq = [(0.0, src)]
    while pq:
        d, n = heapq.heappop(pq)
        if n == dst:
            break
        if d > dist.get(n, 1e18):
            continue
        for m, w in adj[n].items():
            nd = d + w
            if nd < dist.get(m, 1e18):
                dist[m] = nd
                prev[m] = n
                heapq.heappush(pq, (nd, m))
    if dst not in dist:
        return None, None
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    path.reverse()
    return path, dist[dst]

# ---------- simplify (Douglas-Peucker on degrees) ----------
def dp(points, tol):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i0, i1 = stack.pop()
        ax, ay = points[i0]
        bx, by = points[i1]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        worst, wi = 0.0, -1
        for i in range(i0 + 1, i1):
            px, py = points[i]
            if L2 == 0:
                d2 = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
                d2 = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2
            if d2 > worst:
                worst, wi = d2, i
        if worst > tol * tol:
            keep[wi] = True
            stack.append((i0, wi))
            stack.append((wi, i1))
    return [p for p, k in zip(points, keep) if k]

# ---------- main ----------
def load_waypoints():
    txt = (SITE / "data.js").read_text(encoding="utf-8")
    wps = []
    for m in re.finditer(r'\{ name: "(.*?)",\s*lat: ([\-0-9.]+), lng: ([\-0-9.]+), day: (\d+)', txt):
        wps.append({"name": m.group(1), "lat": float(m.group(2)),
                    "lng": float(m.group(3)), "day": int(m.group(4))})
    return wps

def main():
    ways = fetch_ways()
    adj, endpoints = build_graph(ways)
    comp = components(adj)
    bridge_components(adj, endpoints, comp)

    wps = load_waypoints()
    print(f"{len(wps)} waypoints loaded")
    nodes = []
    for w in wps:
        n = nearest_node(adj, (w["lat"], w["lng"]))
        off = hav(n, (w["lat"], w["lng"]))
        print(f"  {w['name']}: snapped {off:.0f} m")
        nodes.append(n)

    day_pts = {}   # day -> list of (lat, lon)
    day_len = {}
    for i in range(len(wps) - 1):
        day = wps[i + 1]["day"]
        path, dist = dijkstra(adj, nodes[i], nodes[i + 1])
        if path is None:
            print(f"!! NO PATH {wps[i]['name']} -> {wps[i+1]['name']}", file=sys.stderr)
            sys.exit(1)
        print(f"  leg {wps[i]['name']} -> {wps[i+1]['name']}: {dist/1609.34:.1f} mi, {len(path)} pts")
        seg = day_pts.setdefault(day, [])
        if seg and seg[-1] == path[0]:
            path = path[1:]
        seg.extend(path)
        day_len[day] = day_len.get(day, 0) + dist

    out = {}
    TOL = 0.00006  # ~6-7 m
    total = 0
    for day in sorted(day_pts):
        simp = dp(day_pts[day], TOL)
        out[day] = [[round(p[0], 5), round(p[1], 5)] for p in simp]
        total += len(simp)
        print(f"Day {day}: {day_len[day]/1609.34:.1f} mi, {len(day_pts[day])} -> {len(simp)} pts")
    print(f"Total points: {total}")

    js = ("/* Auto-generated by tools/build_route.py from OpenStreetMap data.\n"
          " * High-resolution GAP + C&O Canal Towpath geometry, split per riding day.\n"
          " * (c) OpenStreetMap contributors, ODbL. Do not edit by hand. */\n"
          "const TRIP_ROUTE = ")
    js += json.dumps(out, separators=(",", ":")) + ";\n"
    (SITE / "route-data.js").write_text(js, encoding="utf-8")
    print(f"Wrote {SITE / 'route-data.js'} ({len(js)//1024} KB)")

if __name__ == "__main__":
    main()
