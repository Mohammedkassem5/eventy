import { Op } from "sequelize";
import { sequelize } from "../../config/db.js";
import Booking from "../../models/booking/Booking.js";
import BookingSeat from "../../models/booking/BookingSeat.js";
import Seat from "../../models/ticket/Seat.js";
import TicketCategory from "../../models/ticket/TicketCategory.js";
import Event from "../../models/event/Event.js";
import User from "../../models/user/User.js";
import { sendBookingEmail } from "../../utils/mailer.js";
import { qrAvailable } from "../../utils/businessRules.js";
import logger from "../../utils/logger.js";

const includeFull = [
  { model: User, as: "user", attributes: ["id", "name", "email", "phone", "avatar"] },
  { model: Event, as: "event", attributes: ["id", "title_ar", "poster", "venue_name", "city", "date_start", "delivery_mode"] },
  { model: TicketCategory, as: "ticketCategory", attributes: ["id", "name", "color_hex"] },
  { model: BookingSeat, as: "seats", attributes: ["seat_code", "price"] },
];

/* ===== GET /api/admin/bookings?status=&event_id=&q=&page=&limit= ===== */
export async function adminListBookings(req, res) {
  const { status, event_id, q, page = 1, limit = 15 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (event_id) where.event_id = event_id;
  if (q) {
    where[Op.or] = [
      { booking_ref: { [Op.like]: `%${q}%` } },
      { "$user.email$": { [Op.like]: `%${q}%` } },
      { "$user.name$": { [Op.like]: `%${q}%` } },
    ];
  }

  const { rows, count } = await Booking.findAndCountAll({
    where,
    include: includeFull,
    order: [["createdAt", "DESC"]],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    distinct: true,
    subQuery: false,
  });

  // ملخص الأرقام
  const [summary] = await sequelize.query(
    `SELECT
      COUNT(*) total,
      SUM(status='confirmed') confirmed,
      SUM(status='pending') pending,
      SUM(status='cancelled') cancelled,
      IFNULL(SUM(CASE WHEN status='confirmed' THEN total_amount END),0) revenue
     FROM bookings`,
    { type: sequelize.QueryTypes.SELECT }
  );

  res.json({
    bookings: rows,
    total: count,
    page: Number(page),
    pages: Math.ceil(count / Number(limit)),
    summary,
  });
}

/* ===== GET /api/admin/bookings/:ref ===== */
export async function adminGetBooking(req, res) {
  const booking = await Booking.findOne({ where: { booking_ref: req.params.ref }, include: includeFull });
  if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });
  res.json({ booking });
}

/* ===== PATCH /api/admin/bookings/:ref/cancel — إلغاء إداري (تجاوز القواعد) ===== */
export async function adminCancelBooking(req, res) {
  try {
    await sequelize.transaction(async (t) => {
      const booking = await Booking.findOne({
        where: { booking_ref: req.params.ref },
        include: [{ model: BookingSeat, as: "seats" }],
        transaction: t,
      });
      if (!booking) { const e = new Error("الحجز غير موجود"); e.status = 404; throw e; }
      if (booking.status === "cancelled") { const e = new Error("الحجز ملغي بالفعل"); e.status = 400; throw e; }

      const seatIds = booking.seats.map((s) => s.seat_id);
      if (seatIds.length) {
        await Seat.update({ status: "available" }, { where: { id: seatIds }, transaction: t });
        await TicketCategory.increment("available_seats", { by: seatIds.length, where: { id: booking.ticket_category_id }, transaction: t });
      }
      const user = await User.findByPk(booking.user_id, { transaction: t });
      if (user) await user.update({ loyalty_points: user.loyalty_points + booking.points_used - booking.points_earned }, { transaction: t });
      await booking.update({ status: "cancelled", payment_status: "refunded" }, { transaction: t });
    });
    res.json({ message: "تم إلغاء الحجز واسترداد المقاعد والنقاط" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}

/* ===== PATCH /api/admin/bookings/:ref/confirm-payment — تأكيد وصول الفلوس ===== */
export async function adminConfirmPayment(req, res) {
  const booking = await Booking.findOne({ where: { booking_ref: req.params.ref }, include: includeFull });
  if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });
  if (booking.payment_status !== "pending" || booking.status === "cancelled")
    return res.status(400).json({ message: "الحجز ليس بانتظار تأكيد الدفع" });

  await booking.update({ payment_status: "paid", status: "confirmed", qr_sent: qrAvailable(booking.event) });

  // أرسل الإيميل + الكود بعد تأكيد الدفع فقط
  try {
    if (booking.user?.email && qrAvailable(booking.event)) await sendBookingEmail(booking.user.email, booking);
  } catch (e) { logger.error("confirm-payment email failed", { stack: e.stack }); }

  res.json({ message: "تم تأكيد الدفع وإرسال الكود للعميل" });
}

/* ===== PATCH /api/admin/bookings/:ref/reject-payment — رفض/فشل الدفع ===== */
export async function adminRejectPayment(req, res) {
  try {
    await sequelize.transaction(async (t) => {
      const booking = await Booking.findOne({
        where: { booking_ref: req.params.ref },
        include: [{ model: BookingSeat, as: "seats" }],
        transaction: t,
      });
      if (!booking) { const e = new Error("الحجز غير موجود"); e.status = 404; throw e; }
      if (booking.payment_status !== "pending") { const e = new Error("لا يمكن رفض حجز مؤكّد"); e.status = 400; throw e; }

      const seatIds = booking.seats.map((s) => s.seat_id);
      if (seatIds.length) {
        await Seat.update({ status: "available" }, { where: { id: seatIds }, transaction: t });
        await TicketCategory.increment("available_seats", { by: seatIds.length, where: { id: booking.ticket_category_id }, transaction: t });
      }
      // ردّ النقاط والمحفظة المخصومة عند الإنشاء
      const user = await User.findByPk(booking.user_id, { transaction: t });
      if (user) await user.update({
        loyalty_points: user.loyalty_points + booking.points_used - booking.points_earned,
        wallet_balance: Number(user.wallet_balance) + Number(booking.wallet_amount || 0),
      }, { transaction: t });
      await booking.update({ status: "cancelled" }, { transaction: t });
    });
    res.json({ message: "تم رفض الدفع وإلغاء الحجز" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
