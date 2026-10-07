# Smart Energy Monitor - BLE Provisioning Plan

New setup flow:

App -> BLE -> ESP32 -> WiFi -> MQTT -> Backend -> Firebase -> App

## BLE GATT contract
The web/mobile frontend and ESP32 firmware must use the same UUIDs:

- Service: `7f510001-1b15-4d8b-9f31-5d28b91c0001`
- Device ID (read): `7f510002-1b15-4d8b-9f31-5d28b91c0001`
- WiFi SSID (write): `7f510003-1b15-4d8b-9f31-5d28b91c0001`
- WiFi password (write): `7f510004-1b15-4d8b-9f31-5d28b91c0001`
- Command (write): `7f510005-1b15-4d8b-9f31-5d28b91c0001`
- Status (reserved for notify/read): `7f510006-1b15-4d8b-9f31-5d28b91c0001`

Command used by frontend: `CONNECT_WIFI`.

## What changed
- Removed the old `SmartEnergy-Setup` / `192.168.4.1` provisioning flow from the setup page.
- Removed the MQTT server IP field from the user setup UI.
- Device ID is read from ESP32 over BLE and is never typed manually.
- Fixed backend pairing retry so HTTP 409 (device owned by another account) stops immediately.

## Important before hardware testing
The existing ESP32 firmware still needs a BLE provisioning implementation matching the GATT contract above. The MQTT host must be configured automatically by firmware/build configuration or replaced by a reachable hosted broker/backend; the user should not enter it during onboarding.

The browser implementation uses Web Bluetooth for development. A packaged Android app should use a native Capacitor BLE plugin/API while keeping the same GATT contract and UI flow.
