interface VehicleData {
  bike: number;
  car: number;
  auto: number;
  bus: number;
  truck: number;
}

export function calculatePCU(data: VehicleData): number {
  return (
    data.bike * 0.5 +
    data.car * 1.0 +
    data.auto * 1.2 +
    data.bus * 3.0 +
    data.truck * 3.0
  );
}

export function calculateDensity(flow: number, speed: number): number {
  if (speed <= 0) return 0;
  return parseFloat((flow / speed).toFixed(2));
}

export function calculateLOS(density: number): string {
  if (density < 11) return "A";
  if (density < 18) return "B";
  if (density < 26) return "C";
  if (density < 35) return "D";
  if (density < 45) return "E";
  return "F";
}
