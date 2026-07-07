import { Op, fn, col } from "sequelize";
import SupportMessage from "../../models/support/SupportMessage.js";
import SupportSession from "../../models/support/SupportSession.js";
import User from "../../models/user/User.js";
import Booking from "../../models/booking/Booking.js";
import Event from "../../models/event/Event.js";
import RefundRequest from "../../models/booking/RefundRequest.js";
import { emitSupportMessage, emitSession } from "../../utils/socket.js";
import { presentSession, latestSession } from "../user/supportController.js";

/* ===== GET /api/admin/support/conversations ===== */
export async function listConversations(_req, res) {
  const rows = await SupportMessage.findAll({
    attributes: ["user_id", [fn("MAX", col("created_at")), "last_at"]],
    group: ["user_id"],
    order: [[fn("MAX", col("created_at")), "DESC"]],
    raw: true,
  });
  const userIds = rows.map((r) => r.user_id);
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds.length ? userIds : [0] } },
    attributes: ["id", "name", "email", "avatar"],
    raw: true,
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const convos = await Promise.all(
    rows.map(async (r) => {
      const last = await SupportMessage.findOne({ where: { user_id: r.user_id }, order: [["createdAt", "DESC"]], raw: true });
      const unread = await SupportMessage.count({ where: { user_id: r.user_id, sender: "user", is_read: false } });
      const session = await latestSession(r.user_id);
      return { user: userMap[r.user_id] || { id: r.user_id }, last, unread, session: presentSession(session) };
    })
  );
  res.json({ conversations: convos });
}

/* ===== GET /api/admin/support/:userId ===== */
export async function getConversation(req, res) {
  const session = await latestSession(req.params.userId);
  const where = { user_id: req.params.userId };
  if (session) where.session_id = session.id;
  const messages = await SupportMessage.findAll({ where, order: [["createdAt", "ASC"]] });
  await SupportMessage.update({ is_read: true }, { where: { user_id: req.params.userId, sender: "user", is_read: false } });
  res.json({ messages, session: presentSession(session) });
}

/* ===== POST /api/admin/support/:userId/reply ===== */
export async function reply(req, res) {
  const userId = Number(req.params.userId);
  const session = await latestSession(userId);
  if (!session || session.status === "closed")
    return res.status(400).json({ message: "المحادثة مغلقة — لا يمكن الرد" });
  // أول أدمن يردّ = وكيل الجلسة
  if (!session.agent_id) await session.update({ agent_id: req.admin.id });

  const msg = await SupportMessage.create({ session_id: session.id, user_id: userId, sender: "admin", body: req.body.body });
  emitSupportMessage(userId, msg.toJSON());
  res.status(201).json({ message: msg });
}

/* ===== GET /api/admin/support/:userId/context — بيانات العميل المفيدة للدعم فقط ===== */
export async function userContext(req, res) {
  const userId = Number(req.params.userId);
  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "email", "phone", "createdAt", "loyalty_points", "wallet_balance", "is_banned", "banned_until", "ban_reason"],
  });
  if (!user) return res.status(404).json({ message: "العميل غير موجود" });

  // آخر الحجوزات — المهم للدعم: الحالة، الدفع، طريقة الدفع، المبلغ
  const bookings = await Booking.findAll({
    where: { user_id: userId },
    attributes: ["id", "booking_ref", "quantity", "total_amount", "status", "payment_status", "payment_method", "createdAt"],
    include: [{ model: Event, as: "event", attributes: ["title_ar"] }],
    order: [["createdAt", "DESC"]],
    limit: 8,
  });

  // طلبات الاسترداد
  const refunds = await RefundRequest.findAll({
    where: { user_id: userId },
    attributes: ["id", "booking_id", "reason", "refund_amount", "status", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 5,
  });

  // عدّادات سريعة
  const totalBookings = await Booking.count({ where: { user_id: userId } });
  const spentRow = await Booking.findOne({
    where: { user_id: userId, status: "confirmed" },
    attributes: [[fn("COALESCE", fn("SUM", col("total_amount")), 0), "spent"]],
    raw: true,
  });

  res.json({
    user: user.toJSON(),
    stats: { totalBookings, spent: Number(spentRow?.spent || 0) },
    bookings: bookings.map((b) => ({
      booking_ref: b.booking_ref,
      event: b.event?.title_ar,
      quantity: b.quantity,
      total_amount: b.total_amount,
      status: b.status,
      payment_status: b.payment_status,
      payment_method: b.payment_method,
      createdAt: b.createdAt,
    })),
    refunds: refunds.map((r) => ({
      booking_id: r.booking_id,
      reason: r.reason,
      refund_amount: r.refund_amount,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
}

/* ===== POST /api/admin/support/:userId/close ===== */
export async function closeConversation(req, res) {
  const userId = Number(req.params.userId);
  const session = await latestSession(userId);
  if (!session || session.status === "closed")
    return res.status(400).json({ message: "لا توجد محادثة مفتوحة" });
  if (!session.agent_id) await session.update({ agent_id: req.admin.id });
  await session.update({ status: "closed", closed_by: "admin", closed_at: new Date() });
  emitSession(userId, "support:closed", presentSession(session));
  res.json({ message: "تم إنهاء المحادثة", session: presentSession(session) });
}
