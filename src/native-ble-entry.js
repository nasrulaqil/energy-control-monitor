import { BleClient } from '@capacitor-community/bluetooth-le';

const enc = new TextEncoder();
function view(text) {
  const bytes = enc.encode(text);
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

window.smartEnergyNativeBle = {
  async initialize() {
    await BleClient.initialize({ androidNeverForLocation: true });
  },
  async requestDevice(serviceUuid) {
    const device = await BleClient.requestDevice({ services: [serviceUuid] });
    try { await BleClient.disconnect(device.deviceId); } catch (_) {}
    await BleClient.connect(device.deviceId);
    return { id: device.deviceId, name: device.name || 'Smart Energy ESP32' };
  },
  async read(deviceId, serviceUuid, characteristicUuid) {
    const data = await BleClient.read(deviceId, serviceUuid, characteristicUuid);
    return new TextDecoder().decode(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  },
  async write(deviceId, serviceUuid, characteristicUuid, text) {
    await BleClient.write(deviceId, serviceUuid, characteristicUuid, view(text));
  },
  async disconnect(deviceId) {
    try { await BleClient.disconnect(deviceId); } catch (_) {}
  }
};
