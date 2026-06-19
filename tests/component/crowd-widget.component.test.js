import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CrowdIntelligenceWidget from "../../src/features/travel-intelligence/widgets/CrowdIntelligenceWidget.vue";

describe("CrowdIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(CrowdIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Scanning crowd signals");
  });

  it("shows empty state", () => {
    const wrapper = mount(CrowdIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No crowd intelligence available");
  });

  it("renders crowd metrics", () => {
    const wrapper = mount(CrowdIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          level: "High",
          crowdIndex: 82,
          peakWindow: "18:00-21:00",
          attractionHotspots: 6,
          diningHotspots: 4,
          advisory: "Reserve ahead"
        }
      }
    });

    expect(wrapper.text()).toContain("Crowd Intelligence");
    expect(wrapper.text()).toContain("82/100");
    expect(wrapper.text()).toContain("18:00-21:00");
    expect(wrapper.text()).toContain("Reserve ahead");
  });
});
