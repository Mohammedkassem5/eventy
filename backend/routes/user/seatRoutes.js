import { Router } from "express";
import verifyToken from "../../middleware/auth/verifyToken.js";
import { hold, release } from "../../controllers/public/seatHoldController.js";

const router = Router();
router.use(verifyToken);
router.post("/hold", hold);
router.post("/release", release);
export default router;
