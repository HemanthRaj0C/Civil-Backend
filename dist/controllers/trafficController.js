"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecordById = exports.getAllRecords = exports.analyzeTraffic = void 0;
const trafficService_1 = require("../services/trafficService");
const TrafficData_1 = require("../models/TrafficData");
const analyzeTraffic = async (req, res) => {
    const { location, bike, car, auto, bus, truck, speed } = req.body;
    if (!location || bike == null || car == null || auto == null || bus == null || truck == null || speed == null) {
        res.status(400).json({ error: "All fields are required" });
        return;
    }
    const pcu = (0, trafficService_1.calculatePCU)({ bike, car, auto, bus, truck });
    const density = (0, trafficService_1.calculateDensity)(pcu, speed);
    const los = (0, trafficService_1.calculateLOS)(density);
    const totalVehicles = bike + car + auto + bus + truck;
    const record = await TrafficData_1.TrafficData.create({
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
exports.analyzeTraffic = analyzeTraffic;
const getAllRecords = async (_req, res) => {
    const records = await TrafficData_1.TrafficData.find().sort({ createdAt: -1 });
    res.json(records);
};
exports.getAllRecords = getAllRecords;
const getRecordById = async (req, res) => {
    const record = await TrafficData_1.TrafficData.findById(req.params.id);
    if (!record) {
        res.status(404).json({ error: "Record not found" });
        return;
    }
    res.json(record);
};
exports.getRecordById = getRecordById;
