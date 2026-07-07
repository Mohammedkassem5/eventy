import { Router } from "express";
import { listVenues } from "../../controllers/admin/venueController.js";

const router = Router();
router.get("/", listVenues);
export default router;
