"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trafficController_1 = require("../controllers/trafficController");
const router = (0, express_1.Router)();
router.post("/analyze", trafficController_1.analyzeTraffic);
router.get("/records", trafficController_1.getAllRecords);
router.get("/records/:id", trafficController_1.getRecordById);
exports.default = router;
