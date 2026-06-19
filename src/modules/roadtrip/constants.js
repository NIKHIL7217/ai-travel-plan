export const ROAD_MODES = new Set(["car", "bike", "bus"]);

export const ROAD_PROFILE_BY_MODE = {
  car: {
    averageSpeedKmh: 62,
    tollRatePerKm: 1.2,
    fuelProfiles: [
      { type: "Petrol", unit: "L", mileagePerUnit: 14, unitPrice: 104.21 },
      { type: "Diesel", unit: "L", mileagePerUnit: 18, unitPrice: 92.15 },
      { type: "CNG", unit: "kg", mileagePerUnit: 22, unitPrice: 76.59 },
      { type: "Electric", unit: "kWh", mileagePerUnit: 6.5, unitPrice: 8.5, rangePerChargeKm: 350 }
    ]
  },
  bike: {
    averageSpeedKmh: 52,
    tollRatePerKm: 0.35,
    fuelProfiles: [
      { type: "Petrol", unit: "L", mileagePerUnit: 45, unitPrice: 104.21 },
      { type: "Diesel", unit: "L", mileagePerUnit: 35, unitPrice: 92.15 },
      { type: "Electric", unit: "kWh", mileagePerUnit: 8, unitPrice: 8.5, rangePerChargeKm: 150 }
    ]
  },
  bus: {
    averageSpeedKmh: 50,
    tollRatePerKm: 1.55,
    fuelProfiles: [
      { type: "Diesel", unit: "L", mileagePerUnit: 4.5, unitPrice: 92.15 },
      { type: "CNG", unit: "kg", mileagePerUnit: 5.4, unitPrice: 76.59 },
      { type: "Electric", unit: "kWh", mileagePerUnit: 2.8, unitPrice: 8.5, rangePerChargeKm: 250 }
    ]
  }
};

export const ROAD_CONDITION_FACTORS = {
  smooth: { fuelFactor: 0.96, tollFactor: 1, speedFactor: 1.05 },
  moderate: { fuelFactor: 1, tollFactor: 1, speedFactor: 1 },
  rough: { fuelFactor: 1.12, tollFactor: 1.06, speedFactor: 0.86 },
  challenging: { fuelFactor: 1.22, tollFactor: 1.1, speedFactor: 0.74 }
};

export const DEFAULT_SCENIC_CORRIDORS = [
  "Ridge View Highway Loop",
  "Lakeside Panorama Drive",
  "Forest Edge Scenic Corridor",
  "Coastal Bend Expressway",
  "Sunset Valley Bypass"
];

export const DEFAULT_PHOTOGRAPHY_THEMES = [
  "Golden hour mountain ridge",
  "Bridge and river long shot",
  "Marketplace color frame",
  "Old town texture capture",
  "Blue hour skyline"
];
