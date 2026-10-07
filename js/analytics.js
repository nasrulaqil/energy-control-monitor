// ==================================================
// SMART ENERGY MONITOR - REAL FIREBASE ANALYTICS
// ==================================================

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const ELECTRICITY_RATE = 0.57;
const ACTIVE_DEVICE_ID = localStorage.getItem("smartEnergyDeviceId") || "device1";

const totalEnergyElement = document.getElementById("totalEnergy");
const averageEnergyElement = document.getElementById("averageEnergy");
const highestEnergyElement = document.getElementById("highestEnergy");
const totalCostElement = document.getElementById("totalCost");

const todayButton = document.getElementById("todayButton");
const weekButton = document.getElementById("weekButton");
const monthButton = document.getElementById("monthButton");
const yearButton = document.getElementById("yearButton");
const buttons = { today: todayButton, week: weekButton, month: monthButton, year: yearButton };

const energyContext = document.getElementById("energyChart");
const costContext = document.getElementById("costChart");

const energyChart = new Chart(energyContext, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Energy (kWh)", data: [], borderWidth: 3, tension: 0.3, fill: false }] },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Energy (kWh)" } } },
        plugins: { legend: { display: true } }
    }
});

const costChart = new Chart(costContext, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Cost (RM)", data: [], borderWidth: 1 }] },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Cost (RM)" } } },
        plugins: { legend: { display: true } }
    }
});

function setActiveButton(period) {
    Object.entries(buttons).forEach(([key, button]) => {
        if (!button) return;
        button.classList.toggle("btn-primary", key === period);
        button.classList.toggle("btn-light", key !== period);
        button.disabled = false;
    });
}

function setLoading(period) {
    Object.values(buttons).forEach(button => { if (button) button.disabled = true; });
    if (totalEnergyElement) totalEnergyElement.textContent = "Loading...";
    if (averageEnergyElement) averageEnergyElement.textContent = "-- kWh";
    if (highestEnergyElement) highestEnergyElement.textContent = "-- kWh";
    if (totalCostElement) totalCostElement.textContent = "RM --";
    setActiveButton(period);
    Object.values(buttons).forEach(button => { if (button) button.disabled = true; });
}

function updateAnalytics(data) {
    const total = Number(data.total_energy) || 0;
    const average = Number(data.average_energy) || 0;
    const highest = Number(data.highest_energy) || 0;
    const totalCost = Number(data.total_cost) || 0;

    totalEnergyElement.textContent = `${total.toFixed(4)} kWh`;
    averageEnergyElement.textContent = `${average.toFixed(4)} kWh`;
    highestEnergyElement.textContent = `${highest.toFixed(4)} kWh`;
    totalCostElement.textContent = `RM ${totalCost.toFixed(2)}`;

    energyChart.data.labels = data.labels || [];
    energyChart.data.datasets[0].data = (data.energy || []).map(Number);
    energyChart.update();

    costChart.data.labels = data.labels || [];
    costChart.data.datasets[0].data = (data.cost || []).map(Number);
    costChart.update();
}

function showAnalyticsError() {
    totalEnergyElement.textContent = "Unavailable";
    averageEnergyElement.textContent = "-- kWh";
    highestEnergyElement.textContent = "-- kWh";
    totalCostElement.textContent = "RM --";
    energyChart.data.labels = [];
    energyChart.data.datasets[0].data = [];
    energyChart.update();
    costChart.data.labels = [];
    costChart.data.datasets[0].data = [];
    costChart.update();
}

let currentPeriod = "today";
let requestId = 0;

async function loadAnalytics(period = currentPeriod) {
    currentPeriod = period;
    const myRequest = ++requestId;
    setLoading(period);

    try {
        const response = await authFetch(`/api/energy/analytics?period=${encodeURIComponent(period)}&device_id=${encodeURIComponent(ACTIVE_DEVICE_ID)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result.status !== "OK" || !result.data) throw new Error(result.message || "Invalid analytics response");
        if (myRequest !== requestId) return;
        updateAnalytics(result.data);
    } catch (error) {
        console.error("Analytics load error:", error);
        if (myRequest === requestId) showAnalyticsError();
    } finally {
        if (myRequest === requestId) setActiveButton(period);
    }
}

todayButton?.addEventListener("click", () => loadAnalytics("today"));
weekButton?.addEventListener("click", () => loadAnalytics("week"));
monthButton?.addEventListener("click", () => loadAnalytics("month"));
yearButton?.addEventListener("click", () => loadAnalytics("year"));

loadAnalytics("today");
setInterval(() => loadAnalytics(currentPeriod), 15000);
