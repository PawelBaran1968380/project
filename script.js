// Function to update the live clock
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString();
  document.getElementById("time").textContent = time;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock();
