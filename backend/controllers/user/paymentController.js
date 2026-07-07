import QRCode from "qrcode";
import { Transaction } from "sequelize";
import { sequelize } from "../../config/db.js";
import redis from "../../config/redis.js";
import Booking from "../../models/booking/Booking.js";
import BookingSeat from "../../models/booking/BookingSeat.js";
import Seat from "../../models/ticket/Seat.js";
import TicketCategory from "../../models/ticket/TicketCategory.js";
import Event from "../../models/event/Event.js";
import User from "../../models/user/User.js";
import { getSettingNumber } from "../../models/settings/PlatformSetting.js";
import { sendBookingEmail } from "../../utils/mailer.js";
import { qrAvailable } from "../../utils/businessRules.js";
import { heldOwners, purgeHolds, releaseSeats, holdSeats } from "../../utils/seatHold.js";
import { emitSeatUpdate } from "../../utils/socket.js";
import * as paymob from "../../utils/paymob.js";
import logger from "../../utils/logger.js";

const genRef = () => "EVT" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const pkey = (ref) => `pay:pending:${ref}`;

/* ===== POST /api/payments/paymob/init — يبدأ الدفع بلا إنشاء حجز (يُنشأ عند النجاح فقط) ===== */
export async function initPaymob(req, res) {
  const { event_id, ticket_category_id, seat_ids, points_to_use = 0, wallet_amount = 0, session_id } = req.body;
  if (!event_id || !ticket_category_id || !Array.isArray(seat_ids) || !seat_ids.length)
    return res.status(400).json({ message: "بيانات غير مكتملة" });

  const me = await User.findByPk(req.user.id);
  if (me?.banStatus().active) return res.status(403).json({ message: "حسابك محظور" });

  const ids = [...seat_ids].sort((a, b) => a - b);
  const owners = await heldOwners(event_id, ids);
  if (ids.some((id) => owners[id] && owners[id] !== String(session_id)))
    return res.status(409).json({ message: "بعض المقاعد محجوزة لعميل آخر" });
  const dbSeats = await Seat.findAll({ where: { id: ids, event_id, ticket_category_id, status: "available" } });
  if (dbSeats.length !== ids.length) return res.status(409).json({ message: "بعض المقاعد لم تعد متاحة" });

  const category = await TicketCategory.findByPk(ticket_category_id);
  const pointsPerEgp = await getSettingNumber("points_per_egp", 100);
  const subtotal = Number(category.price) * ids.length;
  const wanted = Math.max(0, Math.min(Number(points_to_use) || 0, me.loyalty_points));
  let discountEgp = Math.floor(wanted / pointsPerEgp);
  if (discountEgp > subtotal) discountEgp = subtotal;
  const pointsUsed = discountEgp * pointsPerEgp;
  const afterPoints = subtotal - discountEgp;
  const walletUse = Math.max(0, Math.min(Number(wallet_amount) || 0, Number(me.wallet_balance) || 0, afterPoints));
  const total = afterPoints - walletUse; // المبلغ للبطاقة
  const pointsEarned = (category.points_reward || 0) * ids.length;
  if (total <= 0) return res.status(400).json({ message: "المبلغ صفر — لا حاجة للبطاقة" });

  const ref = genRef();
  if (session_id) await holdSeats(event_id, session_id, ids); // ثبّت الحجز المؤقت أثناء الدفع

  // خزّن الطلب المؤقت — لا حجز في DB إلا بعد نجاح الدفع
  const payload = {
    user_id: req.user.id, event_id, ticket_category_id, seat_ids: ids,
    price: Number(category.price), total, points_used: pointsUsed, points_earned: pointsEarned,
    wallet_amount: walletUse, session_id: session_id || null,
  };
  await redis.set(pkey(ref), JSON.stringify(payload), "EX", 3600);

  try {
    const token = await paymob.authToken();
    const amountCents = Math.round(total * 100);
    const orderId = await paymob.createOrder(token, amountCents, ref);
    const payKey = await paymob.paymentKey(token, amountCents, orderId, paymob.billingData(me, ids.length));
    res.json({ iframe_url: paymob.iframeUrl(payKey), booking_ref: ref });
  } catch (e) {
    logger.error("paymob init failed", { stack: e.stack });
    await redis.del(pkey(ref));
    if (session_id) await releaseSeats(event_id, session_id, ids).catch(() => {});
    res.status(502).json({ message: "تعذّر بدء الدفع، حاول مرة أخرى" });
  }
}

