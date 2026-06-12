# Bike Trip 2026 — Live Route & Speed Trainer 🚲

A mobile-first web app for our Pittsburgh → Washington, DC bike trip (GAP + C&O, ~320 miles over 5 riding days).

It runs entirely in the phone's browser — no app install, no server, no API keys.

## What it does

- **🗺️ Route tab** — Live map with the full route, color-coded by day, all the trail-town and landmark stops. Tap **Start GPS (▶)** to see your live position, your current **speed**, and the **distance to your next stop**. Your path is drawn as a blue breadcrumb trail.
- **⚡ Speed tab** — A big **speed gauge** for training. Hold a steady pace and watch the color zones:
  - 🔵 **Stopped**
  - 🔴 **Under 8 mph** — too slow
  - 🟡 **8–10 mph** — almost there
  - 🟢 **10–12 mph** — on target
  - 🟢🟢 **12+ mph** — flying
  - Shows your 30-second average, trip average, and max speed, plus a live "on pace?" verdict (goal: 10 mph).
- **📋 Plan tab** — All five days with maps, stops, and mileage. Save your own **pins** (interest points) — tap the map or use 📍 to mark your GPS spot. Pins are stored on your device.
- **👥 Live tab** — Optional **live group map**: everyone opens the shared link, enters a name, and sees each other move in real time. Access is gated by an unguessable trip code in the link (treat it like a passcode). Requires a free Firebase project — see **[SETUP.md](SETUP.md)**. Background tracking (page closed) via the OwnTracks app or a 4G GPS tracker is covered there too.
- **Date-aware** — On a real trip day it opens straight to live tracking for that day. Any other day it opens in browse/training mode.

## Phone tips

- Allow **Location** access when the browser asks.
- Keep the screen on (the app requests a screen wake-lock while tracking).
- Map tiles need a data connection; speed/GPS still work without signal.
- Add it to your home screen for a full-screen, app-like feel (Share → *Add to Home Screen*).

## Publish on GitHub Pages (free links to share)

1. Create a new GitHub repo (e.g. `biketrip-2026`).
2. Upload **all the files in this `website` folder** to the repo root:
   `index.html`, `styles.css`, `app.js`, `data.js`.
3. In the repo go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick branch **main** and folder **/ (root)**, then **Save**.
6. After a minute your link is live at:
   `https://<your-username>.github.io/biketrip-2026/`
7. Share that link with the family. 🎉

> Tip (CLI alternative): from inside this folder run
> `git init && git add . && git commit -m "Bike trip site" && git branch -M main`
> then `git remote add origin <repo-url> && git push -u origin main`, and enable Pages as above.

## Editing the route

All stops, coordinates, day colors, and mileages live in **`data.js`** — edit that file to add/move stops or tweak descriptions. No build step; just refresh.
