# Energy Control Monitor - Android (Capacitor)

## What is ready
- Existing login/dashboard/history/analytics/settings retained.
- Android Capacitor configuration added.
- Native BLE adapter added using @capacitor-community/bluetooth-le.
- BLE UUIDs remain identical to ESP32 firmware.
- Backend/MQTT laptop host defaults to 10.144.84.44.

## First build on the development laptop
1. Install Node.js LTS and Android Studio.
2. Open a terminal in this project folder.
3. Run: npm install
4. Run: npm run build:ble
5. Run: npx cap add android
6. Run: npm run cap:sync
7. Run: npx cap open android
8. In Android Studio, run on a real Android phone.

## Network before testing
The phone, ESP32 and laptop running Node.js + Mosquitto must be able to reach each other.
If the laptop IPv4 changes, change DEFAULT_BACKEND_HOST in js/firebase-config.js and MQTT_SERVER in the ESP32 firmware to the new laptop IPv4, then run npm run cap:sync again.

## Important
Real BLE provisioning cannot be verified until the ESP32 is available. The Android project can still be built before that.
Do not put api/serviceAccountKey.json inside the Android app. It stays only on the Node.js backend laptop/server.
