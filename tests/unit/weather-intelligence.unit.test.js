import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/weather", () => ({
  fetchWeather: vi.fn()
}));

import { fetchWeather } from "../../src/services/weather";
import { getWeatherIntelligence } from "../../src/modules/travel-intelligence/services/weather-intelligence";

describe("weather-intelligence service", () => {
  it("returns fallback payload when coordinates are missing", async () => {
    const result = await getWeatherIntelligence({ city: "Goa", lat: null, lng: null });

    expect(result.city).toBe("Goa");
    expect(result.comfortScore).toBeGreaterThan(0);
    expect(result.forecast).toEqual([]);
  });

  it("uses weather report and computes comfort metrics", async () => {
    fetchWeather.mockResolvedValueOnce({
      temp: "29°C",
      humidity: "70%",
      windSpeed: "12 km/h",
      rainProbability: "35%",
      aqi: 88,
      weatherForecast: [{ general: "Cloudy" }, { general: "Sunny" }]
    });

    const result = await getWeatherIntelligence({ city: "Pune", lat: 18.5, lng: 73.8 });

    expect(fetchWeather).toHaveBeenCalledTimes(1);
    expect(result.city).toBe("Pune");
    expect(result.condition).toBe("Cloudy");
    expect(result.rainProbabilityPercent).toBe(35);
    expect(result.comfortScore).toBeGreaterThan(0);
    expect(result.comfortBand).toMatch(/Excellent|Good|Moderate|Harsh/);
  });

  it("falls back when weather provider throws", async () => {
    fetchWeather.mockRejectedValueOnce(new Error("network"));

    const result = await getWeatherIntelligence({ city: "Delhi", lat: 28.6, lng: 77.2 });

    expect(result.city).toBe("Delhi");
    expect(result.temperatureC).toBe(24);
    expect(result.advisory).toContain("conditions");
  });

  it("returns rain advisory branch when rain probability is high", async () => {
    const result = await getWeatherIntelligence({
      city: "Munnar",
      lat: 10.1,
      lng: 77.1,
      weather: {
        temp: "26°C",
        humidity: "65%",
        windSpeed: "11 km/h",
        rainProbability: "80%",
        aqi: 72,
        weatherForecast: [{ general: "Rain" }]
      }
    });

    expect(result.rainProbabilityPercent).toBe(80);
    expect(result.advisory).toContain("rain");
  });

  it("returns AQI advisory branch when air quality is elevated", async () => {
    const result = await getWeatherIntelligence({
      city: "Noida",
      lat: 28.6,
      lng: 77.3,
      weather: {
        temp: "28°C",
        humidity: "60%",
        windSpeed: "9 km/h",
        rainProbability: "15%",
        aqi: 160,
        weatherForecast: [{ general: "Hazy" }]
      }
    });

    expect(result.aqi).toBe(160);
    expect(result.advisory).toContain("Air quality");
  });

  it("returns heat advisory branch for high temperature", async () => {
    const result = await getWeatherIntelligence({
      city: "Nagpur",
      lat: 21.1,
      lng: 79.1,
      weather: {
        temp: "39°C",
        humidity: "44%",
        windSpeed: "8 km/h",
        rainProbability: "10%",
        aqi: 88,
        weatherForecast: [{ general: "Sunny" }]
      }
    });

    expect(result.temperatureC).toBe(39);
    expect(result.advisory).toContain("Heat risk");
  });
});
