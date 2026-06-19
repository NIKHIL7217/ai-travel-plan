import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TrafficIntelligenceWidget from "../../src/features/travel-intelligence/widgets/TrafficIntelligenceWidget.vue";

describe("TrafficIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(TrafficIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Loading traffic flow");
  });

  it("shows empty state", () => {
    const wrapper = mount(TrafficIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No traffic intelligence available");
  });

  it("renders traffic metrics", () => {
    const wrapper = mount(TrafficIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          level: "Moderate",
          routeLabel: "A to B",
          congestionPercent: 41,
          currentSpeedKmh: 30,
          freeFlowSpeedKmh: 52,
          mobilityScore: 59,
          advisory: "Traffic is manageable"
        }
      }
    });

    expect(wrapper.text()).toContain("Traffic Intelligence");
    expect(wrapper.text()).toContain("Moderate");
    expect(wrapper.text()).toContain("A to B");
    expect(wrapper.text()).toContain("59/100");
  });
});
