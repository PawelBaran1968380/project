
// === GLOBAL CLOCK + WEATHER (Open-Meteo) ===
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");
const timeDisplay = document.getElementById("time");

let currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // default — local timezone

// Show messages
function showMessage(msg) {
  weatherResult.innerHTML = `<p>${msg}</p>`;
}

// === CLOCK ===
function updateClock() {
  const now = new Date();
  const options = {
    timeZone: currentTimezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  const timeStr = new Intl.DateTimeFormat("en-GB", options).format(now);
  timeDisplay.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

// === WEATHER (Open-Meteo) ===

// Step 1: Get coordinates for the city
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Cannot fetch coordinates");
  const data = await response.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0]; // { latitude, longitude, name, country }
}

// Step 2: Fetch weather and timezone info
async function fetchWeather(city) {
  try {
    if (!city) {
      showMessage("Please enter a city name.");
      return;
    }

    showMessage("Loading weather...");

    const location = await getCoordinates(city);
    if (!location) {
      showMessage("City not found. Try again.");
      return;
    }

    const { latitude, longitude, name, country } = location;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error("Cannot fetch weather data");
    const data = await response.json();

    const weather = data.current_weather;
    const temp = Math.round(weather.temperature);
    const wind = Math.round(weather.windspeed);
    const desc = getConditionText(weather.weathercode);

    // Get timezone from response
    currentTimezone = data.timezone || "UTC";

    weatherResult.innerHTML = `
      <div class="card">
        <p><strong>${name}, ${country}</strong></p>
        <p style="font-size:22px;">${temp}°C</p>
        <p>${desc}</p>
        <p>Wind: ${wind} km/h</p>
        <p><small>Local time: ${currentTimezone}</small></p>
      </div>
    `;
  } catch (error) {
    console.error(error);
    showMessage("Error loading weather data.");
  }
}

// Step 3: Map weather codes to readable text
function getConditionText(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers"
  };
  return conditions[code] || "Unknown weather";
}

// Step 4: Event listeners
searchBtn.addEventListener("click", () => fetchWeather(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchWeather(cityInput.value.trim());
});
