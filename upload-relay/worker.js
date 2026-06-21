/* Photo upload -> Google Drive relay (Cloudflare Worker, free tier)
 *
 * The website POSTs a photo here as multipart/form-data (fields: file, name).
 * This Worker exchanges a stored Google OAuth refresh token for an access
 * token and uploads the file into a fixed Drive folder. Because the credentials
 * live here (never in the browser), family members upload without signing in.
 *
 * Required secrets (set with `wrangler secret put <NAME>`):
 *   GOOGLE_CLIENT_ID       OAuth 2.0 client id (Desktop or Web app)
 *   GOOGLE_CLIENT_SECRET   OAuth 2.0 client secret
 *   GOOGLE_REFRESH_TOKEN   refresh token for the Drive account that owns the folder
 *
 * Required var (in wrangler.toml [vars]):
 *   DRIVE_FOLDER_ID        the destination folder id (from its Drive URL)
 *
 * See ../SETUP.md section 4 for how to get the refresh token.
 */

function cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return resp;
}
function json(obj, status) {
  return cors(new Response(JSON.stringify(obj), {
    status: status || 200, headers: { "Content-Type": "application/json" }
  }));
}

async function getAccessToken(env) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token"
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("auth: " + (j.error_description || j.error || "no token"));
  return j.access_token;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (request.method !== "POST") return cors(new Response("Bike Trip photo upload relay is running.", { status: 200 }));
    if (!env.GOOGLE_REFRESH_TOKEN || !env.DRIVE_FOLDER_ID) {
      return json({ error: "relay not configured (missing secrets)" }, 500);
    }

    let form;
    try { form = await request.formData(); } catch (e) { return json({ error: "bad form data" }, 400); }
    const file = form.get("file");
    if (!file || typeof file === "string") return json({ error: "no file" }, 400);

    const who = (form.get("name") || "rider").toString().replace(/[^\w \-]+/g, "").trim().slice(0, 40) || "rider";
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const safe = (file.name || "photo.jpg").replace(/[^\w.\-]+/g, "_").slice(-60);
    const filename = `${who}_${stamp}_${safe}`;

    let token;
    try { token = await getAccessToken(env); } catch (e) { return json({ error: String(e.message || e) }, 502); }

    const meta = { name: filename, parents: [env.DRIVE_FOLDER_ID] };
    const boundary = "biketrip" + Math.random().toString(16).slice(2);
    const enc = new TextEncoder();
    const pre = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(meta) +
      `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`
    );
    const post = enc.encode(`\r\n--${boundary}--`);
    const fileBuf = new Uint8Array(await file.arrayBuffer());
    const bodyBuf = new Uint8Array(pre.length + fileBuf.length + post.length);
    bodyBuf.set(pre, 0);
    bodyBuf.set(fileBuf, pre.length);
    bodyBuf.set(post, pre.length + fileBuf.length);

    const up = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true",
      {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": `multipart/related; boundary=${boundary}` },
        body: bodyBuf
      }
    );
    const res = await up.json();
    if (!up.ok) return json({ error: res.error ? res.error.message : "upload failed" }, 502);
    return json({ ok: true, id: res.id, name: res.name, link: res.webViewLink });
  }
};