// تسوية نتيجة Paymob — تُنشئ الحجز عند النجاح فقط، وتُهمل الفشل تمامًا
async function settle(ref, success) {
  if (!ref) return { status: "not_found" };
  const raw = await redis.get(pkey(ref));
  if (!raw) {
    const existing = await Booking.findOne({ where: { booking_ref: ref } });
    return { status: existing?.status || "not_found" };
  }
  const p = JSON.parse(raw);
  await redis.del(pkey(ref)); // idempotent

  if (!success) {
    if (p.session_id) await releaseSeats(p.event_id, p.session_id, p.seat_ids).catch(() => {});
    return { status: "cancelled" }; // لا حجز يُنشأ
  }

  try {
    let bookingId;
    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (t) => {
      const seats = await Seat.findAll({ where: { id: p.seat_ids, status: "available" }, lock: t.LOCK.UPDATE, transaction: t });
      if (seats.length !== p.seat_ids.length) throw new Error("seats gone");
      const event = await Event.findByPk(p.event_id, { transaction: t });
      const qr = await QRCode.toDataURL(JSON.stringify({ ref, e: p.event_id, s: seats.map((x) => x.seat_code) }));
      const booking = await Booking.create({
        booking_ref: ref, user_id: p.user_id, event_id: p.event_id, ticket_category_id: p.ticket_category_id,
        quantity: seats.length, total_amount: p.total, payment_method: "card",
        payment_status: "paid", status: "confirmed", qr_code: qr, qr_sent: qrAvailable(event),
        points_earned: p.points_earned, points_used: p.points_used, wallet_amount: p.wallet_amount,
      }, { transaction: t });
      bookingId = booking.id;
      await BookingSeat.bulkCreate(seats.map((s) => ({ booking_id: booking.id, seat_id: s.id, seat_code: s.seat_code, price: p.price })), { transaction: t });
      await Seat.update({ status: "booked" }, { where: { id: p.seat_ids }, transaction: t });
      await TicketCategory.increment({ available_seats: -seats.length }, { where: { id: p.ticket_category_id }, transaction: t });
      const user = await User.findByPk(p.user_id, { transaction: t });
      await user.update({
        loyalty_points: user.loyalty_points - p.points_used + p.points_earned,
        wallet_balance: Number(user.wallet_balance) - Number(p.wallet_amount || 0),
      }, { transaction: t });
    });
    await purgeHolds(p.event_id, p.seat_ids);
    emitSeatUpdate(p.event_id, p.seat_ids.map((id) => ({ id, status: "booked" })));
    // إيميل + الكود (بعد الدفع الفعلي فقط)
    try {
      const full = await Booking.findByPk(bookingId, {
        include: [
          { model: Event, as: "event" },
          { model: TicketCategory, as: "ticketCategory" },
          { model: BookingSeat, as: "seats" },
        ],
      });
      const user = await User.findByPk(p.user_id);
      if (user?.email && qrAvailable(full.event)) await sendBookingEmail(user.email, full);
    } catch (e) { logger.error("paid email failed", { stack: e.stack }); }
    return { status: "confirmed" };
  } catch (e) {
    if (e.message !== "seats gone") logger.error("paymob confirm failed", { stack: e.stack });
    if (p.session_id) await releaseSeats(p.event_id, p.session_id, p.seat_ids).catch(() => {});
    return { status: "error" };
  }
}

/* ===== GET /api/payments/paymob/status?ref= — استعلام من Paymob وتسوية (مستقل عن redirect) ===== */
export async function paymobStatus(req, res) {
  const ref = req.query.ref;
  if (!ref) return res.status(400).json({ status: "not_found" });
  // لو اتعمل حجز خلاص
  const existing = await Booking.findOne({ where: { booking_ref: ref } });
  if (existing) return res.json({ status: existing.status });
  // لسه معلّق؟ استعلم من Paymob
  const raw = await redis.get(pkey(ref));
  if (!raw) return res.json({ status: "not_found" });
  try {
    const token = await paymob.authToken();
    const r = await paymob.inquire(token, ref);
    if (r.success) { const out = await settle(ref, true); return res.json(out); }
    return res.json({ status: "pending" }); // لسه ما دفعش
  } catch (e) {
    logger.error("paymob status failed", { stack: e.stack });
    res.json({ status: "pending" });
  }
}

/* ===== POST /api/payments/paymob/callback — server-to-server ===== */
export async function paymobCallback(req, res) {
  const obj = req.body?.obj;
  if (!obj || !paymob.verifyHmac(obj, req.query?.hmac)) return res.status(401).send("bad");
  await settle(obj.order?.merchant_order_id, obj.success === true);
  res.status(200).send("ok");
}

/* ===== POST /api/payments/paymob/verify — تأكيد عبر رجوع المتصفح ===== */
export async function paymobVerify(req, res) {
  const q = req.body || {};
  const obj = {
    amount_cents: q.amount_cents, created_at: q.created_at, currency: q.currency,
    error_occured: q.error_occured, has_parent_transaction: q.has_parent_transaction,
    id: q.id, integration_id: q.integration_id, is_3d_secure: q.is_3d_secure,
    is_auth: q.is_auth, is_capture: q.is_capture, is_refunded: q.is_refunded,
    is_standalone_payment: q.is_standalone_payment, is_voided: q.is_voided,
    order: { id: q.order }, owner: q.owner, pending: q.pending,
    source_data: { pan: q["source_data.pan"], sub_type: q["source_data.sub_type"], type: q["source_data.type"] },
    success: q.success,
  };
  if (!paymob.verifyHmac(obj, q.hmac)) return res.status(401).json({ message: "توقيع غير صالح" });
  const success = q.success === "true" || q.success === true;
  const r = await settle(q.merchant_order_id, success);
  res.json(r);
}
