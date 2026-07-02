import { ROAD_CONDITION_FACTORS, ROAD_PROFILE_BY_MODE } from "./constants";
import { getFuelPrice } from "../../services/fuel-prices";

function round(value) {
  return Math.round(Number(value || 0));
}

function toModeKey(mode = "Car") {
  return String(mode || "Car").trim().toLowerCase();
}

export function estimateFuel(distanceKm, travelMode = "Car", conditionLevel = "moderate", travelers = 1, customMileage = null) {
  const modeKey = toModeKey(travelMode);
  const profile = ROAD_PROFILE_BY_MODE[modeKey] || ROAD_PROFILE_BY_MODE.car;
  const condition = ROAD_CONDITION_FACTORS[conditionLevel] || ROAD_CONDITION_FACTORS.moderate;
  const travelerFactor = modeKey === "bus" ? 1 : Math.max(1, Number(travelers || 1) / 2);

  const options = profile.fuelProfiles.map((fuel) => {
    // Use custom mileage if provided and matches the fuel type
    let mileage = fuel.mileagePerUnit;
    if (customMileage && customMileage.fuelType === fuel.type && customMileage.mileage > 0) {
      mileage = customMileage.mileage;
    }
    
    // Get real-time fuel price
    const realTimePrice = getFuelPrice(fuel.type);
    
    const usage = (distanceKm / Math.max(0.1, mileage)) * condition.fuelFactor * travelerFactor;
    const totalCost = usage * realTimePrice;

    return {
      type: fuel.type,
      unit: fuel.unit,
      mileagePerUnit: mileage,
      defaultMileage: fuel.mileagePerUnit,
      unitPrice: realTimePrice,
      usage: Number(usage.toFixed(1)),
      totalCost: round(totalCost),
      rangePerChargeKm: fuel.rangePerChargeKm || null,
      isCustomMileage: customMileage && customMileage.fuelType === fuel.type && customMileage.mileage > 0
    };
  });

  const recommended = options.reduce((best, current) => (current.totalCost < best.totalCost ? current : best), options[0]);

  return {
    options,
    recommended,
    totalFuelCost: recommended?.totalCost || 0
  };
}

export function estimateToll(distanceKm, travelMode = "Car", conditionLevel = "moderate") {
  const modeKey = toModeKey(travelMode);
  const profile = ROAD_PROFILE_BY_MODE[modeKey] || ROAD_PROFILE_BY_MODE.car;
  const condition = ROAD_CONDITION_FACTORS[conditionLevel] || ROAD_CONDITION_FACTORS.moderate;

  const estimated = distanceKm * profile.tollRatePerKm * condition.tollFactor;
  const range = {
    low: round(estimated * 0.85),
    high: round(estimated * 1.2)
  };

  return {
    estimated: round(estimated),
    low: range.low,
    high: range.high,
    note: "Estimated using route length, vehicle class, and road-condition multiplier."
  };
}

export function estimateEvCharging(distanceKm, travelMode = "Car", conditionLevel = "moderate", chargingStops = []) {
  const modeKey = toModeKey(travelMode);
  const profile = ROAD_PROFILE_BY_MODE[modeKey] || ROAD_PROFILE_BY_MODE.car;
  const condition = ROAD_CONDITION_FACTORS[conditionLevel] || ROAD_CONDITION_FACTORS.moderate;
  const evProfile = profile.fuelProfiles.find((fuel) => fuel.type === "Electric");

  if (!evProfile?.rangePerChargeKm) {
    return {
      stopsNeeded: 0,
      batteryRangeKm: null,
      suggestedStops: []
    };
  }

  const adjustedRange = evProfile.rangePerChargeKm / condition.fuelFactor;
  const stopsNeeded = Math.max(0, Math.ceil(distanceKm / Math.max(20, adjustedRange)) - 1);

  const suggestedStops = chargingStops.slice(0, Math.max(3, stopsNeeded + 1)).map((item, index) => ({
    id: `${item.name || "ev"}_${index}`,
    name: item.name || `EV Charging Stop ${index + 1}`,
    city: item.city || "Mid route",
    kmFromStart: Number(item.kmFromStart || 0),
    lat: item.lat !== undefined && item.lat !== null ? Number(item.lat) : null,
    lng: item.lng !== undefined && item.lng !== null ? Number(item.lng) : null,
    chargingType: item.chargingType || "DC Fast",
    estimatedChargeTime: item.estimatedChargeTime || "30-45 min",
    mapQuery: item.name || item.city || "EV charging station"
  }));

  return {
    stopsNeeded,
    batteryRangeKm: round(adjustedRange),
    suggestedStops
  };
}
