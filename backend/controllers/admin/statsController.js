import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
import Booking from "../../models/booking/Booking.js";
import User from "../../models/user/User.js";
import Event from "../../models/event/Event.js";

const SEL = { type: QueryTypes.SELECT };

/* ===== GET /api/admin/stats — لوحة المعلومات ===== */
export async function dashboardStats(_req, res) {
  // إجماليات
  const [totals] = await sequelize.query(
    `SELECT
      (SELECT IFNULL(SUM(total_amount),0) FROM bookings WHERE status='confirmed') AS revenue_total,
      (SELECT IFNULL(SUM(total_amount),0) FROM bookings WHERE status='confirmed' AND DATE(created_at)=CURDATE()) AS revenue_today,
      (SELECT COUNT(*) FROM bookings WHERE status='confirmed') AS bookings_total,
      (SELECT COUNT(*) FROM bookings WHERE status='confirmed' AND DATE(created_at)=CURDATE()) AS bookings_today,
      (SELECT IFNULL(SUM(quantity),0) FROM bookings WHERE status='confirmed') AS tickets_sold,
      (SELECT COUNT(*) FROM users) AS users_total,
      (SELECT COUNT(*) FROM users WHERE DATE(created_at)=CURDATE()) AS users_today,
      (SELECT COUNT(*) FROM events) AS events_total,
      (SELECT COUNT(*) FROM events WHERE status='published') AS events_published,
      (SELECT COUNT(*) FROM events WHERE date_start > NOW()) AS events_upcoming`,
    SEL
  );

  // سلسلة آخر 14 يوم
  const rows = await sequelize.query(
    `SELECT DATE(created_at) d, IFNULL(SUM(total_amount),0) rev, COUNT(*) cnt
     FROM bookings WHERE status='confirmed' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(created_at)`,
    SEL
  );
  const byDay = Object.fromEntries(rows.map((r) => [String(r.d).slice(0, 10), r]));
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    series.push({ date: key, revenue: Number(byDay[key]?.rev || 0), bookings: Number(byDay[key]?.cnt || 0) });
  }

  // حسب الحالة
  const statusRows = await sequelize.query(`SELECT status, COUNT(*) c FROM bookings GROUP BY status`, SEL);
  const byStatus = { confirmed: 0, pending: 0, cancelled: 0 };
  statusRows.forEach((r) => (byStatus[r.status] = Number(r.c)));

  // وسائل الدفع
  const payment = await sequelize.query(
    `SELECT payment_method m, COUNT(*) c FROM bookings WHERE status='confirmed' GROUP BY payment_method`,
    SEL
  );

  // أعلى الفعاليات
  const topEvents = await sequelize.query(
    `SELECT e.id, e.title_ar, IFNULL(SUM(b.total_amount),0) revenue, COUNT(*) bookings, IFNULL(SUM(b.quantity),0) seats
     FROM bookings b JOIN events e ON e.id=b.event_id
     WHERE b.status='confirmed' GROUP BY e.id ORDER BY revenue DESC LIMIT 5`,
    SEL
  );

  // أحدث الحجوزات
  const recentBookings = await Booking.findAll({
    include: [
      { model: User, as: "user", attributes: ["name", "email"] },
      { model: Event, as: "event", attributes: ["title_ar"] },
    ],
    attributes: ["id", "booking_ref", "total_amount", "status", "quantity", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 8,
  });

  // أحدث المستخدمين
  const recentUsers = await User.findAll({
    attributes: ["id", "name", "email", "avatar", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 6,
  });

  // محادثات دعم مفتوحة
  const [support] = await sequelize.query(
    `SELECT COUNT(DISTINCT user_id) c FROM support_messages WHERE sender='user' AND is_read=0`,
    SEL
  );

  res.json({
    totals,
    series,
    byStatus,
    payment,
    topEvents,
    recentBookings,
    recentUsers,
    supportOpen: Number(support?.c || 0),
  });
}
