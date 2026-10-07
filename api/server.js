const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================================
// SETTINGS
// =====================================================

const ELECTRICITY_RATE = 0.57;

const DEFAULT_DEVICE_ID = "device1";

const MQTT_BROKER = "mqtt://localhost:1883";

const MQTT_DATA_TOPIC = "smartsocket/+/data";



// =====================================================
// FIREBASE ADMIN
// =====================================================

const serviceAccount = require(
    path.join(__dirname, "serviceAccountKey.json")
);

initializeApp({
    credential: cert(serviceAccount),

    databaseURL:
        "https://energy-control-monitor-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase();
const firebaseAuth = getAuth();

console.log("FIREBASE ADMIN INITIALIZED");


// =====================================================
// FIREBASE REFERENCES ARE CREATED PER DEVICE
// =====================================================

function safeDeviceId(value) {
    const id = String(value || "").trim();
    return /^[A-Za-z0-9_-]{3,40}$/.test(id) ? id : null;
}

// =====================================================
// ENERGY CALCULATION
// =====================================================
//
// ESP32 energy boleh reset kepada 0 apabila session baru.
// Jadi kita tak boleh guna:
//
// MAX(energy) - MIN(energy)
//
// Function ini handle energy reset.
//

function calculateEnergyFromRows(rows) {

    if (
        !Array.isArray(rows) ||
        rows.length < 2
    ) {
        return 0;
    }

    let total = 0;

    for (
        let i = 1;
        i < rows.length;
        i++
    ) {

        const prev =
            Number(rows[i - 1].energy);

        const curr =
            Number(rows[i].energy);

        if (
            !Number.isFinite(prev) ||
            !Number.isFinite(curr)
        ) {
            continue;
        }

        const delta =
            curr - prev;

        if (delta >= 0) {

            total += delta;

        } else {

            // ESP32/session reset
            total += Math.max(
                curr,
                0
            );
        }
    }

    return Math.max(
        total,
        0
    );
}


// =====================================================
// DATE HELPERS
// =====================================================

function localDateKey(value) {

    const d =
        new Date(value);

    const y =
        d.getFullYear();

    const m =
        String(
            d.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            d.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${y}-${m}-${day}`;
}


function isToday(date) {

    const now =
        new Date();

    return (
        date.getFullYear() ===
            now.getFullYear() &&

        date.getMonth() ===
            now.getMonth() &&

        date.getDate() ===
            now.getDate()
    );
}


function isCurrentMonth(date) {

    const now =
        new Date();

    return (
        date.getFullYear() ===
            now.getFullYear() &&

        date.getMonth() ===
            now.getMonth()
    );
}


function isCurrentYear(date) {

    const now =
        new Date();

    return (
        date.getFullYear() ===
        now.getFullYear()
    );
}


function isLast7Days(date) {

    const now =
        new Date();

    const start =
        new Date();

    start.setHours(
        0,
        0,
        0,
        0
    );

    start.setDate(
        start.getDate() - 6
    );

    return (
        date >= start &&
        date <= now
    );
}


// =====================================================
// FIREBASE HISTORY → ARRAY
// =====================================================

async function getHistoryRows(deviceId = DEFAULT_DEVICE_ID) {

    const historyRef = db.ref(`devices/${deviceId}/history`);
    const snapshot =
        await historyRef.once("value");

    if (
        !snapshot.exists()
    ) {
        return [];
    }

    const rows = [];

    snapshot.forEach(
        (childSnapshot) => {

            const value =
                childSnapshot.val() || {};

            rows.push({
                id:
                    childSnapshot.key,

                device_id:
                    value.device_id ||
                    deviceId,

                voltage:
                    Number(
                        value.voltage || 0
                    ),

                current:
                    Number(
                        value.current || 0
                    ),

                power:
                    Number(
                        value.power || 0
                    ),

                energy:
                    Number(
                        value.energy || 0
                    ),

                cost:
                    Number(
                        value.cost || 0
                    ),

                relay_status:
                    value.relay_status ||
                    "OFF",

                relay1_status:
                    value.relay1_status ||
                    "OFF",

                relay2_status:
                    value.relay2_status ||
                    "OFF",

                relay3_status:
                    value.relay3_status ||
                    "OFF",

                load_detected:
                    Boolean(
                        value.load_detected
                    ),

                recorded_at:
                    value.recorded_at ||
                    value.timestamp ||
                    null,

                timestamp:
                    Number(
                        value.timestamp_ms ||
                        0
                    )
            });
        }
    );


    // Oldest → newest
    // Important untuk energy calculation.

    rows.sort(
        (a, b) => {

            const timeA =
                new Date(
                    a.recorded_at
                ).getTime();

            const timeB =
                new Date(
                    b.recorded_at
                ).getTime();

            return (
                timeA -
                timeB
            );
        }
    );


    return rows;
}


// =====================================================
// MQTT CONNECTION
// =====================================================

const mqttClient =
    mqtt.connect(
        MQTT_BROKER
    );


mqttClient.on(
    "connect",
    () => {

        console.log(
            "MQTT CONNECTED"
        );

        mqttClient.subscribe(
            MQTT_DATA_TOPIC,
            (error) => {

                if (error) {

                    console.error(
                        "MQTT SUBSCRIBE ERROR:",
                        error.message
                    );

                } else {

                    console.log(
                        "SUBSCRIBED TO:",
                        MQTT_DATA_TOPIC
                    );
                }
            }
        );
    }
);


// =====================================================
// MQTT ERROR
// =====================================================

mqttClient.on(
    "error",
    (error) => {

        console.error(
            "MQTT ERROR:",
            error.message
        );
    }
);


// =====================================================
// RECEIVE MQTT DATA
// =====================================================

mqttClient.on(
    "message",
    async (topic, message) => {

        const topicMatch = topic.match(/^smartsocket\/([A-Za-z0-9_-]{3,40})\/data$/);
        if (!topicMatch) return;
        const deviceId = topicMatch[1];

        console.log(
            "MQTT MESSAGE:",
            message.toString()
        );

        try {

            const data =
                JSON.parse(
                    message.toString()
                );


            // -----------------------------------------
            // VALIDATE / CONVERT SENSOR VALUES
            // -----------------------------------------

            const voltage =
                Number(
                    data.voltage || 0
                );

            const current =
                Number(
                    data.current || 0
                );

            const power =
                Number(
                    data.power || 0
                );

            const energy =
                Number(
                    data.energy || 0
                );

            const cost =
                Number.isFinite(
                    Number(data.cost)
                )
                    ? Number(data.cost)
                    : energy *
                      ELECTRICITY_RATE;


            const relay1Status =
                data.relay1_status ||
                "OFF";

            const relay2Status =
                data.relay2_status ||
                "OFF";

            const relay3Status =
                data.relay3_status ||
                "OFF";


            const relayStatus =
                data.relay_status ||
                (
                    relay1Status === "ON" ||
                    relay2Status === "ON" ||
                    relay3Status === "ON"
                        ? "ON"
                        : "OFF"
                );


            const loadDetected =
                data.load_detected === true ||
                data.load_detected === "true";


            // -----------------------------------------
            // TIMESTAMP
            // -----------------------------------------

            const now =
                new Date();

            const timestampMs =
                Date.now();

            const recordedAt =
                now.toISOString();


            // -----------------------------------------
            // FIREBASE OBJECT
            // -----------------------------------------

            const record = {

                device_id:
                    deviceId,

                voltage:
                    Number.isFinite(voltage)
                        ? voltage
                        : 0,

                current:
                    Number.isFinite(current)
                        ? current
                        : 0,

                power:
                    Number.isFinite(power)
                        ? power
                        : 0,

                energy:
                    Number.isFinite(energy)
                        ? energy
                        : 0,

                cost:
                    Number.isFinite(cost)
                        ? cost
                        : 0,

                relay_status:
                    relayStatus,

                relay1_status:
                    relay1Status,

                relay2_status:
                    relay2Status,

                relay3_status:
                    relay3Status,

                load_detected:
                    loadDetected,

                recorded_at:
                    recordedAt,

                timestamp_ms:
                    timestampMs
            };


            // =========================================
            // UPDATE LIVE DATA
            // =========================================

            const liveRef = db.ref(`devices/${deviceId}/live`);
            const historyRef = db.ref(`devices/${deviceId}/history`);
            await db.ref(`devices/${deviceId}/meta`).update({
                last_seen: recordedAt,
                online: true
            });
            await liveRef.set(record);


            // =========================================
            // SAVE HISTORY
            // =========================================

            const newHistoryRef =
                historyRef.push();

            await newHistoryRef.set(
                record
            );


            console.log(
                "DATA SAVED TO FIREBASE:",
                newHistoryRef.key
            );

        }

        catch (error) {

            console.error(
                "FIREBASE/MQTT DATA ERROR:",
                error.message
            );
        }
    }
);


// =====================================================
// GET LATEST ENERGY DATA
// =====================================================

app.get(
    "/api/energy/latest",

    async (req, res) => {

        try {

            const deviceId = safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID;
            const snapshot =
                await db.ref(`devices/${deviceId}/live`).once(
                    "value"
                );

            if (
                !snapshot.exists()
            ) {

                return res.json({
                    status:
                        "OK",

                    data:
                        null
                });
            }


            res.json({
                status:
                    "OK",

                data:
                    snapshot.val()
            });

        }

        catch (error) {

            console.error(
                "LATEST API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({
                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);


// =====================================================
// TODAY ENERGY
// =====================================================

app.get(
    "/api/energy/today",

    async (req, res) => {

        try {

            const rows =
                await getHistoryRows(safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID);


            const todayRows =
                rows.filter(
                    (row) => {

                        if (
                            !row.recorded_at
                        ) {
                            return false;
                        }

                        const date =
                            new Date(
                                row.recorded_at
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            isToday(date)
                        );
                    }
                );


            const todayEnergy =
                calculateEnergyFromRows(
                    todayRows
                );


            res.json({

                status:
                    "OK",

                today_energy:
                    todayEnergy,

                today_cost:
                    todayEnergy *
                    ELECTRICITY_RATE
            });

        }

        catch (error) {

            console.error(
                "TODAY API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({

                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);


// =====================================================
// MONTHLY ENERGY
// =====================================================

app.get(
    "/api/energy/monthly",

    async (req, res) => {

        try {

            const rows =
                await getHistoryRows(safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID);


            const monthRows =
                rows.filter(
                    (row) => {

                        if (
                            !row.recorded_at
                        ) {
                            return false;
                        }

                        const date =
                            new Date(
                                row.recorded_at
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            isCurrentMonth(
                                date
                            )
                        );
                    }
                );


            const monthlyEnergy =
                calculateEnergyFromRows(
                    monthRows
                );


            res.json({

                status:
                    "OK",

                monthly_energy:
                    monthlyEnergy,

                monthly_cost:
                    monthlyEnergy *
                    ELECTRICITY_RATE
            });

        }

        catch (error) {

            console.error(
                "MONTHLY API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({

                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);


// =====================================================
// SUMMARY
// =====================================================

app.get(
    "/api/energy/summary",

    async (req, res) => {

        try {

            const rows =
                await getHistoryRows(safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID);


            const todayRows =
                rows.filter(
                    (row) => {

                        if (
                            !row.recorded_at
                        ) {
                            return false;
                        }

                        const date =
                            new Date(
                                row.recorded_at
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            isToday(date)
                        );
                    }
                );


            const monthRows =
                rows.filter(
                    (row) => {

                        if (
                            !row.recorded_at
                        ) {
                            return false;
                        }

                        const date =
                            new Date(
                                row.recorded_at
                            );

                        return (
                            !Number.isNaN(
                                date.getTime()
                            ) &&
                            isCurrentMonth(
                                date
                            )
                        );
                    }
                );


            const todayEnergy =
                calculateEnergyFromRows(
                    todayRows
                );


            const monthlyEnergy =
                calculateEnergyFromRows(
                    monthRows
                );


            res.json({

                status:
                    "OK",

                today_energy:
                    todayEnergy,

                today_cost:
                    todayEnergy *
                    ELECTRICITY_RATE,

                monthly_energy:
                    monthlyEnergy,

                monthly_cost:
                    monthlyEnergy *
                    ELECTRICITY_RATE
            });

        }

        catch (error) {

            console.error(
                "SUMMARY API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({

                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);


// =====================================================
// HISTORY
// =====================================================

app.get(
    "/api/energy/history",

    async (req, res) => {

        try {

            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit
                        ) || 500,
                        1
                    ),
                    5000
                );


            const rows =
                await getHistoryRows(safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID);


            // Newest first untuk History UI

            const history =
                rows
                    .slice()
                    .reverse()
                    .slice(
                        0,
                        limit
                    );


            res.json({

                status:
                    "OK",

                data:
                    history
            });

        }

        catch (error) {

            console.error(
                "HISTORY API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({

                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);


// =====================================================
// ANALYTICS
// =====================================================

function buildAnalytics(
    rows,
    period
) {

    const rate =
        ELECTRICITY_RATE;

    const now =
        new Date();

    const buckets =
        [];


    // -----------------------------------------
    // TODAY = 24 HOURS
    // -----------------------------------------

    if (
        period === "today"
    ) {

        for (
            let h = 0;
            h < 24;
            h++
        ) {

            buckets.push({

                key:
                    String(h),

                label:
                    `${String(h).padStart(
                        2,
                        "0"
                    )}:00`,

                rows:
                    []
            });
        }
    }


    // -----------------------------------------
    // WEEK = LAST 7 DAYS
    // -----------------------------------------

    else if (
        period === "week"
    ) {

        for (
            let i = 6;
            i >= 0;
            i--
        ) {

            const d =
                new Date(now);

            d.setHours(
                0,
                0,
                0,
                0
            );

            d.setDate(
                d.getDate() - i
            );


            buckets.push({

                key:
                    localDateKey(d),

                label:
                    d.toLocaleDateString(
                        "en-MY",
                        {
                            weekday:
                                "short",

                            day:
                                "2-digit"
                        }
                    ),

                rows:
                    []
            });
        }
    }


    // -----------------------------------------
    // MONTH = EACH DAY
    // -----------------------------------------

    else if (
        period === "month"
    ) {

        const days =
            new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0
            ).getDate();


        for (
            let day = 1;
            day <= days;
            day++
        ) {

            const d =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    day
                );


            buckets.push({

                key:
                    localDateKey(d),

                label:
                    String(day),

                rows:
                    []
            });
        }
    }


    // -----------------------------------------
    // YEAR = 12 MONTHS
    // -----------------------------------------

    else {

        for (
            let m = 0;
            m < 12;
            m++
        ) {

            const d =
                new Date(
                    now.getFullYear(),
                    m,
                    1
                );


            buckets.push({

                key:
                    String(m),

                label:
                    d.toLocaleDateString(
                        "en-MY",
                        {
                            month:
                                "short"
                        }
                    ),

                rows:
                    []
            });
        }
    }


    // =========================================
    // PUT RECORDS INTO BUCKET
    // =========================================

    const bucketMap =
        new Map(
            buckets.map(
                (bucket) => [
                    bucket.key,
                    bucket
                ]
            )
        );


    for (
        const row of rows
    ) {

        if (
            !row.recorded_at
        ) {
            continue;
        }


        const d =
            new Date(
                row.recorded_at
            );


        if (
            Number.isNaN(
                d.getTime()
            )
        ) {
            continue;
        }


        let key;


        if (
            period === "today"
        ) {

            key =
                String(
                    d.getHours()
                );

        }

        else if (
            period === "year"
        ) {

            key =
                String(
                    d.getMonth()
                );

        }

        else {

            key =
                localDateKey(d);
        }


        const bucket =
            bucketMap.get(
                key
            );


        if (
            bucket
        ) {

            bucket.rows.push(
                row
            );
        }
    }


    // =========================================
    // CALCULATE EACH BUCKET
    // =========================================

    const energy =
        buckets.map(
            (bucket) =>
                calculateEnergyFromRows(
                    bucket.rows
                )
        );


    const cost =
        energy.map(
            (value) =>
                value * rate
        );


    const totalEnergy =
        energy.reduce(
            (a, b) =>
                a + b,
            0
        );


    const active =
        energy.filter(
            (value) =>
                value > 0
        );


    const averageEnergy =
        active.length
            ? totalEnergy /
              active.length
            : 0;


    const highestEnergy =
        energy.length
            ? Math.max(
                ...energy
            )
            : 0;


    return {

        labels:
            buckets.map(
                (bucket) =>
                    bucket.label
            ),

        energy,

        cost,

        total_energy:
            totalEnergy,

        average_energy:
            averageEnergy,

        highest_energy:
            highestEnergy,

        total_cost:
            totalEnergy *
            rate,

        record_count:
            rows.length
    };
}


// =====================================================
// ANALYTICS API
// =====================================================

app.get(
    "/api/energy/analytics",

    async (req, res) => {

        try {

            const period =
                [
                    "today",
                    "week",
                    "month",
                    "year"
                ].includes(
                    req.query.period
                )
                    ? req.query.period
                    : "today";


            const allRows =
                await getHistoryRows(safeDeviceId(req.query.device_id) || DEFAULT_DEVICE_ID);


            const rows =
                allRows.filter(
                    (row) => {

                        if (
                            !row.recorded_at
                        ) {
                            return false;
                        }


                        const date =
                            new Date(
                                row.recorded_at
                            );


                        if (
                            Number.isNaN(
                                date.getTime()
                            )
                        ) {
                            return false;
                        }


                        if (
                            period === "today"
                        ) {

                            return isToday(
                                date
                            );
                        }


                        if (
                            period === "week"
                        ) {

                            return isLast7Days(
                                date
                            );
                        }


                        if (
                            period === "month"
                        ) {

                            return isCurrentMonth(
                                date
                            );
                        }


                        return isCurrentYear(
                            date
                        );
                    }
                );


            res.json({

                status:
                    "OK",

                period,

                data:
                    buildAnalytics(
                        rows,
                        period
                    )
            });

        }

        catch (error) {

            console.error(
                "ANALYTICS API ERROR:",
                error.message
            );

            res
                .status(500)
                .json({

                    status:
                        "ERROR",

                    message:
                        error.message
                });
        }
    }
);



// =====================================================
// AUTH / SHARED SETTINGS / USERS / NOTIFICATIONS
// =====================================================

app.post("/api/register", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!name || !email || password.length < 6) {
            return res.status(400).json({status:"ERROR", message:"Name, valid email and password (minimum 6 characters) are required"});
        }

        const usersSnap = await db.ref("users").once("value");
        const role = usersSnap.exists() ? "user" : "admin";
        const created = await firebaseAuth.createUser({email, password, displayName:name});
        const profile = {
            uid: created.uid,
            email,
            name,
            role,
            can_control_relays: true,
            created_at: new Date().toISOString(),
            created_by: "self_registration"
        };
        await db.ref(`users/${created.uid}`).set(profile);

        const notification = {
            type: "new_user",
            title: "New user registered",
            message: `${name} (${email}) registered a new account.`,
            created_at: new Date().toISOString(),
            created_by: created.uid
        };
        await db.ref("notifications").push(notification);

        res.status(201).json({status:"OK", message:"Account created successfully", data:{uid:created.uid,email,name,role}});
    } catch (error) {
        const msg = error.code === "auth/email-already-exists" ? "Email is already registered" : error.message;
        res.status(400).json({status:"ERROR", message:msg});
    }
});


async function requireUser(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) return res.status(401).json({status:"ERROR", message:"Authentication required"});
        req.user = await firebaseAuth.verifyIdToken(header.slice(7));
        next();
    } catch (error) {
        res.status(401).json({status:"ERROR", message:"Invalid or expired login"});
    }
}

async function getOrCreateProfile(decoded) {
    const ref = db.ref(`users/${decoded.uid}`);
    const snap = await ref.once("value");
    if (snap.exists()) return snap.val();
    const usersSnap = await db.ref("users").once("value");
    const profile = {
        uid: decoded.uid,
        email: decoded.email || "",
        name: decoded.name || (decoded.email ? decoded.email.split("@")[0] : "User"),
        role: usersSnap.exists() ? "user" : "admin",
        can_control_relays: true,
        created_at: new Date().toISOString()
    };
    await ref.set(profile);
    return profile;
}

async function requireAdmin(req, res, next) {
    try {
        const profile = await getOrCreateProfile(req.user);
        if (profile.role !== "admin") return res.status(403).json({status:"ERROR", message:"Admin access required"});
        req.profile = profile;
        next();
    } catch (error) {
        res.status(500).json({status:"ERROR", message:error.message});
    }
}

app.post("/api/relay/:relay/:action", requireUser, async (req,res) => {
    const profile = await getOrCreateProfile(req.user);
    if (!profile.can_control_relays) return res.status(403).json({status:"ERROR",message:"Relay control is not allowed for this user"});
    const relay = String(req.params.relay || "").toUpperCase();
    const action = String(req.params.action || "").toUpperCase();
    if (!["R1","R2","R3","ALL"].includes(relay) || !["ON","OFF"].includes(action)) return res.status(400).json({status:"ERROR",message:"Invalid relay command"});
    const deviceId = safeDeviceId(req.body.device_id || req.query.device_id || profile.device_id);
    if (!deviceId) return res.status(400).json({status:"ERROR",message:"No ESP32 device connected"});
    const command = `${relay}_${action}`;
    const controlTopic = `smartsocket/${deviceId}/control`;
    mqttClient.publish(controlTopic, command, {qos:1}, error => {
        if (error) return res.status(500).json({status:"ERROR",message:error.message});
        res.json({status:"OK",command});
    });
});

app.get("/api/auth/profile", requireUser, async (req,res) => {
    try { res.json({status:"OK", data: await getOrCreateProfile(req.user)}); }
    catch(error){ res.status(500).json({status:"ERROR", message:error.message}); }
});

app.get("/api/settings/relay-names", requireUser, async (req,res) => {
    const profile = await getOrCreateProfile(req.user);
    const deviceId = safeDeviceId(req.query.device_id || profile.device_id);
    if (!deviceId) return res.status(400).json({status:"ERROR",message:"No ESP32 device connected"});
    const snap = await db.ref(`devices/${deviceId}/settings/relay_names`).once("value");
    res.json({status:"OK", data:snap.val() || {relay1:"Socket 1",relay2:"Socket 2",relay3:"Socket 3"}});
});

app.put("/api/settings/relay-names", requireUser, async (req,res) => {
    const profile = await getOrCreateProfile(req.user);
    const deviceId = safeDeviceId(req.body.device_id || req.query.device_id || profile.device_id);
    if (!deviceId) return res.status(400).json({status:"ERROR",message:"No ESP32 device connected"});
    const current = (await db.ref(`devices/${deviceId}/settings/relay_names`).once("value")).val() || {};
    const clean = {};
    for (const key of ["relay1","relay2","relay3"]) {
        if (req.body[key] !== undefined) clean[key] = String(req.body[key]).trim().slice(0,40) || current[key] || key;
    }
    await db.ref(`devices/${deviceId}/settings/relay_names`).update(clean);
    res.json({status:"OK", data:{...current,...clean}});
});

app.get("/api/device/status", requireUser, async (req,res) => {
    const profile = await getOrCreateProfile(req.user);
    const deviceId = safeDeviceId(profile.device_id);
    if (!deviceId) return res.json({status:"OK", connected:false, device_id:null});
    const live = await db.ref(`devices/${deviceId}/live`).once("value");
    res.json({status:"OK", connected:live.exists(), device_id:deviceId, data:live.val() || null});
});

app.post("/api/device/connect", requireUser, async (req,res) => {
    const deviceId = safeDeviceId(req.body.device_id);
    if (!deviceId) return res.status(400).json({status:"ERROR", message:"Device ID must be 3-40 characters: letters, numbers, - or _"});
    const liveSnap = await db.ref(`devices/${deviceId}/live`).once("value");
    if (!liveSnap.exists()) return res.status(404).json({status:"ERROR", message:"ESP32 not detected. Power it on, connect it to WiFi/MQTT, then try again."});
    const liveData = liveSnap.val() || {};
    const lastSeen = new Date(liveData.recorded_at || 0).getTime();
    if (!lastSeen || Date.now() - lastSeen > 120000) return res.status(408).json({status:"ERROR", message:"ESP32 was found but is not online now. Wait for a fresh MQTT reading and try again."});
    const ownerSnap = await db.ref(`devices/${deviceId}/owner_uid`).once("value");
    if (ownerSnap.exists() && ownerSnap.val() !== req.user.uid) return res.status(409).json({status:"ERROR", message:"This ESP32 is already linked to another account."});
    await db.ref(`devices/${deviceId}`).update({owner_uid:req.user.uid, paired_at:new Date().toISOString()});
    await db.ref(`users/${req.user.uid}`).update({device_id:deviceId});
    await db.ref("notifications").push({type:"device_connected",title:"ESP32 connected",message:`Device ${deviceId} was connected successfully.`,created_at:new Date().toISOString(),created_by:req.user.uid});
    res.json({status:"OK", message:"ESP32 connected successfully", device_id:deviceId});
});

app.post("/api/device/disconnect", requireUser, async (req,res) => {
    const profile = await getOrCreateProfile(req.user);
    const deviceId = safeDeviceId(profile.device_id);
    if (deviceId) await db.ref(`devices/${deviceId}/owner_uid`).remove();
    await db.ref(`users/${req.user.uid}/device_id`).remove();
    res.json({status:"OK"});
});

app.get("/api/users", requireUser, requireAdmin, async (req,res) => {
    const snap = await db.ref("users").once("value");
    const data = snap.val() || {};
    res.json({status:"OK", data:Object.values(data)});
});

app.post("/api/users", requireUser, requireAdmin, async (req,res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        if (!name || !email || password.length < 6) return res.status(400).json({status:"ERROR", message:"Name, valid email and password (minimum 6 characters) are required"});
        const created = await firebaseAuth.createUser({email,password,displayName:name});
        const profile = {uid:created.uid,email,name,role:"user",can_control_relays:true,device_id:req.profile?.device_id || null,created_at:new Date().toISOString(),created_by:req.user.uid};
        await db.ref(`users/${created.uid}`).set(profile);
        const notification = {type:"new_user",title:"New user added",message:`${name} (${email}) can now control the 3 relays.`,created_at:new Date().toISOString(),created_by:req.user.uid};
        await db.ref("notifications").push(notification);
        res.status(201).json({status:"OK", data:profile});
    } catch(error) {
        const msg = error.code === "auth/email-already-exists" ? "Email is already registered" : error.message;
        res.status(400).json({status:"ERROR", message:msg});
    }
});

app.get("/api/notifications", requireUser, async (req,res) => {
    const snap = await db.ref("notifications").limitToLast(20).once("value");
    const list=[]; snap.forEach(c=>list.push({id:c.key,...c.val()}));
    list.reverse();
    res.json({status:"OK",data:list});
});


// =====================================================
// TEST API
// =====================================================

app.get(
    "/",

    (req, res) => {

        res.json({

            status:
                "OK",

            message:
                "Smart Energy Firebase API is running",

            database:
                "Firebase Realtime Database",

            device:
                "dynamic"
        });
    }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
    3000;


app.listen(
    PORT,

    () => {

        console.log(
            `API SERVER RUNNING ON PORT ${PORT}`
        );

        console.log(
            "DATABASE: FIREBASE REALTIME DATABASE"
        );

        console.log(
            "DEVICE MODE: DYNAMIC ESP32 PAIRING"
        );
    }
);