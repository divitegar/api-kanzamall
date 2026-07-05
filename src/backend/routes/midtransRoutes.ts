import { Router } from "express";
import { getApis, getApisActive, saveApi, updateApi, handleMidtransWebhook, createMidtransSnapToken, syncMidtransStatus } from "../controllers/midtransController.js";

const router = Router();

router.get("/midtrans", getApis);
router.get("/midtrans/active", getApisActive);
router.get("/midtrans/status", syncMidtransStatus);
router.post("/midtrans/notification", handleMidtransWebhook);
router.post("/midtrans/snap-token", createMidtransSnapToken);
router.post("/midtrans", saveApi);
router.put("/midtrans/:order_id", updateApi);

export default router;
