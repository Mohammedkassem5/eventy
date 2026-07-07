import { Router } from "express";
import { listEvents, getEvent } from "../../controllers/public/eventController.js";
import { listTicketCategories, listSeats } from "../../controllers/public/ticketController.js";

const router = Router();
router.get("/", listEvents);
router.get("/:id/ticket-categories", listTicketCategories);
router.get("/:id/seats", listSeats);
router.get("/:id", getEvent);
export default router;
