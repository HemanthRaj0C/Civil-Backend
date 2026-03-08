import mongoose from "mongoose";

const trafficDataSchema = new mongoose.Schema({
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

export const TrafficData = mongoose.model("TrafficData", trafficDataSchema);
