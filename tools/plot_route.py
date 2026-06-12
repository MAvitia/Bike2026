"""Quick visual check of route-data.js (not used by the website)."""
import json
import re
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

site = Path(__file__).resolve().parent.parent
src = (site / "route-data.js").read_text(encoding="utf-8")
route = json.loads(src[src.index("=") + 1:].rstrip().rstrip(";"))

txt = (site / "data.js").read_text(encoding="utf-8")
wps = [(float(m.group(2)), float(m.group(3)))
       for m in re.finditer(r'\{ name: "(.*?)",\s*lat: ([\-0-9.]+), lng: ([\-0-9.]+)', txt)]

colors = {"1": "#1f78b4", "2": "#33a02c", "3": "#ff7f00", "4": "#6a3d9a", "5": "#e31a1c"}
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
ax = axes[0][0]
for d, pts in route.items():
    ax.plot([p[1] for p in pts], [p[0] for p in pts], color=colors[d], lw=1)
ax.scatter([w[1] for w in wps], [w[0] for w in wps], s=12, c="k", zorder=5)
ax.set_title("Full route + waypoints")
ax.set_aspect(1.3)

zooms = [
    ("Pittsburgh start", 40.36, 40.46, -80.03, -79.83),
    ("Ohiopyle loops", 39.85, 39.93, -79.55, -79.42),
    ("Cumberland GAP->C&O junction", 39.60, 39.70, -78.85, -78.70),
    ("Paw Paw bends", 39.50, 39.65, -78.50, -78.30),
    ("DC finish", 38.88, 39.02, -77.30, -77.02),
]
for (title, la0, la1, lo0, lo1), ax in zip(zooms, axes.flat[1:]):
    for d, pts in route.items():
        ax.plot([p[1] for p in pts], [p[0] for p in pts], color=colors[d], lw=1.5)
    ax.scatter([w[1] for w in wps], [w[0] for w in wps], s=20, c="k", zorder=5)
    ax.set_xlim(lo0, lo1); ax.set_ylim(la0, la1)
    ax.set_title(title); ax.set_aspect(1.3)
plt.tight_layout()
out = site / "tools" / "route_check.png"
plt.savefig(out, dpi=110)
print("saved", out)
