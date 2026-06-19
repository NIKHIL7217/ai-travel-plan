import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SeasonIntelligenceWidget from "../../src/features/travel-intelligence/widgets/SeasonIntelligenceWidget.vue";

describe("SeasonIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(SeasonIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Analyzing season profile");
  });

  it("shows empty state", () => {
    const wrapper = mount(SeasonIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No season intelligence available");
  });

  it("renders season metrics", () => {
    const wrapper = mount(SeasonIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          currentSeason: "Summer",
          seasonalScore: 76,
          thermalTrend: "warming",
          avgTemp: 31,
          bestWindow: "Early morning and evening",
          advisory: "Plan shaded activities"
        }
      }
    });

    expect(wrapper.text()).toContain("Season Intelligence");
    expect(wrapper.text()).toContain("Summer");
    expect(wrapper.text()).toContain("76/100");
    expect(wrapper.text()).toContain("31°C");
  });

  it("renders temperature fallback marker", () => {
    const wrapper = mount(SeasonIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          currentSeason: "Winter",
          seasonalScore: 68,
          thermalTrend: "stable",
          avgTemp: null,
          bestWindow: "Morning",
          advisory: "Stable profile"
        }
      }
    });

    expect(wrapper.text()).toContain("-°C");
  });
});
