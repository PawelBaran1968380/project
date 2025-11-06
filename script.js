// === VIRTUAL IDENTITY WITH PIN ===
const loginSection = document.getElementById("login-section");
const welcomeSection = document.getElementById("welcome-section");
const usernameInput = document.getElementById("username");
const pinInput = document.getElementById("pin");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");

const savedUser = localStorage.getItem("user");
const savedPin = localStorage.getItem("pin");

if (savedUser && savedPin) {
  askForPin(savedUser);
}

function askForPin(name) {
  const enteredPin = prompt(`Welcome back, ${name}! Please enter your PIN:`);
  if (enteredPin === savedPin) {
    showWelcome(name);
  } else {
    alert("Incorrect PIN. Please log in again.");
    localStorage.removeItem("user");
    localStorage.removeItem("pin");
  }
}

function showWelcome(name) {
  userDisplay.textContent = name;
  loginSection.style.display = "none";
  welcomeSection.style.display = "block";
}

function loginUser() {
  const name = usernameInput.value.trim();
  const pin = pinInput.value.trim();

  if (!name || !pin) {
    alert("Please enter both name and PIN!");
    return;
  }

  if (pin.length !== 4 || isNaN(pin)) {
    alert("PIN must be exactly 4 digits.");
    return;
  }

  localStorage.setItem("user", name);
  localStorage.setItem("pin", pin);
  showWelcome(name);
}

function logoutUser() {
  localStorage.removeItem("user");
  localStorage.removeItem("pin");
  welcomeSection.style.display = "none";
  loginSection.style.display = "block";
  usernameInput.value = "";
  pinInput.value = "";
}

loginBtn.addEventListener("click", loginUser);
logoutBtn.addEventListener("click", logoutUser);
pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginUser();
});

// === CLOCK ===
const timeDisplay = document.getElementById("time");
let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function updateClock() {
  const now = new Date();
  const opts = { timeZone: currentTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit" };
  timeDisplay.textContent = new Intl.DateTimeFormat("en-GB", opts).format(now);
}
setInterval(updateClock, 1000);
updateClock();

// === WEATHER (Open-Meteo API) ===
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

function showMessage(msg) {
  weatherResult.innerHTML = `<p>${msg}</p>`;
}

async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

function getConditionText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain"
  };
  return map[code] || "Unknown";
}

async function fetchWeather(city) {
  try {
    if (!city) {
      showMessage("Please enter a city name.");
      return;
    }

    showMessage("Loading weather...");

    const loc = await getCoordinates(city);
    if (!loc) {
      showMessage("City not found.");
      return;
    }

    const { latitude, longitude, name, country } = loc;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    const weather = data.current_weather;
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windspeed);
    const desc = getConditionText(weather.weathercode);
    currentTimezone = data.timezone || "UTC";

    weatherResult.innerHTML = `
      <div class="card">
        <p><strong>${name}, ${country}</strong></p>
        <p style="font-size:22px;">${temp}°C</p>
        <p>${desc}</p>
        <p>Wind: ${wind} km/h</p>
        <p><small>${currentTimezone}</small></p>
      </div>
    `;
  } catch (error) {
    console.error(error);
    showMessage("Error loading weather data.");
  }
}

searchBtn.addEventListener("click", () => fetchWeather(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchWeather(cityInput.value.trim());
});
