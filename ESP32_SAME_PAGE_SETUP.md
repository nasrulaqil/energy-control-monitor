# ESP32 same-page provisioning contract

The Connect ESP32 page now expects the unconfigured ESP32 to create the AP `SmartEnergy-Setup` at `192.168.4.1`.

Firmware must expose:

- `GET /device-info` -> JSON `{ "device_id": "ECM-A1B2C3" }`
- `POST /configure` with JSON `{ "ssid":"...", "password":"...", "mqtt_server":"192.168.x.x" }`
- response -> JSON `{ "status":"OK", "device_id":"ECM-A1B2C3" }`
- CORS header `Access-Control-Allow-Origin: *` on both endpoints.

After receiving configuration, ESP32 saves it, leaves AP mode, joins home WiFi, connects to MQTT and publishes real data to:
`smartsocket/ECM-A1B2C3/data`

It subscribes to:
`smartsocket/ECM-A1B2C3/control`

The website then automatically pairs that Device ID through the backend. No manual Device ID field is used.
