// ==================================================
// SMART ENERGY DASHBOARD
// ==================================================


// ==================================================
// HTML ELEMENTS
// ==================================================

const voltage =
    document.getElementById("voltage");

const current =
    document.getElementById("current");

const power =
    document.getElementById("power");

const energy =
    document.getElementById("energy");

const cost =
    document.getElementById("cost");

const todayEnergy =
    document.getElementById("todayEnergy");

const todayCost =
    document.getElementById("todayCost");

const monthCost =
    document.getElementById("monthCost");

const lastUpdate =
    document.getElementById("lastUpdate");

const devicePower =
    document.getElementById("devicePower");


// ==================================================
// RELAY ELEMENTS
// ==================================================

const relayStatus =
    document.getElementById("relayStatus");

const relay1Status =
    document.getElementById("relay1Status");

const relay2Status =
    document.getElementById("relay2Status");

const relay3Status =
    document.getElementById("relay3Status");


// ==================================================
// API URL
// ==================================================

const API_HOST = (window.location.hostname && window.location.hostname !== "localhost") ? window.location.hostname : "localhost";
const API_URL = `http://${API_HOST}:3000`;
const ACTIVE_DEVICE_ID = localStorage.getItem("smartEnergyDeviceId") || "device1";
const DEVICE_QUERY = `device_id=${encodeURIComponent(ACTIVE_DEVICE_ID)}`;


// ==================================================
// LIVE SENSOR DATA
// ==================================================
//
// Voltage, current, power, energy, cost, relay status
// dan last update TIDAK lagi diambil daripada API di sini.
//
// Semua bacaan live datang terus daripada mqtt.js
// melalui data sebenar yang dihantar oleh ESP32.
//
// API hanya digunakan untuk summary/history.
// ==================================================


// ==================================================
// LOAD REAL LIVE DATA FROM FIREBASE API
// ==================================================
async function loadLiveData(){
 try {
  const response=await authFetch(`/api/energy/latest?${DEVICE_QUERY}`,{cache:"no-store"});
  const result=await response.json();
  if(result.status!=="OK" || !result.data) return;
  const d=result.data;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set("voltage",`${Number(d.voltage||0).toFixed(1)} V`);
  set("current",`${Number(d.current||0).toFixed(3)} A`);
  set("power",`${Number(d.power||0).toFixed(1)} W`);
  set("energy",`${Number(d.energy||0).toFixed(4)} kWh`);
  set("cost",`RM ${Number(d.cost||0).toFixed(2)}`);
  set("devicePower",`${Number(d.power||0).toFixed(1)} W`);
  updateSingleRelayDisplay(relay1Status,d.relay1_status||"OFF");
  updateSingleRelayDisplay(relay2Status,d.relay2_status||"OFF");
  updateSingleRelayDisplay(relay3Status,d.relay3_status||"OFF");
  updateOverallRelayDisplay(d.relay_status||"OFF");
  if(lastUpdate) lastUpdate.textContent=d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "--";
 } catch(error){console.error("Live Firebase API error:",error);}
}

// ==================================================
// LOAD SUMMARY
// ==================================================

async function loadSummary() {

    try {

        const response =
            await authFetch(`/api/energy/summary?${DEVICE_QUERY}`);


        const result =
            await response.json();


        if (
            result.status !== "OK"
        ) {

            console.error(
                "Summary API returned error"
            );

            return;
        }


        // ==========================================
        // TODAY ENERGY
        // ==========================================

        if (todayEnergy) {

            todayEnergy.innerHTML =
                Number(
                    result.today_energy
                ).toFixed(4) +
                " kWh";
        }


        // ==========================================
        // TODAY COST
        // ==========================================

        if (todayCost) {

            todayCost.innerHTML =
                "RM " +
                Number(
                    result.today_cost
                ).toFixed(2);
        }


        // ==========================================
        // MONTHLY COST
        // ==========================================

        if (monthCost) {

            monthCost.innerHTML =
                "RM " +
                Number(
                    result.monthly_cost
                ).toFixed(2);
        }

    }

    catch (error) {

        console.error(
            "Summary error:",
            error
        );

    }
}


// ==================================================
// UPDATE SINGLE RELAY DISPLAY
// ==================================================

function updateSingleRelayDisplay(
    element,
    status
) {

    if (!element) {

        return;

    }


    const relay =
        String(
            status
        ).toUpperCase();


    element.innerHTML =
        relay;


    if (
        relay === "ON"
    ) {

        element.className =
            "text-success";

    }

    else {

        element.className =
            "text-danger";

    }


    // Sync the matching ON/OFF buttons whenever Firebase/API data
    // refreshes the relay state.
    const match = element.id.match(/^relay([123])Status$/);

    if (match) {
        const relayNumber = match[1];
        const onButton = document.getElementById(`relay${relayNumber}OnBtn`);
        const offButton = document.getElementById(`relay${relayNumber}OffBtn`);

        if (onButton) {
            onButton.classList.toggle("relay-btn-selected", relay === "ON");
        }

        if (offButton) {
            offButton.classList.toggle("relay-btn-selected", relay !== "ON");
        }
    }

}


