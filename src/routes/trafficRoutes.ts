import { Router } from "express";
import { analyzeTraffic, analyzeAreaTraffic, getAllRecords, getRecordById } from "../controllers/trafficController";

const router = Router();

router.post("/analyze", analyzeTraffic);
router.post("/analyze-area", analyzeAreaTraffic);
router.get("/records", getAllRecords);
router.get("/records/:id", getRecordById);

export default router;
