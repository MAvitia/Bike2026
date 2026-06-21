"""Screenshot the route view at phone size to verify the map UI layout."""
import sys
import threading
import functools
import http.server
from pathlib import Path
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parent.parent
PORT = 8741

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()

mode = sys.argv[1] if len(sys.argv) > 1 else "default"
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 390, "height": 760})
    if mode.startswith("es"):
        page.add_init_script("try { localStorage.setItem('biketrip_lang','es'); } catch(e) {}")
    page.goto(f"http://127.0.0.1:{PORT}/index.html#route")
    page.wait_for_timeout(2500)
    if mode == "driver":
        # leave only Vehicle + Hotels on
        for f in ("lunch", "poi", "town"):
            page.click(f"#mapFilter button[data-f={f}]")
        page.wait_for_timeout(400)
    if mode == "sights":
        page.evaluate("() => BikeApp.map.setView([39.868, -79.49], 13)")
        page.wait_for_timeout(1200)
    if mode in ("plan", "es-plan"):
        page.evaluate("() => window.__setView('plan')")
        page.wait_for_timeout(400)
        page.evaluate("() => document.querySelector('#view-plan .scroll').scrollTo(0, 700)")
        page.wait_for_timeout(200)
    if mode == "photos":
        page.evaluate("() => window.__setView('plan')")
        page.wait_for_timeout(400)
    if mode == "pins":
        # inject a couple of fake live markers to verify the new pin style
        page.evaluate("""() => {
            const map = window.BikeApp.map;
            map.setView([39.868, -79.49], 14);
            const mk = (lat, lng, col, name, me, stale) => {
              const cls = 'live-pin' + (me ? ' me' : '') + (stale ? ' stale' : '');
              const html = "<div class='"+cls+"' style='background:"+col+"'>"+name.charAt(0)+
                "<span class='live-pin-label'>"+name+"</span></div>";
              L.marker([lat,lng], { icon: L.divIcon({className:'', html, iconSize:[30,30], iconAnchor:[15,15]}), zIndexOffset:1000 }).addTo(map);
            };
            mk(39.870, -79.492, 'hsl(140,70%,55%)', 'Manuel', true, false);
            mk(39.866, -79.487, 'hsl(280,70%,55%)', 'Sofia', false, false);
            mk(39.872, -79.486, 'hsl(20,70%,55%)', 'Diego', false, true);
        }""")
        page.wait_for_timeout(800)
    if mode == "speed":
        # simulate the GPS-on state to show the bottom speed overlay
        page.evaluate("""() => {
            document.getElementById('mapSpeed').hidden = false;
            document.getElementById('chipSpeed').hidden = true;
            document.getElementById('msVal').textContent = '11.2';
            document.getElementById('msVal').style.color = '#2fae47';
            const z = document.getElementById('msZone');
            z.textContent = 'ON TARGET'; z.style.color = '#2fae47';
        }""")
        page.wait_for_timeout(200)
    out = SITE / "tools" / f"ui_{mode}.png"
    page.screenshot(path=str(out))
    print("saved", out)
    b.close()
srv.shutdown()
