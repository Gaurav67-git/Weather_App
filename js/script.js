const userLocation = document.getElementById("userLocation"),
    converter = document.getElementById("converter"),
    weatherIcon = document.querySelector(".weatherIcon"),
    temperature = document.querySelector(".temperature"),
    feelslike = document.querySelector(".feelslike"),
    description = document.querySelector(".description"),
    date = document.querySelector(".date"),
    city = document.querySelector(".city"),
    HValue = document.getElementById("HValue"),
    WValue = document.getElementById("WValue"),
    SRValue = document.getElementById("SRValue"),
    SSValue = document.getElementById("SSValue"),
    CValue = document.getElementById("CValue"),
    PValue = document.getElementById("PValue"),
    forecast = document.querySelector(".forecast");

const WEATHER_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/weather?appid=e646401a34aff536394db4c2819af86a&units=metric&q=`;
const FORECAST_API_ENDPOINT = `https://api.openweathermap.org/data/2.5/forecast?appid=e646401a34aff536394db4c2819af86a&units=metric&q=`;

// Celsius ↔ Fahrenheit conversion
function cToF(c) {
    return (c * 9/5) + 32;
}

function updateUnits() {
    const unit = converter.value; // °C or °F

    // Update current weather
    let currentTemp = parseFloat(temperature.dataset.value);
    let feelsTemp = parseFloat(feelslike.dataset.value);

    if (!isNaN(currentTemp) && !isNaN(feelsTemp)) {
        if (unit === "°F") {
            temperature.innerHTML = Math.round(cToF(currentTemp)) + "°F";
            feelslike.innerHTML = "Feels like: " + Math.round(cToF(feelsTemp)) + "°F";
        } else {
            temperature.innerHTML = Math.round(currentTemp) + "°C";
            feelslike.innerHTML = "Feels like: " + Math.round(feelsTemp) + "°C";
        }
    }

    // Update forecast
    document.querySelectorAll(".forecast-day").forEach(day => {
        let min = parseFloat(day.dataset.min);
        let max = parseFloat(day.dataset.max);

        if (!isNaN(min) && !isNaN(max)) {
            if (unit === "°F") {
                day.querySelector(".temps").innerText =
                    `${Math.round(cToF(min))}°F / ${Math.round(cToF(max))}°F`;
            } else {
                day.querySelector(".temps").innerText =
                    `${Math.round(min)}°C / ${Math.round(max)}°C`;
            }
        }
    });
}

// Format time in city's local timezone
function formatLocalTime(unixUtcSeconds, tzOffsetSeconds) {
    const shifted = new Date((unixUtcSeconds + tzOffsetSeconds) * 1000);
    const options = { hour: "numeric", minute: "numeric", hour12: true, timeZone: "UTC" };
    return shifted.toLocaleTimeString([], options);
}

// Format date in city's local timezone
function formatLocalDate(unixUtcSeconds, tzOffsetSeconds) {
    const shifted = new Date((unixUtcSeconds + tzOffsetSeconds) * 1000);
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };
    return shifted.toLocaleDateString([], options);
}

