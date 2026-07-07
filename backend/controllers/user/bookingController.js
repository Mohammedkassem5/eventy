import QRCode from "qrcode";
import { Transaction } from "sequelize";
import { sequelize } from "../../config/db.js";
import Booking from "../../models/booking/Booking.js";
import BookingSeat from "../../models/booking/BookingSeat.js";
import Seat from "../../models/ticket/Seat.js";
import TicketCategory from "../../models/ticket/TicketCategory.js";
import Event from "../../models/event/Event.js";
import User from "../../models/user/User.js";
import { getSettingNumber } from "../../models/settings/PlatformSetting.js";
import RefundRequest from "../../models/booking/RefundRequest.js";
import { sendBookingEmail } from "../../utils/mailer.js";
import { qrAvailable, canCancel, deliveryLabel } from "../../utils/businessRules.js";
import { heldOwners, purgeHolds } from "../../utils/seatHold.js";
import { emitSeatUpdate } from "../../utils/socket.js";
import logger from "../../utils/logger.js";

const genRef = () =>
  "EVT-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 9000 + 1000);

const includeFull = [
  { model: Event, as: "event", attributes: ["id", "title_ar", "poster", "venue_name", "city", "date_start", "delivery_mode", "qr_lead_hours", "pickup_branches"] },
  { model: TicketCategory, as: "ticketCategory", attributes: ["id", "name", "color_hex"] },
  { model: BookingSeat, as: "seats", attributes: ["seat_code", "price"] },
  { model: RefundRequest, as: "refunds", attributes: ["status", "createdAt"], required: false },
];

// تجهيز الحجز للإرجاع: إخفاء الـ QR لو لسه ماوصلش + إضافة قواعد العمل
function present(b) {
  const ev = b.event;
  const avail = qrAvailable(ev);
  const j = b.toJSON();
  const refunds = j.refunds || [];
  const latest = refunds.sort((a, b2) => new Date(b2.createdAt) - new Date(a.createdAt))[0];
  const paid = j.payment_status === "paid";
  return {
    ...j,
    qr_code: paid && avail ? j.qr_code : null, // الكود لا يظهر إلا بعد تأكيد الدفع
    qr_available: avail,
    payment_pending: j.payment_status === "pending" && j.status !== "cancelled",
    can_cancel: canCancel(b, ev),
    delivery_mode: ev?.delivery_mode || null,
    delivery_label: deliveryLabel(ev),
    refund_status: latest?.status || null,
  };
}

