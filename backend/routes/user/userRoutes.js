import { Router } from "express";
import verifyToken from "../../middleware/auth/verifyToken.js";
import validate from "../../middleware/validate.js";
import { avatarUpload } from "../../config/multer.js";
import { updateProfile, uploadAvatar } from "../../controllers/user/profileController.js";
import { updateProfileSchema } from "../../validations/user/profileValidation.js";

const router = Router();

router.patch("/profile", verifyToken, validate(updateProfileSchema), updateProfile);
router.post("/avatar", verifyToken, avatarUpload.single("avatar"), uploadAvatar);

export default router;
