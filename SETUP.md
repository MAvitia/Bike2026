# Live Group Tracking — Setup Guide

This turns the site into a **live group map**: everyone opens the shared link, enters a name, and sees each other move in real time. Optionally, a background tracker keeps a rider updating even when the page is closed.

There are three layers:

1. **Live web map** — Firebase Realtime Database (free). *Required for live features.*
2. **Background phone tracking** — OwnTracks app + a tiny Cloudflare relay (free). *Optional.*
3. **Hardware tracker** — a 4G GPS device + Traccar. *Optional, best for "always-on".*

---

## 1) Firebase Realtime Database (5 minutes) — required for live

1. Go to <https://console.firebase.google.com> and **Add project** (any name, e.g. `biketrip-2026`). You can disable Google Analytics.
2. In the left menu open **Build → Realtime Database → Create Database**.
   - Pick a location, then start in **Locked mode** (we'll paste rules next).
3. Open the **Rules** tab and paste the contents of [`database.rules.json`](database.rules.json), then **Publish**.
   - These rules only allow read/write to rooms whose code is at least 12 characters — i.e. your unguessable trip code is the access control.
4. Add a **Web app**: Project Overview → the **`</>`** (web) icon → register an app (no hosting needed). Copy the `firebaseConfig` values.
5. Paste those values into [`firebase-config.js`](firebase-config.js) (replace the `PASTE_...` placeholders). Keep `databaseURL`.
6. Commit & push. The **Live** tab now works.

> The Firebase web keys are **not secrets** — they're safe to commit publicly. Security comes from the long room code in the link + the database rules above.

**Using it:** open the site → **Live** tab → enter your name → *Share my live location*. Tap **Copy share link** and send it to the family — that link contains the private trip code so everyone lands in the same room.

---

## 2) Background tracking with OwnTracks (optional, free, no hardware)

A web page only transmits while it's open. To keep sharing with the screen off, use the free **OwnTracks** app, relayed into Firebase by a Cloudflare Worker.

### a) Deploy the relay (Cloudflare Workers — free)

1. Install Node, then the Cloudflare CLI: `npm install -g wrangler`
2. In `owntracks-relay/wrangler.toml`, set `RTDB_URL` to your Firebase `databaseURL`.
3. From the `owntracks-relay/` folder:
   ```
   wrangler login
   wrangler deploy
   ```
4. Note the deployed URL, e.g. `https://biketrip-owntracks-relay.<you>.workers.dev`.

### b) Configure the OwnTracks app — seamless (recommended)

The site builds the whole config for you:

1. Install **OwnTracks** from the App Store / Play Store.
2. On the site, go to the **👥 Live** tab → **Track in the background** section.
3. Enter your **name** (top of the tab) and paste your **relay Worker URL** (from step a).
4. A **QR code** appears. In OwnTracks, open **Settings → Configuration** and **scan** it — this auto-sets HTTP mode, the URL, your room, and name. Done.
5. Allow location **Always**, and bump monitoring to **Move** in OwnTracks for frequent updates while riding.

### b-alt) Configure OwnTracks manually (fallback)

1. OwnTracks → Settings → **Mode = HTTP**.
2. **URL** = the one shown on the Live tab (copy it with the button), which looks like:
   ```
   https://biketrip-owntracks-relay.<you>.workers.dev/?room=<YOUR_TRIP_CODE>&name=<YourName>
   ```
   Use the same name you use on the web (so it's one marker, not two).
3. Allow location **Always** and pick **Move** mode for frequent updates while riding.

Now that rider shows up on everyone's map even with the phone locked and the page closed. ⚠️ Background location drains battery — charge nightly (you've already got the battery setup!).

---

## 3) Hardware GPS tracker (optional — best "always-on")

If you'd rather not rely on a phone app, use a dedicated tracker with its **own GPS + cellular** connection.

### Why not Tile / AirTag
They're **Bluetooth-only** with **no GPS or cellular** and rely on nearby strangers' phones to report a location — useless on the empty GAP/C&O. Neither offers a public real-time location API. **Don't use them for this.**

### Recommended: a 4G tracker + Traccar
[Traccar](https://www.traccar.org) is a free, open-source tracking server supporting 2,000+ devices, with a **REST API + live WebSocket** you can feed into this map.

| Device | Notes | Rough cost |
|---|---|---|
| **Teltonika FMC920 / FMC003** | Rugged 4G LTE, very reliable, Traccar-supported | $50–$90 + IoT SIM |
| **Queclink GL30 / GV-series** | Compact 4G, long battery | $60–$120 + SIM |
| Budget "TKStar"-style 4G | Cheapest, less reliable | $25–$40 + SIM |

Plus a low-cost **IoT/data SIM** (Hologram, Soracom, or a cheap prepaid plan). Point the device at your Traccar server (self-host or Traccar's paid cloud), then a small adapter writes Traccar positions into the same Firebase room.

### Plug-and-play alternatives (nice apps, limited/no API)
**Tractive**, **Invoxia GPS**, **Jiobit** — easy and reliable, but you generally can't pull their data into your own map (closed apps + subscriptions).

### Zero-code fallback
**Glympse** or **Google Maps location sharing** broadcast a rider's live location via a link in the background, free — but in their own UI, not this custom map.

> **Coverage caveat:** cell service is spotty on these trails, so *any* cellular device (phone or tracker) will have gaps. Good trackers/apps buffer offline and upload the backlog when signal returns.

---

## 4) Photo upload to Google Drive (optional, free)

The **Plan tab → 📷 Trip Photos** lets anyone snap/pick photos that upload straight into your shared Google Drive folder — no Google sign-in for the uploaders. A tiny Cloudflare Worker (`upload-relay/`) holds the Google credentials and does the upload on their behalf.

### a) Create Google OAuth credentials (once)

1. Go to <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → Library →** enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen:** choose **External**, fill the basics, and under **Test users** add the Google account that **owns the Drive folder**. (Testing mode is fine; you don't need to publish.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
   - Add `https://developers.google.com/oauthplayground` as an **Authorized redirect URI**.
   - Save the **Client ID** and **Client secret**.

### b) Get a refresh token (once)

1. Open the **OAuth 2.0 Playground** <https://developers.google.com/oauthplayground>.
2. Click the ⚙️ (top right) → check **Use your own OAuth credentials** → paste your Client ID + secret.
3. On the left, in **Input your own scopes**, enter `https://www.googleapis.com/auth/drive` → **Authorize APIs** → sign in as the folder owner → allow.
4. Click **Exchange authorization code for tokens**. Copy the **Refresh token**.

### c) Deploy the upload Worker

From the `upload-relay/` folder:

```
wrangler login
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN
wrangler deploy
```

`DRIVE_FOLDER_ID` is already set in `upload-relay/wrangler.toml` to your folder. The deployed URL should be `https://biketrip-photo-upload.<you>.workers.dev` — if your subdomain differs, update `window.UPLOAD_WORKER_URL` in [`firebase-config.js`](firebase-config.js), then commit & push.

> The Google Client ID, secret, and refresh token live **only inside the Worker** (set via `wrangler secret`, never in the website or git), so they're never exposed to uploaders. Photos are owned by the folder owner and named `Name_timestamp_original.jpg`. The browser downscales photos to ~2048 px before upload to save data. If you'd rather keep the token tightly scoped you can try `https://www.googleapis.com/auth/drive.file`, but uploads into a pre-existing folder are most reliable with the full `drive` scope.

---

## Privacy reminder
The room code in the share link is the only thing protecting your group's live locations. Treat it like a password: share it privately, and start a fresh trip code (clear the `room` from the URL) if it ever leaks.
