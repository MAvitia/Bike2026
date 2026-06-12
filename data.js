/* Bike Trip 2026 — route data
 * Coordinates are approximate trail-town / landmark positions used to draw the
 * route, place markers, and estimate distance-to-next-stop. They are NOT a
 * survey-grade GPX track — good enough for a phone tracking aid.
 */

const TRIP = {
  name: "Bike Trip 2026 — Pittsburgh to DC",
  startDate: "2026-06-21",
  endDate: "2026-06-26",

  // One color per riding day (used for the route line + legend)
  days: [
    { day: 1, date: "2026-06-21", from: "Pittsburgh", to: "Connellsville", miles: 60.2, color: "#1f78b4" },
    { day: 2, date: "2026-06-22", from: "Connellsville", to: "Meyersdale",   miles: 58.3, color: "#33a02c" },
    { day: 3, date: "2026-06-23", from: "Meyersdale",    to: "Hancock",      miles: 91.4, color: "#ff7f00" },
    { day: 4, date: "2026-06-24", from: "Hancock",       to: "Harpers Ferry",miles: 51.5, color: "#6a3d9a" },
    { day: 5, date: "2026-06-25", from: "Harpers Ferry", to: "Washington DC",miles: 60.5, color: "#e31a1c" }
  ],

  // Ordered list of waypoints from start (Pittsburgh) to finish (DC).
  // type: start | town | lunch | poi | hotel | finish
  waypoints: [
    // ---- Day 1: Pittsburgh -> Connellsville ----
    { name: "Point State Park, Pittsburgh", lat: 40.44002, lng: -80.00979, day: 1, type: "start",  desc: "The start! Three-rivers point and the northern end of the GAP." },
    { name: "McKeesport",                    lat: 40.34034, lng: -79.86036, day: 1, type: "town",   desc: "Trail joins the Youghiogheny River. Restrooms." },
    { name: "Boston, PA",                    lat: 40.31061, lng: -79.83214, day: 1, type: "town",   desc: "River access; quick rest/snack." },
    { name: "West Newton",                   lat: 40.20979, lng: -79.77093, day: 1, type: "lunch",  desc: "Lunch stop (~halfway). Bike shop, restrooms, trailside eateries." },
    { name: "Smithton",                      lat: 40.15558, lng: -79.74594, day: 1, type: "town",   desc: "Small trail town with a cafe." },
    { name: "Dawson",                        lat: 40.04876, lng: -79.66572, day: 1, type: "town",   desc: "Quiet small town." },
    { name: "Connellsville — hotel booked", lat: 40.01561, lng: -79.59477, day: 1, type: "hotel", desc: "Day 1 overnight (hotel booked). Trail town on the Youghiogheny River." },

    // ---- Day 2: Connellsville -> Meyersdale ----
    { name: "Ohiopyle",                      lat: 39.86988, lng: -79.49159, day: 2, type: "poi",    stars: 3, desc: "Gorgeous state-park town — waterfalls by the trail. Great photo + ice cream stop." },
    { name: "Confluence",                    lat: 39.80677, lng: -79.36141, day: 2, type: "lunch",  desc: "Lunch stop. Cyclist-favorite cafes on the river." },
    { name: "Rockwood",                      lat: 39.91232, lng: -79.15243, day: 2, type: "town",   desc: "Trail town, cafe, restrooms." },
    { name: "Garrett",                       lat: 39.85983, lng: -79.05835, day: 2, type: "town",   desc: "Small town near the day's end." },
    { name: "Meyersdale — hotel booked",  lat: 39.81664, lng: -79.02107, day: 2, type: "hotel",  desc: "Day 2 overnight (hotel booked). Quiet mountain town in the Laurel Highlands." },

    // ---- Day 3: Meyersdale -> Hancock ----
    { name: "Eastern Continental Divide (2,392 ft)", lat: 39.70436, lng: -78.91245, day: 3, type: "poi", stars: 3, desc: "Highest point of the whole trip — it's downhill from here!" },
    { name: "Big Savage Tunnel",             lat: 39.69221, lng: -78.91608, day: 3, type: "poi",    stars: 3, desc: "Lit tunnel ~3,300 ft long." },
    { name: "Frostburg",                     lat: 39.66052, lng: -78.92366, day: 3, type: "town",   desc: "Long descent toward Cumberland is underway." },
    { name: "Cumberland, MD",                lat: 39.64553, lng: -78.76379, day: 3, type: "lunch",  desc: "Lunch + RESUPPLY. Last real town. GAP ends / C&O begins. Load up on water + food." },
    { name: "Oldtown",                       lat: 39.53796, lng: -78.59844, day: 3, type: "town",   desc: "Tiny stop, possible water." },
    { name: "Paw Paw Tunnel, WV",            lat: 39.54733, lng: -78.46319, day: 3, type: "poi",    stars: 3, desc: "3,118 ft dark tunnel — walk bikes through, bring lights! Kids love it." },
    { name: "Little Orleans — Bill's Place",  lat: 39.62164, lng: -78.38443, day: 3, type: "town",  desc: "Legendary trailside bar/grill (cash). Ice cream + rest." },
    { name: "Hancock — hotel booked", lat: 39.69798, lng: -78.17861, day: 3, type: "hotel",  desc: "Day 3 overnight (hotel booked). Cyclist-friendly trail town. No camping!" },

    // ---- Day 4: Hancock -> Harpers Ferry ----
    { name: "Fort Frederick State Park",     lat: 39.60784, lng: -78.00919, day: 4, type: "poi",    stars: 2, desc: "1756 stone fort by the trail — quick history stop." },
    { name: "Williamsport, MD",              lat: 39.59880, lng: -77.82635, day: 4, type: "lunch",  desc: "Lunch stop. Cyclist-friendly canal town." },
    { name: "Shepherdstown, WV",             lat: 39.43509, lng: -77.79879, day: 4, type: "poi",    stars: 2, desc: "Charming historic town — coffee / ice cream." },
    { name: "Harpers Ferry — hotel booked",   lat: 39.33024, lng: -77.73412, day: 4, type: "hotel",  desc: "Day 4 overnight (hotel booked). Historic river town. Steep stairs up the pedestrian bridge!" },

    // ---- Day 5: Harpers Ferry -> Washington, DC ----
    { name: "Brunswick, MD",                 lat: 39.31117, lng: -77.62909, day: 5, type: "town",   desc: "First town — coffee + water." },
    { name: "Point of Rocks",                lat: 39.27350, lng: -77.54102, day: 5, type: "town",   desc: "Pretty trailside / picnic stop." },
    { name: "White's Ferry",                 lat: 39.15496, lng: -77.51730, day: 5, type: "town",   desc: "Historic ferry landing, nice rest spot." },
    { name: "Great Falls Tavern",            lat: 38.99758, lng: -77.24855, day: 5, type: "poi",    stars: 3, desc: "DON'T SKIP! Walk the boardwalk to Olmsted Island overlook — dramatic falls." },
    { name: "Glen Echo",                     lat: 38.96865, lng: -77.14382, day: 5, type: "town",   desc: "Historic park with a carousel." },
    { name: "Georgetown — Mile 0, Washington DC", lat: 38.90413, lng: -77.05863, day: 5, type: "finish", desc: "THE FINISH! ~320 miles done. Group photo!" }
  ]
};
