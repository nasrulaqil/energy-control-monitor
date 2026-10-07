// ==================================================
// SMART ENERGY MONITOR - DEVICE MANAGEMENT
// ==================================================


// ==================================================
// GET ELEMENTS
// ==================================================

const addDeviceButton =
    document.getElementById("addDeviceBtn");

const addDeviceForm =
    document.getElementById("addDeviceForm");

const dynamicDevices =
    document.getElementById("dynamicDevices");


// ==================================================
// OPEN ADD DEVICE MODAL
// ==================================================

if (addDeviceButton) {

    addDeviceButton.addEventListener(
        "click",
        function () {

            const modalElement =
                document.getElementById(
                    "addDeviceModal"
                );

            const modal =
                new bootstrap.Modal(
                    modalElement
                );

            modal.show();

        }
    );

}


// ==================================================
// LOAD DEVICES
// ==================================================

function getDevices() {

    return JSON.parse(
        localStorage.getItem(
            "smartEnergyDevices"
        )
    ) || [];

}


// ==================================================
// SAVE DEVICES
// ==================================================

function saveDevices(devices) {

    localStorage.setItem(
        "smartEnergyDevices",
        JSON.stringify(devices)
    );

}


// ==================================================
// DISPLAY DEVICES
// ==================================================

function displayDevices() {

    if (!dynamicDevices) {
        return;
    }


    const devices =
        getDevices();


    dynamicDevices.innerHTML = "";


    // No devices

    if (devices.length === 0) {

        dynamicDevices.innerHTML = `

            <div class="text-center text-muted py-3">

                <i class="bi bi-plug fs-2"></i>

                <p class="mt-2 mb-0">

                    No additional devices

                </p>

            </div>

        `;

        return;

    }


    // Create device cards

    devices.forEach(
        function (device) {

            const card =
                document.createElement("div");


            card.className =
                "device-card border rounded p-3 mb-3";


            card.innerHTML = `

                <div class="row align-items-center">


                    <!-- DEVICE INFORMATION -->

                    <div class="col-md-4">

                        <div class="d-flex align-items-center">

                            <div class="device-icon me-3">

                                <i class="bi bi-plug-fill"></i>

                            </div>


                            <div>

                                <h5 class="mb-1">

                                    ${device.name}

                                </h5>


                                <p class="text-muted mb-1">

                                    📍 ${device.room}

                                </p>


                                <small>

                                    <span class="text-success">

                                        ● Online

                                    </span>

                                </small>

                            </div>

                        </div>

                    </div>


                    <!-- POWER -->

                    <div class="col-md-3 mt-3 mt-md-0">

                        <small class="text-muted">

                            Current Power

                        </small>


                        <h4 class="mb-0">

                            ${device.power} W

                        </h4>

                    </div>


                    <!-- STATUS -->

                    <div class="col-md-2 mt-3 mt-md-0">

                        <small class="text-muted">

                            Status

                        </small>


                        <h5 class="mb-0">

                            <span
                                id="status-${device.id}"
                                class="${
                                    device.status === "ON"
                                    ? "text-success"
                                    : "text-danger"
                                }"
                            >

                                ${device.status}

                            </span>

                        </h5>

                    </div>


                    <!-- CONTROL -->

                    <div class="col-md-3 mt-3 mt-md-0 text-md-end">

                        <button
                            class="btn btn-success btn-sm"
                            onclick="turnDeviceOn(${device.id})"
                        >

                            <i class="bi bi-power"></i>

                            ON

                        </button>


                        <button
                            class="btn btn-danger btn-sm"
                            onclick="turnDeviceOff(${device.id})"
                        >

                            OFF

                        </button>


                        <button
                            class="btn btn-outline-danger btn-sm mt-1"
                            onclick="deleteDevice(${device.id})"
                        >

                            <i class="bi bi-trash"></i>

                        </button>

                    </div>

                </div>

            `;


            dynamicDevices.appendChild(card);

        }
    );

}


// ==================================================
// TURN DEVICE ON
// ==================================================

function turnDeviceOn(id) {

    const devices =
        getDevices();


    const device =
        devices.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!device) {
        return;
    }


    device.status =
        "ON";


    saveDevices(devices);


    displayDevices();

}


// ==================================================
// TURN DEVICE OFF
// ==================================================

function turnDeviceOff(id) {

    const devices =
        getDevices();


    const device =
        devices.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!device) {
        return;
    }


    device.status =
        "OFF";


    saveDevices(devices);


    displayDevices();

}


// ==================================================
// DELETE DEVICE
// ==================================================

function deleteDevice(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this device?"
        );


    if (!confirmDelete) {
        return;
    }


    let devices =
        getDevices();


    devices =
        devices.filter(
            function (device) {

                return device.id !== id;

            }
        );


    saveDevices(devices);


    displayDevices();

}


// ==================================================
// ADD DEVICE
// ==================================================

if (addDeviceForm) {

    addDeviceForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const deviceName =
                document.getElementById(
                    "newDeviceName"
                ).value.trim();


            const deviceRoom =
                document.getElementById(
                    "newDeviceRoom"
                ).value.trim();


            const deviceType =
                document.getElementById(
                    "newDeviceType"
                ).value;


            const deviceTopic =
                document.getElementById(
                    "newDeviceTopic"
                ).value.trim();


            const message =
                document.getElementById(
                    "deviceFormMessage"
                );


            // Validate

            if (
                !deviceName ||
                !deviceRoom ||
                !deviceTopic
            ) {

                message.classList.remove(
                    "d-none"
                );


                message.innerHTML =
                    "Please fill in all required fields.";


                return;

            }


            message.classList.add(
                "d-none"
            );


            // Create device

            const newDevice = {

                id: Date.now(),

                name: deviceName,

                room: deviceRoom,

                type: deviceType,

                mqttTopic: deviceTopic,

                status: "OFF",

                power: 0,

                online: true

            };


            // Get existing devices

            const devices =
                getDevices();


            // Add device

            devices.push(
                newDevice
            );


            // Save

            saveDevices(
                devices
            );


            // Reset form

            addDeviceForm.reset();


            // Close modal

            const modalElement =
                document.getElementById(
                    "addDeviceModal"
                );


            const modal =
                bootstrap.Modal.getInstance(
                    modalElement
                );


            if (modal) {

                modal.hide();

            }


            // Display immediately

            displayDevices();

        }
    );

}


// ==================================================
// INITIAL LOAD
// ==================================================

displayDevices();