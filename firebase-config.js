/* Firebase config for live group tracking.
 *
 * Paste the values from your Firebase project here (Project settings → "Your apps"
 * → Web app → SDK setup and configuration → "Config"). See SETUP.md for the
 * 5-minute walkthrough.
 *
 * Until real values are filled in, the app still works fully — it just shows
 * "live tracking not set up yet" on the Live tab.
 *
 * NOTE: these Firebase web keys are NOT secrets — they're safe to commit. Your
 * real access control is (a) the unguessable room code in the share link and
 * (b) the database security rules in database.rules.json.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCX0ZMq_BrNvzCCnwyQFYDQSj6GcadY-5g",
  authDomain: "gap-cno-2026.firebaseapp.com",
  databaseURL: "https://gap-cno-2026-default-rtdb.firebaseio.com",
  projectId: "gap-cno-2026",
  storageBucket: "gap-cno-2026.firebasestorage.app",
  messagingSenderId: "269301290576",
  appId: "1:269301290576:web:f750a30846b52c365a6355",
  measurementId: "G-QH0H55XTKK"
};

// OwnTracks background relay (Cloudflare Worker). Pre-fills the Live tab's
// OwnTracks setup so riders don't have to paste it. Not a secret.
window.OT_RELAY_URL = "https://biketrip-owntracks-relay.manuel-avitia-v.workers.dev";
