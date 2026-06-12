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
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_PROJECT-default-rtdb.firebaseio.com",
  projectId: "PASTE_PROJECT",
  appId: "PASTE_APP_ID"
};
