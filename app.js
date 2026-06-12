/* Bike Trip 2026 — app logic */
(function () {
  "use strict";

  var MPS_TO_MPH = 2.2369362921;
  var GAUGE_MAX = 16;            // mph at far end of gauge
  var STOPPED_MPH = 0.6;         // below this = "stopped"
  var ARRIVE_M = 140;            // distance to count a waypoint as reached
  var BREADCRUMB_M = 40;         // min move before dropping a breadcrumb dot
  var POI_KEY = "biketrip_pois_v1";

  var TYPE_COLORS = {
    start: "#0b6e4f", finish: "#e31a1c", hotel: "#6a3d9a",
    lunch: "#ff7f00", poi: "#ffb300", town: "#3a8fd0"
  };
  var TYPE_ICON = {
    start: "🚩", finish: "🏁", hotel: "🛏️", lunch: "🍴", poi: "⭐", town: "•"
  };

  // ---------- tiny helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function toRad(d) { return d * Math.PI / 180; }
  function haversine(a, b) { // meters
    var R = 6371000;
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function metersToDistStr(m) {
    var mi = m / 1609.34;
    if (mi < 0.1) return Math.round(m / 0.3048) + " ft";
    return mi.toFixed(1) + " mi";
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // ---------- state ----------
  var state = {
    tracking: false,
    watchId: null,
    wakeLock: null,
    follow: true,
    pos: null,             // {lat,lng}
    lastFix: null,         // {lat,lng,t}
    speed: 0,              // smoothed mph
    targetIdx: null,
    samples: [],           // {t, mph} for rolling avg
    maxSpeed: 0,
    movingMeters: 0,
    movingMs: 0,
    lastCrumb: null,
    pois: []
  };

  var W = TRIP.waypoints;

  // ---------- map ----------
  var map = L.map("map", { zoomControl: true, attributionControl: true })
    .setView([39.6, -78.4], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  var allLatLngs = [];
  // per-day polylines
  TRIP.days.forEach(function (d) {
    var pts = [];
    // anchor to previous day's last waypoint so the line is continuous
    var prev = W.filter(function (w) { return w.day === d.day - 1; });
    if (prev.length) pts.push([prev[prev.length - 1].lat, prev[prev.length - 1].lng]);
    W.filter(function (w) { return w.day === d.day; }).forEach(function (w) {
      pts.push([w.lat, w.lng]);
    });
    if (pts.length > 1) {
      L.polyline(pts, { color: d.color, weight: 4, opacity: 0.85 }).addTo(map);
    }
  });

  // waypoint markers
  W.forEach(function (w, i) {
    allLatLngs.push([w.lat, w.lng]);
    var color = TYPE_COLORS[w.type] || "#3a8fd0";
    var r = (w.type === "town") ? 5 : 7;
    var m = L.circleMarker([w.lat, w.lng], {
      radius: r, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1
    }).addTo(map);
    var html = "<b>" + (TYPE_ICON[w.type] || "") + " " + w.name + "</b><br>" +
      "<span style='color:#555'>Day " + w.day + "</span><br>" + w.desc +
      "<br><span class='popup-btn' data-target='" + i + "'>Set as next stop →</span>";
    m.bindPopup(html);
  });

  map.on("popupopen", function (e) {
    var btn = e.popup._contentNode.querySelector(".popup-btn");
    if (btn) btn.addEventListener("click", function () {
      state.targetIdx = parseInt(btn.getAttribute("data-target"), 10);
      state.follow = false;
      updateNext();
      map.closePopup();
    });
  });

  // tap map to drop a pin
  map.on("click", function (e) {
    if (e.originalEvent && e.originalEvent._fromMarker) return;
    var name = prompt("Name this interest point:", "Pin");
    if (name === null) return;
    addPoi({ id: Date.now(), name: name || "Pin", lat: e.latlng.lat, lng: e.latlng.lng });
  });

  map.on("dragstart", function () { state.follow = false; });

  var routeBounds = L.latLngBounds(allLatLngs);
  map.fitBounds(routeBounds, { padding: [30, 30] });

  // me marker + track
  var meMarker = null, accCircle = null;
  var trackLine = L.polyline([], { color: "#2b82d4", weight: 4, opacity: 0.9, dashArray: "1 6", lineCap: "round" }).addTo(map);
  var trackPts = [];
  var crumbLayer = L.layerGroup().addTo(map);
  var poiLayer = L.layerGroup().addTo(map);

  function setMe(lat, lng, acc) {
    if (!meMarker) {
      meMarker = L.marker([lat, lng], {
        icon: L.divIcon({ className: "", html: "<div class='me-dot'></div>", iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: 1000
      }).addTo(map);
      accCircle = L.circle([lat, lng], { radius: acc || 0, color: "#2b82d4", weight: 1, opacity: 0.4, fillOpacity: 0.08 }).addTo(map);
    } else {
      meMarker.setLatLng([lat, lng]);
      accCircle.setLatLng([lat, lng]).setRadius(acc || 0);
    }
  }

  // ---------- GPS ----------
  function startGps() {
    if (!navigator.geolocation) { alert("This device has no GPS / geolocation support."); return; }
    state.tracking = true;
    state.follow = true;
    state.lastFix = null;
    setGpsButtons();
    requestWakeLock();
    state.watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 1000, timeout: 20000
    });
  }
  function stopGps() {
    state.tracking = false;
    if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
    releaseWakeLock();
    setGpsButtons();
    setSpeed(0);
  }
  function toggleGps() { state.tracking ? stopGps() : startGps(); }

  function onErr(err) {
    var msg = "GPS error: " + err.message;
    if (err.code === 1) msg = "Location permission denied. Enable it in your browser settings and reload.";
    $("speedBanner").innerHTML = "⚠️ " + msg;
    $("speedBanner").style.display = "block";
  }

  function onPos(p) {
    var lat = p.coords.latitude, lng = p.coords.longitude, t = p.timestamp;
    var cur = { lat: lat, lng: lng };
    state.pos = cur;

    // speed: prefer device-reported, else compute from movement
    var mph = null;
    if (p.coords.speed != null && !isNaN(p.coords.speed) && p.coords.speed >= 0) {
      mph = p.coords.speed * MPS_TO_MPH;
    } else if (state.lastFix) {
      var d = haversine(state.lastFix, cur);
      var dt = (t - state.lastFix.t) / 1000;
      if (dt > 0.3) mph = (d / dt) * MPS_TO_MPH;
    }
    if (mph == null) mph = 0;

    // accumulate distance / moving time
    if (state.lastFix) {
      var dist = haversine(state.lastFix, cur);
      var dts = (t - state.lastFix.t) / 1000;
      if (dist < 200) { // ignore GPS jumps
        if (mph > 1.5) { state.movingMeters += dist; state.movingMs += dts * 1000; }
      }
    }
    state.lastFix = { lat: lat, lng: lng, t: t };

    setSpeed(mph);
    setMe(lat, lng, p.coords.accuracy);
    pushCrumb(cur);
    updateNext();

    if (state.follow) map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });

    if (window.LiveTracker && window.LiveTracker.publish) window.LiveTracker.publish(lat, lng, state.speed);
  }

  function pushCrumb(cur) {
    trackPts.push([cur.lat, cur.lng]);
    trackLine.setLatLngs(trackPts);
    if (!state.lastCrumb || haversine(state.lastCrumb, cur) >= BREADCRUMB_M) {
      L.circleMarker([cur.lat, cur.lng], {
        radius: 3, color: "#2b82d4", weight: 1, fillColor: "#7fc0ff", fillOpacity: 0.9
      }).addTo(crumbLayer);
      state.lastCrumb = cur;
    }
  }

  // ---------- speed smoothing + stats ----------
  function setSpeed(raw) {
    // light exponential smoothing for a steadier gauge
    if (state.speed === 0 && raw > 0) state.speed = raw;
    else state.speed = state.speed * 0.55 + raw * 0.45;
    var mph = state.speed < 0.05 ? 0 : state.speed;

    if (state.tracking) {
      var now = Date.now();
      state.samples.push({ t: now, mph: mph });
      state.samples = state.samples.filter(function (s) { return now - s.t <= 30000; });
      if (mph > state.maxSpeed) state.maxSpeed = mph;
    }
    drawGaugeNeedle(mph);
    updateReadout(mph);
  }

  function rollingAvg() {
    if (!state.samples.length) return 0;
    var sum = 0;
    state.samples.forEach(function (s) { sum += s.mph; });
    return sum / state.samples.length;
  }
  function sessionAvg() {
    if (state.movingMs < 3000) return 0;
    return (state.movingMeters / (state.movingMs / 1000)) * MPS_TO_MPH;
  }

  function zoneFor(mph) {
    if (mph < STOPPED_MPH) return { name: "STOPPED", color: "#2b82d4" };
    if (mph < 8) return { name: "TOO SLOW", color: "#e63946" };
    if (mph < 10) return { name: "ALMOST THERE", color: "#f4c430" };
    if (mph < 12) return { name: "ON TARGET ✅", color: "#2fae47" };
    return { name: "FLYING ✅✅", color: "#0b8f2e" };
  }

  function updateReadout(mph) {
    var z = zoneFor(mph);
    var txt = mph < STOPPED_MPH ? "0" : mph.toFixed(1);
    $("ovSpeed").textContent = txt;
    $("chipSpeed").querySelector(".value").style.color = z.color;
    var ro = $("speedReadout");
    ro.innerHTML = txt + "<small>mph</small>";
    ro.style.color = z.color;
    var zl = $("zoneLabel");
    zl.textContent = z.name; zl.style.color = z.color;

    $("stAvg").textContent = state.samples.length ? rollingAvg().toFixed(1) : "--";
    $("stSession").textContent = sessionAvg() ? sessionAvg().toFixed(1) : "--";
    $("stMax").textContent = state.maxSpeed ? state.maxSpeed.toFixed(1) : "--";

    var v = $("paceVerdict");
    if (!state.tracking) { v.textContent = "Start GPS and ride to check your pace."; v.style.color = "var(--muted)"; v.style.background = "var(--panel-2)"; return; }
    var ra = rollingAvg();
    if (ra < STOPPED_MPH) { v.textContent = "⏸ Stopped"; v.style.color = "#bcd6f5"; }
    else if (ra >= 10) { v.innerHTML = "✅ On pace! Holding " + ra.toFixed(1) + " mph"; v.style.color = "#b6f0c6"; }
    else if (ra >= 8) { v.innerHTML = "🟡 Close — " + ra.toFixed(1) + " mph, push a bit"; v.style.color = "#ffe79a"; }
    else { v.innerHTML = "🔴 Under target — " + ra.toFixed(1) + " mph"; v.style.color = "#ffc1c7"; }
  }

  // ---------- gauge (SVG) ----------
  var CX = 150, CY = 158, R = 120;
  function pointFor(speed) {
    var f = Math.max(0, Math.min(1, speed / GAUGE_MAX));
    var ang = (180 - 180 * f) * Math.PI / 180;
    return { x: CX + R * Math.cos(ang), y: CY - R * Math.sin(ang) };
  }
  function arcPath(s0, s1, rr) {
    var a = pointFor(s0), b = pointFor(s1);
    var p0 = { x: CX + (rr) * Math.cos((180 - 180 * (s0 / GAUGE_MAX)) * Math.PI / 180), y: CY - rr * Math.sin((180 - 180 * (s0 / GAUGE_MAX)) * Math.PI / 180) };
    var p1 = { x: CX + (rr) * Math.cos((180 - 180 * (s1 / GAUGE_MAX)) * Math.PI / 180), y: CY - rr * Math.sin((180 - 180 * (s1 / GAUGE_MAX)) * Math.PI / 180) };
    return "M " + p0.x.toFixed(1) + " " + p0.y.toFixed(1) +
      " A " + rr + " " + rr + " 0 0 1 " + p1.x.toFixed(1) + " " + p1.y.toFixed(1);
  }
  function buildGauge() {
    var g = $("gauge");
    var zones = [
      [0, 8, "#e63946"], [8, 10, "#f4c430"], [10, 12, "#2fae47"], [12, GAUGE_MAX, "#0b8f2e"]
    ];
    var s = "";
    // track
    s += "<path d='" + arcPath(0, GAUGE_MAX, R) + "' fill='none' stroke='#2c3a47' stroke-width='22' stroke-linecap='round'/>";
    zones.forEach(function (z) {
      s += "<path d='" + arcPath(z[0], z[1], R) + "' fill='none' stroke='" + z[2] + "' stroke-width='18'/>";
    });
    // ticks + labels
    [0, 8, 10, 12, 16].forEach(function (v) {
      var pIn = pointFor(v), pOut = pointFor(v);
      var aIn = { x: CX + (R - 14) * Math.cos((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180), y: CY - (R - 14) * Math.sin((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180) };
      var aOut = { x: CX + (R + 9) * Math.cos((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180), y: CY - (R + 9) * Math.sin((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180) };
      s += "<line x1='" + aIn.x.toFixed(1) + "' y1='" + aIn.y.toFixed(1) + "' x2='" + aOut.x.toFixed(1) + "' y2='" + aOut.y.toFixed(1) + "' stroke='#cdd6dd' stroke-width='2'/>";
      var lp = { x: CX + (R + 22) * Math.cos((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180), y: CY - (R + 22) * Math.sin((180 - 180 * (v / GAUGE_MAX)) * Math.PI / 180) };
      s += "<text x='" + lp.x.toFixed(1) + "' y='" + (lp.y + 4).toFixed(1) + "' fill='#9fb0bd' font-size='12' text-anchor='middle'>" + v + "</text>";
    });
    // needle group (updated later)
    s += "<g id='needle'></g>";
    s += "<circle cx='" + CX + "' cy='" + CY + "' r='9' fill='#e7eef3'/>";
    g.innerHTML = s;
  }
  function drawGaugeNeedle(mph) {
    var n = document.getElementById("needle");
    if (!n) return;
    var sp = Math.max(0, Math.min(GAUGE_MAX, mph));
    var tip = { x: CX + (R - 22) * Math.cos((180 - 180 * (sp / GAUGE_MAX)) * Math.PI / 180), y: CY - (R - 22) * Math.sin((180 - 180 * (sp / GAUGE_MAX)) * Math.PI / 180) };
    var z = zoneFor(mph);
    n.innerHTML = "<line x1='" + CX + "' y1='" + CY + "' x2='" + tip.x.toFixed(1) + "' y2='" + tip.y.toFixed(1) +
      "' stroke='" + z.color + "' stroke-width='5' stroke-linecap='round'/>";
  }

  // ---------- next stop ----------
  function nearestIdx() {
    if (!state.pos) return 0;
    var best = 0, bd = Infinity;
    W.forEach(function (w, i) {
      var d = haversine(state.pos, w);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function updateNext() {
    if (!state.pos) return;
    if (state.targetIdx == null) state.targetIdx = nearestIdx();
    var tgt = W[state.targetIdx];
    var d = haversine(state.pos, tgt);
    if (d < ARRIVE_M && state.targetIdx < W.length - 1) {
      state.targetIdx++;
      tgt = W[state.targetIdx];
      d = haversine(state.pos, tgt);
    }
    $("ovNextName").textContent = tgt.name;
    $("ovNextDist").textContent = metersToDistStr(d);
  }

  // ---------- POIs ----------
  function loadPois() {
    try { state.pois = JSON.parse(localStorage.getItem(POI_KEY)) || []; } catch (e) { state.pois = []; }
  }
  function savePois() { try { localStorage.setItem(POI_KEY, JSON.stringify(state.pois)); } catch (e) {} }
  function addPoi(p) { state.pois.push(p); savePois(); renderPois(); }
  function removePoi(id) { state.pois = state.pois.filter(function (x) { return x.id !== id; }); savePois(); renderPois(); }
  function renderPois() {
    poiLayer.clearLayers();
    state.pois.forEach(function (p) {
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: "", html: "<div style='font-size:22px;filter:drop-shadow(0 1px 2px #000)'>📌</div>", iconSize: [22, 22], iconAnchor: [11, 20] })
      }).addTo(poiLayer).bindPopup("<b>📌 " + p.name + "</b>");
    });
    var list = $("poiList");
    if (!state.pois.length) { list.innerHTML = "<p class='muted' style='margin:6px 0'>No pins yet.</p>"; $("btnClearPois").hidden = true; return; }
    $("btnClearPois").hidden = false;
    list.innerHTML = "";
    state.pois.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "poi-item";
      var span = document.createElement("span");
      span.textContent = "📌 " + p.name;
      span.style.cursor = "pointer";
      span.addEventListener("click", function () { setView("route"); map.setView([p.lat, p.lng], 14); });
      var del = document.createElement("button");
      del.textContent = "🗑";
      del.addEventListener("click", function () { removePoi(p.id); });
      row.appendChild(span); row.appendChild(del);
      list.appendChild(row);
    });
  }

  function markHere() {
    if (!state.pos) { alert("Start GPS first, then tap 📍 to mark where you are."); return; }
    var d = new Date();
    var def = "Spot " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    var name = prompt("Name this spot:", def);
    if (name === null) return;
    addPoi({ id: Date.now(), name: name || def, lat: state.pos.lat, lng: state.pos.lng });
  }

  // ---------- buttons / wake lock ----------
  function setGpsButtons() {
    var b1 = $("btnGps"), b2 = $("btnGps2");
    if (state.tracking) {
      b1.textContent = "⏹"; b1.classList.add("live"); b1.classList.remove("primary");
      b2.textContent = "Stop GPS"; b2.classList.add("secondary");
    } else {
      b1.textContent = "▶"; b1.classList.remove("live"); b1.classList.add("primary");
      b2.textContent = "Start GPS"; b2.classList.remove("secondary");
    }
  }
  function requestWakeLock() {
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then(function (wl) { state.wakeLock = wl; }).catch(function () {});
    }
  }
  function releaseWakeLock() { if (state.wakeLock) { state.wakeLock.release().catch(function () {}); state.wakeLock = null; } }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && state.tracking) requestWakeLock();
  });

  // ---------- views ----------
  function setView(name) {
    ["route", "speed", "live", "plan"].forEach(function (v) {
      $("view-" + v).hidden = (v !== name);
    });
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    if (name === "route") setTimeout(function () { map.invalidateSize(); if (state.follow && state.pos) map.setView([state.pos.lat, state.pos.lng]); }, 60);
  }

  // ---------- date awareness ----------
  function dayMidnight(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function setupDateState() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = dayMidnight(TRIP.startDate), end = dayMidnight(TRIP.endDate);
    var pill = $("statusPill"), planBanner = $("planBanner"), speedBanner = $("speedBanner");
    var riding = null;
    TRIP.days.forEach(function (d) { if (dayMidnight(d.date).getTime() === today.getTime()) riding = d; });

    if (riding) {
      pill.textContent = "Day " + riding.day + " · today";
      planBanner.className = "banner live";
      planBanner.innerHTML = "🚴 <b>Today is Day " + riding.day + ":</b> " + riding.from + " → " + riding.to + " (" + riding.miles + " mi). Tap <b>Start GPS</b> on the Route tab to track.";
      // target the start of today's segment
      var first = W.findIndex(function (w) { return w.day === riding.day; });
      var prevEnd = W.map(function (w, i) { return w.day === riding.day - 1 ? i : -1; }).filter(function (i) { return i >= 0; });
      state.targetIdx = prevEnd.length ? prevEnd[prevEnd.length - 1] + 1 : (first >= 0 ? first : null);
      setView("route");
    } else if (today.getTime() === end.getTime()) {
      pill.textContent = "Travel home day 🚆";
      planBanner.className = "banner";
      planBanner.innerHTML = "🚆 <b>Travel day:</b> train home, DC → Connellsville.";
    } else if (today < start) {
      var days = Math.round((start - today) / 86400000);
      pill.textContent = "Starts in " + days + " day" + (days === 1 ? "" : "s");
      planBanner.className = "banner";
      planBanner.innerHTML = "📅 Trip starts <b>" + start.toDateString() + "</b> — " + days + " day" + (days === 1 ? "" : "s") + " to go. Use the <b>Speed</b> tab to train, or browse the route below. <br><br>It's not a trip day, so the app is in <b>browse mode</b> — drop pins, scout stops, and check your pace.";
      speedBanner.innerHTML = "🏋️ <b>Training mode.</b> Tap <b>Start GPS</b> and ride — goal is a steady <b>10 mph</b>. Watch the gauge turn green!";
      setView("plan");
    } else {
      pill.textContent = "Trip complete 🎉";
      planBanner.className = "banner live";
      planBanner.innerHTML = "🎉 <b>You did it</b> — Pittsburgh to DC! Browse the route and your pins below.";
    }
  }

  // ---------- plan tab content ----------
  function buildPlan() {
    var pills = $("dayPills");
    TRIP.days.forEach(function (d) {
      var b = document.createElement("div");
      b.className = "day-pill";
      b.innerHTML = "<span class='dot' style='background:" + d.color + "'></span>Day " + d.day;
      b.title = d.from + " → " + d.to;
      b.addEventListener("click", function () {
        setView("route");
        var pts = W.filter(function (w) { return w.day === d.day; }).map(function (w) { return [w.lat, w.lng]; });
        state.follow = false;
        setTimeout(function () { map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }); }, 60);
      });
      pills.appendChild(b);
    });

    var dc = $("dayCards");
    TRIP.days.forEach(function (d) {
      var stops = W.filter(function (w) { return w.day === d.day; });
      var li = stops.map(function (w) { return "<li>" + (TYPE_ICON[w.type] || "•") + " " + w.name + "</li>"; }).join("");
      var card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        "<h2><span style='color:" + d.color + "'>●</span> Day " + d.day + " — " + d.from + " → " + d.to + "</h2>" +
        "<p class='muted'>" + new Date(dayMidnight(d.date)).toDateString() + " · <b style='color:#fff'>" + d.miles + " mi</b></p>" +
        "<ul style='margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.7'>" + li + "</ul>";
      dc.appendChild(card);
    });
  }

  // ---------- wire up ----------
  $("btnGps").addEventListener("click", toggleGps);
  $("btnGps2").addEventListener("click", toggleGps);
  $("btnMark").addEventListener("click", markHere);
  $("btnFit").addEventListener("click", function () {
    if (state.tracking && state.pos) { state.follow = true; map.setView([state.pos.lat, state.pos.lng], 15); }
    else map.fitBounds(routeBounds, { padding: [30, 30] });
  });
  $("btnResetStats").addEventListener("click", function () {
    state.samples = []; state.maxSpeed = 0; state.movingMeters = 0; state.movingMs = 0;
    trackPts = []; trackLine.setLatLngs([]); crumbLayer.clearLayers(); state.lastCrumb = null;
    updateReadout(state.speed);
  });
  $("btnClearPois").addEventListener("click", function () {
    if (confirm("Delete all your pins on this device?")) { state.pois = []; savePois(); renderPois(); }
  });
  document.querySelectorAll("#tabs button").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
  });

  // ---------- expose a small API for the live-tracking module ----------
  window.BikeApp = {
    map: map,
    startGps: startGps,
    stopGps: stopGps,
    isTracking: function () { return state.tracking; },
    getPos: function () { return state.pos; }
  };
  window.__setView = setView;

  // ---------- init ----------
  buildGauge();
  drawGaugeNeedle(0);
  loadPois();
  renderPois();
  buildPlan();
  setGpsButtons();
  setupDateState();

  // optional deep-link: index.html#speed / #plan / #route
  var h = (location.hash || "").replace("#", "");
  if (h === "speed" || h === "plan" || h === "route" || h === "live") setView(h);
})();
