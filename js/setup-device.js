/* Smart Energy BLE provisioning
   These UUIDs must be used by the ESP32 BLE firmware too. */
const BLE = {
  service: "7f510001-1b15-4d8b-9f31-5d28b91c0001",
  deviceId: "7f510002-1b15-4d8b-9f31-5d28b91c0001",
  ssid: "7f510003-1b15-4d8b-9f31-5d28b91c0001",
  password: "7f510004-1b15-4d8b-9f31-5d28b91c0001",
  command: "7f510005-1b15-4d8b-9f31-5d28b91c0001",
  status: "7f510006-1b15-4d8b-9f31-5d28b91c0001"
};

const scanButton=document.getElementById("scanBleBtn");
const form=document.getElementById("espProvisionForm");
const ssidInput=document.getElementById("wifiSsid");
const passwordInput=document.getElementById("wifiPassword");
const message=document.getElementById("setupMessage");
const setupButton=document.getElementById("setupEspBtn");
const bleDeviceBox=document.getElementById("bleDeviceBox");
const bleDeviceId=document.getElementById("bleDeviceId");
const resultBox=document.getElementById("deviceResult");
const resultId=document.getElementById("connectedDeviceId");
const dashboardButton=document.getElementById("openDashboardBtn");
const statusText=document.getElementById("statusText");

let bleDevice=null, bleServer=null, bleService=null, currentDeviceId="", nativeBleDeviceId="";
const encoder=new TextEncoder(), decoder=new TextDecoder();
const nativeBle = window.smartEnergyNativeBle || null;

function msg(text,ok=false){message.hidden=false;message.textContent=text;message.className=`auth-message ${ok?"auth-success":"auth-error"}`;}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function setStatus(text){statusText.textContent=text;}
async function writeText(uuid,value){
  if(nativeBle && nativeBleDeviceId){ return nativeBle.write(nativeBleDeviceId,BLE.service,uuid,value); }
  const c=await bleService.getCharacteristic(uuid); await c.writeValue(encoder.encode(value));
}

firebase.auth().onAuthStateChanged(async user=>{
  if(!user){location.href="../index.html";return;}
  try{
    const r=await authFetch("/api/device/status"); const j=await r.json();
    if(j.connected&&j.device_id){
      localStorage.setItem("smartEnergyDeviceId",j.device_id);resultId.textContent=j.device_id;
      resultBox.hidden=false;dashboardButton.hidden=false;scanButton.hidden=true;form.hidden=true;
      setStatus("This account already has an ESP32 connected.");
    }
  }catch(e){console.error(e);}
});

document.getElementById("toggleWifiPassword").addEventListener("click",()=>{
  const show=passwordInput.type==="password";passwordInput.type=show?"text":"password";
  document.querySelector("#toggleWifiPassword i").className=show?"bi bi-eye":"bi bi-eye-slash";
});

scanButton.addEventListener("click",async()=>{
  message.hidden=true;
  if(!nativeBle && !navigator.bluetooth){
    return msg("Bluetooth setup is not supported on this device/browser.");
  }
  scanButton.disabled=true;scanButton.querySelector("span").textContent="Searching...";setStatus("Searching for Smart Energy ESP32...");
  try{
    if(nativeBle){
      await nativeBle.initialize();
      const d=await nativeBle.requestDevice(BLE.service);
      nativeBleDeviceId=d.id;
      currentDeviceId=(await nativeBle.read(nativeBleDeviceId,BLE.service,BLE.deviceId)).trim();
    }else{
      bleDevice=await navigator.bluetooth.requestDevice({filters:[{services:[BLE.service]}],optionalServices:[BLE.service]});
      bleDevice.addEventListener("gattserverdisconnected",()=>setStatus("ESP32 Bluetooth disconnected."));
      bleServer=await bleDevice.gatt.connect();
      bleService=await bleServer.getPrimaryService(BLE.service);
      const idChar=await bleService.getCharacteristic(BLE.deviceId);
      const idValue=await idChar.readValue();
      currentDeviceId=decoder.decode(idValue).trim();
    }
    if(!/^ECM-[A-F0-9]{6}$/i.test(currentDeviceId)) throw new Error("Invalid Device ID received from ESP32.");
    bleDeviceId.textContent=currentDeviceId;bleDeviceBox.hidden=false;form.hidden=false;scanButton.hidden=true;
    setStatus(`Connected to ${currentDeviceId} by Bluetooth. Enter the WiFi details.`);
  }catch(err){
    if(err.name!=="NotFoundError") msg(err.message||"Could not connect to the ESP32 by Bluetooth.");
    setStatus("Ready to search for a nearby ESP32.");
  }finally{scanButton.disabled=false;scanButton.querySelector("span").textContent="Find Nearby ESP32";}
});

async function pairWithBackend(deviceId){
  for(let attempt=0;attempt<18;attempt++){
    try{
      const r=await authFetch("/api/device/connect",{method:"POST",body:JSON.stringify({device_id:deviceId})});
      const j=await r.json();
      if(r.ok)return j;
      if(r.status===409){const e=new Error(j.message||"This ESP32 is already linked to another account.");e.noRetry=true;throw e;}
    }catch(err){if(err.noRetry||attempt===17)throw err;}
    setupButton.querySelector("span").textContent=`Waiting for device... ${attempt+1}/18`;await sleep(5000);
  }
  throw new Error("ESP32 connected to WiFi, but the backend has not received its MQTT data yet.");
}

form.addEventListener("submit",async e=>{
  e.preventDefault();message.hidden=true;
  const ssid=ssidInput.value.trim(),password=passwordInput.value;
  if(!ssid)return msg("Enter your WiFi name (SSID).");
  if((!bleService&&!nativeBleDeviceId)||!currentDeviceId)return msg("Connect to the ESP32 by Bluetooth first.");
  setupButton.disabled=true;
  try{
    setupButton.querySelector("span").textContent="Sending WiFi details...";setStatus("Sending WiFi settings to ESP32 by Bluetooth...");
    await writeText(BLE.ssid,ssid);await writeText(BLE.password,password);await writeText(BLE.command,"CONNECT_WIFI");
    msg(`WiFi settings sent to ${currentDeviceId}. Waiting for MQTT connection...`,true);
    setStatus("ESP32 is connecting to WiFi and the Smart Energy service...");
    await sleep(5000);
    const paired=await pairWithBackend(currentDeviceId);
    localStorage.setItem("smartEnergyDeviceId",paired.device_id);resultId.textContent=paired.device_id;
    resultBox.hidden=false;dashboardButton.hidden=false;form.hidden=true;bleDeviceBox.hidden=true;
    setStatus("Setup complete. Your ESP32 is linked to this account.");msg("ESP32 setup complete.",true);
  }catch(err){msg(err.message||"ESP32 setup failed. Please try again.");setStatus("Setup was not completed.");}
  finally{setupButton.disabled=false;setupButton.querySelector("span").textContent="Connect ESP32 to WiFi";}
});

dashboardButton.addEventListener("click",()=>location.href="dashboard.html");
document.getElementById("setupLogout").addEventListener("click",async()=>{await firebase.auth().signOut();location.href="../index.html";});
