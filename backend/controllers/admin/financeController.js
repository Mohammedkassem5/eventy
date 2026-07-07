import { sequelize } from "../../config/db.js";
import { getSettingNumber } from "../../models/settings/PlatformSetting.js";

const Q = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

/* بناء فلتر التاريخ — يُطبّق على b.created_at */
function dateRange(from, to) {
  const clauses = [];
  const rep = {};
  if (from) { clauses.push("b.created_at >= :from"); rep.from = `${from} 00:00:00`; }
  if (to) { clauses.push("b.created_at <= :to"); rep.to = `${to} 23:59:59`; }
  const and = clauses.length ? " AND " + clauses.join(" AND ") : "";
  return { and, rep };
}

/* ===== GET /api/admin/finance ===== */
export async function financeOverview(req, res) {
  const { from, to } = req.query;
  const { and, rep } = dateRange(from, to);
  const pointsPerEgp = await getSettingNumber("points_per_egp", 100);

  // ملخص عام
  const [summary] = await Q(
    `SELECT
        IFNULL(SUM(CASE WHEN b.status='confirmed' THEN b.total_amount END),0)       AS gross,
        IFNULL(SUM(CASE WHEN b.payment_status='refunded' THEN b.total_amount END),0) AS refunded,
        IFNULL(SUM(CASE WHEN b.status='confirmed' THEN b.quantity END),0)            AS tickets_sold,
        SUM(b.status='confirmed')  AS confirmed_count,
        SUM(b.status='pending')    AS pending_count,
        SUM(b.status='cancelled')  AS cancelled_count,
        IFNULL(SUM(CASE WHEN b.status='confirmed' THEN b.points_used END),0)         AS points_redeemed,
        IFNULL(SUM(CASE WHEN b.status='confirmed' THEN b.points_earned END),0)       AS points_awarded
     FROM bookings b WHERE 1=1 ${and}`,
    rep
  );

  const gross = Number(summary.gross);
  const refunded = Number(summary.refunded);
  const confirmed = Number(summary.confirmed_count);
  const net = gross - refunded;
  const pointsRedeemed = Number(summary.points_redeemed);

  // سلسلة زمنية (يومية)
  const series = await Q(
    `SELECT DATE(b.created_at) d,
            IFNULL(SUM(CASE WHEN b.status='confirmed' THEN b.total_amount END),0) revenue,
            COUNT(*) bookings
     FROM bookings b WHERE 1=1 ${and}
     GROUP BY DATE(b.created_at) ORDER BY d ASC LIMIT 90`,
    rep
  );

  // حسب وسيلة الدفع
  const byPayment = await Q(
    `SELECT IFNULL(pm.name_ar, b.payment_method) method, b.payment_method method_key,
            IFNULL(SUM(b.total_amount),0) revenue, COUNT(*) bookings
     FROM bookings b
     LEFT JOIN payment_methods pm ON pm.\`key\` = b.payment_method
     WHERE b.status='confirmed' ${and}
     GROUP BY b.payment_method ORDER BY revenue DESC`,
    rep
  );

  // حسب نوع الفعالية (category)
  const byCategory = await Q(
    `SELECT c.name_ar category, IFNULL(SUM(b.total_amount),0) revenue,
            COUNT(*) bookings, IFNULL(SUM(b.quantity),0) seats
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     JOIN categories c ON c.id = e.category_id
     WHERE b.status='confirmed' ${and}
     GROUP BY c.id ORDER BY revenue DESC`,
    rep
  );

  // حسب المكان (venue)
  const byVenue = await Q(
    `SELECT IFNULL(v.name_ar, e.venue_name) venue, IFNULL(SUM(b.total_amount),0) revenue, COUNT(*) bookings
     FROM bookings b
     JOIN events e ON e.id = b.event_id
     LEFT JOIN venues v ON v.id = e.venue_id
     WHERE b.status='confirmed' ${and}
     GROUP BY venue ORDER BY revenue DESC LIMIT 15`,
    rep
  );

  // حسب الفعالية (أعلى 10)
  const byEvent = await Q(
    `SELECT e.id, e.title_ar event, IFNULL(SUM(b.total_amount),0) revenue,
            COUNT(*) bookings, IFNULL(SUM(b.quantity),0) seats
     FROM bookings b JOIN events e ON e.id = b.event_id
     WHERE b.status='confirmed' ${and}
     GROUP BY e.id ORDER BY revenue DESC LIMIT 10`,
    rep
  );

  // حسب طريقة التسليم
  const byDelivery = await Q(
    `SELECT e.delivery_mode mode, IFNULL(SUM(b.total_amount),0) revenue, COUNT(*) bookings
     FROM bookings b JOIN events e ON e.id = b.event_id
     WHERE b.status='confirmed' ${and}
     GROUP BY e.delivery_mode ORDER BY revenue DESC`,
    rep
  );

  res.json({
    summary: {
      gross, refunded, net,
      confirmed,
      pending: Number(summary.pending_count),
      cancelled: Number(summary.cancelled_count),
      tickets_sold: Number(summary.tickets_sold),
      avg_order: confirmed ? +(gross / confirmed).toFixed(2) : 0,
      points_redeemed: pointsRedeemed,
      points_value_egp: +(pointsRedeemed / pointsPerEgp).toFixed(2),
      points_awarded: Number(summary.points_awarded),
    },
    series: series.map((s) => ({ date: s.d, revenue: Number(s.revenue), bookings: Number(s.bookings) })),
    byPayment: byPayment.map((r) => ({ ...r, revenue: Number(r.revenue), bookings: Number(r.bookings) })),
    byCategory: byCategory.map((r) => ({ ...r, revenue: Number(r.revenue), bookings: Number(r.bookings), seats: Number(r.seats) })),
    byVenue: byVenue.map((r) => ({ ...r, revenue: Number(r.revenue), bookings: Number(r.bookings) })),
    byEvent: byEvent.map((r) => ({ ...r, revenue: Number(r.revenue), bookings: Number(r.bookings), seats: Number(r.seats) })),
    byDelivery: byDelivery.map((r) => ({ ...r, revenue: Number(r.revenue), bookings: Number(r.bookings) })),
  });
}
