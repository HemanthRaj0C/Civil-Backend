"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGridPoints = generateGridPoints;
exports.createRoutePairs = createRoutePairs;
exports.computeSpeed = computeSpeed;
exports.computeDensity = computeDensity;
exports.computeLOS = computeLOS;
exports.analyzeArea = analyzeArea;
const axios_1 = __importDefault(require("axios"));
function generateGridPoints(bounds, gridSize = 5) {
    const points = [];
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
function createRoutePairs(points, gridSize = 5) {
    const pairs = [];
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
async function fetchTravelData(origin, destination, apiKey) {
    const url = "https://maps.googleapis.com/maps/api/distancematrix/json";
    const straightLine = haversineDistance(origin, destination);
    try {
        const response = await axios_1.default.get(url, {
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
        // If route > 3x straight-line, it's routing far away (ocean/no-road)
        if (routeDistance > straightLine * 3) {
            return { distance: routeDistance, duration, straightLine, status: `SKIPPED:route_${routeDistance}m_vs_straight_${Math.round(straightLine)}m` };
        }
        return { distance: routeDistance, duration, straightLine, status: "OK" };
    }
    catch (err) {
        return { distance: 0, duration: 0, straightLine, status: "FETCH_ERROR" };
    }
}
function haversineDistance(a, b) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return 2 * R * Math.asin(Math.sqrt(h));
}
function computeSpeed(distanceMeters, durationSeconds) {
    if (durationSeconds <= 0)
        return 0;
    return (distanceMeters / 1000) / (durationSeconds / 3600);
}
function computeDensity(averageSpeed, estimatedFlow = 800) {
    if (averageSpeed <= 0)
        return estimatedFlow;
    return parseFloat((estimatedFlow / averageSpeed).toFixed(2));
}
function computeLOS(averageSpeed) {
    // Speed-based LOS thresholds for urban streets (HCM method)
    if (averageSpeed >= 80)
        return "A"; // Free flow
    if (averageSpeed >= 50)
        return "B"; // Reasonably free flow
    if (averageSpeed >= 35)
        return "C"; // Stable flow
    if (averageSpeed >= 25)
        return "D"; // Approaching unstable
    if (averageSpeed >= 15)
        return "E"; // Unstable / congested
    return "F"; // Severe congestion / gridlock
}
async function analyzeArea(bounds) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey)
        throw new Error("GOOGLE_API_KEY is not configured");
    const gridSize = 5;
    const points = generateGridPoints(bounds, gridSize);
    const pairs = createRoutePairs(points, gridSize);
    console.log("\n========== AREA ANALYSIS START ==========");
    console.log("Bounding box:", bounds);
    console.log(`Grid points: ${points.length}, Route pairs: ${pairs.length}`);
    const batchSize = 10;
    const speeds = [];
    const segments = [];
    let skippedCount = 0;
    for (let i = 0; i < pairs.length; i += batchSize) {
        const batch = pairs.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((pair) => fetchTravelData(pair.origin, pair.destination, apiKey)));
        results.forEach((result, idx) => {
            const pair = batch[idx];
            const segLog = {
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
                if (speed > 0)
                    speeds.push(speed);
            }
            else {
                skippedCount++;
            }
            segments.push(segLog);
        });
    }
    console.log(`\nResults: ${speeds.length} valid segments, ${skippedCount} skipped`);
    if (speeds.length > 0) {
        console.log(`Speeds: min=${Math.min(...speeds).toFixed(1)}, max=${Math.max(...speeds).toFixed(1)}, avg=${(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)} km/h`);
    }
    segments.forEach((s, i) => {
        console.log(`  [${i}] ${s.origin} -> ${s.destination} | dist=${s.distanceM}m dur=${s.durationS}s straight=${s.straightLineM}m speed=${s.speedKmh}km/h | ${s.status}`);
    });
    console.log("========== AREA ANALYSIS END ==========\n");
    if (speeds.length === 0) {
        throw new Error("No routable roads found in the selected area. Try selecting a land area with roads.");
    }
    const averageSpeed = parseFloat((speeds.reduce((sum, s) => sum + s, 0) / speeds.length).toFixed(2));
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
