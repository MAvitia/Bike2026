"""Find OSM route relations for the GAP and C&O Canal Towpath."""
import json
import urllib.request
import urllib.parse

QUERY = """
[out:json][timeout:120];
(
  relation["route"]["name"~"Great Allegheny Passage", i];
  relation["route"]["name"~"Chesapeake (and|&) Ohio", i];
  relation["route"]["name"~"C&O Canal", i];
);
out tags;
"""

def overpass(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=data,
                                 headers={"User-Agent": "biketrip-route-builder/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

res = overpass(QUERY)
for el in res.get("elements", []):
    t = el.get("tags", {})
    print(el["id"], "|", t.get("route"), "|", t.get("network", ""), "|",
          t.get("name", ""), "|", t.get("state", ""))
