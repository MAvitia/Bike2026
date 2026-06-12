/* Bike Trip 2026 — live group tracking (Firebase Realtime Database)
 *
 * Each person opens the shared link, enters their name, and their phone
 * broadcasts its GPS to a shared "room". Everyone in the room sees everyone
 * else move on the map in real time. A background OwnTracks relay can write
 * into the same room so a rider keeps updating even with the page closed.
 *
 * Access control = the (unguessable) room code in the link. Treat the link
 * like a passcode: only share it with people you want to see locations.
 */
(function () {
  "use strict";

  var LIVE_MS = 60000;        // fresher than this = "live" (green)
  var IDLE_MS = 5 * 60000;    // fresher than this = "idle" (yellow)
  var DROP_MS = 60 * 60000;   // older than this = remove from map
  var PUBLISH_MIN_MS = 3000;  // throttle writes

  var state = {
    configured: false,
    db: null,
    room: null,
    name: null,
    riderKey: null,
    joined: false,
    ref: null,
    riders: {},        // key -> data
    markers: {},       // key -> Leaflet marker
    lastPublish: 0,
    timer: null
  };

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function slug(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "rider";
  }
  function colorFor(key) {
    var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    return "hsl(" + h + ",70%,55%)";
  }
  function toRad(d) { return d * Math.PI / 180; }
  function haversineMi(a, b) {
    var R = 3958.8, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function ago(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + T("agoS");
    if (s < 3600) return Math.round(s / 60) + T("agoM");
    return Math.round(s / 3600) + T("agoH");
  }
  function spdStr(mph) { return speedDisp(mph).toFixed(1) + " " + speedUnit(); }
  function freshness(ts) {
    var d = Date.now() - ts;
    if (d <= LIVE_MS) return "live";
    if (d <= IDLE_MS) return "idle";
    return "stale";
  }

  // ---------- room / config ----------
  function getRoom() {
    var p = new URLSearchParams(location.search);
    var r = p.get("room");
    if (!r && location.hash.indexOf("room=") >= 0) {
      r = new URLSearchParams(location.hash.slice(1)).get("room");
    }
    if (!r) r = localStorage.getItem("biketrip_room");
    if (!r) {
      r = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).replace(/[^a-z0-9]/g, "");
      // put it in the URL so this becomes the shareable secret link
      p.set("room", r);
      history.replaceState(null, "", location.pathname + "?" + p.toString());
    }
    localStorage.setItem("biketrip_room", r);
    return r;
  }
  function shareUrl() {
    var p = new URLSearchParams(location.search);
    p.set("room", state.room);
    return location.origin + location.pathname + "?" + p.toString();
  }
  function isConfigured() {
    var c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.databaseURL && c.apiKey.indexOf("PASTE_") < 0);
  }

  // ---------- firebase ----------
  function initFirebase() {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    state.db = firebase.database();
    state.ref = state.db.ref("rooms/" + state.room + "/riders");
    state.ref.on("value", function (snap) {
      state.riders = snap.val() || {};
      renderAll();
    }, function (err) {
      setStatus("⚠️ Live error: " + err.message, "warn");
    });
  }

  // ---------- publish (called by app.js on every GPS fix) ----------
  function publish(lat, lng, mph) {
    if (!state.joined || !state.ref) return;
    var now = Date.now();
    if (now - state.lastPublish < PUBLISH_MIN_MS) return;
    state.lastPublish = now;
    state.ref.child(state.riderKey).set({
      name: state.name, lat: lat, lng: lng, spd: Math.round((mph || 0) * 10) / 10,
      ts: now, src: "web"
    }).catch(function () {});
  }
  window.LiveTracker = { publish: publish };

  // ---------- join / leave ----------
  function join() {
    var name = ($("liveName").value || "").trim();
    if (!name) { $("liveName").focus(); return; }
    if (!isConfigured()) { setStatus(T("liveSetup"), "warn"); return; }
    state.name = name;
    state.riderKey = slug(name);
    localStorage.setItem("biketrip_name", name);
    state.joined = true;
    if (state.ref) {
      state.ref.child(state.riderKey).onDisconnect().update({ src: "web-offline" });
    }
    // start the app's GPS so positions flow through to publish()
    if (window.BikeApp && window.BikeApp.startGps && !(window.BikeApp.isTracking && window.BikeApp.isTracking())) {
      window.BikeApp.startGps();
    }
    // immediate one-shot so others see us right away
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (p) {
        publish(p.coords.latitude, p.coords.longitude, (p.coords.speed || 0) * 2.2369);
      }, function () {}, { enableHighAccuracy: true, timeout: 15000 });
    }
    renderJoinUI();
    renderOt();
    setStatus(T("liveSharingAs", { n: name }), "ok");
  }
  function leave() {
    state.joined = false;
    if (state.ref && state.riderKey) state.ref.child(state.riderKey).update({ src: "web-offline", ts: Date.now() });
    renderJoinUI();
    setStatus(T("liveStopped"), "");
  }

  // ---------- rendering ----------
  function setStatus(msg, kind) {
    var el = $("liveStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "banner" + (kind === "ok" ? " live" : "");
    el.style.display = msg ? "block" : "none";
    if (kind === "warn") { el.style.background = "#3a2e12"; el.style.borderColor = "#6b5320"; el.style.color = "#ffd98a"; }
  }

  function renderAll() {
    var map = window.BikeApp && window.BikeApp.map;
    if (!map) return;
    var now = Date.now();
    // markers
    Object.keys(state.riders).forEach(function (key) {
      var r = state.riders[key];
      if (!r || typeof r.lat !== "number") return;
      if (now - (r.ts || 0) > DROP_MS) { removeMarker(key); return; }
      var fresh = freshness(r.ts || 0);
      var col = colorFor(key);
      var opacity = fresh === "stale" ? 0.45 : 1;
      var html = "<div class='live-pin' style='background:" + col + ";opacity:" + opacity + "'>" +
        "<span class='live-pin-label'>" + escapeHtml(r.name || key) + "</span></div>";
      var icon = L.divIcon({ className: "", html: html, iconSize: [16, 16], iconAnchor: [8, 8] });
      if (state.markers[key]) {
        state.markers[key].setLatLng([r.lat, r.lng]).setIcon(icon);
      } else {
        state.markers[key] = L.marker([r.lat, r.lng], { icon: icon, zIndexOffset: 900 }).addTo(map);
      }
      state.markers[key].bindPopup("<b>" + escapeHtml(r.name || key) + "</b><br>" +
        (r.spd != null ? spdStr(r.spd) + " · " : "") + ago(r.ts || 0) +
        (r.src && r.src.indexOf("owntracks") === 0 ? "<br><span style='color:#888'>" + T("liveViaTracker") + "</span>" : ""));
    });
    // remove markers for riders no longer present
    Object.keys(state.markers).forEach(function (key) {
      if (!state.riders[key]) removeMarker(key);
    });
    renderRoster();
    updateLiveBadge();
  }
  function removeMarker(key) {
    if (state.markers[key]) { window.BikeApp.map.removeLayer(state.markers[key]); delete state.markers[key]; }
  }

  function renderRoster() {
    var list = $("liveRoster");
    if (!list) return;
    var me = window.BikeApp && window.BikeApp.getPos && window.BikeApp.getPos();
    var keys = Object.keys(state.riders).sort();
    if (!keys.length) { list.innerHTML = "<p class='muted' style='margin:6px 0'>" + T("liveNobody") + "</p>"; return; }
    list.innerHTML = "";
    keys.forEach(function (key) {
      var r = state.riders[key]; if (!r) return;
      var fresh = freshness(r.ts || 0);
      var dot = fresh === "live" ? "#2fae47" : (fresh === "idle" ? "#f4c430" : "#7c8a96");
      var isMe = key === state.riderKey;
      var dist = (me && typeof r.lat === "number" && !isMe) ?
        (" · " + distDisp(haversineMi(me, r)).toFixed(1) + " " + distUnit() + T("liveAway")) : "";
      var row = document.createElement("div");
      row.className = "poi-item";
      row.innerHTML =
        "<span><span class='live-dot' style='background:" + dot + "'></span>" +
        "<b style='color:" + colorFor(key) + "'>" + escapeHtml(r.name || key) + "</b>" + (isMe ? T("liveYou") : "") +
        "<br><span class='muted' style='font-size:11px'>" + (r.spd != null ? spdStr(r.spd) + " · " : "") + ago(r.ts || 0) + dist +
        (r.src && r.src.indexOf("owntracks") === 0 ? T("liveTracker") : "") + "</span></span>";
      var go = document.createElement("button");
      go.textContent = "📍"; go.title = T("centerOnMap");
      go.style.color = "#7fc0ff";
      go.addEventListener("click", function () {
        if (window.__setView) window.__setView("route");
        window.BikeApp.map.setView([r.lat, r.lng], 15);
      });
      row.appendChild(go);
      list.appendChild(row);
    });
  }

  function renderJoinUI() {
    var joinBox = $("liveJoinBox"), joinedBox = $("liveJoinedBox"), who = $("liveWho");
    if (!joinBox) return;
    joinBox.hidden = state.joined;
    joinedBox.hidden = !state.joined;
    if (who) who.textContent = state.name || "";
  }

  function updateLiveBadge() {
    var badge = $("liveTabBadge");
    if (!badge) return;
    var n = 0, now = Date.now();
    Object.keys(state.riders).forEach(function (k) { if (now - (state.riders[k].ts || 0) <= IDLE_MS) n++; });
    badge.textContent = n ? n : "";
    badge.style.display = n ? "inline-block" : "none";
  }

  function escapeHtml(s) { return (s + "").replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // ---------- copy share link ----------
  function copyShare() {
    var url = shareUrl();
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { setStatus(T("liveCopied"), "ok"); }, function () { prompt(T("liveCopyPrompt"), url); });
    else prompt(T("liveCopyPrompt"), url);
  }

  // ---------- OwnTracks seamless setup ----------
  var otCurrentUrl = "";
  function currentName() {
    var el = $("liveName");
    return (state.name || (el && el.value) || localStorage.getItem("biketrip_name") || "").trim();
  }
  function buildOtUrl() {
    var relay = (localStorage.getItem("biketrip_otrelay") || window.OT_RELAY_URL || "").trim();
    var name = currentName();
    if (!relay || !name) return null;
    var base;
    try { var u = new URL(relay); base = u.origin + u.pathname.replace(/\/+$/, ""); }
    catch (e) { base = relay.replace(/[?#].*$/, "").replace(/\/+$/, ""); }
    return base + "/?room=" + encodeURIComponent(state.room) + "&name=" + encodeURIComponent(name);
  }
  function renderOt() {
    var ready = $("otReady"), hint = $("otHint");
    if (!ready) return;
    var url = buildOtUrl();
    if (!url) {
      ready.hidden = true;
      if (hint) {
        hint.hidden = false;
        var needName = !currentName(), needRelay = !(localStorage.getItem("biketrip_otrelay") || window.OT_RELAY_URL || "").trim();
        hint.textContent = needName && needRelay ? T("otHintBoth")
          : needName ? T("otHintName")
          : T("otHintRelay");
      }
      return;
    }
    otCurrentUrl = url;
    if (hint) hint.hidden = true;
    ready.hidden = false;
    var urlBox = $("otUrl"); if (urlBox) urlBox.textContent = url;

    var config = {
      _type: "configuration", mode: 3, url: url,
      monitoring: 1, locatorInterval: 30, locatorDisplacement: 50,
      pubExtendedData: true, cmd: false
    };
    var inline = "owntracks:///config?inline=" + encodeURIComponent(btoa(JSON.stringify(config)));
    var qr = $("otQr");
    if (qr && window.QRCode) {
      qr.innerHTML = "";
      try { new QRCode(qr, { text: inline, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); }
      catch (e) { try { new QRCode(qr, { text: url, width: 200, height: 200 }); } catch (e2) { qr.innerHTML = "<p class='muted' style='color:#333'>QR unavailable — use the URL below.</p>"; } }
    }
  }
  function copyOt() {
    if (!otCurrentUrl) return;
    if (navigator.clipboard) navigator.clipboard.writeText(otCurrentUrl).then(function () { setStatus(T("otCopied"), "ok"); }, function () { prompt(T("otCopyPrompt"), otCurrentUrl); });
    else prompt(T("otCopyPrompt"), otCurrentUrl);
  }

  // ---------- init ----------
  function init() {
    state.room = getRoom();
    state.configured = isConfigured();

    var saved = localStorage.getItem("biketrip_name");
    if (saved && $("liveName")) $("liveName").value = saved;
    if ($("liveRoomCode")) $("liveRoomCode").textContent = state.room;

    if ($("btnLiveJoin")) $("btnLiveJoin").addEventListener("click", join);
    if ($("btnLiveLeave")) $("btnLiveLeave").addEventListener("click", leave);
    if ($("btnLiveShare")) $("btnLiveShare").addEventListener("click", copyShare);
    if ($("liveName")) {
      $("liveName").addEventListener("keydown", function (e) { if (e.key === "Enter") join(); });
      $("liveName").addEventListener("input", renderOt);
    }

    // OwnTracks background setup (works independently of Firebase config)
    if ($("otRelay")) {
      $("otRelay").value = localStorage.getItem("biketrip_otrelay") || window.OT_RELAY_URL || "";
      $("otRelay").addEventListener("input", function () {
        localStorage.setItem("biketrip_otrelay", $("otRelay").value.trim());
        renderOt();
      });
    }
    if ($("btnOtCopy")) $("btnOtCopy").addEventListener("click", copyOt);
    renderOt();

    renderJoinUI();

    if (!state.configured) {
      setStatus(T("liveNotConfig"), "warn");
      var roster = $("liveRoster");
      if (roster) roster.innerHTML = "<p class='muted'>" + T("liveNotConfigRoster") + "</p>";
      return;
    }
    initFirebase();
    // refresh freshness colors periodically even without new data
    state.timer = setInterval(function () { if (Object.keys(state.riders).length) renderAll(); }, 15000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
