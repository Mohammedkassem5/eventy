import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import authorizePermission from "../../middleware/auth/authorizePermission.js";
import { adminListSettings, updateSetting, createSetting, deleteSetting } from "../../controllers/public/settingsController.js";

const router = Router();
router.use(verifyAdmin, authorizePermission("settings.manage"));
router.get("/", adminListSettings);
router.post("/", createSetting);
router.patch("/:key", updateSetting);
router.delete("/:key", deleteSetting);
export default router;
