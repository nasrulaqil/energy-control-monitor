// ==================================================
// SMART ENERGY MONITOR - SCHEDULE
// ==================================================


// ==================================================
// GET HTML ELEMENTS
// ==================================================

const deviceSelect =
    document.getElementById("deviceSelect");

const actionSelect =
    document.getElementById("actionSelect");

const scheduleTime =
    document.getElementById("scheduleTime");

const saveSchedule =
    document.getElementById("saveSchedule");

const scheduleList =
    document.getElementById("scheduleList");

const scheduleCount =
    document.getElementById("scheduleCount");


// ==================================================
// SCHEDULE DATA
// ==================================================

let schedules = JSON.parse(localStorage.getItem("smartEnergySchedules") || "[]");

function saveSchedulesToStorage() {
    localStorage.setItem("smartEnergySchedules", JSON.stringify(schedules));
}


// ==================================================
// SAVE SCHEDULE
// ==================================================

saveSchedule.addEventListener(
    "click",
    function () {


        // Get selected device

        const device =
            deviceSelect.value;


        // Get ON / OFF

        const action =
            actionSelect.value;


        // Get time

        const time =
            scheduleTime.value;


        // Get selected days

        const selectedDays = [];


        document
            .querySelectorAll(".day-check:checked")
            .forEach(function(day) {

                selectedDays.push(
                    day.value
                );

            });


        // Check time

        if (time === "") {

            alert(
                "Please select a time."
            );

            return;

        }


        // Check days

        if (selectedDays.length === 0) {

            alert(
                "Please select at least one day."
            );

            return;

        }


        // Create schedule

        const newSchedule = {

            id:
                Date.now(),

            device:
                device,

            action:
                action,

            time:
                time,

            days:
                selectedDays

        };


        // Add schedule

        schedules.push(
            newSchedule
        );

        saveSchedulesToStorage();


        // Update screen

        displaySchedules();


        // Clear form

        scheduleTime.value = "";


        document
            .querySelectorAll(".day-check")
            .forEach(function(day) {

                day.checked = false;

            });


        alert(
            "Schedule saved successfully!"
        );

    }
);


// ==================================================
// DISPLAY SCHEDULES
// ==================================================

function displaySchedules() {


    scheduleList.innerHTML = "";


    scheduleCount.innerHTML =
        schedules.length +
        " Schedule" +
        (schedules.length !== 1 ? "s" : "");


    // No schedule

    if (schedules.length === 0) {

        scheduleList.innerHTML = `

            <div class="col-12">

                <div class="text-center text-muted py-5">

                    <i class="bi bi-calendar-x fs-1"></i>

                    <h5 class="mt-3">

                        No schedules yet

                    </h5>

                    <p>

                        Create your first
                        automatic schedule above.

                    </p>

                </div>

            </div>

        `;

        return;

    }


    // Display schedules

    schedules.forEach(
        function(schedule) {


            let actionBadge;


            if (schedule.action === "ON") {

                actionBadge = `

                    <span class="badge bg-success">

                        TURN ON

                    </span>

                `;

            } else {

                actionBadge = `

                    <span class="badge bg-danger">

                        TURN OFF

                    </span>

                `;

            }


            const scheduleCard = `

                <div class="col-md-6">

                    <div class="card border shadow-sm">

                        <div class="card-body">


                            <div class="d-flex justify-content-between">

                                <h5>

                                    <i class="bi bi-plug-fill"></i>

                                    ${schedule.device}

                                </h5>

                                ${actionBadge}

                            </div>


                            <hr>


                            <h2 class="text-success">

                                <i class="bi bi-clock"></i>

                                ${schedule.time}

                            </h2>


                            <p class="mb-2">

                                <strong>
                                    Days:
                                </strong>

                                ${schedule.days.join(", ")}

                            </p>


                            <button
                                class="btn btn-outline-danger btn-sm delete-schedule"
                                data-id="${schedule.id}"
                            >

                                <i class="bi bi-trash"></i>

                                Delete

                            </button>


                        </div>

                    </div>

                </div>

            `;


            scheduleList.innerHTML +=
                scheduleCard;

        }
    );


    // Delete buttons

    document
        .querySelectorAll(".delete-schedule")
        .forEach(function(button) {


            button.addEventListener(
                "click",
                function() {


                    const id =
                        Number(
                            button.dataset.id
                        );


                    schedules =
                        schedules.filter(
                            function(schedule) {

                                return (
                                    schedule.id !== id
                                );

                            }
                        );


                    saveSchedulesToStorage();
                    displaySchedules();

                }
            );

        });

}


// ==================================================
// INITIAL DISPLAY
// ==================================================

displaySchedules();

// Execute schedules while this web app is open.
let lastScheduleMinute="";
setInterval(async()=>{
 const now=new Date(),hh=String(now.getHours()).padStart(2,"0"),mm=String(now.getMinutes()).padStart(2,"0"),key=`${now.toDateString()}-${hh}:${mm}`;
 if(key===lastScheduleMinute)return; lastScheduleMinute=key; const day=now.toLocaleDateString("en-US",{weekday:"short"});
 for(const s of schedules){if(s.time===`${hh}:${mm}`&&s.days.includes(day)){try{await authFetch(`/api/relay/${s.device}/${s.action}`,{method:"POST",body:JSON.stringify({device_id:localStorage.getItem("smartEnergyDeviceId")||"device1"})});}catch(e){console.error("Schedule command failed",e);}}}
},1000);
