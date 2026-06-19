import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CostIntelligenceWidget from "../../src/features/travel-intelligence/widgets/CostIntelligenceWidget.vue";

describe("CostIntelligenceWidget", () => {
  it("shows loading state", () => {
    const wrapper = mount(CostIntelligenceWidget, {
      props: {
        loading: true,
        data: null
      }
    });

    expect(wrapper.text()).toContain("Calculating cost pressure");
  });

  it("shows empty state", () => {
    const wrapper = mount(CostIntelligenceWidget, {
      props: {
        loading: false,
        data: null
      }
    });

    expect(wrapper.text()).toContain("No cost intelligence available");
  });

  it("renders pricing metrics and tip", () => {
    const wrapper = mount(CostIntelligenceWidget, {
      props: {
        loading: false,
        data: {
          costLevel: "Moderate",
          estimatedDailySpend: 125,
          estimatedTripSpend: 760,
          budgetPressure: 58,
          currency: "USD",
          advisory: "Balanced costs",
          savingsTip: "Book weekdays"
        }
      }
    });

    expect(wrapper.text()).toContain("Cost Intelligence");
    expect(wrapper.text()).toContain("Moderate");
    expect(wrapper.text()).toContain("58/100");
    expect(wrapper.text()).toContain("Tip: Book weekdays");
  });
});
