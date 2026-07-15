import { weatherReportSchema } from "../../schemas/trip.schema";
import { parseWithSchema } from "../../schemas/parse";
import type { WeatherReport } from "../../types/Trip";
import { requestWithRetry } from "../../core/monitoring/request";
import { CacheBuckets, withCache } from "../../core/cache/dataCache";
import { backendLiveWeather } from "../api/backendClient";
import { trackLiveDataDecision } from "../../core/monitoring";

export type { WeatherForecastDay, WeatherReport } from "../../types/Trip";

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";
const NO_MOCK_DATA_POLICY = import.meta.env.VITE_NO_MOCK_DATA_POLICY !== "false";
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 10;

function validateWeatherReport(value: unknown, context: string): WeatherReport | null {
  return parseWithSchema(weatherReportSchema, value, context);
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherReport | null> {
  if (lat === null || lng === null || lat === undefined || lng === undefined) return null;

  const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  return withCache(CacheBuckets.weather, cacheKey, WEATHER_CACHE_TTL_MS, async () => {

  try {
    const backendWeather = await backendLiveWeather(lat, lng);
    const validatedBackendWeather = validateWeatherReport(backendWeather, "backend weather response");
    if (validatedBackendWeather) {
      trackLiveDataDecision({ feature: "weather", source: "backend", status: "success" });
      return validatedBackendWeather;
    }
  } catch {
    // Fall through to direct providers.
  }

  // If OpenWeather Key is available, try OpenWeather API
  if (OPENWEATHER_KEY) {
    try {
      const [curResult, aqiResult, foreResult] = await Promise.allSettled([
        requestWithRetry(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_KEY}`, {}, {
          operation: "weather.current",
          timeoutMs: 6500,
          retries: 0
        }),
        requestWithRetry(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_KEY}`, {}, {
          operation: "weather.aqi",
          timeoutMs: 6500,
          retries: 0
        }),
        requestWithRetry(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_KEY}`, {}, {
          operation: "weather.forecast",
          timeoutMs: 6500,
          retries: 0
        })
      ]);

      const curRes = curResult.status === "fulfilled" ? curResult.value : null;
      const aqiRes = aqiResult.status === "fulfilled" ? aqiResult.value : null;
      const foreRes = foreResult.status === "fulfilled" ? foreResult.value : null;
      
      if (curRes.ok) {
        const curData = await curRes.json();
        let aqi = 30; // default good
        if (aqiRes?.ok) {
          const aqiData = await aqiRes.json();
          // OpenWeather AQI is 1-5 (1: Good, 5: Very Poor). Scale to standard US AQI scale (0-500)
          const aqiMap = { 1: 25, 2: 65, 3: 125, 4: 175, 5: 350 };
          aqi = aqiMap[aqiData.list?.[0]?.main?.aqi] || 30;
        }

        const weatherForecast = [];
        if (foreRes?.ok) {
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

        const report = {
          temp: `${Math.round(curData.main.temp)}°C`,
          humidity: `${curData.main.humidity}%`,
          windSpeed: `${Math.round(curData.wind.speed * 3.6)} km/h`, // convert m/s to km/h
          rainProbability: curData.rain ? `${curData.rain["1h"] || curData.rain["3h"] || 0}mm` : "0%",
          aqi: aqi,
          weatherForecast: weatherForecast.length > 0 ? weatherForecast : generateDefaultForecast(curData.weather[0].main, curData.main.temp)
        };
        const validated = validateWeatherReport(report, "OpenWeather response");
        if (validated) {
          trackLiveDataDecision({ feature: "weather", source: "openweather", status: "success" });
          return validated;
        }
      }
    } catch (e) {
      console.warn("OpenWeather API query failed, falling back to Open-Meteo", e);
    }
  }

  // Fallback to keyless Open-Meteo API
  try {
    const res = await requestWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`, {}, {
      operation: "weather.open_meteo",
      timeoutMs: 6500,
      retries: 0
    });
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

      const report = {
        temp: `${Math.round(current.temperature_2m)}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${Math.round(current.wind_speed_10m)} km/h`,
        rainProbability: current.weather_code >= 51 ? "75%" : "0%",
        aqi: null,
        weatherForecast
      };
      const validated = validateWeatherReport(report, "Open-Meteo response");
      if (validated) {
        trackLiveDataDecision({ feature: "weather", source: "open-meteo", status: "success" });
        return validated;
      }
    }
  } catch (e) {
    console.error("Open-Meteo API query failed:", e);
  }

  if (REAL_DATA_ONLY || NO_MOCK_DATA_POLICY) {
    trackLiveDataDecision({ feature: "weather", source: "none", status: "empty", reason: "strict_live_mode" });
    return null;
  }

  // Final static fallback
  return validateWeatherReport({
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
  }, "fallback weather response");
  });
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
