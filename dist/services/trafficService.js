"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePCU = calculatePCU;
exports.calculateDensity = calculateDensity;
exports.calculateLOS = calculateLOS;
function calculatePCU(data) {
    return (data.bike * 0.5 +
        data.car * 1.0 +
        data.auto * 1.2 +
        data.bus * 3.0 +
        data.truck * 3.0);
}
function calculateDensity(flow, speed) {
    if (speed <= 0)
        return 0;
    return parseFloat((flow / speed).toFixed(2));
}
function calculateLOS(density) {
    if (density < 11)
        return "A";
    if (density < 18)
        return "B";
    if (density < 26)
        return "C";
    if (density < 35)
        return "D";
    if (density < 45)
        return "E";
    return "F";
}
