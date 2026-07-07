import { Router } from "express";
import verifyAdmin from "../../middleware/auth/verifyAdmin.js";
import { avatarUpload } from "../../config/multer.js";
import { getProfile, updateProfile, uploadAvatar } from "../../controllers/admin/profileController.js";

// ملف المشرف الشخصي — أي مشرف مسجّل (بدون صلاحية خاصة)
const router = Router();
router.get("/", verifyAdmin, getProfile);
router.patch("/", verifyAdmin, updateProfile);
router.post("/avatar", verifyAdmin, avatarUpload.single("avatar"), uploadAvatar);
export default router;
