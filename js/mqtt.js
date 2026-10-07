// ==================================================
// MQTT CONNECTION
// ==================================================

console.log("MQTT SCRIPT STARTED");


// ==================================================
// MQTT BROKER
// ==================================================

const MQTT_HOST = window.smartEnergyBackendHost || ((window.location.hostname && window.location.hostname !== "localhost") ? window.location.hostname : "localhost");
const MQTT_BROKER = `ws://${MQTT_HOST}:9001`;


// ==================================================
// MQTT TOPICS
// ==================================================

const ACTIVE_DEVICE_ID = localStorage.getItem("smartEnergyDeviceId") || "device1";
const DATA_TOPIC = `smartsocket/${ACTIVE_DEVICE_ID}/data`;
const CONTROL_TOPIC = `smartsocket/${ACTIVE_DEVICE_ID}/control`;


// ==================================================
// MQTT CLIENT
// ==================================================

const mqttClient =
    mqtt.connect(MQTT_BROKER);
window.mqttClient = mqttClient;


// ==================================================
// MQTT CONNECTED
// ==================================================

mqttClient.on(
    "connect",
    function () {

        console.log("MQTT CONNECTED");
        const b=document.getElementById("mqttStatusBadge"); if(b){b.textContent="MQTT CONNECTED";b.className="badge bg-primary mb-2";}


        mqttClient.subscribe(
            DATA_TOPIC,
            function (error) {

                if (error) {

                    console.error(
                        "Subscribe error:",
                        error
                    );

                } else {

                    console.log(
                        "Subscribed to device data"
                    );

                }

            }
        );

    }
);


// ==================================================
// MQTT ERROR
// ==================================================

mqttClient.on(
    "error",
    function (error) {

        console.error(
            "MQTT ERROR:",
            error
        );

    }
);


// ==================================================
// MQTT RECONNECT
// ==================================================

mqttClient.on(
    "reconnect",
    function () {

        console.log(
            "MQTT RECONNECTING..."
        );

    }
);


// ==================================================
// MQTT OFFLINE
// ==================================================

mqttClient.on(
    "offline",
    function () {

        console.log(
            "MQTT OFFLINE"
        );
        const b=document.getElementById("mqttStatusBadge"); if(b){b.textContent="MQTT OFFLINE";b.className="badge bg-danger mb-2";}

    }
);


// ==================================================
// MQTT MESSAGE
// ==================================================

mqttClient.on(
    "message",
    function (topic, message) {

        console.log(
            "MQTT MESSAGE:",
            topic,
            message.toString()
        );


        // ==========================================
        // CHECK TOPIC
        // ==========================================

        if (topic !== DATA_TOPIC) {

            return;

        }


        // ==========================================
        // CONVERT JSON
        // ==========================================

        let data;


        try {

            data =
                JSON.parse(
                    message.toString()
                );

        }

        catch (error) {

            console.error(
                "Invalid MQTT JSON:",
                error
            );

            return;

        }


        console.log(
            "LIVE ESP32 DATA:",
            data
        );
        const eb=document.getElementById("esp32StatusBadge"); if(eb){eb.textContent="ESP32 ONLINE";eb.className="badge bg-primary mb-2";}
        const db=document.getElementById("dataStatusBadge"); if(db){db.textContent="LIVE DATA";db.className="badge bg-info";}
        const cs=document.getElementById("connectionStatus"); if(cs) cs.innerHTML="<span class=\"text-primary\">● Online</span>";


        // ==========================================
        // VOLTAGE - LIVE FROM ESP32
        // ==========================================

        if (
            data.voltage !== undefined
        ) {

            const voltageElement =
                document.getElementById(
                    "voltage"
                );


            if (voltageElement) {

                const liveVoltage =
                    Number(
                        data.voltage
                    );


                voltageElement.innerHTML =
                    liveVoltage.toFixed(1) +
                    " V";

            }

        }


        // ==========================================
        // CURRENT - LIVE FROM ESP32
        // ==========================================

        if (
            data.current !== undefined
        ) {

            const currentElement =
                document.getElementById(
                    "current"
                );


            if (currentElement) {

                const liveCurrent =
                    Number(
                        data.current
                    );


                currentElement.innerHTML =
                    liveCurrent.toFixed(3) +
                    " A";

            }

        }


        // ==========================================
        // POWER - LIVE FROM ESP32
        // ==========================================

        if (
            data.power !== undefined
        ) {

            const livePower =
                Number(
                    data.power
                );


            const powerElement =
                document.getElementById(
                    "power"
                );


            const devicePowerElement =
                document.getElementById(
                    "devicePower"
                );


            // MAIN POWER CARD

            if (powerElement) {

                powerElement.innerHTML =
                    livePower.toFixed(1) +
                    " W";

            }


            // DEVICE POWER

            if (devicePowerElement) {

                devicePowerElement.innerHTML =
                    livePower.toFixed(1) +
                    " W";

            }


            // ======================================
            // UPDATE POWER GRAPH
            // ======================================

            if (window.powerChart) {

                const now =
                    new Date()
                    .toLocaleTimeString();


                window.powerChart
                    .data
                    .labels
                    .push(
                        now
                    );


                window.powerChart
                    .data
                    .datasets[0]
                    .data
                    .push(
                        livePower
                    );


                // KEEP ONLY LAST 10 READINGS

                if (
                    window.powerChart
                        .data
                        .labels
                        .length > 10
                ) {

                    window.powerChart
                        .data
                        .labels
                        .shift();


                    window.powerChart
                        .data
                        .datasets[0]
                        .data
                        .shift();

                }


                window.powerChart.update();

            }

        }


        // ==========================================
        // ENERGY - LIVE FROM ESP32
        // ==========================================

        if (
            data.energy !== undefined
        ) {

            const liveEnergy =
                Number(
                    data.energy
                );


            const energyElement =
                document.getElementById(
                    "energy"
                );


            if (energyElement) {

                energyElement.innerHTML =
                    liveEnergy.toFixed(4) +
                    " kWh";

            }

        }


        // ==========================================
        // COST - LIVE FROM ESP32
        // ==========================================

        if (
            data.cost !== undefined
        ) {

            const liveCost =
                Number(
                    data.cost
                );


            const costElement =
                document.getElementById(
                    "cost"
                );


            if (costElement) {

                costElement.innerHTML =
                    "RM " +
                    liveCost.toFixed(2);

            }

        }


        // ==================================================
        // IMPORTANT
        // ==================================================
        //
        // mqtt.js TIDAK update:
        //
        // todayEnergy
        // todayCost
        // monthCost
        //
        // Nilai tersebut dikendalikan oleh script.js
        // menggunakan backend API.
        //
        // ==================================================


        // ==========================================
        // RELAY 1 STATUS
        // ==========================================

        if (
            data.relay1_status !== undefined
        ) {

            updateRelayStatusElement(
                "relay1Status",
                data.relay1_status
            );

        }


        // ==========================================
        // RELAY 2 STATUS
        // ==========================================

        if (
            data.relay2_status !== undefined
        ) {

            updateRelayStatusElement(
                "relay2Status",
                data.relay2_status
            );

        }


        // ==========================================
        // RELAY 3 STATUS
        // ==========================================

        if (
            data.relay3_status !== undefined
        ) {

            updateRelayStatusElement(
                "relay3Status",
                data.relay3_status
            );

        }


        // ==========================================
        // OVERALL RELAY STATUS
        // ==========================================

        if (
            data.relay_status !== undefined
        ) {

            updateRelayStatusElement(
                "relayStatus",
                data.relay_status
            );

        }


        // ==========================================
        // LAST UPDATE
        // ==========================================

        const lastUpdateElement =
            document.getElementById(
                "lastUpdate"
            );


        if (lastUpdateElement) {

            lastUpdateElement.innerHTML =
                new Date()
                .toLocaleString();

        }

    }
);