function findUserLocation() {
    fetch(WEATHER_API_ENDPOINT + userLocation.value)
        .then((response) => response.json())
        .then((data) => {
            if (data.cod != 200) {
                alert(data.message);
                return;
            }
            console.log("Current weather:", data);

            // City & Icon
            city.innerHTML = data.name + ", " + data.sys.country;
            weatherIcon.style.backgroundImage = `url(https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png)`;

            // Current Weather (store raw Celsius values safely)
            temperature.dataset.value = data.main.temp ?? 0;
            feelslike.dataset.value = data.main.feels_like ?? 0;
            temperature.innerHTML = Math.round(data.main.temp) + "°C";
            feelslike.innerHTML = "Feels like: " + Math.round(data.main.feels_like) + "°C";
            description.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.weather[0].icon}.png">${data.weather[0].description}`;

            // Date + Time in local timezone
            const now = Math.floor(Date.now() / 1000);
            date.innerHTML = `${formatLocalDate(now, data.timezone)} - ${formatLocalTime(now, data.timezone)}`;

            // Highlights
            HValue.innerHTML = Math.round(data.main.humidity) + "%";
            WValue.innerHTML = Math.round(data.wind.speed) + " m/s";
            SRValue.innerHTML = formatLocalTime(data.sys.sunrise, data.timezone);
            SSValue.innerHTML = formatLocalTime(data.sys.sunset, data.timezone);
            CValue.innerHTML = data.clouds.all + "%";
            PValue.innerHTML = data.main.pressure + " hPa";

            // Fetch forecast (5-day)
            fetch(FORECAST_API_ENDPOINT + userLocation.value)
                .then((response) => response.json())
                .then((forecastData) => {
                    console.log("Forecast:", forecastData);
                    forecast.innerHTML = ""; // clear old

                    const dailyForecasts = {};

                    // Group forecast data by calendar day
                    forecastData.list.forEach(item => {
                        const dateShifted = new Date((item.dt + forecastData.city.timezone) * 1000);
                        const dateKey = dateShifted.toDateString();

                        if (!dailyForecasts[dateKey]) {
                            dailyForecasts[dateKey] = {
                                temps: [],
                                icons: [],
                                entries: []
                            };
                        }

                        dailyForecasts[dateKey].temps.push(item.main.temp);
                        dailyForecasts[dateKey].icons.push(item.weather[0].icon);
                        dailyForecasts[dateKey].entries.push(item);
                    });

                    const today = new Date((Date.now() + forecastData.city.timezone * 1000)).toDateString();

                    let dayCount = 0;
                    const addedDays = new Set();

                    for (const dateKey in dailyForecasts) {
                        if (dateKey !== today && dayCount < 5) {
                            if (addedDays.has(dateKey)) continue; // skip duplicates
                            addedDays.add(dateKey);

                            const dayData = dailyForecasts[dateKey];
                            const minTemp = Math.min(...dayData.temps);
                            const maxTemp = Math.max(...dayData.temps);

                            // Pick forecast entry closest to 12:00 PM
                            let middayEntry = dayData.entries.reduce((closest, item) => {
                                const shifted = new Date((item.dt + forecastData.city.timezone) * 1000);
                                const hour = shifted.getHours();
                                return Math.abs(hour - 12) <
                                    Math.abs((new Date((closest.dt + forecastData.city.timezone) * 1000)).getHours() - 12)
                                    ? item : closest;
                            }, dayData.entries[0]);

                            const middayDate = new Date((middayEntry.dt + forecastData.city.timezone) * 1000);

                            // Show only weekday + month + day
                            const dateStr = middayDate.toLocaleDateString("en-US", { 
                                weekday: "short", month: "short", day: "numeric" 
                            });

                            const icon = middayEntry.weather[0].icon;
                            const desc = middayEntry.weather[0].description;

                            // Create forecast card (store raw Celsius for conversion)
                            const forecastDay = document.createElement('div');
                            forecastDay.className = 'forecast-day';
                            forecastDay.dataset.min = minTemp;
                            forecastDay.dataset.max = maxTemp;
                            forecastDay.innerHTML = `
                                <p><b>${dateStr}</b></p>
                                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="Weather icon">
                                <p>${desc}</p>
                                <p class="temps">${Math.round(minTemp)}°C / ${Math.round(maxTemp)}°C</p>
                            `;

                            forecast.appendChild(forecastDay);
                            dayCount++;
                        }
                    }

                    // ✅ Apply converter after data loads
                    updateUnits();
                })
                .catch(error => {
                    console.error("Error fetching forecast:", error);
                    forecast.innerHTML = "<p>Unable to load forecast data</p>";
                });
        })
        .catch(error => {
            console.error("Error fetching weather:", error);
            alert("Unable to fetch weather data. Please check the city name and try again.");
        });

    // ✅ Apply converter after current weather loads
    updateUnits();
}

// Enter key (fixed)
userLocation.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        findUserLocation();
    }
});

// Converter dropdown listener
converter.addEventListener("change", updateUnits);


// ✅ Sticky shadow effect (mobile/tablet only)
window.addEventListener("scroll", () => {
    if (window.innerWidth <= 1024) {
      const inputGroup = document.querySelector(".input-group");
      if (window.scrollY > 0) {
        inputGroup.classList.add("sticky-shadow");
      } else {
        inputGroup.classList.remove("sticky-shadow");
      }
    }
  });
  
