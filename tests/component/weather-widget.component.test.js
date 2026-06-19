import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WeatherIntelligenceWidget from "../../src/features/travel-intelligence/widgets/WeatherIntelligenceWidget.vue";

describe("WeatherIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(WeatherIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Loading weather model");
  });

  it("shows empty state", () => {
    const wrapper = mount(WeatherIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No weather intelligence available");
  });

  it("renders weather metrics", () => {
    const wrapper = mount(WeatherIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          comfortBand: "Good",
          temperatureC: 28,
          humidityPercent: 62,
          rainProbabilityPercent: 22,
          aqi: 65,
          comfortScore: 81,
          advisory: "Conditions are favorable"
        }
      }
    });

    expect(wrapper.text()).toContain("Weather Intelligence");
    expect(wrapper.text()).toContain("Good");
    expect(wrapper.text()).toContain("28°C");
    expect(wrapper.text()).toContain("81/100");
  });

  it("renders fallback placeholders when values are missing", () => {
    const wrapper = mount(WeatherIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          comfortBand: "Moderate",
          temperatureC: null,
          humidityPercent: null,
          rainProbabilityPercent: null,
          aqi: null,
          comfortScore: 60,
          advisory: "Keep plans flexible"
        }
      }
    });

    expect(wrapper.text()).toContain("-°C");
    expect(wrapper.text()).toContain("-%");
    expect(wrapper.text()).toContain("N/A");
  });
});
