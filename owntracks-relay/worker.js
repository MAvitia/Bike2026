/* OwnTracks -> Firebase Realtime Database relay (Cloudflare Worker, free tier)
 *
 * The OwnTracks phone app (HTTP mode) POSTs the rider's location here in the
 * background. This worker writes it into the same Firebase room the live web
 * map reads, so a rider keeps updating even with the page closed.
 *
 * Configure the OwnTracks app HTTP URL as:
 *   https://<your-worker>.workers.dev/?room=<TRIP_CODE>&name=<RiderName>
 *
 * Set RTDB_URL (your Firebase database URL) in wrangler.toml. No Firebase
 * secret is needed because the database rules allow writes to a room whose
 * code is long/unguessable (see ../database.rules.json).
 */

function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "tracker";
}
function cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return resp;
}
function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method !== "POST") return cors(new Response("OwnTracks relay is running.", { status: 200 }));

    const url = new URL(request.url);
    const room = url.searchParams.get("room") || "";
    const name = url.searchParams.get("name") || "tracker";

    let body = {};
    try { body = await request.json(); } catch (e) {}

    // OwnTracks expects a JSON array response; [] is fine.
    if (room.length < 12) return cors(jsonResp([], 200));

    if (body && body._type === "location" && typeof body.lat === "number" && typeof body.lon === "number") {
      const payload = {
        name: name,
        lat: body.lat,
        lng: body.lon,
        spd: (body.vel != null) ? Math.round(body.vel * 0.621371 * 10) / 10 : null, // km/h -> mph
        ts: body.tst ? body.tst * 1000 : Date.now(),
        src: "owntracks"
      };
      const target = `${env.RTDB_URL}/rooms/${room}/riders/${slug(name)}.json`;
      try {
        await fetch(target, { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      } catch (e) {}
    }
    return cors(jsonResp([], 200));
  }
};
