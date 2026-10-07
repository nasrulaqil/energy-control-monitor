// ==================================================
// SMART ENERGY MONITOR - SETTINGS
// ==================================================


// ==================================================
// HTML ELEMENTS
// ==================================================

const deviceName =
    document.getElementById("deviceName");

const deviceId =
    document.getElementById("deviceId");

const electricityRate =
    document.getElementById("electricityRate");

const monthlyLimit =
    document.getElementById("monthlyLimit");

const highUsageAlert =
    document.getElementById("highUsageAlert");

const offlineAlert =
    document.getElementById("offlineAlert");

const mqttBroker =
    document.getElementById("mqttBroker");

const mqttPort =
    document.getElementById("mqttPort");

const saveSettings =
    document.getElementById("saveSettings");

const resetSettings =
    document.getElementById("resetSettings");

const saveMessage =
    document.getElementById("saveMessage");


// ==================================================
// DEFAULT SETTINGS
// ==================================================

const defaultSettings = {

    deviceName:
        "Smart Extension 01",

    deviceId:
        "ESP32-001",

    electricityRate:
        0.57,

    monthlyLimit:
        100,

    highUsageAlert:
        true,

    offlineAlert:
        true,

    mqttBroker:
        "localhost",

    mqttPort:
        9001

};


// ==================================================
// LOAD SETTINGS
// ==================================================

function loadSettings() {

    const savedSettings =
        localStorage.getItem(
            "smartEnergySettings"
        );


    if (savedSettings) {

        const settings =
            JSON.parse(
                savedSettings
            );


        deviceName.value =
            settings.deviceName;

        deviceId.value =
            settings.deviceId;

        electricityRate.value =
            settings.electricityRate;

        monthlyLimit.value =
            settings.monthlyLimit;

        highUsageAlert.checked =
            settings.highUsageAlert;

        offlineAlert.checked =
            settings.offlineAlert;

        mqttBroker.value =
            settings.mqttBroker;

        mqttPort.value =
            settings.mqttPort;

    } else {

        applySettings(
            defaultSettings
        );

    }

}


// ==================================================
// APPLY SETTINGS
// ==================================================

function applySettings(settings) {

    deviceName.value =
        settings.deviceName;

    deviceId.value =
        settings.deviceId;

    electricityRate.value =
        settings.electricityRate;

    monthlyLimit.value =
        settings.monthlyLimit;

    highUsageAlert.checked =
        settings.highUsageAlert;

    offlineAlert.checked =
        settings.offlineAlert;

    mqttBroker.value =
        settings.mqttBroker;

    mqttPort.value =
        settings.mqttPort;

}


// ==================================================
// SAVE SETTINGS
// ==================================================

saveSettings.addEventListener(
    "click",
    function() {


        const settings = {

            deviceName:
                deviceName.value,

            deviceId:
                deviceId.value,

            electricityRate:
                Number(
                    electricityRate.value
                ),

            monthlyLimit:
                Number(
                    monthlyLimit.value
                ),

            highUsageAlert:
                highUsageAlert.checked,

            offlineAlert:
                offlineAlert.checked,

            mqttBroker:
                mqttBroker.value,

            mqttPort:
                Number(
                    mqttPort.value
                )

        };


        localStorage.setItem(

            "smartEnergySettings",

            JSON.stringify(
                settings
            )

        );


        saveMessage.innerHTML =
            "Settings saved successfully!";


        setTimeout(
            function() {

                saveMessage.innerHTML =
                    "";

            },
            3000
        );


        console.log(
            "Settings saved:",
            settings
        );

    }
);


// ==================================================
// RESET SETTINGS
// ==================================================

resetSettings.addEventListener(
    "click",
    function() {


        const confirmation =
            confirm(
                "Reset all settings to default?"
            );


        if (!confirmation) {

            return;

        }


        localStorage.removeItem(
            "smartEnergySettings"
        );


        applySettings(
            defaultSettings
        );


        saveMessage.innerHTML =
            "Settings reset successfully!";


        setTimeout(
            function() {

                saveMessage.innerHTML =
                    "";

            },
            3000
        );

    }
);


// ==================================================
// LOAD SETTINGS WHEN PAGE OPENS
// ==================================================

loadSettings();