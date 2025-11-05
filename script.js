// Function to update the live clock
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString();
  document.getElementById("time").textContent = time;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock();

// === CLOCK ===
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString();
  document.getElementById("time").textContent = time;
}

setInterval(updateClock, 1000);
updateClock();


// === WEATHER (Open-Meteo API) ===
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

// Get coordinates for a city using Open-Meteo Geocoding API
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch coordinates");
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0]; // { latitude, longitude, name, country }
}

// Get weather by coordinates
async function fetchWeather(city) {
  try {
    weatherResult.innerHTML = "<p>Loading...</p>";

    const location = await getCoordinates(city);
    if (!location) {
      weatherResult.innerHTML = "<p>City not found.</p>";
      return;
    }

    const { latitude, longitude, name, country } = location;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch weather");
    const data = await res.json();

    const temp = data.current_weather.temperature;
    const wind = data.current_weather.windspeed;
    const condition = data.current_weather.weathercode;

    const conditionText = getConditionText(condition);

    weatherResult.innerHTML = `
      <div class="card">
        <p><strong>${name}, ${country}</strong></p>
        <p style="font-size:22px;">${temp}°C</p>
        <p>${conditionText}</p>
        <p>Wind: ${wind} km/h</p>
      </div>
    `;
  } catch (err) {
    weatherResult.innerHTML = `<p>Error loading weather data.</p>`;
    console.error(err);
  }
}

// Translate weather code numbers into text
function getConditionText(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    61: "Rain",
    71: "Snow",
    80: "Showers",
  };
  return conditions[code] || "Unknown weather";
}

// Event listeners
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!city) {
    weatherResult.innerHTML = "<p>Please enter a city name.</p>";
    return;
  }
  fetchWeather(city);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

