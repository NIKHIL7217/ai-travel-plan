function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function average(values = []) {
  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (normalized.length === 0) {
    return 0;
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function normalizedStyle(style = "") {
  return String(style || "").trim().toLowerCase();
}

function includesAny(value = "", candidates = []) {
  const normalized = String(value || "").trim().toLowerCase();
  return candidates.some((candidate) => normalized.includes(String(candidate).toLowerCase()));
}

function scoreBudgetFit(totalBudget, maxBudget, typeId) {
  const total = Math.max(1, Number(totalBudget || 1));
  const limit = Math.max(1, Number(maxBudget || 1));
  const usage = total / limit;

  const ideals = {
    budget: 0.72,
    balanced: 0.95,
    premium: 1.2
  };

  const tolerance = {
    budget: 0.46,
    balanced: 0.42,
    premium: 0.62
  };

  const ideal = ideals[typeId] || 0.95;
  const width = tolerance[typeId] || 0.45;
  const distance = Math.abs(usage - ideal);

  let score = 100 - (distance / width) * 100;

  if (typeId !== "premium" && usage > 1.2) {
    score -= (usage - 1.2) * 115;
  }

  if (typeId === "budget" && usage <= 0.8) {
    score += 8;
  }

  return clamp(Math.round(score), 8, 100);
}

function scoreExperienceDepth(itinerary = [], typeId = "balanced") {
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    return 30;
  }

  const days = itinerary.length;
  const uniqueThemes = new Set(
    itinerary
      .map((day) => String(day?.theme || "").trim().toLowerCase())
      .filter(Boolean)
  ).size;

  const detailLengths = itinerary.map((day) => {
    return [day?.morning, day?.afternoon, day?.evening, day?.foodRecommendation]
      .map((part) => String(part || ""))
      .join(" ")
      .trim()
      .length;
  });

  const density = average(detailLengths);
  let score = 42 + (uniqueThemes / Math.max(1, days)) * 30 + Math.min(28, density / 24);

  if (typeId === "premium") {
    score += 4;
  }

  if (typeId === "budget") {
    score += 2;
  }

  return clamp(Math.round(score), 18, 100);
}

function scorePreferenceAlignment(option, preferences = {}) {
  const travelMode = normalizedStyle(preferences.travelMode);
  const userStyle = normalizedStyle(preferences.style);
  const stayPreference = normalizedStyle(preferences.stayPreference);
  const foodPreference = normalizedStyle(preferences.foodPreference);

  let score = 46;

  if (option.id === "budget") {
    if (includesAny(userStyle, ["budget"])) score += 20;
    if (includesAny(stayPreference, ["hostel", "budget"])) score += 18;
    if (includesAny(foodPreference, ["street", "local"])) score += 12;
    if (includesAny(travelMode, ["bus", "train", "bike"])) score += 8;
  }

  if (option.id === "balanced") {
    if (includesAny(userStyle, ["balanced", "comfort", "adventure"])) score += 20;
    if (includesAny(stayPreference, ["mid", "range", "premium"])) score += 14;
    if (includesAny(foodPreference, ["mixed", "local"])) score += 11;
    if (includesAny(travelMode, ["car", "flight", "train"])) score += 6;
  }

  if (option.id === "premium") {
    if (includesAny(userStyle, ["luxury", "premium"])) score += 22;
    if (includesAny(stayPreference, ["luxury", "premium"])) score += 20;
    if (includesAny(foodPreference, ["fine", "dining"])) score += 12;
    if (includesAny(travelMode, ["flight", "car"])) score += 8;
  }

  return clamp(Math.round(score), 12, 100);
}

function weightedScore(scores, optionId) {
  const weights = {
    budget: { budgetFit: 0.46, experience: 0.24, alignment: 0.3 },
    balanced: { budgetFit: 0.34, experience: 0.36, alignment: 0.3 },
    premium: { budgetFit: 0.24, experience: 0.46, alignment: 0.3 }
  };

  const selected = weights[optionId] || weights.balanced;
  const total =
    scores.budgetFit * selected.budgetFit +
    scores.experience * selected.experience +
    scores.alignment * selected.alignment;

  return clamp(Math.round(total), 10, 100);
}

function rankingReason(option) {
  if (option.totalScore >= 84) {
    return "Strong fit across budget, depth, and preference alignment.";
  }
  if (option.totalScore >= 68) {
    return "Balanced option with manageable trade-offs for this trip brief.";
  }
  return "Viable alternative; choose if you prefer this travel style profile.";
}

export function createPlanProfiles(effectiveInput = {}) {
  const baseBudget = Math.max(300, Number(effectiveInput.maxBudget || 1500));
  const baseStyle = String(effectiveInput.style || "Comfort");

  return [
    {
      id: "budget",
      label: "Budget",
      style: "Budget",
      budgetLimit: Math.max(300, Math.round(baseBudget * 0.72)),
      stayPreference: "budget",
      foodPreference: "street",
      subtitle: "Cost-first with essentials covered"
    },
    {
      id: "balanced",
      label: "Balanced",
      style: baseStyle === "Luxury" ? "Comfort" : baseStyle === "Budget" ? "Comfort" : baseStyle,
      budgetLimit: Math.max(450, Math.round(baseBudget * 1.0)),
      stayPreference: "mid-range",
      foodPreference: "mixed",
      subtitle: "Comfort and value in equilibrium"
    },
    {
      id: "premium",
      label: "Premium",
      style: "Luxury",
      budgetLimit: Math.max(700, Math.round(baseBudget * 1.35)),
      stayPreference: "luxury",
      foodPreference: "fine-dining",
      subtitle: "Experience-first with premium touches"
    }
  ];
}

export function rankItineraryOptions(options = [], preferences = {}) {
  const scored = options.map((option) => {
    const budgetFit = scoreBudgetFit(option?.budget?.total, preferences?.maxBudget, option.id);
    const experience = scoreExperienceDepth(option?.itinerary?.itinerary || option?.itinerary || [], option.id);
    const alignment = scorePreferenceAlignment(option, preferences);

    const scores = {
      budgetFit,
      experience,
      alignment
    };

    return {
      ...option,
      scores,
      totalScore: weightedScore(scores, option.id)
    };
  });

  const ranked = [...scored].sort((left, right) => right.totalScore - left.totalScore);

  return ranked.map((option, index) => ({
    ...option,
    rank: index + 1,
    rankingReason: rankingReason(option)
  }));
}
