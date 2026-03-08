import axios from "axios";

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface GridPoint {
  lat: number;
  lng: number;
}

interface RoutePair {
  origin: GridPoint;
  destination: GridPoint;
}

interface SegmentLog {
  origin: string;
  destination: string;
  distanceM: number;
  durationS: number;
  straightLineM: number;
  speedKmh: number;
  status: string;
}

export interface AreaAnalysisResult {
  averageSpeed: number;
  density: number;
  los: string;
  debug?: {
    totalPairs: number;
    validSegments: number;
    skippedSegments: number;
    speeds: number[];
    segments: SegmentLog[];
  };
}

export function generateGridPoints(bounds: BoundingBox, gridSize: number = 3): GridPoint[] {
  const points: GridPoint[] = [];
  const latStep = (bounds.north - bounds.south) / gridSize;
  const lngStep = (bounds.east - bounds.west) / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      points.push({
        lat: bounds.south + i * latStep,
        lng: bounds.west + j * lngStep,
      });
    }
  }

  return points;
}

export function createRoutePairs(points: GridPoint[], gridSize: number = 3): RoutePair[] {
  const pairs: RoutePair[] = [];
  const cols = gridSize + 1;

  for (let i = 0; i < points.length; i++) {
    // Horizontal neighbor
    if ((i + 1) % cols !== 0 && i + 1 < points.length) {
      pairs.push({ origin: points[i], destination: points[i + 1] });
    }
    // Vertical neighbor
    if (i + cols < points.length) {
      pairs.push({ origin: points[i], destination: points[i + cols] });
    }
  }

  return pairs;
}

async function fetchTravelData(
  origin: GridPoint,
  destination: GridPoint,
  apiKey: string
): Promise<{ distance: number; duration: number; straightLine: number; status: string }> {
  const url = "https://maps.googleapis.com/maps/api/distancematrix/json";
  const straightLine = haversineDistance(origin, destination);

  try {
    const response = await axios.get(url, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        departure_time: "now",
        key: apiKey,
      },
    });

    const element = response.data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      return { distance: 0, duration: 0, straightLine, status: `API_STATUS:${element?.status || "NO_ELEMENT"}` };
    }

    const routeDistance = element.distance.value;
    const duration = element.duration_in_traffic?.value || element.duration.value;

    // Skip very short segments (< 40m) — unreliable data
    if (routeDistance < 40) {
      return { distance: routeDistance, duration, straightLine, status: "SKIPPED:too_short" };
    }

    // Skip unrealistic durations (< 2s)
    if (duration < 2) {
      return { distance: routeDistance, duration, straightLine, status: "SKIPPED:duration_too_small" };
    }

    // If route > 2x straight-line, it's routing far away (ocean/no-road)
    if (routeDistance > straightLine * 2) {
      return { distance: routeDistance, duration, straightLine, status: `SKIPPED:detour_${routeDistance}m_vs_straight_${Math.round(straightLine)}m` };
    }

    return { distance: routeDistance, duration, straightLine, status: "OK" };
  } catch (err) {
    return { distance: 0, duration: 0, straightLine, status: "FETCH_ERROR" };
  }
}

function haversineDistance(a: GridPoint, b: GridPoint): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function computeSpeed(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return (distanceMeters / 1000) / (durationSeconds / 3600);
}

export function computeDensity(averageSpeed: number, estimatedFlow: number = 800): number {
  if (averageSpeed <= 0) return estimatedFlow;
  return parseFloat((estimatedFlow / averageSpeed).toFixed(2));
}

