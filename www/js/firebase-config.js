const firebaseConfig = {
  apiKey: "AIzaSyBH4kf_m14VC7_StQMWaMD4fisDdYj7fO0",
  authDomain: "energy-control-monitor.firebaseapp.com",
  databaseURL: "https://energy-control-monitor-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "energy-control-monitor",
  storageBucket: "energy-control-monitor.firebasestorage.app",
  messagingSenderId: "1092841440021",
  appId: "1:1092841440021:web:59ac1e9618d75bfdb15f1c"
};
firebase.initializeApp(firebaseConfig);
window.firebaseAuth = firebase.auth();
// Mobile app cannot use its own localhost for the laptop backend.
// Change this IP when the laptop running Node.js/Mosquitto gets a new IPv4 address.
const DEFAULT_BACKEND_HOST = "10.230.75.45";
const isCapacitorApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const browserHost = window.location.hostname || "localhost";
const backendHost = localStorage.getItem("smartEnergyBackendHost") || (isCapacitorApp ? DEFAULT_BACKEND_HOST : browserHost);
window.smartEnergyBackendHost = backendHost;
window.smartEnergyApiBase = `http://${backendHost}:3000`;
async function getSignedInUser() {
  if (firebase.auth().currentUser) return firebase.auth().currentUser;
  return new Promise(resolve => {
    const stop = firebase.auth().onAuthStateChanged(user => { stop(); resolve(user); });
  });
}
async function authFetch(path, options = {}) {
  const user = await getSignedInUser();
  if (!user) throw new Error("Not logged in");
  const token = await user.getIdToken();
  return fetch(window.smartEnergyApiBase + path, {
    ...options,
    headers: {"Content-Type":"application/json", Authorization:`Bearer ${token}`, ...(options.headers || {})}
  });
}
window.authFetch = authFetch;
