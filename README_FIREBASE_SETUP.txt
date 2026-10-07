ENERGY CONTROL MONITOR - FINAL FIREBASE BUILD

1. Keep your private api/serviceAccountKey.json in the api folder. It is intentionally NOT included in the distributable ZIP.
2. Firebase Console > Authentication > Sign-in method: enable Email/Password.
3. Firebase Console > Authentication > Users: create your FIRST account manually. The first account that logs into this app becomes the admin profile.
4. Run: cd api && npm install && npm start
5. Start Mosquitto on TCP 1883 and WebSocket 9001.
6. Open index.html through your normal local web server. Log in with the Firebase email/password.
7. Settings > User Access lets the admin add users. Added users can control the same 3 relays and a New User notification is stored in Firebase and shown on Dashboard.
8. Relay names are shared in Firebase and can be renamed from Dashboard.
9. Dashboard/History/Analytics use real MQTT/Firebase data only; placeholders show -- until real data arrives.

SECURITY: never upload serviceAccountKey.json to GitHub or public hosting.

ESP32 DEVICE ONBOARDING
=======================
After login/sign-up, the user is sent to pages/setup-device.html.
The dashboard is unlocked only after a real MQTT reading is detected for the entered Device ID.

MQTT topics required by each ESP32:
  Data:    smartsocket/<DEVICE_ID>/data
  Control: smartsocket/<DEVICE_ID>/control
Example for device1:
  smartsocket/device1/data
  smartsocket/device1/control

The Node.js backend now subscribes to smartsocket/+/data, so different ESP32 Device IDs can be detected.
The ESP32 must publish at least one fresh reading (within 2 minutes) before pairing succeeds.
The first account that pairs a device becomes its owner. A device already owned by another account cannot be paired again.
Users created by an admin inherit access to the admin's paired ESP32.
