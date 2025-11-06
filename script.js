/***********************
 * VIRTUAL IDENTITY
 * Multi-user + 4-digit PIN with verification
 ***********************/
const loginSection = document.getElementById("login-section");
const welcomeSection = document.getElementById("welcome-section");
const usernameInput = document.getElementById("username");
const pinInput = document.getElementById("pin");
const createBtn = document.getElementById("createBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");
const authMsg = document.getElementById("authMsg");

function getUsers() {
  // users stored as { "Alice": "1234", "Bob": "4321" }
  return JSON.parse(localStorage.getItem("users") || "{}");
}
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}
function setCurrentUser(name) {
  localStorage.setItem("currentUser", name);
}
function getCurrentUser() {
  return localStorage.getItem("currentUser");
}
function clearMsg() { authMsg.textContent = ""; }
function showError(msg) { authMsg.textContent = msg; }
function showWelcome(name) {
  userDisplay.textContent = name;
  loginSection.style.display = "none";
  welcomeSection.style.display = "block";
  clearMsg();
}
function showLogin() {
  welcomeSection.style.display = "none";
  loginSection.style.display = "block";
}

function validPin(pin) {
  return /^\d{4}$/.test(pin);
}

// Create Account flow
function createAccount() {
  clearMsg();
  const name = (usernameInput.value || "").trim();
  const pin = (pinInput.value || "").trim();

  if (!name || !pin) return showError("Enter name and 4-digit PIN.");
  if (!validPin(pin)) return showError("PIN must be exactly 4 digits.");

  const users = getUsers();
  if (users[name]) return showError("User already exists. Use Sign In.");

  users[name] = pin;
  saveUsers(users);
  setCurrentUser(name);
  showWelcome(name);
  usernameInput.value = "";
  pinInput.value = "";
}

// Sign In flow
function signIn() {
  clearMsg();
  const name = (usernameInput.value || "").trim();
  const pin = (pinInput.value || "").trim();

  if (!name || !pin) return showError("Enter name and 4-digit PIN.");
  if (!validPin(pin)) return showError("PIN must be exactly 4 digits.");

  const users = getUsers();
  if (!users[name]) return showError("User does not exist. Create Account first.");
  if (users[name] !== pin) return showError("Incorrect PIN.");

  setCurrentUser(name);
  showWelcome(name);
  usernameInput.value = "";
  pinInput.value = "";
}

// Logout
function logoutUser() {
  localStorage.removeItem("currentUser");
  showLogin();
  usernameInput.focus();
}

// Auto-restore session (no PIN prompt to keep UX simple)
(function restoreSession() {
  const current = getCurrentUser();
  const users = getUsers();
  if (current && users[current]) {
    showWelcome(current);
  } else {
    showLogin();
  }
})();

createBtn.addEventListener("click", createAccount);
loginBtn.addEventListener("click", signIn);
logoutBtn.addEventListener("click", logoutUser);
pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });

/***********************
 * CLOCK
 * Shows time in timezone derived from selected city
 ***********************/
const timeDisplay = document.getElementById("time");
let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function updateClock() {
  const now = new Date();
  const opts = { timeZone: currentTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit" };
  timeDisplay.textContent = new Intl.DateTimeFormat("en-GB", opts).format(now);
}
setInterval(updateClock, 1000);
updateClock();

/***********************
 * WEATHER (Open-Meteo, no API key)
 ***********************/
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

function showMessage(msg) { weatherResult.innerHTML = `<p>${msg}</p>`; }

async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0]; // { latitude, longitude, name, country, ... }
}

function getConditionText(code) {
  const m = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Heavy rain showers", 82: "Violent rain showers"
  };
  return m[code] || `Code ${code}`;
}

async function fetchWeather(city) {
  try {
    if (!city) { showMessage("Please enter a city name."); return; }
    showMessage("Loading weather...");

    const loc = await getCoordinates(city);
    if (!loc) { showMessage("City not found. Try another name."); return; }

    const { latitude, longitude, name, country } = loc;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
    const data = await res.json();

    const cw = data.current_weather;
    if (!cw) { showMessage("No current weather available."); return; }

    const temp = Math.round(cw.temperature);
    const wind = Math.round(cw.windspeed);
    const desc = getConditionText(cw.weathercode);

    // Update timezone for the clock based on city
    currentTimezone = data.timezone || "UTC";

    weatherResult.innerHTML = `
      <div class="card">
        <p><strong>${name}${country ? ", " + country : ""}</strong></p>
        <p style="font-size:22px;">${temp}°C</p>
        <p>${desc}</p>
        <p>Wind: ${wind} km/h</p>
        <p><small>${currentTimezone}</small></p>
      </div>
    `;
  } catch (e) {
    console.error(e);
    showMessage("Error loading weather data.");
  }
}

searchBtn.addEventListener("click", () => fetchWeather(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") fetchWeather(cityInput.value.trim()); });
