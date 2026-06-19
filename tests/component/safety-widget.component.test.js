import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SafetyIntelligenceWidget from "../../src/features/travel-intelligence/widgets/SafetyIntelligenceWidget.vue";

describe("SafetyIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(SafetyIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Computing safety signals");
  });

  it("shows empty state", () => {
    const wrapper = mount(SafetyIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No safety intelligence available");
  });

  it("renders safety metrics and risk driver chips", () => {
    const wrapper = mount(SafetyIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          level: "Watch",
          safetyScore: 58,
          riskDrivers: ["high-crowd-density", "air-quality-stress"],
          advisory: "Use extra caution"
        }
      }
    });

    expect(wrapper.text()).toContain("Safety Intelligence");
    expect(wrapper.text()).toContain("58/100");
    expect(wrapper.findAll(".driver-chip")).toHaveLength(2);
    expect(wrapper.text()).toContain("Use extra caution");
  });

  it("hides risk driver chip row when drivers are empty", () => {
    const wrapper = mount(SafetyIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          level: "High",
          safetyScore: 84,
          riskDrivers: [],
          advisory: "Stable"
        }
      }
    });

    expect(wrapper.find(".drivers").exists()).toBe(false);
  });
});