// ==================================================
// RELAY STATUS UPDATE
// ==================================================

function updateRelayStatusElement(
    elementId,
    status
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;

    }


    const normalizedStatus =
        String(
            status
        ).toUpperCase();


    element.innerHTML =
        normalizedStatus;


    if (
        normalizedStatus === "ON"
    ) {

        element.className =
            "text-success";

    }

    else {

        element.className =
            "text-danger";

    }


    // Keep the individual ON/OFF buttons in sync with the
    // latest confirmed relay status received from ESP32/MQTT.
    const match = elementId.match(/^relay([123])Status$/);

    if (match) {
        const relayNumber = match[1];
        const onButton = document.getElementById(`relay${relayNumber}OnBtn`);
        const offButton = document.getElementById(`relay${relayNumber}OffBtn`);

        if (onButton) {
            onButton.classList.toggle("relay-btn-selected", normalizedStatus === "ON");
        }

        if (offButton) {
            offButton.classList.toggle("relay-btn-selected", normalizedStatus !== "ON");
        }
    }

}


// ==================================================
// GENERIC MQTT RELAY PUBLISH
// ==================================================

function publishRelayCommand(
    command
) {

    if (
        !mqttClient.connected
    ) {

        console.error(
            "MQTT not connected"
        );

        return;

    }


    mqttClient.publish(
        CONTROL_TOPIC,
        command,
        function (error) {

            if (error) {

                console.error(
                    command +
                    " publish error:",
                    error
                );

                return;

            }


            console.log(
                "MQTT → " +
                command
            );

        }
    );

}


// ==================================================
// RELAY 1
// ==================================================

function relay1On() {

    publishRelayCommand(
        "R1_ON"
    );

}


function relay1Off() {

    publishRelayCommand(
        "R1_OFF"
    );

}


// ==================================================
// RELAY 2
// ==================================================

function relay2On() {

    publishRelayCommand(
        "R2_ON"
    );

}


function relay2Off() {

    publishRelayCommand(
        "R2_OFF"
    );

}


// ==================================================
// RELAY 3
// ==================================================

function relay3On() {

    publishRelayCommand(
        "R3_ON"
    );

}


function relay3Off() {

    publishRelayCommand(
        "R3_OFF"
    );

}


// ==================================================
// ALL RELAYS
// ==================================================

function allRelaysOn() {

    publishRelayCommand(
        "ALL_ON"
    );

    // Immediate UI feedback. The next real ESP32 MQTT message
    // remains the source of truth and will confirm/correct this state.
    [1, 2, 3].forEach((relayNumber) => {
        updateRelayStatusElement(`relay${relayNumber}Status`, "ON");
    });
    updateRelayStatusElement("relayStatus", "ON");

}


function allRelaysOff() {

    publishRelayCommand(
        "ALL_OFF"
    );

    // Keep all three individual relay controls visually synchronized.
    [1, 2, 3].forEach((relayNumber) => {
        updateRelayStatusElement(`relay${relayNumber}Status`, "OFF");
    });
    updateRelayStatusElement("relayStatus", "OFF");

}


// ==================================================
// OLD FUNCTIONS - BACKWARD COMPATIBILITY
// ==================================================

function mqttDeviceOn() {

    relay1On();

}


function mqttDeviceOff() {

    relay1Off();

}