/* ===== POST /api/bookings ===== */
export async function createBooking(req, res) {
  const {
    event_id, ticket_category_id, seat_ids, payment_method,
    points_to_use = 0, session_id,
    wallet_amount: rawWallet = 0, vodafone_ref,
  } = req.body;

  // منع الحجز على المحظورين (دائم أو مؤقت)
  const me = await User.findByPk(req.user.id);
  const ban = me?.banStatus();
  if (ban?.active) {
    return res.status(403).json({
      message: ban.permanent
        ? "حسابك محظور ولا يمكنك الحجز"
        : `حسابك محظور حتى ${new Date(ban.until).toLocaleString("ar-EG")}${ban.reason ? ` — السبب: ${ban.reason}` : ""}`,
      ban,
    });
  }

  const ids = [...seat_ids].sort((a, b) => a - b); // ترتيب ثابت يمنع الـ deadlock

  // لا تحجز مقعدًا محجوزًا مؤقتًا لجلسة أخرى
  const owners = await heldOwners(event_id, ids);
  const stolen = ids.filter((id) => owners[id] && owners[id] !== String(session_id));
  if (stolen.length)
    return res.status(409).json({ message: "بعض المقاعد محجوزة مؤقتًا لعميل آخر — اختر غيرها" });

  const pointsPerEgp = await getSettingNumber("points_per_egp", 100);

  try {
    const result = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (t) => {
        const seats = await Seat.findAll({
          where: { id: ids, event_id, ticket_category_id, status: "available" },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (seats.length !== ids.length) {
          const err = new Error("بعض المقاعد لم تعد متاحة");
          err.status = 409;
          throw err;
        }

        const category = await TicketCategory.findByPk(ticket_category_id, { transaction: t });
        const event = await Event.findByPk(event_id, { transaction: t });
        const user = await User.findByPk(req.user.id, { transaction: t });

        // النقدي عند الاستلام مسموح فقط لفعاليات الاستلام من الفرع
        if (payment_method === "cash" && event.delivery_mode !== "branch_pickup") {
          const err = new Error("الدفع عند الاستلام غير متاح لهذه الفعالية");
          err.status = 400;
          throw err;
        }

        const price = Number(category.price);
        const subtotal = price * seats.length;

        // استبدال النقاط كخصم
        const wanted = Math.max(0, Math.min(Number(points_to_use) || 0, user.loyalty_points));
        let discountEgp = Math.floor(wanted / pointsPerEgp);
        if (discountEgp > subtotal) discountEgp = subtotal;
        const pointsUsed = discountEgp * pointsPerEgp; // بدون هدر
        const total = subtotal - discountEgp;

        // ===== خصم محفظة Eventy =====
        const walletBalance = Number(user.wallet_balance) || 0;
        let walletDeduct = Math.max(0, Math.min(Number(rawWallet) || 0, walletBalance, total));
        const remaining = total - walletDeduct; // المتبقي بعد المحفظة

        // لو المحفظة غطّت الإجمالي → لا حاجة لوسيلة ثانوية
        // لو لسه فيه متبقي → لازم وسيلة دفع
        const effectiveMethod = remaining === 0 ? "wallet" : (payment_method || "card");
        if (remaining > 0 && !payment_method) {
          const err = new Error("اختر وسيلة الدفع للمبلغ المتبقي");
          err.status = 400;
          throw err;
        }

        // حالة الدفع حسب الوسيلة: اليدوية → pending، المحفظة/البطاقة → paid
        const manualMethods = ["cash", "vodafone_cash"];
        const isPending = remaining > 0 && manualMethods.includes(effectiveMethod);

        const pointsEarned = (category.points_reward || 0) * seats.length;

        const ref = genRef();
        const qr = await QRCode.toDataURL(JSON.stringify({ ref, e: event_id, s: seats.map((x) => x.seat_code) }));
        const sendNow = !isPending && qrAvailable(event); // لا ترسل QR لو الدفع لسه pending

        const booking = await Booking.create(
          {
            booking_ref: ref,
            user_id: req.user.id,
            event_id,
            ticket_category_id,
            quantity: seats.length,
            total_amount: total,
            payment_method: effectiveMethod,
            payment_status: isPending ? "pending" : "paid",
            status: isPending ? "pending" : "confirmed",
            qr_code: qr,
            points_earned: pointsEarned,
            points_used: pointsUsed,
            wallet_amount: walletDeduct,
            vodafone_ref: effectiveMethod === "vodafone_cash" ? (vodafone_ref || null) : null,
            qr_sent: sendNow,
          },
          { transaction: t }
        );

        await BookingSeat.bulkCreate(
          seats.map((s) => ({ booking_id: booking.id, seat_id: s.id, seat_code: s.seat_code, price })),
          { transaction: t }
        );
        await Seat.update({ status: "booked" }, { where: { id: ids }, transaction: t });
        await category.decrement("available_seats", { by: seats.length, transaction: t });

        // تحديث رصيد المستخدم: نقاط + محفظة
        await user.update(
          {
            loyalty_points: user.loyalty_points - pointsUsed + pointsEarned,
            wallet_balance: walletBalance - walletDeduct,
          },
          { transaction: t }
        );

        return { bookingId: booking.id, sendNow };
      }
    );

    // احذف الحجوزات المؤقتة (المقاعد أصبحت booked) + أبلغ المشاهدين حيًّا
    await purgeHolds(event_id, ids);
    emitSeatUpdate(event_id, ids.map((id) => ({ id, status: "booked" })));

    const full = await Booking.findByPk(result.bookingId, { include: includeFull });

    // إيميل + QR: instant فقط دلوقتي (before_event → cron قبل الفعالية لاحقًا)
    if (result.sendNow) {
      try {
        const user = await User.findByPk(req.user.id);
        if (user?.email) await sendBookingEmail(user.email, full);
      } catch (e) {
        logger.error("booking email failed", { stack: e.stack });
      }
    }

    res.status(201).json({ message: "تم تأكيد الحجز", booking: present(full) });
  } catch (err) {
    if (err.status === 409 || err.status === 400) return res.status(err.status).json({ message: err.message });
    if (err.original?.code === "ER_LOCK_DEADLOCK")
      return res.status(409).json({ message: "ازدحام في الحجز — حاول مرة أخرى" });
    throw err;
  }
}

/* ===== GET /api/bookings?status= ===== */
export async function listBookings(req, res) {
  const where = { user_id: req.user.id };
  if (req.query.status) where.status = req.query.status;
  const bookings = await Booking.findAll({ where, include: includeFull, order: [["createdAt", "DESC"]] });
  res.json({ bookings: bookings.map(present) });
}

/* ===== GET /api/bookings/:ref ===== */
export async function getBooking(req, res) {
  const booking = await Booking.findOne({
    where: { booking_ref: req.params.ref, user_id: req.user.id },
    include: includeFull,
  });
  if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });
  res.json({ booking: present(booking) });
}

