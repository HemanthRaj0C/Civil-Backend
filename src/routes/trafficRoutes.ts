import { Router } from "express";
import { analyzeTraffic, getAllRecords, getRecordById } from "../controllers/trafficController";

const router = Router();

router.post("/analyze", analyzeTraffic);
router.get("/records", getAllRecords);
router.get("/records/:id", getRecordById);

export default router;
