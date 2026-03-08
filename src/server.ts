import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./models/db";
import trafficRoutes from "./routes/trafficRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/traffic_los";

app.use(cors());
app.use(express.json());

app.use("/api/traffic", trafficRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Traffic LOS API is running" });
});

connectDB(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
