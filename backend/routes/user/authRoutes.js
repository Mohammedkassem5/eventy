import { Router } from "express";
import Joi from "joi";
import validate from "../../middleware/validate.js";
import verifyToken from "../../middleware/auth/verifyToken.js";
import {
  register,
  verifyRegister,
  login,
  resendOtp,
  forgotPassword,
  resetPassword,
  me,
  logout,
} from "../../controllers/user/authController.js";
import {
  registerSchema,
  loginSchema,
  verifySchema,
  forgotSchema,
  resetSchema,
  resendSchema,
} from "../../validations/user/authValidation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/register/verify", validate(verifySchema), verifyRegister);
router.post("/login", validate(loginSchema), login);
router.post("/otp/resend", validate(resendSchema), resendOtp);
router.post("/password/forgot", validate(forgotSchema), forgotPassword);
router.post("/password/reset", validate(resetSchema), resetPassword);
router.get("/me", verifyToken, me);
router.post("/logout", logout);

export default router;