/* ===== POST /api/bookings/:ref/refund — طلب استرداد ===== */
export async function requestRefund(req, res) {
  const booking = await Booking.findOne({
    where: { booking_ref: req.params.ref, user_id: req.user.id },
    include: [{ model: Event, as: "event" }],
  });
  if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });
  if (booking.status !== "confirmed") return res.status(400).json({ message: "لا يمكن استرداد هذا الحجز" });
  if (!canCancel(booking, booking.event))
    return res.status(403).json({ message: "انتهت مدة طلب الاسترداد لهذا الحجز" });

  const existing = await RefundRequest.findOne({
    where: { booking_id: booking.id, status: ["pending", "approved"] },
  });
  if (existing) return res.status(409).json({ message: "يوجد طلب استرداد بالفعل لهذا الحجز" });

  const reqRow = await RefundRequest.create({
    booking_id: booking.id,
    user_id: req.user.id,
    reason: req.body.reason || null,
    refund_amount: booking.total_amount,
    status: "pending",
  });
  res.status(201).json({ message: "تم إرسال طلب الاسترداد", request: reqRow });
}

/* ===== PATCH /api/bookings/:ref/cancel ===== */
export async function cancelBooking(req, res) {
  try {
    await sequelize.transaction(async (t) => {
      const booking = await Booking.findOne({
        where: { booking_ref: req.params.ref, user_id: req.user.id },
        include: [{ model: BookingSeat, as: "seats" }, { model: Event, as: "event" }],
        transaction: t,
      });
      if (!booking) {
        const e = new Error("الحجز غير موجود");
        e.status = 404;
        throw e;
      }
      if (!canCancel(booking, booking.event)) {
        const e = new Error("لا يمكن إلغاء هذا الحجز");
        e.status = 403;
        throw e;
      }

      const seatIds = booking.seats.map((s) => s.seat_id);
      await Seat.update({ status: "available" }, { where: { id: seatIds }, transaction: t });
      await TicketCategory.increment("available_seats", {
        by: seatIds.length,
        where: { id: booking.ticket_category_id },
        transaction: t,
      });
      // عكس النقاط + إرجاع رصيد المحفظة
      const user = await User.findByPk(req.user.id, { transaction: t });
      const walletRefund = Number(booking.wallet_amount) || 0;
      await user.update(
        {
          loyalty_points: user.loyalty_points + booking.points_used - booking.points_earned,
          wallet_balance: Number(user.wallet_balance) + walletRefund,
        },
        { transaction: t }
      );
      await booking.update({ status: "cancelled", payment_status: "refunded" }, { transaction: t });
    });
    res.json({ message: "تم إلغاء الحجز" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
