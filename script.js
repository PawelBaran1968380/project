/***********************
 * VIRTUAL IDENTITY
 * Multi-user + 4-digit PIN, per-user city stats (Top 3) + last city auto-load
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

const favsWrap = document.getElementById("favourites");
const favButtons = document.getElementById("favButtons");

function getUsers() {
  // users stored as:
  // {
  //   "Alice": { pin: "1234", stats: {"London": 3}, lastCity: "London" },
  //   "Bob":   { pin: "4321", stats: {}, lastCity: null }
  // }
  const raw = localStorage.getItem("users");
  let obj = {};
  try { obj = raw ? JSON.parse(raw) : {}; } catch { obj = {}; }

  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "string") obj[k] = { pin: obj[k], stats: {}, lastCity: null };
    if (!obj[k].stats) obj[k].stats = {};
    if (!obj[k].hasOwnProperty("lastCity")) obj[k].lastCity = null;
  }
  return obj;
}
function saveUsers(users) { localStorage.setItem("users", JSON.stringify(users)); }
function setCurrentUser(name) { localStorage.setItem("currentUser", name); }
function getCurrentUser() { return localStorage.getItem("currentUser"); }
function clearMsg() { authMsg.textContent = ""; }
function showError(msg) { authMsg.textContent = msg; }

function showWelcome(name) {
  userDisplay.textContent = name;
  loginSection.style.display = "none";
  welcomeSection.style.display = "block";
  favsWrap.style.display = "block";
  renderTopCities();
  clearMsg();
  loadLastCityWeather(); // auto-load last city
}
function showLogin() {
  welcomeSection.style.display = "none";
  loginSection.style.display = "block";
  favsWrap.style.display = "none";
}

function validPin(pin) { return /^\d{4}$/.test(pin); }

function createAccount() {
  clearMsg();
  const name = (usernameInput.value || "").trim();
  const pin = (pinInput.value || "").trim();

  if (!name || !pin) return showError("Enter name and 4-digit PIN.");
  if (!validPin(pin)) return showError("PIN must be exactly 4 digits.");

  const users = getUsers();
  if (users[name]) return showError("User already exists. Use Sign In.");

  users[name] = { pin, stats: {}, lastCity: null };
  saveUsers(users);
  setCurrentUser(name);
  usernameInput.value = "";
  pinInput.value = "";
  showWelcome(name);
}

function signIn() {
  clearMsg();
  const name = (usernameInput.value || "").trim();
  const pin = (pinInput.value || "").trim();

  if (!name || !pin) return showError("Enter name and 4-digit PIN.");
  if (!validPin(pin)) return showError("PIN must be exactly 4 digits.");

  const users = getUsers();
  if (!users[name]) return showError("User does not exist. Create Account first.");
  if (users[name].pin !== pin) return showError("Incorrect PIN.");

  setCurrentUser(name);
  usernameInput.value = "";
  pinInput.value = "";
  showWelcome(name);
}

function logoutUser() {
  localStorage.removeItem("currentUser");
  showLogin();
  usernameInput.focus();
}

createBtn.addEventListener("click", createAccount);
loginBtn.addEventListener("click", signIn);
logoutBtn.addEventListener("click", logoutUser);
pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });

/***********************
 * FAVOURITES (Top 3 most checked cities per user)
 ***********************/
function incrementCityStat(city) {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  if (!users[user]) return;

  const stats = users[user].stats || {};
  const key = city.trim();
  stats[key] = (stats[key] || 0) + 1;
  users[user].stats = stats;
  users[user].lastCity = city; // zapamiętaj ostatnie miasto
  saveUsers(users);
}

function getTopCities(limit = 3) {
  const user = getCurrentUser();
  if (!user) return [];
  const users = getUsers();
  const stats = users[user]?.stats || {};
  const entries = Object.entries(stats);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, limit).map(e => e[0]);
}

function renderTopCities() {
  const top = getTopCities(3);
  favButtons.innerHTML = "";
  if (top.length === 0) {
    favButtons.innerHTML = `<p class="msg" style="color:#666;margin-top:4px;">Your most checked cities will appear here.</p>`;
    return;
  }
  top.forEach(city => {
    const btn = document.createElement("button");
    btn.className = "fav-btn";
    btn.textContent = city;
    btn.addEventListener("click", () => fetchWeather(city));
    favButtons.appendChild(btn);
  });
}

/***********************
 * CLOCK
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
 * WEATHER (Open-Meteo)
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
  return data.results[0];
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
    currentTimezone = data.timezone || "UTC";

    incrementCityStat(name);
    renderTopCities();

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

/***********************
 * AUTO-LOAD last city
 ***********************/
function loadLastCityWeather() {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  const last = users[user]?.lastCity;
  if (last) fetchWeather(last);
}

// Restore session UI
(function restoreSessionUI() {
  const current = getCurrentUser();
  const users = getUsers();
  if (current && users[current]) {
    showWelcome(current);
  } else {
    showLogin();
  }
})();
