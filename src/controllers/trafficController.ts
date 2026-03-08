import { Request, Response } from "express";
import { calculatePCU, calculateDensity, calculateLOS } from "../services/trafficService";
import { analyzeArea } from "../services/areaAnalysisService";
import { TrafficData } from "../models/TrafficData";

export const analyzeTraffic = async (req: Request, res: Response): Promise<void> => {
  const { location, bike, car, auto, bus, truck, speed } = req.body;

  if (!location || bike == null || car == null || auto == null || bus == null || truck == null || speed == null) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const pcu = calculatePCU({ bike, car, auto, bus, truck });
  const density = calculateDensity(pcu, speed);
  const los = calculateLOS(density);
  const totalVehicles = bike + car + auto + bus + truck;

  const record = await TrafficData.create({
    location,
    bike,
    car,
    auto,
    bus,
    truck,
    speed,
    pcu,
    density,
    los,
  });

  res.json({
    id: record._id,
    location,
    totalVehicles,
    pcu,
    density,
    los,
    speed,
    bike,
    car,
    auto,
    bus,
    truck,
    createdAt: record.createdAt,
  });
};

export const getAllRecords = async (_req: Request, res: Response): Promise<void> => {
  const records = await TrafficData.find().sort({ createdAt: -1 });
  res.json(records);
};

export const getRecordById = async (req: Request, res: Response): Promise<void> => {
  const record = await TrafficData.findById(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.json(record);
};

export const analyzeAreaTraffic = async (req: Request, res: Response): Promise<void> => {
  const { north, south, east, west } = req.body;

  if (north == null || south == null || east == null || west == null) {
    res.status(400).json({ error: "Bounding box coordinates (north, south, east, west) are required" });
    return;
  }

  if (north <= south || east <= west) {
    res.status(400).json({ error: "Invalid bounding box: north must be > south, east must be > west" });
    return;
  }

  try {
    const result = await analyzeArea({ north, south, east, west });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Area analysis failed";
    res.status(500).json({ error: message });
  }
};
