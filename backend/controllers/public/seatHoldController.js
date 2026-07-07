import Seat from "../../models/ticket/Seat.js";
import { holdSeats, releaseSeats, HOLD_TTL } from "../../utils/seatHold.js";
import { emitSeatUpdate } from "../../utils/socket.js";

/* ===== POST /api/seats/hold — حجز مؤقت ===== */
export async function hold(req, res) {
  const { event_id, session_id, seat_ids } = req.body;
  if (!event_id || !session_id || !Array.isArray(seat_ids) || !seat_ids.length)
    return res.status(400).json({ message: "بيانات غير مكتملة" });

  // تأكد أنها متاحة فعلًا في DB (ليست booked)
  const dbSeats = await Seat.findAll({ where: { id: seat_ids, event_id, status: "available" }, attributes: ["id"] });
  const availableIds = dbSeats.map((s) => s.id);
  const notAvailable = seat_ids.filter((id) => !availableIds.includes(id));

  const { held, failed } = await holdSeats(event_id, session_id, availableIds);
  const allFailed = [...new Set([...failed, ...notAvailable])];

  if (held.length) emitSeatUpdate(event_id, held.map((id) => ({ id, status: "held" })));
  res.json({ held, failed: allFailed, ttl: HOLD_TTL });
}

/* ===== POST /api/seats/release — تحرير حجزي ===== */
export async function release(req, res) {
  const { event_id, session_id, seat_ids } = req.body;
  if (!event_id || !session_id || !Array.isArray(seat_ids)) return res.status(400).json({ message: "بيانات غير مكتملة" });
  const released = await releaseSeats(event_id, session_id, seat_ids);
  if (released.length) emitSeatUpdate(event_id, released.map((id) => ({ id, status: "available" })));
  res.json({ released });
}
