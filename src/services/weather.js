const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";

export async function fetchWeather(lat, lng) {
  if (lat === null || lng === null || lat === undefined || lng === undefined) return null;

  // If OpenWeather Key is available, try OpenWeather API
  if (OPENWEATHER_KEY) {
    try {
      // Current Weather
      const curRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_KEY}`);
      // Air Pollution (AQI)
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}`);
      // 5-day / 3-hour forecast
      const foreRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_KEY}`);
      
      if (curRes.ok) {
        const curData = await curRes.json();
        let aqi = 30; // default good
        if (aqiRes.ok) {
          const aqiData = await aqiRes.json();
          // OpenWeather AQI is 1-5 (1: Good, 5: Very Poor). Scale to standard US AQI scale (0-500)
          const aqiMap = { 1: 25, 2: 65, 3: 125, 4: 175, 5: 350 };
          aqi = aqiMap[aqiData.list?.[0]?.main?.aqi] || 30;
        }

        const weatherForecast = [];
        if (foreRes.ok) {
          const foreData = await foreRes.json();
          // Group by day (every 8th item is ~24 hours later)
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          for (let i = 0; i < foreData.list.length; i += 8) {
            const item = foreData.list[i];
            const date = new Date(item.dt * 1000);
            weatherForecast.push({
              day: daysOfWeek[date.getDay()],
              temp: `${Math.round(item.main.temp_min)}°C - ${Math.round(item.main.temp_max)}°C`,
              general: item.weather[0].main,
              aqi
            });
          }
        }

        return {
          temp: `${Math.round(curData.main.temp)}°C`,
          humidity: `${curData.main.humidity}%`,
          windSpeed: `${Math.round(curData.wind.speed * 3.6)} km/h`, // convert m/s to km/h
          rainProbability: curData.rain ? `${curData.rain["1h"] || curData.rain["3h"] || 0}mm` : "0%",
          aqi: aqi,
          weatherForecast: weatherForecast.length > 0 ? weatherForecast : generateDefaultForecast(curData.weather[0].main, curData.main.temp)
        };
      }
    } catch (e) {
      console.warn("OpenWeather API query failed, falling back to Open-Meteo", e);
    }
  }

  // Fallback to keyless Open-Meteo API
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      // Interpret WMO weather codes: https://open-meteo.com/en/docs
      const interpretWmo = (code) => {
        if (code === 0) return "Sunny";
        if (code <= 3) return "Partly Cloudy";
        if (code <= 48) return "Foggy";
        if (code <= 57) return "Drizzle";
        if (code <= 67) return "Rainy";
        if (code <= 77) return "Snowy";
        if (code <= 82) return "Showers";
        if (code <= 99) return "Thunderstorm";
        return "Clear";
      };

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weatherForecast = [];
      
      if (daily && daily.time) {
        for (let i = 0; i < Math.min(7, daily.time.length); i++) {
          const date = new Date(daily.time[i]);
          const code = daily.weather_code[i];
          weatherForecast.push({
            day: daysOfWeek[date.getDay()],
            temp: `${Math.round(daily.temperature_2m_min[i])}°C - ${Math.round(daily.temperature_2m_max[i])}°C`,
            general: interpretWmo(code),
            aqi: null
          });
        }
      }

      return {
        temp: `${Math.round(current.temperature_2m)}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
        rainProbability: current.weather_code >= 51 ? "75%" : "0%",
        aqi: null,
        weatherForecast
      };
    }
  } catch (e) {
    console.error("Open-Meteo API query failed:", e);
  }

  if (REAL_DATA_ONLY) {
    return null;
  }

  // Final static fallback
  return {
    temp: "24°C",
    humidity: "62%",
    windSpeed: "12 km/h",
    rainProbability: "5%",
    aqi: 45,
    weatherForecast: [
      { day: "Monday", temp: "22°C - 28°C", general: "Partly Cloudy", aqi: 45 },
      { day: "Tuesday", temp: "23°C - 29°C", general: "Sunny", aqi: 48 },
      { day: "Wednesday", temp: "21°C - 27°C", general: "Showers", aqi: 55 },
      { day: "Thursday", temp: "22°C - 28°C", general: "Sunny", aqi: 40 },
      { day: "Friday", temp: "24°C - 30°C", general: "Clear", aqi: 35 },
      { day: "Saturday", temp: "23°C - 29°C", general: "Partly Cloudy", aqi: 50 },
      { day: "Sunday", temp: "22°C - 28°C", general: "Sunny", aqi: 42 }
    ]
  };
}

function generateDefaultForecast(general, baseTemp) {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return daysOfWeek.map((d, i) => ({
    day: d,
    temp: `${Math.round(baseTemp - 3)}°C - ${Math.round(baseTemp + 4)}°C`,
    general: general || "Clear",
    aqi: Math.round(35 + (i * 5))
  }));
}
