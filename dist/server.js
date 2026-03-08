"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./models/db");
const trafficRoutes_1 = __importDefault(require("./routes/trafficRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/traffic_los";
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/traffic", trafficRoutes_1.default);
app.get("/", (_req, res) => {
    res.json({ message: "Traffic LOS API is running" });
});
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "traffic-los-backend",
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
    });
});
(0, db_1.connectDB)(MONGODB_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
