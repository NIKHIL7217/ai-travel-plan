import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlanComparisonView from "../../src/features/planner/PlanComparisonView.vue";

describe("PlanComparisonView", () => {
  const options = [
    {
      id: "budget",
      label: "Budget",
      rank: 2,
      totalScore: 78,
      rankingReason: "Budget oriented",
      budgetLimit: 1000,
      budget: { total: 900 },
      scores: { budgetFit: 90, experience: 70, alignment: 72 },
      itinerary: { destination: "Goa", itinerary: [{ day: 1 }] }
    },
    {
      id: "premium",
      label: "Premium",
      rank: 1,
      totalScore: 86,
      rankingReason: "Top choice",
      budgetLimit: 1800,
      budget: { total: 1700 },
      scores: { budgetFit: 70, experience: 92, alignment: 84 },
      itinerary: { destination: "Goa", itinerary: [{ day: 1 }, { day: 2 }] }
    }
  ];

  it("renders options and selection state", () => {
    const wrapper = mount(PlanComparisonView, {
      props: {
        options,
        selectedPlanId: "premium",
        loading: false
      }
    });

    expect(wrapper.text()).toContain("Plan Comparison");
    expect(wrapper.text()).toContain("Budget");
    expect(wrapper.text()).toContain("Premium");
    expect(wrapper.findAll(".option-card")).toHaveLength(2);
    expect(wrapper.find(".option-card.selected").text()).toContain("Premium");
  });

  it("renders loading state", () => {
    const wrapper = mount(PlanComparisonView, {
      props: {
        options: [],
        selectedPlanId: "",
        loading: true
      }
    });

    expect(wrapper.text()).toContain("Generating and ranking plan options");
  });

  it("renders empty state", () => {
    const wrapper = mount(PlanComparisonView, {
      props: {
        options: [],
        selectedPlanId: "",
        loading: false
      }
    });

    expect(wrapper.text()).toContain("No generated options available yet");
  });

  it("emits select-plan when user chooses option", async () => {
    const wrapper = mount(PlanComparisonView, {
      props: {
        options,
        selectedPlanId: "",
        loading: false
      }
    });

    await wrapper.findAll("button").find((button) => button.text().includes("Choose This Plan")).trigger("click");

    expect(wrapper.emitted("select-plan")).toBeTruthy();
    expect(wrapper.emitted("select-plan")[0][0]).toBeTruthy();
  });
});
