import { Router } from "express";
import { publicConfig } from "../../controllers/public/settingsController.js";

const router = Router();
router.get("/", publicConfig);
export default router;
