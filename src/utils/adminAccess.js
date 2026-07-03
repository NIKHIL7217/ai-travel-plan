export function isAdminEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized.includes("admin") || normalized.endsWith("@wanderai.local");
}

export function inferUserRole(user) {
  const explicitRole = String(user?.role || "").trim().toLowerCase();
  return explicitRole || "member";
}

export function isAdminUser(user) {
  return inferUserRole(user) === "admin";
}