// ==================================================
// UPDATE OVERALL RELAY DISPLAY
// ==================================================

function updateOverallRelayDisplay(
    status
) {

    if (!relayStatus) {

        return;

    }


    const relay =
        String(
            status
        ).toUpperCase();


    relayStatus.innerHTML =
        relay;


    if (
        relay === "ON"
    ) {

        relayStatus.className =
            "text-success";

    }

    else {

        relayStatus.className =
            "text-danger";

    }

}


// ==================================================
// RELAY 1 CONTROL
// ==================================================

const relay1OnBtn =
    document.getElementById(
        "relay1OnBtn"
    );

const relay1OffBtn =
    document.getElementById(
        "relay1OffBtn"
    );


if (relay1OnBtn) {

    relay1OnBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay1On ===
                "function"
            ) {

                relay1On();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay1Status,
                    "ON"
                );


                console.log(
                    "Dashboard → Relay 1 ON"
                );

            }

            else {

                console.error(
                    "relay1On() not found"
                );

            }

        }
    );

}


if (relay1OffBtn) {

    relay1OffBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay1Off ===
                "function"
            ) {

                relay1Off();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay1Status,
                    "OFF"
                );


                console.log(
                    "Dashboard → Relay 1 OFF"
                );

            }

            else {

                console.error(
                    "relay1Off() not found"
                );

            }

        }
    );

}


// ==================================================
// RELAY 2 CONTROL
// ==================================================

const relay2OnBtn =
    document.getElementById(
        "relay2OnBtn"
    );

const relay2OffBtn =
    document.getElementById(
        "relay2OffBtn"
    );


if (relay2OnBtn) {

    relay2OnBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay2On ===
                "function"
            ) {

                relay2On();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay2Status,
                    "ON"
                );


                console.log(
                    "Dashboard → Relay 2 ON"
                );

            }

            else {

                console.error(
                    "relay2On() not found"
                );

            }

        }
    );

}


if (relay2OffBtn) {

    relay2OffBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay2Off ===
                "function"
            ) {

                relay2Off();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay2Status,
                    "OFF"
                );


                console.log(
                    "Dashboard → Relay 2 OFF"
                );

            }

            else {

                console.error(
                    "relay2Off() not found"
                );

            }

        }
    );

}


// ==================================================
// RELAY 3 CONTROL
// ==================================================

const relay3OnBtn =
    document.getElementById(
        "relay3OnBtn"
    );

const relay3OffBtn =
    document.getElementById(
        "relay3OffBtn"
    );


if (relay3OnBtn) {

    relay3OnBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay3On ===
                "function"
            ) {

                relay3On();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay3Status,
                    "ON"
                );


                console.log(
                    "Dashboard → Relay 3 ON"
                );

            }

            else {

                console.error(
                    "relay3On() not found"
                );

            }

        }
    );

}


if (relay3OffBtn) {

    relay3OffBtn.addEventListener(
        "click",
        function () {

            if (
                typeof relay3Off ===
                "function"
            ) {

                relay3Off();


                // UPDATE DISPLAY TEMPORARILY

                updateSingleRelayDisplay(
                    relay3Status,
                    "OFF"
                );


                console.log(
                    "Dashboard → Relay 3 OFF"
                );

            }

            else {

                console.error(
                    "relay3Off() not found"
                );

            }

        }
    );

}


// ==================================================
// LOAD DASHBOARD DATA
// ==================================================

async function updateDashboard() {
    await Promise.all([loadLiveData(), loadSummary()]);
}


// ==================================================
// FIRST LOAD
// ==================================================

updateDashboard();


// ==================================================
// AUTO UPDATE EVERY 5 SECONDS
// ==================================================

setInterval(
    updateDashboard,
    5000
);


// ==================================================
// SHARED RELAY NAMES - FIREBASE
// ==================================================
async function loadRelayNames(){
 try {
  const r=await authFetch(`/api/settings/relay-names?${DEVICE_QUERY}`); const j=await r.json(); if(j.status!=="OK") return;
  for(let i=1;i<=3;i++){ const el=document.getElementById(`relay${i}Name`); if(el) el.textContent=j.data[`relay${i}`] || `Socket ${i}`; }
 } catch(e){ console.error("Relay name load error",e); }
}
async function editRelayName(number){
 if(![1,2,3].includes(Number(number))) return;
 const el=document.getElementById(`relay${number}Name`); const name=prompt(`Rename Relay ${number}:`,el?.textContent || `Socket ${number}`);
 if(name===null || !name.trim()) return;
 try {
  const r=await authFetch(`/api/settings/relay-names?${DEVICE_QUERY}`,{method:"PUT",body:JSON.stringify({device_id:ACTIVE_DEVICE_ID,[`relay${number}`]:name.trim()})});
  const j=await r.json(); if(j.status!=="OK") throw new Error(j.message); await loadRelayNames();
 } catch(e){ alert("Unable to rename relay: "+e.message); }
}
window.editRelayName=editRelayName;
firebase.auth().onAuthStateChanged(user=>{if(user) loadRelayNames();});
