"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficData = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const trafficDataSchema = new mongoose_1.default.Schema({
    location: { type: String, required: true },
    bike: { type: Number, required: true },
    car: { type: Number, required: true },
    auto: { type: Number, required: true },
    bus: { type: Number, required: true },
    truck: { type: Number, required: true },
    speed: { type: Number, required: true },
    pcu: { type: Number, required: true },
    density: { type: Number, required: true },
    los: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.TrafficData = mongoose_1.default.model("TrafficData", trafficDataSchema);