export function computeLOS(averageSpeed: number): string {
  // Speed-based LOS thresholds tuned for Indian urban traffic
  if (averageSpeed >= 50) return "A";   // Free flow
  if (averageSpeed >= 40) return "B";   // Reasonably free flow
  if (averageSpeed >= 30) return "C";   // Stable flow
  if (averageSpeed >= 20) return "D";   // Approaching unstable
  if (averageSpeed >= 15) return "E";   // Unstable / congested
  return "F";                           // Severe congestion / gridlock
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function snapToRoads(points: GridPoint[], apiKey: string): Promise<GridPoint[]> {
  // Snap grid points to nearest roads using Google Roads API
  const path = points.map(p => `${p.lat},${p.lng}`).join("|");
  try {
    const response = await axios.get("https://roads.googleapis.com/v1/nearestRoads", {
      params: { points: path, key: apiKey },
    });
    const snapped = response.data?.snappedPoints;
    if (!snapped || snapped.length === 0) return points;

    // Map snapped points back by originalIndex
    const result = [...points];
    for (const sp of snapped) {
      const idx = sp.originalIndex;
      if (idx != null && idx < result.length) {
        result[idx] = {
          lat: sp.location.latitude,
          lng: sp.location.longitude,
        };
      }
    }
    return result;
  } catch {
    // If Roads API fails, fall back to original grid points
    return points;
  }
}

export async function analyzeArea(bounds: BoundingBox): Promise<AreaAnalysisResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured");

  const gridSize = 3;
  const rawPoints = generateGridPoints(bounds, gridSize);
  const points = await snapToRoads(rawPoints, apiKey);
  const pairs = createRoutePairs(points, gridSize);

  console.log("\n========== AREA ANALYSIS START ==========");
  console.log("Bounding box:", bounds);
  console.log(`Grid points: ${points.length}, Route pairs: ${pairs.length}`);

  const batchSize = 20;
  const speeds: number[] = [];
  const segments: SegmentLog[] = [];
  let skippedCount = 0;
  let weightedSpeedSum = 0;
  let totalDistance = 0;

  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((pair) => fetchTravelData(pair.origin, pair.destination, apiKey))
    );

    results.forEach((result, idx) => {
      const pair = batch[idx];
      const segLog: SegmentLog = {
        origin: `${pair.origin.lat.toFixed(5)},${pair.origin.lng.toFixed(5)}`,
        destination: `${pair.destination.lat.toFixed(5)},${pair.destination.lng.toFixed(5)}`,
        distanceM: result.distance,
        durationS: result.duration,
        straightLineM: Math.round(result.straightLine),
        speedKmh: 0,
        status: result.status,
      };

      if (result.status === "OK" && result.distance > 0 && result.duration > 0) {
        const speed = computeSpeed(result.distance, result.duration);
        segLog.speedKmh = parseFloat(speed.toFixed(2));
        // Filter extreme speeds: < 5 km/h or > 120 km/h are unrealistic
        if (speed >= 5 && speed <= 120) {
          speeds.push(speed);
          weightedSpeedSum += speed * result.distance;
          totalDistance += result.distance;
        } else {
          segLog.status = `SKIPPED:extreme_speed_${speed.toFixed(1)}kmh`;
          skippedCount++;
        }
      } else {
        skippedCount++;
      }

      segments.push(segLog);
    });
  }

  console.log(`\nResults: ${speeds.length} valid segments, ${skippedCount} skipped`);
  if (speeds.length > 0) {
    console.log(`Speeds: min=${Math.min(...speeds).toFixed(1)}, max=${Math.max(...speeds).toFixed(1)}, avg=${(speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1)}, median=${median(speeds).toFixed(1)} km/h`);
  }
  segments.forEach((s, i) => {
    console.log(`  [${i}] ${s.origin} -> ${s.destination} | dist=${s.distanceM}m dur=${s.durationS}s straight=${s.straightLineM}m speed=${s.speedKmh}km/h | ${s.status}`);
  });
  console.log("========== AREA ANALYSIS END ==========\n");

  if (speeds.length === 0) {
    throw new Error("No routable roads found in the selected area. Try selecting a land area with roads.");
  }

  // Use distance-weighted speed as primary, median as fallback
  const averageSpeed = totalDistance > 0
    ? parseFloat((weightedSpeedSum / totalDistance).toFixed(2))
    : parseFloat(median(speeds).toFixed(2));
  const density = computeDensity(averageSpeed);
  const los = computeLOS(averageSpeed);

  return {
    averageSpeed,
    density,
    los,
    debug: {
      totalPairs: pairs.length,
      validSegments: speeds.length,
      skippedSegments: skippedCount,
      speeds: speeds.map(s => parseFloat(s.toFixed(2))),
      segments,
    },
  };
}
