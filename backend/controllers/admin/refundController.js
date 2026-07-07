import { sequelize } from "../../config/db.js";
import RefundRequest from "../../models/booking/RefundRequest.js";
import Booking from "../../models/booking/Booking.js";
import BookingSeat from "../../models/booking/BookingSeat.js";
import Seat from "../../models/ticket/Seat.js";
import TicketCategory from "../../models/ticket/TicketCategory.js";
import Event from "../../models/event/Event.js";
import User from "../../models/user/User.js";
import { logAudit } from "../../utils/audit.js";

const include = [
  {
    model: Booking, as: "booking",
    attributes: ["id", "booking_ref", "total_amount", "status", "quantity", "ticket_category_id", "points_earned", "points_used"],
    include: [
      { model: Event, as: "event", attributes: ["title_ar", "date_start"] },
      { model: TicketCategory, as: "ticketCategory", attributes: ["name", "color_hex"] },
    ],
  },
  { model: User, as: "user", attributes: ["id", "name", "email", "avatar"] },
];

/* ===== GET /api/admin/refunds?status=&page= ===== */
export async function listRefunds(req, res) {
  const { status, page = 1, limit = 12 } = req.query;
  const where = {};
  if (status) where.status = status;

  const { rows, count } = await RefundRequest.findAndCountAll({
    where, include,
    order: [["createdAt", "DESC"]],
    limit: Number(limit), offset: (Number(page) - 1) * Number(limit), distinct: true,
  });

  const [summary] = await sequelize.query(
    `SELECT COUNT(*) total,
      SUM(status='pending') pending,
      SUM(status='approved') approved,
      SUM(status='rejected') rejected,
      IFNULL(SUM(CASE WHEN status='approved' THEN refund_amount END),0) refunded
     FROM refund_requests`,
    { type: sequelize.QueryTypes.SELECT }
  );

  res.json({ requests: rows, total: count, page: Number(page), pages: Math.ceil(count / Number(limit)), summary });
}

/* ===== PATCH /api/admin/refunds/:id/approve — موافقة → إلغاء واسترداد ===== */
export async function approveRefund(req, res) {
  try {
    const { getSettingNumber } = await import("../../models/settings/PlatformSetting.js");
    const pointsPerEgp = await getSettingNumber("points_per_egp", 100);
    let refInfo = { id: req.params.id, amount: 0, points: 0 };

    await sequelize.transaction(async (t) => {
      const reqRow = await RefundRequest.findByPk(req.params.id, { transaction: t });
      if (!reqRow) { const e = new Error("الطلب غير موجود"); e.status = 404; throw e; }
      if (reqRow.status !== "pending") { const e = new Error("تمت معالجة الطلب بالفعل"); e.status = 400; throw e; }
      refInfo = { id: reqRow.id, amount: Number(reqRow.refund_amount), points: Math.round(Number(reqRow.refund_amount) * pointsPerEgp) };

      const booking = await Booking.findByPk(reqRow.booking_id, {
        include: [{ model: BookingSeat, as: "seats" }], transaction: t,
      });
      if (booking && booking.status !== "cancelled") {
        const seatIds = booking.seats.map((s) => s.seat_id);
        if (seatIds.length) {
          await Seat.update({ status: "available" }, { where: { id: seatIds }, transaction: t });
          await TicketCategory.increment("available_seats", { by: seatIds.length, where: { id: booking.ticket_category_id }, transaction: t });
        }
        const user = await User.findByPk(booking.user_id, { transaction: t });
        if (user) {
          // عكس نقاط الحجز + استرداد المبلغ المدفوع كنقاط (لا يُرد للبنك)
          const back = booking.points_used - booking.points_earned + refInfo.points;
          await user.update({ loyalty_points: Math.max(0, user.loyalty_points + back) }, { transaction: t });
        }
        await booking.update({ status: "cancelled", payment_status: "refunded" }, { transaction: t });
      }
      await reqRow.update({ status: "approved", admin_note: req.body.note || null, responded_at: new Date() }, { transaction: t });
    });
    await logAudit(req, "refund.approve", `طلب #${refInfo.id}`, { amount: refInfo.amount, refunded_points: refInfo.points });
    res.json({ message: `تمت الموافقة — أُعيد ${refInfo.points} نقطة للعميل` });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}

/* ===== PATCH /api/admin/refunds/:id/reject ===== */
export async function rejectRefund(req, res) {
  const reqRow = await RefundRequest.findByPk(req.params.id);
  if (!reqRow) return res.status(404).json({ message: "الطلب غير موجود" });
  if (reqRow.status !== "pending") return res.status(400).json({ message: "تمت معالجة الطلب بالفعل" });
  await reqRow.update({ status: "rejected", admin_note: req.body.note || null, responded_at: new Date() });
  await logAudit(req, "refund.reject", `طلب #${reqRow.id}`, { note: req.body.note || null });
  res.json({ message: "تم رفض الطلب" });
}
