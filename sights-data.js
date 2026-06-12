/* Curated sights & photo stops along (and near) the GAP + C&O route.
 * stars: 3 = don't miss, 2 = worth the stop, 1 = only if you're fresh.
 * snap: true = trailside feature; tools/snap_sights.py moves it exactly onto
 * the route line. snap: false = real off-trail location (short detour).
 */
const SIGHTS = [
 {"day": 1, "stars": 2, "snap": false, "lat": 40.4396, "lng": -80.0184, "name": "Duquesne Incline", "desc": "1877 cable car up Mt. Washington — the classic Pittsburgh skyline photo. Across the bridge from the start; do it the evening before."},
 {"day": 1, "stars": 1, "snap": true, "lat": 40.42732, "lng": -79.96251, "name": "Hot Metal Bridge", "desc": "You ride across this former steel-mill bridge that once carried molten iron between furnaces."},
 {"day": 1, "stars": 1, "snap": true, "lat": 40.41007, "lng": -79.89667, "name": "The Pump House, Homestead", "desc": "Site of the 1892 Battle of Homestead steel strike. Quick trailside history stop."},
 {"day": 1, "stars": 1, "snap": true, "lat": 40.27491, "lng": -79.79822, "name": "Dravo Cemetery", "desc": "Pioneer cemetery from 1812 right beside the trail. Shady bench break."},
 {"day": 1, "stars": 1, "snap": true, "lat": 40.18916, "lng": -79.76003, "name": "Cedar Creek Park", "desc": "Riverside park with a small gorge. Restrooms and water."},
 {"day": 2, "stars": 3, "snap": false, "lat": 39.8653, "lng": -79.5006, "name": "Cucumber Falls", "desc": "30-ft bridal-veil waterfall, a 5-minute walk off the trail in Ohiopyle. Top photo stop of the whole trip."},
 {"day": 2, "stars": 3, "snap": false, "lat": 39.8674, "lng": -79.4945, "name": "Ohiopyle Falls", "desc": "The big Youghiogheny falls with viewing decks right in town. Pair with ice cream."},
 {"day": 2, "stars": 2, "snap": false, "lat": 39.8713, "lng": -79.4986, "name": "Ferncliff Peninsula", "desc": "Natural-area loop inside a river bend — rare plants and river views."},
 {"day": 2, "stars": 2, "snap": false, "lat": 39.9064, "lng": -79.4677, "name": "Fallingwater", "desc": "Frank Lloyd Wright's world-famous house over a waterfall. ~4 mi off trail and needs tickets + 2-3 hours — only with time to spare."},
 {"day": 2, "stars": 3, "snap": true, "lat": 39.83357, "lng": -79.04455, "name": "Salisbury Viaduct", "desc": "1,908-ft railroad viaduct you ride straight across, high above the Casselman valley. Sweeping views — don't rush it."},
 {"day": 3, "stars": 2, "snap": true, "lat": 39.72181, "lng": -78.90485, "name": "Mason–Dixon Line", "desc": "Cross from Pennsylvania into Maryland at the surveyed 1767 line — marker on the trail."},
 {"day": 3, "stars": 1, "snap": true, "lat": 39.67778, "lng": -78.80687, "name": "Helmstetter's Curve", "desc": "Famous horseshoe curve of the scenic railroad — photo spot if a steam train happens by."},
 {"day": 3, "stars": 2, "snap": true, "lat": 39.6468, "lng": -78.76333, "name": "Canal Place — C&O Mile 0", "desc": "Where the GAP ends and the C&O Canal begins. Obligatory marker photo in Cumberland."},
 {"day": 3, "stars": 2, "snap": true, "lat": 39.67402, "lng": -78.23355, "name": "Round Top Cement Mill", "desc": "Civil-War-era cement kiln ruins built into the cliff just west of Hancock."},
 {"day": 4, "stars": 2, "snap": true, "lat": 39.61408, "lng": -77.92565, "name": "Dam No. 5", "desc": "Potomac dam Stonewall Jackson tried to blow up in 1861. Dramatic water over the rocks."},
 {"day": 4, "stars": 1, "snap": true, "lat": 39.49828, "lng": -77.83888, "name": "Dam No. 4", "desc": "Start of the Big Slackwater stretch where the towpath hugs the river on a concrete shelf."},
 {"day": 4, "stars": 3, "snap": false, "lat": 39.4747, "lng": -77.7445, "name": "Antietam Battlefield", "desc": "Bloodiest single day of the Civil War (1862). ~4 mi off trail from Sharpsburg — a real detour, but historic ground."},
 {"day": 4, "stars": 1, "snap": true, "lat": 39.46069, "lng": -77.77617, "name": "Antietam Aqueduct", "desc": "Stone canal aqueduct over Antietam Creek, right on the towpath."},
 {"day": 5, "stars": 3, "snap": false, "lat": 39.3232, "lng": -77.7299, "name": "Harpers Ferry Lower Town", "desc": "John Brown's Fort, The Point where two rivers meet, cobbled streets. You sleep here — explore in the evening."},
 {"day": 5, "stars": 3, "snap": true, "lat": 39.2229, "lng": -77.4515, "name": "Monocacy Aqueduct", "desc": "The grandest C&O aqueduct — seven granite arches, 516 ft. Best photo angle from the downstream side."},
 {"day": 5, "stars": 2, "snap": true, "lat": 39.06856, "lng": -77.33707, "name": "Riley's Lock & Seneca Aqueduct", "desc": "Red sandstone aqueduct and lockhouse in one — quarried right next door."},
 {"day": 5, "stars": 3, "snap": false, "lat": 38.9941, "lng": -77.2536, "name": "Great Falls Overlook (Olmsted Island)", "desc": "THE falls near Washington — boardwalk to a mid-river overlook of the 60-ft cascades. 10-minute walk, do not skip."},
 {"day": 5, "stars": 2, "snap": true, "lat": 38.98968, "lng": -77.24416, "name": "Billy Goat Trail", "desc": "Famous rock-scramble loop over Mather Gorge. Only the overlook section if legs are tired."},
 {"day": 5, "stars": 1, "snap": true, "lat": 38.91885, "lng": -77.10128, "name": "Fletcher's Boathouse", "desc": "Historic boathouse — snacks, drinks, and a last shady break before Georgetown."},
 {"day": 5, "stars": 3, "snap": false, "lat": 38.8893, "lng": -77.0502, "name": "Lincoln Memorial & the Mall", "desc": "One more mile past the finish: roll to the Lincoln Memorial for the victory photo with the Monument behind you."}
];
