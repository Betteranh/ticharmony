// Assigned once, at account creation, on every path that creates a User
// (individual signup, self-service employee creation, first admin of a new
// client company). Not guaranteed unique — a display-only reference number,
// not a lookup key — so a random 4-digit suffix is enough entropy in practice.
export function generateEmployeeCode(): string {
  return `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
}
