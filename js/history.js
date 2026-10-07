// SMART ENERGY MONITOR - LIVE HISTORY
const API_HOST = (window.location.hostname && window.location.hostname !== "localhost") ? window.location.hostname : "localhost";
const API_URL = `http://${API_HOST}:3000`;
let historyData = [];
const ACTIVE_DEVICE_ID = localStorage.getItem("smartEnergyDeviceId") || "device1";

const historyTable = document.getElementById("historyTable");
const historyEnergy = document.getElementById("historyEnergy");
const historyCost = document.getElementById("historyCost");
const historyRecords = document.getElementById("historyRecords");
const recordStatus = document.getElementById("recordStatus");
const searchHistory = document.getElementById("searchHistory");
const dateFilter = document.getElementById("dateFilter");
const clearFilter = document.getElementById("clearFilter");

function formatRecord(row) {
    const d = new Date(row.recorded_at);
    return {
        date: d.toLocaleDateString("en-GB"),
        isoDate: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,
        time: d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"}),
        energy: Number(row.energy) || 0,
        cost: Number(row.cost) || 0,
        power: Number(row.power) || 0,
        relay: String(row.relay_status || "OFF").toUpperCase()
    };
}

function displayHistory(data) {
    if (!historyTable) return;
    historyTable.innerHTML = "";
    if (!data.length) {
        historyTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-database-x fs-2"></i><br>No records found.</td></tr>`;
        updateSummary([]); return;
    }
    historyTable.innerHTML = data.map(r => `<tr>
        <td>${r.date}</td><td>${r.time}</td><td>${r.energy.toFixed(4)} kWh</td>
        <td>RM ${r.cost.toFixed(2)}</td><td>${r.power.toFixed(1)} W</td>
        <td><span class="badge ${r.relay === "ON" ? "bg-success" : "bg-danger"}">${r.relay}</span></td>
    </tr>`).join("");
    updateSummary(data);
}

function updateSummary(data) {
    // Stored energy/cost are cumulative session values, so don't sum every 5-second row.
    const latest = data[0] || {energy:0,cost:0};
    if (historyEnergy) historyEnergy.textContent = `${latest.energy.toFixed(4)} kWh`;
    if (historyCost) historyCost.textContent = `RM ${latest.cost.toFixed(2)}`;
    if (historyRecords) historyRecords.textContent = data.length;
    if (recordStatus) recordStatus.textContent = `${data.length} Records`;
}

function applyFilters() {
    const q = (searchHistory?.value || "").trim().toLowerCase();
    const selectedDate = dateFilter?.value || "";
    const filtered = historyData.filter(r => {
        const matchesText = !q || r.date.toLowerCase().includes(q) || r.time.toLowerCase().includes(q) || r.relay.toLowerCase().includes(q);
        const matchesDate = !selectedDate || r.isoDate === selectedDate;
        return matchesText && matchesDate;
    });
    displayHistory(filtered);
}

async function loadHistory() {
    if (recordStatus) recordStatus.textContent = "Loading...";
    try {
        const response = await authFetch(`/api/energy/history?limit=1000&device_id=${encodeURIComponent(ACTIVE_DEVICE_ID)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result.status !== "OK") throw new Error(result.message || "API error");
        historyData = (result.data || []).map(formatRecord);
        applyFilters();
    } catch (error) {
        console.error("History load error:", error);
        if (recordStatus) recordStatus.textContent = "API Offline";
        if (historyTable) historyTable.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">Unable to load history. Start the Node.js API server.</td></tr>`;
    }
}

searchHistory?.addEventListener("input", applyFilters);
dateFilter?.addEventListener("change", applyFilters);
clearFilter?.addEventListener("click", () => { searchHistory.value = ""; dateFilter.value = ""; applyFilters(); });
loadHistory();
setInterval(loadHistory, 15000);
