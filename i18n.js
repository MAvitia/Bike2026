/* Bike Trip 2026 — language + units.
 * EN = English + miles/mph/ft.  ES = Spanish + km / km/h / m.
 * The 🇲🇽/🇺🇸 header button toggles and reloads the page.
 */
var LANG = (function () {
  try { return localStorage.getItem("biketrip_lang") || "en"; } catch (e) { return "en"; }
})();
var METRIC = (LANG === "es");

/* ---- unit helpers (app keeps mph / miles internally) ---- */
var KM_PER_MI = 1.609344;
function speedDisp(mph) { return METRIC ? mph * KM_PER_MI : mph; }
function speedUnit() { return METRIC ? "km/h" : "mph"; }
function distDisp(mi) { return METRIC ? mi * KM_PER_MI : mi; }
function distUnit() { return METRIC ? "km" : "mi"; }
function metersToDistStr(m) {
  if (METRIC) {
    if (m < 1000) return Math.round(m) + " m";
    return (m / 1000).toFixed(1) + " km";
  }
  var mi = m / 1609.34;
  if (mi < 0.1) return Math.round(m / 0.3048) + " ft";
  return mi.toFixed(1) + " mi";
}

var I18N = {
en: {
  // header / tabs
  tabRoute: "Route", tabSpeed: "Speed", tabLive: "Live", tabPlan: "Plan",
  // map overlay
  lblSpeed: "Speed", lblNextStop: "Next stop", startGpsTrack: "Start GPS to track",
  fAll: "All", fVehicle: "🚗 Vehicle", fFood: "🍴 Food", fHotels: "🛏️ Hotels", fSights: "⭐ Sights", fTowns: "🏘️ Towns",
  // speed view
  speedBanner: "Tap <b>Start GPS</b> below to check your pace. Goal: hold <b>10 mph</b>.",
  speedCheck: "Speed Check", stAvg: "Avg (30s)", stSession: "Trip Avg", stMax: "Max",
  paceIdle: "Start GPS and ride to check your pace.",
  btnStartGps: "Start GPS", btnStopGps: "Stop GPS", btnReset: "Reset",
  zoneGuide: "Zone guide",
  zStopped: "Stopped", zSlowLine: "Under 8 mph — too slow", zAlmostLine: "8–10 mph — almost there",
  zTargetLine: "10–12 mph — on target ✅", zFlyLine: "12+ mph — flying! ✅✅",
  // zones / verdicts
  zSTOP: "STOPPED", zSLOW: "TOO SLOW", zALMOST: "ALMOST THERE", zON: "ON TARGET ✅", zFLY: "FLYING ✅✅",
  vStopped: "⏸ Stopped", vOnPace: "✅ On pace! Holding {s}", vClose: "🟡 Close — {s}, push a bit", vUnder: "🔴 Under target — {s}",
  // plan view
  theRoute: "The Route",
  routeIntro: "Tap a day to zoom the map to it. ~{dist} over 5 riding days, then the train home.",
  sightsTitle: "⭐ Sights & photo stops",
  sightsIntro: "<span style='color:#ffb300'>★★★</span> don't miss · <span style='color:#ffb300'>★★</span> worth the stop · <span style='color:#ffb300'>★</span> only if you're fresh. Tap a sight to see it on the map — markers labeled <i>(off trail)</i> are short detours.",
  vehTitle: "🚗 Support vehicle stops",
  vehIntro: "Meet points roughly every 10 miles, each at a spot where a public road or parking area touches the trail. Tap a stop to see it on the map; <b>Map</b> opens the exact coordinates in Google Maps, <b>Go</b> starts navigation. On the Route tab, use the filter bar to show only <b>🚗 Vehicle</b> (+ Hotels) — that's driver mode: the next meet point ahead of the riders pulses on the map and shows in the Next-stop chip with trail miles to go.",
  pinsTitle: "Your Pins",
  pinsIntro: "Tap anywhere on the map to drop an interest point, or use 📍 to mark your GPS spot. Saved on this device.",
  noPins: "No pins yet.", clearPins: "Clear all my pins", confirmClearPins: "Delete all your pins on this device?",
  aboutTitle: "About this app",
  aboutText: "Live position, speed, and distances come from your phone's GPS — keep the screen on while riding. The drawn route follows the actual GAP and C&O Canal Towpath (geometry from OpenStreetMap). Map tiles need a data connection.",
  day: "Day", today: "today", offTrail: "off trail",
  star3: "don't miss", star2: "worth the stop", star1: "only if you're fresh",
  // map popups / driver mode
  setNextStop: "Set as next stop →", openMaps: "📍 Google Maps", navigate: "🧭 Navigate",
  vehStop: "Vehicle stop", mile: "mile", tripMile: "Trip mile", parking: "parking", roadAccess: "road access",
  parkingArea: "Parking area", roadCrossing: "Road crossing",
  trailDistAhead: "trail", finishLbl: "🏁 Day {d} finish", shortDetour: "short detour off trail",
  namePin: "Name this interest point:", nameSpot: "Name this spot:", pin: "Pin", spot: "Spot",
  lnkMap: "Map", lnkGo: "Go",
  needGpsPin: "Start GPS first, then tap 📍 to mark where you are.", noGps: "This device has no GPS / geolocation support.",
  gpsDenied: "Location permission denied. Enable it in your browser settings and reload.", gpsError: "GPS error: ",
  // date banners
  pillDayToday: "Day {d} · today", pillTravelHome: "Travel home day 🚆", pillStartsIn: "Starts in {n} day{s}", pillDone: "Trip complete 🎉",
  bannerToday: "🚴 <b>Today is Day {d}:</b> {from} → {to} ({mi}). Tap <b>Start GPS</b> on the Route tab to track.",
  bannerTravel: "🚆 <b>Travel day:</b> train home, DC → Connellsville.",
  bannerBefore: "📅 Trip starts <b>{date}</b> — {n} day{s} to go. Use the <b>Speed</b> tab to train, or browse the route below. <br><br>It's not a trip day, so the app is in <b>browse mode</b> — drop pins, scout stops, and check your pace.",
  bannerTrain: "🏋️ <b>Training mode.</b> Tap <b>Start GPS</b> and ride — goal is a steady <b>10 mph</b>. Watch the gauge turn green!",
  bannerDone: "🎉 <b>You did it</b> — Pittsburgh to DC! Browse the route and your pins below.",
  // live view
  liveTitle: "👥 Live Group Map",
  liveIntro: "Everyone who opens this link and enters a name shows up live on the map. Your phone shares its location while this page is open.",
  liveNamePh: "Your name (e.g. Manuel)", liveJoin: "Share my live location",
  liveJoinedA: "✅ Sharing live as ", liveJoinedB: ". Keep this page open while riding.",
  liveLeave: "Stop sharing", liveWho: "Who's on the map",
  liveInvite: "Invite your group",
  liveInviteText: "Share this link — it contains your private trip code. Treat it like a passcode; only people with the link can see locations.",
  liveTripCode: "Trip code:", liveCopy: "Copy share link",
  liveNobody: "No one is sharing yet. Be the first — enter your name and join.",
  liveYou: " (you)", liveAway: " away", liveTracker: " · tracker", liveViaTracker: "via tracker",
  liveCopied: "Share link copied! Send it to your group.", liveCopyPrompt: "Copy this link:",
  liveSharingAs: "You're sharing live as {n}. Keep this page open while riding.",
  liveStopped: "You stopped sharing. Others stay visible.",
  liveNotConfig: "Live group tracking isn't set up yet. Follow SETUP.md to add your free Firebase config, then this turns on.",
  liveNotConfigRoster: "Once Firebase is configured, everyone who opens the shared link and enters a name appears here live.",
  liveSetup: "Live tracking isn't configured yet — see SETUP.md.",
  agoS: "s ago", agoM: "m ago", agoH: "h ago", centerOnMap: "Center on map",
  otTitle: "Track in the background (optional)",
  otIntro: "A web page only shares location while it's open. To keep transmitting with the screen off, install the free <b>OwnTracks</b> app — this section builds its setup for you.",
  otStep1: "Deploy the relay once (free Cloudflare Worker) — see <b>SETUP.md</b>. Paste its URL below.",
  otStep2: "Enter your name above (same name = one marker).",
  otStep3: "Install <b>OwnTracks</b>, open it → <b>Settings → Configuration</b>, and either scan the QR or paste the URL.",
  otRelayLbl: "Your relay Worker URL",
  otScan: "Scan this inside the OwnTracks app (Settings → Configuration → scan):",
  otOrUrl: "…or set <b>Mode = HTTP</b> in OwnTracks and paste this <b>URL</b>:",
  otCopyBtn: "Copy OwnTracks URL", otCopied: "OwnTracks URL copied.", otCopyPrompt: "Copy this URL:",
  otHintBoth: "Enter your name (above) and your relay URL to generate your OwnTracks setup.",
  otHintName: "Enter your name above to generate your OwnTracks setup.",
  otHintRelay: "Paste your relay Worker URL above to generate your OwnTracks setup.",
  // photos
  photosTitle: "📷 Trip Photos",
  photosIntro: "Add your trip photos to our shared Google Drive album — tap below to open it, then upload straight from your phone's camera roll.",
  photoOpenDrive: "📷 Open the shared album ↗"
},
es: {
  tabRoute: "Ruta", tabSpeed: "Velocidad", tabLive: "En vivo", tabPlan: "Plan",
  lblSpeed: "Velocidad", lblNextStop: "Próxima parada", startGpsTrack: "Inicia el GPS para rastrear",
  fAll: "Todo", fVehicle: "🚗 Vehículo", fFood: "🍴 Comida", fHotels: "🛏️ Hoteles", fSights: "⭐ Lugares", fTowns: "🏘️ Pueblos",
  speedBanner: "Toca <b>Iniciar GPS</b> abajo para medir tu ritmo. Meta: mantener <b>16 km/h</b>.",
  speedCheck: "Control de velocidad", stAvg: "Prom (30s)", stSession: "Prom viaje", stMax: "Máx",
  paceIdle: "Inicia el GPS y pedalea para medir tu ritmo.",
  btnStartGps: "Iniciar GPS", btnStopGps: "Detener GPS", btnReset: "Reiniciar",
  zoneGuide: "Guía de zonas",
  zStopped: "Detenido", zSlowLine: "Menos de 13 km/h — muy lento", zAlmostLine: "13–16 km/h — casi",
  zTargetLine: "16–19 km/h — en meta ✅", zFlyLine: "19+ km/h — ¡volando! ✅✅",
  zSTOP: "DETENIDO", zSLOW: "MUY LENTO", zALMOST: "YA CASI", zON: "EN META ✅", zFLY: "VOLANDO ✅✅",
  vStopped: "⏸ Detenido", vOnPace: "✅ ¡Buen ritmo! Manteniendo {s}", vClose: "🟡 Cerca — {s}, un poco más", vUnder: "🔴 Bajo la meta — {s}",
  theRoute: "La Ruta",
  routeIntro: "Toca un día para acercar el mapa. ~{dist} en 5 días de pedaleo, y el tren de regreso.",
  sightsTitle: "⭐ Lugares y fotos",
  sightsIntro: "<span style='color:#ffb300'>★★★</span> imperdible · <span style='color:#ffb300'>★★</span> vale la pena · <span style='color:#ffb300'>★</span> solo si vas fresco. Toca un lugar para verlo en el mapa — los marcados <i>(fuera del sendero)</i> son desvíos cortos.",
  vehTitle: "🚗 Paradas del vehículo de apoyo",
  vehIntro: "Puntos de encuentro cada ~16 km, donde un camino público o estacionamiento toca el sendero. Toca una parada para verla en el mapa; <b>Mapa</b> abre las coordenadas exactas en Google Maps, <b>Ir</b> inicia la navegación. En la pestaña Ruta, usa los filtros para mostrar solo <b>🚗 Vehículo</b> (+ Hoteles) — ese es el modo conductor: el siguiente punto de encuentro parpadea en el mapa y aparece en la tarjeta de Próxima parada con los km restantes.",
  pinsTitle: "Tus Pines",
  pinsIntro: "Toca cualquier punto del mapa para marcar un lugar de interés, o usa 📍 para marcar tu posición GPS. Se guarda en este dispositivo.",
  noPins: "Aún no hay pines.", clearPins: "Borrar todos mis pines", confirmClearPins: "¿Borrar todos tus pines en este dispositivo?",
  aboutTitle: "Acerca de esta app",
  aboutText: "La posición, velocidad y distancias vienen del GPS de tu teléfono — mantén la pantalla encendida mientras pedaleas. La ruta dibujada sigue el trazo real de los senderos GAP y C&O (geometría de OpenStreetMap). Los mapas requieren conexión de datos.",
  day: "Día", today: "hoy", offTrail: "fuera del sendero",
  star3: "imperdible", star2: "vale la pena", star1: "solo si vas fresco",
  setNextStop: "Fijar como próxima parada →", openMaps: "📍 Google Maps", navigate: "🧭 Navegar",
  vehStop: "Parada de vehículo", mile: "km", tripMile: "Km del viaje", parking: "estacionamiento", roadAccess: "acceso por camino",
  parkingArea: "Estacionamiento", roadCrossing: "Cruce de camino",
  trailDistAhead: "de sendero", finishLbl: "🏁 Meta del Día {d}", shortDetour: "desvío corto fuera del sendero",
  namePin: "Nombra este punto de interés:", nameSpot: "Nombra este lugar:", pin: "Pin", spot: "Punto",
  lnkMap: "Mapa", lnkGo: "Ir",
  needGpsPin: "Primero inicia el GPS y luego toca 📍 para marcar dónde estás.", noGps: "Este dispositivo no tiene GPS / geolocalización.",
  gpsDenied: "Permiso de ubicación denegado. Actívalo en la configuración del navegador y recarga.", gpsError: "Error de GPS: ",
  pillDayToday: "Día {d} · hoy", pillTravelHome: "Día de regreso 🚆", pillStartsIn: "Empieza en {n} día{s}", pillDone: "¡Viaje completado! 🎉",
  bannerToday: "🚴 <b>Hoy es el Día {d}:</b> {from} → {to} ({mi}). Toca <b>Iniciar GPS</b> en la pestaña Ruta para rastrear.",
  bannerTravel: "🚆 <b>Día de traslado:</b> tren de regreso, DC → Connellsville.",
  bannerBefore: "📅 El viaje empieza el <b>{date}</b> — faltan {n} día{s}. Usa la pestaña <b>Velocidad</b> para entrenar, o explora la ruta abajo. <br><br>No es día de viaje, así que la app está en <b>modo exploración</b> — marca pines, revisa paradas y mide tu ritmo.",
  bannerTrain: "🏋️ <b>Modo entrenamiento.</b> Toca <b>Iniciar GPS</b> y pedalea — la meta es mantener <b>16 km/h</b>. ¡Mira el medidor ponerse verde!",
  bannerDone: "🎉 <b>¡Lo lograron!</b> — ¡De Pittsburgh a DC! Explora la ruta y tus pines abajo.",
  liveTitle: "👥 Mapa del grupo en vivo",
  liveIntro: "Quien abra este enlace y escriba su nombre aparece en vivo en el mapa. Tu teléfono comparte su ubicación mientras esta página esté abierta.",
  liveNamePh: "Tu nombre (ej. Manuel)", liveJoin: "Compartir mi ubicación en vivo",
  liveJoinedA: "✅ Compartiendo en vivo como ", liveJoinedB: ". Mantén esta página abierta mientras pedaleas.",
  liveLeave: "Dejar de compartir", liveWho: "Quién está en el mapa",
  liveInvite: "Invita a tu grupo",
  liveInviteText: "Comparte este enlace — contiene tu código privado del viaje. Trátalo como una contraseña; solo quien tenga el enlace puede ver las ubicaciones.",
  liveTripCode: "Código del viaje:", liveCopy: "Copiar enlace",
  liveNobody: "Nadie está compartiendo todavía. Sé el primero — escribe tu nombre y únete.",
  liveYou: " (tú)", liveAway: " de distancia", liveTracker: " · rastreador", liveViaTracker: "vía rastreador",
  liveCopied: "¡Enlace copiado! Envíalo a tu grupo.", liveCopyPrompt: "Copia este enlace:",
  liveSharingAs: "Estás compartiendo en vivo como {n}. Mantén esta página abierta mientras pedaleas.",
  liveStopped: "Dejaste de compartir. Los demás siguen visibles.",
  liveNotConfig: "El rastreo del grupo aún no está configurado. Sigue SETUP.md para agregar tu configuración gratuita de Firebase.",
  liveNotConfigRoster: "Cuando Firebase esté configurado, todos los que abran el enlace y escriban su nombre aparecerán aquí en vivo.",
  liveSetup: "El rastreo en vivo no está configurado — revisa SETUP.md.",
  agoS: "s", agoM: "min", agoH: "h", centerOnMap: "Centrar en el mapa",
  otTitle: "Rastreo en segundo plano (opcional)",
  otIntro: "Una página web solo comparte ubicación mientras está abierta. Para seguir transmitiendo con la pantalla apagada, instala la app gratuita <b>OwnTracks</b> — esta sección genera su configuración por ti.",
  otStep1: "Despliega el relevo una vez (Cloudflare Worker gratuito) — ve <b>SETUP.md</b>. Pega su URL abajo.",
  otStep2: "Escribe tu nombre arriba (mismo nombre = un solo marcador).",
  otStep3: "Instala <b>OwnTracks</b>, ábrelo → <b>Settings → Configuration</b>, y escanea el QR o pega la URL.",
  otRelayLbl: "URL de tu Worker de relevo",
  otScan: "Escanea esto dentro de OwnTracks (Settings → Configuration → escanear):",
  otOrUrl: "…o pon <b>Mode = HTTP</b> en OwnTracks y pega esta <b>URL</b>:",
  otCopyBtn: "Copiar URL de OwnTracks", otCopied: "URL de OwnTracks copiada.", otCopyPrompt: "Copia esta URL:",
  otHintBoth: "Escribe tu nombre (arriba) y la URL de tu relevo para generar tu configuración de OwnTracks.",
  otHintName: "Escribe tu nombre arriba para generar tu configuración de OwnTracks.",
  otHintRelay: "Pega la URL de tu Worker de relevo arriba para generar tu configuración de OwnTracks.",
  // photos
  photosTitle: "📷 Fotos del viaje",
  photosIntro: "Agrega tus fotos del viaje a nuestro álbum compartido en Google Drive — toca abajo para abrirlo y súbelas directo desde la galería de tu teléfono.",
  photoOpenDrive: "📷 Abrir el álbum compartido ↗"
}
};

function T(key, vars) {
  var s = (I18N[LANG] && I18N[LANG][key]) != null ? I18N[LANG][key] : I18N.en[key];
  if (s == null) return key;
  if (vars) Object.keys(vars).forEach(function (k) {
    s = s.split("{" + k + "}").join(vars[k]);
  });
  return s;
}

/* apply translations to static HTML (data-i18n = innerHTML, data-i18n-ph = placeholder) */
(function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.innerHTML = T(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
    el.placeholder = T(el.getAttribute("data-i18n-ph"));
  });
  // language toggle: show the flag you'd switch TO
  var btn = document.getElementById("btnLang");
  if (btn) {
    btn.textContent = (LANG === "en") ? "🇲🇽" : "🇺🇸";
    btn.title = (LANG === "en") ? "Cambiar a español (km)" : "Switch to English (miles)";
    btn.addEventListener("click", function () {
      try { localStorage.setItem("biketrip_lang", LANG === "en" ? "es" : "en"); } catch (e) {}
      location.reload();
    });
  }
})();
