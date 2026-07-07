import TicketCategory from "../../models/ticket/TicketCategory.js";
import Seat from "../../models/ticket/Seat.js";
import { heldOwners } from "../../utils/seatHold.js";

/* ===== GET /api/events/:id/ticket-categories ===== */
export async function listTicketCategories(req, res) {
  const categories = await TicketCategory.findAll({
    where: { event_id: req.params.id },
    order: [["sort_order", "ASC"], ["id", "ASC"]],
  });
  res.json({ categories });
}

/* ===== GET /api/events/:id/seats?category=catId ===== */
export async function listSeats(req, res) {
  const where = { event_id: req.params.id };
  if (req.query.category) where.ticket_category_id = req.query.category;

  const rows = await Seat.findAll({
    where,
    attributes: ["id", "ticket_category_id", "row_label", "seat_number", "seat_code", "status", "x", "y"],
    order: [["y", "ASC"], ["seat_number", "ASC"]],
  });

  // overlay الحجوزات المؤقتة من Redis — المحجوز لغير هذه الجلسة يظهر "held"
  const sessionId = req.query.session_id ? String(req.query.session_id) : null;
  const availableIds = rows.filter((s) => s.status === "available").map((s) => s.id);
  const owners = await heldOwners(req.params.id, availableIds);
  const seats = rows.map((s) => {
    const owner = owners[s.id];
    if (owner && owner !== sessionId) return { ...s.toJSON(), status: "held" };
    return s;
  });
  res.json({ seats });
}
